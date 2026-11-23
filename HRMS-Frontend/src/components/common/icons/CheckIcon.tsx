import React from 'react';
import type { IconProps } from './types';

export const CheckIcon: React.FC<IconProps> = ({
  size = 16,
  color = 'currentColor',
  strokeWidth = 2,
  className = '',
  style,
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`common-icon common-check-icon ${className}`.trim()}
      style={style}
      aria-hidden="true"
      {...props}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
};

export default CheckIcon;
