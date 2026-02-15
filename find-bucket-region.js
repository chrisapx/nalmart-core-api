const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const bucketName = process.env.AWS_BUCKET || 'sandbox-neob-bucket';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// Common AWS regions to test
const regions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'eu-north-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'ap-northeast-1',
];

async function findBucketRegion() {
  console.log(`\n🔍 Testing bucket: ${bucketName}\n`);

  for (const region of regions) {
    try {
      const client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const command = new HeadBucketCommand({ Bucket: bucketName });
      await client.send(command);

      console.log(`✅ SUCCESS! Bucket is in region: ${region}\n`);
      console.log(`Update your .env file with:`);
      console.log(`AWS_REGION=${region}`);
      return region;
    } catch (error) {
      if (error.name === 'NotFound') {
        console.log(`❌ ${region}: Bucket not found`);
      } else if (error.$metadata?.httpStatusCode === 301) {
        console.log(`⚠️  ${region}: Redirect (wrong region)`);
      } else if (error.$metadata?.httpStatusCode === 403) {
        console.log(`🔒 ${region}: Forbidden (might be correct region but no permissions)`);
      } else {
        console.log(`⏭️  ${region}: ${error.message}`);
      }
    }
  }

  console.log('\n❌ Could not find the correct region for this bucket.');
}

findBucketRegion().catch(console.error);
