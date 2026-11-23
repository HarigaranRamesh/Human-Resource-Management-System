// src/db/repositories/petrol.repo.js
const { query } = require('../pg');

async function listByUser(userId,{page=1,limit=20}={}) {
  const { rows } = await query(`SELECT * FROM petrol_claims WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,[userId,limit,(page-1)*limit]);
  return rows;
}
async function listPending({page=1,limit=20}={}) {
  const { rows } = await query(`SELECT pc.*,u.user_name,u.emp_id FROM petrol_claims pc JOIN users u ON u.id=pc.user_id WHERE pc.approved=false ORDER BY pc.created_at DESC LIMIT $1 OFFSET $2`,[limit,(page-1)*limit]);
  return rows;
}
async function create(userId,data) {
  const { rows } = await query(`INSERT INTO petrol_claims(user_id,amount,from_location,to_location,purpose_of_visit,kms,mode_of_transport) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[userId,data.amount||0,data.from||'',data.to||'',data.purposeofVisit||'',data.kms||0,data.modeoftransport||'']);
  return rows[0];
}
async function approve(id,approverId) {
  const { rows } = await query(`UPDATE petrol_claims SET approved=true,approved_by=$1,approved_at=NOW() WHERE id=$2 RETURNING *`,[approverId,id]);
  return rows[0];
}
async function reject(id) {
  const { rows } = await query(`UPDATE petrol_claims SET approved=false WHERE id=$1 RETURNING *`,[id]);
  return rows[0];
}
module.exports = { listByUser, listPending, create, approve, reject };
