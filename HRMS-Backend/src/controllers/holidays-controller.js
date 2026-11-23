// src/controllers/holidays-controller.js
// PostgreSQL Holidays Controller
const express = require('express');
const holidayRepo = require('../db/repositories/holiday.repo');
const { query } = require('../db/pg');

const HolidaysController = express.Router();

// List all holidays
HolidaysController.get('/', async (req, res) => {
  try {
    const list = await holidayRepo.list();
    res.json(list);
  } catch (err) {
    console.error('GET /holidays error:', err);
    res.status(500).json({ message: 'Failed to fetch holidays' });
  }
});

HolidaysController.get('/rules', async (req, res) => {
  try {
    const list = await holidayRepo.list();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create holiday
HolidaysController.post('/', async (req, res) => {
  try {
    const { name, date, description } = req.body;
    if (!name || !date) return res.status(400).json({ message: 'Name and date are required' });
    const created = await holidayRepo.create({ name, date, description });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete holiday
HolidaysController.delete('/:id', async (req, res) => {
  try {
    const deleted = await holidayRepo.remove(req.params.id);
    res.json({ success: true, data: deleted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Check if specific date is holiday
HolidaysController.get('/is-holiday', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "Date is required" });
    const { rows } = await query(`SELECT * FROM holidays WHERE date = $1`, [date]);
    res.json({
      date,
      isHoliday: rows.length > 0,
      holiday: rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = HolidaysController;
