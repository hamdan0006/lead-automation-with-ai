import React, { CSSProperties } from 'react';

// Type definitions
type ProgressBarSize = 'sm' | 'md' | 'lg';
type ProgressBarVariant = 'primary' | 'success' | 'warning' | 'danger';

interface ProgressBarProps {
  /** Progress value (0-100). Use null for indeterminate/animated progress bar */
  progress?: number | null;
  /** Additional CSS classes */
  className?: string;
  /** Size of the progress bar */
  size?: ProgressBarSize;
  /** Color variant */
  variant?: ProgressBarVariant;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress = null, // null for indeterminate, 0-100 for determinate
  className = '',
  size = 'md',
  variant = 'primary'
}) => {
  const sizes: Record<ProgressBarSize, string> = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const variants: Record<ProgressBarVariant, string> = {
    primary: 'bg-blue',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger'
  };

  // Calculate style for determinate progress
  const progressStyle: CSSProperties = progress !== null 
    ? { width: `${Math.min(progress, 100)}%` } 
    : {};

  // Determine classes for the inner progress element
  const progressClasses = [
    sizes[size],
    variants[variant],
    'transition-all duration-300 ease-out rounded-full cement-texture',
    progress === null ? 'w-1/3 animate-[slide_2s_ease-in-out_infinite]' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={`w-full bg-smoke-white-300 rounded-full overflow-hidden ${sizes[size]} ${className}`}>
      <div 
        className={progressClasses}
        style={progressStyle}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress !== null ? progress : undefined}
        aria-label="Progress"
      />
    </div>
  );
};

export default ProgressBar;