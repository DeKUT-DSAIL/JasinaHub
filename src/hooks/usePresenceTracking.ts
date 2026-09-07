import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';

interface PresenceState {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  current_page: string;
  online_at: string;
}

export const usePresenceTracking = () => {
  const location = useLocation();
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const setupPresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile for display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      const presenceChannel = supabase.channel('online-users', {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      presenceChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            id: user.id,
            email: profile?.email || user.email || '',
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            current_page: location.pathname,
            online_at: new Date().toISOString(),
          });
        }
      });

      setChannel(presenceChannel);
    };

    setupPresence();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, []);

  // Update presence when page changes
  useEffect(() => {
    const updatePresence = async () => {
      if (!channel) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      await channel.track({
        id: user.id,
        email: profile?.email || user.email || '',
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        current_page: location.pathname,
        online_at: new Date().toISOString(),
      });
    };

    updatePresence();
  }, [location.pathname, channel]);
};

export const useActiveUsers = () => {
  const [activeUsers, setActiveUsers] = useState<PresenceState[]>([]);

  useEffect(() => {
    // Create channel with presence config to properly receive presence state
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: 'admin-viewer', // Unique key for admin viewing presence
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceState[] = [];
        
        // Extract all presence data from state
        Object.entries(state).forEach(([key, presences]) => {
          // Skip the admin-viewer key (that's us watching)
          if (key === 'admin-viewer') return;
          
          (presences as any[]).forEach((presence) => {
            // Only add if we have valid user data
            if (presence.id && presence.email) {
              users.push(presence as PresenceState);
            }
          });
        });
        
        // Remove duplicates by user id (keep latest)
        const uniqueUsers = users.reduce((acc, user) => {
          const existing = acc.find(u => u.id === user.id);
          if (!existing || new Date(user.online_at) > new Date(existing.online_at)) {
            return [...acc.filter(u => u.id !== user.id), user];
          }
          return acc;
        }, [] as PresenceState[]);
        
        setActiveUsers(uniqueUsers);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      });

    // Subscribe and track our own presence (as viewer)
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track minimal presence for admin viewer to trigger sync
        await channel.track({
          viewer: true,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return activeUsers;
};
