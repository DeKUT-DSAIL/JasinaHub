import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Clock, MapPin } from 'lucide-react';
import { useActiveUsers } from '@/hooks/usePresenceTracking';
import { formatDistanceToNow } from 'date-fns';

const getPageName = (path: string): string => {
  const pageNames: Record<string, string> = {
    '/': 'Home',
    '/dashboard': 'Dashboard',
    '/questions': 'Questions',
    '/admin': 'Admin Panel',
    '/my-responses': 'My Responses',
    '/login': 'Login',
    '/signup': 'Sign Up',
    '/completion': 'Completion',
  };
  return pageNames[path] || path;
};

export const AdminActiveUsersTab: React.FC = () => {
  const activeUsers = useActiveUsers();

  if (activeUsers.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
        <p className="text-muted-foreground">No users currently online</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-foreground/80">
          {activeUsers.length} user{activeUsers.length !== 1 ? 's' : ''} online
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeUsers.map((user) => (
          <Card key={user.id} className="p-4 bg-card border-green-500/20 shadow-sm transition-all hover:bg-accent/5">
            <div className="flex items-start gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-semibold">
                  {user.first_name?.[0] || user.email?.[0] || 'U'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {user.first_name || user.last_name
                    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                    : (user.email || 'User ' + user.id.slice(0, 8))}
                </p>
                <p className="text-sm text-muted-foreground truncate">{user.email || "No email"}</p>

                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {getPageName(user.current_page)}
                  </Badge>
                </div>

                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    Online {formatDistanceToNow(new Date(user.online_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
