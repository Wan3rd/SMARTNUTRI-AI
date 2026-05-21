import express from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Helper: safely parse integer note ID (schema: Int @id @default(autoincrement()))
function parseNoteId(id) {
    const parsed = parseInt(id, 10);
    return isNaN(parsed) || parsed < 1 ? null : parsed;
}

// GET /api/notes/:clientId
// Get all notes for a specific client profile
router.get('/:clientId', verifyToken, async (req, res) => {
    try {
        const { clientId } = req.params;

        // Verify authorization
        const profile = await prisma.profiles.findUnique({ where: { id: clientId } });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin' ||
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id, status: 'active' }
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized access to notes' });

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
router.post('/', verifyToken, async (req, res) => {
    try {
        const { nutritionist_id, client_id, content } = req.body;

        // Input Validation
        if (!client_id || typeof client_id !== 'string') {
            return res.status(400).json({ message: 'client_id is required' });
        }
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return res.status(400).json({ message: 'Note content cannot be empty' });
        }

        const profile = await prisma.profiles.findUnique({ where: { id: client_id } });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        // Check if requesting user is the nutritionist or admin, and has active link to parent
        const isAuthorized = req.user.role === 'admin' ||
            (req.user.role === 'nutritionist' && req.user.id === nutritionist_id && await prisma.nutritionist_clients.findFirst({
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id, status: 'active' }
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized to create notes for this client' });

        const newNote = await prisma.nutritionist_notes.create({
            data: {
                nutritionist_id: req.user.role === 'admin' ? nutritionist_id : req.user.id,
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
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const noteId = parseNoteId(id);
        if (!noteId) return res.status(400).json({ message: 'Invalid note ID' });

        const note = await prisma.nutritionist_notes.findUnique({
            where: { id: noteId }
        });

        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        const isAuthorized = req.user.role === 'admin' || 
            (req.user.role === 'nutritionist' && note.nutritionist_id === req.user.id);

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Unauthorized to delete this note' });
        }

        await prisma.nutritionist_notes.delete({
            where: { id: noteId }
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

// PATCH /api/notes/:id
// Update a note's content
router.patch('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const noteId = parseNoteId(id);
        if (!noteId) return res.status(400).json({ message: 'Invalid note ID' });

        const { content } = req.body;

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return res.status(400).json({ message: 'Note content cannot be empty' });
        }

        const note = await prisma.nutritionist_notes.findUnique({
            where: { id: noteId }
        });

        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        const isAuthorized = req.user.role === 'admin' || 
            (req.user.role === 'nutritionist' && note.nutritionist_id === req.user.id);

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Unauthorized to modify this note' });
        }

        const updatedNote = await prisma.nutritionist_notes.update({
            where: { id: noteId },
            data: { content: content.trim() }
        });
        res.json(updatedNote);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/notes/:id/pin
// Pin or unpin a note
router.patch('/:id/pin', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const noteId = parseNoteId(id);
        if (!noteId) return res.status(400).json({ message: 'Invalid note ID' });

        const { is_pinned } = req.body;

        const note = await prisma.nutritionist_notes.findUnique({
            where: { id: noteId }
        });

        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        const isAuthorized = req.user.role === 'admin' || 
            (req.user.role === 'nutritionist' && note.nutritionist_id === req.user.id);

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Unauthorized to pin/unpin this note' });
        }

        const updatedNote = await prisma.nutritionist_notes.update({
            where: { id: noteId },
            data: { is_pinned: !!is_pinned }
        });
        res.json(updatedNote);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;

