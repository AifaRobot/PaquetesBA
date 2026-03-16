import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function uploadImageBuffer(buffer: Buffer, filename?: string, folder = 'characters'): Promise<{ url: string; public_id: string }>
{
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream({ folder, public_id: filename ? filename.replace(/\.[^/.]+$/, '') : undefined }, (err, result) => {
      if (err) return reject(err);
      if (!result) return reject(new Error('No result from Cloudinary'));
      resolve({ url: (result.secure_url as string) || (result.url as string), public_id: result.public_id });
    });
    upload.end(buffer);
  });
}

export function uploadRawBuffer(buffer: Buffer, filename?: string, folder = 'documents'): Promise<{ url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'raw', public_id: filename },
      (err, result) => {
        if (err) return reject(err);
        if (!result) return reject(new Error('No result from Cloudinary'));
        resolve({ url: (result.secure_url as string) || (result.url as string), public_id: result.public_id });
      },
    );
    upload.end(buffer);
  });
}
