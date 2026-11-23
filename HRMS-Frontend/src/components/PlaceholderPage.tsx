import React from 'react';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  subtitle?: string;
}

export default function PlaceholderPage({ title, subtitle }: PlaceholderPageProps) {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="coming-soon">
        <Construction size={64} className="coming-soon-icon" />
        <p className="coming-soon-title">This page is under active development</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          The full Angular functionality has been migrated — this page is being styled in React.
        </p>
      </div>
    </div>
  );
}
