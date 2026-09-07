import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// Cloudflare R2 クライアント（S3互換・完全転送料0円）
const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || '';
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'make-money-assets';
const publicDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || '';

export function isR2Configured(): boolean {
  return Boolean(accountId && accessKeyId && secretAccessKey && bucketName);
}

let s3ClientInstance: S3Client | null = null;

function getR2Client(): S3Client | null {
  if (!isR2Configured()) {
    return null;
  }
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return s3ClientInstance;
}

/**
 * ファイル/魚拓/JSONデータをR2へ安全にアップロード
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string = 'application/octet-stream'
): Promise<{ success: boolean; url: string; key: string }> {
  const client = getR2Client();
  if (!client) {
    // R2未設定時のセーフティ（モックURLを返却）
    return {
      success: true,
      url: `/mock-storage/${key}`,
      key,
    };
  }

  try {
    const buffer = typeof body === 'string' ? Buffer.from(body) : body;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await client.send(command);

    const publicUrl = publicDomain
      ? `${publicDomain.replace(/\/$/, '')}/${key}`
      : `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`;

    return {
      success: true,
      url: publicUrl,
      key,
    };
  } catch (error) {
    console.error('R2 upload failed:', error);
    return {
      success: false,
      url: '',
      key,
    };
  }
}

/**
 * R2からファイル内容を取得
 */
export async function getFromR2(key: string): Promise<string | null> {
  const client = getR2Client();
  if (!client) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    const response = await client.send(command);
    if (!response.Body) return null;
    return await response.Body.transformToString();
  } catch (error) {
    console.error('R2 fetch failed:', error);
    return null;
  }
}
