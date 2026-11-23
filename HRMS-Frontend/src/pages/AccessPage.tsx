import React, { useState, useEffect } from 'react';
import { accessApi } from '../services/api.service';
import { PageHeader, Card, Button, Badge } from '../components/common';
import { Shield, Key, Users, CheckCircle2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AccessPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const res = await accessApi.getRoles();
      setRoles(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load role permissions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Role-Based Access Control (RBAC)"
        subtitle="3-Tier authorization policies, system roles, and menu permissions architecture"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {loading ? (
          <Card>
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p>Loading security roles...</p>
            </div>
          </Card>
        ) : (
          roles.map((r) => (
            <Card key={r.id || r.role}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: r.is_system ? 'rgba(47, 65, 86, 0.2)' : 'rgba(86, 124, 141, 0.15)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Shield size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {r.role}
                    </h3>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      ID Prefix: <code>{r.id_prefix || 'HARI'}</code>
                    </span>
                  </div>
                </div>

                <Badge variant={r.is_system ? 'primary' : 'success'}>
                  {r.is_system ? 'System Tier' : 'Custom Tier'}
                </Badge>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Salary Access:</span>
                  <strong>{r.has_payload_section ? 'Enabled' : 'Restricted'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Document Vault Required:</span>
                  <strong>{r.requires_documents ? 'Yes' : 'No'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Bank Information Collection:</span>
                  <strong>{r.collects_bank_details ? 'Mandatory' : 'Optional'}</strong>
                </div>
              </div>

              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Authorized Modules:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(Array.isArray(r.main) ? r.main : []).slice(0, 5).map((m: any, i: number) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(86, 124, 141, 0.12)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {m.menuName || m.submenuName || 'Module'}
                    </span>
                  ))}
                  {(Array.isArray(r.main) ? r.main : []).length > 5 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                      +{(r.main.length - 5)} more
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
