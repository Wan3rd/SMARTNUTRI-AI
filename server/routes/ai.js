import express from 'express';

import dotenv from 'dotenv';
import { verifyToken } from '../middleware/auth.js';

dotenv.config();

const router = express.Router();

router.post('/gemini', verifyToken, async (req, res) => {
    try {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: "GEMINI_API_KEY is not defined" });
        }

        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: "Prompt is required" });
        }

        // Using standard gemini-1.5-flash as per documentation / common use, 
        // unless user specifically requested 2.5 (which might be their specific beta access).
        // I'll stick to 1.5-flash for reliability or check if 2.5 was explicitly in their snippet.
        // User snippet: gemini-2.5-flash. I will use it, assuming they know what they are doing.
        // If it fails, I'll mention it.
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Gemini API Error: ${response.status} ${response.statusText}`, errorText);
            return res.status(response.status).json({ error: `Gemini API Error: ${errorText}` });
        }

        const data = await response.json();
        const output = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!output) {
            return res.status(502).json({ error: "No output from Gemini" });
        }

        res.json({ output });

    } catch (err) {
        console.error("AI Route Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
