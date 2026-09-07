import { useEffect } from 'react';
import { usePresenceTracking } from '@/hooks/usePresenceTracking';
import { useActivityTracker } from '@/hooks/useActivityTracker';

export const PresenceTracker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  usePresenceTracking();
  useActivityTracker();
  
  return <>{children}</>;
};
