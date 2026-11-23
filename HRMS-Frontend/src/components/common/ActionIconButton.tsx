import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ActionIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'danger' | 'primary' | 'success' | 'default';
  icon: React.ReactNode;
  title: string;
  loading?: boolean;
}

export const ActionIconButton: React.FC<ActionIconButtonProps> = ({
  variant = 'default',
  icon,
  title,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      type="button"
      className={`common-action-btn action-btn-${variant} ${className}`.trim()}
      title={title}
      aria-label={title}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={14} className="spin" /> : icon}
    </button>
  );
};

export default ActionIconButton;
