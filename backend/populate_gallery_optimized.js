import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Accurate Schema
const siteSettingsSchema = new mongoose.Schema({
  domeGalleryImages: [{ type: String }]
}, { timestamps: true });
const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    console.log('Fetching images from Cloudinary...');
    let images = [];
    try {
      const result = await cloudinary.search
        .expression('resource_type:image')
        .max_results(85)
        .execute();
      
      // Inject Cloudinary optimizations: q_auto, f_auto, w_400
      images = result.resources.map(res => {
        const url = res.secure_url;
        // e.g. https://res.cloudinary.com/demo/image/upload/v1612... -> https://res.cloudinary.com/demo/image/upload/q_auto,f_auto,w_400/v1612...
        if (url.includes('/upload/')) {
          return url.replace('/upload/', '/upload/q_auto,f_auto,w_400/');
        }
        return url;
      });
    } catch (e) {
      console.log('Could not fetch from cloudinary (or no images). Using placeholders.', e.message);
    }

    // Ensure we have exactly 85 images by duplicating if we don't have enough
    let finalImages = [];
    if (images.length === 0) {
      for (let i = 0; i < 85; i++) {
        finalImages.push(`https://picsum.photos/seed/${i + 1}/400/600`);
      }
    } else {
      while (finalImages.length < 85) {
        finalImages = finalImages.concat(images);
      }
      finalImages = finalImages.slice(0, 85);
    }

    console.log(`Prepared ${finalImages.length} optimized images.`);

    // Update settings
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = new SiteSettings();
    }
    settings.domeGalleryImages = finalImages;
    await settings.save();
    
    console.log('Successfully updated 85 OPTIMIZED images in domeGalleryImages in SiteSettings!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
