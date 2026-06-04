import imageCompression from 'browser-image-compression';
import { FILE_SIZE_LIMITS } from '@/lib/constants';

/**
 * Compresses an image file in the browser before upload.
 * Used for profile pictures: max 2MB, max 400×400px.
 */
export async function compressAvatar(file: File): Promise<File> {
  const options = {
    maxSizeMB: FILE_SIZE_LIMITS.AVATAR_MAX_BYTES / (1024 * 1024),
    maxWidthOrHeight: FILE_SIZE_LIMITS.AVATAR_MAX_DIMENSION,
    useWebWorker: true,
    fileType: 'image/webp', // convert to webp for best compression
  };

  try {
    const compressed = await imageCompression(file, options);
    return compressed;
  } catch (error) {
    console.error('Image compression failed:', error);
    throw new Error('Failed to compress image. Please try a different file.');
  }
}

/**
 * Compresses a notice image (announcement/result attachment) before upload.
 * Max 5MB, max 1920px wide.
 */
export async function compressNoticeImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 4,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  try {
    const compressed = await imageCompression(file, options);
    return compressed;
  } catch (error) {
    console.error('Image compression failed:', error);
    throw new Error('Failed to compress image. Please try a different file.');
  }
}

/**
 * Validates that a file is an accepted type and within size limits.
 */
export function validateFile(
  file: File,
  acceptedTypes: string[],
  maxBytes: number
): { valid: boolean; error?: string } {
  if (!acceptedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type not accepted. Accepted: ${acceptedTypes.join(', ')}`,
    };
  }
  if (file.size > maxBytes) {
    const maxMB = (maxBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxMB}MB.`,
    };
  }
  return { valid: true };
}
