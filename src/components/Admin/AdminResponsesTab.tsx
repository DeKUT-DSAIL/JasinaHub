import { useState, useEffect, useCallback, useRef } from "react";
import { AdminDriveBackfill } from "./AdminDriveBackfill";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  ExternalLink,
  Download,
  Play,
  Search,
  Clock,
  BarChart3,
  Loader2,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UserResponse {
  id: string;
  user_id: string;
  question_id: string;
  response_type: string;
  text_response: string | null;
  audio_file_url: string | null;
  created_at: string;
  status: 'pending' | 'accepted' | 'rejected';
  duration_seconds?: number;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
  questions: {
    question_text: string;
  };
}

interface AdminResponsesTabProps {
  responses: UserResponse[];
  responseCounts: {
    total: number;
    accepted: number;
    rejected: number;
    acceptedDuration: number;
    rejectedDuration: number;
    totalDuration: number;
  };
  userResponseCounts: Record<string, number>;
  onUpdateStatus: (responseId: string, status: 'accepted' | 'rejected') => void;
  onDownloadAll: () => void;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

// Google Drive URL utilities
const getDirectDownloadUrl = (url: string): string => {
  const patterns = [
    /\/d\/([a-zA-Z0-9-_]+)/,
    /id=([a-zA-Z0-9-_]+)/,
    /\/file\/d\/([a-zA-Z0-9-_]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
  }
  return url;
};

const getGoogleDriveViewUrl = (url: string): string => {
  const patterns = [
    /\/d\/([a-zA-Z0-9-_]+)/,
    /id=([a-zA-Z0-9-_]+)/,
    /\/file\/d\/([a-zA-Z0-9-_]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://drive.google.com/file/d/${match[1]}/view`;
    }
  }
  return url;
};

export function AdminResponsesTab({
  responses,
  responseCounts,
  userResponseCounts,
  onUpdateStatus,
  onDownloadAll,
  currentPage,
  pageSize,
  totalCount,
  onPageChange
}: AdminResponsesTabProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchResults, setSearchResults] = useState<UserResponse[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [userAllResponses, setUserAllResponses] = useState<Record<string, UserResponse[]>>({});
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());

  const [statusOverrides, setStatusOverrides] = useState<Record<string, 'accepted' | 'rejected'>>({});
  const [confirmAction, setConfirmAction] = useState<{ responseId: string; status: 'accepted' | 'rejected' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  const getEffectiveStatus = (response: UserResponse): string => {
    return statusOverrides[response.id] || response.status;
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { responseId, status } = confirmAction;
    setStatusOverrides(prev => ({ ...prev, [responseId]: status }));
    setUserAllResponses(prev => {
      const updated = { ...prev };
      for (const userId in updated) {
        updated[userId] = updated[userId].map(r =>
          r.id === responseId ? { ...r, status } : r
        );
      }
      return updated;
    });
    setConfirmAction(null);
    onUpdateStatus(responseId, status);
    if (selectedIds.has(responseId)) {
      const next = new Set(selectedIds);
      next.delete(responseId);
      setSelectedIds(next);
    }
  };

  const handleBulkAction = async (status: 'accepted' | 'rejected') => {
    if (selectedIds.size === 0) return;
    setIsBulkActionLoading(true);
    const idsToUpdate = Array.from(selectedIds);
    try {
      const newOverrides = { ...statusOverrides };
      idsToUpdate.forEach(id => { newOverrides[id] = status; });
      setStatusOverrides(newOverrides);
      setUserAllResponses(prev => {
        const updated = { ...prev };
        for (const userId in updated) {
          updated[userId] = updated[userId].map(r =>
            selectedIds.has(r.id) ? { ...r, status } : r
          );
        }
        return updated;
      });
      await Promise.all(idsToUpdate.map(id => onUpdateStatus(id, status)));
      toast({
        title: "Bulk Action Complete",
        description: `Successfully ${status === 'accepted' ? 'accepted' : 'rejected'} ${idsToUpdate.length} responses.`,
      });
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Bulk action error:", error);
      toast({ title: "Error", description: "Some updates may have failed. Please refresh.", variant: "destructive" });
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredResponses.length && filteredResponses.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResponses.map(r => r.id)));
    }
  };

  const toggleSelectId = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    setSelectedIds(next);
  };

  // Server-side search when search term changes
  const performSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      // Search profiles matching the term
      const searchLower = term.toLowerCase();
      const { data: matchingProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`);

      if (!matchingProfiles || matchingProfiles.length === 0) {
        // Also try searching by question text
        const { data: matchingQuestions } = await supabase
          .from('questions')
          .select('id')
          .ilike('question_text', `%${term}%`);

        if (matchingQuestions && matchingQuestions.length > 0) {
          const questionIds = matchingQuestions.map(q => q.id);
          const { data: questionResponses } = await supabase
            .from('voice_responses')
            .select('*')
            .in('question_id', questionIds)
            .order('created_at', { ascending: false })
            .limit(500);

          if (questionResponses && questionResponses.length > 0) {
            const profileIds = [...new Set(questionResponses.map(r => r.user_id))];
            const qIds = [...new Set(questionResponses.map(r => r.question_id))];

            const [profilesRes, questionsRes] = await Promise.all([
              supabase.from('profiles').select('id, first_name, last_name, email').in('id', profileIds),
              supabase.from('questions').select('id, question_text').in('id', qIds),
            ]);

            const enriched: UserResponse[] = questionResponses.map(r => ({
              ...r,
              profiles: profilesRes.data?.find(p => p.id === r.user_id) || { first_name: '', last_name: '', email: '' },
              questions: questionsRes.data?.find(q => q.id === r.question_id) || { question_text: '' },
            }));

            setSearchResults(enriched);
          } else {
            setSearchResults([]);
          }
        } else {
          setSearchResults([]);
        }
      } else {
        // Fetch all responses for matching users
        const userIds = matchingProfiles.map(p => p.id);
        const allResults: any[] = [];
        
        // Fetch in batches to handle many users
        for (let i = 0; i < userIds.length; i += 10) {
          const batch = userIds.slice(i, i + 10);
          const { data: batchResponses } = await supabase
            .from('voice_responses')
            .select('*')
            .in('user_id', batch)
            .order('created_at', { ascending: false });
          
          if (batchResponses) allResults.push(...batchResponses);
        }

        if (allResults.length > 0) {
          const questionIds = [...new Set(allResults.map(r => r.question_id))];
          const { data: questions } = await supabase
            .from('questions')
            .select('id, question_text')
            .in('id', questionIds);

          const profileMap = new Map(matchingProfiles.map(p => [p.id, p]));
          const questionMap = new Map(questions?.map(q => [q.id, q]) || []);

          const enriched: UserResponse[] = allResults.map(r => ({
            ...r,
            profiles: profileMap.get(r.user_id) || { first_name: '', last_name: '', email: '' },
            questions: questionMap.get(r.question_id) || { question_text: '' },
          }));

          setSearchResults(enriched);
        } else {
          setSearchResults([]);
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchTerm.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchTerm);
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, performSearch]);

  // Use search results when available, otherwise use paginated responses
  const baseResponses = searchResults !== null ? searchResults : responses;

  const filteredResponses = baseResponses.filter(response => {
    const effectiveStatus = getEffectiveStatus(response);
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "migration_pending"
        ? (effectiveStatus === 'accepted' && (!response.audio_file_url || !response.audio_file_url.includes('supabase.co/storage')))
        : effectiveStatus === statusFilter);

    return matchesStatus;
  });

  const groupedResponses = filteredResponses.reduce((acc, response) => {
    const userId = response.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        user: response.profiles,
        responses: [],
        totalDuration: 0
      };
    }
    acc[userId].responses.push(response);
    const cappedDuration = Math.min(response.duration_seconds || 0, 30);
    acc[userId].totalDuration += cappedDuration;
    return acc;
  }, {} as Record<string, { user: { first_name: string; last_name: string; email: string }, responses: UserResponse[], totalDuration: number }>);

  const sortedUsers = Object.entries(groupedResponses).sort(([, a], [, b]) =>
    `${a.user.first_name} ${a.user.last_name}`.localeCompare(`${b.user.first_name} ${b.user.last_name}`)
  );

  const toggleUserExpanded = async (userId: string) => {
    const newExpanded = new Set(expandedUsers);

    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
      setExpandedUsers(newExpanded);
      return;
    }

    newExpanded.add(userId);
    setExpandedUsers(newExpanded);

    // Fetch ALL responses for this user if not already loaded
    if (!userAllResponses[userId]) {
      setLoadingUsers(prev => new Set(prev).add(userId));

      try {
        // Fetch all responses for this user with pagination to bypass 1000 limit
        const allUserResponses: any[] = [];
        let offset = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: batch, error } = await supabase
            .from("voice_responses")
            .select("id, user_id, question_id, response_type, text_response, audio_file_url, created_at, status, duration_seconds")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .range(offset, offset + batchSize - 1);

          if (error) throw error;

          if (batch && batch.length > 0) {
            allUserResponses.push(...batch);
            offset += batchSize;
            hasMore = batch.length === batchSize;
          } else {
            hasMore = false;
          }
        }

        // Fetch question texts
        const questionIds = [...new Set(allUserResponses.map(r => r.question_id))];
        const { data: questions } = await supabase
          .from("questions")
          .select("id, question_text")
          .in("id", questionIds);

        const questionMap = new Map(questions?.map(q => [q.id, q.question_text]) || []);

        // Get user profile from existing data
        const userProfile = groupedResponses[userId]?.user || { first_name: "", last_name: "", email: "" };

        // Enrich responses with profile and question data
        const enrichedResponses: UserResponse[] = allUserResponses.map(r => ({
          ...r,
          profiles: userProfile,
          questions: { question_text: questionMap.get(r.question_id) || "Unknown Question" }
        }));

        setUserAllResponses(prev => ({ ...prev, [userId]: enrichedResponses }));
      } catch (error) {
        console.error("Error fetching user responses:", error);
        toast({
          title: "Error",
          description: "Failed to load all responses for this user",
          variant: "destructive",
        });
      } finally {
        setLoadingUsers(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    }
  };

  const playAudioInDrive = (audioUrl: string) => {
    const viewUrl = getGoogleDriveViewUrl(audioUrl);
    window.open(viewUrl, '_blank', 'noopener,noreferrer,width=800,height=600');

    toast({
      title: "Opening Audio Player",
      description: "Audio player opened in new window",
    });
  };

  const downloadAudio = async (audioUrl: string, responseId: string) => {
    try {
      const downloadUrl = getDirectDownloadUrl(audioUrl);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `recording-${responseId}.mp3`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      toast({
        title: "Download Started",
        description: "Check your browser's downloads folder.",
      });
    } catch (error) {
      console.error("Error downloading audio:", error);
      toast({
        title: "Download Failed",
        description: "Could not download audio.",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.round(totalSeconds % 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Drive Backfill Tool */}
      <AdminDriveBackfill />
      {/* Tab Specific Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-indigo-500/5 border-indigo-500/10">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">{formatDuration(responseCounts.totalDuration)}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Total Time</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/10">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-bold text-foreground leading-none">{responseCounts.accepted}</p>
                <span className="text-lg font-bold text-emerald-600 leading-none">({formatDuration(responseCounts.acceptedDuration)})</span>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Accepted</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/5 border-red-500/10">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
              <XCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-bold text-foreground leading-none">{responseCounts.rejected}</p>
                <span className="text-lg font-bold text-red-600 leading-none">({formatDuration(responseCounts.rejectedDuration)})</span>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
        <div className="text-center lg:text-left flex items-center gap-4">
          {selectedIds.size > 0 && (
            <Badge variant="secondary" className="animate-in zoom-in duration-300 bg-primary/10 text-primary border-primary/20">
              {selectedIds.size} selected
            </Badge>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1 sm:flex-none sm:w-48 lg:w-64">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            )}
            <Input
              placeholder="Search by name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/50 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32 lg:w-40 bg-background/50 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="migration_pending">Migration Pending</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={onDownloadAll}
            variant="outline"
            className="w-full sm:w-auto gap-2 text-sm"
            disabled={responses.length === 0}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Links</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Search results indicator */}
      {searchTerm && searchResults !== null && !isSearching && (
        <p className="text-sm text-muted-foreground">
          Found {filteredResponses.length} responses from {sortedUsers.length} user{sortedUsers.length !== 1 ? 's' : ''} matching "{searchTerm}"
        </p>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-3 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-gray-500 hover:text-gray-900 gap-2"
            >
              <X className="w-4 h-4" />
              <span>Deselect all</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleBulkAction('accepted')}
              disabled={isBulkActionLoading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 shadow-sm rounded-xl"
            >
              {isBulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve {selectedIds.size}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBulkAction('rejected')}
              disabled={isBulkActionLoading}
              className="gap-2 shadow-sm rounded-xl"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3 sm:space-y-4">
        {sortedUsers.map(([userId, { user, responses, totalDuration }]) => (
          <Card key={userId} className="bg-card border-border/50 shadow-sm overflow-hidden">
            <div
              className="p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => toggleUserExpanded(userId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {expandedUsers.has(userId) ? (
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white text-xs sm:text-sm">
                      {user.first_name[0]}{user.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm sm:text-base truncate">{user.first_name} {user.last_name}</p>
                    <p className="text-muted-foreground text-xs sm:text-sm truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {userResponseCounts[userId] || responses.length} response{(userResponseCounts[userId] || responses.length) !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="text-xs hidden sm:flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, '0')}
                  </Badge>
                </div>
              </div>
            </div>

            {expandedUsers.has(userId) && (
              <div className="border-t border-border/50 bg-muted/30">
                {loadingUsers.has(userId) ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                    <span className="text-muted-foreground">Loading all responses...</span>
                  </div>
                ) : (
                  <>
                    {/* Use fetched responses if available, otherwise fall back to paginated responses */}
                    {(userAllResponses[userId] || responses).map((response) => (
                      <div key={response.id} className="p-3 sm:p-4 border-b border-border/50 last:border-b-0 flex gap-4">
                        <div className="pt-1 select-none">
                          <Checkbox
                            checked={selectedIds.has(response.id)}
                            onCheckedChange={() => toggleSelectId(response.id)}
                            className="w-5 h-5 rounded-md border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground line-clamp-2">{response.questions.question_text}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {(() => {
                                const effectiveStatus = getEffectiveStatus(response);
                                return (
                                  <Badge
                                    variant={
                                      effectiveStatus === 'accepted' ? 'default' :
                                        effectiveStatus === 'rejected' ? 'destructive' : 'secondary'
                                    }
                                    className={`text-xs ${effectiveStatus === 'accepted' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                      effectiveStatus === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                      }`}
                                  >
                                    {effectiveStatus}
                                  </Badge>
                                );
                              })()}
                              {response.duration_seconds && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {Math.min(response.duration_seconds, 30)}s
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(response.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {response.audio_file_url && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => playAudioInDrive(response.audio_file_url!)}
                                  className="text-xs gap-1 h-8"
                                >
                                  <Play className="w-3 h-3" />
                                  <span className="hidden sm:inline">Play</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadAudio(response.audio_file_url!, response.id)}
                                  className="text-xs gap-1 h-8"
                                >
                                  <Download className="w-3 h-3" />
                                  <span className="hidden sm:inline">Download</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(getGoogleDriveViewUrl(response.audio_file_url!), '_blank')}
                                  className="text-xs gap-1 h-8"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </>
                            )}

                            {getEffectiveStatus(response) === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => setConfirmAction({ responseId: response.id, status: 'accepted' })}
                                  className="text-xs gap-1 h-8 bg-green-500 hover:bg-green-600"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  <span className="hidden sm:inline">Accept</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setConfirmAction({ responseId: response.id, status: 'rejected' })}
                                  className="text-xs gap-1 h-8"
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span className="hidden sm:inline">Reject</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {userAllResponses[userId] && (
                      <div className="px-4 py-2 bg-muted text-xs text-muted-foreground text-center">
                        Showing all {userAllResponses[userId].length} responses
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>
        ))}

        {sortedUsers.length === 0 && (
          <Card className="bg-card border-border/50 shadow-sm">
            <CardContent className="p-6 sm:p-8 text-center">
              <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-sm sm:text-base">
                {searchTerm || statusFilter !== "all"
                  ? "No responses match your filters"
                  : "No responses yet"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Enhanced Pagination Controls - hidden during search */}
      {totalCount > 0 && searchResults === null && (
        <div className="mt-6">
          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-4">
            {/* Mobile-first responsive pagination */}
            <div className="flex flex-col gap-4">
              {/* Page info - always visible */}
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
                  <span className="text-xs font-medium text-muted-foreground">
                    {Math.min((currentPage - 1) * pageSize + 1, totalCount)}–{Math.min(currentPage * pageSize, totalCount)}
                  </span>
                  <span className="text-xs text-muted-foreground/60">of</span>
                  <span className="text-xs font-semibold text-foreground">{totalCount}</span>
                </div>
              </div>

              {/* Navigation controls */}
              <div className="flex items-center justify-center gap-2">
                {/* First page button - hidden on small screens */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(1)}
                  disabled={currentPage === 1}
                  className="hidden sm:flex h-9 w-9 p-0 border-border hover:bg-accent"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </Button>

                {/* Previous button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-9 px-3 gap-1.5 border-border hover:bg-accent"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline text-sm">Previous</span>
                </Button>

                {/* Page number buttons */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const totalPages = Math.ceil(totalCount / pageSize);
                    const pages: (number | 'ellipsis')[] = [];

                    if (totalPages <= 5) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (currentPage > 3) pages.push('ellipsis');

                      const start = Math.max(2, currentPage - 1);
                      const end = Math.min(totalPages - 1, currentPage + 1);

                      for (let i = start; i <= end; i++) pages.push(i);

                      if (currentPage < totalPages - 2) pages.push('ellipsis');
                      pages.push(totalPages);
                    }

                    return pages.map((page, idx) =>
                      page === 'ellipsis' ? (
                        <span key={`ellipsis-${idx}`} className="w-9 h-9 flex items-center justify-center text-muted-foreground">
                          ···
                        </span>
                      ) : (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => onPageChange(page)}
                          className={`h-9 w-9 p-0 text-sm font-medium transition-all ${currentPage === page
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "border-border hover:bg-accent hover:border-accent-foreground/20"
                            }`}
                        >
                          {page}
                        </Button>
                      )
                    );
                  })()}
                </div>

                {/* Next button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  className="h-9 px-3 gap-1.5 border-border hover:bg-accent"
                >
                  <span className="hidden sm:inline text-sm">Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>

                {/* Last page button - hidden on small screens */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.ceil(totalCount / pageSize))}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  className="hidden sm:flex h-9 w-9 p-0 border-border hover:bg-accent"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 ${confirmAction?.status === 'accepted' ? 'bg-green-100' : 'bg-red-100'
              }`}>
              {confirmAction?.status === 'accepted'
                ? <CheckCircle className="w-6 h-6 text-green-600" />
                : <XCircle className="w-6 h-6 text-red-600" />
              }
            </div>
            <AlertDialogTitle className="text-center">
              {confirmAction?.status === 'accepted' ? 'Accept' : 'Reject'} this recording?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Are you sure you want to {confirmAction?.status === 'accepted' ? 'accept' : 'reject'} this recording? This action can be changed later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={`w-full sm:w-auto ${confirmAction?.status === 'accepted'
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
            >
              {confirmAction?.status === 'accepted' ? 'Accept' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
