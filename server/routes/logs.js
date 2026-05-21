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
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max per file
});

// CLOUDINARY Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper: Call Gemini Vision
async function analyzeImage(imageBase64) {
    const prompt = `Analyze this image.
    IMPORTANT: First, determine if there is actually food or beverages in this image. If there is NO food or beverage (e.g., it is a photo of a dog, a car, or an empty room), return exactly this JSON: { "error": "NO_FOOD_DETECTED" } and nothing else.
    
    If there IS food, use these steps:
    STEP A: Identify the plate/container size and its diameter.
    STEP B: Identify reference objects (utensils like a spoon or fork) to establish a 3D scale.
    STEP C: Compare the food volume to the reference objects (e.g., "The rice mound is roughly 2.5 spoon-widths wide").
    STEP D: Calculate the final quantity based on these observations.

    For each edible item, provide a flat JSON object with:
       - 'visual_reasoning': A short sentence describing the Step A-C analysis for this item (e.g. "Small bowl roughly fist-sized compared to spoon, suggesting 1 cup").
       - 'name': Dish or item name. CRITICAL: If the item is a branded packaged food (e.g., Fita, Skyflakes, Bear Brand), you MUST include the exact brand name in this string (e.g., "Fita Crackers").
       - 'cooking_method': Determine the method. You MUST choose exactly one from this strict list: ["Raw / Fresh", "Baked", "Blanched", "Boiled", "Braised / Stewed", "Broiled", "Deep Fried", "Fried / Pan-fried", "Grilled", "Microwaved", "Poached", "Roasted", "Sautéed / Stir-fried", "Seared", "Simmered", "Smoked", "Sous Vide", "Steamed", "Unknown"]. If inapplicable, use "Unknown".
       - 'measure_qty': Number indicating quantity. 
         CRITICAL RULE FOR RICE: For pediatric meal logs, you MUST default to exactly 1.0 Cup unless it is clearly an adult-sized mountain of rice. Do NOT use 1.5 or 1.25. If the portion is small, use 0.5. Be extremely conservative.
       - 'serving_unit': Must be one of: 'Cup', 'Spoon', 'Sandok', 'Bowl', 'Slice', 'Piece', 'Plate', or 'Serving'. Rice MUST be 'Cup'.
       - 'serving_weight_g': Estimated weight.
       - 'calories', 'protein_g', 'carbs_g', 'fat_g': Estimated macros.
       
        
    LOGICAL ESTIMATION RULES FOR BRANDED PACKAGED FOODS:
    1. If the item is a commercial branded snack/food (e.g., Fita, Skyflakes, Oreo, Nido, Bear Brand, Lactum, Milo, Pancit Canton, etc.), retrieve the standard commercial packaging size/serving size from your training data (e.g., 1 pack of Fita = 30g, containing 9 crackers, total 140 kcal).
    2. If the user requests 'Piece' or similar individual unit, divide the total package weight and macros by the typical number of pieces per pack to get the exact weight and macros for a single piece (e.g., 30g / 9 pieces = ~3.33g per piece; 140 kcal / 9 pieces = ~15.5 kcal per piece).
    3. Do NOT default single pieces of light crackers/biscuits to 10g or 100g.
    4. If the unit is 'Pack' or 'Sachet', output the exact full nutritional value for 1 full pack/sachet of that brand.
     
    Return a master JSON object with an 'items' array, a top-level 'detected_cooking_method', a 'nutrition' summary, and a 'food_exchanges' object mapping to these keys: 'vegetables', 'fruit', 'milk', 'rice', 'meat', 'fat' (values must be numbers representing the number of clinical exchanges/servings consumed based on the items).
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
            if (analysis.error === "NO_FOOD_DETECTED") {
                return res.status(400).json({
                    message: "No food detected in the image. Please upload a clear photo of a meal.",
                    error: 'NO_FOOD_DETECTED'
                });
            }
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

    // Sanitize inputs before embedding in AI prompt (prevent prompt injection)
    const safeName = String(name).trim().slice(0, 100);
    const safeUnit = serving_unit ? String(serving_unit).trim().slice(0, 50) : 'Serving';
    const safeMethod = cooking_method && cooking_method !== 'Unknown'
        ? String(cooking_method).trim().slice(0, 50)
        : '';

    if (!safeName) return res.status(400).json({ message: 'Name cannot be empty' });

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
        res.status(500).json({ message: 'Failed to analyze item' });
    }
});

// Helper to sanitize cooking_method into a single string or null
function sanitizeCookingMethod(method) {
    if (method === undefined) return undefined;
    if (method === null) return null;
    if (Array.isArray(method)) {
        return method.length > 0 ? String(method[0]).trim().slice(0, 100) : null;
    }
    const trimmed = String(method).trim().slice(0, 100);
    return trimmed.length > 0 ? trimmed : null;
}

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

    // Validate logged_at if provided
    if (logged_at) {
        const parsedDate = new Date(logged_at);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: 'Invalid logged_at date format' });
        }
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
        const safeHiddenItems = Array.isArray(hiddenItems) ? hiddenItems : (hiddenItems?.items ? hiddenItems.items : []);

        const allItems = [...(ai_analysis.items || []), ...safeHiddenItems];

        // 2. Recalculate using DOST-FNRI Local FCT mappings
        const { recalculateMealTotals } = await import('../utils/fct.js');
        const finalizedAnalysis = recalculateMealTotals(allItems, ai_analysis.plate_waste);
        finalizedAnalysis.food_exchanges = ai_analysis.food_exchanges;

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
        const complianceResult = checkCompliance(
            { ai_analysis: finalizedAnalysis },
            rules,
            dailyTotals,
            profile.allergies || []
        );

        // 4. Save to Database
        const newLog = await prisma.meal_logs.create({
            data: {
                profiles: { connect: { id: profile_id } },
                image_url,
                image_after_url,
                cooking_method: sanitizeCookingMethod(cooking_method),
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

        // 5. Auto-fulfill Adherence Logs based on AI Food Exchanges
        if (finalizedAnalysis.food_exchanges && meal_category) {
            let mappedMealType = 'Breakfast';
            const logHour = logged_at ? new Date(logged_at).getHours() : new Date().getHours();
            
            if (meal_category.toLowerCase() === 'breakfast') mappedMealType = 'Breakfast';
            else if (meal_category.toLowerCase() === 'lunch') mappedMealType = 'Lunch';
            else if (meal_category.toLowerCase() === 'dinner') mappedMealType = 'Dinner';
            else if (meal_category.toLowerCase().includes('snack')) {
                mappedMealType = logHour < 14 ? 'AM Snack' : 'PM Snack';
            }

            const logDate = (logged_at ? new Date(logged_at) : new Date()).toISOString().split('T')[0];

            const adherenceOperations = [];
            for (const cat of ['vegetables', 'fruit', 'milk', 'rice', 'meat', 'fat']) {
                if (finalizedAnalysis.food_exchanges[cat] > 0) {
                    adherenceOperations.push(prisma.daily_adherence_logs.upsert({
                        where: {
                            profile_id_date_meal_type_category: {
                                profile_id: profile_id,
                                date: new Date(logDate),
                                meal_type: mappedMealType,
                                category: cat
                            }
                        },
                        update: { completed: true, updated_at: new Date() },
                        create: {
                            profile_id: profile_id,
                            date: new Date(logDate),
                            meal_type: mappedMealType,
                            category: cat,
                            completed: true
                        }
                    }));
                }
            }
            if (adherenceOperations.length > 0) {
                // Execute without blocking the log creation return
                Promise.all(adherenceOperations).catch(e => console.error("Auto-fulfill error:", e));
            }
        }

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

// PATCH /:id - Update a specific meal log (with resubmission logic for rejected logs)
router.patch('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const {
        consumption_percent,
        cooking_method,
        water_ml,
        supplements,
        physical_activity,
        hidden_ingredients,
        meal_category,
        image_after_url
    } = req.body;

    try {
        const log = await prisma.meal_logs.findUnique({
            where: { id },
            include: { profiles: true }
        });

        if (!log) return res.status(404).json({ message: 'Log not found' });

        const isAuthorized = log.profiles.user_id === req.user.id || req.user.role === 'admin' ||
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({
                where: { nutritionist_id: req.user.id, parent_id: log.profiles.user_id, status: 'active' }
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized: Cannot edit this log' });

        const dataToUpdate = {};

        if (cooking_method !== undefined) dataToUpdate.cooking_method = sanitizeCookingMethod(cooking_method);
        if (water_ml !== undefined) dataToUpdate.water_ml = parseInt(water_ml) || 0;
        if (supplements !== undefined) dataToUpdate.supplements = supplements;
        if (physical_activity !== undefined) dataToUpdate.physical_activity = physical_activity;
        if (meal_category !== undefined) dataToUpdate.meal_category = meal_category;
        if (image_after_url !== undefined) dataToUpdate.image_after_url = image_after_url;

        // If the log was previously rejected, resubmitting it sets status back to pending
        if (log.status === 'rejected') {
            dataToUpdate.status = 'pending';
        }

        // Recalculate nutrients if consumption_percent or hidden_ingredients changes
        let updatedAnalysis = log.ai_analysis ? { ...log.ai_analysis } : { items: [] };
        let hiddenIngredientsChanged = hidden_ingredients !== undefined && hidden_ingredients !== log.hidden_ingredients;
        let consumptionChanged = consumption_percent !== undefined && consumption_percent !== log.consumption_percent;

        if (hiddenIngredientsChanged || consumptionChanged) {
            let itemsToRecalculate = [...(updatedAnalysis.items || [])];

            if (hiddenIngredientsChanged) {
                dataToUpdate.hidden_ingredients = hidden_ingredients;

                // Parse new hidden ingredients if provided and not empty
                let safeHiddenItems = [];
                if (hidden_ingredients && hidden_ingredients.trim().length > 0) {
                    const { parseTextToNutrients } = await import('../services/gemini.js');
                    const hiddenItems = await parseTextToNutrients(hidden_ingredients);
                    safeHiddenItems = Array.isArray(hiddenItems) ? hiddenItems : (hiddenItems?.items ? hiddenItems.items : []);
                }

                // Append the new hidden items
                itemsToRecalculate = [...itemsToRecalculate, ...safeHiddenItems];
            }

            const newPlateWaste = consumption_percent !== undefined ? parseInt(consumption_percent) : (updatedAnalysis.plate_waste ?? 100);
            updatedAnalysis.plate_waste = newPlateWaste;
            dataToUpdate.consumption_percent = newPlateWaste;

            const { recalculateMealTotals } = await import('../utils/fct.js');
            const finalizedAnalysis = recalculateMealTotals(itemsToRecalculate, newPlateWaste);
            updatedAnalysis = { ...updatedAnalysis, ...finalizedAnalysis };

            dataToUpdate.ai_analysis = updatedAnalysis;
            dataToUpdate.total_calories = updatedAnalysis.total_calories_est || 0;
            dataToUpdate.total_protein_g = updatedAnalysis.macros_est?.protein_g || 0;
            dataToUpdate.total_carbs_g = updatedAnalysis.macros_est?.carbs_g || 0;
            dataToUpdate.total_fat_g = updatedAnalysis.macros_est?.fat_g || 0;
            dataToUpdate.total_sugar_g = updatedAnalysis.macros_est?.sugar_g || 0;
            dataToUpdate.total_sodium_mg = updatedAnalysis.macros_est?.sodium_mg || 0;
        }

        // Recalculate daily compliance
        if (dataToUpdate.total_calories !== undefined || dataToUpdate.status === 'pending') {
            const logDate = new Date(log.logged_at);
            const startOfDay = new Date(logDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(logDate);
            endOfDay.setHours(23, 59, 59, 999);

            const otherLogs = await prisma.meal_logs.findMany({
                where: {
                    profile_id: log.profile_id,
                    id: { not: id },
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

            const dailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0 };
            otherLogs.forEach(ol => {
                dailyTotals.calories += (ol.total_calories || 0);
                dailyTotals.protein += (ol.total_protein_g || 0);
                dailyTotals.carbs += (ol.total_carbs_g || 0);
                dailyTotals.fat += (ol.total_fat_g || 0);
                dailyTotals.sugar += (ol.total_sugar_g || 0);
                dailyTotals.sodium += (ol.total_sodium_mg || 0);
            });

            const rules = await prisma.nutrition_rules.findMany({
                where: { profile_id: log.profile_id }
            });

            const { checkCompliance } = await import('../utils/compliance.js');
            const finalAnalysisForCompliance = dataToUpdate.ai_analysis || log.ai_analysis;
            const complianceResult = checkCompliance(
                { ai_analysis: finalAnalysisForCompliance },
                rules,
                dailyTotals,
                log.profiles.allergies || []
            );

            dataToUpdate.compliance_status = complianceResult.status;
            dataToUpdate.compliance_score = complianceResult.compliance_score;
            dataToUpdate.violation_details = complianceResult.details;
        }

        const updatedLog = await prisma.meal_logs.update({
            where: { id },
            data: dataToUpdate
        });

        res.json(updatedLog);

    } catch (err) {
        console.error("Update log error:", err);
        res.status(500).json({ message: 'Server error updating log', details: err.message });
    }
});

export default router;

