
import express from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { DEFAULT_MEAL_TEMPLATES } from '../data/default_meal_templates.js';
import { logAuditAction } from '../lib/auditLogger.js';

const router = express.Router();

// Middleware to check if user is a nutritionist with an approved account
const isNutritionist = (req, res, next) => {
    if (req.user.role !== 'nutritionist') {
        return res.status(403).json({ message: 'Access Denied: Nutritionist role required' });
    }
    if (req.user.status !== 'approved') {
        return res.status(403).json({ message: 'Clinical Verification Required: Your account is currently under review.' });
    }
    next();
};

const checkProfileAccess = async (req, profileId) => {
    if (!profileId) return false;
    const profile = await prisma.profiles.findUnique({ where: { id: profileId } });
    if (!profile) return false;
    if (req.user.role === 'admin') return true;
    if (profile.user_id === req.user.id) return true;
    const isLinked = await prisma.nutritionist_clients.findFirst({
        where: { nutritionist_id: req.user.id, parent_id: profile.user_id, status: 'active' }
    });
    return !!isLinked;
};

// POST /invite - Link a parent to this nutritionist by email
router.post('/invite', verifyToken, isNutritionist, async (req, res) => {
    const { email } = req.body;

    // --- Input Validation (MUST happen before .toLowerCase() to prevent server crash) ---
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
        return res.status(400).json({ message: 'A valid email address is required' });
    }
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_REGEX.test(email.trim())) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
    }

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

// POST /create-client - Create a new parent and child profile and link them with full clinical profiling, or add child to existing parent if parentId is provided
router.post('/create-client', verifyToken, isNutritionist, async (req, res) => {
    const {
        parentId,
        parent_name, parent_email,
        child_name, date_of_birth, gender,
        medical_history, family_history, food_intolerances, symptoms, medications, lifestyle_factors,
        height_cm, weight_kg, waist_circumference, weighing_time, is_fasting, is_post_voiding,
        activity_level, allergies,
        vaccinations // Array of { vaccination_type_id, date_administered, notes }
    } = req.body;

    try {
        // Input Validation
        if (!child_name || typeof child_name !== 'string' || child_name.trim().length < 1) {
            return res.status(400).json({ message: 'Child name is required' });
        }
        if (!parentId && (!parent_email || typeof parent_email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parent_email.toLowerCase()))) {
            return res.status(400).json({ message: 'A valid parent email address is required' });
        }

        const result = await prisma.$transaction(async (tx) => {
            let user;
            if (parentId) {
                user = await tx.users.findUnique({
                    where: { id: parentId }
                });
                if (!user) {
                    const error = new Error('Parent user not found');
                    error.statusCode = 404;
                    throw error;
                }
            } else {
                // Check if parent email already exists
                const existingUser = await tx.users.findUnique({
                    where: { email: parent_email.toLowerCase() }
                });

                if (existingUser) {
                    user = existingUser;
                } else {
                    // Create Parent User with a default password
                    const salt = await bcrypt.genSalt(10);
                    const defaultPasswordHash = await bcrypt.hash('smartnutri123', salt);

                    user = await tx.users.create({
                        data: {
                            email: parent_email.toLowerCase(),
                            password_hash: defaultPasswordHash,
                            full_name: parent_name,
                            role: 'parent',
                            force_password_reset: true
                        }
                    });
                }
            }

            // Create Child Profile with Clinical Details
            const profile = await tx.profiles.create({
                data: {
                    users: { connect: { id: user.id } },
                    child_name,
                    date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
                    gender,
                    height_cm: height_cm ? parseFloat(height_cm) : null,
                    weight_kg: weight_kg ? parseFloat(weight_kg) : null,
                    allergies: Array.isArray(allergies)
                        ? allergies.flatMap(a => typeof a === 'string' ? a.split(',').map(s => s.trim()) : [a]).filter(Boolean)
                        : (allergies ? String(allergies).split(',').map(s => s.trim()).filter(Boolean) : []),
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

            // Create Initial Growth Log
            if (height_cm && weight_kg) {
                await tx.growth_logs.create({
                    data: {
                        profile_id: profile.id,
                        height_cm: parseFloat(height_cm),
                        weight_kg: parseFloat(weight_kg)
                    }
                });
            }

            // Add Vaccinations if provided
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

            // Link to Nutritionist if not already linked
            const existingLink = await tx.nutritionist_clients.findUnique({
                where: {
                    nutritionist_id_parent_id: {
                        nutritionist_id: req.user.id,
                        parent_id: user.id
                    }
                }
            });

            if (!existingLink) {
                await tx.nutritionist_clients.create({
                    data: {
                        nutritionist_id: req.user.id,
                        parent_id: user.id,
                        status: 'active'
                    }
                });
            }

            return { user, profile };
        });

        res.status(201).json({ message: 'Patient profile created and linked successfully', data: result });

    } catch (err) {
        console.error(err);
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
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
                        profile_image_url: true,
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
                profile_image_url: link.parent.profile_image_url,
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
                    status: 'approved'
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

// DELETE /clients/:id - Unlink a client connection completely
router.delete('/clients/:id', verifyToken, isNutritionist, async (req, res) => {
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
            return res.status(404).json({ message: 'Client connection not found' });
        }

        await prisma.nutritionist_clients.delete({
            where: {
                nutritionist_id_parent_id: {
                    nutritionist_id: req.user.id,
                    parent_id: req.params.id
                }
            }
        });

        res.json({ success: true, message: 'Client unlinked successfully' });
    } catch (err) {
        console.error("Failed to unlink client:", err);
        res.status(500).json({ message: 'Failed to unlink client' });
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
        if (!(await checkProfileAccess(req, profile_id))) return res.status(403).json({ message: 'Access Denied: Unlinked profile' });
    } catch(err) {
        return res.status(500).json({ message: 'Authorization error' });
    }

    if (!profile_id || typeof profile_id !== 'string') {
        return res.status(400).json({ message: 'profile_id is required' });
    }
    if (!rule_name || typeof rule_name !== 'string' || rule_name.trim().length === 0) {
        return res.status(400).json({ message: 'rule_name is required' });
    }
    if (!category || typeof category !== 'string' || category.trim().length === 0) {
        return res.status(400).json({ message: 'category is required' });
    }
    if (rule_type && !['min', 'max', 'range'].includes(rule_type)) {
        return res.status(400).json({ message: 'rule_type must be one of: min, max, range' });
    }

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
        if (!rule) return res.status(404).json({ message: 'Not found' });
        if (!(await checkProfileAccess(req, rule.profile_id))) return res.status(403).json({ message: 'Access Denied: Unlinked profile' });

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
        const rule = await prisma.nutrition_rules.findUnique({ where: { id: req.params.id } });
        if (!rule) return res.status(404).json({ message: 'Not found' });
        if (!(await checkProfileAccess(req, rule.profile_id))) return res.status(403).json({ message: 'Access Denied: Unlinked profile' });
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

        const dob2 = new Date(profile.date_of_birth);
        const now2 = new Date();
        let age = now2.getFullYear() - dob2.getFullYear();
        const bpassed = now2.getMonth() > dob2.getMonth() ||
            (now2.getMonth() === dob2.getMonth() && now2.getDate() >= dob2.getDate());
        if (!bpassed) age--;

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

        // Add clinical templates (Water)
        const ageGroup = age >= 1 && age <= 3 ? '1-3' : (age >= 4 && age <= 8 ? '4-8' : '9-13');

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
    const { nutritionist_review, status, water_ml } = req.body;

    // --- Input Validation ---
    const VALID_REVIEW_STATUSES = ['reviewed', 'approved', 'rejected', 'verified'];
    if (status && !VALID_REVIEW_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_REVIEW_STATUSES.join(', ')}` });
    }

    try {
        const log = await prisma.meal_logs.findUnique({
            where: { id: req.params.id },
            select: { 
                profile_id: true, 
                logged_at: true,
                meal_category: true,
                ai_analysis: true,
                profiles: {
                    select: {
                        allergies: true,
                        child_name: true,
                        user_id: true
                    }
                }
            }
        });
        if (!log) return res.status(404).json({ message: 'Log not found' });
        if (!(await checkProfileAccess(req, log.profile_id))) return res.status(403).json({ message: 'Access Denied: Unlinked profile' });

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
        const complianceResult = checkCompliance({ nutritionist_review, ai_analysis: log.ai_analysis }, rules, dailyTotals, log.profiles?.allergies || []);

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
                total_sodium_mg: macros.sodium_mg || 0,
                water_ml: water_ml !== undefined ? (water_ml === null ? null : parseInt(water_ml)) : undefined
            }
        });

        // Emit real-time WebSocket alert to the parent's private room
        if (req.io && log.profiles?.user_id) {
            req.io.to(log.profiles.user_id).emit('meal-review-updated', {
                logId: req.params.id,
                childName: log.profiles.child_name,
                mealCategory: log.meal_category || 'Meal',
                status: status || 'reviewed',
                comment: nutritionist_review?.comment || ''
            });
        }

        res.json(updatedLog);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PATCH /logs/batch-verify - Verify multiple logs at once
router.patch('/logs/batch-verify', verifyToken, isNutritionist, async (req, res) => {
    const { logIds } = req.body;

    // Validate input first before any DB calls
    if (!logIds || !Array.isArray(logIds) || logIds.length === 0) {
        return res.status(400).json({ message: 'logIds must be a non-empty array' });
    }
    if (logIds.length > 100) {
        return res.status(400).json({ message: 'Cannot verify more than 100 logs at once' });
    }
    if (!logIds.every(id => typeof id === 'string' && id.trim().length > 0)) {
        return res.status(400).json({ message: 'All log IDs must be valid non-empty strings' });
    }

    try {
        // Fetch all logs in the batch to get their profile IDs
        const logs = await prisma.meal_logs.findMany({
            where: { id: { in: logIds } },
            select: { 
                id: true, 
                profile_id: true,
                meal_category: true,
                profiles: {
                    select: {
                        child_name: true,
                        user_id: true
                    }
                }
            }
        });

        if (logs.length === 0) {
            return res.status(404).json({ message: 'No matching logs found' });
        }

        // SECURITY: Check access for EVERY unique profile in the batch, not just the first
        const uniqueProfileIds = [...new Set(logs.map(l => l.profile_id).filter(Boolean))];
        for (const profileId of uniqueProfileIds) {
            if (!(await checkProfileAccess(req, profileId))) {
                return res.status(403).json({ message: 'Access Denied: One or more logs belong to an unlinked profile' });
            }
        }

        // Only update logs that were actually found (prevent verifying arbitrary IDs)
        const verifiedIds = logs.map(l => l.id);
        await prisma.meal_logs.updateMany({
            where: { id: { in: verifiedIds } },
            data: { status: 'verified' }
        });

        // Emit real-time WebSocket alert for each batch-verified log to the parents
        if (req.io) {
            logs.forEach(l => {
                if (l.profiles?.user_id) {
                    req.io.to(l.profiles.user_id).emit('meal-review-updated', {
                        logId: l.id,
                        childName: l.profiles.child_name,
                        mealCategory: l.meal_category || 'Meal',
                        status: 'verified',
                        comment: 'Batch verified by clinician'
                    });
                }
            });
        }

        res.json({ message: 'Logs verified successfully', verifiedCount: verifiedIds.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /plan/meal-templates - Get all weekly meal templates for this nutritionist (with auto-seeding)
router.get('/plan/meal-templates', verifyToken, isNutritionist, async (req, res) => {
    try {
        let templates = await prisma.meal_plan_templates.findMany({
            where: { nutritionist_id: req.user.id },
            orderBy: { created_at: 'asc' }
        });

        // Auto-seed defaults if nutritionist has none
        if (templates.length === 0) {
            console.log(`Auto-seeding ${DEFAULT_MEAL_TEMPLATES.length} meal templates for nutritionist ${req.user.id}`);
            await prisma.$transaction(
                DEFAULT_MEAL_TEMPLATES.map(t => 
                    prisma.meal_plan_templates.create({
                        data: {
                            nutritionist_id: req.user.id,
                            name: t.name,
                            description: t.description,
                            target_age: t.target_age,
                            days: t.days,
                            is_default: true
                        }
                    })
                )
            );

            templates = await prisma.meal_plan_templates.findMany({
                where: { nutritionist_id: req.user.id },
                orderBy: { created_at: 'asc' }
            });
        }

        res.json(templates);
    } catch (err) {
        console.error("Error fetching meal templates:", err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /plan/meal-templates - Create a new weekly meal template
router.post('/plan/meal-templates', verifyToken, isNutritionist, async (req, res) => {
    const { name, description, target_age, days } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Template name is required' });
    }
    try {
        const newTemplate = await prisma.meal_plan_templates.create({
            data: {
                nutritionist_id: req.user.id,
                name,
                description,
                target_age,
                days: days || {},
                is_default: false
            }
        });
        res.status(201).json(newTemplate);
    } catch (err) {
        console.error("Error creating meal template:", err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PATCH /plan/meal-templates/:id - Update an existing weekly meal template
router.patch('/plan/meal-templates/:id', verifyToken, isNutritionist, async (req, res) => {
    const { id } = req.params;
    const { name, description, target_age, days } = req.body;
    try {
        const template = await prisma.meal_plan_templates.findUnique({
            where: { id }
        });

        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        if (template.nutritionist_id !== req.user.id) {
            return res.status(403).json({ message: 'Access Denied: You do not own this template' });
        }

        const updatedTemplate = await prisma.meal_plan_templates.update({
            where: { id },
            data: {
                name: name !== undefined ? name : template.name,
                description: description !== undefined ? description : template.description,
                target_age: target_age !== undefined ? target_age : template.target_age,
                days: days !== undefined ? days : template.days,
                updated_at: new Date()
            }
        });

        res.json(updatedTemplate);
    } catch (err) {
        console.error("Error updating meal template:", err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE /plan/meal-templates/:id - Delete a weekly meal template
router.delete('/plan/meal-templates/:id', verifyToken, isNutritionist, async (req, res) => {
    const { id } = req.params;
    try {
        const template = await prisma.meal_plan_templates.findUnique({
            where: { id }
        });

        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        if (template.nutritionist_id !== req.user.id) {
            return res.status(403).json({ message: 'Access Denied: You do not own this template' });
        }

        await prisma.meal_plan_templates.delete({
            where: { id }
        });

        res.json({ message: 'Template deleted successfully' });
    } catch (err) {
        console.error("Error deleting meal template:", err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PATCH /plan/meal/:id - Edit an individual meal plan entry
router.patch('/plan/meal/:id', verifyToken, isNutritionist, async (req, res) => {
    const { id } = req.params;
    const { recipe_name, calories, protein_g, carbs_g, fats_g, meal_type } = req.body;
    try {
        const meal = await prisma.meal_plans.findUnique({
            where: { id },
            include: { profiles: true }
        });

        if (!meal) {
            return res.status(404).json({ message: 'Meal plan entry not found' });
        }

        // Verify nutritionist permissions: either creator OR linked to parent
        const isCreator = meal.nutritionist_id === req.user.id;
        const isLinked = await prisma.nutritionist_clients.findFirst({
            where: {
                nutritionist_id: req.user.id,
                parent_id: meal.profiles?.user_id,
                status: 'active'
            }
        });

        if (!isCreator && !isLinked) {
            return res.status(403).json({ message: 'Access Denied: You are not authorized to edit this meal plan entry' });
        }

        const updatedMeal = await prisma.meal_plans.update({
            where: { id },
            data: {
                recipe_name: recipe_name !== undefined ? recipe_name : meal.recipe_name,
                calories: calories !== undefined ? (calories === null ? null : parseInt(calories)) : meal.calories,
                protein_g: protein_g !== undefined ? (protein_g === null ? null : parseInt(protein_g)) : meal.protein_g,
                carbs_g: carbs_g !== undefined ? (carbs_g === null ? null : parseInt(carbs_g)) : meal.carbs_g,
                fats_g: fats_g !== undefined ? (fats_g === null ? null : parseInt(fats_g)) : meal.fats_g,
                meal_type: meal_type !== undefined ? meal_type : meal.meal_type
            }
        });

        res.json(updatedMeal);
    } catch (err) {
        console.error("Error updating meal plan entry:", err);
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

        // SECURITY: Verify this nutritionist is linked to this profile
        if (!(await checkProfileAccess(req, profileId))) {
            return res.status(403).json({ message: 'Access Denied: Unlinked profile' });
        }

        // Guard: weight and DOB are required for a meaningful plan
        if (!profile.weight_kg || !profile.date_of_birth) {
            return res.status(400).json({ message: 'Child profile is missing weight or date of birth. Please update the profile before generating a plan.' });
        }

        // 2. Fetch Rules
        const rules = await prisma.nutrition_rules.findMany({
            where: { profile_id: profileId }
        });

        // 3. Construct Prompt
        const rulesText = rules.map(r => `- ${r.category}: ${r.rule_name} (${JSON.stringify(r.rule_definition)})`).join('\n');

        // Birthday-aware age calculation
        const dob = new Date(profile.date_of_birth);
        const today = new Date();
        let childAge = today.getFullYear() - dob.getFullYear();
        const hasBirthdayPassed = today.getMonth() > dob.getMonth() ||
            (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
        if (!hasBirthdayPassed) childAge--;

        const prompt = `
        Act as a professional pediatric nutritionist. Generate a 7-day meal plan for a child with the following profile:
        - Age: ${childAge} years old
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
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() + 1);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

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
        if (!(await checkProfileAccess(req, profile_id))) return res.status(403).json({ message: 'Access Denied: Unlinked profile' });
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
        const meal = await prisma.meal_plans.findUnique({ where: { id: req.params.id } });
        if (!meal || meal.nutritionist_id !== req.user.id) return res.status(403).json({ message: 'Access Denied' });
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
        if (!(await checkProfileAccess(req, req.params.profileId))) return res.status(403).json({ message: 'Access Denied: Unlinked profile' });
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

        // Log Protected Health Information (PHI) read access for HIPAA/DPA compliance
        await logAuditAction({
            adminId: req.user.id,
            targetId: profile.user_id,
            action: 'READ_ADIME_NOTES',
            entityType: 'PROFILE',
            entityId: req.params.profileId,
            details: {
                accessed_by: req.user.email,
                role: req.user.role,
                child_name: profile.child_name,
                notes_count: notes.length
            },
            ipAddress: req.ip
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
        if (!(await checkProfileAccess(req, profile_id))) return res.status(403).json({ message: 'Access Denied: Unlinked profile' });
        
        // Fetch parent user ID for targetId in audit logs
        const profile = await prisma.profiles.findUnique({
            where: { id: profile_id },
            select: { user_id: true }
        });
        const parentUserId = profile?.user_id || null;

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

        // Log creation of clinical notes for HIPAA/DPA compliance
        await logAuditAction({
            adminId: req.user.id,
            targetId: parentUserId,
            action: 'CREATE_ADIME_NOTE',
            entityType: 'ADIME_NOTES',
            entityId: newNote.id,
            details: {
                created_by: req.user.email,
                profile_id
            },
            ipAddress: req.ip
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
        const note = await prisma.adime_notes.findUnique({ where: { id: req.params.id } });
        if (!note || note.nutritionist_id !== req.user.id) return res.status(403).json({ message: 'Access Denied' });
        
        // Fetch parent user ID for targetId in audit logs
        const profile = await prisma.profiles.findUnique({
            where: { id: note.profile_id },
            select: { user_id: true }
        });
        const parentUserId = profile?.user_id || null;

        const updated = await prisma.adime_notes.update({
            where: { id: req.params.id },
            data: { assessment, diagnosis, intervention, monitoring, evaluation }
        });

        // Log modification of clinical notes for HIPAA/DPA compliance
        await logAuditAction({
            adminId: req.user.id,
            targetId: parentUserId,
            action: 'UPDATE_ADIME_NOTE',
            entityType: 'ADIME_NOTES',
            entityId: req.params.id,
            details: {
                updated_by: req.user.email,
                profile_id: note.profile_id
            },
            ipAddress: req.ip
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
        const note = await prisma.adime_notes.findUnique({ where: { id: req.params.id } });
        if (!note || note.nutritionist_id !== req.user.id) return res.status(403).json({ message: 'Access Denied' });
        
        // Fetch parent user ID for targetId in audit logs before deletion
        const profile = await prisma.profiles.findUnique({
            where: { id: note.profile_id },
            select: { user_id: true }
        });
        const parentUserId = profile?.user_id || null;

        await prisma.adime_notes.delete({
            where: { id: req.params.id }
        });

        // Log deletion of clinical notes for HIPAA/DPA compliance
        await logAuditAction({
            adminId: req.user.id,
            targetId: parentUserId,
            action: 'DELETE_ADIME_NOTE',
            entityType: 'ADIME_NOTES',
            entityId: req.params.id,
            details: {
                deleted_by: req.user.email,
                profile_id: note.profile_id
            },
            ipAddress: req.ip
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
        waist_circumference,
        activity_level,
        child_name,
        date_of_birth,
        gender,
        weigh_in_conditions,
        family_history,
        food_intolerances,
        symptoms,
        lifestyle_factors
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
                bristol_stool_scale: bristol_stool_scale !== undefined
                    ? (bristol_stool_scale !== '' && bristol_stool_scale !== null ? parseInt(bristol_stool_scale) : null)
                    : undefined,
                allergies: allergies !== undefined
                    ? (Array.isArray(allergies)
                        ? allergies.flatMap(a => typeof a === 'string' ? a.split(',').map(s => s.trim()) : [a]).filter(Boolean)
                        : (allergies ? String(allergies).split(',').map(s => s.trim()).filter(Boolean) : []))
                    : undefined,
                dietary_preferences,
                height_cm: height_cm ? parseFloat(height_cm) : undefined,
                weight_kg: weight_kg ? parseFloat(weight_kg) : undefined,
                waist_circumference: waist_circumference !== undefined
                    ? (waist_circumference && waist_circumference !== '' ? parseFloat(waist_circumference) : null)
                    : undefined,
                activity_level,
                child_name,
                date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
                gender,
                weigh_in_conditions,
                family_history,
                food_intolerances,
                symptoms,
                lifestyle_factors
            }
        });

        // 3. Write growth log if height_cm or weight_kg changed
        const heightChanged = updated.height_cm !== profile.height_cm;
        const weightChanged = updated.weight_kg !== profile.weight_kg;

        if ((heightChanged || weightChanged) && updated.height_cm !== null && updated.weight_kg !== null) {
            await prisma.growth_logs.create({
                data: {
                    profile_id: id,
                    height_cm: updated.height_cm,
                    weight_kg: updated.weight_kg
                }
            });
        }
        // Re-validate compliance for all child's meal logs if allergies changed
        const allergiesChanged = allergies !== undefined && 
            JSON.stringify(updated.allergies) !== JSON.stringify(profile.allergies);
        if (allergiesChanged) {
            try {
                const { revalidateProfileLogs } = await import('../utils/compliance.js');
                await revalidateProfileLogs(prisma, id);
            } catch (revalErr) {
                console.error(`Error revalidating logs for profile ${id} after allergy change:`, revalErr);
            }
        }

        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// NOTE: Duplicate unprotected route block removed. All meal plan routes
// are defined above (lines ~908–1130) with proper authorization checks.


// POST /plan/apply-template - Apply a weekly meal template to a profile for a week
router.post('/plan/apply-template', verifyToken, isNutritionist, async (req, res) => {
    try {
        const { templateId, profileId, startDate } = req.body;
        if (!(await checkProfileAccess(req, profileId))) return res.status(403).json({ message: 'Access Denied: Unlinked profile' });
        const template = await prisma.meal_plan_templates.findFirst({
            where: {
                id: templateId,
                nutritionist_id: req.user.id
            }
        });
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        const baseDate = new Date(startDate);
        baseDate.setHours(0, 0, 0, 0);

        const endDate = new Date(baseDate);
        endDate.setDate(baseDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

        const dayOffsets = {
            "Monday": 0,
            "Tuesday": 1,
            "Wednesday": 2,
            "Thursday": 3,
            "Friday": 4,
            "Saturday": 5,
            "Sunday": 6
        };

        await prisma.$transaction(async (tx) => {
            // Delete existing plans in this 7-day range
            await tx.meal_plans.deleteMany({
                where: {
                    profile_id: profileId,
                    date: {
                        gte: baseDate,
                        lte: endDate
                    }
                }
            });

            // Insert new template plans
            for (const [dayName, meals] of Object.entries(template.days)) {
                const offset = dayOffsets[dayName];
                if (offset === undefined) continue;

                const mealDate = new Date(baseDate);
                mealDate.setDate(baseDate.getDate() + offset);

                for (const meal of meals) {
                    await tx.meal_plans.create({
                        data: {
                            profile_id: profileId,
                            date: mealDate,
                            meal_type: meal.meal_type,
                            recipe_name: meal.recipe_name,
                            calories: meal.calories,
                            protein_g: meal.protein_g,
                            carbs_g: meal.carbs_g,
                            fats_g: meal.fats_g,
                            nutritionist_id: req.user.id
                        }
                    });
                }
            }
        });

        res.json({ message: 'Weekly template applied successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- Portion Templates Routes ---

// GET /portion-templates - Get all templates for the nutritionist
router.get('/portion-templates', verifyToken, isNutritionist, async (req, res) => {
    try {
        let templates = await prisma.portion_templates.findMany({
            where: {
                OR: [
                    { nutritionist_id: req.user.id },
                    { nutritionist_id: null }
                ]
            },
            orderBy: { created_at: 'desc' }
        });

        // Auto-seed universal portion templates if none exist in the database (similar to meal templates auto-seeding)
        const universalCount = await prisma.portion_templates.count({
            where: { nutritionist_id: null }
        });

        if (universalCount === 0) {
            console.log("Auto-seeding universal clinical portion templates...");
            const defaultPortionTemplates = [
                {
                    template_name: "Toddler Balanced Template (1-2 years)",
                    matrix: [
                        { meal_type: 'Breakfast', vegetables: '', fruit: '1/2 pc', milk: '1 cup', rice: '1/2 cup', meat: '1/2 exchange', fat: '1 tsp', sugar: '' },
                        { meal_type: 'AM Snack',  vegetables: '', fruit: '1/2 pc', milk: '1/2 cup', rice: '1/4 cup', meat: '', fat: '', sugar: '' },
                        { meal_type: 'Lunch',     vegetables: '1/2 cup', fruit: '', milk: '', rice: '1/2 cup', meat: '1 exchange', fat: '1 tsp', sugar: '' },
                        { meal_type: 'PM Snack',  vegetables: '', fruit: '', milk: '1/2 cup', rice: '1/4 cup', meat: '', fat: '', sugar: '' },
                        { meal_type: 'Dinner',    vegetables: '1/2 cup', fruit: '', milk: '', rice: '1/2 cup', meat: '1 exchange', fat: '1 tsp', sugar: '' },
                    ]
                },
                {
                    template_name: "Preschooler Balanced Template (3-5 years)",
                    matrix: [
                        { meal_type: 'Breakfast', vegetables: '', fruit: '1 pc', milk: '1 cup', rice: '1 cup', meat: '1 exchange', fat: '1 tsp', sugar: '' },
                        { meal_type: 'AM Snack',  vegetables: '', fruit: '1 pc', milk: '', rice: '1/2 cup', meat: '', fat: '', sugar: '' },
                        { meal_type: 'Lunch',     vegetables: '1/2 cup', fruit: '', milk: '', rice: '1 cup', meat: '1.5 exchanges', fat: '1 tsp', sugar: '' },
                        { meal_type: 'PM Snack',  vegetables: '', fruit: '', milk: '1 cup', rice: '1/2 cup', meat: '', fat: '', sugar: '' },
                        { meal_type: 'Dinner',    vegetables: '1/2 cup', fruit: '', milk: '', rice: '1 cup', meat: '1 exchange', fat: '1 tsp', sugar: '' },
                    ]
                },
                {
                    template_name: "Grade-Schooler Balanced Template (6-9 years)",
                    matrix: [
                        { meal_type: 'Breakfast', vegetables: '', fruit: '1 pc', milk: '1 cup', rice: '1.5 cups', meat: '1.5 exchanges', fat: '2 tsp', sugar: '' },
                        { meal_type: 'AM Snack',  vegetables: '', fruit: '1 pc', milk: '', rice: '1 cup', meat: '', fat: '', sugar: '' },
                        { meal_type: 'Lunch',     vegetables: '1 cup', fruit: '', milk: '', rice: '1.5 cups', meat: '2 exchanges', fat: '2 tsp', sugar: '' },
                        { meal_type: 'PM Snack',  vegetables: '', fruit: '', milk: '1 cup', rice: '1 cup', meat: '', fat: '', sugar: '' },
                        { meal_type: 'Dinner',    vegetables: '1 cup', fruit: '', milk: '', rice: '1.5 cups', meat: '1.5 exchanges', fat: '2 tsp', sugar: '' },
                    ]
                }
            ];

            await prisma.$transaction(
                defaultPortionTemplates.map(t => 
                    prisma.portion_templates.create({
                        data: {
                            nutritionist_id: null,
                            template_name: t.template_name,
                            matrix: t.matrix
                        }
                    })
                )
            );

            // Re-fetch templates
            templates = await prisma.portion_templates.findMany({
                where: {
                    OR: [
                        { nutritionist_id: req.user.id },
                        { nutritionist_id: null }
                    ]
                },
                orderBy: { created_at: 'desc' }
            });
        }

        res.json(templates);
    } catch (err) {
        console.error("Error fetching portion templates:", err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /portion-templates - Save a new template
router.post('/portion-templates', verifyToken, isNutritionist, async (req, res) => {
    const { template_name, matrix } = req.body;
    try {
        const newTemplate = await prisma.portion_templates.create({
            data: {
                nutritionist_id: req.user.id,
                template_name,
                matrix
            }
        });
        res.json(newTemplate);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE /portion-templates/:id - Delete a template
router.delete('/portion-templates/:id', verifyToken, isNutritionist, async (req, res) => {
    try {
        const template = await prisma.portion_templates.findUnique({
            where: { id: req.params.id }
        });
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }
        if (template.nutritionist_id !== req.user.id) {
            return res.status(403).json({ message: 'Access Denied: You are not authorized to delete this template' });
        }
        await prisma.portion_templates.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- Portion Planning Routes ---

// GET /portion-plan/:profileId - Get the portion exchange matrix for a profile
router.get('/portion-plan/:profileId', verifyToken, async (req, res) => {
    try {
        // SECURITY: Verify the requesting user has access to this profile
        if (!(await checkProfileAccess(req, req.params.profileId))) {
            return res.status(403).json({ message: 'Access Denied: Unlinked profile' });
        }

        const plans = await prisma.portion_plans.findMany({
            where: { profile_id: req.params.profileId }
        });

        // Clean up legacy "0" values from before the text migration
        const cleanedPlans = plans.map(plan => {
            const cleanPlan = { ...plan };
            ['vegetables', 'fruit', 'milk', 'rice', 'meat', 'fat', 'sugar'].forEach(key => {
                if (cleanPlan[key] === "0") {
                    cleanPlan[key] = "";
                }
            });
            return cleanPlan;
        });

        res.json(cleanedPlans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /portion-plan - Save/Update the entire portion matrix
router.post('/portion-plan', verifyToken, isNutritionist, async (req, res) => {
    const { profile_id, matrix } = req.body;
    try {
        if (!(await checkProfileAccess(req, profile_id))) return res.status(403).json({ message: 'Access Denied: Unlinked profile' });
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
                    vegetables: row.vegetables || '',
                    fruit: row.fruit || '',
                    milk: row.milk || '',
                    rice: row.rice || '',
                    meat: row.meat || '',
                    fat: row.fat || '',
                    sugar: row.sugar || '',
                    updated_at: new Date()
                },
                create: {
                    profile_id,
                    nutritionist_id: req.user.id,
                    meal_type: row.meal_type,
                    vegetables: row.vegetables || '',
                    fruit: row.fruit || '',
                    milk: row.milk || '',
                    rice: row.rice || '',
                    meat: row.meat || '',
                    fat: row.fat || '',
                    sugar: row.sugar || ''
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

// --- Adherence Tracking Routes ---

// GET /adherence/:profileId - Get adherence logs for a profile on a specific date
router.get('/adherence/:profileId', verifyToken, async (req, res) => {
    const { date } = req.query; // format: YYYY-MM-DD
    try {
        if (!(await checkProfileAccess(req, req.params.profileId))) return res.status(403).json({ message: 'Access Denied: Unlinked profile' });
        if (!date) return res.status(400).json({ message: 'Date is required' });

        const logs = await prisma.daily_adherence_logs.findMany({
            where: {
                profile_id: req.params.profileId,
                date: new Date(date)
            }
        });
        res.json(logs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /adherence/:profileId - Toggle adherence for a specific meal and category
router.post('/adherence/:profileId', verifyToken, async (req, res) => {
    const { date, meal_type, category, completed } = req.body;
    try {
        if (!(await checkProfileAccess(req, req.params.profileId))) return res.status(403).json({ message: 'Access Denied: Unlinked profile' });
        const log = await prisma.daily_adherence_logs.upsert({
            where: {
                profile_id_date_meal_type_category: {
                    profile_id: req.params.profileId,
                    date: new Date(date),
                    meal_type,
                    category
                }
            },
            update: {
                completed,
                updated_at: new Date()
            },
            create: {
                profile_id: req.params.profileId,
                date: new Date(date),
                meal_type,
                category,
                completed
            }
        });
        res.json(log);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
// Restart trigger comment to reload prisma client.
