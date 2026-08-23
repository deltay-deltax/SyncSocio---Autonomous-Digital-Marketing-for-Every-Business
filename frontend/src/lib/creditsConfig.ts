// Starter & Growth: 5 credits per image gen, 5 credits per carousel slide
// Pro: 8 credits per image gen, 8 credits per carousel slide

export const IMAGE_CREDITS_STARTER = [
  { feature: "Static Ad (1:1 Feed)", credits: 5 },
  { feature: "Story / Reel Thumbnail (9:16)", credits: 5 },
  { feature: "Carousel Slide (per slide)", credits: 5 },
  { feature: "Image Variation / Regeneration", credits: 5 },
  { feature: "Festival Campaign Creative", credits: 5 },
  { feature: "E-commerce Product Image", credits: 8 },
  { feature: "AI Image Editor (Reference style)", credits: 5 },
];

export const IMAGE_CREDITS_PRO = [
  { feature: "Static Ad (1:1 Feed)", credits: 8 },
  { feature: "Story / Reel Thumbnail (9:16)", credits: 8 },
  { feature: "Carousel Slide (per slide)", credits: 8 },
  { feature: "Image Variation / Regeneration", credits: 8 },
  { feature: "Festival Campaign Creative", credits: 8 },
  { feature: "E-commerce Product Image", credits: 10 },
  { feature: "AI Image Editor (Reference style)", credits: 8 },
];

// Legacy export (Starter rates — used by pages that don't need plan context)
export const IMAGE_CREDITS = IMAGE_CREDITS_STARTER;

export const VIDEO_CREDITS = [
  {
    feature: "Video Generation - 720p HD (8 sec)",
    credits: 80,
  },
  {
    feature: "Video Generation - 1080p Full HD (8 sec)",
    credits: 100,
  },
];

export const ALLINONE_CREDITS_STARTER = [
  {
    feature: "Full Drop (2 Images + 2 Carousels of 3 slides + 4 E-commerce Listings + 1 AI UGC Video)",
    credits: 140,
  },
];

export const ALLINONE_CREDITS_PRO = [
  {
    feature: "Full Drop (2 Images + 2 Carousels of 3 slides + 4 E-commerce Listings + 1 AI UGC Video)",
    credits: 176,
  },
];

// Legacy export (Starter rates)
export const ALLINONE_CREDITS = ALLINONE_CREDITS_STARTER;

export const FREE_FEATURES = [
  { title: "AI Caption Writer", iconName: "PenTool" },
  { title: "Hashtag Generator", iconName: "Hash" },
  { title: "UGC Script Writer", iconName: "FileText" },
  { title: "Content Strategy & Calendar", iconName: "Calendar" },
  { title: "Best Time to Post Analysis", iconName: "Clock" },
  { title: "Post Scheduling", iconName: "Clock" },
  { title: "Brand DNA Extraction", iconName: "Fingerprint" },
  { title: "Analytics Dashboard", iconName: "BarChart3" },
];
