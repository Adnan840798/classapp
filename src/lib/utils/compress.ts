/**
 * Server-side file compression utilities.
 * Uses `sharp` for images. PDFs are passed through unchanged.
 * Only call from server actions or API routes (Node.js runtime).
 */

/**
 * Compresses an image File using sharp.
 * - JPEG/WEBP/PNG → converted to JPEG at 80% quality, max 1600px on longest edge.
 * - PDF           → returned as-is (binary compression requires external tools).
 *
 * Returns a Buffer and the final MIME type to use for storage.
 */
export async function compressFileForStorage(file: File): Promise<{
  buffer: Buffer;
  contentType: string;
  fileName: string;
}> {
  const bytes = await file.arrayBuffer();
  const inputBuffer = Buffer.from(bytes);

  if (file.type === 'application/pdf') {
    // PDFs: no compression, store as-is
    return {
      buffer: inputBuffer,
      contentType: 'application/pdf',
      fileName: file.name,
    };
  }

  if (file.type.startsWith('image/')) {
    // Dynamically import sharp (it's a native module — must be server-side)
    const sharp = (await import('sharp')).default;

    const compressedBuffer = await sharp(inputBuffer)
      .resize({
        width: 1600,
        height: 1600,
        fit: 'inside',         // preserve aspect ratio
        withoutEnlargement: true, // never upscale
      })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();

    // Use a .jpg extension for the stored file name regardless of input format
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return {
      buffer: compressedBuffer,
      contentType: 'image/jpeg',
      fileName: `${baseName}.jpg`,
    };
  }

  // Fallback: unknown type, pass through
  return {
    buffer: inputBuffer,
    contentType: file.type,
    fileName: file.name,
  };
}
