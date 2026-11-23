// src/db/repositories/feed.repo.js
const { query } = require('../pg');
async function list({page=1,limit=20}={}) { const { rows } = await query(`SELECT f.*,u.user_name,u.position FROM feed_posts f JOIN users u ON u.id=f.author_id ORDER BY f.created_at DESC LIMIT $1 OFFSET $2`,[limit,(page-1)*limit]); return rows; }
async function create(authorId,data) { const { rows } = await query(`INSERT INTO feed_posts(author_id,content,media_url) VALUES($1,$2,$3) RETURNING *`,[authorId,data.content,data.mediaUrl||null]); return rows[0]; }
async function toggleLike(id,userId) { const { rows } = await query(`SELECT likes FROM feed_posts WHERE id=$1`,[id]); if(!rows[0]) return null; const likes=rows[0].likes||[]; const idx=likes.indexOf(userId); if(idx>-1) likes.splice(idx,1); else likes.push(userId); const r=await query(`UPDATE feed_posts SET likes=$1 WHERE id=$2 RETURNING *`,[likes,id]); return r.rows[0]; }
async function remove(id) { const { rows } = await query(`DELETE FROM feed_posts WHERE id=$1 RETURNING *`,[id]); return rows[0]; }
module.exports = { list, create, toggleLike, remove };
