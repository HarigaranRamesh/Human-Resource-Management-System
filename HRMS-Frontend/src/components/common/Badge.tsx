import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'blue' | 'purple' | 'red' | 'amber' | 'gray' | 'primary' | 'success' | 'danger' | 'warning' | 'info';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'blue',
  dot = false,
  className = '',
}) => {
  const colorMap: Record<string, string> = {
    primary: 'blue',
    success: 'green',
    danger: 'red',
    warning: 'amber',
    info: 'purple',
  };
  const resolvedVariant = colorMap[variant] || variant;

  return (
    <span className={`common-badge badge-${resolvedVariant} ${className}`.trim()}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
};

export default Badge;
