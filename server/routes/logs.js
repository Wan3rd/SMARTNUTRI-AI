import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// MULTER Config (Memory storage to pass buffer to Cloudinary/AI)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// CLOUDINARY Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper: Call Gemini Vision
async function analyzeImage(imageBase64) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const prompt = `Analyze this meal photo. 
    1. Identify the dish/food items.
    2. Determine the cooking method (e.g., Steamed, Fried, Grilled, Boiled, Sauteed, Fresh).
    3. For each edible item, provide a flat JSON object with:
       - 'name': Dish or item name.
       - 'measure_qty': Number indicating quantity (e.g. if there are 2 hotdogs, output 2. If it's a bowl of soup, output 1).
       - 'serving_unit': Common measure (must be exactly one of: 'Cup', 'Spoon', 'Sandok', 'Bowl', 'Slice', 'Piece', 'Plate', or 'Serving'). If the item is Rice, it MUST be 'Cup'.
       - 'serving_weight_g': Estimated weight in grams.
       - 'calories': Estimated calories as an integer.
       - 'protein_g': Estimated protein in grams as an integer.
       - 'carbs_g': Estimated carbs in grams as an integer.
       - 'fat_g': Estimated fat in grams as an integer.
    4. Return a master JSON object with an 'items' array, a top-level 'detected_cooking_method' string, and a top-level 'nutrition' object summarizing total 'calories', 'protein', 'carbs', and 'fat'. 
    Strictly ignore utensils and plates. Output ONLY valid JSON without markdown formatting.`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
                        ]
                    }],
                }),
            }
        );

        const data = await response.json();

        if (data.error) {
            console.error("Gemini API Error details:", data.error);
            return { error: `AI API Error: ${data.error.message}` };
        }

        const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textOutput) {
            console.error("Gemini API returned no text output. Data:", JSON.stringify(data));
            return { error: "AI returned no analysis" };
        }

        // Extract JSON from markdown code block if present
        const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Failed to parse AI output", raw: textOutput };
    } catch (err) {
        console.error("Gemini Vision Error:", err);
        return { error: "AI Analysis Failed: " + err.message };
    }
}

// POST /logs/upload - Simple image upload without AI analysis
router.post('/upload', verifyToken, upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No image uploaded' });
    }

    try {
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({ folder: 'meals_after' }, (error, uploadResult) => {
                if (error) reject(error);
                else resolve(uploadResult);
            }).end(req.file.buffer);
        });

        res.status(200).json({ image_url: result.secure_url });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// POST /logs/analyze - Upload image and analyze ONLY (Human-in-the-loop step 1)
router.post('/analyze', verifyToken, upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No image uploaded' });
    }

    try {
        // 1. Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({ folder: 'meals' }, (error, uploadResult) => {
                if (error) reject(error);
                else resolve(uploadResult);
            }).end(req.file.buffer);
        });

        // 2. AI Analysis (using Gemini or other Vision API)
        const base64Image = req.file.buffer.toString('base64');
        const analysis = await analyzeImage(base64Image);

        if (analysis.error) {
            return res.status(500).json({
                message: 'Food analysis failed. Please check your AI API key.',
                error: 'AI_ANALYSIS_FAILED'
            });
        }

        // Return the analysis and the image URL to the frontend for Caregiver Verification
        res.status(200).json({
            image_url: result.secure_url,
            ai_analysis: analysis,
            detected_cooking_method: analysis.detected_cooking_method || 'Unknown'
        });

    } catch (err) {
        console.error("Analyze process error:", err);
        res.status(500).json({
            message: 'Internal server error during analysis',
            details: err.message
        });
    }
});

// POST /logs - Save verified meal log (Human-in-the-loop step 2)
router.post('/', verifyToken, async (req, res) => {
    const {
        profile_id,
        image_url,
        image_after_url,
        cooking_method,
        ai_analysis,
        water_ml,
        supplements,
        physical_activity,
        serving_spoon_used,
        is_parent_verified,
        hidden_ingredients,
        meal_category,
        logged_at
    } = req.body;

    if (!profile_id || !image_url || !ai_analysis || !ai_analysis.items) {
        return res.status(400).json({ message: 'Missing required verified fields and items' });
    }

    try {
        // 1. Parse Hidden Ingredients if any
        const { parseTextToNutrients } = await import('../services/gemini.js');
        const hiddenItems = await parseTextToNutrients(hidden_ingredients);
        
        const allItems = [...(ai_analysis.items || []), ...hiddenItems];

        // 2. Recalculate using DOST-FNRI Local FCT mappings
        const { recalculateMealTotals } = await import('../utils/fct.js');
        const finalizedAnalysis = recalculateMealTotals(allItems);

        // 2. Fetch today's existing meal logs to calculate `dailyTotals`
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const todayLogs = await prisma.meal_logs.findMany({
            where: {
                profile_id: profile_id,
                logged_at: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            select: {
                ai_analysis: true
            }
        });

        let dailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0 };

        todayLogs.forEach(log => {
            const analysis = log.ai_analysis;
            if (analysis && analysis.macros_est) {
                dailyTotals.calories += (analysis.total_calories_est || 0);
                dailyTotals.protein += (analysis.macros_est.protein_g || 0);
                dailyTotals.carbs += (analysis.macros_est.carbs_g || 0);
                dailyTotals.fat += (analysis.macros_est.fat_g || 0);
                dailyTotals.sugar += (analysis.macros_est.sugar_g || 0);
                dailyTotals.sodium += (analysis.macros_est.sodium_mg || 0);
            }
        });

        // 3. Check Rules & Compliance against localized values and cumulative daily totals
        const rules = await prisma.nutrition_rules.findMany({
            where: { profile_id: profile_id }
        });

        // Dynamically import compliance utils
        const { checkCompliance } = await import('../utils/compliance.js');
        const complianceResult = checkCompliance({ ai_analysis: finalizedAnalysis }, rules, dailyTotals);

        // 4. Save to Database
        const newLog = await prisma.meal_logs.create({
            data: {
                profiles: { connect: { id: profile_id } },
                image_url,
                image_after_url,
                cooking_method,
                ai_analysis: finalizedAnalysis,
                status: 'pending',
                compliance_status: complianceResult.status,
                compliance_score: complianceResult.compliance_score,
                violation_details: complianceResult.details,
                water_ml: water_ml ? parseInt(water_ml) : 0,
                supplements: supplements || '',
                physical_activity: physical_activity || '',
                serving_spoon_used: serving_spoon_used || false,
                is_parent_verified: is_parent_verified || false,
                hidden_ingredients: hidden_ingredients || '',
                meal_category: meal_category || 'other',
                logged_at: logged_at ? new Date(logged_at) : new Date()
            }
        });

        res.status(201).json(newLog);

    } catch (err) {
        console.error("Save verified log error:", err);
        res.status(500).json({
            message: 'Internal server error saving log',
            details: err.message
        });
    }
});

// GET /profile/:id - Get history for a child
router.get('/profile/:id', verifyToken, async (req, res) => {
    try {
        const logs = await prisma.meal_logs.findMany({
            where: { profile_id: req.params.id },
            orderBy: { logged_at: 'desc' }
        });
        res.json(logs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE /:id - Delete a specific meal log
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const deletedLog = await prisma.meal_logs.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Log deleted successfully', log: deletedLog });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ message: 'Log not found' });
        }
        console.error("Delete log error:", err);
        res.status(500).json({ message: 'Server error deleting log' });
    }
});

export default router;
