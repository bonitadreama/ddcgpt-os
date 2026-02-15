export const MEDIA_BUCKET = process.env.MEDIA_BUCKET || 'media';
export const MAX_IMAGE_SIZE_BYTES = Number(process.env.MAX_IMAGE_SIZE_BYTES || 10 * 1024 * 1024);
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function isAllowedImageMimeType(mimeType: string) {
  return ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number]);
}

export function buildStoragePath(userId: string, filename: string, prefix = 'uploads') {
  const sanitizedName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${prefix}/${userId}/${Date.now()}-${sanitizedName}`;
}
