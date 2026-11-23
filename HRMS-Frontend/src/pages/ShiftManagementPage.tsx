import React, { useState, useEffect } from 'react';
import { shiftApi } from '../services/api.service';
import { PageHeader, Card, Button, FormInput, Modal } from '../components/common';
import { Clock, Plus, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ShiftManagementPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', start_time: '09:30', end_time: '18:30', grace_mins: 15 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const role = (localStorage.getItem('userRole') || '').toLowerCase();
    setIsAdmin(localStorage.getItem('isSystemAdmin') === 'true' || role.includes('admin') || role.includes('hr'));
    loadShifts();
  }, []);

  const loadShifts = async () => {
    setLoading(true);
    try {
      const res = await shiftApi.getShifts();
      setShifts(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error('Shift name required');
      return;
    }
    setSaving(true);
    try {
      await shiftApi.createShift(form);
      toast.success('Shift profile created successfully');
      setShowModal(false);
      setForm({ name: '', start_time: '09:30', end_time: '18:30', grace_mins: 15 });
      loadShifts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save shift');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete shift "${name}"?`)) return;
    try {
      await shiftApi.deleteShift(id);
      toast.success('Shift deleted');
      loadShifts();
    } catch {
      toast.error('Failed to delete shift');
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Shift Schedules & Timings"
        subtitle="Configure standard working hours, rotational schedules, and late arrival grace windows"
        actions={
          isAdmin && (
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setShowModal(true)}
            >
              Create Shift
            </Button>
          )
        }
      />

      <Card>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Loading shift schedules...</p>
          </div>
        ) : shifts.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Clock size={48} style={{ opacity: 0.3, margin: '0 auto 1rem', display: 'block' }} />
            <p>No shift configurations found.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {shifts.map((s) => (
              <div
                key={s.id}
                style={{
                  background: 'var(--surface-0)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(86, 124, 141, 0.15)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Clock size={20} />
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id, s.name)}
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
                    )}
                  </div>

                  <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {s.name}
                  </h4>
                  <div style={{ fontSize: '0.86rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '6px' }}>
                    {s.start_time} — {s.end_time}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Grace Period: <strong>{s.grace_mins || 0} minutes</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Shift Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Shift Profile"
        maxWidth="460px"
      >
        <form onSubmit={handleSaveShift}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormInput
              label="Shift Name"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. General Day Shift, US Night Shift"
              required
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <FormInput
                label="Start Time"
                type="time"
                value={form.start_time}
                onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
                required
              />
              <FormInput
                label="End Time"
                type="time"
                value={form.end_time}
                onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))}
                required
              />
            </div>
            <FormInput
              label="Grace Period (Minutes)"
              type="number"
              value={String(form.grace_mins)}
              onChange={e => setForm(p => ({ ...p, grace_mins: parseInt(e.target.value, 10) || 0 }))}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Save Shift
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
