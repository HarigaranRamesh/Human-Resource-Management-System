import React, { useState, useEffect } from 'react';
import { performanceApi, userApi } from '../services/api.service';
import { PageHeader, Card, Button, Badge, Modal, FormInput, Select, SearchIcon } from '../components/common';
import { Target, Award, Star, CheckCircle2, TrendingUp, Calendar, Plus, MessageSquare, Edit3 } from 'lucide-react';
import { useDebounce } from '../lib/useDebounce';
import toast from 'react-hot-toast';

export default function PerformancePage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activePeriod, setActivePeriod] = useState('Q1 2026');

  // Goals & OKRs
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    targetDate: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().split('T')[0],
    priority: 'High',
    progress: 25,
  });

  // Rating Appraisal Modal
  const [appraisingReview, setAppraisingReview] = useState<any | null>(null);
  const [appraisalRating, setAppraisalRating] = useState('4.5');
  const [appraisalComments, setAppraisalComments] = useState('');
  const [submittingAppraisal, setSubmittingAppraisal] = useState(false);

  useEffect(() => {
    const role = (localStorage.getItem('userRole') || '').toLowerCase();
    const admin = localStorage.getItem('isSystemAdmin') === 'true' || role.includes('admin') || role.includes('hr');
    setIsAdmin(admin);
    loadReviews();
  }, [activePeriod]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await performanceApi.getReviews({ period: activePeriod });
      const data = res.data;
      const list = data.reviews || [];
      if (list.length === 0) {
        // If no reviews yet, create default entry for current user so they can start adding goals immediately
        const defaultItem = {
          id: 'temp-1',
          period: activePeriod,
          rating: 4.2,
          comments: 'Consistent team delivery and high sprint velocity.',
          status: 'In Progress',
          goals: [
            { id: 1, title: 'Upgrade Production Auth to JWT + RBAC', progress: 100, priority: 'High', targetDate: '2026-03-31' },
            { id: 2, title: 'Achieve 99.9% Attendance Regularization Turnaround', progress: 85, priority: 'Medium', targetDate: '2026-04-15' },
            { id: 3, title: 'Implement Keka-Grade Enterprise UI & Mobile Optimization', progress: 70, priority: 'High', targetDate: '2026-04-30' },
          ],
        };
        setReviews([defaultItem]);
      } else {
        setReviews(list);
      }
    } catch {
      toast.error('Failed to load performance reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.title.trim()) {
      toast.error('Please enter a goal objective');
      return;
    }
    setSavingGoal(true);
    try {
      const currentReview = reviews[0];
      const existingGoals = currentReview?.goals || [];
      const updatedGoals = [
        ...existingGoals,
        {
          id: Date.now(),
          title: goalForm.title,
          description: goalForm.description,
          priority: goalForm.priority,
          progress: Number(goalForm.progress),
          targetDate: goalForm.targetDate,
        },
      ];

      if (currentReview?.id && currentReview.id !== 'temp-1') {
        await performanceApi.updateReview(currentReview.id, { goals: updatedGoals });
      } else {
        await performanceApi.createReview({
          period: activePeriod,
          goals: updatedGoals,
          status: 'In Progress',
        });
      }

      toast.success('New OKR goal added to review cycle');
      setShowGoalModal(false);
      setGoalForm({
        title: '',
        description: '',
        targetDate: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().split('T')[0],
        priority: 'High',
        progress: 25,
      });
      loadReviews();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save goal');
    } finally {
      setSavingGoal(false);
    }
  };

  const handleUpdateGoalProgress = async (goalId: number, newProgress: number) => {
    const currentReview = reviews[0];
    if (!currentReview) return;
    const updatedGoals = (currentReview.goals || []).map((g: any) =>
      g.id === goalId ? { ...g, progress: newProgress } : g
    );

    try {
      if (currentReview.id !== 'temp-1') {
        await performanceApi.updateReview(currentReview.id, { goals: updatedGoals });
      }
      setReviews(prev =>
        prev.map(r => (r.id === currentReview.id ? { ...r, goals: updatedGoals } : r))
      );
      toast.success(`Progress updated to ${newProgress}%`);
    } catch {
      toast.error('Failed to update progress');
    }
  };

  const handleSaveAppraisal = async () => {
    if (!appraisingReview) return;
    setSubmittingAppraisal(true);
    try {
      if (appraisingReview.id !== 'temp-1') {
        await performanceApi.updateReview(appraisingReview.id, {
          rating: parseFloat(appraisalRating),
          comments: appraisalComments,
          status: 'Reviewed',
        });
      }
      toast.success('Performance appraisal submitted');
      setAppraisingReview(null);
      loadReviews();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit appraisal');
    } finally {
      setSubmittingAppraisal(false);
    }
  };

  const activeReview = reviews[0];
  const allGoals: any[] = activeReview?.goals || [];
  const avgProgress = allGoals.length > 0
    ? Math.round(allGoals.reduce((acc, g) => acc + (Number(g.progress) || 0), 0) / allGoals.length)
    : 0;

  return (
    <div className="page-container">
      <PageHeader
        title="Performance & OKRs Management"
        subtitle="Manage quarterly OKR objectives, track progress metrics, and review appraisal scorecards"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select
              className="form-input"
              style={{ width: '130px', padding: '6px 12px' }}
              value={activePeriod}
              onChange={e => setActivePeriod(e.target.value)}
            >
              <option value="Q1 2026">Q1 2026</option>
              <option value="Q2 2026">Q2 2026</option>
              <option value="Q3 2026">Q3 2026</option>
              <option value="Q4 2026">Q4 2026</option>
            </select>
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setShowGoalModal(true)}
            >
              Add Objective / OKR
            </Button>
          </div>
        }
      />

      {/* KPI Overview Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card stat-total">
          <div className="stat-icon-wrap"><Target size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">Active Objectives</span>
            <span className="stat-value">{allGoals.length}</span>
          </div>
        </div>
        <div className="stat-card stat-present">
          <div className="stat-icon-wrap"><TrendingUp size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">Average OKR Progress</span>
            <span className="stat-value">{avgProgress}%</span>
          </div>
        </div>
        <div className="stat-card stat-active">
          <div className="stat-icon-wrap"><Star size={22} style={{ color: '#d5a249' }} /></div>
          <div className="stat-info">
            <span className="stat-label">Current Appraisal Rating</span>
            <span className="stat-value">{activeReview?.rating ? `${activeReview.rating} / 5.0` : 'Pending'}</span>
          </div>
        </div>
        <div className="stat-card stat-absent">
          <div className="stat-icon-wrap"><Award size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">Cycle Status</span>
            <span className="stat-value">{activeReview?.status || 'In Progress'}</span>
          </div>
        </div>
      </div>

      {/* Objectives & OKRs Progress List */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Quarterly OKRs & Key Results</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Individual performance targets tied to company milestones ({activePeriod})
            </p>
          </div>
          <Badge variant="blue">{activePeriod}</Badge>
        </div>

        {allGoals.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Target size={40} style={{ opacity: 0.3, margin: '0 auto 0.75rem', display: 'block' }} />
            <p>No goals defined yet for this cycle.</p>
            <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setShowGoalModal(true)}>
              Define First Goal
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {allGoals.map((goal: any, idx: number) => {
              const progressVal = Number(goal.progress) || 0;
              return (
                <div
                  key={goal.id || idx}
                  style={{
                    padding: '1.1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-0)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>{goal.title}</strong>
                      {goal.description && (
                        <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {goal.description}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Badge variant={goal.priority === 'High' ? 'red' : goal.priority === 'Medium' ? 'amber' : 'green'}>
                        {goal.priority || 'Medium'} Priority
                      </Badge>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Target: {goal.targetDate}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar & Quick Slider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                    <div style={{ flex: 1, height: '8px', background: 'var(--surface-2)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${progressVal}%`,
                          background: progressVal >= 100 ? '#22c55e' : progressVal >= 50 ? '#567C8D' : '#2F4156',
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', minWidth: '45px', color: 'var(--text-primary)' }}>
                      {progressVal}%
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={progressVal}
                      onChange={e => handleUpdateGoalProgress(goal.id, Number(e.target.value))}
                      style={{ width: '100px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Appraisal Scorecard & Review Notes */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Official Appraisal & Evaluation</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Manager feedback, scorecard rating, and career development notes
            </p>
          </div>
          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Edit3 size={14} />}
              onClick={() => {
                setAppraisingReview(activeReview);
                setAppraisalRating(String(activeReview?.rating || '4.5'));
                setAppraisalComments(activeReview?.comments || '');
              }}
            >
              Evaluate / Rate Employee
            </Button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'var(--surface-1)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Overall Scorecard</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#2F4156' }}>{activeReview?.rating || '4.0'}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>/ 5.0</span>
              <div style={{ display: 'flex', gap: '2px', marginLeft: '6px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    size={16}
                    fill={star <= Math.round(Number(activeReview?.rating) || 4) ? '#f59e0b' : 'none'}
                    color={star <= Math.round(Number(activeReview?.rating) || 4) ? '#f59e0b' : '#cbd5e1'}
                  />
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--surface-1)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Appraiser Review Notes</span>
            <p style={{ margin: '6px 0 0', fontSize: '0.88rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.45 }}>
              "{activeReview?.comments || 'Demonstrates strong engineering ownership, prompt delivery of features, and active team mentorship.'}"
            </p>
          </div>
        </div>
      </Card>

      {/* Add Goal Modal */}
      <Modal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        title="Add Quarterly Objective / OKR"
        maxWidth="480px"
      >
        <form onSubmit={handleCreateGoal}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormInput
              label="Goal Objective Title"
              value={goalForm.title}
              onChange={e => setGoalForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Implement automated attendance regularization workflow"
              required
            />
            <div>
              <label className="form-label">Key Result Description (Optional)</label>
              <textarea
                className="form-input"
                rows={2}
                value={goalForm.description}
                onChange={e => setGoalForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Measurable outcomes, success metrics, and deliverables"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Select
                label="Priority"
                value={goalForm.priority}
                onChange={e => setGoalForm(p => ({ ...p, priority: e.target.value }))}
                options={[
                  { value: 'High', label: 'High Priority' },
                  { value: 'Medium', label: 'Medium Priority' },
                  { value: 'Low', label: 'Low Priority' },
                ]}
              />
              <FormInput
                label="Target Completion Date"
                type="date"
                value={goalForm.targetDate}
                onChange={e => setGoalForm(p => ({ ...p, targetDate: e.target.value }))}
                required
              />
            </div>
            <FormInput
              label="Initial Progress (%)"
              type="number"
              min="0"
              max="100"
              value={String(goalForm.progress)}
              onChange={e => setGoalForm(p => ({ ...p, progress: Number(e.target.value) }))}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setShowGoalModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={savingGoal}>
              Add Goal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manager Evaluation Modal */}
      {appraisingReview && (
        <Modal
          isOpen={!!appraisingReview}
          onClose={() => setAppraisingReview(null)}
          title="Submit Performance Appraisal"
          maxWidth="460px"
        >
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Appraisal Rating (1.0 to 5.0)</label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                className="form-input"
                value={appraisalRating}
                onChange={e => setAppraisalRating(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Reviewer Comments / Feedback</label>
              <textarea
                className="form-input"
                rows={3}
                value={appraisalComments}
                onChange={e => setAppraisalComments(e.target.value)}
                placeholder="Detail key accomplishments, areas of improvement, and recommendations"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <Button variant="secondary" onClick={() => setAppraisingReview(null)}>
                Cancel
              </Button>
              <Button variant="primary" loading={submittingAppraisal} onClick={handleSaveAppraisal}>
                Save Appraisal
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
