import Asset from '../models/Asset.js';
import BrandProfile from '../models/BrandProfile.js';

// ─── CREATE ASSET ───
export const createAsset = async (req, res) => {
  try {
    const {
      title, description, heroImageUrl, ctaText, ctaUrl,
      sections, linkedFlowId, linkedPostTopic,
    } = req.body;

    const brand = await BrandProfile.findOne({ user: req.user._id });
    if (!brand) {
      return res.status(400).json({ message: 'Brand profile not found. Complete onboarding first.' });
    }

    const username = brand.instagramUsername || brand.socialHandle || req.user._id.toString();
    const slug = Asset.generateSlug(linkedPostTopic || title);

    const asset = await Asset.create({
      user: req.user._id,
      username,
      slug,
      title,
      description,
      heroImageUrl,
      ctaText: ctaText || 'Learn More',
      ctaUrl: ctaUrl || '',
      ogTitle: title,
      ogDescription: (description || '').slice(0, 160),
      ogImage: heroImageUrl || '',
      brandName: brand.brandName || username,
      brandColor: brand.primaryColor || '#2563EB',
      brandSecondaryColor: brand.secondaryColor || '#60A5FA',
      linkedFlowId,
      linkedPostTopic,
      sections: Array.isArray(sections) ? sections : [],
      isPublished: false,
    });

    return res.status(201).json(asset);
  } catch (error) {
    console.error('Failed to create asset:', error);
    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation failed.',
        errors: Object.values(error.errors).map(e => e.message),
      });
    }
    return res.status(500).json({ message: 'Failed to create asset.' });
  }
};

// ─── UPDATE ASSET ───
export const updateAsset = async (req, res) => {
  try {
    const asset = await Asset.findOne({ _id: req.params.id, user: req.user._id });
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found.' });
    }

    const allowedFields = [
      'title', 'description', 'heroImageUrl', 'ctaText', 'ctaUrl',
      'sections', 'isPublished', 'ogTitle', 'ogDescription', 'ogImage',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        asset[field] = req.body[field];
      }
    }

    await asset.save();
    return res.status(200).json(asset);
  } catch (error) {
    console.error('Failed to update asset:', error);
    return res.status(500).json({ message: 'Failed to update asset.' });
  }
};

// ─── LIST USER ASSETS ───
export const listAssets = async (req, res) => {
  try {
    const assets = await Asset.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ data: assets });
  } catch (error) {
    console.error('Failed to list assets:', error);
    return res.status(500).json({ message: 'Failed to list assets.' });
  }
};

// ─── GET ASSET BY ID (authenticated) ───
export const getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findOne({ _id: req.params.id, user: req.user._id });
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found.' });
    }
    return res.status(200).json(asset);
  } catch (error) {
    console.error('Failed to get asset:', error);
    return res.status(500).json({ message: 'Failed to get asset.' });
  }
};

// ─── PUBLIC: GET ASSET BY USERNAME + SLUG ───
export const getPublicAsset = async (req, res) => {
  try {
    const { username, slug } = req.params;

    const asset = await Asset.findOne({ username, slug, isPublished: true });
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found.' });
    }

    // Increment view count (fire-and-forget)
    Asset.updateOne({ _id: asset._id }, { $inc: { 'stats.views': 1 } }).catch(() => {});

    return res.status(200).json(asset);
  } catch (error) {
    console.error('Failed to get public asset:', error);
    return res.status(500).json({ message: 'Failed to load asset.' });
  }
};

// ─── PUBLIC: TRACK CTA CLICK ───
export const trackAssetClick = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found.' });
    }

    await Asset.updateOne({ _id: id }, { $inc: { 'stats.ctaClicks': 1 } });

    if (asset.ctaUrl) {
      return res.redirect(302, asset.ctaUrl);
    }
    return res.status(200).json({ clicked: true });
  } catch (error) {
    console.error('Failed to track asset click:', error);
    return res.status(500).json({ message: 'Failed to track click.' });
  }
};

// ─── DELETE ASSET ───
export const deleteAsset = async (req, res) => {
  try {
    const deleted = await Asset.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) {
      return res.status(404).json({ message: 'Asset not found.' });
    }
    return res.status(200).json({ message: 'Asset deleted.' });
  } catch (error) {
    console.error('Failed to delete asset:', error);
    return res.status(500).json({ message: 'Failed to delete asset.' });
  }
};

// ─── SERVE OPENGRAPH HTML FOR BOTS/CRAWLERS ───
export const serveAssetOG = async (req, res) => {
  try {
    const { username, slug } = req.params;
    const asset = await Asset.findOne({ username, slug, isPublished: true });

    if (!asset) {
      return res.status(404).send('Not found');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const assetUrl = `${frontendUrl}/${username}/${slug}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(asset.ogTitle || asset.title)}</title>
  <meta name="description" content="${escapeHtml(asset.ogDescription || asset.description || '')}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(asset.ogTitle || asset.title)}" />
  <meta property="og:description" content="${escapeHtml(asset.ogDescription || asset.description || '')}" />
  <meta property="og:image" content="${escapeHtml(asset.ogImage || asset.heroImageUrl || '')}" />
  <meta property="og:url" content="${assetUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(asset.ogTitle || asset.title)}" />
  <meta name="twitter:description" content="${escapeHtml(asset.ogDescription || asset.description || '')}" />
  <meta name="twitter:image" content="${escapeHtml(asset.ogImage || asset.heroImageUrl || '')}" />
  <meta http-equiv="refresh" content="0;url=${assetUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${assetUrl}">${escapeHtml(asset.title)}</a>...</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Failed to serve OG:', error);
    return res.status(500).send('Server error');
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
