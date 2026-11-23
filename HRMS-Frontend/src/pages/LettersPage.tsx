import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { letterApi, userApi } from '../services/api.service';
import { PageHeader, Card, Button, FormInput } from '../components/common';
import {
  FileText, Download, Printer, Edit3, Eye, CheckCircle2,
  Building, User, Calendar, Award, Sparkles, Shield, Save,
  RefreshCw, ChevronRight, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { HariHrmsLogo } from '../components/common/HariHrmsLogo';

export default function LettersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'appointment';

  const [activeType, setActiveType] = useState<'appointment' | 'offer' | 'experience'>(
    initialType === 'offer' || initialType === 'experience' ? initialType : 'appointment'
  );

  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [letterData, setLetterData] = useState<any>(null);

  // Super Admin specific state
  const isSuperAdmin = localStorage.getItem('isSystemAdmin') === 'true' ||
    (localStorage.getItem('userRole') || '').toLowerCase().includes('admin');

  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Editable template state
  const [templateForm, setTemplateForm] = useState({
    title: '',
    subject: '',
    content: '',
  });

  const letterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      loadEmployeeList();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    loadLetter(activeType, selectedUserId);
    if (isSuperAdmin) {
      loadTemplate(activeType);
    }
  }, [activeType, selectedUserId]);

  const loadEmployeeList = async () => {
    try {
      const res = await userApi.getUsers(1, 100);
      const list = res.data.users || res.data || [];
      setEmployees(list);
    } catch {
      // ignore
    }
  };

  const loadLetter = async (type: string, userId?: string) => {
    setLoading(true);
    try {
      const res = await letterApi.renderLetter(type, userId || undefined);
      setLetterData(res.data.data);
    } catch {
      toast.error('Failed to generate letter preview');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (type: string) => {
    try {
      const res = await letterApi.getTemplate(type);
      const tmpl = res.data.data;
      setTemplateForm({
        title: tmpl.title || '',
        subject: tmpl.subject || '',
        content: tmpl.content || '',
      });
    } catch {
      // ignore
    }
  };

  const handleTabChange = (type: 'appointment' | 'offer' | 'experience') => {
    setActiveType(type);
    setSearchParams({ type });
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.subject.trim() || !templateForm.content.trim()) {
      toast.error('Subject and Content cannot be empty');
      return;
    }
    setSaving(true);
    try {
      await letterApi.updateTemplate(activeType, templateForm);
      toast.success('Master template updated successfully!');
      loadLetter(activeType, selectedUserId);
      setMode('preview');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const insertPlaceholder = (tag: string) => {
    setTemplateForm(prev => ({
      ...prev,
      content: prev.content + tag,
    }));
  };

  return (
    <div className="page-container letter-page-wrapper" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Screen-Only Header & Tabs */}
      <div className="no-print">
        <PageHeader
          title="Official Corporate Letters & Certificates"
          subtitle="Generate, customize, and download official company Offer Letters, Appointment Letters, and Experience Certificates"
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {isSuperAdmin && (
                <Button
                  variant={mode === 'edit' ? 'primary' : 'outline'}
                  size="sm"
                  icon={mode === 'edit' ? <Eye size={15} /> : <Edit3 size={15} />}
                  onClick={() => setMode(prev => (prev === 'edit' ? 'preview' : 'edit'))}
                >
                  {mode === 'edit' ? 'View Live Preview' : 'Edit Master Template'}
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                icon={<Download size={15} />}
                onClick={handlePrint}
              >
                Download Official PDF
              </Button>
            </div>
          }
        />

        {/* 3 Letter Category Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            overflowX: 'auto',
            paddingBottom: '0.75rem',
            marginBottom: '1.25rem',
            width: '100%',
          }}
        >
          {[
            { id: 'appointment', label: 'Letters of Appointment', icon: <Award size={16} /> },
            { id: 'offer', label: 'Offer Letter', icon: <FileText size={16} /> },
            { id: 'experience', label: 'Experience & Relieving Certificate', icon: <Sparkles size={16} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                border: activeType === tab.id ? 'none' : '1px solid var(--border)',
                background: activeType === tab.id ? 'linear-gradient(135deg, #2F4156 0%, #567C8D 100%)' : 'var(--surface-0)',
                color: activeType === tab.id ? '#FFFFFF' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: activeType === tab.id ? '0 4px 14px rgba(47, 65, 86, 0.25)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Super Admin Control Bar: Employee Selector */}
        {isSuperAdmin && mode === 'preview' && (
          <Card style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={18} color="#567C8D" />
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Previewing for Employee:
                </span>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-0)',
                    color: 'var(--text-primary)',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="">Logged-in Profile ({localStorage.getItem('user_name') || 'Self'})</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.user_name} ({emp.emp_id || 'ID'}) — {emp.position || 'Staff'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', background: 'rgba(86, 124, 141, 0.15)', color: '#2F4156', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
                  🔒 Super Admin Template Manager
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          MODE A: SUPER ADMIN TEMPLATE EDITOR
          ══════════════════════════════════════════════════════ */}
      {isSuperAdmin && mode === 'edit' ? (
        <Card style={{ width: '100%', boxSizing: 'border-box', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit3 size={18} color="#567C8D" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Customize Master Template: {activeType.toUpperCase()} LETTER
              </h3>
            </div>
            <Button
              variant="primary"
              size="sm"
              loading={saving}
              icon={<Save size={15} />}
              onClick={handleSaveTemplate}
            >
              Save Template
            </Button>
          </div>

          {/* Variables Tag Chips Bar */}
          <div style={{ marginBottom: '1.25rem', padding: '0.85rem', background: 'rgba(86, 124, 141, 0.08)', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#567C8D', display: 'block', marginBottom: '6px' }}>
              Click to insert dynamic placeholder tag:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                '{{employee_name}}',
                '{{emp_id}}',
                '{{position}}',
                '{{department}}',
                '{{doj}}',
                '{{date}}',
                '{{ctc}}',
                '{{work_location}}',
                '{{current_address}}',
                '{{company_name}}',
              ].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertPlaceholder(tag)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(86, 124, 141, 0.25)',
                    background: 'var(--surface-0)',
                    color: '#2F4156',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title={`Insert ${tag}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <FormInput
              label="Template Document Title"
              value={templateForm.title}
              onChange={e => setTemplateForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Formal Letter of Appointment"
            />

            <FormInput
              label="Subject Line"
              value={templateForm.subject}
              onChange={e => setTemplateForm(p => ({ ...p, subject: e.target.value }))}
              placeholder="e.g. Letter of Appointment — {{position}}"
            />

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Letter Body Content (HTML supported)
              </label>
              <textarea
                value={templateForm.content}
                onChange={e => setTemplateForm(p => ({ ...p, content: e.target.value }))}
                rows={16}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-0)',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontSize: '0.88rem',
                  lineHeight: '1.6',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setMode('preview')}>
                Cancel
              </Button>
              <Button variant="primary" loading={saving} icon={<Save size={15} />} onClick={handleSaveTemplate}>
                Save Master Template
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {/* ══════════════════════════════════════════════════════
          MODE B: LIVE OFFICIAL LETTER DOCUMENT (PDF PRINT READY)
          ══════════════════════════════════════════════════════ */}
      {loading ? (
        <Card>
          <div style={{ padding: '5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={36} className="spin" style={{ margin: '0 auto 1rem', display: 'block', color: '#567C8D' }} />
            <p style={{ fontWeight: 600 }}>Constructing official corporate letterhead...</p>
          </div>
        </Card>
      ) : letterData ? (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '3rem' }}>
          {/* A4 Document Card */}
          <div
            id="printable-letter"
            ref={letterRef}
            className="official-letter-doc"
            style={{
              width: '100%',
              maxWidth: '820px',
              background: '#FFFFFF',
              color: '#1e293b',
              padding: '3.5rem 3rem',
              borderRadius: '12px',
              boxShadow: '0 16px 45px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              position: 'relative',
              boxSizing: 'border-box',
              fontFamily: '"Times New Roman", Times, Georgia, serif',
            }}
          >
            {/* Header: Company Letterhead */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '2.5px solid #2F4156',
                paddingBottom: '1.25rem',
                marginBottom: '2rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <HariHrmsLogo size={48} showText={false} />
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#2F4156', letterSpacing: '-0.01em', fontFamily: 'system-ui, sans-serif' }}>
                    NIRALIX HRMS TECHNOLOGIES PVT. LTD.
                  </h1>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#567C8D', fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>
                    Enterprise Cloud Human Resource Management System
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#64748b', fontFamily: 'system-ui, sans-serif', lineHeight: '1.4' }}>
                <div>Headquarters & Registered Office</div>
                <div>Nilgiris, Tamil Nadu, India</div>
                <div>CIN: U72900TN2026PTC145021</div>
                <div>harigaran925@gmail.com • www.niralix.com</div>
              </div>
            </div>

            {/* Document Title Banner */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#2F4156',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  textDecoration: 'underline',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {letterData.title}
              </h2>
              <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                Ref ID: HRMS/{letterData.letterType?.toUpperCase()}/{letterData.employee?.empId || 'GEN'}/{new Date().getFullYear()}
              </p>
            </div>

            {/* Letter Content HTML */}
            <div
              className="letter-body-content"
              style={{
                fontSize: '1.02rem',
                lineHeight: '1.75',
                color: '#1e293b',
                minHeight: '360px',
              }}
              dangerouslySetInnerHTML={{ __html: letterData.content }}
            />

            {/* Official Stamp & Signatory Block */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                marginTop: '3.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              {/* Digital Watermark / Seal */}
              <div
                style={{
                  border: '2px dashed #94a3b8',
                  borderRadius: '50%',
                  width: '90px',
                  height: '90px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  fontFamily: 'system-ui, sans-serif',
                  opacity: 0.85,
                }}
              >
                <span>Official</span>
                <span style={{ fontSize: '0.72rem', color: '#2F4156', margin: '2px 0' }}>SEAL</span>
                <span>NIRALIX HRMS</span>
              </div>

              {/* Authorized Signatory */}
              <div style={{ textAlign: 'right', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ fontSize: '1.2rem', fontFamily: '"Brush Script MT", cursive', color: '#2F4156', marginBottom: '4px' }}>
                  Shiju Shaji
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#2F4156' }}>
                  Authorized Signatory
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Head of Human Resources & Corporate Governance
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                  Digitally generated & authenticated via NIRALIX HRMS Cloud
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Print CSS to make window.print() output a flawless A4 PDF */}
      <style>{`
        @media print {
          body, html {
            background: #FFFFFF !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print,
          .layout-topbar,
          .layout-sidebar,
          .mobile-drawer,
          .layout-mask,
          footer,
          .page-header {
            display: none !important;
          }
          .layout-main-container {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .layout-main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .letter-page-wrapper {
            padding: 0 !important;
          }
          .official-letter-doc {
            box-shadow: none !important;
            border: none !important;
            padding: 2cm !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
