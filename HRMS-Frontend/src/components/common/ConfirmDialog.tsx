import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle size={24} className="confirm-icon danger" />;
      case 'warning':
        return <AlertTriangle size={24} className="confirm-icon warning" />;
      case 'info':
      default:
        return <Info size={24} className="confirm-icon info" />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} maxWidth="420px" showCloseButton={!loading}>
      <div className="confirm-dialog-content">
        <div className="confirm-header">
          <div className={`confirm-icon-wrapper ${type}`}>{getIcon()}</div>
          <h3 className="confirm-title">{title}</h3>
        </div>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={type === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
