import { useState, useEffect } from 'react';

const BP_MOBILE = 768;
const BP_TABLET = 1024;

/**
 * useResponsive — returns breakpoint flags and responsive value helpers.
 *
 * Usage:
 *   const { isMobile, isTablet, isDesktop, r } = useResponsive();
 *   <div style={{ padding: r(28, 20, 14) }} />   // desktop | tablet | mobile
 *   <div style={{ gridTemplateColumns: r('repeat(4,1fr)', 'repeat(2,1fr)', '1fr') }} />
 */
export function useResponsive() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);

  useEffect(() => {
    let raf;
    const handler = () => { raf = requestAnimationFrame(() => setW(window.innerWidth)); };
    window.addEventListener('resize', handler);
    return () => { window.removeEventListener('resize', handler); cancelAnimationFrame(raf); };
  }, []);

  const isMobile  = w < BP_MOBILE;
  const isTablet  = w >= BP_MOBILE && w < BP_TABLET;
  const isDesktop = w >= BP_TABLET;

  /**
   * r(desktop, tablet, mobile) — pick the right value for current breakpoint.
   * Tablet falls back to desktop if not provided.
   */
  const r = (desktop, tablet, mobile) => {
    if (isMobile)  return mobile  !== undefined ? mobile  : (tablet !== undefined ? tablet : desktop);
    if (isTablet)  return tablet  !== undefined ? tablet  : desktop;
    return desktop;
  };

  return { isMobile, isTablet, isDesktop, r, w };
}

export default useResponsive;
