const sendOTP = async (phone, otp) => {
  const provider = process.env.OTP_PROVIDER || "mock";

  // Normalize and format to E.164 format (e.g. +919999999999) for AWS SNS and Twilio
  let formattedPhone = String(phone || "").trim();
  if (!formattedPhone.startsWith("+")) {
    if (formattedPhone.length === 10) {
      formattedPhone = "+91" + formattedPhone;
    } else if (formattedPhone.length === 12 && formattedPhone.startsWith("91")) {
      formattedPhone = "+" + formattedPhone;
    } else {
      formattedPhone = "+" + formattedPhone;
    }
  }

  console.log(`[OTP:${provider}] Sending OTP ${otp} to ${formattedPhone}`);

  if (provider === "mock") {
    return { success: true, provider };
  }

  if (provider === "twilio") {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    if (!accountSid || !authToken || !messagingServiceSid) {
      console.error("[OTP:twilio] Missing Twilio credentials in environment variables");
      return { success: false, error: "Missing Twilio credentials" };
    }

    try {
      const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const body = new URLSearchParams({
        To: formattedPhone,
        MessagingServiceSid: messagingServiceSid,
        Body: `Your OTP for Pandit Booking is ${otp}. It is valid for 5 minutes.`,
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        console.error("[OTP:twilio] Error response from Twilio:", data);
        return { success: false, error: data.message };
      }

      console.log(`[OTP:twilio] Successfully sent SMS. SID: ${data.sid}`);
      return { success: true, provider, sid: data.sid };
    } catch (error) {
      console.error("[OTP:twilio] Failed to send Twilio SMS:", error);
      return { success: false, error: error.message };
    }
  }

  if (provider === "aws") {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || "ap-south-1";

    if (!accessKeyId || !secretAccessKey) {
      console.error("[OTP:aws] Missing AWS credentials in environment variables");
      return { success: false, error: "Missing AWS credentials" };
    }

    try {
      const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
      const snsClient = new SNSClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const command = new PublishCommand({
        Message: `Your OTP for Pandit Booking is ${otp}. It is valid for 5 minutes.`,
        PhoneNumber: formattedPhone,
        MessageAttributes: {
          "AWS.SNS.SMS.SMSType": {
            DataType: "String",
            StringValue: "Transactional",
          },
        },
      });

      const response = await snsClient.send(command);
      console.log(`[OTP:aws] Successfully sent SMS. MessageId: ${response.MessageId}`);
      return { success: true, provider, messageId: response.MessageId };
    } catch (error) {
      console.error("[OTP:aws] Failed to send AWS SNS SMS:", error);
      return { success: false, error: error.message };
    }
  }

  if (provider === "msg91") {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;

    if (!authKey || !templateId) {
      console.error("[OTP:msg91] Missing MSG91 config in environment variables");
      return { success: false, error: "Missing MSG91 config" };
    }

    try {
      const response = await fetch("https://api.msg91.com/api/v5/otp", {
        method: "POST",
        headers: {
          "authkey": authKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: templateId,
          mobile: formattedPhone.replace("+", ""), // MSG91 expects number without '+'
          otp: otp,
        }),
      });

      const data = await response.json();
      if (data.type !== "success") {
        console.error("[OTP:msg91] Error response from MSG91:", data);
        return { success: false, error: data.message };
      }

      console.log("[OTP:msg91] Successfully sent SMS via MSG91");
      return { success: true, provider };
    } catch (error) {
      console.error("[OTP:msg91] Failed to send MSG91 SMS:", error);
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: `Unknown provider: ${provider}` };
};

module.exports = {
  sendOTP,
};
