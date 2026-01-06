import { useWatchRedirect } from '@/hooks/useWatchRedirect';

interface WatchRedirectWrapperProps {
  children: React.ReactNode;
}

const WatchRedirectWrapper = ({ children }: WatchRedirectWrapperProps) => {
  useWatchRedirect();
  return <>{children}</>;
};

export default WatchRedirectWrapper;
