import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  Users,
  Loader2,
  Play,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserWithStats {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  verified: boolean;
  created_at: string;
  total_responses: number;
  total_recordings: number;
  total_duration_seconds: number;
  accepted_count: number;
  accepted_duration_seconds: number;
  rejected_count: number;
  rejected_duration_seconds: number;
  pending_count: number;
}

interface UserResponse {
  id: string;
  question_id: string;
  question_text: string;
  status: string;
  duration_seconds: number | null;
  audio_file_url: string | null;
  created_at: string;
}

const ITEMS_PER_PAGE = 15;

// Format seconds to HH:MM:SS
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export function AdminAllUsersTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof UserWithStats>("total_responses");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [userResponses, setUserResponses] = useState<Record<string, UserResponse[]>>({});
  const [loadingResponses, setLoadingResponses] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    try {
      setLoading(true);

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone_number, verified, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all responses with pagination to bypass 1000 row limit
      const allResponses: { user_id: string; status: string; response_type: string | null; duration_seconds: number | null }[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch, error: batchError } = await supabase
          .from("voice_responses")
          .select("user_id, status, response_type, duration_seconds")
          .range(offset, offset + batchSize - 1);

        if (batchError) throw batchError;

        if (batch && batch.length > 0) {
          allResponses.push(...batch);
          offset += batchSize;
          hasMore = batch.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      // Aggregate stats per user
      const userStatsMap: Record<string, {
        total_responses: number;
        total_recordings: number;
        total_duration_seconds: number;
        accepted_count: number;
        accepted_duration_seconds: number;
        rejected_count: number;
        rejected_duration_seconds: number;
        pending_count: number;
      }> = {};

      allResponses.forEach((response) => {
        if (!userStatsMap[response.user_id]) {
          userStatsMap[response.user_id] = {
            total_responses: 0,
            total_recordings: 0,
            total_duration_seconds: 0,
            accepted_count: 0,
            accepted_duration_seconds: 0,
            rejected_count: 0,
            rejected_duration_seconds: 0,
            pending_count: 0,
          };
        }

        const stats = userStatsMap[response.user_id];
        stats.total_responses += 1;
        const duration = response.duration_seconds || 0;

        // Count recordings (voice responses) and add duration
        if (response.response_type === "voice" || response.response_type === null) {
          stats.total_recordings += 1;
          stats.total_duration_seconds += duration;
        }

        // Count by status and track duration
        if (response.status === "accepted") {
          stats.accepted_count += 1;
          stats.accepted_duration_seconds += duration;
        } else if (response.status === "rejected") {
          stats.rejected_count += 1;
          stats.rejected_duration_seconds += duration;
        } else {
          stats.pending_count += 1;
        }
      });

      // Combine profiles with stats
      const usersWithStats: UserWithStats[] = (profiles || []).map((profile) => ({
        ...profile,
        total_responses: userStatsMap[profile.id]?.total_responses || 0,
        total_recordings: userStatsMap[profile.id]?.total_recordings || 0,
        total_duration_seconds: userStatsMap[profile.id]?.total_duration_seconds || 0,
        accepted_count: userStatsMap[profile.id]?.accepted_count || 0,
        accepted_duration_seconds: userStatsMap[profile.id]?.accepted_duration_seconds || 0,
        rejected_count: userStatsMap[profile.id]?.rejected_count || 0,
        rejected_duration_seconds: userStatsMap[profile.id]?.rejected_duration_seconds || 0,
        pending_count: userStatsMap[profile.id]?.pending_count || 0,
      }));

      setUsers(usersWithStats);
    } catch (error) {
      console.error("Error loading user stats:", error);
      toast({
        title: "Error",
        description: "Failed to load user statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;

    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.first_name.toLowerCase().includes(query) ||
        user.last_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phone_number.includes(query)
    );
  }, [users, searchQuery]);

  // Sort users
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [filteredUsers, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedUsers, currentPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Handle sort
  const handleSort = (field: keyof UserWithStats) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Toggle expanded user and fetch responses
  const toggleUserExpanded = async (userId: string) => {
    const newExpanded = new Set(expandedUsers);

    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
      setExpandedUsers(newExpanded);
      return;
    }

    newExpanded.add(userId);
    setExpandedUsers(newExpanded);

    // Fetch responses if not already loaded
    if (!userResponses[userId]) {
      setLoadingResponses((prev) => new Set(prev).add(userId));

      try {
        // Fetch responses with question details
        const { data: responses, error } = await supabase
          .from("voice_responses")
          .select("id, question_id, status, duration_seconds, audio_file_url, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Fetch question texts
        const questionIds = [...new Set(responses?.map((r) => r.question_id) || [])];
        const { data: questions } = await supabase
          .from("questions")
          .select("id, question_text")
          .in("id", questionIds);

        const questionMap = new Map(questions?.map((q) => [q.id, q.question_text]) || []);

        const enrichedResponses: UserResponse[] = (responses || []).map((r) => ({
          ...r,
          question_text: questionMap.get(r.question_id) || "Unknown Question",
        }));

        setUserResponses((prev) => ({ ...prev, [userId]: enrichedResponses }));
      } catch (error) {
        console.error("Error loading user responses:", error);
        toast({
          title: "Error",
          description: "Failed to load user responses",
          variant: "destructive",
        });
      } finally {
        setLoadingResponses((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    }
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Accepted</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pending</Badge>;
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "First Name",
      "Last Name",
      "Email",
      "Phone Number",
      "Verified",
      "Total Responses",
      "Total Duration",
      "Accepted Count",
      "Accepted Duration",
      "Rejected Count",
      "Rejected Duration",
      "Pending Count",
      "Joined Date",
    ];

    const rows = sortedUsers.map((user) => [
      user.first_name,
      user.last_name,
      user.email,
      user.phone_number,
      user.verified ? "Yes" : "No",
      user.total_responses.toString(),
      formatDuration(user.total_duration_seconds),
      user.accepted_count.toString(),
      formatDuration(user.accepted_duration_seconds),
      user.rejected_count.toString(),
      formatDuration(user.rejected_duration_seconds),
      user.pending_count.toString(),
      new Date(user.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `all_users_stats_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${sortedUsers.length} users to CSV`,
    });
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: keyof UserWithStats;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors select-none whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-primary">{sortDirection === "asc" ? "↑" : "↓"}</span>
        )}
      </div>
    </TableHead>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading user statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">All Users Overview</h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          View all users with their response statistics
        </p>
      </div>

      {/* Search and Export Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50"
            aria-label="Search users"
          />
        </div>

        <Button
          onClick={handleExportCSV}
          className="gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
        >
          <Download className="w-4 h-4" />
          Export to CSV ({sortedUsers.length})
        </Button>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {paginatedUsers.length} of {sortedUsers.length} users
        {searchQuery && ` matching "${searchQuery}"`}
      </p>

      {/* Table */}
      <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-10"></TableHead>
                  <SortableHeader field="first_name">Name</SortableHeader>
                  <SortableHeader field="email">Email</SortableHeader>
                  <TableHead className="whitespace-nowrap">Phone</TableHead>
                  <SortableHeader field="verified">Status</SortableHeader>
                  <SortableHeader field="total_responses">Responses</SortableHeader>
                  <SortableHeader field="total_duration_seconds">Duration</SortableHeader>
                  <SortableHeader field="accepted_count">Accepted</SortableHeader>
                  <SortableHeader field="rejected_count">Rejected</SortableHeader>
                  <SortableHeader field="pending_count">Pending</SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => {
                  const isExpanded = expandedUsers.has(user.id);
                  const isLoadingUser = loadingResponses.has(user.id);
                  const responses = userResponses[user.id] || [];

                  return (
                    <>
                      <TableRow
                        key={user.id}
                        className={`hover:bg-accent/10 cursor-pointer ${isExpanded ? "bg-accent/10" : ""}`}
                        onClick={() => user.total_responses > 0 && toggleUserExpanded(user.id)}
                      >
                        <TableCell className="w-10 p-2">
                          {user.total_responses > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleUserExpanded(user.id);
                              }}
                            >
                              {isLoadingUser ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {user.email}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {user.phone_number || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.verified ? "default" : "secondary"}
                            className={`text-xs ${user.verified
                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              }`}
                          >
                            {user.verified ? "Verified" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {user.total_responses}
                        </TableCell>
                        <TableCell className="text-center font-medium font-mono text-sm">
                          {formatDuration(user.total_duration_seconds)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                              {user.accepted_count}
                            </Badge>
                            <span className="text-xs font-mono text-muted-foreground">
                              {formatDuration(user.accepted_duration_seconds)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                              {user.rejected_count}
                            </Badge>
                            <span className="text-xs font-mono text-muted-foreground">
                              {formatDuration(user.rejected_duration_seconds)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                            {user.pending_count}
                          </Badge>
                        </TableCell>
                      </TableRow>

                      {/* Expanded responses row */}
                      {isExpanded && (
                        <TableRow key={`${user.id}-responses`} className="bg-muted/30">
                          <TableCell colSpan={10} className="p-0">
                            <div className="p-4 border-t border-b border-muted/30">
                              {isLoadingUser ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                                  <span className="text-muted-foreground">Loading responses...</span>
                                </div>
                              ) : responses.length === 0 ? (
                                <p className="text-center text-muted-foreground py-4">No responses found</p>
                              ) : (
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm text-foreground mb-3">
                                    Responses by {user.first_name} {user.last_name} ({responses.length})
                                  </h4>
                                  <div className="grid gap-2">
                                    {responses.map((response) => (
                                      <div
                                        key={response.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-card rounded-lg border border-border/50"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-foreground truncate">
                                            {response.question_text}
                                          </p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(response.created_at).toLocaleString()}
                                            </span>
                                            {response.duration_seconds && (
                                              <span className="text-xs font-mono text-muted-foreground">
                                                {formatDuration(response.duration_seconds)}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {getStatusBadge(response.status)}
                                          {response.audio_file_url && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-7 gap-1.5"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(response.audio_file_url!, "_blank");
                                              }}
                                            >
                                              <Play className="h-3 w-3" />
                                              Play
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}

                {paginatedUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <Users className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? `No users match "${searchQuery}"`
                          : "No users found"}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="hidden sm:flex"
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) =>
              page === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                  …
                </span>
              ) : (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 p-0 ${page === currentPage ? "bg-primary text-primary-foreground" : ""
                    }`}
                  aria-label={`Page ${page}`}
                  aria-current={page === currentPage ? "page" : undefined}
                >
                  {page}
                </Button>
              )
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="hidden sm:flex"
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
