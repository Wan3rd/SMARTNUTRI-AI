import express from 'express';
import dotenv from 'dotenv';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.js';
import { analyzeMealImage, callGemini } from '../services/gemini.js';

dotenv.config();

const router = express.Router();

router.post('/analyze-item', verifyToken, async (req, res) => {
    const { name, serving_unit, cooking_method } = req.body;
    if (!name) return res.status(400).json({ error: "Food name is required" });

    // Sanitize inputs before embedding in AI prompt (prevent prompt injection)
    const safeName = String(name).trim().slice(0, 100);
    const safeUnit = serving_unit ? String(serving_unit).trim().slice(0, 50) : 'Serving';
    const safeMethod = cooking_method && cooking_method !== 'Unknown'
        ? String(cooking_method).trim().slice(0, 50)
        : '';

    if (!safeName) return res.status(400).json({ error: "Food name cannot be empty" });

    try {
        const { generateText } = await import('../services/gemini.js');
        const methodPrefix = safeMethod ? `${safeMethod} ` : '';
        const prompt = `Provide nutritional data for exactly 1 ${safeUnit} of "${methodPrefix}${safeName}". 
        Assume a standard kid-sized portion if ambiguous.
        CRITICAL: The macros MUST be for EXACTLY 1 ${safeUnit}, NOT per 100g (unless the unit is exactly 100g). If the food is a commercial brand, use its exact official nutrition label for 1 ${safeUnit}.
        
        LOGICAL ESTIMATION RULES FOR BRANDED PACKAGED FOODS:
        1. If the item is a commercial branded snack/food (e.g., Fita, Skyflakes, Oreo, Nido, Bear Brand, Lactum, Milo, Pancit Canton, etc.), retrieve the standard commercial packaging size/serving size from your training data (e.g., 1 pack of Fita = 30g, containing 9 crackers, total 140 kcal).
        2. If the user requests 'Piece' or similar individual unit, divide the total package weight and macros by the typical number of pieces per pack to get the exact weight and macros for a single piece (e.g., 30g / 9 pieces = ~3.33g per piece; 140 kcal / 9 pieces = ~15.5 kcal per piece).
        3. Do NOT default single pieces of light crackers/biscuits to 10g or 100g.
        4. If the unit is 'Pack' or 'Sachet', output the exact full nutritional value for 1 full pack/sachet of that brand.
         Output Format: {"name": "${safeName}", "serving_weight_g": <estimated_weight_of_1_unit_in_grams>, "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "sugar_g": 0, "sodium_mg": 0}
        Only output valid JSON. No markdown.`;

        const raw = await generateText(prompt);
        const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleaned);

        res.json(result);
    } catch (err) {
        console.error("Single item analysis error:", err);
        res.status(500).json({ error: "Failed to analyze food item" });
    }
});

router.post('/generate', verifyToken, async (req, res) => {
    const { profileId, cravings, dislikes, includeSteps } = req.body;
    
    if (!profileId || typeof profileId !== 'string') {
        return res.status(400).json({ error: "profileId is required and must be a string." });
    }

    try {
        // Fetch child profile details from database
        const profile = await prisma.profiles.findUnique({
            where: { id: profileId }
        });

        if (!profile) {
            return res.status(404).json({ error: "Child profile not found." });
        }

        // Verify that requesting user is authorized (parent owner, admin, or linked active nutritionist)
        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin' ||
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id, status: 'active' }
            }));

        if (!isAuthorized) {
            return res.status(403).json({ error: "Unauthorized access to child profile." });
        }

        // Calculate child's age in a birthday-aware manner
        const dob = profile.date_of_birth ? new Date(profile.date_of_birth) : null;
        let ageText = 'average age';
        if (dob) {
            const now = new Date();
            let age = now.getFullYear() - dob.getFullYear();
            const hasBirthdayPassed = now.getMonth() > dob.getMonth() ||
                (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
            if (!hasBirthdayPassed) age--;
            ageText = `${age} years old`;
        }

        // Sanitize incoming cravings/dislikes strings before combining into prompt
        const safeCravings = cravings ? String(cravings).replace(/<[^>]*>/g, '').trim().slice(0, 200) : 'None';
        const safeDislikes = dislikes ? String(dislikes).replace(/<[^>]*>/g, '').trim().slice(0, 200) : 'None';
        
        const allergiesList = (profile.allergies && profile.allergies.length > 0) 
            ? profile.allergies.join(', ') 
            : 'None';
        const autoAvoid = profile.dietary_preferences 
            ? `${allergiesList}, ${profile.dietary_preferences}` 
            : allergiesList;

        const prompt = `I need a creative recipe idea for a child (aged ${ageText}). 
        Child Context: Weighs ${profile.weight_kg || 'average'}kg. 
        Cravings/Ingredients: ${safeCravings}. 
        Known Allergies/Profile Dislikes: ${autoAvoid}.
        Additional Dislikes to avoid: ${safeDislikes}.
        Provide a name for the dish (keep it simple dish name but easy to understand), a short description, and key ingredients. The meal should be suitable for a child aged ${ageText}. Keep it healthy. Use simple words and provide only foods that are easy to do and possible. Also keep it short as possible. Give a proper layout so that it is easy to read and understand${includeSteps ? " Also provide step-by-step cooking instructions." : ""}`;

        const output = await callGemini(prompt);
        res.json({ output });
    } catch (err) {
        console.error("AI Generate Error:", err);
        res.status(500).json({ error: err.message || "AI generation failed" });
    }
});

export default router;

