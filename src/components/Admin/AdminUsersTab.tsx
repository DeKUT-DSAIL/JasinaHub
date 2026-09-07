import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle,
  CheckCircle2,
  XCircle,
  Users,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  TableIcon,
  Mic,
  Headphones,
  ShieldCheck,
  Clock,
  MoreHorizontal,
} from "lucide-react";
import { AdminUsersTableView } from "./AdminUsersTableView";

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  verified: boolean;
  created_at: string;
  account_type: string;
  transcription_guidelines_agreed: boolean;
  transcription_approved: boolean;
}

interface AdminUsersTabProps {
  users: UserProfile[];
  onVerifyUser: (userId: string, verified: boolean) => void;
  onApproveTranscriber: (userId: string, approved: boolean) => void;
  userResponseCounts: Record<string, number>;
  userDurations: Record<string, number>;
}

const ITEMS_PER_PAGE = 10;

export function AdminUsersTab({ users, onVerifyUser, onApproveTranscriber, userResponseCounts, userDurations }: AdminUsersTabProps) {
  const [showTableView, setShowTableView] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "verified" | "pending">("all");
  const [filterRole, setFilterRole] = useState<"all" | "recorder" | "transcriber" | "both">("all");
  const [filterDuration, setFilterDuration] = useState<"all" | "gt_5" | "gt_15">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const stats = useMemo(() => {
    return {
      total: users.length,
      unverified: users.filter(u => !u.verified).length,
      pendingTranscribers: users.filter(u => u.transcription_guidelines_agreed && !u.transcription_approved).length
    };
  }, [users]);

  // Filter and search users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const isTranscriber =
        user.account_type === "transcriber" || user.transcription_guidelines_agreed;
      const duration = userDurations?.[user.id] || 0;
      const isRecorder = (userResponseCounts?.[user.id] || 0) > 0 || duration > 0;

      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        user.first_name.toLowerCase().includes(searchLower) ||
        user.last_name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.phone_number.includes(searchQuery);

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "verified" && user.verified) ||
        (filterStatus === "pending" && !user.verified);

      let matchesRole = true;
      if (filterRole === "transcriber") matchesRole = isTranscriber && !isRecorder;
      else if (filterRole === "recorder") matchesRole = isRecorder && !isTranscriber;
      else if (filterRole === "both") matchesRole = isTranscriber && isRecorder;

      const matchesDuration =
        filterDuration === "all" ||
        (filterDuration === "gt_5" && duration > 300) ||
        (filterDuration === "gt_15" && duration > 900);

      return matchesSearch && matchesStatus && matchesRole && matchesDuration;
    });
  }, [users, searchQuery, filterStatus, filterRole, filterDuration, userDurations, userResponseCounts]);

  // Sort: unverified first, then by name
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      if (!a.verified && b.verified) return -1;
      if (a.verified && !b.verified) return 1;
      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    });
  }, [filteredUsers]);

  // Pagination
  const totalPages = Math.ceil(sortedUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedUsers, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterRole, filterDuration]);

  // Selection handlers
  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map((u) => u.id)));
    }
  };

  const isAllSelected = paginatedUsers.length > 0 && selectedUsers.size === paginatedUsers.length;

  // Bulk actions
  const handleBulkVerify = async (verified: boolean) => {
    for (const userId of selectedUsers) {
      await onVerifyUser(userId, verified);
    }
    setSelectedUsers(new Set());
  };

  const handleExportCSV = () => {
    const usersToExport = selectedUsers.size > 0
      ? sortedUsers.filter((u) => selectedUsers.has(u.id))
      : sortedUsers;

    const headers = ["First Name", "Last Name", "Email", "Phone", "Account Type", "Verified", "Joined"];
    const rows = usersToExport.map((user) => [
      user.first_name,
      user.last_name,
      user.email,
      user.phone_number,
      user.account_type === "transcriber" || user.transcription_guidelines_agreed ? "Transcriber" : "Recorder",
      user.verified ? "Yes" : "No",
      new Date(user.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users_export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (showTableView) {
    return <AdminUsersTableView onBack={() => setShowTableView(false)} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tab Specific Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Users", value: stats.total, Icon: Users },
          { label: "Unverified", value: stats.unverified, Icon: ShieldCheck },
          { label: "Pending Transcribers", value: stats.pendingTranscribers, Icon: Headphones },
        ].map(({ label, value, Icon }) => (
          <Card key={label} className="bg-card border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground leading-none tabular-nums">{value}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search, Filter, and Actions Bar */}
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
              aria-label="Search users"
            />
          </div>

          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
            <SelectTrigger className="w-full sm:w-40 h-9" aria-label="Filter by status">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          {/* Role Filter */}
          <Select value={filterRole} onValueChange={(v) => setFilterRole(v as typeof filterRole)}>
            <SelectTrigger className="w-full sm:w-44 h-9" aria-label="Filter by role">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="recorder">Recorder Only</SelectItem>
              <SelectItem value="transcriber">Transcriber Only</SelectItem>
              <SelectItem value="both">Recorder & Transcriber</SelectItem>
            </SelectContent>
          </Select>

          {/* Duration Filter */}
          <Select value={filterDuration} onValueChange={(v) => setFilterDuration(v as typeof filterDuration)}>
            <SelectTrigger className="w-full sm:w-48 h-9" aria-label="Filter by duration">
              <SelectValue placeholder="Recording Duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Durations</SelectItem>
              <SelectItem value="gt_5">More than 5 minutes</SelectItem>
              <SelectItem value="gt_15">More than 15 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {selectedUsers.size > 0 && (
            <>
              <Button size="sm" onClick={() => handleBulkVerify(true)}>
                <CheckCircle className="w-4 h-4 mr-1" />
                Verify ({selectedUsers.size})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkVerify(false)}
                className="text-destructive"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Revoke ({selectedUsers.size})
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-1" />
            Export {selectedUsers.size > 0 ? `(${selectedUsers.size})` : "All"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowTableView(true)}
            className="gap-1.5"
          >
            <TableIcon className="w-4 h-4" />
            Details Table
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {paginatedUsers.length} of {sortedUsers.length} users
        {searchQuery && ` matching "${searchQuery}"`}
      </p>

      {/* Select All Header */}
      {paginatedUsers.length > 0 && (
        <label className="flex items-center gap-2 pb-2 border-b border-border/50 cursor-pointer">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={toggleSelectAll}
            aria-label="Select all users on this page"
          />
          <span className="text-sm text-muted-foreground">
            {isAllSelected ? "Deselect all" : "Select all on this page"}
          </span>
        </label>
      )}

      {/* User List */}
      <div className="divide-y divide-border/50 border border-border/50 rounded-lg bg-card overflow-hidden">
        {paginatedUsers.map((user) => {
          const isTranscriber = user.account_type === "transcriber" || user.transcription_guidelines_agreed;
          const isSelected = selectedUsers.has(user.id);
          const duration = userDurations?.[user.id] || 0;
          const mins = Math.floor(duration / 60);
          const secs = Math.floor(duration % 60);
          const roleSuffix = isTranscriber
            ? user.transcription_approved
              ? " · Approved"
              : user.transcription_guidelines_agreed
                ? " · Pending approval"
                : ""
            : "";
          return (
            <div
              key={user.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 border-l-2 transition-colors ${
                isSelected
                  ? "border-l-primary bg-primary/[0.03]"
                  : !user.verified
                    ? "border-l-amber-500/60"
                    : "border-l-transparent"
              }`}
            >
              <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleUserSelection(user.id)}
                  aria-label={`Select ${user.first_name} ${user.last_name}`}
                />
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarFallback className="bg-muted text-foreground text-xs font-medium">
                    {user.first_name[0]}
                    {user.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground text-sm truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] gap-1 px-1.5 py-0 h-5 ${
                        user.verified
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {user.verified ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {user.verified ? "Verified" : "Pending"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                    {user.phone_number && <> · {user.phone_number}</>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                    {isTranscriber ? (
                      <Headphones className="w-3 h-3" aria-hidden />
                    ) : (
                      <Mic className="w-3 h-3" aria-hidden />
                    )}
                    <span>
                      {isTranscriber ? "Transcriber" : "Recorder"}
                      {roleSuffix}
                    </span>
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">{userResponseCounts[user.id] || 0} answers</span>
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">{mins}m {secs}s</span>
                    <span aria-hidden>·</span>
                    <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-1 items-center w-full sm:w-auto justify-end">
                {user.verified ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onVerifyUser(user.id, false)}
                    className="text-destructive hover:text-destructive"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Revoke
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => onVerifyUser(user.id, true)}>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Verify
                  </Button>
                )}
                {user.transcription_guidelines_agreed && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-9 min-w-9"
                        aria-label={`More actions for ${user.first_name} ${user.last_name}`}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {user.transcription_approved ? (
                        <DropdownMenuItem onClick={() => onApproveTranscriber(user.id, false)}>
                          <XCircle className="w-4 h-4 mr-2" />
                          Revoke transcription
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => onApproveTranscriber(user.id, true)}>
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          Approve transcription
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}

        {paginatedUsers.length === 0 && (
          <div className="p-8 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {searchQuery || filterStatus !== "all" || filterRole !== "all" || filterDuration !== "all"
                ? "No users match your search or filter"
                : "No users found"}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
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
            {(() => {
              const pages: (number | "ellipsis")[] = [];
              const add = (p: number) => {
                if (!pages.includes(p) && p >= 1 && p <= totalPages) pages.push(p);
              };
              const candidates = [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
              const sorted = Array.from(new Set(candidates.filter((p) => p >= 1 && p <= totalPages))).sort((a, b) => a - b);
              const out: (number | "ellipsis")[] = [];
              sorted.forEach((p, i) => {
                if (i > 0 && p - (sorted[i - 1] as number) > 1) out.push("ellipsis");
                out.push(p);
              });
              return out.map((p, i) =>
                p === "ellipsis" ? (
                  <span key={`e-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                ) : (
                  <Button
                    key={p}
                    variant={p === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 p-0 ${p === currentPage ? "bg-primary text-primary-foreground" : ""}`}
                    aria-label={`Page ${p}`}
                    aria-current={p === currentPage ? "page" : undefined}
                  >
                    {p}
                  </Button>
                )
              );
            })()}
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
        </div>
      )}
    </div>
  );
}
