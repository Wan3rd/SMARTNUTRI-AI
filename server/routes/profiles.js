import express from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.js';
import { upload, cloudinary } from '../lib/cloudinary.js';

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
        const newProfile = await prisma.profiles.create({
            data: {
                users: { connect: { id: req.user.id } },
                child_name,
                date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
                gender,
                height_cm: height_cm ? parseFloat(height_cm) : null,
                weight_kg: weight_kg ? parseFloat(weight_kg) : null,
                activity_level,
                allergies,
                dietary_preferences,
                vaccinations,
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

        res.status(201).json(newProfile);
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

// GET /:id/growth - Get growth logs for a profile
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
        res.json(growthLogs);
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
