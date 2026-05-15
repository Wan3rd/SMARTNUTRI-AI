import express from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Middleware to check if user is a nutritionist
const isNutritionist = (req, res, next) => {
    if (req.user.role !== 'nutritionist') {
        return res.status(403).json({ message: 'Access Denied: Nutritionist role required' });
    }
    next();
};

// POST /invite - Link a parent to this nutritionist by email
router.post('/invite', verifyToken, isNutritionist, async (req, res) => {
    const { email } = req.body;
    try {
        // 1. Find the parent user
        const user = await prisma.users.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true, role: true, email: true, full_name: true }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'parent') {
            return res.status(400).json({ message: 'User is not a parent account' });
        }

        // 2. Check if already linked
        const existingLink = await prisma.nutritionist_clients.findUnique({
            where: {
                nutritionist_id_parent_id: {
                    nutritionist_id: req.user.id,
                    parent_id: user.id
                }
            }
        });

        if (existingLink) {
            return res.status(400).json({ message: 'Client is already linked to you' });
        }

        // 3. Create Link
        await prisma.nutritionist_clients.create({
            data: {
                nutritionist_id: req.user.id,
                parent_id: user.id,
                status: 'active'
            }
        });

        res.json({ message: 'Client linked successfully', client: user });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /create-client - Create a new parent and child profile and link them with full clinical profiling
router.post('/create-client', verifyToken, isNutritionist, async (req, res) => {
    const { 
        parent_name, parent_email, 
        child_name, date_of_birth, gender,
        medical_history, family_history, food_intolerances, symptoms, medications, lifestyle_factors,
        height_cm, weight_kg, waist_circumference, weighing_time, is_fasting, is_post_voiding,
        activity_level, allergies,
        vaccinations // Array of { vaccination_type_id, date_administered, notes }
    } = req.body;

    try {
        // 1. Check if parent email already exists
        const existingUser = await prisma.users.findUnique({
            where: { email: parent_email.toLowerCase() }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'A user with this email already exists. Use the Link Client option instead.' });
        }

        // 2. Create Parent User with a default password
        const salt = await bcrypt.genSalt(10);
        const defaultPasswordHash = await bcrypt.hash('smartnutri123', salt);

        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.users.create({
                data: {
                    email: parent_email.toLowerCase(),
                    password_hash: defaultPasswordHash,
                    full_name: parent_name,
                    role: 'parent',
                    force_password_reset: true
                }
            });

            // 3. Create Child Profile with Clinical Details
            const profile = await tx.profiles.create({
                data: {
                    users: { connect: { id: user.id } },
                    child_name,
                    date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
                    gender,
                    height_cm: height_cm ? parseFloat(height_cm) : null,
                    weight_kg: weight_kg ? parseFloat(weight_kg) : null,
                    activity_level,
                    allergies: Array.isArray(allergies) ? allergies : (allergies ? [allergies] : []),
                    medical_history: medical_history || '',
                    family_history: family_history || '',
                    food_intolerances: food_intolerances || '',
                    symptoms: symptoms || '',
                    medications: medications || '',
                    lifestyle_factors: lifestyle_factors || '',
                    waist_circumference: waist_circumference ? parseFloat(waist_circumference) : null,
                    weighing_time,
                    is_fasting: is_fasting || false,
                    is_post_voiding: is_post_voiding || false
                }
            });

            // 4. Create Initial Growth Log
            if (height_cm && weight_kg) {
                await tx.growth_logs.create({
                    data: {
                        profile_id: profile.id,
                        height_cm: parseFloat(height_cm),
                        weight_kg: parseFloat(weight_kg)
                    }
                });
            }

            // 5. Add Vaccinations if provided
            if (vaccinations && Array.isArray(vaccinations) && vaccinations.length > 0) {
                const vaccinationData = vaccinations.map(v => ({
                    profile_id: profile.id,
                    vaccination_type_id: v.vaccination_type_id,
                    date_administered: v.date_administered ? new Date(v.date_administered) : new Date(),
                    notes: v.notes || 'Recorded during initial profiling'
                }));
                
                await tx.profile_vaccinations.createMany({
                    data: vaccinationData
                });
            }
            
            // 6. Link to Nutritionist
            await tx.nutritionist_clients.create({
                data: {
                    nutritionist_id: req.user.id,
                    parent_id: user.id,
                    status: 'active'
                }
            });

            return { user, profile };
        });

        res.status(201).json({ message: 'Patient profile created and linked successfully', data: result });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /clients - List all parents linked to this nutritionist
router.get('/clients', verifyToken, isNutritionist, async (req, res) => {
    try {
        const { status } = req.query; // 'active' or 'archived'
        const whereClause = { nutritionist_id: req.user.id };
        if (status) {
            whereClause.status = status;
        }

        const clientLinks = await prisma.nutritionist_clients.findMany({
            where: whereClause,
            include: {
                parent: {
                    select: {
                        id: true,
                        email: true,
                        full_name: true,
                        deleted_at: true,
                        deactivation_reason: true
                    }
                }
            }
        });

        // Safety check: Filter out any links where the parent record might be missing
        const formattedClients = clientLinks
            .filter(link => link.parent)
            .map(link => ({
                id: link.parent.id,
                email: link.parent.email,
                full_name: link.parent.full_name,
                status: link.status || 'active',
                deleted_at: link.parent.deleted_at,
                deactivation_reason: link.parent.deactivation_reason,
                created_at: link.created_at
            }));

        res.json(formattedClients);
    } catch (err) {
        console.error("CRITICAL: Failed to fetch clinical clients:", err);
        res.status(500).json({ 
            message: 'Internal Server Error', 
            error: process.env.NODE_ENV === 'development' ? err.message : undefined 
        });
    }
});

// GET /clients/:id - Get specific client details
router.get('/clients/:id', verifyToken, isNutritionist, async (req, res) => {
    try {
        // SECURITY: Verify that this client is linked to the requesting nutritionist (regardless of status)
        const isLinked = await prisma.nutritionist_clients.findFirst({
            where: { nutritionist_id: req.user.id, parent_id: req.params.id }
        });
        if (!isLinked && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access Denied: Client not linked to your account' });
        }

        const client = await prisma.users.findUnique({
            where: { id: req.params.id },
            select: { 
                id: true, 
                email: true, 
                full_name: true, 
                deleted_at: true, 
                deactivation_reason: true,
                status: true
            }
        });
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.json(client);
    } catch (err) {
        console.error("CRITICAL: Failed to fetch client details:", err);
        res.status(500).json({ 
            message: 'Internal Server Error', 
            error: process.env.NODE_ENV === 'development' ? err.message : undefined 
        });
    }
});

// PATCH /clients/:id/restore - Restore a deactivated client
router.patch('/clients/:id/restore', verifyToken, isNutritionist, async (req, res) => {
    try {
        const link = await prisma.nutritionist_clients.findUnique({
            where: {
                nutritionist_id_parent_id: {
                    nutritionist_id: req.user.id,
                    parent_id: req.params.id
                }
            }
        });

        if (!link) {
            return res.status(404).json({ message: 'Client link not found' });
        }

        await prisma.$transaction([
            // Restore User
            prisma.users.update({
                where: { id: req.params.id },
                data: {
                    deleted_at: null,
                    deactivation_reason: null,
                    status: 'active'
                }
            }),
            // Update Link Status
            prisma.nutritionist_clients.update({
                where: {
                    nutritionist_id_parent_id: {
                        nutritionist_id: req.user.id,
                        parent_id: req.params.id
                    }
                },
                data: { status: 'active' }
            })
        ]);

        res.json({ success: true, message: 'Client account restored successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to restore client account' });
    }
});

// GET /clients/:parentId/profiles - Get children profiles for a client
router.get('/clients/:parentId/profiles', verifyToken, isNutritionist, async (req, res) => {
    try {
        // SECURITY: Verify Link
        const isLinked = await prisma.nutritionist_clients.findFirst({
            where: { nutritionist_id: req.user.id, parent_id: req.params.parentId }
        });
        if (!isLinked && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized access to client profiles' });
        }

        const profiles = await prisma.profiles.findMany({
            where: { user_id: req.params.parentId }
        });
        res.json(profiles);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /rules - Set a new nutrition rule
router.post('/rules', verifyToken, isNutritionist, async (req, res) => {
    const { profile_id, category, rule_name, rule_definition, rule_type, rule_value, rule_unit, is_standard } = req.body;
    try {
        const newRule = await prisma.nutrition_rules.create({
            data: {
                profile_id,
                nutritionist_id: req.user.id,
                category,
                rule_name,
                rule_definition: rule_definition,
                rule_type,
                rule_value: rule_value ? parseFloat(rule_value) : null,
                rule_unit,
                is_standard: is_standard || false
            }
        });

        // Trigger background re-validation
        const { revalidateProfileLogs } = await import('../utils/compliance.js');
        await revalidateProfileLogs(prisma, profile_id);

        res.status(201).json(newRule);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /rules/:profileId - Get rules for a profile
router.get('/rules/:profileId', verifyToken, async (req, res) => {
    try {
        const { profileId } = req.params;

        // SECURITY: Check if nutritionist owns this profile's parent client
        const profile = await prisma.profiles.findUnique({ where: { id: profileId } });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin' || 
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({ 
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id } 
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized access to rules' });

        const rules = await prisma.nutrition_rules.findMany({
            where: { profile_id: profileId },
            orderBy: { created_at: 'desc' }
        });
        res.json(rules);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE /rules/:id - Delete a nutrition rule
router.delete('/rules/:id', verifyToken, isNutritionist, async (req, res) => {
    try {
        const rule = await prisma.nutrition_rules.findUnique({ where: { id: req.params.id } });
        if (!rule) return res.status(404).json({ message: 'Rule not found' });

        await prisma.nutrition_rules.delete({
            where: { id: req.params.id }
        });

        // Trigger background re-validation
        const { revalidateProfileLogs } = await import('../utils/compliance.js');
        await revalidateProfileLogs(prisma, rule.profile_id);

        res.json({ message: 'Rule deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PATCH /rules/:id - Update an existing nutrition rule
router.patch('/rules/:id', verifyToken, isNutritionist, async (req, res) => {
    const { id } = req.params;
    const { rule_name, rule_type, rule_value, rule_unit, rule_definition, category } = req.body;
    try {
        const updatedRule = await prisma.nutrition_rules.update({
            where: { id: id },
            data: {
                rule_name,
                rule_type,
                rule_value: rule_value ? parseFloat(rule_value) : undefined,
                rule_unit,
                rule_definition,
                category
            }
        });

        // Trigger background re-validation
        const { revalidateProfileLogs } = await import('../utils/compliance.js');
        await revalidateProfileLogs(prisma, updatedRule.profile_id);

        res.json(updatedRule);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update rule' });
    }
});

// GET /standards/:profileId - Get recommended standards for a profile
router.get('/standards/:profileId', verifyToken, isNutritionist, async (req, res) => {
    try {
        const profile = await prisma.profiles.findUnique({
            where: { id: req.params.profileId }
        });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        const age = new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear();

        const { getPDRITargets, GLOBAL_LIMITS } = await import('../utils/standards.js');
        const targets = getPDRITargets(age, profile.gender);

        // Construct recommended templates
        const templates = [];
        if (targets) {
            templates.push({
                name: `PDRI Energy (${targets.energy} kcal)`,
                category: 'Calories',
                rule_name: 'Daily Energy Goal',
                rule_type: 'min',
                rule_value: targets.energy,
                rule_unit: 'kcal'
            });
            templates.push({
                name: `PDRI Protein (${targets.protein}g)`,
                category: 'Protein',
                rule_name: 'Daily Protein Goal',
                rule_type: 'min',
                rule_value: targets.protein,
                rule_unit: 'g'
            });
        }

        // Add clinical templates (Iron, Calcium, Fiber, Water)
        const ageGroup = age >= 1 && age <= 3 ? '1-3' : (age >= 4 && age <= 8 ? '4-8' : '9-13');
        
        if (GLOBAL_LIMITS.IRON_MIN_MG[ageGroup]) {
            templates.push({
                name: `Clinical Iron (${GLOBAL_LIMITS.IRON_MIN_MG[ageGroup]}mg)`,
                category: 'Iron',
                rule_name: 'Iron Deficiency Prevention',
                rule_type: 'min',
                rule_value: GLOBAL_LIMITS.IRON_MIN_MG[ageGroup],
                rule_unit: 'mg'
            });
        }

        if (GLOBAL_LIMITS.CALCIUM_MIN_MG[ageGroup]) {
            templates.push({
                name: `Clinical Calcium (${GLOBAL_LIMITS.CALCIUM_MIN_MG[ageGroup]}mg)`,
                category: 'Calcium',
                rule_name: 'Bone Growth Support',
                rule_type: 'min',
                rule_value: GLOBAL_LIMITS.CALCIUM_MIN_MG[ageGroup],
                rule_unit: 'mg'
            });
        }

        const fiberGoal = typeof GLOBAL_LIMITS.FIBER_MIN_G === 'function' ? GLOBAL_LIMITS.FIBER_MIN_G(age) : 20;
        templates.push({
            name: `Clinical Fiber (${fiberGoal}g)`,
            category: 'Fiber',
            rule_name: 'GI Health Goal',
            rule_type: 'min',
            rule_value: fiberGoal,
            rule_unit: 'g'
        });

        if (GLOBAL_LIMITS.WATER_MIN_ML[ageGroup]) {
            templates.push({
                name: `Hydration (${GLOBAL_LIMITS.WATER_MIN_ML[ageGroup]}ml)`,
                category: 'Fluid/Water',
                rule_name: 'Daily Hydration Goal',
                rule_type: 'min',
                rule_value: GLOBAL_LIMITS.WATER_MIN_ML[ageGroup],
                rule_unit: 'ml'
            });
        }

        // Add sugar limit template (WHO)
        templates.push({
            name: 'WHO Sugar Limit (Max 25g)',
            category: 'Added Sugars',
            rule_name: 'Added Sugar Limit',
            rule_type: 'max',
            rule_value: 25,
            rule_unit: 'g'
        });

        res.json(templates);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /logs/pending - Get logs for clients needing review
router.get('/logs/pending', verifyToken, isNutritionist, async (req, res) => {
    try {
        const logs = await prisma.meal_logs.findMany({
            where: {
                status: 'pending',
                profiles: {
                    users: {
                        nutritionists: {
                            some: {
                                nutritionist_id: req.user.id
                            }
                        }
                    }
                }
            },
            include: {
                profiles: true
            },
            orderBy: {
                logged_at: 'desc'
            }
        });

        const formattedLogs = logs.map(log => ({
            ...log,
            child_name: log.profiles.child_name,
            profile: log.profiles
        }));

        res.json(formattedLogs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PATCH /logs/:id/review - Provide nutritionist feedback
router.patch('/logs/:id/review', verifyToken, isNutritionist, async (req, res) => {
    const { nutritionist_review, status } = req.body;
    try {
        // 1. Get current log to find profile_id and logged_at
        const log = await prisma.meal_logs.findUnique({
            where: { id: req.params.id },
            select: { profile_id: true, logged_at: true }
        });
        if (!log) return res.status(404).json({ message: 'Log not found' });

        const { profile_id, logged_at } = log;

        // 2. Fetch today's existing meal logs (excluding this one) to calculate cumulative dailyTotals
        const logDate = new Date(logged_at);
        const startOfDay = new Date(logDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(logDate);
        endOfDay.setHours(23, 59, 59, 999);

        const otherLogs = await prisma.meal_logs.findMany({
            where: {
                profile_id: profile_id,
                id: { not: req.params.id }, // Exclude current log
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

        // 3. Fetch Rules
        const rules = await prisma.nutrition_rules.findMany({
            where: { profile_id: profile_id }
        });

        // 4. Check Compliance (Dynamic Import)
        const { checkCompliance } = await import('../utils/compliance.js');
        const complianceResult = checkCompliance({ nutritionist_review }, rules, dailyTotals);

        // 5. Update Log with first-class nutritional columns
        const verified = nutritionist_review?.verified_analysis || {};
        const macros = verified.macros_est || {};

        const updatedLog = await prisma.meal_logs.update({
            where: { id: req.params.id },
            data: {
                nutritionist_review,
                status: status || 'reviewed',
                compliance_status: complianceResult.status,
                compliance_score: complianceResult.compliance_score,
                violation_details: complianceResult.details,
                // Sync dedicated columns
                consumption_percent: verified.plate_waste || 100,
                total_calories: verified.total_calories_est || 0,
                total_protein_g: macros.protein_g || 0,
                total_carbs_g: macros.carbs_g || 0,
                total_fat_g: macros.fat_g || 0,
                total_sugar_g: macros.sugar_g || 0,
                total_sodium_mg: macros.sodium_mg || 0
            }
        });
        res.json(updatedLog);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PATCH /logs/batch-verify - Verify multiple logs at once
router.patch('/logs/batch-verify', verifyToken, isNutritionist, async (req, res) => {
    const { logIds } = req.body;
    try {
        if (!logIds || !Array.isArray(logIds)) {
            return res.status(400).json({ message: 'Invalid log IDs' });
        }

        await prisma.meal_logs.updateMany({
            where: { id: { in: logIds } },
            data: { status: 'verified' }
        });
        
        res.json({ message: 'Logs verified successfully', verifiedCount: logIds.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /plan/:profileId - Get active meal plan for a profile
router.get('/plan/:profileId', verifyToken, isNutritionist, async (req, res) => {
    try {
        // SECURITY: Link check
        const profile = await prisma.profiles.findUnique({ where: { id: req.params.profileId } });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin' || 
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({ 
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id } 
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized access to meal plans' });

        const plans = await prisma.meal_plans.findMany({
            where: { profile_id: req.params.profileId },
            orderBy: { date: 'asc' }
        });
        res.json(plans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /plan/generate - Generate a 7-day meal plan
router.post('/plan/generate', verifyToken, isNutritionist, async (req, res) => {
    const { profileId } = req.body;
    try {
        // 1. Fetch Profile Data
        const profile = await prisma.profiles.findUnique({
            where: { id: profileId }
        });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        // 2. Fetch Rules
        const rules = await prisma.nutrition_rules.findMany({
            where: { profile_id: profileId }
        });

        // 3. Construct Prompt
        const rulesText = rules.map(r => `- ${r.category}: ${r.rule_name} (${JSON.stringify(r.rule_definition)})`).join('\n');

        const prompt = `
        Act as a professional pediatric nutritionist. Generate a 7-day meal plan for a child with the following profile:
        - Age: ${new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()} years old
        - Weight: ${profile.weight_kg}kg
        - Height: ${profile.height_cm}cm
        - Activity Level: ${profile.activity_level}
        - Allergies: ${profile.allergies ? profile.allergies.join(', ') : 'None'}
        - Dietary Preferences: ${profile.dietary_preferences || 'None'}

        STRICTLY FOLLOW THESE NUTRITION RULES:
        ${rulesText}

        Output a PURE JSON object ONLY. Do not include any text before or after the JSON. No markdown backticks. 
        ENSURE all keys and values are properly quoted.
        Structure:
        {
          "Monday": {
            "Breakfast": { "name": "Meal Name", "calories": 300, "macros": { "protein": "10g", "carbs": "40g", "fat": "10g" } },
            "Lunch": { "name": "...", "calories": 400, "macros": { ... } },
            "Dinner": { "name": "...", "calories": 400, "macros": { ... } },
            "Snack": { "name": "...", "calories": 200, "macros": { ... } }
          },
          ... (Repeat for all 7 days: Monday to Sunday)
        }
        Keep meals simple, child-friendly, and healthy.
        `;

        // 4. Call Gemini
        const { generateText } = await import('../services/gemini.js');
        let aiOutput = await generateText(prompt);

        // --- ROBUST JSON CLEANUP ---
        // 1. Find the first '{' and last '}' to strip any surrounding text/garbage
        const firstBrace = aiOutput.indexOf('{');
        const lastBrace = aiOutput.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            aiOutput = aiOutput.substring(firstBrace, lastBrace + 1);
        }

        // 2. Fix common AI errors (like the extra empty strings or trailing commas)
        aiOutput = aiOutput
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .replace(/""\s+/g, '') // Fix the specific AI error reported ("" followed by key)
            .replace(/,\s*}/g, '}') // Trailing commas in objects
            .replace(/,\s*]/g, ']') // Trailing commas in arrays
            .trim();

        let planData;
        try {
            planData = JSON.parse(aiOutput);
        } catch (e) {
            console.error("Failed to parse AI JSON. Raw output:", aiOutput);
            // One last attempt: try to remove any remaining non-JSON characters
            try {
                const veryClean = aiOutput.replace(/[^\x20-\x7E]/g, ''); // Remove non-printable chars
                planData = JSON.parse(veryClean);
            } catch (e2) {
                return res.status(500).json({ message: 'AI generation failed (invalid format). Please try again.' });
            }
        }

        // 5. Save to Database
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() + 1);
        startDate.setHours(0,0,0,0);

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23,59,59,999);

        await prisma.$transaction(async (tx) => {
            // Clear existing plans for this range
            await tx.meal_plans.deleteMany({
                where: {
                    profile_id: profileId,
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });

            let dayEntries = Array.isArray(planData) ? planData : Object.values(planData);

            for (let i = 0; i < 7; i++) {
                if (!dayEntries[i]) continue;

                const date = new Date(startDate);
                date.setDate(date.getDate() + i);

                const meals = dayEntries[i];

                for (const [mealType, meal] of Object.entries(meals)) {
                    if (!meal || !meal.name) continue;

                    const parseMacro = (val) => parseInt(String(val).replace(/[^0-9]/g, '')) || 0;

                    await tx.meal_plans.create({
                        data: {
                            profile_id: profileId,
                            nutritionist_id: req.user.id,
                            date: date,
                            meal_type: mealType,
                            recipe_name: meal.name,
                            calories: meal.calories || 0,
                            protein_g: parseMacro(meal.macros?.protein || 0),
                            carbs_g: parseMacro(meal.macros?.carbs || 0),
                            fats_g: parseMacro(meal.macros?.fat || 0),
                            image_url: 'https://via.placeholder.com/150?text=AI+Meal',
                            recipe_id: 'ai-gen-' + Math.random().toString(36).substr(2, 9)
                        }
                    });
                }
            }
        });

        res.status(201).json({ message: 'Plan generated and saved successfully', startDate: startDate.toISOString().split('T')[0] });

    } catch (err) {
        console.error("Plan Generation Error:", err);
        res.status(500).json({ message: 'Failed to generate plan', error: err.message });
    }
});

// POST /plan/meal - Manually add a meal to a plan
router.post('/plan/meal', verifyToken, isNutritionist, async (req, res) => {
    const { profile_id, date, meal_type, recipe_name, calories, protein_g, carbs_g, fats_g } = req.body;
    try {
        const meal = await prisma.meal_plans.create({
            data: {
                profile_id,
                date: new Date(date),
                meal_type,
                recipe_name,
                calories: parseInt(calories) || 0,
                protein_g: parseInt(protein_g) || 0,
                carbs_g: parseInt(carbs_g) || 0,
                fats_g: parseInt(fats_g) || 0,
                nutritionist_id: req.user.id,
                recipe_id: 'manual-' + Date.now()
            }
        });
        res.status(201).json(meal);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to add manual meal' });
    }
});

// DELETE /plan/meal/:id - Delete a meal from a plan
router.delete('/plan/meal/:id', verifyToken, isNutritionist, async (req, res) => {
    try {
        await prisma.meal_plans.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Meal deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete meal' });
    }
});

// DELETE /plan/all/:profileId - Clear entire plan for a profile
router.delete('/plan/all/:profileId', verifyToken, isNutritionist, async (req, res) => {
    try {
        await prisma.meal_plans.deleteMany({
            where: { profile_id: req.params.profileId }
        });
        res.json({ message: 'Plan cleared successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to clear plan' });
    }
});

// GET /adime-notes/:profileId - Get clinical notes for a profile
router.get('/adime-notes/:profileId', verifyToken, async (req, res) => {
    try {
        // SECURITY: Verify clinical link
        const profile = await prisma.profiles.findUnique({ where: { id: req.params.profileId } });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin' || 
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({ 
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id } 
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized access to clinical notes' });

        const notes = await prisma.adime_notes.findMany({
            where: { profile_id: req.params.profileId },
            orderBy: { created_at: 'desc' }
        });
        res.json(notes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /adime-notes - Create a clinical note
router.post('/adime-notes', verifyToken, isNutritionist, async (req, res) => {
    const { profile_id, assessment, diagnosis, intervention, monitoring, evaluation } = req.body;
    try {
        const newNote = await prisma.adime_notes.create({
            data: {
                profile_id,
                nutritionist_id: req.user.id,
                assessment,
                diagnosis,
                intervention,
                monitoring,
                evaluation
            }
        });
        res.status(201).json(newNote);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PATCH /adime-notes/:id - Update a clinical note
router.patch('/adime-notes/:id', verifyToken, isNutritionist, async (req, res) => {
    const { assessment, diagnosis, intervention, monitoring, evaluation } = req.body;
    try {
        const updated = await prisma.adime_notes.update({
            where: { id: req.params.id },
            data: { assessment, diagnosis, intervention, monitoring, evaluation }
        });
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE /adime-notes/:id - Delete a clinical note
router.delete('/adime-notes/:id', verifyToken, isNutritionist, async (req, res) => {
    try {
        await prisma.adime_notes.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Clinical note deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PATCH /clients/profile/:id - Nutritionist updates a child's clinical profile
router.patch('/clients/profile/:id', verifyToken, isNutritionist, async (req, res) => {
    const { id } = req.params;
    const { 
        medical_history, 
        medications, 
        vaccinations, 
        bristol_stool_scale, 
        allergies, 
        dietary_preferences,
        height_cm,
        weight_kg,
        activity_level,
        child_name,
        date_of_birth,
        gender
    } = req.body;

    try {
        // 1. Verify this profile belongs to a client linked to this nutritionist
        const profile = await prisma.profiles.findUnique({
            where: { id: id },
            include: {
                users: {
                    include: {
                        nutritionists: {
                            where: { nutritionist_id: req.user.id }
                        }
                    }
                }
            }
        });

        if (!profile || profile.users.nutritionists.length === 0) {
            return res.status(403).json({ message: 'Unauthorized: This child is not your client' });
        }

        // 2. Update Profile
        const updated = await prisma.profiles.update({
            where: { id: id },
            data: {
                medical_history,
                medications,
                vaccinations,
                bristol_stool_scale: bristol_stool_scale ? parseInt(bristol_stool_scale) : undefined,
                allergies,
                dietary_preferences,
                height_cm: height_cm ? parseFloat(height_cm) : undefined,
                weight_kg: weight_kg ? parseFloat(weight_kg) : undefined,
                activity_level,
                child_name,
                date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
                gender
            }
        });

        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- Meal Planning Routes ---

// GET /plan/:profileId - Get meal plans for a profile
router.get('/plan/:profileId', verifyToken, async (req, res) => {
    try {
        const plans = await prisma.meal_plans.findMany({
            where: { profile_id: req.params.profileId },
            orderBy: { date: 'asc' }
        });
        res.json(plans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /plan/meal - Add a meal to the plan
router.post('/plan/meal', verifyToken, isNutritionist, async (req, res) => {
    const { profile_id, date, meal_type, recipe_name, calories, protein_g, carbs_g, fats_g } = req.body;
    try {
        const newMeal = await prisma.meal_plans.create({
            data: {
                profile_id,
                date: new Date(date),
                meal_type,
                recipe_name,
                calories: calories ? parseInt(calories) : null,
                protein_g: protein_g ? parseInt(protein_g) : null,
                carbs_g: carbs_g ? parseInt(carbs_g) : null,
                fats_g: fats_g ? parseInt(fats_g) : null,
                nutritionist_id: req.user.id
            }
        });
        res.status(201).json(newMeal);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE /plan/meal/:mealId - Remove a meal from the plan
router.delete('/plan/meal/:mealId', verifyToken, isNutritionist, async (req, res) => {
    try {
        await prisma.meal_plans.delete({
            where: { id: req.params.mealId }
        });
        res.json({ message: 'Meal removed from plan' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE /plan/:profileId - Clear all plans for a profile
router.delete('/plan/:profileId', verifyToken, isNutritionist, async (req, res) => {
    try {
        await prisma.meal_plans.deleteMany({
            where: { profile_id: req.params.profileId }
        });
        res.json({ message: 'Meal plan cleared' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- Portion Planning Routes ---

// GET /portion-plan/:profileId - Get the portion exchange matrix for a profile
router.get('/portion-plan/:profileId', verifyToken, async (req, res) => {
    try {
        const plans = await prisma.portion_plans.findMany({
            where: { profile_id: req.params.profileId }
        });
        res.json(plans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /portion-plan - Save/Update the entire portion matrix
router.post('/portion-plan', verifyToken, isNutritionist, async (req, res) => {
    const { profile_id, matrix } = req.body; // matrix: [{ meal_type, vegetables, ... }]
    try {
        // We use a transaction to ensure all or nothing
        const operations = matrix.map(row => 
            prisma.portion_plans.upsert({
                where: { 
                    profile_id_meal_type: { 
                        profile_id, 
                        meal_type: row.meal_type 
                    } 
                },
                update: {
                    vegetables: parseFloat(row.vegetables) || 0,
                    fruit: parseFloat(row.fruit) || 0,
                    milk: parseFloat(row.milk) || 0,
                    rice: parseFloat(row.rice) || 0,
                    meat: parseFloat(row.meat) || 0,
                    fat: parseFloat(row.fat) || 0,
                    sugar: row.sugar,
                    updated_at: new Date()
                },
                create: {
                    profile_id,
                    nutritionist_id: req.user.id,
                    meal_type: row.meal_type,
                    vegetables: parseFloat(row.vegetables) || 0,
                    fruit: parseFloat(row.fruit) || 0,
                    milk: parseFloat(row.milk) || 0,
                    rice: parseFloat(row.rice) || 0,
                    meat: parseFloat(row.meat) || 0,
                    fat: parseFloat(row.fat) || 0,
                    sugar: row.sugar
                }
            })
        );

        await prisma.$transaction(operations);
        res.json({ message: 'Portion plan updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
