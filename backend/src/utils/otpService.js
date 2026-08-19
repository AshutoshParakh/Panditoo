const sanitizeEnvValue = (value) => {
  if (typeof value !== "string") return value;
  return value.trim().replace(/^['"]|['"]$/g, "");
};

const sendOTP = async (phone, otp, options = {}) => {
  const provider = process.env.OTP_PROVIDER || "aws";
  const purpose = options.purpose || "verification";
  const configuredTemplate = sanitizeEnvValue(process.env.OTP_MESSAGE_TEMPLATE);
  const message = options.message || (configuredTemplate
    ? configuredTemplate.replace(/\{\{\s*OTP\s*\}\}/gi, otp)
    : `Your OTP for Pandit Booking is ${otp}. It is valid for 5 minutes.`);

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

  if (process.env.NODE_ENV !== "production") {
    console.log(`[OTP:${String(provider || "NOT_CONFIGURED").toUpperCase()}] Purpose: ${purpose} | OTP: ${otp} | Customer: ${formattedPhone}`);
  }

  if (provider === "mock") {
    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "Mock OTP provider is disabled in production" };
    }
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
        Body: message,
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
    const accessKeyId = sanitizeEnvValue(process.env.AWS_ACCESS_KEY_ID);
    const secretAccessKey = sanitizeEnvValue(process.env.AWS_SECRET_ACCESS_KEY);
    const sessionToken = sanitizeEnvValue(process.env.AWS_SESSION_TOKEN);
    const region = sanitizeEnvValue(process.env.AWS_REGION) || "ap-south-1";

    if (!accessKeyId || !secretAccessKey) {
      console.error("[OTP:aws] Missing AWS credentials in environment variables");
      return { success: false, error: "Missing AWS credentials" };
    }

    try {
      const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
      const credentials = {
        accessKeyId,
        secretAccessKey,
      };
      if (sessionToken && typeof sessionToken === "string" && sessionToken.trim() && sessionToken !== "undefined") {
        credentials.sessionToken = sessionToken.trim();
      }

      const snsClient = new SNSClient({
        region,
        credentials,
      });

      const smsAttributes = {
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Transactional",
        },
      };

      // For India DLT delivery, these values should match the registered sender/template exactly.
      const senderId = sanitizeEnvValue(process.env.AWS_SNS_SENDER_ID);
      const entityId = sanitizeEnvValue(process.env.AWS_SNS_ENTITY_ID);
      const templateId = sanitizeEnvValue(process.env.AWS_SNS_TEMPLATE_ID);

      if (senderId) {
        smsAttributes["AWS.SNS.SMS.SenderID"] = {
          DataType: "String",
          StringValue: senderId,
        };
      }
      if ((entityId && !templateId) || (!entityId && templateId)) {
        console.error("[OTP:aws] AWS_SNS_ENTITY_ID and AWS_SNS_TEMPLATE_ID must be configured together");
        return { success: false, error: "Incomplete AWS India DLT configuration" };
      }
      if (entityId && templateId) {
        smsAttributes["AWS.MM.SMS.EntityId"] = {
          DataType: "String",
          StringValue: entityId,
        };
        smsAttributes["AWS.MM.SMS.TemplateId"] = {
          DataType: "String",
          StringValue: templateId,
        };
      }

      const command = new PublishCommand({
        Message: message,
        PhoneNumber: formattedPhone,
        MessageAttributes: smsAttributes,
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

  if (provider === "fast2sms") {
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) {
      console.error("[OTP:fast2sms] Missing FAST2SMS_API_KEY in environment variables");
      return { success: false, error: "Missing FAST2SMS_API_KEY" };
    }
    try {
      const cleanPhone = formattedPhone.replace(/\D/g, "").slice(-10);
      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          "authorization": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otp,
          numbers: cleanPhone,
        }),
      });
      const data = await response.json();
      if (!data.return) {
        console.error("[OTP:fast2sms] Error from Fast2SMS:", data);
        return { success: false, error: data.message || "Fast2SMS error" };
      }
      console.log(`[OTP:fast2sms] Successfully sent SMS to ${cleanPhone}`);
      return { success: true, provider };
    } catch (error) {
      console.error("[OTP:fast2sms] Failed to send Fast2SMS:", error);
      return { success: false, error: error.message };
    }
  }

  if (provider === "2factor") {
    const apiKey = process.env.TWO_FACTOR_API_KEY;
    if (!apiKey) {
      console.error("[OTP:2factor] Missing TWO_FACTOR_API_KEY in environment variables");
      return { success: false, error: "Missing TWO_FACTOR_API_KEY" };
    }
    try {
      const cleanPhone = formattedPhone.replace(/\D/g, "").slice(-10);
      const url = `https://2factor.in/API/V1/${apiKey}/SMS/+91${cleanPhone}/${otp}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.Status !== "Success") {
        console.error("[OTP:2factor] Error from 2Factor:", data);
        return { success: false, error: data.Details || "2Factor error" };
      }
      console.log(`[OTP:2factor] Successfully sent SMS to ${cleanPhone}`);
      return { success: true, provider };
    } catch (error) {
      console.error("[OTP:2factor] Failed to send 2Factor SMS:", error);
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: `Unknown provider: ${provider}` };
};

module.exports = {
  sendOTP,
};
