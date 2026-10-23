import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  FolderOpen,
  Users,
  AlertCircle,
  Mic,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AccessRequest {
  id: string;
  user_id: string;
  category_id: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at: string | null;
  admin_note: string | null;
  // joined
  user_name: string;
  user_email: string;
  category_name: string;
}

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    badgeClass:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    Icon: Clock,
  },
  approved: {
    label: "Approved",
    badgeClass:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    Icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    badgeClass:
      "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    Icon: XCircle,
  },
} as const;

const ITEMS_PER_PAGE = 15;

export function AdminCategoryAccessTab() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("category_access_requests" as any)
        .select(
          "id, user_id, category_id, status, requested_at, reviewed_at, admin_note"
        )
        .order("requested_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Enrich with user + category names
      const userIds = [...new Set(data.map((r) => r.user_id))];
      const categoryIds = [...new Set(data.map((r) => r.category_id))];

      const [profilesRes, categoriesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", userIds),
        supabase
          .from("categories")
          .select("id, name")
          .in("id", categoryIds),
      ]);

      const profileMap: Record<
        string,
        { name: string; email: string }
      > = {};
      (profilesRes.data || []).forEach((p) => {
        profileMap[p.id] = {
          name: `${p.first_name} ${p.last_name}`.trim(),
          email: p.email,
        };
      });

      const categoryMap: Record<string, string> = {};
      (categoriesRes.data || []).forEach((c) => {
        categoryMap[c.id] = c.name;
      });

      setRequests(
        data.map((r) => ({
          ...r,
          user_name: profileMap[r.user_id]?.name || "Unknown User",
          user_email: profileMap[r.user_id]?.email || "",
          category_name: categoryMap[r.category_id] || "Unknown Category",
          status: r.status as "pending" | "approved" | "rejected",
          reviewed_at: (r as any).reviewed_at ?? null,
          admin_note: (r as any).admin_note ?? null,
        }))
      );
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to load access requests.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const updateStatus = async (
    requestId: string,
    status: "approved" | "rejected"
  ) => {
    setProcessing(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("category_access_requests" as any)
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        } as any)
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: status === "approved" ? "Access Granted" : "Access Rejected",
        description:
          status === "approved"
            ? "The user can now record responses for this category."
            : "The user's access request has been rejected.",
      });

      // Optimistic update
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status, reviewed_at: new Date().toISOString() }
            : r
        )
      );
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to update request status.",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  // Unique categories for filter dropdown
  const uniqueCategories = useMemo(() => {
    const seen = new Map<string, string>();
    requests.forEach((r) => seen.set(r.category_id, r.category_name));
    return Array.from(seen.entries());
  }, [requests]);

  // Filter + search
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return requests.filter((r) => {
      const matchesSearch =
        !q ||
        r.user_name.toLowerCase().includes(q) ||
        r.user_email.toLowerCase().includes(q) ||
        r.category_name.toLowerCase().includes(q);
      const matchesStatus =
        filterStatus === "all" || r.status === filterStatus;
      const matchesCategory =
        filterCategory === "all" || r.category_id === filterCategory;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [requests, searchQuery, filterStatus, filterCategory]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterCategory]);

  // Summary stats
  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  }), [requests]);

  return (
    <div className="space-y-6">
      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Requests", value: stats.total, Icon: FolderOpen, color: "text-foreground" },
          {
            label: "Pending",
            value: stats.pending,
            Icon: Clock,
            color: "text-amber-600 dark:text-amber-400",
          },
          {
            label: "Approved",
            value: stats.approved,
            Icon: CheckCircle2,
            color: "text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "Rejected",
            value: stats.rejected,
            Icon: XCircle,
            color: "text-red-500",
          },
        ].map(({ label, value, Icon, color }) => (
          <Card key={label} className="bg-card border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Icon className={cn("w-4 h-4", color)} />
              </div>
              <div>
                <p className={cn("text-xl font-bold leading-none tabular-nums", color)}>
                  {value}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mt-0.5">
                  {label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/80 backdrop-blur flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Status filter */}
          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}
          >
            <SelectTrigger className="w-full sm:w-40 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          {/* Category filter */}
          <Select
            value={filterCategory}
            onValueChange={setFilterCategory}
          >
            <SelectTrigger className="w-full sm:w-48 h-9">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadRequests}
          disabled={loading}
          className="gap-1.5 shrink-0"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Results info */}
      <p className="text-sm text-muted-foreground -mt-2">
        Showing {paginated.length} of {filtered.length} request
        {filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Request list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="py-16 text-center bg-muted/30 rounded-2xl border-2 border-dashed border-border">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">
            {searchQuery || filterStatus !== "all" || filterCategory !== "all"
              ? "No requests match your filters."
              : "No category access requests yet."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/50 border border-border/50 rounded-xl bg-card overflow-hidden">
          {paginated.map((req) => {
            const cfg = STATUS_CONFIG[req.status];
            const isProcessing = processing === req.id;
            const initials = req.user_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={req.id}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-l-2 transition-colors",
                  req.status === "pending"
                    ? "border-l-amber-500/60 bg-amber-500/[0.02]"
                    : req.status === "approved"
                    ? "border-l-emerald-500/40"
                    : "border-l-red-500/30"
                )}
              >
                {/* User + category info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-muted text-foreground text-xs font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {req.user_name}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold gap-1 px-1.5 py-0 h-5",
                          cfg.badgeClass
                        )}
                      >
                        <cfg.Icon className="w-3 h-3" />
                        {cfg.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {req.user_email}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                      <Mic className="w-3 h-3 shrink-0" />
                      <span className="font-medium text-foreground/80">
                        {req.category_name}
                      </span>
                      <span>·</span>
                      <span>
                        Requested{" "}
                        {new Date(req.requested_at).toLocaleDateString(
                          undefined,
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 items-center shrink-0 justify-end">
                  {req.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => updateStatus(req.id, "approved")}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Grant Access
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-destructive hover:text-destructive"
                        onClick={() => updateStatus(req.id, "rejected")}
                        disabled={isProcessing}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </Button>
                    </>
                  )}

                  {req.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => updateStatus(req.id, "rejected")}
                      disabled={isProcessing}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Revoke
                    </Button>
                  )}

                  {req.status === "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => updateStatus(req.id, "approved")}
                      disabled={isProcessing}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Grant Access
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
          <span className="text-sm text-muted-foreground tabular-nums">
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
    </div>
  );
}
