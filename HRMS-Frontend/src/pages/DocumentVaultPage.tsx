import React, { useState, useEffect } from 'react';
import { documentApi } from '../services/api.service';
import { PageHeader, Card, Button, Badge, FormInput, Select, Modal } from '../components/common';
import { Shield, Upload, FileText, CheckCircle2, Trash2, Download, Eye, Plus, Folder, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DocumentVaultPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    category: 'Government ID',
    docType: 'Aadhar Card',
    docName: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const categories = [
    'All',
    'Government ID',
    'Educational',
    'Previous Employment',
    'Banking & Tax',
    'Other',
  ];

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await documentApi.getMyDocuments();
      setDocuments(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!form.docName) {
        setForm(p => ({ ...p, docName: file.name.replace(/\.[^/.]+$/, '') }));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please choose a document file to upload');
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('category', form.category);
    fd.append('docType', form.docType);
    fd.append('docName', form.docName || selectedFile.name);

    try {
      await documentApi.uploadDocument(fd);
      toast.success('Document uploaded successfully to your vault');
      setShowUploadModal(false);
      setSelectedFile(null);
      setForm({ category: 'Government ID', docType: 'Aadhar Card', docName: '' });
      loadDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await documentApi.deleteDocument(id);
      toast.success('Document deleted');
      loadDocuments();
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const filteredDocs = selectedCategory === 'All'
    ? documents
    : documents.filter(d => d.category === selectedCategory);

  return (
    <div className="page-container">
      <PageHeader
        title="Employee Document Vault"
        subtitle="Secure, encrypted digital repository for your official identification, credentials, and employment records"
        actions={
          <Button
            variant="primary"
            icon={<Upload size={16} />}
            onClick={() => setShowUploadModal(true)}
          >
            Upload Document
          </Button>
        }
      />

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '1.25rem', paddingBottom: '4px' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: selectedCategory === cat ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: selectedCategory === cat ? 'var(--primary)' : 'var(--surface-0)',
              color: selectedCategory === cat ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s ease',
            }}
          >
            {cat} {cat === 'All' ? `(${documents.length})` : `(${documents.filter(d => d.category === cat).length})`}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Loading document records...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Shield size={48} style={{ opacity: 0.25, margin: '0 auto 1rem', display: 'block' }} />
            <p style={{ margin: '0 0 1rem', fontWeight: 600 }}>No documents uploaded in this category</p>
            <Button variant="secondary" icon={<Plus size={15} />} onClick={() => setShowUploadModal(true)}>
              Upload your first document
            </Button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1rem' }}>
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                style={{
                  background: 'var(--surface-0)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '1.2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative',
                  transition: 'all 0.2s ease',
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
                      <FileText size={20} />
                    </div>
                    <Badge variant={doc.status === 'Verified' ? 'success' : 'warning'}>
                      {doc.status || 'Verified'}
                    </Badge>
                  </div>

                  <h4 style={{ margin: '0 0 4px', fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                    {doc.doc_name}
                  </h4>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    {doc.category} • {doc.doc_type}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Uploaded {new Date(doc.uploaded_at).toLocaleDateString()} • {Math.round((doc.file_size || 0) / 1024)} KB
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--primary)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <Eye size={14} /> View File
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id, doc.doc_name)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                    }}
                    title="Delete document"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Upload Document Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Document to Vault"
        maxWidth="500px"
      >
        <form onSubmit={handleUpload}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Select
              label="Document Category"
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              options={[
                { value: 'Government ID', label: 'Government ID (Aadhar / PAN / Passport)' },
                { value: 'Educational', label: 'Educational (Degree / Marksheet)' },
                { value: 'Previous Employment', label: 'Previous Employment (Relieving / Payslip)' },
                { value: 'Banking & Tax', label: 'Banking & Tax (Passbook / Cheque)' },
                { value: 'Other', label: 'Other Document' },
              ]}
              required
            />

            <FormInput
              label="Document Type / Identifier"
              value={form.docType}
              onChange={e => setForm(p => ({ ...p, docType: e.target.value }))}
              placeholder="e.g. Aadhar Card, Degree Certificate"
              required
            />

            <FormInput
              label="Document Title (Display Name)"
              value={form.docName}
              onChange={e => setForm(p => ({ ...p, docName: e.target.value }))}
              placeholder="e.g. Harigaran_Aadhar_Front_Back"
              required
            />

            <div>
              <label className="form-label">Select File (PDF, PNG, JPG - max 15MB)</label>
              <input
                type="file"
                className="form-input"
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                required
              />
              {selectedFile && (
                <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#22c55e', fontWeight: 600 }}>
                  Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setShowUploadModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={uploading} icon={<Upload size={15} />}>
              Upload Document
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
