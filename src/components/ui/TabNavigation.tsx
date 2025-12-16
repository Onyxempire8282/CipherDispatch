/**
 * Accessible TabNavigation component
 * Follows TripleTen best practices: WCAG ARIA patterns, keyboard navigation, mobile-first
 */

import React, { useRef, useEffect } from 'react';

export interface Tab {
  id: string;
  label: string;
  count?: number;
  icon?: string;
}

export interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export default function TabNavigation({ tabs, activeTab, onChange }: TabNavigationProps) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Focus management for keyboard navigation
  const focusTab = (tabId: string) => {
    const tabElement = tabRefs.current[tabId];
    if (tabElement) {
      tabElement.focus();
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = (event: React.KeyboardEvent, currentTabId: string) => {
    const currentIndex = tabs.findIndex(t => t.id === currentTabId);

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        // Move to previous tab (wrap around)
        const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        focusTab(tabs[prevIndex].id);
        onChange(tabs[prevIndex].id);
        break;

      case 'ArrowRight':
        event.preventDefault();
        // Move to next tab (wrap around)
        const nextIndex = currentIndex === tabs.length - 1 ? 0 : currentIndex + 1;
        focusTab(tabs[nextIndex].id);
        onChange(tabs[nextIndex].id);
        break;

      case 'Home':
        event.preventDefault();
        // Move to first tab
        focusTab(tabs[0].id);
        onChange(tabs[0].id);
        break;

      case 'End':
        event.preventDefault();
        // Move to last tab
        focusTab(tabs[tabs.length - 1].id);
        onChange(tabs[tabs.length - 1].id);
        break;
    }
  };

  return (
    <div className="border-b border-brand-dark-700">
      <nav
        className="-mb-px flex space-x-2 overflow-x-auto scrollbar-thin"
        aria-label="Tabs"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={`
                whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-brand-dark-900
                ${
                  isActive
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-brand-light-300 hover:text-brand-light-100 hover:border-brand-dark-600'
                }
              `}
            >
              <span className="flex items-center space-x-2">
                {tab.icon && <span className="text-base">{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`
                      ml-2 py-0.5 px-2 rounded-full text-xs font-semibold
                      ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-brand-dark-700 text-brand-light-300'
                      }
                    `}
                  >
                    {tab.count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
