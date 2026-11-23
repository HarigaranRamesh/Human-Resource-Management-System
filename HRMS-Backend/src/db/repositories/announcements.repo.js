// src/db/repositories/announcements.repo.js
// Enterprise Announcements & Company Feed Repository
const { query } = require('../pg');

async function listAnnouncements() {
  const { rows } = await query(`
    SELECT a.*, u.user_name AS author_name, u.position AS author_position, u.profile_image AS author_image
    FROM announcements a
    LEFT JOIN users u ON u.id = a.author_id
    ORDER BY a.created_at DESC
    LIMIT 50
  `);
  return rows;
}

async function createAnnouncement({ title, content, priority = 'Normal', department = 'All', authorId }) {
  const { rows } = await query(`
    INSERT INTO announcements (title, content, priority, department, author_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [title.trim(), content.trim(), priority, department, authorId]);
  return rows[0];
}

async function toggleLike(announcementId, userId) {
  const { rows } = await query(`SELECT likes FROM announcements WHERE id = $1`, [announcementId]);
  if (!rows[0]) return null;
  let likes = rows[0].likes || [];
  const idx = likes.indexOf(userId);
  if (idx > -1) {
    likes.splice(idx, 1);
  } else {
    likes.push(userId);
  }
  const { rows: updated } = await query(`
    UPDATE announcements SET likes = $1 WHERE id = $2 RETURNING *
  `, [likes, announcementId]);
  return updated[0];
}

async function deleteAnnouncement(id) {
  const { rows } = await query(`DELETE FROM announcements WHERE id = $1 RETURNING *`, [id]);
  return rows[0] || null;
}

module.exports = {
  listAnnouncements,
  createAnnouncement,
  toggleLike,
  deleteAnnouncement,
};
