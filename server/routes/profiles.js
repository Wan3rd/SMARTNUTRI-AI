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
    const { child_name, date_of_birth, gender, height_cm, weight_kg, activity_level, allergies, dietary_preferences, vaccinations, medications, weigh_in_conditions, bristol_stool_scale, medical_history } = req.body;

    try {
        const newProfile = await prisma.profiles.create({
            data: {
                user_id: req.user.id,
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
                medical_history
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
    const { child_name, date_of_birth, gender, height_cm, weight_kg, activity_level, allergies, dietary_preferences, calories_target, protein_target, carbs_target, fat_target, vaccinations, medications, weigh_in_conditions, bristol_stool_scale, medical_history } = req.body;

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
                medical_history
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
        const growthLogs = await prisma.growth_logs.findMany({
            where: { profile_id: req.params.id },
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
    const { height_cm, weight_kg } = req.body;
    try {
        const newLog = await prisma.growth_logs.create({
            data: {
                profile_id: req.params.id,
                height_cm: parseFloat(height_cm),
                weight_kg: parseFloat(weight_kg)
            }
        });

        // Also update the main profile with latest height/weight
        await prisma.profiles.update({
            where: { id: req.params.id },
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
        const vaccinations = await prisma.profile_vaccinations.findMany({
            where: { profile_id: req.params.id },
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
    const { vaccination_type_id, date_administered, notes } = req.body;
    try {
        const newRecord = await prisma.profile_vaccinations.create({
            data: {
                profile_id: req.params.id,
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
        await prisma.profile_vaccinations.delete({
            where: { id: req.params.id }
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
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

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
            where: { id: req.params.id },
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

export default router;
