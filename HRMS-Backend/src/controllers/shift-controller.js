const express = require('express');
const router = express.Router();
const shiftRepo = require('../db/repositories/shift.repo');

// Get default shift
router.get('/default', async (req, res) => {
    try {
        const shift = await shiftRepo.getDefaultShift();
        res.status(200).json(shift);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching default shift', error: error.message });
    }
});

// Get all shifts
router.get('/', async (req, res) => {
    try {
        const shifts = await shiftRepo.getAllShifts();
        res.status(200).json(shifts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching shifts', error: error.message });
    }
});

// Create a new shift
router.post('/', async (req, res) => {
    try {
        const shift = await shiftRepo.createShift(req.body);
        res.status(201).json(shift);
    } catch (error) {
        res.status(500).json({ message: 'Error creating shift', error: error.message });
    }
});

// Update a shift
router.put('/:id', async (req, res) => {
    try {
        const shift = await shiftRepo.updateShift(req.params.id, req.body);
        if (!shift) {
            return res.status(404).json({ message: 'Shift not found' });
        }
        res.status(200).json(shift);
    } catch (error) {
        res.status(500).json({ message: 'Error updating shift', error: error.message });
    }
});

// Delete a shift
router.delete('/:id', async (req, res) => {
    try {
        const shift = await shiftRepo.deleteShift(req.params.id);
        if (!shift) {
            return res.status(404).json({ message: 'Shift not found' });
        }
        res.status(200).json({ message: 'Shift deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting shift', error: error.message });
    }
});

module.exports = router;
