// src/db/repositories/holiday.repo.js
const { query } = require('../pg');
async function list() { const { rows } = await query(`SELECT * FROM holidays ORDER BY date`); return rows; }
async function create(data) { const { rows } = await query(`INSERT INTO holidays(name,date,description) VALUES($1,$2,$3) ON CONFLICT(date) DO UPDATE SET name=$1,description=$3 RETURNING *`,[data.name,data.date,data.description||null]); return rows[0]; }
async function remove(id) { const { rows } = await query(`DELETE FROM holidays WHERE id=$1 RETURNING *`,[id]); return rows[0]; }
module.exports = { list, create, remove };
