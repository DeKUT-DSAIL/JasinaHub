import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, ChevronLeft, LogOut, ArrowLeft, Users, FileText, BarChart3, BookOpen, TableIcon, HardDriveDownload, Loader2, CheckCircle2, XCircle, Download, Upload, MoreHorizontal, PieChart, Headphones, Mic, Database, FlaskConical, MessageSquare } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { AdminStatsCards } from "@/components/Admin/AdminStatsCards";
import { AdminQuestionsTab } from "@/components/Admin/AdminQuestionsTab";
import { AdminUsersTab } from "@/components/Admin/AdminUsersTab";
import { AdminResponsesTab } from "@/components/Admin/AdminResponsesTab";

import { AdminOverviewTab } from "@/components/Admin/AdminOverviewTab";
import { AdminTranscriptionsTab } from "@/components/Admin/AdminTranscriptionsTab";
import { AdminDatasetTab } from "@/components/Admin/AdminDatasetTab";
import { AdminDocumentationTab } from "@/components/Admin/AdminDocumentationTab";
import { AdminTestsTab } from "@/components/Admin/AdminTestsTab";
import { AdminFeedbackTab } from "@/components/Admin/AdminFeedbackTab";

interface Question {
  id: string;
  question_text: string;
  image_url: string | null;
  image_attribution: string | null;
  order_index: number;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

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

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userResponses, setUserResponses] = useState<UserResponse[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState({ current: 0, total: 0, migrated: 0, failed: 0, status: "", done: false });
  const [migrationLog, setMigrationLog] = useState<string[]>([]);
  const migrationLogRef = useRef<HTMLDivElement>(null);
  const migrationAbortRef = useRef<AbortController | null>(null);
  const [migrationStartTime, setMigrationStartTime] = useState<number | null>(null);
  const [responseCounts, setResponseCounts] = useState({ total: 0, accepted: 0, rejected: 0, acceptedDuration: 0, rejectedDuration: 0, totalDuration: 0 });
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [userResponseCounts, setUserResponseCounts] = useState<Record<string, number>>({});
  const [userDurations, setUserDurations] = useState<Record<string, number>>({});
  const [questionResponseCounts, setQuestionResponseCounts] = useState<Record<string, number>>({});
  const [totalTranscribed, setTotalTranscribed] = useState(0);
  const [verifiedTranscriptions, setVerifiedTranscriptions] = useState(0);
  const [pendingTranscriptions, setPendingTranscriptions] = useState(0);
  const [acceptedMigratedCount, setAcceptedMigratedCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);
  const [totalResponsesForPagination, setTotalResponsesForPagination] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Auto-collapse on smaller laptop screens to give content more room
    return window.innerWidth < 1280;
  });

  const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
    overview: { title: 'Overview', subtitle: 'High-level health of the platform at a glance.' },
    questions: { title: 'Questions', subtitle: 'Curate prompts shown to volunteers.' },
    users: { title: 'Users', subtitle: 'Verify volunteers and approve transcribers.' },
    responses: { title: 'Responses', subtitle: 'Review, accept or reject voice submissions.' },
    transcriptions: { title: 'Transcriptions', subtitle: 'Verify transcribed audio for dataset readiness.' },
    dataset: { title: 'Dataset', subtitle: 'Inspect and export the curated ASR dataset.' },
    feedback: { title: 'Feedback', subtitle: 'Read what users are telling you about JasinaHub.' },
    documentation: { title: 'Documentation', subtitle: 'Project documentation and resources.' },
    tests: { title: 'Tests', subtitle: 'Run platform health and integration tests.' },
  };


  const SidebarItem = ({ icon: Icon, label, value, badgeCount }: { icon: any, label: string, value: string, badgeCount?: number }) => {
    const isActive = activeTab === value;

    return (
      <button
        onClick={() => handleTabChange(value)}
        title={isSidebarCollapsed ? label : undefined}
        className={cn(
          "flex items-center gap-3 px-4 py-3 w-full rounded-2xl transition-all duration-300 group relative",
          isSidebarCollapsed ? "justify-center px-0" : "px-4",
          isActive
            ? "bg-gradient-to-r from-primary/10 to-transparent text-primary"
            : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
        )}
      >

        <div className="relative">
          <div className={cn(
            "transition-all duration-300 flex items-center justify-center",
            "group-hover:scale-110 group-active:scale-95 group-hover:text-primary"
          )}>
            <Icon className={cn(
              "w-5 h-5 shrink-0",
              isActive ? "text-primary shadow-sm" : "text-muted-foreground group-hover:text-primary"
            )} />
          </div>
          {isSidebarCollapsed && badgeCount && badgeCount > 0 && (
            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-card animate-bounce-subtle">
              {badgeCount > 9 ? '9+' : badgeCount}
            </div>
          )}
        </div>

        {!isSidebarCollapsed && (
          <div className="flex-1 flex items-center justify-between min-w-0">
            <span className={cn(
              "font-medium text-sm whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300",
              isActive ? "text-primary font-bold" : ""
            )}>
              {label}
            </span>
            {badgeCount && badgeCount > 0 && (
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full animate-in zoom-in duration-300",
                value === 'active' ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"
              )}>
                {badgeCount}
              </span>
            )}
          </div>
        )}
      </button>
    );
  };

  useEffect(() => {
    // Restore last active tab from localStorage if available
    try {
      const stored = window.localStorage.getItem('adminActiveTab');
      if (stored) {
        setActiveTab(stored);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [currentPage]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    try {
      window.localStorage.setItem('adminActiveTab', value);
    } catch {
      // Ignore storage errors
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const loadData = async () => {
    try {
      // Fetch counts directly from database to bypass 1000 row limit
      const [
        categoriesRes,
        questionsRes,
        responsesRes,
        responsesTotalCountRes,
        usersRes,
        totalCountRes,
        acceptedCountRes,
        rejectedCountRes,
        transcriptionStatsRes,
      ] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('questions').select('*').order('order_index'),
        // Fetch responses with pagination
        supabase.from('voice_responses')
          .select('*')
          .order('created_at', { ascending: false })
          .range((currentPage - 1) * pageSize, currentPage * pageSize - 1),
        // Get total count for pagination
        supabase.from('voice_responses').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('id, first_name, last_name, email, phone_number, verified, created_at, account_type, transcription_guidelines_agreed, transcription_approved').order('created_at', { ascending: false }),
        // Get accurate counts from database
        supabase.from('voice_responses').select('*', { count: 'exact', head: true }),
        supabase.from('voice_responses').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
        supabase.from('voice_responses').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        // Unified, deduplicated transcription stats (counts unique recordings)
        supabase.rpc('get_transcription_stats' as any),
      ]);

      // Calculate total duration and per-user stats with pagination
      let acceptedDuration = 0;
      let rejectedDuration = 0;
      let totalDuration = 0;
      const userCounts: Record<string, number> = {};
      const userDurs: Record<string, number> = {};

      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch } = await supabase
          .from('voice_responses')
          .select('user_id, duration_seconds, status')
          .range(offset, offset + batchSize - 1);

        if (batch && batch.length > 0) {
          batch.forEach(r => {
            const duration = r.duration_seconds || 0;
            const userId = r.user_id;

            totalDuration += duration;
            if (r.status === 'accepted') {
              acceptedDuration += duration;
            } else if (r.status === 'rejected') {
              rejectedDuration += duration;
            }

            userCounts[userId] = (userCounts[userId] || 0) + 1;
            userDurs[userId] = (userDurs[userId] || 0) + duration;
          });
          offset += batchSize;
          hasMore = batch.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      setUserResponseCounts(userCounts);
      setUserDurations(userDurs);

      // Fetch per-question unique user counts via RPC (bypasses RLS to get accurate counts)
      const { data: countsData } = await supabase.rpc('get_question_counts' as any);
      const qCounts: Record<string, number> = {};
      if (Array.isArray(countsData)) {
        countsData.forEach((item: { question_id: string; unique_user_count: number }) => {
          qCounts[item.question_id] = Number(item.unique_user_count);
        });
      }
      setQuestionResponseCounts(qCounts);

      const tStats = (transcriptionStatsRes?.data ?? {}) as {
        unique_transcribed?: number;
        verified_unique?: number;
        pending_unique?: number;
        accepted_migrated?: number;
      };
      setTotalTranscribed(Number(tStats.unique_transcribed) || 0);
      setVerifiedTranscriptions(Number(tStats.verified_unique) || 0);
      setPendingTranscriptions(Number(tStats.pending_unique) || 0);
      setAcceptedMigratedCount(Number(tStats.accepted_migrated) || 0);

      setResponseCounts({
        total: totalCountRes.count || 0,
        accepted: acceptedCountRes.count || 0,
        rejected: rejectedCountRes.count || 0,
        acceptedDuration,
        rejectedDuration,
        totalDuration
      });

      // Fetch sparkline data from chart RPC
      try {
        const { data: chartData } = await supabase.rpc('get_admin_chart_data');
        if (chartData && typeof chartData === 'object' && 'sparklines' in (chartData as any)) {
          setSparklines((chartData as any).sparklines || {});
        }
      } catch (e) {
        console.warn('Failed to load sparklines', e);
      }

      // Set total count for pagination
      setTotalResponsesForPagination(responsesTotalCountRes.count || 0);

      const profileIds = [...new Set(responsesRes.data?.map(r => r.user_id) || [])];
      const questionIds = [...new Set(responsesRes.data?.map(r => r.question_id) || [])];

      const [profilesRes, questionsDetailsRes] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name, email').in('id', profileIds),
        supabase.from('questions').select('id, question_text').in('id', questionIds),
      ]);

      const enrichedResponses = responsesRes.data?.map(response => ({
        ...response,
        profiles: profilesRes.data?.find(p => p.id === response.user_id) || { first_name: '', last_name: '', email: '' },
        questions: questionsDetailsRes.data?.find(q => q.id === response.question_id) || { question_text: '' }
      })) || [];

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (questionsRes.data) setQuestions(questionsRes.data);
      if (usersRes.data) setAllUsers(usersRes.data as any);
      setUserResponses(enrichedResponses);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateResponseStatus = async (responseId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('voice_responses')
        .update({ status })
        .eq('id', responseId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Response marked as ${status}`,
      });

      loadData();
    } catch (error) {
      console.error('Error updating response status:', error);
      toast({
        title: "Error",
        description: "Failed to update response status",
        variant: "destructive"
      });
    }
  };

  const verifyUser = async (userId: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ verified })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: verified ? "User Verified" : "User Unverified",
        description: verified
          ? "User can now access the recording features"
          : "User access to recording features revoked",
      });

      loadData();
    } catch (error) {
      console.error('Error verifying user:', error);
      toast({
        title: "Error",
        description: "Failed to update user verification",
        variant: "destructive"
      });
    }
  };

  const approveTranscriber = async (userId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ transcription_approved: approved } as any)
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: approved ? "Transcriber Approved" : "Transcriber Access Revoked",
        description: approved
          ? "User can now start transcribing"
          : "User's transcription access has been revoked",
      });

      loadData();
    } catch (error) {
      console.error('Error approving transcriber:', error);
      toast({
        title: "Error",
        description: "Failed to update transcriber approval",
        variant: "destructive"
      });
    }
  };

  // Dynamic import for JSZip - only load when needed
  const downloadAllRecordings = async () => {
    try {
      toast({
        title: "Processing",
        description: "Creating download links package..."
      });

      // Dynamic import - JSZip is only loaded when this function is called
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      let downloadContent = "Google Drive Recording Download Links\n\n";
      downloadContent += "========================================\n\n";

      userResponses.forEach((response, index) => {
        if (response.audio_file_url) {
          const patterns = [/\/d\/([a-zA-Z0-9-_]+)/, /id=([a-zA-Z0-9-_]+)/, /\/file\/d\/([a-zA-Z0-9-_]+)/];
          let fileId: string | null = null;
          for (const pattern of patterns) {
            const match = response.audio_file_url.match(pattern);
            if (match) { fileId = match[1]; break; }
          }

          const directUrl = fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : response.audio_file_url;
          const viewUrl = fileId ? `https://drive.google.com/file/d/${fileId}/view` : response.audio_file_url;

          downloadContent += `${index + 1}. User: ${response.profiles.first_name} ${response.profiles.last_name}\n`;
          downloadContent += `   Question: ${response.questions.question_text}\n`;
          downloadContent += `   Date: ${new Date(response.created_at).toLocaleString()}\n`;
          downloadContent += `   Download Link: ${directUrl}\n`;
          downloadContent += `   View in Drive: ${viewUrl}\n`;
          downloadContent += "----------------------------------------\n\n";
        }
      });

      zip.file("DOWNLOAD_LINKS.txt", downloadContent);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-links-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Ready",
        description: "Download links package created successfully.",
      });
    } catch (error) {
      console.error("Error creating download package:", error);
      toast({
        title: "Error",
        description: "Failed to create download package",
        variant: "destructive"
      });
    }
  };

  // Use database counts for accurate stats (bypasses 1000 row limit)
  const totalResponses = responseCounts.total;
  const acceptedResponses = responseCounts.accepted;
  const rejectedResponses = responseCounts.rejected;
  const totalUsers = allUsers.length;
  const unverifiedUsers = allUsers.filter(u => !u.verified).length;
  const pendingTranscribers = allUsers.filter(u => u.transcription_guidelines_agreed && !u.transcription_approved).length;
  const acceptedDurationSeconds = responseCounts.acceptedDuration;
  const rejectedDurationSeconds = responseCounts.rejectedDuration;
  const totalDurationSeconds = responseCounts.totalDuration;
  const pendingResponses = Math.max(totalResponses - acceptedResponses - rejectedResponses, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto"></div>
          <div>
            <p className="text-lg font-medium text-foreground">Loading Admin Panel</p>
            <p className="text-muted-foreground">Getting everything ready...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* --- ADMIN SIDEBAR --- */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-card/70 backdrop-blur-xl border-r border-border/20 sticky top-0 h-screen z-20 transition-all duration-300 ease-in-out",
        isSidebarCollapsed ? "w-[72px] p-3" : "w-60 p-4"
      )}>
        <div className={cn(
          "flex items-center mb-6 px-2 relative min-h-[40px]",
          isSidebarCollapsed ? "justify-center" : "gap-3"
        )}>
          {!isSidebarCollapsed && (
            <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="font-nunito font-extrabold text-[14px] leading-tight text-foreground tracking-tight">
                Command Center
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                JasinaHub Admin
              </span>
            </div>
          )}

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={cn(
              "absolute -right-3 top-1/2 -translate-y-1/2 w-7 h-7 bg-card border border-border/50 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all shadow-md z-30 group",
              isSidebarCollapsed && "right-[-14px]"
            )}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ?
              <ChevronRight className="w-4 h-4 group-hover:scale-110 transition-transform" /> :
              <ChevronLeft className="w-4 h-4 group-hover:scale-110 transition-transform" />
            }
          </button>
        </div>

        {/* Quick back-to-dashboard for accessibility */}
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className={cn(
            "flex items-center gap-3 w-full rounded-xl text-muted-foreground hover:bg-muted/50 transition-all duration-300 mb-4 h-9",
            isSidebarCollapsed ? "justify-center px-0" : "px-4"
          )}
          title={isSidebarCollapsed ? "Back to Dashboard" : undefined}
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          {!isSidebarCollapsed && <span className="text-sm font-medium">Back to Dashboard</span>}
        </Button>

        <nav className="flex-1 space-y-1">
          <SidebarItem icon={PieChart} label="Overview" value="overview" />
          <SidebarItem icon={FileText} label="Questions" value="questions" />
          <SidebarItem icon={Users} label="Users" value="users" badgeCount={unverifiedUsers} />
          <SidebarItem icon={BarChart3} label="Responses" value="responses" badgeCount={pendingResponses} />
          <SidebarItem icon={Headphones} label="Transcriptions" value="transcriptions" badgeCount={totalTranscribed} />
          <SidebarItem icon={Database} label="Dataset" value="dataset" />
          <SidebarItem icon={MessageSquare} label="Feedback" value="feedback" />

          <div className="pt-4 mt-4 border-t border-border/50">
            <SidebarItem icon={BookOpen} label="Documentation" value="documentation" />
            <SidebarItem icon={FlaskConical} label="Tests" value="tests" />
          </div>
        </nav>

        <div className="mt-auto pt-6 space-y-4">
          <button
            onClick={handleLogout}
            title={isSidebarCollapsed ? "Sign Out" : undefined}
            aria-label="Sign Out"
            className={cn(
              "flex items-center gap-3 px-4 py-3 w-full rounded-2xl text-destructive hover:bg-destructive/10 transition-all duration-300",
              isSidebarCollapsed ? "justify-center px-0" : "px-4"
            )}
          >
            <LogOut className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" />
            {!isSidebarCollapsed && <span className="font-medium text-sm animate-in fade-in slide-in-from-left-2 duration-300">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 min-w-0 relative overflow-x-hidden p-4 sm:p-6 lg:p-8 xl:p-10">
        <div className="mx-auto w-full max-w-[1600px] space-y-6 sm:space-y-8">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-border/40">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">
                Admin Panel
              </p>
              <h1 className="text-2xl sm:text-3xl font-nunito font-extrabold text-foreground tracking-tight">
                {TAB_TITLES[activeTab]?.title ?? 'Overview'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                {TAB_TITLES[activeTab]?.subtitle ?? ''}
              </p>
            </div>

            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                    <MoreHorizontal className="w-4 h-4" />
                    <span>Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={async () => {
                      setMigrating(true);
                      setMigrationDialogOpen(true);
                      setMigrationStartTime(Date.now());
                      setMigrationProgress({ current: 0, total: 0, migrated: 0, failed: 0, status: "Starting...", done: false });
                      setMigrationLog(["Starting migration..."]);
                      const abortController = new AbortController();
                      migrationAbortRef.current = abortController;

                      try {
                        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
                        const url = `https://${projectId}.supabase.co/functions/v1/migrate-drive-audio`;
                        const { data: { session } } = await supabase.auth.getSession();

                        const response = await fetch(url, {
                          method: "POST",
                          headers: {
                            "Authorization": `Bearer ${session?.access_token}`,
                            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                          },
                          signal: abortController.signal,
                        });

                        if (!response.ok) throw new Error(`HTTP ${response.status}`);

                        const reader = response.body?.getReader();
                        const decoder = new TextDecoder();

                        if (!reader) throw new Error("No response stream");

                        let buffer = "";
                        while (true) {
                          const { done, value } = await reader.read();
                          if (done) break;

                          buffer += decoder.decode(value, { stream: true });
                          const lines = buffer.split("\n\n");
                          buffer = lines.pop() || "";

                          for (const line of lines) {
                            const match = line.match(/^data: (.+)$/);
                            if (!match) continue;
                            try {
                              const data = JSON.parse(match[1]);

                              if (data.event === "start") {
                                setMigrationProgress(p => ({ ...p, total: data.total }));
                                setMigrationLog(l => [...l, `Found ${data.total} recordings to migrate`]);
                              } else if (data.event === "progress") {
                                const statusLabel = data.status === "downloading" ? "⬇ Downloading" : data.status === "uploading" ? "⬆ Uploading" : data.status === "done" ? "✓ Done" : data.status === "failed" ? "✗ Failed" : data.status === "skipped" ? "⏭ Skipped" : data.status;
                                setMigrationProgress({
                                  current: data.current,
                                  total: data.total,
                                  migrated: data.migrated,
                                  failed: data.failed,
                                  status: statusLabel,
                                  done: false,
                                });
                                setMigrationLog(l => [...l, `[${data.current}/${data.total}] ${statusLabel} — ${data.id?.slice(0, 8)}...`]);
                              } else if (data.event === "complete") {
                                setMigrationProgress(p => ({ ...p, done: true, status: "Complete" }));
                                setMigrationLog(l => [...l, `\n✅ Migration complete: ${data.migrated} migrated, ${data.failed} failed`]);
                                if (data.errors) {
                                  setMigrationLog(l => [...l, ...data.errors.map((e: string) => `  ⚠ ${e}`)]);
                                }
                                loadData();
                              }

                              setTimeout(() => {
                                migrationLogRef.current?.scrollTo({ top: migrationLogRef.current.scrollHeight, behavior: "smooth" });
                              }, 50);
                            } catch { /* ignore parse errors */ }
                          }
                        }
                      } catch (err: any) {
                        if (err.name === 'AbortError') {
                          setMigrationLog(l => [...l, `\n⛔ Migration cancelled by user`]);
                          setMigrationProgress(p => ({ ...p, done: true, status: "Cancelled" }));
                        } else {
                          setMigrationLog(l => [...l, `❌ Error: ${err.message}`]);
                          setMigrationProgress(p => ({ ...p, done: true, status: "Error" }));
                          toast({ title: "Migration Error", description: err.message, variant: "destructive" });
                        }
                      } finally {
                        setMigrating(false);
                        migrationAbortRef.current = null;
                      }
                    }}
                    disabled={migrating}
                    className="gap-2"
                  >
                    {migrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDriveDownload className="w-4 h-4" />}
                    {migrating ? "Migrating..." : "Migrate Audio"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/docs')} className="gap-2">
                    <BookOpen className="w-4 h-4" />
                    Documentation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <Tabs value={activeTab} className="w-full">
            <TabsContent value="overview">
              <AdminOverviewTab
                onActionClick={(tab) => handleTabChange(tab)}
                stats={{
                  questionsCount: questions.length,
                  totalUsers: totalUsers,
                  totalResponses: totalResponses,
                  acceptedResponses: acceptedResponses,
                  rejectedResponses: rejectedResponses,
                  acceptedDurationSeconds: acceptedDurationSeconds,
                  rejectedDurationSeconds: rejectedDurationSeconds,
                  totalDurationSeconds: totalDurationSeconds,
                  totalTranscribed: totalTranscribed,
                  verifiedTranscriptions: verifiedTranscriptions,
                  pendingTranscriptions: pendingTranscriptions,
                  acceptedMigratedCount: acceptedMigratedCount
                }}
              />
            </TabsContent>

            <TabsContent value="questions">
              <AdminQuestionsTab
                questions={questions}
                categories={categories}
                onDataChange={loadData}
                questionResponseCounts={questionResponseCounts}
              />
            </TabsContent>

            <TabsContent value="users">
              <AdminUsersTab
                users={allUsers}
                onVerifyUser={verifyUser}
                onApproveTranscriber={approveTranscriber}
                userResponseCounts={userResponseCounts}
                userDurations={userDurations}
              />
            </TabsContent>

            <TabsContent value="responses">
              <AdminResponsesTab
                responses={userResponses}
                responseCounts={responseCounts}
                userResponseCounts={userResponseCounts}
                onUpdateStatus={updateResponseStatus}
                onDownloadAll={downloadAllRecordings}
                currentPage={currentPage}
                pageSize={pageSize}
                totalCount={totalResponsesForPagination}
                onPageChange={setCurrentPage}
              />
            </TabsContent>


            <TabsContent value="transcriptions">
              <AdminTranscriptionsTab />
            </TabsContent>

            <TabsContent value="dataset">
              <AdminDatasetTab />
            </TabsContent>

            <TabsContent value="feedback">
              <AdminFeedbackTab />
            </TabsContent>

            <TabsContent value="documentation">
              <AdminDocumentationTab />
            </TabsContent>

            <TabsContent value="tests">
              <AdminTestsTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* --- MOBILE NAVIGATION --- */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-lg border-t border-border p-2 flex justify-around items-center z-50">
        <button onClick={() => handleTabChange('overview')} className={cn("p-2 flex flex-col items-center gap-1", activeTab === 'overview' ? "text-primary" : "text-muted-foreground")}>
          <PieChart className="w-5 h-5" />
          <span className="text-[10px] font-bold">Overview</span>
        </button>
        <button onClick={() => handleTabChange('users')} className={cn("p-2 flex flex-col items-center gap-1", activeTab === 'users' ? "text-primary" : "text-muted-foreground")}>
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-bold">Users</span>
        </button>
        <button onClick={() => handleTabChange('responses')} className={cn("p-2 flex flex-col items-center gap-1", activeTab === 'responses' ? "text-primary" : "text-muted-foreground")}>
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-bold">Data</span>
        </button>
        <button onClick={() => handleTabChange('transcriptions')} className={cn("p-2 flex flex-col items-center gap-1", activeTab === 'transcriptions' ? "text-primary" : "text-muted-foreground")}>
          <Headphones className="w-5 h-5" />
          <span className="text-[10px] font-bold">Transcribe</span>
        </button>
        <button onClick={() => navigate('/dashboard')} className="p-2 text-muted-foreground flex flex-col items-center gap-1">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[10px] font-bold">Exit</span>
        </button>
      </nav>

      {/* Migration Progress Dialog */}
      <Dialog open={migrationDialogOpen} onOpenChange={setMigrationDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {migrationProgress.done ? (
                migrationProgress.failed > 0 && migrationProgress.migrated === 0 ? (
                  <XCircle className="w-5 h-5 text-destructive" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                )
              ) : (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              )}
              Audio Migration
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {migrationProgress.total > 0
                    ? `${migrationProgress.current} / ${migrationProgress.total} files`
                    : "Preparing..."}
                </span>
                <span className="font-medium text-foreground">{migrationProgress.status}</span>
              </div>
              <Progress
                value={migrationProgress.total > 0 ? (migrationProgress.current / migrationProgress.total) * 100 : 0}
                className="h-2"
              />
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                This may take several minutes depending on the number and size of recordings. You can close this dialog and continue using the admin panel while migration runs in the background.
              </p>
            </div>

            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-foreground font-medium">{migrationProgress.migrated}</span>
                <span className="text-muted-foreground">migrated</span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-destructive" />
                <span className="text-foreground font-medium">{migrationProgress.failed}</span>
                <span className="text-muted-foreground">failed</span>
              </div>
            </div>

            <div
              ref={migrationLogRef}
              className="bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs text-muted-foreground space-y-0.5 border border-border/50"
            >
              {migrationLog.map((line, i) => (
                <div key={i} className={line.startsWith("✅") ? "text-emerald-600 font-medium" : line.startsWith("❌") || line.startsWith("  ⚠") ? "text-destructive" : ""}>
                  {line}
                </div>
              ))}
            </div>

            {migrationProgress.done ? (
              <Button onClick={() => setMigrationDialogOpen(false)} className="w-full">
                Close
              </Button>
            ) : (
              <Button variant="destructive" onClick={() => migrationAbortRef.current?.abort()} className="w-full">
                Cancel Migration
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {migrating && !migrationDialogOpen && (
        <div className="fixed bottom-4 right-4 z-40">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMigrationDialogOpen(true)}
            className="shadow-lg bg-background/95 backdrop-blur flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs sm:text-sm">Audio migration in progress</span>
          </Button>
        </div>
      )}
    </div>
  );
}
