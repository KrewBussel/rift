import { S3Client } from "@aws-sdk/client-s3";

// Server-side only — never import this in client components
export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  // Disable automatic checksums — they produce browser-incompatible presigned URLs
  requestChecksumCalculation: "when_required",
  responseChecksumValidation: "when_required",
});

export const S3_BUCKET = process.env.S3_BUCKET_NAME!;
