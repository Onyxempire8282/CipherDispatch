import { useState, useEffect } from 'react';

/**
 * Breakpoint for mobile agenda view.
 * <= 600px: Mobile agenda view
 * > 600px: Desktop calendar view
 */
const MOBILE_BREAKPOINT = 600;

/**
 * Hook to detect if the viewport is mobile-sized.
 * Returns true when window width is <= 600px.
 *
 * Used for presentation switching between:
 * - Desktop: MonthlyCalendar grid
 * - Mobile: MobileAgendaView daily list
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    // Check on mount
    checkMobile();

    // Listen for resize events with debounce for performance
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 100);
    };

    window.addEventListener('resize', handleResize);

    // Also listen for orientation changes (mobile devices)
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  return isMobile;
}

export default useIsMobile;
