// src/db/repositories/task.repo.js
const { query } = require('../pg');

async function list({ page=1, limit=20, userId, status, priority }={}) {
  const params = []; let where = 'WHERE 1=1';
  if (userId)   { params.push(userId);   where += ` AND (t.created_by=$${params.length} OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id=t.id AND ta.user_id=$${params.length}))`; }
  if (status)   { params.push(status);   where += ` AND t.status=$${params.length}`; }
  if (priority) { params.push(priority); where += ` AND t.priority=$${params.length}`; }
  params.push(limit, (page-1)*limit);
  const { rows } = await query(`SELECT t.*, ARRAY(SELECT user_id FROM task_assignees WHERE task_id=t.id) AS assigned_to FROM tasks t ${where} ORDER BY t.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`, params);
  return rows;
}

async function findById(id) {
  const { rows } = await query(`SELECT t.*, ARRAY(SELECT user_id FROM task_assignees WHERE task_id=t.id) AS assigned_to FROM tasks t WHERE t.id=$1`, [id]);
  return rows[0]||null;
}

async function create(data) {
  const { rows } = await query(`
    INSERT INTO tasks (title,description,type,priority,status,start_date,due_date,
      estimated_hours,department,project,created_by,tags,subtasks,comments,history,attachments)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *
  `,[data.title,data.description||null,data.type||'Other',data.priority||'Medium',
     data.status||'Pending',data.startDate||new Date(),data.dueDate,
     data.estimatedHours||0,data.department||null,data.project||null,
     data.createdBy||data.created_by,JSON.stringify(data.tags||[]),
     JSON.stringify(data.subtasks||[]),JSON.stringify(data.comments||[]),
     JSON.stringify(data.history||[]),JSON.stringify(data.attachments||[])]);
  const task = rows[0];
  if (data.assignedTo?.length) {
    for (const uid of data.assignedTo) {
      await query(`INSERT INTO task_assignees(task_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[task.id,uid]);
    }
  }
  return findById(task.id);
}

async function update(id, data) {
  const allowed=['title','description','type','priority','status','due_date',
    'estimated_hours','progress','department','project','tags','subtasks','comments','history','attachments'];
  const fields=[]; const params=[];
  for(const k of allowed) {
    const v=data[k]??data[k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase())];
    if(v!==undefined){ params.push(Array.isArray(v)||typeof v==='object'?JSON.stringify(v):v); fields.push(`${k}=$${params.length}`); }
  }
  if(!fields.length) return findById(id);
  params.push(id);
  await query(`UPDATE tasks SET ${fields.join(',')} WHERE id=$${params.length}`,params);
  if(data.assignedTo){ await query(`DELETE FROM task_assignees WHERE task_id=$1`,[id]); for(const uid of data.assignedTo) await query(`INSERT INTO task_assignees(task_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[id,uid]); }
  return findById(id);
}

async function remove(id) {
  const { rows } = await query(`DELETE FROM tasks WHERE id=$1 RETURNING *`,[id]);
  return rows[0];
}

module.exports = { list, findById, create, update, remove };
