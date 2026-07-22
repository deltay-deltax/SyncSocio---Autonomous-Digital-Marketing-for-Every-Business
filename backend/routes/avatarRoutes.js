import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Avatar from '../models/Avatar.js';
import User from '../models/User.js';

const router = express.Router();

router.use(protect);

// GET /api/avatars - Fetch all public avatars + user's private avatars (if any)
router.get('/', async (req, res) => {
    try {
        const avatars = await Avatar.find({ isPublic: true }).sort({ createdAt: -1 });
        res.json(avatars);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/avatars/generate - Generate and save a new avatar
router.post('/generate', async (req, res) => {
    try {
        const { description, gender } = req.body;
        if (!description) return res.status(400).json({ error: 'Description is required' });

        // 1. Call AI Agent (python) to generate the avatar image
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const response = await fetch(`${aiServiceUrl}/generate-avatar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description, gender })
        });

        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errJson = JSON.parse(errorText);
                return res.status(response.status).json(errJson);
            } catch {
                throw new Error(`AI Avatar generation failed: ${errorText}`);
            }
        }

        const data = await response.json();
        const imageUrl = data.image; // Assume python returns { image: "data:image/jpeg..." or "http..." }

        // 2. Save to database
        const newAvatar = await Avatar.create({
            name: `Model - ${gender || 'Generated'}`,
            description,
            imageUrl,
            gender: gender || 'other',
            isPublic: true,
            createdBy: req.user._id
        });

        res.status(201).json(newAvatar);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
