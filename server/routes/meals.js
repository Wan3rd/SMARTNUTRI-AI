import express from 'express';
import axios from 'axios';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Helper: Fetch recipes from Edamam
async function fetchEdamamRecipes(query, options = {}, edamamUser) {
    try {
        const EDAMAM_APP_ID = process.env.EDAMAM_APP_ID;
        const EDAMAM_APP_KEY = process.env.EDAMAM_APP_KEY;

        const params = {
            type: 'public',
            q: query,
            app_id: EDAMAM_APP_ID,
            app_key: EDAMAM_APP_KEY,
            random: options.random !== undefined ? options.random : true
        };

        // Optional Filters
        if (options.caloriesMin !== undefined && options.caloriesMax !== undefined) {
            params.calories = `${options.caloriesMin}-${options.caloriesMax}`;
        }

        if (options.mealType) params.mealType = options.mealType;
        if (options.cuisineType) params.cuisineType = options.cuisineType;
        if (options.diet) params.diet = options.diet.toLowerCase(); // Edamam expects lowercase for diet usually

        if (options.health && Array.isArray(options.health) && options.health.length > 0) {
            params.health = options.health.map(h => h.toLowerCase());
        }

        const headers = {};
        const envUser = process.env.EDAMAM_USER_ID;

        // Priority: Env Var > Passed User ID
        if (envUser && envUser.trim().length > 0) {
            headers['Edamam-Account-User'] = envUser.trim();
        } else if (edamamUser) {
            headers['Edamam-Account-User'] = edamamUser;
        }

        // Axios handles array params by default as key[]=value, but Edamam wants key=value&key=value
        // We can use paramsSerializer if needed, but standard repeats often work. 
        // Let's rely on axios default. If it fails, we might need a custom serializer.
        console.log("Fetching Edamam with Params:", params);

        const response = await axios.get(EDAMAM_API_URL, {
            params,
            headers,
            paramsSerializer: {
                indexes: null // Result: health=vegan&health=vegetarian (no brackets)
            }
        });
        return response.data.hits.map(hit => hit.recipe); // Return array of recipe objects
    } catch (err) {
        console.error(`Edamam Fetch Error for ${query}:`, err.message);
        if (err.response) console.error(err.response.data);
        return [];
    }
}

// GET /search (Replading Spoonacular Search)
router.get('/search', verifyToken, async (req, res) => {
    try {
        const { query, mealType, diet, health, cuisine } = req.query;

        // Parse health (ensure it's an array)
        let healthFilters = [];
        if (health) {
            healthFilters = Array.isArray(health) ? health : [health];
        }

        const options = {
            mealType,
            diet,
            health: healthFilters,
            cuisineType: cuisine,
            random: false // Disable randomization for search to prioritize relevance
        };

        const recipes = await fetchEdamamRecipes(query || 'healthy', options, req.user.id);

        // Map to consistent format for Frontend
        const formatted = recipes.map(r => ({
            id: r.uri.split('#recipe_')[1], // Extract ID from URI
            title: r.label,
            image: r.images.REGULAR?.url || r.image, // Edamam image
            nutrition: {
                calories: Math.round(r.calories / r.yield),
                protein: Math.round(r.totalNutrients.PROCNT.quantity / r.yield) + 'g',
                carbs: Math.round(r.totalNutrients.CHOCDF.quantity / r.yield) + 'g',
                fat: Math.round(r.totalNutrients.FAT.quantity / r.yield) + 'g',
            }
        }));

        res.json({ results: formatted });

    } catch (err) {
        res.status(500).json({ message: 'Search Failed' });
    }
});

// GET /plans (Must be before /:id)
router.get('/plans', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { profileId } = req.query;

        let activeProfileId = profileId;

        if (!activeProfileId) {
            const profile = await prisma.profiles.findFirst({
                where: { user_id: userId },
                select: { id: true }
            });
            if (!profile) return res.json([]);
            activeProfileId = profile.id;
        }

        const plans = await prisma.meal_plans.findMany({
            where: { profile_id: activeProfileId },
            orderBy: { date: 'asc' }
        });
        res.json(plans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

const EDAMAM_API_URL = 'https://api.edamam.com/api/recipes/v2';

// GET /:id (Recipe Details)
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const EDAMAM_APP_ID = process.env.EDAMAM_APP_ID;
        const EDAMAM_APP_KEY = process.env.EDAMAM_APP_KEY;

        const headers = {};
        const envUser = process.env.EDAMAM_USER_ID;
        if (envUser && envUser.trim().length > 0) {
            headers['Edamam-Account-User'] = envUser.trim();
        }

        // Fix: Use correct v2 look up by ID logic or search by URI if needed, but plain ID is simplest
        const response = await axios.get(`${EDAMAM_API_URL}/${id}`, {
            params: {
                type: 'public',
                app_id: EDAMAM_APP_ID,
                app_key: EDAMAM_APP_KEY
            },
            headers
        });

        const r = response.data.recipe;

        // Format to match old Spoonacular structure for Frontend compatibility
        const formatted = {
            title: r.label,
            image: r.images.LARGE?.url || r.image,
            readyInMinutes: r.totalTime || 15,
            servings: r.yield,
            summary: "Delicious healthy recipe from Edamam.",
            extendedIngredients: r.ingredientLines.map((line, i) => ({ id: i, original: line })),
            instructions: `See full instructions at: ${r.url}`,
            sourceUrl: r.url,
            nutrition: {
                nutrients: [
                    { name: 'Calories', amount: Math.round(r.calories / r.yield), unit: 'kcal' },
                    { name: 'Protein', amount: Math.round(r.totalNutrients.PROCNT.quantity / r.yield), unit: 'g' },
                    { name: 'Carbohydrates', amount: Math.round(r.totalNutrients.CHOCDF?.quantity / r.yield || 0), unit: 'g' },
                    { name: 'Fat', amount: Math.round(r.totalNutrients.FAT?.quantity / r.yield || 0), unit: 'g' },
                    { name: 'Fiber', amount: Math.round(r.totalNutrients.FIBTG?.quantity / r.yield || 0), unit: 'g' },
                    { name: 'Sugar', amount: Math.round(r.totalNutrients.SUGAR?.quantity / r.yield || 0), unit: 'g' },
                    { name: 'Sodium', amount: Math.round(r.totalNutrients.NA?.quantity / r.yield || 0), unit: 'mg' },
                ]
            }
        };

        res.json(formatted);

    } catch (err) {
        console.error("Edamam Detail Error", err);
        res.status(500).json({ message: 'Failed to fetch details' });
    }
});

// POST /generate (Custom Week Generator)
router.post('/generate', verifyToken, async (req, res) => {
    console.log("Creating generation plan...");
    try {
        // 1. Get User Profile
        const userId = req.user.id;
        const { profileId } = req.body;

        let profile;
        if (profileId) {
            profile = await prisma.profiles.findUnique({
                where: { id: profileId }
            });
        } else {
            profile = await prisma.profiles.findFirst({
                where: { user_id: userId }
            });
        }

        if (!profile) {
            return res.status(404).json({ message: 'Child profile not found.' });
        }
        console.log("Profile found:", profile.id);

        // 2. Calculate TDEE (Same as before)
        const weight = profile.weight_kg;
        const years = new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear();
        let bmr = (years < 10) ? (22.7 * weight) + 495 : (17.5 * weight) + 651;
        const activityMultipliers = { 'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55, 'very_active': 1.725 };
        const tdee = Math.round(bmr * (activityMultipliers[profile.activity_level] || 1.2));
        console.log("Calculated TDEE:", tdee);

        // 3. Define Meal Targets
        const targets = [
            { type: 'Breakfast', cal: tdee * 0.25, mealType: 'Breakfast' },
            { type: 'Lunch', cal: tdee * 0.35, mealType: 'Lunch' },
            { type: 'Dinner', cal: tdee * 0.30, mealType: 'Dinner' },
            { type: 'Snack', cal: tdee * 0.10, mealType: 'Snack' }
        ];

        // 4. Fetch Recipes for each type
        const allMeals = {};
        for (const t of targets) {
            const min = Math.max(0, Math.round(t.cal - 100)); // Buffer
            const max = Math.round(t.cal + 100);

            const prefixes = [
                `Easy Filipino ${t.mealType}`,
                `Simple Asian ${t.mealType}`,
                `Filipino Household ${t.mealType}`,
                `Easy Kid Friendly ${t.mealType}`,
                `5 Ingredient ${t.mealType}`,
                `15 Minute ${t.mealType}`,
                `One Pot ${t.mealType}`,
                `Healthy Comfort Food ${t.mealType}`
            ];

            if (t.type === 'Lunch' || t.type === 'Dinner') {
                prefixes.push('Chicken Adobo', 'Sinigang', 'Tinola', 'Ginisang', 'Chicken Stir Fry', 'Oven Baked Chicken', 'Pasta with Veggies', 'Rice Bowl');
            } else if (t.type === 'Breakfast') {
                prefixes.push('Silog', 'Pandesal', 'Lugaw', 'Pancakes', 'Omelet', 'Yogurt Bowl', 'Toast');
            }

            let randomQuery = prefixes[Math.floor(Math.random() * prefixes.length)];
            console.log(`Fetching ${t.type} (${min}-${max} kcal) with query: "${randomQuery}"`);
            let recipes = await fetchEdamamRecipes(randomQuery, { caloriesMin: min, caloriesMax: max, mealType: t.mealType }, userId);

            if (recipes.length === 0) {
                console.log(`No results for "${randomQuery}". Fallback: "Kid Friendly ${t.mealType}"`);
                recipes = await fetchEdamamRecipes(`${t.mealType} kid friendly`, { caloriesMin: min, caloriesMax: max, mealType: t.mealType }, userId);
            }

            if (recipes.length === 0) {
                console.log(`Critical Fallback: Generic "${t.mealType}"`);
                recipes = await fetchEdamamRecipes(t.mealType, { caloriesMin: min, caloriesMax: max, mealType: t.mealType }, userId);
            }

            allMeals[t.type] = recipes;
        }

        // 5. Generate 7 Days
        console.log("Saving to database...");

        const today = new Date();
        const startStr = new Date(today);
        const endStr = new Date(today);
        endStr.setDate(endStr.getDate() + 6);

        await prisma.$transaction(async (tx) => {
            // Delete existing plans in the range
            await tx.meal_plans.deleteMany({
                where: {
                    profile_id: profile.id,
                    date: {
                        gte: startStr,
                        lte: endStr
                    }
                }
            });

            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() + i);

                for (const t of targets) {
                    const recipeList = allMeals[t.type];
                    if (recipeList && recipeList.length > 0) {
                        const r = recipeList[i % recipeList.length];
                        const recipeId = r.uri.split('#recipe_')[1];

                        await tx.meal_plans.create({
                            data: {
                                profile_id: profile.id,
                                date: date,
                                meal_type: t.type,
                                recipe_name: r.label,
                                calories: Math.round(r.calories / r.yield),
                                protein_g: Math.round((r.totalNutrients.PROCNT?.quantity || 0) / r.yield),
                                carbs_g: Math.round((r.totalNutrients.CHOCDF?.quantity || 0) / r.yield),
                                fats_g: Math.round((r.totalNutrients.FAT?.quantity || 0) / r.yield),
                                image_url: r.images.SMALL?.url || r.image,
                                recipe_id: recipeId
                            }
                        });
                    }
                }
            }
        });

        res.json({ message: 'Edamam Plan Generated', tdee });

    } catch (err) {
        console.error("Generation Top Level Error:", err);
        res.status(500).json({ message: 'Generation Failed' });
    }
});

// POST /generate/day (Regenerate for a specific date)
router.post('/generate/day', verifyToken, async (req, res) => {
    const { date: targetDateStr, profileId } = req.body;
    console.log(`Regenerating plan for date: ${targetDateStr}`);

    if (!targetDateStr) {
        return res.status(400).json({ message: 'Date is required.' });
    }

    try {
        // 1. Get User Profile
        const userId = req.user.id;
        let profile;
        if (profileId) {
            profile = await prisma.profiles.findUnique({
                where: { id: profileId }
            });
        } else {
            profile = await prisma.profiles.findFirst({
                where: { user_id: userId }
            });
        }

        if (!profile) {
            return res.status(404).json({ message: 'Child profile not found.' });
        }

        // 2. Calculate TDEE
        const weight = profile.weight_kg;
        const years = new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear();
        let bmr = (years < 10) ? (22.7 * weight) + 495 : (17.5 * weight) + 651;
        const activityMultipliers = { 'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55, 'very_active': 1.725 };
        const tdee = Math.round(bmr * (activityMultipliers[profile.activity_level] || 1.2));

        // 3. Define Meal Targets
        const targets = [
            { type: 'Breakfast', cal: tdee * 0.25, mealType: 'Breakfast' },
            { type: 'Lunch', cal: tdee * 0.35, mealType: 'Lunch' },
            { type: 'Dinner', cal: tdee * 0.30, mealType: 'Dinner' },
            { type: 'Snack', cal: tdee * 0.10, mealType: 'Snack' }
        ];

        // 4. Fetch Recipes and Save
        await prisma.$transaction(async (tx) => {
            // Delete existing plans for this date
            await tx.meal_plans.deleteMany({
                where: {
                    profile_id: profile.id,
                    date: new Date(targetDateStr)
                }
            });

            for (const t of targets) {
                const min = Math.max(0, Math.round(t.cal - 100));
                const max = Math.round(t.cal + 100);

                const prefixes = [
                    `Easy Filipino ${t.mealType}`,
                    `Simple Asian ${t.mealType}`,
                    `Easy Kid Friendly ${t.mealType}`,
                    `5 Ingredient ${t.mealType}`,
                    `15 Minute ${t.mealType}`,
                    `Healthy Comfort Food ${t.mealType}`
                ];

                if (t.type === 'Lunch' || t.type === 'Dinner') {
                    prefixes.push('Chicken Adobo', 'Sinigang', 'Tinola', 'Chicken Stir Fry', 'Oven Baked Chicken');
                }

                let randomQuery = prefixes[Math.floor(Math.random() * prefixes.length)];
                let recipes = await fetchEdamamRecipes(randomQuery, { caloriesMin: min, caloriesMax: max, mealType: t.mealType, random: true }, userId);

                if (recipes.length === 0) {
                    recipes = await fetchEdamamRecipes(t.mealType, { caloriesMin: min, caloriesMax: max, mealType: t.mealType, random: true }, userId);
                }

                if (recipes.length > 0) {
                    const r = recipes[Math.floor(Math.random() * recipes.length)];
                    const recipeId = r.uri.split('#recipe_')[1];
                    await tx.meal_plans.create({
                        data: {
                            profile_id: profile.id,
                            date: new Date(targetDateStr),
                            meal_type: t.type,
                            recipe_name: r.label,
                            calories: Math.round(r.calories / r.yield),
                            protein_g: Math.round((r.totalNutrients.PROCNT?.quantity || 0) / r.yield),
                            carbs_g: Math.round((r.totalNutrients.CHOCDF?.quantity || 0) / r.yield),
                            fats_g: Math.round((r.totalNutrients.FAT?.quantity || 0) / r.yield),
                            image_url: r.images.SMALL?.url || r.image,
                            recipe_id: recipeId
                        }
                    });
                }
            }
        });

        res.json({ message: 'Day Regenerated Successfully' });

    } catch (err) {
        console.error("Day Generation Failed:", err);
        res.status(500).json({ message: 'Day Generation Failed' });
    }
});

export default router;
