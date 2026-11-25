import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users, ChevronUp, ChevronDown, ArrowUpDown, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { userApi } from '../services/api.service';
import { useDebounce } from '../lib/useDebounce';
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
  const debouncedSearch = useDebounce(search, 300);

  // Filters & Sorting state
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const limit = 10;

  const currentUserId = localStorage.getItem('userId');

  // Trigger fetch whenever page, debouncedSearch, department, status, role, or sorting changes
  useEffect(() => {
    loadUsers();
  }, [page, debouncedSearch, department, status, role, sortBy, sortOrder]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await userApi.getUsers({
        page,
        limit,
        search: debouncedSearch || undefined,
        department: department || undefined,
        status: status || undefined,
        role: role || undefined,
        sortBy,
        sortOrder,
      });

      const data = res.data;
      setUsers(data.users || data || []);
      if (data.totalPages !== undefined) setTotalPages(data.totalPages || 1);
      if (data.total !== undefined) setTotalUsers(data.total);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const renderSortIndicator = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown size={13} style={{ opacity: 0.35, marginLeft: '4px', verticalAlign: 'middle' }} />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp size={14} style={{ color: 'var(--primary)', marginLeft: '4px', verticalAlign: 'middle' }} />
    ) : (
      <ChevronDown size={14} style={{ color: 'var(--primary)', marginLeft: '4px', verticalAlign: 'middle' }} />
    );
  };

  const handleResetFilters = () => {
    setSearch('');
    setDepartment('');
    setStatus('');
    setRole('');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
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

  const hasActiveFilters = Boolean(search || department || status || role);

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

      {/* Filter and Debounced Search Toolbar */}
      <Card style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Input with Debounce */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
            <SearchIcon
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', paddingLeft: '36px' }}
              placeholder="Search by name, emp ID, email, mobile..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Department Filter */}
          <div style={{ minWidth: '150px' }}>
            <select
              className="form-input"
              value={department}
              onChange={e => {
                setDepartment(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Quality Assurance">Quality Assurance</option>
              <option value="Sales & Business">Sales & Business</option>
              <option value="Product & Design">Product & Design</option>
              <option value="Finance">Finance</option>
            </select>
          </div>

          {/* Role Filter */}
          <div style={{ minWidth: '130px' }}>
            <select
              className="form-input"
              value={role}
              onChange={e => {
                setRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Roles</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Admin">Admin</option>
              <option value="HR">HR</option>
              <option value="Employee">Employee</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: '130px' }}>
            <select
              className="form-input"
              value={status}
              onChange={e => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleResetFilters}
            >
              Reset
            </Button>
          )}
        </div>
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
                    <th style={{ width: '50px' }}>#</th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('user_name')}
                    >
                      Employee {renderSortIndicator('user_name')}
                    </th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('emp_id')}
                    >
                      Emp ID {renderSortIndicator('emp_id')}
                    </th>
                    <th>Mobile</th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('email')}
                    >
                      Email {renderSortIndicator('email')}
                    </th>
                    <th>Role</th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('department')}
                    >
                      Department {renderSortIndicator('department')}
                    </th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="table-empty">
                        <Users size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                        <p>{hasActiveFilters ? 'No users matching the filters' : 'No users found'}</p>
                        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {hasActiveFilters ? (
                            <Button size="sm" variant="secondary" onClick={handleResetFilters}>
                              Clear Filters
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="primary"
                              icon={<AddIcon size={14} />}
                              onClick={() => navigate('/home/adduser')}
                            >
                              Add New User
                            </Button>
                          )}
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border)' }}>
                <span className="page-info" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Showing {users.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalUsers)} of {totalUsers} employees
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    ‹ Prev
                  </Button>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0 8px' }}>
                    {page} / {totalPages}
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
