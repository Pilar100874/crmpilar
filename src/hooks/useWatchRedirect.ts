import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const WATCH_MAX_SIZE = 320; // Smartwatches typically have screens <= 320px

export const useWatchRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkForWatch = () => {
      const isWatchSize = window.innerWidth <= WATCH_MAX_SIZE || window.innerHeight <= WATCH_MAX_SIZE;
      const isAlreadyOnWatch = location.pathname.startsWith('/watch');
      
      if (isWatchSize && !isAlreadyOnWatch) {
        navigate('/watch', { replace: true });
      }
    };

    // Check on mount
    checkForWatch();

    // Also check on resize (for development/testing)
    window.addEventListener('resize', checkForWatch);
    return () => window.removeEventListener('resize', checkForWatch);
  }, [navigate, location.pathname]);
};

export default useWatchRedirect;
