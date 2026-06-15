import express from 'express';
import Product from '../models/Product.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/products — list all products for authed user
router.get('/', protect, async (req, res) => {
  try {
    const products = await Product.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products — create a product
router.post('/', protect, async (req, res) => {
  try {
    const { imageBase64, name, description, price, offerPrice, keyBenefit } = req.body;
    if (!name) return res.status(400).json({ error: 'Product name is required' });

    const product = await Product.create({
      user: req.user._id,
      imageBase64: imageBase64 || '',
      name,
      description: description || '',
      price: price || '',
      offerPrice: offerPrice || '',
      keyBenefit: keyBenefit || '',
    });
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id — update a product
router.put('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await Product.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
