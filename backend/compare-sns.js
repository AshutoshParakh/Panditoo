const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

async function testSMS(label, accessKeyId, secretAccessKey, phone) {
  const client = new SNSClient({
    region: 'ap-south-1',
    credentials: { accessKeyId, secretAccessKey }
  });
  try {
    const r = await client.send(new PublishCommand({
      Message: `Your OTP for Pandit Booking is 999111. It is valid for 5 minutes.`,
      PhoneNumber: phone,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
      }
    }));
    console.log(`[${label}] Sent OK. MessageId: ${r.MessageId}`);
  } catch(e) {
    console.log(`[${label}] ERROR: ${e.name} - ${e.message}`);
  }
}

async function main() {
  const phone = process.env.TEST_PHONE || '+919131042937';

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    console.log('Error: AWS credentials not found in environment variables.');
    return;
  }

  await testSMS('AWS_SNS_TEST', accessKeyId, secretAccessKey, phone);

  console.log('\nCheck if SMS arrived on phone.');
}

main();
