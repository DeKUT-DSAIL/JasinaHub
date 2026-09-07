import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';

type ActivityAction = 
  | 'page_view'
  | 'login'
  | 'logout'
  | 'question_answered'
  | 'recording_started'
  | 'recording_completed'
  | 'category_opened'
  | 'profile_updated';

interface ActivityDetails {
  [key: string]: string | number | boolean | null | undefined;
}

export const useActivityTracker = () => {
  const location = useLocation();
  const lastPageRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Track page views
  useEffect(() => {
    const trackPageView = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      userIdRef.current = user.id;
      
      // Don't log duplicate page views
      if (lastPageRef.current === location.pathname) return;
      lastPageRef.current = location.pathname;

      await logActivity('page_view', { path: location.pathname });
    };

    trackPageView();
  }, [location.pathname]);

  const logActivity = useCallback(async (
    action: ActivityAction,
    details?: ActivityDetails
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('user_activity_logs').insert({
        user_id: user.id,
        action,
        details: details || null,
        page: location.pathname
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }, [location.pathname]);

  return { logActivity };
};

// Standalone function for logging activities without the hook
export const logUserActivity = async (
  action: ActivityAction,
  details?: ActivityDetails,
  page?: string
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('user_activity_logs').insert({
      user_id: user.id,
      action,
      details: details || null,
      page: page || window.location.pathname
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};
