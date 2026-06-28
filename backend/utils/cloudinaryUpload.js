import { v2 as cloudinary } from 'cloudinary';

export function ensureConfigured() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}
ensureConfigured();

/**
 * Upload a base64 string to Cloudinary.
 * @param {string} base64 - Raw base64 (no data:image/... prefix needed, but handles both)
 * @param {string} folder  - Cloudinary folder e.g. 'syncsocio/creatives'
 * @param {object} options - Extra Cloudinary upload options
 * @returns {Promise<string>} Cloudinary HTTPS URL
 */
export async function uploadBase64ToCloudinary(base64, folder = 'syncsocio/creatives', options = {}) {
  ensureConfigured();
  // Ensure it has the data URI prefix Cloudinary needs
  const dataUri = base64.startsWith('data:')
    ? base64
    : `data:image/jpeg;base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'image',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    ...options,
  });

  return result.secure_url;
}

/**
 * Upload multiple base64 slides for a carousel.
 * @param {Array<{image: string}>} slides
 * @param {string} folder
 * @returns {Promise<Array<{image: string}>>} Slides with Cloudinary URLs replacing base64
 */
export async function uploadCarouselSlidesToCloudinary(slides, folder = 'syncsocio/carousels') {
  ensureConfigured();
  const uploaded = await Promise.all(
    slides.map(async (slide) => {
      if (!slide.image) return slide;
      // Already a URL — skip
      if (slide.image.startsWith('http')) return slide;
      const url = await uploadBase64ToCloudinary(slide.image, folder);
      return { image: url };
    })
  );
  return uploaded;
}

/**
 * Upload a video URL (e.g. from FAL.ai) to Cloudinary for permanent storage.
 * @param {string} videoUrl
 * @param {string} folder
 * @returns {Promise<string>} Cloudinary secure video URL
 */
export async function uploadVideoUrlToCloudinary(videoUrl, folder = 'syncsocio/videos') {
  ensureConfigured();
  if (!videoUrl) return '';
  if (videoUrl.includes('cloudinary') && videoUrl.includes('/video/')) return videoUrl; // already a cloudinary video URL

  const result = await cloudinary.uploader.upload(videoUrl, {
    folder,
    resource_type: 'video',
  });

  return result.secure_url;
}

/**
 * Delete an asset from Cloudinary by its URL.
 * @param {string} url - Full Cloudinary URL
 */
export async function deleteFromCloudinary(url) {
  ensureConfigured();
  try {
    if (!url || !url.includes('cloudinary')) return;
    
    // Detect if it is a video resource type
    const isVideo = url.includes('/video/') || url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.avi');
    const resourceType = isVideo ? 'video' : 'image';

    // Extract public_id from URL
    const parts = url.split('/');
    const uploadIndex = parts.findIndex(p => p === 'upload');
    // public_id starts after 'upload/vXXXXXX/'
    const publicIdWithExt = parts.slice(uploadIndex + 2).join('/');
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ''); // strip extension
    
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.warn('[Cloudinary] Delete failed (non-critical):', err.message);
  }
}
