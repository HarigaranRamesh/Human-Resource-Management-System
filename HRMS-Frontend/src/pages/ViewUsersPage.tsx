import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { userApi } from '../services/api.service';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  ActionIconButton,
  ConfirmDialog,
  AddIcon,
  SearchIcon,
  DeleteIcon,
} from '../components/common';

export default function ViewUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState('');
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const limit = 10;

  const currentUserId = localStorage.getItem('userId');

  useEffect(() => {
    loadUsers(page, search);
  }, [page]);

  const loadUsers = async (pageToLoad = page, searchToUse = search) => {
    setLoading(true);
    try {
      const res = await userApi.getUsers(pageToLoad, limit, searchToUse ? 'user_name' : undefined, searchToUse || undefined);
      setUsers(res.data.users || res.data || []);
      if (res.data.totalPages !== undefined) setTotalPages(res.data.totalPages || 1);
      if (res.data.total !== undefined) setTotalUsers(res.data.total);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (page === 1) {
      loadUsers(1, search);
    } else {
      setPage(1);
    }
  };

  const handleDeleteClick = (user: any) => {
    const userId = user.id || user._id;
    if (!userId) {
      toast.error('Invalid user identifier');
      return;
    }
    if (userId === currentUserId) {
      toast.error('You cannot delete your own account');
      return;
    }
    if (user.role_name === 'Super Admin' || user.roleName === 'Super Admin' || user.role?.role === 'Super Admin') {
      toast.error('System Super Admin cannot be deleted');
      return;
    }
    setUserToDelete({ id: userId, name: user.user_name || 'User' });
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await userApi.deleteUser(userToDelete.id);
      toast.success(`${userToDelete.name} deleted successfully`);
      setUserToDelete(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="View Users"
        subtitle={totalUsers > 0 ? `Manage and view employee directory (${totalUsers} total employees)` : "Manage and view employee directory and access credentials"}
        actions={
          <Button
            variant="primary"
            icon={<AddIcon size={16} />}
            onClick={() => navigate('/home/adduser')}
          >
            Add New User
          </Button>
        }
      />

      {/* Search Toolbar */}
      <Card className="search-card" style={{ marginBottom: '1.25rem' }}>
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-wrap">
            <SearchIcon size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, emp ID, email, department, or mobile..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button type="submit" variant="primary">Search</Button>
          {search && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSearch('');
                if (page === 1) {
                  loadUsers(1, '');
                } else {
                  setPage(1);
                }
              }}
            >
              Clear
            </Button>
          )}
        </form>
      </Card>

      {/* Users Table Card */}
      <Card>
        {loading ? (
          <div className="table-loading">
            <Loader2 size={36} className="spin" />
            <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Loading users...
            </p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Employee</th>
                    <th>Emp ID</th>
                    <th>Mobile</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="table-empty">
                        <Users size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                        <p>No users found</p>
                        <div style={{ marginTop: '0.75rem' }}>
                          <Button
                            size="sm"
                            variant="primary"
                            icon={<AddIcon size={14} />}
                            onClick={() => navigate('/home/adduser')}
                          >
                            Add New User
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    users.map((user, idx) => {
                      const userId = user.id || user._id || String(idx);
                      const isActive = user.status !== undefined ? !!user.status : (user.isActive ?? true);
                      const roleName = user.role_name || user.roleName || user.role?.role || 'Employee';

                      return (
                        <tr key={userId}>
                          <td>{(page - 1) * limit + idx + 1}</td>
                          <td>
                            <div className="user-cell">
                              <div className="user-avatar-sm">
                                {(user.user_name || 'U')[0].toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 500 }}>{user.user_name || '—'}</span>
                            </div>
                          </td>
                          <td>
                            <code style={{ fontSize: '0.8125rem', padding: '2px 6px', background: 'var(--surface-2)', borderRadius: '4px' }}>
                              {user.emp_id || '—'}
                            </code>
                          </td>
                          <td>{user.mobile_no || user.mobileNo || '—'}</td>
                          <td>{user.email || '—'}</td>
                          <td>
                            <Badge
                              variant={roleName === 'Super Admin' ? 'purple' : roleName === 'Admin' ? 'blue' : 'amber'}
                            >
                              {roleName}
                            </Badge>
                          </td>
                          <td>{user.department || '—'}</td>
                          <td>
                            <Badge variant={isActive ? 'green' : 'red'} dot>
                              {isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="action-btns" style={{ justifyContent: 'center' }}>
                              <ActionIconButton
                                variant="danger"
                                icon={<DeleteIcon size={15} />}
                                title="Delete user"
                                onClick={() => handleDeleteClick(user)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ‹ Prev
                </Button>
                <span className="page-info">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next ›
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Reusable Confirmation Dialog for Deleting Users */}
      <ConfirmDialog
        isOpen={Boolean(userToDelete)}
        title="Delete Employee"
        message={
          <span>
            Are you sure you want to delete <strong>{userToDelete?.name}</strong>?
            This will permanently remove their user credentials and database record.
          </span>
        }
        confirmLabel="Delete User"
        cancelLabel="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) setUserToDelete(null);
        }}
      />
    </div>
  );
}
