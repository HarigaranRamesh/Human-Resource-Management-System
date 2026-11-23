import React from 'react';
import type { IconProps } from './types';

/**
 * Reusable Add Circle (Plus with Circle) Icon component.
 */
export const AddCircleIcon: React.FC<IconProps> = ({
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
      className={`common-icon common-add-circle-icon ${className}`.trim()}
      style={style}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </svg>
  );
};

export const PlusCircleIcon = AddCircleIcon;
export default AddCircleIcon;
