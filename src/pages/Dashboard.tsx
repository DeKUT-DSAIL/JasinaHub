// Dashboard page – main user hub
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, User, Shield, FileText, TrendingUp, Award, AlertCircle, LayoutDashboard, History, Settings, Activity, Mic, Mic2, Languages, ArrowRight, Clock, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Sun, Moon, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { ProfileDialog } from "@/components/Dashboard/ProfileDialog";
import { QuestionsPreviewCard } from "@/components/Dashboard/QuestionsPreviewCard";
import { TranscribePreviewCard } from "@/components/Dashboard/TranscribePreviewCard";
import { MobileProgressSnippet } from "@/components/Dashboard/MobileProgressSnippet";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

// Animation delay utilities (keyframes now in tailwind.config.ts)
const animationStyles = `
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  .animation-delay-4000 {
    animation-delay: 4s;
  }
`;

interface Question {
  id: string;
  question_text: string;
  order_index: number;
}

interface RecentActivity {
  id: string;
  type: 'recording' | 'transcription';
  text: string;
  status: string;
  created_at: string;
}

// Skeleton Component
const DashboardSkeleton = () => (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-4 sm:space-y-8">
    <div className="h-24 sm:h-32 w-full bg-muted/50 rounded-3xl animate-pulse" />
    <div className="h-16 w-full bg-muted/50 rounded-2xl animate-pulse lg:hidden" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <div className="h-48 sm:h-64 bg-muted/50 rounded-3xl animate-pulse" />
      <div className="lg:col-span-2 h-48 sm:h-64 bg-muted/50 rounded-3xl animate-pulse hidden lg:block" />
    </div>
  </div>
);

export default function Dashboard() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [completedQuestions, setCompletedQuestions] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [transcribedDuration, setTranscribedDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [isActivityCollapsed, setIsActivityCollapsed] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [accountType, setAccountType] = useState<string>("recording_volunteer");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [completedQuestionIds, setCompletedQuestionIds] = useState<Set<string>>(new Set());
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useUserRole();
  const { theme, setTheme } = useTheme();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const isRecorder = accountType === "recording_volunteer";
  const isTranscriber = accountType === "transcriber";

  useEffect(() => {
    const loadDashboardData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, verified, account_type')
        .eq('id', authUser.id)
        .single();

      setUser({
        name: profile ? `${profile.first_name} ${profile.last_name}` : authUser.email?.split('@')[0] || 'User',
        email: authUser.email || ''
      });
      setIsVerified(profile?.verified || false);
      setAccountType((profile as any)?.account_type || 'recording_volunteer');

      // Fetch all questions for this category
      const { data: questionsData } = await supabase
        .from('questions')
        .select('id, question_text, order_index')
        .eq('category_id', '00000000-0000-0000-0000-000000000001')
        .order('order_index', { ascending: true });

      // Get unique user counts per question using the security definer function
      const { data: questionCounts } = await supabase.rpc('get_question_counts');

      // Create a map of question_id -> unique_user_count
      const uniqueUserCounts = new Map<string, number>();
      (questionCounts || []).forEach((item: { question_id: string; unique_user_count: number }) => {
        uniqueUserCounts.set(item.question_id, Number(item.unique_user_count));
      });

      // Fetch user's own responses
      const { data: responses } = await supabase
        .from('voice_responses')
        .select('question_id, duration_seconds')
        .eq('user_id', authUser.id);

      const userCompletedIds = new Set(responses?.map(r => r.question_id) || []);

      // Filter questions: show only those with < 3 unique users AND not answered by current user
      const availableQuestions = (questionsData || []).filter(q => {
        const uniqueCount = uniqueUserCounts.get(q.id) || 0;
        const isRetired = uniqueCount >= 3;
        const userAnswered = userCompletedIds.has(q.id);
        return !isRetired || userAnswered;
      });

      // Questions available for answering (not retired AND not answered by user)
      const questionsToAnswer = (questionsData || []).filter(q => {
        const uniqueCount = uniqueUserCounts.get(q.id) || 0;
        return uniqueCount < 3 && !userCompletedIds.has(q.id);
      });

      // Count completed = user's answers that are for questions that were available
      const completedCount = Array.from(userCompletedIds).filter(qId => {
        const question = questionsData?.find(q => q.id === qId);
        return question !== undefined;
      }).length;

      // Total available = questions to answer + already completed by user
      const totalAvailable = questionsToAnswer.length + completedCount;

      setQuestions(questionsToAnswer);
      setTotalQuestions(totalAvailable);
      setCompletedQuestionIds(userCompletedIds);
      setCompletedQuestions(completedCount);

      const total = (responses || []).reduce((sum, response) => {
        const cappedDuration = Math.min(response.duration_seconds || 0, 30);
        return sum + cappedDuration;
      }, 0);
      setTotalDuration(total);

      // Fetch Transcribed Duration (for transcribers)
      const { data: transcriptionData } = await supabase
        .from('transcriptions')
        .select(`
          id,
          voice_responses (
            duration_seconds
          )
        `)
        .eq('user_id', authUser.id);

      const transcribedTotal = (transcriptionData || []).reduce((sum, t) => {
        return sum + ((t.voice_responses as any)?.duration_seconds || 0);
      }, 0);
      setTranscribedDuration(transcribedTotal);

      // Fetch Recent Activity
      const { data: recentRecordings } = await supabase
        .from('voice_responses')
        .select('id, status, created_at, questions(question_text)')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(3);

      const { data: recentTranscriptions } = await supabase
        .from('transcriptions')
        .select('id, status, created_at, transcription_text')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(3);

      const combined: RecentActivity[] = [
        ...(recentRecordings || []).map(r => ({
          id: r.id,
          type: 'recording' as const,
          text: (r.questions as any)?.question_text || 'Recording',
          status: r.status,
          created_at: r.created_at
        })),
        ...(recentTranscriptions || []).map(t => ({
          id: t.id,
          type: 'transcription' as const,
          text: t.transcription_text,
          status: t.status,
          created_at: t.created_at
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3);

      setRecentActivity(combined);
      setLoading(false);
    };

    loadDashboardData();
  }, [navigate]);

  const handleStartCategory = () => {
    navigate(`/questions?category=00000000-0000-0000-0000-000000000001`);
  };

  const handleStartTranscribing = () => {
    navigate('/transcribe');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const overallProgress = totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0;

  const glassCardClasses = "bg-card/80 backdrop-blur-md border border-border/50 shadow-sm rounded-3xl";

  // Show recording-related UI only for recorders or admins
  const showRecordingUI = isRecorder || isAdmin;
  const showTranscribeUI = isTranscriber || isAdmin;

  const SidebarItem = ({ icon: Icon, label, path, onClick, badgeCount }: { icon: any, label: string, path?: string, onClick?: () => void, badgeCount?: number }) => {
    const isActive = path ? location.pathname === path : false;

    return (
      <button
        onClick={() => {
          if (onClick) onClick();
          else if (path) navigate(path);
        }}
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
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full animate-in zoom-in duration-300">
                {badgeCount}
              </span>
            )}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-[100dvh] flex bg-background">
      <style>{animationStyles}</style>

      {/* --- DESKTOP SIDEBAR --- */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-card/70 backdrop-blur-xl border-r border-border/20 sticky top-0 h-screen z-20 transition-all duration-300 ease-in-out",
        isSidebarCollapsed ? "w-20 p-4" : "w-64 p-6"
      )}>
        <div className={cn(
          "flex items-center mb-10 px-2 relative min-h-[40px]",
          isSidebarCollapsed ? "justify-center" : "gap-3"
        )}>
          {!isSidebarCollapsed && (
            <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="font-nunito font-extrabold text-[15px] leading-tight text-foreground tracking-tight">
                Data Collection Platform
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
          >
            {isSidebarCollapsed ?
              <ChevronRight className="w-4 h-4 group-hover:scale-110 transition-transform" /> :
              <ChevronLeft className="w-4 h-4 group-hover:scale-110 transition-transform" />
            }
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" path="/dashboard" />
          <SidebarItem icon={History} label="My Responses" path="/my-responses" badgeCount={recentActivity.filter(i => i.type === 'recording').length} />
          <SidebarItem icon={FileText} label="Transcriptions" path="/my-transcriptions" badgeCount={recentActivity.filter(i => i.type === 'transcription').length} />
          <SidebarItem icon={MessageSquare} label="Feedback" path="/feedback" />
          {isAdmin && <SidebarItem icon={Shield} label="Admin Portal" path="/admin" />}
        </nav>

        <div className="mt-auto space-y-4">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={isSidebarCollapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
            className={cn(
              "flex items-center gap-3 px-4 py-3 w-full rounded-2xl text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-all duration-300",
              isSidebarCollapsed ? "justify-center px-0" : "px-4"
            )}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
            {!isSidebarCollapsed && <span className="font-medium text-sm animate-in fade-in slide-in-from-left-2 duration-300">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          <div className={cn(
            "flex items-center gap-3 p-3 rounded-2xl bg-muted/50 border border-border/50 hover:bg-muted transition-all cursor-pointer group",
            isSidebarCollapsed ? "justify-center px-0" : "px-3"
          )}
            onClick={() => setProfileDialogOpen(true)}
            title={isSidebarCollapsed ? "Profile" : undefined}
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 shadow-sm border border-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
              {user?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="font-bold text-sm text-foreground truncate">{user?.name || 'Collector'}</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  {isAdmin ? 'Admin' : accountType?.replace('_', ' ') || 'User'}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            title={isSidebarCollapsed ? "Sign Out" : undefined}
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
      <main className="flex-1 min-w-0 relative overflow-x-hidden p-4 sm:p-6 lg:p-10 bg-background">
        <div className="relative z-10 max-w-5xl mx-auto space-y-6 sm:space-y-8">
          {(loading || !user) ? (
            <DashboardSkeleton />
          ) : (
            <>
              {!isVerified && !isAdmin && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200 text-center sm:text-left">Account Pending Verification</p>
                </div>
              )}

              {/* Split Hero */}
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 bg-card p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-border/50 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                  <div className="relative z-10">
                    <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                      <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                        {getGreeting()}, {user.name.split(' ')[0]}
                      </span>
                      {" "}
                      <span className="inline-block animate-pulse-gentle">👋</span>
                    </h1>
                    <p className="text-muted-foreground max-w-md leading-relaxed">
                      Your contributions are helping improve healthcare for everyone. Ready for today's mission?
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                      <Button onClick={handleStartCategory} className="rounded-2xl px-6 h-12 shadow-lg shadow-primary/20 gap-2">
                        <Mic className="w-4 h-4" /> Start Recording
                      </Button>
                      <Button onClick={handleStartTranscribing} variant="outline" className="rounded-2xl px-6 h-12 gap-2 bg-card/50 backdrop-blur-sm">
                        <Languages className="w-4 h-4" /> Transcribe
                      </Button>
                    </div>
                  </div>
                  <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />
                </div>

                <div className="lg:w-80 space-y-4">
                  <div className="bg-primary/10 backdrop-blur-md p-6 rounded-[2.5rem] border border-primary/10 h-full flex flex-col justify-between group">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-nunito font-extrabold text-primary uppercase tracking-[0.2em]">Snapshot</span>
                      <TrendingUp className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="space-y-6">
                      {showRecordingUI && (
                        <div>
                          <p className="text-sm text-primary/70 font-medium">Recording</p>
                          <p className="text-3xl font-black text-primary">{Math.floor(totalDuration / 60)}m / 60m</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Progress value={Math.min((totalDuration / 3600) * 100, 100)} className="h-1.5 rounded-full bg-primary/10" />
                            <span className="text-[10px] font-bold text-primary">{Math.round(overallProgress)}%</span>
                          </div>
                        </div>
                      )}
                      {showTranscribeUI && (
                        <div>
                          <p className="text-sm text-primary/70 font-medium">Transcribed</p>
                          <p className="text-3xl font-black text-primary">
                            {Math.floor(transcribedDuration / 60)}m {transcribedDuration % 60}s
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Strip Removed by user request */}

              {/* Action Grid & Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Activity Feed */}
                <div className="lg:col-span-12 space-y-6">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setIsActivityCollapsed(!isActivityCollapsed)}
                      className="flex items-center gap-2 group"
                    >
                      <h2 className="text-xl font-bold text-foreground flex items-center gap-2 group-hover:text-primary transition-colors">
                        Recent Activity
                      </h2>
                      {isActivityCollapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    {!isActivityCollapsed && (
                      <Button variant="ghost" size="sm" onClick={() => navigate('/my-responses')} className="text-primary hover:text-primary/80">
                        View All <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>

                  {!isActivityCollapsed && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="bg-card p-4 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all group">
                          <div className="flex items-start justify-between mb-3">
                            <div className={cn(
                              "p-2 rounded-xl",
                              activity.type === 'recording' ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" : "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400"
                            )}>
                              {activity.type === 'recording' ? <Mic2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            </div>
                            <Badge variant="outline" className={cn(
                              "text-[10px] uppercase font-bold",
                              activity.status === 'accepted' ? "border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30" :
                                activity.status === 'rejected' ? "border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30" :
                                  "border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
                            )}>
                              {activity.status}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                            {activity.text}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(activity.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                      {recentActivity.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-muted/50 rounded-[2rem] border-2 border-dashed border-border">
                          <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                          <p className="text-muted-foreground font-medium">No activity yet. Start your first mission!</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="relative z-10 pb-24 lg:pb-8 pt-4 text-center">
        <a
          href="/privacy-policy"
          className="text-xs text-muted-foreground hover:text-primary underline underline-offset-4"
        >
          Privacy Policy &amp; Data Protection
        </a>
      </footer>

      {/* --- MOBILE NAVIGATION --- */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-lg border-t border-border p-2 flex justify-around items-center z-50">
        <button onClick={() => navigate('/dashboard')} className="p-3 text-primary flex flex-col items-center gap-1">
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button onClick={() => navigate('/my-responses')} className="p-3 text-muted-foreground flex flex-col items-center gap-1">
          <History className="w-6 h-6" />
          <span className="text-[10px] font-medium">History</span>
        </button>
        <button onClick={() => navigate('/feedback')} className="p-3 text-muted-foreground flex flex-col items-center gap-1">
          <MessageSquare className="w-6 h-6" />
          <span className="text-[10px] font-medium">Feedback</span>
        </button>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-3 text-muted-foreground flex flex-col items-center gap-1">
          {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          <span className="text-[10px] font-medium">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        <button onClick={() => setProfileDialogOpen(true)} className="p-3 text-muted-foreground flex flex-col items-center gap-1">
          <User className="w-6 h-6" />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
        {isAdmin && (
          <button onClick={() => navigate('/admin')} className="p-3 text-muted-foreground flex flex-col items-center gap-1">
            <Shield className="w-6 h-6" />
            <span className="text-[10px] font-medium">Admin</span>
          </button>
        )}
      </nav>

      <ProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
    </div>
  );
}
