// src/db/repositories/document.repo.js
// Keka-style Employee Document Vault Repository
const { query } = require('../pg');

async function listDocumentsByUser(userId) {
  const { rows } = await query(`
    SELECT ed.*, u.user_name AS verifier_name
    FROM employee_documents ed
    LEFT JOIN users u ON u.id = ed.verified_by
    WHERE ed.user_id = $1
    ORDER BY ed.uploaded_at DESC
  `, [userId]);
  return rows;
}

async function addDocument({ userId, category, docType, docName, fileUrl, fileSize, mimeType }) {
  const { rows } = await query(`
    INSERT INTO employee_documents (user_id, category, doc_type, doc_name, file_url, file_size, mime_type, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'Verified')
    RETURNING *
  `, [
    userId,
    category || 'Government ID',
    docType || 'Document',
    docName,
    fileUrl,
    fileSize || 0,
    mimeType || 'application/octet-stream'
  ]);
  return rows[0];
}

async function deleteDocument(docId, userId, isAdmin = false) {
  let q = `DELETE FROM employee_documents WHERE id = $1`;
  const params = [docId];
  if (!isAdmin) {
    q += ` AND user_id = $2`;
    params.push(userId);
  }
  q += ` RETURNING *`;
  const { rows } = await query(q, params);
  return rows[0] || null;
}

async function updateDocumentStatus(docId, status, verifiedBy, remarks = null) {
  const { rows } = await query(`
    UPDATE employee_documents
    SET status = $2, verified_by = $3, remarks = $4
    WHERE id = $1
    RETURNING *
  `, [docId, status, verifiedBy, remarks]);
  return rows[0] || null;
}

module.exports = {
  listDocumentsByUser,
  addDocument,
  deleteDocument,
  updateDocumentStatus,
};
