import React, { forwardRef } from 'react';
import type { IconProps } from './types';

export function createIcon(
  displayName: string,
  RenderIcon: React.ComponentType<any>
) {
  const IconComponent = forwardRef<SVGSVGElement, IconProps>(
    ({ size = 18, color = 'currentColor', strokeWidth = 2, className = '', title, ...rest }, ref) => {
      return (
        <RenderIcon
          ref={ref}
          size={size}
          color={color}
          strokeWidth={strokeWidth}
          className={`common-icon ${className}`.trim()}
          aria-hidden={title ? undefined : true}
          role={title ? 'img' : undefined}
          aria-label={title}
          {...rest}
        />
      );
    }
  );

  IconComponent.displayName = displayName;
  return IconComponent;
}
