import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Mic,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Lock,
  BookOpen,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  description: string | null;
  question_count?: number;
}

interface AccessRequest {
  category_id: string;
  status: "pending" | "approved" | "rejected";
}

interface CategoryBrowserProps {
  userId: string;
  isVerified: boolean;
  isAdmin?: boolean;
  onStartCategory: (categoryId: string) => void;
}

const statusConfig = {
  approved: {
    label: "Access Granted",
    badgeClass:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    Icon: CheckCircle2,
  },
  pending: {
    label: "Pending Approval",
    badgeClass:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    Icon: Clock,
  },
  rejected: {
    label: "Not Approved",
    badgeClass:
      "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    Icon: AlertCircle,
  },
} as const;

// Soft gradient accents per card index
const cardAccents = [
  "from-violet-500/5 to-purple-500/5 border-violet-500/10",
  "from-sky-500/5 to-blue-500/5 border-sky-500/10",
  "from-rose-500/5 to-pink-500/5 border-rose-500/10",
  "from-amber-500/5 to-orange-500/5 border-amber-500/10",
  "from-emerald-500/5 to-teal-500/5 border-emerald-500/10",
  "from-indigo-500/5 to-cyan-500/5 border-indigo-500/10",
];

export function CategoryBrowser({
  userId,
  isVerified,
  isAdmin,
  onStartCategory,
}: CategoryBrowserProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  const loadData = async () => {
    const [catRes, qCountRes, reqRes] = await Promise.all([
      supabase.from("categories").select("id, name, description").order("name"),
      supabase.from("questions").select("id, category_id"),
      supabase
        .from("category_access_requests" as any)
        .select("category_id, status")
        .eq("user_id", userId),
    ]);

    // Attach question counts
    const qCounts: Record<string, number> = {};
    (qCountRes.data || []).forEach((q) => {
      qCounts[q.category_id] = (qCounts[q.category_id] || 0) + 1;
    });

    setCategories(
      (catRes.data || []).map((c) => ({
        ...c,
        question_count: qCounts[c.id] || 0,
      }))
    );
    setRequests(
      (reqRes.data || []) as AccessRequest[]
    );
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const getRequestForCategory = (categoryId: string) =>
    requests.find((r) => r.category_id === categoryId);

  const handleRequestAccess = async (categoryId: string) => {
    if (!isVerified) {
      toast({
        title: "Account Not Verified",
        description:
          "Your account must be verified by an admin before you can request category access.",
        variant: "destructive",
      });
      return;
    }

    setRequesting(categoryId);
    try {
      const { error } = await supabase
        .from("category_access_requests" as any)
        .insert({ user_id: userId, category_id: categoryId } as any);

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already Requested",
            description: "You have already submitted a request for this category.",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Request Submitted",
          description:
            "Your access request has been sent. The admin will review it shortly.",
        });
        await loadData();
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRequesting(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-muted/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="py-12 text-center bg-muted/30 rounded-2xl border-2 border-dashed border-border">
        <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground font-medium text-sm">
          No categories available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          Available Categories
        </h2>
        <span className="text-xs text-muted-foreground font-medium">
          {categories.length} categor{categories.length === 1 ? "y" : "ies"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {categories.map((category, idx) => {
          const request = getRequestForCategory(category.id);
          const accentClass = cardAccents[idx % cardAccents.length];
          const isApproved = isAdmin || request?.status === "approved";
          const isPending = request?.status === "pending";
          const isRejected = request?.status === "rejected";
          const isLoadingThis = requesting === category.id;

          return (
            <div
              key={category.id}
              className={cn(
                "relative group flex flex-col gap-3 p-5 rounded-2xl border bg-gradient-to-br transition-all duration-300",
                accentClass,
                isApproved
                  ? "shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  : "hover:shadow-sm"
              )}
            >
              {/* Status badge */}
              {request && (
                <div className="absolute top-4 right-4">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] uppercase font-bold gap-1 px-2 py-0.5",
                      statusConfig[request.status].badgeClass
                    )}
                  >
                    {(() => {
                      const { Icon } = statusConfig[request.status];
                      return <Icon className="w-3 h-3" />;
                    })()}
                    {statusConfig[request.status].label}
                  </Badge>
                </div>
              )}

              {/* Category info */}
              <div className="flex-1 pr-6">
                <h3 className="font-bold text-foreground text-base leading-snug mb-1">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {category.description}
                  </p>
                )}
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5" />
                  {category.question_count} question
                  {category.question_count !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Action */}
              <div className="pt-1">
                {isApproved ? (
                  <Button
                    size="sm"
                    className="w-full rounded-xl gap-1.5 shadow-sm"
                    onClick={() => onStartCategory(category.id)}
                  >
                    Start Recording
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                ) : isPending ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full rounded-xl gap-1.5 cursor-not-allowed opacity-70"
                    disabled
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Awaiting Admin Approval
                  </Button>
                ) : isRejected ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full rounded-xl gap-1.5 text-muted-foreground cursor-not-allowed opacity-60"
                    disabled
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Access Not Approved
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full rounded-xl gap-1.5 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-colors"
                    onClick={() => handleRequestAccess(category.id)}
                    disabled={isLoadingThis || !isVerified}
                  >
                    {isLoadingThis ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                    {isVerified ? "Request Access" : "Verify Account First"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
