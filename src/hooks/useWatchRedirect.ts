import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Smartwatches typically have very small square-ish screens.
// We require BOTH dimensions to be tiny to avoid catching phones in landscape.
const WATCH_MAX_DIMENSION = 320;

const isLikelyWatch = (): boolean => {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const uaWatch = /Watch|WearOS|Wear OS|Tizen.*Watch|Galaxy Watch/i.test(ua);

  const w = window.innerWidth;
  const h = window.innerHeight;

  // Both dimensions must be tiny (square-ish wearable screen).
  const tinyBoth = w <= WATCH_MAX_DIMENSION && h <= WATCH_MAX_DIMENSION;

  // Avoid false positives on phones (which usually report touch + larger height).
  return uaWatch || tinyBoth;
};

export const useWatchRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkForWatch = () => {
      const isAlreadyOnWatch = location.pathname.startsWith('/watch');
      if (isLikelyWatch() && !isAlreadyOnWatch) {
        navigate('/watch', { replace: true });
      }
    };

    checkForWatch();
    window.addEventListener('resize', checkForWatch);
    return () => window.removeEventListener('resize', checkForWatch);
  }, [navigate, location.pathname]);
};

export default useWatchRedirect;
