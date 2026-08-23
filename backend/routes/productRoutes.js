import express from 'express';
import Product from '../models/Product.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  uploadBase64ToCloudinary,
  deleteFromCloudinary,
} from '../utils/cloudinaryUpload.js';

const router = express.Router();

const compactList = (value, limit, itemLength = 120) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (const item of value) {
    const text = String(item || '').trim().slice(0, itemLength);
    const key = text.toLowerCase();
    if (text && !seen.has(key)) {
      seen.add(key);
      result.push(text);
    }
    if (result.length >= limit) break;
  }
  return result;
};

const compactString = (value, limit) => String(value || '').trim().slice(0, limit);

// GET /api/products — list all products for authed user
router.get('/', protect, async (req, res) => {
  try {
    const brandId = req.user.activeBrandId;
    const BrandProfile = (await import('../models/BrandProfile.js')).default;
    const defaultBrand = await BrandProfile.findOne({ user: req.user._id }).sort({ createdAt: 1 });

    let query = { user: req.user._id };
    if (defaultBrand && String(defaultBrand._id) === String(brandId)) {
      query.$or = [{ brandId }, { brandId: { $exists: false } }];
    } else {
      query.brandId = brandId;
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// POST /api/products — create a product
router.post('/', protect, async (req, res) => {
  try {
    const {
      imageBase64,
      imageUrls,
      specifications,
      name,
      description,
      price,
      offerPrice,
      keyBenefit,
      serviceProvider,
      verifiedBenefits,
      proofPoints,
      offerDetails,
      guarantee,
      variantDetails,
      sourceUrl,
    } = req.body;
    if (!name) return res.status(400).json({ error: 'Product name is required' });

    // Strict product limit enforcement per plan: Starter=50, Growth=200, Pro=500
    const userPlan = (req.user?.plan || '').toLowerCase();
    
    // Strict product limit enforcement per plan: Starter=50, Growth=200, Pro=500
    const isPro = userPlan.includes('pro');
    const isGrowth = userPlan.includes('growth');
    const isAgency = userPlan.includes('agency');
    
    const productLimit = isAgency ? 500 : isPro ? 500 : isGrowth ? 200 : 50;

    const currentCount = await Product.countDocuments({ user: req.user._id });
    if (currentCount >= productLimit) {
      return res.status(400).json({ 
        error: `Product limit reached for your ${req.user.plan || 'current'} plan (maximum ${productLimit} products allowed). Upgrade your plan to add more products.` 
      });
    }

    let imageUrl = '';
    if (imageBase64 && !imageBase64.startsWith('http')) {
      try {
        imageUrl = await uploadBase64ToCloudinary(imageBase64, 'syncsocio/products');
      } catch (uploadErr) {
        console.error('[Products] Cloudinary product upload failed:', uploadErr.message);
        imageUrl = imageBase64; // fallback
      }
    } else {
      imageUrl = imageBase64 || '';
    }

    let processedImageUrls = [];
    if (Array.isArray(imageUrls)) {
      for (const u of imageUrls) {
        if (u && !u.startsWith('http')) {
          try {
            const upUrl = await uploadBase64ToCloudinary(u, 'syncsocio/products');
            processedImageUrls.push(upUrl);
          } catch (e) {
            console.error('[Products] Cloudinary imageUrls upload failed:', e.message);
            processedImageUrls.push(u);
          }
        } else {
          processedImageUrls.push(u);
        }
      }
    }

    const product = await Product.create({
      user: req.user._id,
      brandId: req.user.activeBrandId,
      imageBase64: imageUrl, // field kept for backward compatibility, now stores url
      imageUrls: processedImageUrls,
      specifications: specifications || [],
      name,
      description: description || '',
      price: price || '',
      offerPrice: offerPrice || '',
      keyBenefit: keyBenefit || '',
      verifiedBenefits: compactList(verifiedBenefits, 4),
      proofPoints: compactList(proofPoints, 4),
      offerDetails: compactString(offerDetails, 120),
      guarantee: compactString(guarantee, 100),
      variantDetails: compactList(variantDetails, 3),
      sourceUrl: compactString(sourceUrl, 500),
      serviceProvider: serviceProvider || '',
    });

    // ── AI Ads Creative only ───────────────────────────────────────────────────
    // Packaging analysis is intentionally lazy so a brand scrape does not
    // trigger a paid vision request for every imported product.
    // Deferred until the product is actually selected in AI Ads. The resulting
    // description is cached on this document after the first use.
    // ──────────────────────────────────────────────────────────────────────────

    res.status(201).json({ success: true, product });

  } catch (err) {
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// PUT /api/products/:id — update a product
router.put('/:id', protect, async (req, res) => {
  try {
    const updateData = { ...req.body };
    if ('verifiedBenefits' in updateData) updateData.verifiedBenefits = compactList(updateData.verifiedBenefits, 4);
    if ('proofPoints' in updateData) updateData.proofPoints = compactList(updateData.proofPoints, 4);
    if ('variantDetails' in updateData) updateData.variantDetails = compactList(updateData.variantDetails, 3);
    if ('offerDetails' in updateData) updateData.offerDetails = compactString(updateData.offerDetails, 120);
    if ('guarantee' in updateData) updateData.guarantee = compactString(updateData.guarantee, 100);
    if ('sourceUrl' in updateData) updateData.sourceUrl = compactString(updateData.sourceUrl, 500);
    
    const oldProduct = await Product.findOne({ _id: req.params.id, user: req.user._id });
    if (!oldProduct) return res.status(404).json({ error: 'Product not found' });

    let imageChanged = false;

    // If updating imageBase64 and it's a new base64 string
    if (updateData.imageBase64 && !updateData.imageBase64.startsWith('http') && updateData.imageBase64 !== oldProduct.imageBase64) {
      try {
        if (oldProduct.imageBase64 && oldProduct.imageBase64.startsWith('http')) {
          await deleteFromCloudinary(oldProduct.imageBase64).catch(() => {});
        }
        updateData.imageBase64 = await uploadBase64ToCloudinary(updateData.imageBase64, 'syncsocio/products');
        imageChanged = true;
      } catch (uploadErr) {
        console.error('[Products] Cloudinary product update failed:', uploadErr.message);
      }
    } else if (updateData.imageBase64 !== oldProduct.imageBase64) {
      imageChanged = true;
    }

    if (updateData.imageUrls && JSON.stringify(updateData.imageUrls) !== JSON.stringify(oldProduct.imageUrls)) {
      let processedUrls = [];
      for (const u of updateData.imageUrls) {
        if (u && !u.startsWith('http')) {
          try {
            const upUrl = await uploadBase64ToCloudinary(u, 'syncsocio/products');
            processedUrls.push(upUrl);
          } catch (e) {
            console.error('[Products] Cloudinary imageUrls update failed:', e.message);
            processedUrls.push(u);
          }
        } else {
          processedUrls.push(u);
        }
      }
      updateData.imageUrls = processedUrls;
      imageChanged = true;
    }

    if (imageChanged) {
      updateData.adVisualDescription = '';
      updateData.adVisualDescriptionSecondary = '';
      updateData.adVisualDescriptionStatus = '';
    }


    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updateData,
      { new: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// DELETE /api/products — delete all products for authed user
router.delete('/', protect, async (req, res) => {
  try {
    // Delete images from Cloudinary first
    const products = await Product.find({ user: req.user._id });
    for (const prod of products) {
      if (prod.imageBase64 && prod.imageBase64.startsWith('http')) {
        await deleteFromCloudinary(prod.imageBase64).catch(() => {});
      }
    }

    await Product.deleteMany({ user: req.user._id });
    res.json({ success: true, message: 'All products deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (product && product.imageBase64 && product.imageBase64.startsWith('http')) {
      await deleteFromCloudinary(product.imageBase64).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

export default router;
