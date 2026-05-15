import express from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.js';
import { upload, cloudinary } from '../lib/cloudinary.js';
import { getGrowthStatus } from '../utils/growth.js';

const router = express.Router();

// Get all profiles for logged in user
router.get('/', verifyToken, async (req, res) => {
    try {
        const profiles = await prisma.profiles.findMany({
            where: { user_id: req.user.id }
        });
        res.json(profiles);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Create a new child profile
router.post('/', verifyToken, async (req, res) => {
    const { 
        child_name, date_of_birth, gender, 
        height_cm, weight_kg, waist_circumference, weighing_time,
        is_fasting, is_post_voiding,
        activity_level, allergies, dietary_preferences, 
        vaccinations, medications, weigh_in_conditions, 
        bristol_stool_scale, medical_history,
        family_history, food_intolerances, symptoms, lifestyle_factors
    } = req.body;

    try {
        const result = await prisma.$transaction(async (tx) => {
            const profile = await tx.profiles.create({
                data: {
                    users: { connect: { id: req.user.id } },
                    child_name,
                    date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
                    gender,
                    height_cm: height_cm ? parseFloat(height_cm) : null,
                    weight_kg: weight_kg ? parseFloat(weight_kg) : null,
                    activity_level,
                    allergies: Array.isArray(allergies) ? allergies : (allergies ? [allergies] : []),
                    dietary_preferences,
                    vaccinations: typeof vaccinations === 'string' ? vaccinations : null, // Legacy support
                    medications,
                    weigh_in_conditions,
                    bristol_stool_scale: bristol_stool_scale ? parseInt(bristol_stool_scale) : null,
                    medical_history: medical_history || '',
                    family_history: family_history || '',
                    food_intolerances: food_intolerances || '',
                    symptoms: symptoms || '',
                    lifestyle_factors: lifestyle_factors || '',
                    waist_circumference: waist_circumference ? parseFloat(waist_circumference) : null,
                    weighing_time,
                    is_fasting: is_fasting || false,
                    is_post_voiding: is_post_voiding || false
                }
            });

            // Handle structured vaccinations
            if (vaccinations && Array.isArray(vaccinations) && vaccinations.length > 0) {
                const vaccinationData = vaccinations.map(v => ({
                    profile_id: profile.id,
                    vaccination_type_id: v.vaccination_type_id,
                    date_administered: v.date_administered ? new Date(v.date_administered) : new Date(),
                    notes: v.notes || 'Recorded during onboarding'
                }));
                
                await tx.profile_vaccinations.createMany({
                    data: vaccinationData
                });
            }

            return profile;
        });

        res.status(201).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Update a child profile
router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { 
        child_name, date_of_birth, gender, 
        height_cm, weight_kg, waist_circumference, weighing_time,
        is_fasting, is_post_voiding,
        activity_level, allergies, dietary_preferences, 
        calories_target, protein_target, carbs_target, fat_target, 
        vaccinations, medications, weigh_in_conditions, 
        bristol_stool_scale, medical_history,
        family_history, food_intolerances, symptoms, lifestyle_factors
    } = req.body;

    try {
        const updatedProfile = await prisma.profiles.updateMany({
            where: { 
                id: id,
                user_id: req.user.id 
            },
            data: {
                child_name,
                date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
                gender,
                height_cm: height_cm ? parseFloat(height_cm) : undefined,
                weight_kg: weight_kg ? parseFloat(weight_kg) : undefined,
                activity_level,
                allergies,
                dietary_preferences,
                calories_target: calories_target ? parseInt(calories_target) : undefined,
                protein_target: protein_target ? parseInt(protein_target) : undefined,
                carbs_target: carbs_target ? parseInt(carbs_target) : undefined,
                fat_target: fat_target ? parseInt(fat_target) : undefined,
                vaccinations,
                medications,
                weigh_in_conditions,
                bristol_stool_scale: bristol_stool_scale ? parseInt(bristol_stool_scale) : undefined,
                medical_history,
                family_history,
                food_intolerances,
                symptoms,
                lifestyle_factors,
                waist_circumference: waist_circumference ? parseFloat(waist_circumference) : undefined,
                weighing_time,
                is_fasting: is_fasting !== undefined ? is_fasting : undefined,
                is_post_voiding: is_post_voiding !== undefined ? is_post_voiding : undefined
            }
        });

        if (updatedProfile.count === 0) {
            return res.status(404).json({ message: 'Profile not found or not authorized' });
        }

        const profile = await prisma.profiles.findUnique({ where: { id } });
        res.json(profile);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /:id/growth - Get growth logs for a profile with Clinical Analysis (Z-Scores/Percentiles)
router.get('/:id/growth', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Ownership Check
        const profile = await prisma.profiles.findUnique({ where: { id } });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });
        
        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin' || 
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({ 
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id, status: 'active' } 
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized access to profile data' });

        const growthLogs = await prisma.growth_logs.findMany({
            where: { profile_id: id },
            orderBy: { logged_at: 'asc' }
        });

        // Calculate Clinical Status for each log with Trend Analysis
        const clinicalLogs = growthLogs.map((log, index) => {
            const ageMonths = Math.floor((new Date(log.logged_at) - new Date(profile.date_of_birth)) / (1000 * 60 * 60 * 24 * 30.44));
            const status = getGrowthStatus(ageMonths, profile.gender, log.weight_kg, log.height_cm);
            
            // Trend Analysis
            if (index > 0) {
                const prevLog = growthLogs[index - 1];
                const prevAgeMonths = Math.floor((new Date(prevLog.logged_at) - new Date(profile.date_of_birth)) / (1000 * 60 * 60 * 24 * 30.44));
                const prevStatus = getGrowthStatus(prevAgeMonths, profile.gender, prevLog.weight_kg, prevLog.height_cm);
                
                const weightDiff = status.weight.percentile - prevStatus.weight.percentile;
                const heightDiff = status.height.percentile - prevStatus.height.percentile;
                
                status.trends = {
                    weight_change: weightDiff,
                    height_change: heightDiff,
                    is_crossing_percentiles: Math.abs(weightDiff) >= 20 || Math.abs(heightDiff) >= 20,
                    clinical_warning: Math.abs(weightDiff) >= 20 ? (weightDiff < 0 ? "Growth Faltering Detected" : "Rapid Weight Gain Detected") : null
                };
            }

            return {
                ...log,
                clinical_analysis: status
            };
        });

        res.json(clinicalLogs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /:id/growth - Log new growth data
router.post('/:id/growth', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { height_cm, weight_kg } = req.body;
    try {
        // Ownership Check
        const profile = await prisma.profiles.findUnique({ where: { id } });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });
        
        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin' || 
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({ 
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id, status: 'active' } 
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized: You cannot modify this profile' });

        const newLog = await prisma.growth_logs.create({
            data: {
                profile_id: id,
                height_cm: parseFloat(height_cm),
                weight_kg: parseFloat(weight_kg)
            }
        });

        // Also update the main profile with latest height/weight
        await prisma.profiles.update({
            where: { id: id },
            data: {
                height_cm: parseFloat(height_cm),
                weight_kg: parseFloat(weight_kg)
            }
        });

        res.status(201).json(newLog);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PATCH /growth-record/:logId - Update a growth log
router.patch('/growth-record/:logId', verifyToken, async (req, res) => {
    const { logId } = req.params;
    const { height_cm, weight_kg, logged_at } = req.body;
    try {
        const log = await prisma.growth_logs.findUnique({ 
            where: { id: logId },
            include: { profiles: true }
        });
        
        if (!log) return res.status(404).json({ message: 'Growth log not found' });

        // Ownership Check
        const isAuthorized = log.profiles.user_id === req.user.id || req.user.role === 'admin' || 
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({ 
                where: { nutritionist_id: req.user.id, parent_id: log.profiles.user_id, status: 'active' } 
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized' });

        const updatedLog = await prisma.growth_logs.update({
            where: { id: logId },
            data: {
                height_cm: height_cm ? parseFloat(height_cm) : undefined,
                weight_kg: weight_kg ? parseFloat(weight_kg) : undefined,
                logged_at: logged_at ? new Date(logged_at) : undefined
            }
        });

        // If this was the latest log, update the profile biometrics too
        const latestLog = await prisma.growth_logs.findFirst({
            where: { profile_id: log.profile_id },
            orderBy: { logged_at: 'desc' }
        });

        if (latestLog && latestLog.id === logId) {
            await prisma.profiles.update({
                where: { id: log.profile_id },
                data: {
                    height_cm: updatedLog.height_cm,
                    weight_kg: updatedLog.weight_kg
                }
            });
        }

        res.json(updatedLog);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE /growth-record/:logId - Delete a growth log
router.delete('/growth-record/:logId', verifyToken, async (req, res) => {
    const { logId } = req.params;
    console.log(`[DELETE] Request to delete growth log: ${logId}`);
    try {
        const log = await prisma.growth_logs.findUnique({ 
            where: { id: logId },
            include: { profiles: true }
        });
        
        if (!log) {
            console.error(`[DELETE] Log ${logId} not found in database`);
            return res.status(404).json({ message: 'Growth log not found' });
        }

        // Ownership Check
        const isAuthorized = log.profiles.user_id === req.user.id || req.user.role === 'admin' || 
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({ 
                where: { nutritionist_id: req.user.id, parent_id: log.profiles.user_id, status: 'active' } 
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized: You cannot delete this record' });

        await prisma.growth_logs.delete({ where: { id: logId } });
        console.log(`[DELETE] Successfully deleted log record ${logId}`);

        // Update profile with the next latest available log
        const latestLog = await prisma.growth_logs.findFirst({
            where: { profile_id: log.profile_id },
            orderBy: { logged_at: 'desc' }
        });

        if (latestLog) {
            console.log(`[DELETE] Updating profile ${log.profile_id} biometrics from next latest log`);
            await prisma.profiles.update({
                where: { id: log.profile_id },
                data: {
                    height_cm: latestLog.height_cm,
                    weight_kg: latestLog.weight_kg
                }
            });
        } else {
            console.log(`[DELETE] No remaining logs for profile ${log.profile_id}. Biometrics remain as they are.`);
        }

        res.json({ message: 'Growth record deleted successfully' });
    } catch (err) {
        console.error("[DELETE] ERROR during growth log deletion:", err);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// Vaccination Routes
// GET /vaccination-types - Get all available vaccination types
router.get('/vaccination-types', verifyToken, async (req, res) => {
    try {
        const types = await prisma.vaccination_types.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(types);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /:id - Get a single profile
router.get('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const profile = await prisma.profiles.findUnique({
            where: { id }
        });

        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        // Authorization check
        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin' || 
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({ 
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id, status: 'active' } 
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized' });

        res.json(profile);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /:id/vaccinations - Get vaccinations for a profile
router.get('/:id/vaccinations', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Ownership Check
        const profile = await prisma.profiles.findUnique({ where: { id } });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });
        
        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin' || 
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({ 
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id, status: 'active' } 
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized access' });

        const vaccinations = await prisma.profile_vaccinations.findMany({
            where: { profile_id: id },
            include: { vaccination_types: true },
            orderBy: { date_administered: 'desc' }
        });
        res.json(vaccinations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /:id/vaccinations - Add vaccination to profile
router.post('/:id/vaccinations', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { vaccination_type_id, date_administered, notes } = req.body;
    try {
        // Ownership Check
        const profile = await prisma.profiles.findUnique({ where: { id } });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });
        
        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin' || 
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({ 
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id, status: 'active' } 
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized' });

        const newRecord = await prisma.profile_vaccinations.create({
            data: {
                profile_id: id,
                vaccination_type_id,
                date_administered: date_administered ? new Date(date_administered) : null,
                notes
            },
            include: { vaccination_types: true }
        });
        res.status(201).json(newRecord);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE /vaccinations/:id - Remove vaccination
router.delete('/vaccinations/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find the record and its profile to check ownership
        const record = await prisma.profile_vaccinations.findUnique({
            where: { id },
            include: { profiles: true }
        });

        if (!record) return res.status(404).json({ message: 'Vaccination record not found' });

        const isAuthorized = record.profiles.user_id === req.user.id || req.user.role === 'admin' || 
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({ 
                where: { nutritionist_id: req.user.id, parent_id: record.profiles.user_id, status: 'active' } 
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized to delete this record' });

        await prisma.profile_vaccinations.delete({
            where: { id }
        });
        res.json({ message: 'Vaccination removed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /:id/photo - Upload profile photo
router.post('/:id/photo', verifyToken, (req, res, next) => {
    upload.single('photo')(req, res, (err) => {
        if (err) {
            console.error('Multer Error:', err);
            return res.status(500).json({ message: 'File processing failed', error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Ownership Check
        const profile = await prisma.profiles.findUnique({ where: { id } });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin' || 
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({ 
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id, status: 'active' } 
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized: Cannot update photo for this profile' });

        // Upload to Cloudinary from memory buffer
        const uploadFromBuffer = () => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'smartnutri/profiles',
                        transformation: [{ width: 500, height: 500, crop: 'limit' }]
                    },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                stream.end(req.file.buffer);
            });
        };

        const result = await uploadFromBuffer();

        const updatedProfile = await prisma.profiles.update({
            where: { id: id },
            data: {
                profile_image_url: result.secure_url
            }
        });

        res.json({ profile_image_url: updatedProfile.profile_image_url });
    } catch (err) {
        console.error('Cloudinary/Database Error:', err);
        res.status(500).json({ message: 'Upload failed', error: err.message });
    }
});

// DELETE /:id - Permanently delete a child profile
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find the profile to check ownership
        const profile = await prisma.profiles.findUnique({
            where: { id }
        });

        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        // Ownership Check: Only the parent who owns the profile can delete it
        if (profile.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized: You can only delete your own child profiles' });
        }

        // Delete the profile (Cascade delete handles associated logs, vaccinations, etc.)
        await prisma.profiles.delete({
            where: { id }
        });

        res.json({ message: 'Profile and all associated data deleted successfully' });
    } catch (err) {
        console.error('Error deleting profile:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
