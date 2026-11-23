import React from 'react';
import type { IconProps } from './types';

/**
 * Reusable Add (Plus) Icon component.
 * Supports configurable size, color, strokeWidth, and custom classes.
 */
export const AddIcon: React.FC<IconProps> = ({
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
      className={`common-icon common-add-icon ${className}`.trim()}
      style={style}
      aria-hidden="true"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
};

export const PlusIcon = AddIcon;
export default AddIcon;
