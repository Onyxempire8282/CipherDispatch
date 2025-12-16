/**
 * Loading spinner component with accessible label
 * Follows TripleTen best practices: semantic HTML, ARIA, visual feedback
 */

import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  size = 'md',
  message = 'Loading...',
  fullScreen = false,
}: LoadingSpinnerProps) {
  // Size classes
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-12 h-12 border-4',
    lg: 'w-16 h-16 border-4',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div
        className={`${sizeClasses[size]} border-blue-500 border-t-transparent rounded-full animate-spin`}
        role="status"
        aria-live="polite"
        aria-label={message}
      />
      {message && (
        <p className="text-brand-light-300 text-sm font-medium" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
