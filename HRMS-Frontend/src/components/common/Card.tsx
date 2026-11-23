import React from 'react';

export interface CardProps {
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  style,
}) => {
  return (
    <div className={`common-card ${className}`.trim()} style={style}>
      {(title || action) && (
        <div className="common-card-header">
          <div>
            {typeof title === 'string' ? <h3 className="common-card-title">{title}</h3> : title}
            {subtitle && <p className="common-card-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="common-card-action">{action}</div>}
        </div>
      )}
      <div className="common-card-body">{children}</div>
    </div>
  );
};

export default Card;
