import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.js';
import dotenv from 'dotenv';
import { analyzeMealImage } from '../services/gemini.js';

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
    const prompt = `Analyze this meal photo using these steps:
    STEP A: Identify the plate/container size and its diameter.
    STEP B: Identify reference objects (utensils like a spoon or fork) to establish a 3D scale.
    STEP C: Compare the food volume to the reference objects (e.g., "The rice mound is roughly 2.5 spoon-widths wide").
    STEP D: Calculate the final quantity based on these observations.

    For each edible item, provide a flat JSON object with:
       - 'visual_reasoning': A short sentence describing the Step A-C analysis for this item (e.g. "Small bowl roughly fist-sized compared to spoon, suggesting 1 cup").
       - 'name': Dish or item name.
       - 'cooking_method': Determine the method (Raw, Baked, Fried, etc.).
       - 'measure_qty': Number indicating quantity. 
         RICE/BOWLS: If the food is in a standard small bowl (fist-sized), it is EXACTLY 1.0 Cup. Do not estimate 1.5 unless the bowl is visibly deep or oversized. Be conservative.
       - 'serving_unit': Must be one of: 'Cup', 'Spoon', 'Sandok', 'Bowl', 'Slice', 'Piece', 'Plate', or 'Serving'. Rice MUST be 'Cup'.
       - 'serving_weight_g': Estimated weight.
       - 'calories', 'protein_g', 'carbs_g', 'fat_g': Estimated macros.
    
    Return a master JSON object with an 'items' array, a top-level 'detected_cooking_method', and a 'nutrition' summary.
    Output ONLY valid JSON without markdown formatting.`;

    try {
        return await analyzeMealImage(imageBase64, prompt);
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

// POST /logs/analyze-item - Analyze a single item string (Caregiver manual correction)
router.post('/analyze-item', verifyToken, async (req, res) => {
    const { name, serving_unit, cooking_method } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    try {
        const { generateText } = await import('../services/gemini.js');
        const methodPrefix = cooking_method && cooking_method !== 'Unknown' ? `${cooking_method} ` : '';
        const prompt = `Provide nutritional data for exactly 1 ${serving_unit || 'Serving'} of "${methodPrefix}${name}". 
        Assume a standard kid-sized portion if ambiguous.
        Output Format: {"name": "${name}", "serving_weight_g": 100, "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "sugar_g": 0, "sodium_mg": 0}
        Only output valid JSON. No markdown.`;

        const raw = await generateText(prompt);
        const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleaned);

        res.json(result);
    } catch (err) {
        console.error("Single item analysis error:", err);
        res.status(500).json({ message: 'Failed to analyze item' });
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
        // Ownership Check
        const profile = await prisma.profiles.findUnique({ where: { id: profile_id } });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin' ||
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id, status: 'active' }
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized: You cannot log meals for this profile' });
        // 1. Parse Hidden Ingredients if any
        const { parseTextToNutrients } = await import('../services/gemini.js');
        const hiddenItems = await parseTextToNutrients(hidden_ingredients);

        const allItems = [...(ai_analysis.items || []), ...hiddenItems];

        // 2. Recalculate using DOST-FNRI Local FCT mappings
        const { recalculateMealTotals } = await import('../utils/fct.js');
        const finalizedAnalysis = recalculateMealTotals(allItems, ai_analysis.plate_waste);

        // 2. Fetch today's existing meal logs to calculate `dailyTotals`
        const logDateStr = (logged_at ? new Date(logged_at) : new Date()).toISOString().split('T')[0];
        const startOfDay = new Date(`${logDateStr}T00:00:00.000Z`);
        const endOfDay = new Date(`${logDateStr}T23:59:59.999Z`);

        const todayLogs = await prisma.meal_logs.findMany({
            where: {
                profile_id: profile_id,
                logged_at: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            select: {
                total_calories: true,
                total_protein_g: true,
                total_carbs_g: true,
                total_fat_g: true,
                total_sugar_g: true,
                total_sodium_mg: true
            }
        });

        let dailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0 };

        todayLogs.forEach(log => {
            dailyTotals.calories += (log.total_calories || 0);
            dailyTotals.protein += (log.total_protein_g || 0);
            dailyTotals.carbs += (log.total_carbs_g || 0);
            dailyTotals.fat += (log.total_fat_g || 0);
            dailyTotals.sugar += (log.total_sugar_g || 0);
            dailyTotals.sodium += (log.total_sodium_mg || 0);
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
                consumption_percent: finalizedAnalysis.plate_waste || 100,
                total_calories: finalizedAnalysis.total_calories_est || 0,
                total_protein_g: finalizedAnalysis.macros_est?.protein_g || 0,
                total_carbs_g: finalizedAnalysis.macros_est?.carbs_g || 0,
                total_fat_g: finalizedAnalysis.macros_est?.fat_g || 0,
                total_sugar_g: finalizedAnalysis.macros_est?.sugar_g || 0,
                total_sodium_mg: finalizedAnalysis.macros_est?.sodium_mg || 0,
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
        const { id } = req.params;

        // Ownership Check
        const profile = await prisma.profiles.findUnique({ where: { id } });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin' ||
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id, status: 'active' }
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized access to meal history' });

        const logs = await prisma.meal_logs.findMany({
            where: { profile_id: id },
            include: {
                profiles: true
            },
            orderBy: { logged_at: 'desc' }
        });

        // Format to match nutritionist view requirements
        const formattedLogs = logs.map(log => ({
            ...log,
            child_name: log.profiles?.child_name,
            profile: log.profiles
        }));

        res.json(formattedLogs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE /bulk/day/:profileId/:date - Clear all logs for a specific day
router.delete('/bulk/day/:profileId/:date', verifyToken, async (req, res) => {
    const { profileId, date } = req.params;
    try {
        // Ownership Check
        const profile = await prisma.profiles.findUnique({ where: { id: profileId } });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        // Only Parents or Admins can bulk delete (Nutritionists shouldn't delete logs normally)
        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin';

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized to perform bulk deletion' });

        // Create range for the entire day in UTC to be safe
        const startOfDay = new Date(`${date}T00:00:00.000Z`);
        const endOfDay = new Date(`${date}T23:59:59.999Z`);

        const result = await prisma.meal_logs.deleteMany({
            where: {
                profile_id: profileId,
                logged_at: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        res.json({ message: `Successfully cleared ${result.count} logs for ${date}`, count: result.count });
    } catch (err) {
        console.error("Bulk delete logs error:", err);
        res.status(500).json({ message: 'Server error clearing daily logs' });
    }
});

// DELETE /:id - Delete a specific meal log
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Find the log and its profile to check ownership
        const log = await prisma.meal_logs.findUnique({
            where: { id },
            include: { profiles: true }
        });

        if (!log) return res.status(404).json({ message: 'Log not found' });

        const isAuthorized = log.profiles.user_id === req.user.id || req.user.role === 'admin';

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized: Cannot delete this log' });

        await prisma.meal_logs.delete({
            where: { id }
        });
        res.json({ message: 'Log deleted successfully' });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ message: 'Log not found' });
        }
        console.error("Delete log error:", err);
        res.status(500).json({ message: 'Server error deleting log' });
    }
});

export default router;
