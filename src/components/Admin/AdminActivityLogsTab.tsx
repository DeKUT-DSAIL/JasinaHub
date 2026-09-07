import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Search, RefreshCw, Activity, Eye, LogIn, LogOut, Mic, CheckCircle, FolderOpen, UserCog } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: unknown;
  page: string | null;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const ITEMS_PER_PAGE = 20;

const actionIcons: Record<string, React.ReactNode> = {
  page_view: <Eye className="h-4 w-4" />,
  login: <LogIn className="h-4 w-4" />,
  logout: <LogOut className="h-4 w-4" />,
  recording_started: <Mic className="h-4 w-4" />,
  recording_completed: <CheckCircle className="h-4 w-4" />,
  question_answered: <CheckCircle className="h-4 w-4" />,
  category_opened: <FolderOpen className="h-4 w-4" />,
  profile_updated: <UserCog className="h-4 w-4" />,
};

const actionColors: Record<string, string> = {
  page_view: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  login: 'bg-green-500/10 text-green-500 border-green-500/20',
  logout: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  recording_started: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  recording_completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  question_answered: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
  category_opened: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  profile_updated: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

export const AdminActivityLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Fetch logs
      const { data: logsData, error: logsError } = await supabase
        .from('user_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (logsError) throw logsError;

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email');

      if (usersError) throw usersError;

      setUsers(usersData || []);

      // Enrich logs with user data
      const enrichedLogs = (logsData || []).map((log) => {
        const user = usersData?.find((u) => u.id === log.user_id);
        return {
          ...log,
          user: user
            ? {
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
            }
            : undefined,
        };
      });

      setLogs(enrichedLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('activity-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_activity_logs',
        },
        (payload) => {
          const newLog = payload.new as ActivityLog;
          const user = users.find((u) => u.id === newLog.user_id);
          setLogs((prev) => [
            {
              ...newLog,
              user: user
                ? {
                  first_name: user.first_name,
                  last_name: user.last_name,
                  email: user.email,
                }
                : undefined,
            },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map((log) => log.action));
    return Array.from(actions).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        searchQuery === '' ||
        log.user?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.page?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAction = selectedAction === 'all' || log.action === selectedAction;
      const matchesUser = selectedUser === 'all' || log.user_id === selectedUser;

      return matchesSearch && matchesAction && matchesUser;
    });
  }, [logs, searchQuery, selectedAction, selectedUser]);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);

  const formatDetails = (details: unknown): string => {
    if (!details || typeof details !== 'object') return '-';
    return Object.entries(details as Record<string, unknown>)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4 bg-card border-border/50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, action, or page..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 bg-background/50"
            />
          </div>

          <Select
            value={selectedAction}
            onValueChange={(value) => {
              setSelectedAction(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-48 bg-background/50">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedUser}
            onValueChange={(value) => {
              setSelectedUser(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-48 bg-background/50">
              <SelectValue placeholder="Filter by user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={fetchLogs} className="shrink-0">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Showing {paginatedLogs.length} of {filteredLogs.length} logs
        </span>
      </div>

      {/* Table */}
      <Card className="bg-card border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No activity logs found
                </TableCell>
              </TableRow>
            ) : (
              paginatedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">
                        {log.user?.first_name || log.user?.last_name
                          ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim()
                          : (log.user?.email || "User " + log.user_id.slice(0, 8))}
                      </p>
                      <p className="text-xs text-muted-foreground">{log.user?.email || "No email provided"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`flex items-center gap-1 w-fit ${actionColors[log.action] || 'bg-muted text-muted-foreground border-border'
                        }`}
                    >
                      {actionIcons[log.action] || <Activity className="h-4 w-4" />}
                      {log.action.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{log.page || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {formatDetails(log.details)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm text-foreground">
                        {format(new Date(log.created_at), 'MMM d, HH:mm')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => setCurrentPage(pageNum)}
                    isActive={currentPage === pageNum}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={
                  currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};
