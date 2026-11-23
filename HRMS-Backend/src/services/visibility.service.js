// services/visibility.js
const Access = require('../models/access-model');
const User = require('../models/user-model');

function isRootRole(roleDoc) {
  if (!roleDoc) return false;
  if (roleDoc.isSystem === true) return true;
  return Array.isArray(roleDoc.access)
    && roleDoc.access.length === 1
    && String(roleDoc.access[0]) === String(roleDoc._id);
}

async function getVisibleUserIdsFor(actingUserId) {
  const me = await User.findById(actingUserId)
    .populate({ path: 'role', model: 'access', select: 'access _id isSystem' }) // Ensure isSystem is selected
    .lean();
  if (!me || !me.role) {
    return [];
  }

  // Root (Super Admin) sees everyone -> return NULL to signal "no filter needed"
  if (isRootRole(me.role)) {
    return null;
  }

  const startRoleId = String(me.role._id);

  // Load all roles once; build graph
  const roles = await Access.find({}, '_id access members').lean();

  // Map: parentRoleId -> [childRole1, childRole2, ...]
  // Ideally, 'access' in a role points to its PARENT(s).
  // If r.access = [parentId], then r is a child of parentId.
  const childrenByParent = new Map();
  for (const r of roles) {
    const parents = (r.access || []).map(String);
    // Be careful: A role's 'access' usually points to authorized roles (parents).
    // EXCEPTION: A root role points to itself.
    // We want to find who points to 'p' to find 'p's children.

    for (const p of parents) {
      if (p === String(r._id)) continue; // skip self-reference (root)

      if (!childrenByParent.has(p)) childrenByParent.set(p, []);
      childrenByParent.get(p).push(r);
    }
  }

  // BFS to collect all descendant ROLE IDs
  const descRoleIds = new Set();
  const q = [startRoleId];
  const seen = new Set(q);

  while (q.length) {
    const pid = q.shift();
    const children = childrenByParent.get(pid) || [];
    for (const child of children) {
      const cid = String(child._id);
      if (!seen.has(cid)) {
        seen.add(cid);
        q.push(cid);
        descRoleIds.add(cid);
      }
    }
  }

  // Calculate visible User IDs
  const visible = new Set();

  // 1. Members explicitly listed in My Role + Descendant Roles
  //    (Assuming 'members' array in AccessModel tracks user IDs)
  const relevantRoleIds = [startRoleId, ...descRoleIds];

  for (const rid of relevantRoleIds) {
    const rdoc = roles.find(r => String(r._id) === rid);
    if (rdoc && Array.isArray(rdoc.members)) {
      rdoc.members.forEach(uid => visible.add(String(uid)));
    }
  }

  // 2. Users who structurally "have" this role (User.role = roleId)
  const usersWithRoles = await User.find({ role: { $in: relevantRoleIds } }, '_id').lean();
  usersWithRoles.forEach(u => visible.add(String(u._id)));

  // 3. Always include myself
  visible.add(String(me._id));

  return Array.from(visible);
}

async function getExcludedFilterUserIds() {
  const exRoles = await Access.find({
    $or: [
      { isSystem: true },
      { isCandidateRole: true }
    ]
  }, '_id').lean();
  const rIds = exRoles.map(x => String(x._id));
  const exUsers = await User.find({ role: { $in: rIds } }, '_id').lean();
  return exUsers.map(x => String(x._id));
}

module.exports = { getVisibleUserIdsFor, isRootRole, getExcludedFilterUserIds };
