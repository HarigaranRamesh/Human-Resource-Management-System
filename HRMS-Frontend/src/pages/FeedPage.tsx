import React, { useState, useEffect } from 'react';
import { announcementApi } from '../services/api.service';
import { PageHeader, Card, Button, Badge, Modal } from '../components/common';
import { Bell, Heart, Send, Plus, Trash2, Megaphone, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FeedPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', priority: 'Normal', department: 'All' });
  const [posting, setPosting] = useState(false);

  const currentUserId = localStorage.getItem('userId');

  useEffect(() => {
    const role = (localStorage.getItem('userRole') || '').toLowerCase();
    setIsAdmin(localStorage.getItem('isSystemAdmin') === 'true' || role.includes('admin') || role.includes('hr'));
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await announcementApi.getAll();
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setPosting(true);
    try {
      await announcementApi.create(form);
      toast.success('Announcement published to organization');
      setShowModal(false);
      setForm({ title: '', content: '', priority: 'Normal', department: 'All' });
      loadAnnouncements();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to post announcement');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (id: string) => {
    try {
      const res = await announcementApi.like(id);
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, likes: res.data?.likes || a.likes } : a));
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete announcement?')) return;
    try {
      await announcementApi.delete(id);
      toast.success('Announcement removed');
      loadAnnouncements();
    } catch {
      toast.error('Failed to delete announcement');
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '860px', margin: '0 auto' }}>
      <PageHeader
        title="Company Announcements & Notice Board"
        subtitle="Stay updated with company-wide news, townhalls, policy updates, and executive messages"
        actions={
          isAdmin && (
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setShowModal(true)}
            >
              Post Announcement
            </Button>
          )
        }
      />

      {loading ? (
        <Card>
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Loading company updates...</p>
          </div>
        </Card>
      ) : announcements.length === 0 ? (
        <Card>
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Megaphone size={48} style={{ opacity: 0.3, margin: '0 auto 1rem', display: 'block' }} />
            <p>No announcements posted yet.</p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {announcements.map((a) => {
            const hasLiked = (a.likes || []).includes(currentUserId);
            return (
              <Card key={a.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #2F4156, #567C8D)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        overflow: 'hidden',
                      }}
                    >
                      {a.author_image ? (
                        <img src={a.author_image} alt={a.author_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        (a.author_name || 'HR').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {a.author_name || 'Leadership Team'}
                      </h4>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        {a.author_position || 'Executive Office'} • {new Date(a.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Badge variant={a.priority === 'Urgent' ? 'danger' : a.priority === 'Info' ? 'info' : 'primary'}>
                      {a.priority || 'Normal'}
                    </Badge>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {a.title}
                </h3>

                <p style={{ margin: '0 0 1rem', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {a.content}
                </p>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => handleLike(a.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: hasLiked ? '#ef4444' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                    }}
                  >
                    <Heart size={16} fill={hasLiked ? '#ef4444' : 'none'} />
                    <span>{(a.likes || []).length} Likes</span>
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Post Announcement Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Broadcast Announcement"
        maxWidth="500px"
      >
        <form onSubmit={handlePost}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="form-label">Subject / Title</label>
              <input
                type="text"
                className="form-input"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Q4 Townhall & Annual Strategy Session"
                required
              />
            </div>

            <div>
              <label className="form-label">Priority</label>
              <select
                className="form-input"
                value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
              >
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent / Important</option>
                <option value="Info">General Info</option>
              </select>
            </div>

            <div>
              <label className="form-label">Announcement Content</label>
              <textarea
                className="form-input"
                rows={5}
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Write your message to all company personnel..."
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={posting} icon={<Send size={15} />}>
              Publish Update
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
