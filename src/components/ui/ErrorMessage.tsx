/**
 * Error message component with accessible styling
 * Follows TripleTen best practices: semantic HTML, ARIA, clear visual feedback
 */

import React from 'react';

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorMessage({ message, onRetry, className = '' }: ErrorMessageProps) {
  return (
    <div
      className={`bg-red-900/20 border-2 border-red-500 rounded-lg p-4 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-400">Error</h3>
          <p className="mt-1 text-sm text-brand-light-200">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm font-medium text-blue-400 hover:text-blue-300 focus:outline-none focus:underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
