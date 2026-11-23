// src/db/repositories/payslip.repo.js
const { query } = require('../pg');
async function listByUser(userId) { const { rows } = await query(`SELECT * FROM payslips WHERE user_id=$1 ORDER BY year DESC,month DESC`,[userId]); return rows; }
async function findByPeriod(userId,month,year) { const { rows } = await query(`SELECT * FROM payslips WHERE user_id=$1 AND month=$2 AND year=$3`,[userId,month,year]); return rows[0]||null; }
async function upsert(userId,month,year,data,generatedBy) { const { rows } = await query(`INSERT INTO payslips(user_id,month,year,basic,hra,allowances,deductions,gross,net,generated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(user_id,month,year) DO UPDATE SET basic=$4,hra=$5,allowances=$6,deductions=$7,gross=$8,net=$9,generated_by=$10 RETURNING *`,[userId,month,year,data.basic||0,data.hra||0,JSON.stringify(data.allowances||{}),JSON.stringify(data.deductions||{}),data.gross||0,data.net||0,generatedBy||null]); return rows[0]; }
module.exports = { listByUser, findByPeriod, upsert };
