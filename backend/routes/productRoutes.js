import express from 'express';
import Product from '../models/Product.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  uploadBase64ToCloudinary,
  deleteFromCloudinary,
} from '../utils/cloudinaryUpload.js';

const router = express.Router();

// GET /api/products — list all products for authed user
router.get('/', protect, async (req, res) => {
  try {
    const brandId = req.user.activeBrandId;
    const products = await Product.find({
      user: req.user._id,
      $or: [{ brandId }, { brandId: { $exists: false } }]
    }).sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products — create a product
router.post('/', protect, async (req, res) => {
  try {
    const { imageBase64, name, description, price, offerPrice, keyBenefit, serviceProvider } = req.body;
    if (!name) return res.status(400).json({ error: 'Product name is required' });

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

    const product = await Product.create({
      user: req.user._id,
      brandId: req.user.activeBrandId,
      imageBase64: imageUrl, // field kept for backward compatibility, now stores url
      name,
      description: description || '',
      price: price || '',
      offerPrice: offerPrice || '',
      keyBenefit: keyBenefit || '',
      serviceProvider: serviceProvider || '',
    });
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id — update a product
router.put('/:id', protect, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // If updating imageBase64 and it's a new base64 string
    if (updateData.imageBase64 && !updateData.imageBase64.startsWith('http')) {
      try {
        // Fetch original to delete its image first
        const oldProduct = await Product.findOne({ _id: req.params.id, user: req.user._id });
        if (oldProduct && oldProduct.imageBase64 && oldProduct.imageBase64.startsWith('http')) {
          await deleteFromCloudinary(oldProduct.imageBase64).catch(() => {});
        }
        updateData.imageBase64 = await uploadBase64ToCloudinary(updateData.imageBase64, 'syncsocio/products');
      } catch (uploadErr) {
        console.error('[Products] Cloudinary product update failed:', uploadErr.message);
      }
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updateData,
      { new: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

export default router;
