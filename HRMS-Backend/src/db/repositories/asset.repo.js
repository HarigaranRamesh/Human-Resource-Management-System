// src/db/repositories/asset.repo.js
const { query } = require('../pg');
async function list({page=1,limit=20}={}) { const { rows } = await query(`SELECT a.*,u.user_name FROM assets a LEFT JOIN users u ON u.id=a.assigned_to ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`,[limit,(page-1)*limit]); return rows; }
async function findById(id) { const { rows } = await query(`SELECT * FROM assets WHERE id=$1`,[id]); return rows[0]||null; }
async function create(data) { const { rows } = await query(`INSERT INTO assets(name,asset_type,serial_no,assigned_to,condition,notes) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[data.name,data.assetType||null,data.serialNo||null,data.assignedTo||null,data.condition||null,data.notes||null]); return rows[0]; }
async function update(id,data) { const { rows } = await query(`UPDATE assets SET name=$1,asset_type=$2,serial_no=$3,assigned_to=$4,condition=$5,notes=$6 WHERE id=$7 RETURNING *`,[data.name,data.assetType||null,data.serialNo||null,data.assignedTo||null,data.condition||null,data.notes||null,id]); return rows[0]; }
async function remove(id) { const { rows } = await query(`DELETE FROM assets WHERE id=$1 RETURNING *`,[id]); return rows[0]; }
module.exports = { list, findById, create, update, remove };
