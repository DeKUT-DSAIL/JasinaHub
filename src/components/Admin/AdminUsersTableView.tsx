import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Download,
  Loader2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Users,
  Mic,
  Headphones,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserWithStats {
  id: string;
  first_name: string;
  last_name: string;
  pseudonym: string;
  email: string;
  phone_number: string;
  verified: boolean;
  created_at: string;
  account_type: string;
  transcription_guidelines_agreed: boolean;
  accepted_duration_seconds: number;
  rejected_duration_seconds: number;
  total_duration_seconds: number;
  accepted_count: number;
  rejected_count: number;
  total_responses: number;
  pending_count: number;
}

export interface TranscriberWithStats {
  id: string;
  first_name: string;
  last_name: string;
  pseudonym: string;
  email: string;
  phone_number: string;
  verified: boolean;
  created_at: string;
  account_type: string;
  transcription_guidelines_agreed: boolean;
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
  verifiedDuration: number;
  totalDuration: number;
}

const ITEMS_PER_PAGE = 15;

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

interface AdminUsersTableViewProps {
  onBack: () => void;
}

export function AdminUsersTableView({ onBack }: AdminUsersTableViewProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [durationFilter, setDurationFilter] = useState<string>("all");
  const [totalDurationFilter, setTotalDurationFilter] = useState<"all" | "gt_5" | "gt_15">("all");
  const [sortField, setSortField] = useState<keyof UserWithStats>("accepted_duration_seconds");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Transcribers Table State
  const [transcribers, setTranscribers] = useState<TranscriberWithStats[]>([]);
  const [tSearchQuery, setTSearchQuery] = useState("");
  const [tCurrentPage, setTCurrentPage] = useState(1);
  const [tSelectedUsers, setTSelectedUsers] = useState<Set<string>>(new Set());
  const [tSortField, setTSortField] = useState<keyof TranscriberWithStats>("total");
  const [tSortDirection, setTSortDirection] = useState<"asc" | "desc">("desc");

  const [activeTab, setActiveTab] = useState<"recorders" | "transcribers">("recorders");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, pseudonym, email, phone_number, verified, created_at, account_type, transcription_guidelines_agreed")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Batch fetch all responses
      const allResponses: { id: string; user_id: string; status: string; duration_seconds: number | null }[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch, error } = await supabase
          .from("voice_responses")
          .select("id, user_id, status, duration_seconds")
          .range(offset, offset + batchSize - 1);

        if (error) throw error;
        if (batch && batch.length > 0) {
          allResponses.push(...batch);
          offset += batchSize;
          hasMore = batch.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      // Aggregate per user
      const statsMap: Record<string, { accepted_duration_seconds: number; rejected_duration_seconds: number; total_duration_seconds: number; accepted_count: number; rejected_count: number; total_responses: number }> = {};

      allResponses.forEach((r) => {
        if (!statsMap[r.user_id]) {
          statsMap[r.user_id] = {
            accepted_duration_seconds: 0,
            rejected_duration_seconds: 0,
            total_duration_seconds: 0,
            accepted_count: 0,
            rejected_count: 0,
            total_responses: 0,
          };
        }
        const s = statsMap[r.user_id];
        const dur = r.duration_seconds || 0;
        s.total_responses += 1;
        s.total_duration_seconds += dur;
        if (r.status === "accepted") {
          s.accepted_count += 1;
          s.accepted_duration_seconds += dur;
        } else if (r.status === "rejected") {
          s.rejected_count += 1;
          s.rejected_duration_seconds += dur;
        }
      });

      const usersWithStats: UserWithStats[] = (profiles || []).map((p) => {
        const stats = statsMap[p.id] || {
          accepted_duration_seconds: 0,
          rejected_duration_seconds: 0,
          total_duration_seconds: 0,
          accepted_count: 0,
          rejected_count: 0,
          total_responses: 0,
        };
        return {
          ...p,
          account_type: (p as any).account_type || 'recording_volunteer',
          ...stats,
          pending_count: stats.total_responses - stats.accepted_count - stats.rejected_count,
        };
      });

      setUsers(usersWithStats);

      // Map VR duration by ID for transcriptions
      const voiceResponseDurationMap: Record<string, number> = {};
      allResponses.forEach((r: any) => {
        if (r.id) voiceResponseDurationMap[r.id] = r.duration_seconds || 0;
      });

      // Batch fetch transcriptions
      const allTranscriptions: { id: string; user_id: string; status: string; voice_response_id: string }[] = [];
      let tOffset = 0;
      let tHasMore = true;

      while (tHasMore) {
        const { data: tBatch, error: tErr } = await supabase
          .from("transcriptions")
          .select("id, user_id, status, voice_response_id")
          .range(tOffset, tOffset + batchSize - 1);

        if (tErr) throw tErr;
        if (tBatch && tBatch.length > 0) {
          allTranscriptions.push(...tBatch);
          tOffset += batchSize;
          tHasMore = tBatch.length === batchSize;
        } else {
          tHasMore = false;
        }
      }

      // Aggregate transcribers
      const tStatsMap: Record<string, any> = {};
      allTranscriptions.forEach((t) => {
        if (!tStatsMap[t.user_id]) {
          tStatsMap[t.user_id] = { total: 0, accepted: 0, rejected: 0, pending: 0, verifiedDuration: 0, totalDuration: 0 };
        }
        const s = tStatsMap[t.user_id];
        const dur = voiceResponseDurationMap[t.voice_response_id] || 0;
        s.total++;
        s.totalDuration += dur;
        if (t.status === "accepted") {
          s.accepted++;
          s.verifiedDuration += dur;
        } else if (t.status === "rejected") {
          s.rejected++;
        } else {
          s.pending++;
        }
      });

      const transcribersWithStats: TranscriberWithStats[] = (profiles || [])
        .filter(p => p.account_type === "transcriber" || p.transcription_guidelines_agreed)
        .map(p => ({
          ...p,
          account_type: (p as any).account_type || 'recording_volunteer',
          ...(tStatsMap[p.id] || { total: 0, accepted: 0, rejected: 0, pending: 0, verifiedDuration: 0, totalDuration: 0 }),
        }));
      setTranscribers(transcribersWithStats);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Error", description: "Failed to load user data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Filter by search and accepted duration
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        user.first_name.toLowerCase().includes(query) ||
        user.last_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phone_number.includes(searchQuery);

      let matchesDuration = true;
      if (durationFilter === "none") {
        matchesDuration = user.accepted_duration_seconds === 0;
      } else if (durationFilter === "under-5min") {
        matchesDuration = user.accepted_duration_seconds > 0 && user.accepted_duration_seconds < 300;
      } else if (durationFilter === "5-30min") {
        matchesDuration = user.accepted_duration_seconds >= 300 && user.accepted_duration_seconds < 1800;
      } else if (durationFilter === "30min-plus") {
        matchesDuration = user.accepted_duration_seconds >= 1800;
      }

      let matchesTotalDuration = true;
      if (totalDurationFilter === "gt_5") {
        matchesTotalDuration = user.total_duration_seconds > 300;
      } else if (totalDurationFilter === "gt_15") {
        matchesTotalDuration = user.total_duration_seconds > 900;
      }

      return matchesSearch && matchesDuration && matchesTotalDuration;
    });
  }, [users, searchQuery, durationFilter, totalDurationFilter]);

  // Sort
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, durationFilter, totalDurationFilter]);

  // Selection
  const toggleUser = (id: string) => {
    const next = new Set(selectedUsers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedUsers(next);
  };

  const toggleAll = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map((u) => u.id)));
    }
  };

  const isAllSelected = paginatedUsers.length > 0 && selectedUsers.size === paginatedUsers.length;

  // Sort handler
  const handleSort = (field: keyof UserWithStats) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // --- Transcriber Logic ---
  const tFilteredUsers = useMemo(() => {
    return transcribers.filter((user) => {
      const query = tSearchQuery.toLowerCase();
      if (!query) return true;
      return (
        user.first_name.toLowerCase().includes(query) ||
        user.last_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phone_number.includes(query)
      );
    });
  }, [transcribers, tSearchQuery]);

  const tSortedUsers = useMemo(() => {
    return [...tFilteredUsers].sort((a, b) => {
      const aVal = a[tSortField];
      const bVal = b[tSortField];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return tSortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return tSortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [tFilteredUsers, tSortField, tSortDirection]);

  const tTotalPages = Math.ceil(tSortedUsers.length / ITEMS_PER_PAGE);
  const tPaginatedUsers = useMemo(() => {
    const start = (tCurrentPage - 1) * ITEMS_PER_PAGE;
    return tSortedUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [tSortedUsers, tCurrentPage]);

  useEffect(() => {
    setTCurrentPage(1);
  }, [tSearchQuery]);

  const tToggleUser = (id: string) => {
    const next = new Set(tSelectedUsers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTSelectedUsers(next);
  };

  const tToggleAll = () => {
    if (tSelectedUsers.size === tPaginatedUsers.length) {
      setTSelectedUsers(new Set());
    } else {
      setTSelectedUsers(new Set(tPaginatedUsers.map((u) => u.id)));
    }
  };

  const tIsAllSelected = tPaginatedUsers.length > 0 && tSelectedUsers.size === tPaginatedUsers.length;

  const tHandleSort = (field: keyof TranscriberWithStats) => {
    if (tSortField === field) {
      setTSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setTSortField(field);
      setTSortDirection("desc");
    }
  };

  const handleTExport = () => {
    const toExport = tSelectedUsers.size > 0
      ? tSortedUsers.filter((u) => tSelectedUsers.has(u.id))
      : tSortedUsers;

    const headers = [
      "First Name", "Last Name", "Email", "Phone", "Type", "Verified", "Joined",
      "Total Transcriptions", "Accepted", "Rejected", "Pending",
      "Transcribed Duration", "Verified Duration",
    ];

    const rows = toExport.map((u) => [
      u.first_name, u.last_name, u.email, u.phone_number,
      "Transcriber",
      u.verified ? "Yes" : "No",
      new Date(u.created_at).toLocaleDateString(),
      u.total.toString(),
      u.accepted.toString(),
      u.rejected.toString(),
      u.pending.toString(),
      formatDuration(u.totalDuration),
      formatDuration(u.verifiedDuration),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(cell => `"${cell?.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `transcribers_export_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const TSortableHeader = ({ field, children, className = "" }: { field: keyof TranscriberWithStats, children: React.ReactNode, className?: string }) => {
    return (
      <TableHead className={`cursor-pointer hover:bg-muted/50 transition-colors ${className}`} onClick={() => tHandleSort(field)}>
        <div className="flex items-center gap-1 select-none whitespace-nowrap">
          {children}
          {tSortField === field ? (
            tSortDirection === "asc" ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />
          ) : (
            <div className="w-3 h-3" />
          )}
        </div>
      </TableHead>
    );
  };

  // Export
  const handleExport = () => {
    const toExport = selectedUsers.size > 0
      ? sortedUsers.filter((u) => selectedUsers.has(u.id))
      : sortedUsers;

    const headers = [
      "First Name", "Last Name", "Email", "Phone", "Account Type", "Verified", "Joined",
      "Total Responses", "Accepted Count", "Accepted Duration",
      "Rejected Count", "Rejected Duration", "Pending Count", "Total Duration",
    ];

    const rows = toExport.map((u) => [
      u.first_name, u.last_name, u.email, u.phone_number,
      (() => {
        const isTranscriber = u.account_type === "transcriber" || u.transcription_guidelines_agreed;
        const isRecorder = u.total_responses > 0 || u.total_duration_seconds > 0;
        if (isTranscriber && !isRecorder) return "Transcriber";
        return "Recorder";
      })(),
      u.verified ? "Yes" : "No",
      new Date(u.created_at).toLocaleDateString(),
      u.total_responses.toString(),
      u.accepted_count.toString(),
      formatDuration(u.accepted_duration_seconds),
      u.rejected_count.toString(),
      formatDuration(u.rejected_duration_seconds),
      u.pending_count.toString(),
      formatDuration(u.total_duration_seconds),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users_export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${toExport.length} users to CSV`,
    });
  };

  const SortableHeader = ({ field, children }: { field: keyof UserWithStats; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors select-none whitespace-nowrap text-xs"
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
          <p className="text-muted-foreground">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 border-b border-border/50 pb-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 hover:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            User Details
          </h2>
          <p className="text-muted-foreground">Comprehensive statistics for
            <span className="text-foreground font-medium ml-1">recorders</span> and
            <span className="text-foreground font-medium ml-1">transcribers</span>.
          </p>
        </div>
      </div>

      <Tabs defaultValue="recorders" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2 mb-6 bg-muted/50">
          <TabsTrigger value="recorders" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Mic className="w-4 h-4" />
            Recorder Details
          </TabsTrigger>
          <TabsTrigger value="transcribers" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Headphones className="w-4 h-4" />
            Transcriber Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recorders" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background/50"
                  aria-label="Search users"
                />
              </div>

              <Select value={durationFilter} onValueChange={setDurationFilter}>
                <SelectTrigger className="w-full sm:w-52 bg-background/50" aria-label="Filter by accepted duration">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Accepted duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Durations</SelectItem>
                  <SelectItem value="none">No Accepted</SelectItem>
                  <SelectItem value="under-5min">Under 5 min</SelectItem>
                  <SelectItem value="5-30min">5 – 30 min</SelectItem>
                  <SelectItem value="30min-plus">30+ min</SelectItem>
                </SelectContent>
              </Select>

              <Select value={totalDurationFilter} onValueChange={(v) => setTotalDurationFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-52 bg-background/50" aria-label="Filter by total duration">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Total recorded duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Total Durations</SelectItem>
                  <SelectItem value="gt_5">More than 5 minutes</SelectItem>
                  <SelectItem value="gt_15">More than 15 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleExport}
              className="gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
            >
              <Download className="w-4 h-4" />
              Export {selectedUsers.size > 0 ? `(${selectedUsers.size} selected)` : `All (${sortedUsers.length})`}
            </Button>
          </div>

          {/* Count */}
          <p className="text-sm text-muted-foreground">
            Showing {paginatedUsers.length} of {sortedUsers.length} users
            {searchQuery && ` matching "${searchQuery}"`}
            {(durationFilter !== "all" || totalDurationFilter !== "all") && ` • filtered by duration`}
          </p>

          {/* Table */}
          <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={toggleAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <SortableHeader field="first_name">Name</SortableHeader>
                      <SortableHeader field="pseudonym">Pseudonym</SortableHeader>
                      <SortableHeader field="email">Email</SortableHeader>
                      <TableHead className="whitespace-nowrap text-xs">Phone</TableHead>
                      <SortableHeader field="account_type">Type</SortableHeader>
                      <SortableHeader field="verified">Status</SortableHeader>
                      <SortableHeader field="total_responses">Questions Answered</SortableHeader>
                      <SortableHeader field="accepted_count">Accepted</SortableHeader>
                      <SortableHeader field="accepted_duration_seconds">Accepted Duration</SortableHeader>
                      <SortableHeader field="rejected_count">Rejected</SortableHeader>
                      <SortableHeader field="rejected_duration_seconds">Rejected Duration</SortableHeader>
                      <SortableHeader field="pending_count">Pending</SortableHeader>
                      <SortableHeader field="total_duration_seconds">Total Duration</SortableHeader>
                      <SortableHeader field="created_at">Joined</SortableHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        className={`transition-colors ${selectedUsers.has(user.id) ? "bg-primary/5" : "hover:bg-muted/30"}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => toggleUser(user.id)}
                            aria-label={`Select ${user.first_name} ${user.last_name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {user.pseudonym}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {user.email}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {user.phone_number}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const isTranscriber = user.account_type === "transcriber" || user.transcription_guidelines_agreed;
                            const isRecorder = user.total_responses > 0 || user.total_duration_seconds > 0;

                            if (isTranscriber && !isRecorder) {
                              return (
                                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-500 border-purple-500/20 whitespace-nowrap">
                                  Transcriber
                                </Badge>
                              );
                            }
                            return (
                              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20 whitespace-nowrap">
                                Recorder
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${user.verified
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              }`}
                          >
                            {user.verified ? "Verified" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{user.total_responses}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-green-600 font-medium">{user.accepted_count}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-green-600 font-mono text-sm">
                          {formatDuration(user.accepted_duration_seconds)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-red-600 font-medium">{user.rejected_count}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-red-600 font-mono text-sm">
                          {formatDuration(user.rejected_duration_seconds)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-amber-600 font-medium">{user.pending_count}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-sm">
                          {formatDuration(user.total_duration_seconds)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={13} className="h-24 text-center text-muted-foreground">
                          No users match your search or filter criteria
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
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="transcribers" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transcribers..."
                value={tSearchQuery}
                onChange={(e) => setTSearchQuery(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>
            <Button
              onClick={handleTExport}
              className="gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              Export {tSelectedUsers.size > 0 ? `(${tSelectedUsers.size} selected)` : `All (${tSortedUsers.length})`}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Showing {tPaginatedUsers.length} of {tSortedUsers.length} transcribers
            {tSearchQuery && ` matching "${tSearchQuery}"`}
          </p>

          <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={tIsAllSelected}
                          onCheckedChange={tToggleAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TSortableHeader field="first_name">Name</TSortableHeader>
                      <TSortableHeader field="pseudonym">Pseudonym</TSortableHeader>
                      <TSortableHeader field="email">Email</TSortableHeader>
                      <TableHead>Type</TableHead>
                      <TSortableHeader field="total">Total Transcriptions</TSortableHeader>
                      <TSortableHeader field="accepted">Accepted</TSortableHeader>
                      <TSortableHeader field="rejected">Rejected</TSortableHeader>
                      <TSortableHeader field="pending">Pending</TSortableHeader>
                      <TSortableHeader field="totalDuration">Transcribed Dur.</TSortableHeader>
                      <TSortableHeader field="verifiedDuration">Verified Dur.</TSortableHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tPaginatedUsers.map((user) => (
                      <TableRow key={user.id} className={`transition-colors ${tSelectedUsers.has(user.id) ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                        <TableCell>
                          <Checkbox
                            checked={tSelectedUsers.has(user.id)}
                            onCheckedChange={() => tToggleUser(user.id)}
                            aria-label={`Select ${user.first_name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {user.pseudonym}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-500 border-purple-500/20 whitespace-nowrap">
                            Transcriber
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{user.total}</TableCell>
                        <TableCell className="text-center text-green-600 font-medium">{user.accepted}</TableCell>
                        <TableCell className="text-center text-red-600 font-medium">{user.rejected}</TableCell>
                        <TableCell className="text-center text-amber-600 font-medium">{user.pending}</TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-sm text-right">{formatDuration(user.totalDuration)}</TableCell>
                        <TableCell className="whitespace-nowrap text-green-600 font-mono text-sm text-right">{formatDuration(user.verifiedDuration)}</TableCell>
                      </TableRow>
                    ))}
                    {tPaginatedUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                          No transcribers match your search criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {tTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTCurrentPage((p) => Math.max(1, p - 1))}
                disabled={tCurrentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {tCurrentPage} of {tTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTCurrentPage((p) => Math.min(tTotalPages, p + 1))}
                disabled={tCurrentPage === tTotalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
