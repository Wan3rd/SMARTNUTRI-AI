import express from 'express';

import dotenv from 'dotenv';
import { verifyToken } from '../middleware/auth.js';
import { analyzeMealImage, callGemini } from '../services/gemini.js';

dotenv.config();

const router = express.Router();

router.post('/analyze-item', verifyToken, async (req, res) => {
    const { name, serving_unit, cooking_method } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Food name is required" });
    }

    const prompt = `Provide nutritional information for "${name}" (serving: ${serving_unit || '1 serving'}, method: ${cooking_method || 'standard'}). 
    Output ONLY a JSON object:
    {"calories": 100, "protein_g": 5, "carbs_g": 20, "fat_g": 2, "serving_weight_g": 100}
    Be accurate and clinical. Output ONLY valid JSON.`;

    try {
        const result = await analyzeMealImage(null, prompt);
        res.json(result);
    } catch (err) {
        console.error("AI Item Analysis Error:", err);
        res.status(500).json({ error: "Failed to analyze food item" });
    }
});

router.post('/generate', verifyToken, async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });
    try {
        const output = await callGemini(prompt);
        res.json({ output });
    } catch (err) {
        console.error("AI Generate Error:", err);
        res.status(500).json({ error: err.message || "AI generation failed" });
    }
});

export default router;
