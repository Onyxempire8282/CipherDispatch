/**
 * StatusSummary component - displays status count cards
 * Follows TripleTen best practices: accessible, clear visual hierarchy, responsive
 */

import React from 'react';

export interface StatusCounts {
  SCHEDULED?: number;
  IN_PROGRESS?: number;
  COMPLETED?: number;
  CANCELED?: number;
  unassigned?: number;
}

export interface StatusSummaryProps {
  counts: StatusCounts;
  showCompleted?: boolean;
}

interface StatusCardData {
  label: string;
  count: number;
  color: string;
  icon: string;
}

export default function StatusSummary({ counts, showCompleted = false }: StatusSummaryProps) {
  const statusCards: StatusCardData[] = [
    {
      label: 'Scheduled',
      count: counts.SCHEDULED || 0,
      color: 'bg-status-scheduled',
      icon: '📅',
    },
    {
      label: 'In Progress',
      count: counts.IN_PROGRESS || 0,
      color: 'bg-status-progress',
      icon: '🔧',
    },
    {
      label: 'Unassigned',
      count: counts.unassigned || 0,
      color: 'bg-status-unassigned',
      icon: '👤',
    },
  ];

  // Show completed count only in archived view
  if (showCompleted) {
    statusCards.push({
      label: 'Completed',
      count: counts.COMPLETED || 0,
      color: 'bg-status-completed',
      icon: '✅',
    });
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statusCards.map((card) => (
        <div
          key={card.label}
          className={`
            ${card.color} bg-opacity-10
            border-l-4 ${card.color.replace('bg-', 'border-')}
            rounded-lg p-4
            transition-all duration-200
            hover:bg-opacity-20
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl" aria-hidden="true">{card.icon}</span>
            <span
              className={`text-3xl font-bold ${card.color.replace('bg-', 'text-')}`}
              aria-label={`${card.count} ${card.label.toLowerCase()} claims`}
            >
              {card.count}
            </span>
          </div>
          <p className="text-sm font-medium text-brand-light-200">
            {card.label}
          </p>
        </div>
      ))}
    </div>
  );
}
