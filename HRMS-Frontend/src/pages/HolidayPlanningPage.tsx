import React, { useState, useEffect } from 'react';
import { holidayApi } from '../services/api.service';
import { PageHeader, Card, Button, FormInput, Modal } from '../components/common';
import { Calendar, Plus, Trash2, Sun, PartyPopper } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HolidayPlanningPage() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const role = (localStorage.getItem('userRole') || '').toLowerCase();
    setIsAdmin(localStorage.getItem('isSystemAdmin') === 'true' || role.includes('admin') || role.includes('hr'));
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const res = await holidayApi.getHolidays();
      setHolidays(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load company holidays');
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.date) {
      toast.error('Name and date are required');
      return;
    }
    setSaving(true);
    try {
      await holidayApi.createHoliday(form);
      toast.success('Holiday added to corporate calendar');
      setShowModal(false);
      setForm({ name: '', date: '', description: '' });
      loadHolidays();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add holiday');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete holiday ${name}?`)) return;
    try {
      await holidayApi.deleteHoliday(id);
      toast.success('Holiday removed');
      loadHolidays();
    } catch {
      toast.error('Failed to delete holiday');
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Company Holiday Calendar"
        subtitle="Official gazetted, corporate, and statutory public holidays for the calendar year"
        actions={
          isAdmin && (
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setShowModal(true)}
            >
              Add Holiday
            </Button>
          )
        }
      />

      <Card>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Loading holidays calendar...</p>
          </div>
        ) : holidays.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Sun size={48} style={{ opacity: 0.3, margin: '0 auto 1rem', display: 'block' }} />
            <p>No holidays registered in calendar.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {holidays.map((h) => {
              const d = new Date(h.date);
              return (
                <div
                  key={h.id || h.date}
                  style={{
                    background: 'var(--surface-0)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, rgba(86,124,141,0.2), rgba(200,217,230,0.3))',
                        color: 'var(--primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        lineHeight: 1.1,
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>{d.getDate()}</span>
                      <span style={{ fontSize: '0.62rem', textTransform: 'uppercase' }}>
                        {d.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {h.name}
                      </h4>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {d.toLocaleDateString('en-US', { weekday: 'long' })}
                        {h.description ? ` • ${h.description}` : ''}
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDelete(h.id, h.name)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '6px',
                      }}
                      title="Remove holiday"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Add Holiday Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Holiday to Calendar"
        maxWidth="460px"
      >
        <form onSubmit={handleAddHoliday}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormInput
              label="Holiday Name"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Republic Day, Diwali"
              required
            />
            <FormInput
              label="Date"
              type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              required
            />
            <FormInput
              label="Description (Optional)"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="e.g. National Holiday"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Save Holiday
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
