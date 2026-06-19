import fs from 'fs';
import path from 'path';

/**
 * Decodes base64 data and writes it to a temporary file in uploads/
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} fileName - Destination file name
 * @returns {string} Path to the created file
 */
export function writeBase64ToFile(base64Data, fileName) {
  if (!base64Data) return null;

  // Ensure uploads directory exists
  const uploadDir = 'uploads';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Strip prefix like "data:image/jpeg;base64," if present
  let cleanBase64 = base64Data;
  let extension = '.jpg'; // default

  const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    const mimeType = matches[1];
    cleanBase64 = matches[2];
    
    if (mimeType.includes('png')) extension = '.png';
    else if (mimeType.includes('webp')) extension = '.webp';
    else if (mimeType.includes('mp4')) extension = '.mp4';
    else if (mimeType.includes('video')) extension = '.mp4';
  }

  try {
    const buffer = Buffer.from(cleanBase64, 'base64');
    const filePath = path.join(uploadDir, `${fileName}${extension}`);
    fs.writeFileSync(filePath, buffer);
    return path.resolve(filePath);
  } catch (err) {
    console.error('[tempWriter] Error writing file:', err);
    return null;
  }
}

/**
 * Writes a StrategyCreative's media assets to files on disk.
 * @param {Object} creative - StrategyCreative document
 * @returns {string[]} Array of file paths
 */
export function writeCreativeToFiles(creative) {
  const filePaths = [];
  const creativeId = creative._id.toString();

  if (creative.type === 'carousel' && creative.slides && creative.slides.length > 0) {
    creative.slides.forEach((slide, idx) => {
      const filePath = writeBase64ToFile(slide.image, `temp_carousel_${creativeId}_${idx}`);
      if (filePath) filePaths.push(filePath);
    });
  } else if (creative.type === 'video' && creative.videoUrl && !creative.videoUrl.startsWith('http') && fs.existsSync(creative.videoUrl)) {
    // If it's a local video file path, use it directly!
    filePaths.push(path.resolve(creative.videoUrl));
  } else {
    // For images, or video fallback (thumbnail)
    const filePath = writeBase64ToFile(creative.thumbnailBase64, `temp_image_${creativeId}`);
    if (filePath) filePaths.push(filePath);
  }

  return filePaths;
}
