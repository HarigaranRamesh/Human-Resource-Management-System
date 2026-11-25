import React, { useState, useEffect } from 'react';
import { assetApi, userApi } from '../services/api.service';
import { PageHeader, Card, Button, Badge, FormInput, Select, Modal, SearchIcon } from '../components/common';
import { Laptop, Plus, Trash2, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { useDebounce } from '../lib/useDebounce';
import toast from 'react-hot-toast';

export default function AssetManagementPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', assetType: 'Laptop', serialNo: '', assignedTo: '', condition: 'Excellent', notes: '' });
  const [saving, setSaving] = useState(false);

  // Pagination, Search, Filter & Sort
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAssets, setTotalAssets] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [assetTypeFilter, setAssetTypeFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 10;

  useEffect(() => {
    const role = (localStorage.getItem('userRole') || '').toLowerCase();
    const admin = localStorage.getItem('isSystemAdmin') === 'true' || role.includes('admin') || role.includes('hr');
    setIsAdmin(admin);
    if (admin) loadUsers();
  }, []);

  useEffect(() => {
    loadAssets();
  }, [page, debouncedSearch, assetTypeFilter, conditionFilter, sortBy, sortOrder]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const res = await assetApi.getAssets({
        page,
        limit,
        search: debouncedSearch || undefined,
        assetType: assetTypeFilter || undefined,
        condition: conditionFilter || undefined,
        sortBy,
        sortOrder,
      });

      const data = res.data;
      if (Array.isArray(data)) {
        setAssets(data);
        setTotalAssets(data.length);
        setTotalPages(1);
      } else {
        setAssets(data.assets || []);
        if (data.totalPages !== undefined) setTotalPages(data.totalPages || 1);
        if (data.total !== undefined) setTotalAssets(data.total);
      }
    } catch {
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await userApi.getUsers(1, 100);
      setUsersList(res.data.users || res.data || []);
    } catch {
      // ignore
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
    setAssetTypeFilter('');
    setConditionFilter('');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.serialNo) {
      toast.error('Name and serial number are required');
      return;
    }
    setSaving(true);
    try {
      await assetApi.createAsset(form);
      toast.success('Asset added to inventory');
      setShowModal(false);
      setForm({ name: '', assetType: 'Laptop', serialNo: '', assignedTo: '', condition: 'Excellent', notes: '' });
      loadAssets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add asset');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete asset "${name}"?`)) return;
    try {
      await assetApi.deleteAsset(id);
      toast.success('Asset deleted');
      loadAssets();
    } catch {
      toast.error('Failed to delete asset');
    }
  };

  const hasActiveFilters = Boolean(search || assetTypeFilter || conditionFilter);

  return (
    <div className="page-container">
      <PageHeader
        title="Asset Allocation & Device Inventory"
        subtitle={totalAssets > 0 ? `Manage hardware lifecycle, laptops, peripherals, and assigned employee assets (${totalAssets} total)` : "Manage hardware lifecycle, laptops, peripherals, and assigned employee assets"}
        actions={
          isAdmin && (
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setShowModal(true)}
            >
              Add Asset
            </Button>
          )
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
              placeholder="Search by asset name, serial number..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Asset Type Filter */}
          <div style={{ minWidth: '150px' }}>
            <select
              className="form-input"
              value={assetTypeFilter}
              onChange={e => {
                setAssetTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Asset Types</option>
              <option value="Laptop">Laptop</option>
              <option value="Monitor">Monitor</option>
              <option value="Mobile Device">Mobile Device</option>
              <option value="Peripherals">Peripherals</option>
              <option value="Security Key">Security Key</option>
            </select>
          </div>

          {/* Condition Filter */}
          <div style={{ minWidth: '140px' }}>
            <select
              className="form-input"
              value={conditionFilter}
              onChange={e => {
                setConditionFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Conditions</option>
              <option value="Brand New">Brand New</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
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

      <Card>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Loading asset inventory...</p>
          </div>
        ) : assets.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Laptop size={48} style={{ opacity: 0.3, margin: '0 auto 1rem', display: 'block' }} />
            <p>{hasActiveFilters ? 'No assets matching filter criteria.' : 'No assets currently registered.'}</p>
            {hasActiveFilters && (
              <div style={{ marginTop: '0.75rem' }}>
                <Button size="sm" variant="secondary" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('name')}
                    >
                      Asset Name {renderSortIndicator('name')}
                    </th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('asset_type')}
                    >
                      Type {renderSortIndicator('asset_type')}
                    </th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('serial_no')}
                    >
                      Serial Number {renderSortIndicator('serial_no')}
                    </th>
                    <th>Assigned To</th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('condition')}
                    >
                      Condition {renderSortIndicator('condition')}
                    </th>
                    {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: 'rgba(86, 124, 141, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--primary)',
                            }}
                          >
                            <Laptop size={16} />
                          </div>
                          <strong style={{ color: 'var(--text-primary)' }}>{a.name}</strong>
                        </div>
                      </td>
                      <td>{a.asset_type || 'Hardware'}</td>
                      <td>
                        <code>{a.serial_no || '—'}</code>
                      </td>
                      <td>
                        {a.user_name ? (
                          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{a.user_name}</span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>Available in Pool</span>
                        )}
                      </td>
                      <td>
                        <Badge variant="success">{a.condition || 'Good'}</Badge>
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleDelete(a.id, a.name)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border)' }}>
                <span className="page-info" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Showing {assets.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalAssets)} of {totalAssets} assets
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

      {/* Add Asset Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Asset to Inventory"
        maxWidth="480px"
      >
        <form onSubmit={handleCreateAsset}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormInput
              label="Asset Name"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. MacBook Pro M3 14, Dell UltraSharp 27"
              required
            />

            <Select
              label="Asset Type"
              value={form.assetType}
              onChange={e => setForm(p => ({ ...p, assetType: e.target.value }))}
              options={[
                { value: 'Laptop', label: 'Laptop' },
                { value: 'Monitor', label: 'Monitor' },
                { value: 'Mobile Device', label: 'Mobile Device' },
                { value: 'Peripherals', label: 'Peripherals / Headset' },
                { value: 'Security Key', label: 'Security Key / Token' },
              ]}
            />

            <FormInput
              label="Serial Number / Service Tag"
              value={form.serialNo}
              onChange={e => setForm(p => ({ ...p, serialNo: e.target.value }))}
              placeholder="e.g. C02G40ALMD6P"
              required
            />

            <Select
              label="Assign to Employee (Optional)"
              value={form.assignedTo}
              onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))}
              options={[
                { value: '', label: '-- Unassigned (Available in Pool) --' },
                ...usersList.map(u => ({ value: u.id, label: `${u.user_name} (${u.emp_id})` })),
              ]}
            />

            <Select
              label="Hardware Condition"
              value={form.condition}
              onChange={e => setForm(p => ({ ...p, condition: e.target.value }))}
              options={[
                { value: 'Brand New', label: 'Brand New' },
                { value: 'Excellent', label: 'Excellent' },
                { value: 'Good', label: 'Good' },
                { value: 'Fair', label: 'Fair' },
              ]}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Add Asset
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
