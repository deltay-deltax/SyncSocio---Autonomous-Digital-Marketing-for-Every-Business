import mongoose from 'mongoose';

const siteSettingsSchema = new mongoose.Schema(
  {
    domeGalleryImages: {
      type: [String],
      default: []
    },
    creativeShowcaseGallery: {
      image: [{ src: String, caption: String, tag: String, isVideo: Boolean }],
      carousel: [{ src: String, caption: String, tag: String, isVideo: Boolean }],
      video: [{ src: String, caption: String, tag: String, isVideo: Boolean }],
      ecomm: [{ src: String, caption: String, tag: String, isVideo: Boolean }],
      festival: [{ src: String, caption: String, tag: String, isVideo: Boolean }]
    }
  },
  { timestamps: true }
);

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

export default SiteSettings;
