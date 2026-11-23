import React, { useState, useEffect } from 'react';
import { assetApi, userApi } from '../services/api.service';
import { PageHeader, Card, Button, Badge, FormInput, Select, Modal } from '../components/common';
import { Laptop, Plus, Trash2, Edit2, Shield, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AssetManagementPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', assetType: 'Laptop', serialNo: '', assignedTo: '', condition: 'Excellent', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const role = (localStorage.getItem('userRole') || '').toLowerCase();
    const admin = localStorage.getItem('isSystemAdmin') === 'true' || role.includes('admin') || role.includes('hr');
    setIsAdmin(admin);
    loadAssets();
    if (admin) loadUsers();
  }, []);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const res = await assetApi.getAssets();
      setAssets(Array.isArray(res.data) ? res.data : []);
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

  return (
    <div className="page-container">
      <PageHeader
        title="Asset Allocation & Device Inventory"
        subtitle="Manage hardware lifecycle, laptops, peripherals, and assigned employee assets"
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

      <Card>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Loading asset inventory...</p>
          </div>
        ) : assets.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Laptop size={48} style={{ opacity: 0.3, margin: '0 auto 1rem', display: 'block' }} />
            <p>No assets currently registered.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset Name</th>
                  <th>Type</th>
                  <th>Serial Number</th>
                  <th>Assigned To</th>
                  <th>Condition</th>
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
