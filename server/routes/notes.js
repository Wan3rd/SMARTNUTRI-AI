import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

// GET /api/notes/:clientId
// Get all notes for a specific client profile
router.get('/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;

        const notes = await prisma.nutritionist_notes.findMany({
            where: { client_id: clientId },
            orderBy: [
                { is_pinned: 'desc' },
                { created_at: 'desc' }
            ]
        });
        res.json(notes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/notes
// Create a new note
router.post('/', async (req, res) => {
    try {
        const { nutritionist_id, client_id, content } = req.body;

        const newNote = await prisma.nutritionist_notes.create({
            data: {
                nutritionist_id,
                client_id,
                content
            }
        });
        res.json(newNote);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/notes/:id
// Delete a note
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.nutritionist_notes.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Note deleted' });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ message: 'Note not found' });
        }
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/notes/:id/pin
// Pin or unpin a note
router.patch('/:id/pin', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_pinned } = req.body;

        const updatedNote = await prisma.nutritionist_notes.update({
            where: { id: parseInt(id) },
            data: { is_pinned }
        });
        res.json(updatedNote);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
