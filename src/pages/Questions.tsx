import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MinimalRecorder } from "@/components/VoiceRecording/MinimalRecorder";
import {
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  Shield,
  Mic2,
  UserCheck,
  LayoutDashboard,
  Mic,
  Loader2,
  LogOut,
  RefreshCw,
  FileCheck2,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Confetti } from "@/components/ui/confetti";
import { RecoveryDialog } from "@/components/ui/RecoveryDialog";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/ui/PullToRefreshIndicator";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";
import { SkipConfirmationDialog, shouldShowSkipConfirmation } from "@/components/ui/SkipConfirmationDialog";
import { SkipToContent } from "@/components/ui/SkipToContent";
import { QuestionProgressDots } from "@/components/Questions/QuestionProgressDots";
import {
  saveRecordingLocally,
  clearLocalRecording,
  getAllPendingRecordings,
  clearOldRecordings,
  getLocalRecording
} from "@/utils/recordingStorage";

interface Question {
  id: string;
  question_text: string;
  image_url: string | null;
  image_attribution?: string | null;
  category_id: string;
  order_index: number;
}

export default function Questions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawCategoryParam = searchParams.get('category');
  const [categoryInfo, setCategoryInfo] = useState<{ id: string; name: string } | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, Blob>>({});
  const [isRecordingDisabled, setIsRecordingDisabled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<{ first_name: string; last_name: string; verified: boolean; voice_recording_consent: boolean } | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);

  // Phase 3 improvements state
  const [showConfetti, setShowConfetti] = useState(false);
  const [pendingRecordings, setPendingRecordings] = useState<any[]>([]);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [localSaveStatus, setLocalSaveStatus] = useState<'saved' | 'uploading' | 'uploaded' | null>(null);
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);

  // DB-driven consent content (falls back to hardcoded if not set)
  const [dbConsentContent, setDbConsentContent] = useState<{ title: string; content_md: string } | null>(null);

  // Mobile experience hooks
  const haptic = useHapticFeedback();

  // Fetch DB consent content on mount (used in the consent dialog)
  useEffect(() => {
    supabase
      .from('site_content')
      .select('title, content_md')
      .eq('key', 'consent_form')
      .maybeSingle()
      .then(({ data }) => {
        if (data && (data as any).content_md?.trim()) {
          setDbConsentContent(data as { title: string; content_md: string });
        }
      })
      .catch(() => { /* non-fatal */ });
  }, []);

  // Helper to resolve category ID and name from query param
  const resolveCategory = useCallback(async (param: string | null): Promise<{ id: string; name: string } | null> => {
    const trimmed = param?.trim();
    if (!trimmed) {
      const { data: firstCat } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')
        .limit(1)
        .maybeSingle();
      return firstCat || { id: '11111111-1111-1111-1111-111111111111', name: 'General Health' };
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
    if (isUuid) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id, name')
        .eq('id', trimmed)
        .maybeSingle();
      if (cat) return cat;
      return { id: trimmed, name: 'Category' };
    }

    // Lookup by name
    const { data: match } = await supabase
      .from('categories')
      .select('id, name')
      .ilike('name', `%${trimmed}%`)
      .limit(1)
      .maybeSingle();
    if (match) return match;

    const { data: firstCat } = await supabase
      .from('categories')
      .select('id, name')
      .order('name')
      .limit(1)
      .maybeSingle();
    return firstCat || { id: '11111111-1111-1111-1111-111111111111', name: 'General Health' };
  }, []);

  const fetchQuestions = useCallback(async (userId: string, categoryId?: string) => {
    try {
      let questionsData: Question[] = [];

      // 1. Fetch questions for the given category
      if (categoryId) {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('category_id', categoryId)
          .order('order_index');
        if (!error && data && data.length > 0) {
          questionsData = data;
        }
      }

      // 2. Fallback to all questions if category has none
      if (questionsData.length === 0) {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .order('order_index');
        if (!error && data && data.length > 0) {
          questionsData = data;
        }
      }

      // 3. Ultimate in-memory fallback starter questions
      if (questionsData.length === 0) {
        questionsData = [
          {
            id: '11111111-aaaa-1111-1111-111111111111',
            category_id: categoryId || '11111111-1111-1111-1111-111111111111',
            question_text: 'How do you describe a common cold in your language?',
            order_index: 1,
            image_url: null,
          },
          {
            id: '11111111-bbbb-1111-1111-111111111111',
            category_id: categoryId || '11111111-1111-1111-1111-111111111111',
            question_text: 'What advice do you give someone with a headache?',
            order_index: 2,
            image_url: null,
          }
        ];
      }

      // 4. Fetch unique user counts per question (retirement cap < 3)
      const questionUserCounts = new Map<string, number>();
      try {
        const { data: countsData } = await supabase.rpc('get_question_counts' as any);
        if (Array.isArray(countsData)) {
          countsData.forEach((item: { question_id: string; unique_user_count: number }) => {
            questionUserCounts.set(item.question_id, Number(item.unique_user_count));
          });
        }
      } catch (rpcErr) {
        console.warn('RPC get_question_counts not available:', rpcErr);
      }

      // Filter questions with < 3 contributors
      const availableQuestions = questionsData.filter((q: Question) => {
        const count = questionUserCounts.get(q.id) || 0;
        return count < 3;
      });

      // Maintain questions even if retired so the screen is never blank
      const candidatePool = availableQuestions.length > 0 ? availableQuestions : questionsData;

      // 5. Fetch existing voice responses for this user
      let submittedQuestionIds = new Set<string>();
      try {
        const { data: existingResponses } = await supabase
          .from('voice_responses')
          .select('question_id')
          .eq('user_id', userId);
        submittedQuestionIds = new Set(existingResponses?.map(r => r.question_id) || []);
        setSubmittedQuestions(submittedQuestionIds);
      } catch (respErr) {
        console.warn('Failed to fetch existing responses:', respErr);
      }

      const unansweredQuestions = candidatePool.filter(
        (q: Question) => !submittedQuestionIds.has(q.id)
      );

      // If user answered all questions in this category, keep candidatePool so they can re-record / review
      const finalQuestions = unansweredQuestions.length > 0 ? unansweredQuestions : candidatePool;

      setQuestions(finalQuestions);
      setCurrentQuestionIndex(0);
      return finalQuestions;
    } catch (err) {
      console.error('Error in fetchQuestions:', err);
      return [];
    }
  }, []);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    haptic.lightTap();
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const targetCategory = categoryInfo || (await resolveCategory(rawCategoryParam));
      if (targetCategory && !categoryInfo) {
        setCategoryInfo(targetCategory);
      }

      await fetchQuestions(currentUser.id, targetCategory?.id);
      toast({ title: "Questions Refreshed", description: "Updated question list." });
    } catch (error) {
      console.error('Refresh error:', error);
    }
  }, [haptic, categoryInfo, rawCategoryParam, resolveCategory, fetchQuestions]);

  const { containerRef, pullDistance, pullProgress, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: !isUploading,
  });

  // Load user profile and initial data
  useEffect(() => {
    const initializeData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          navigate('/login');
          return;
        }
        setUser(authUser);

        // Load user profile safely
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, verified, voice_recording_consent')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profile) {
          setUserProfile(profile);

          if (profile.voice_recording_consent) {
            setHasConsented(true);
          }

          // Check admin role if unverified
          if (!profile.verified) {
            const { data: roles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', authUser.id)
              .eq('role', 'admin')
              .maybeSingle();

            if (!roles) {
              toast({
                title: "Account Not Verified",
                description: "Your account is pending admin verification.",
                variant: "destructive"
              });
              navigate('/dashboard');
              return;
            }
          }
        }

        // Resolve selected category
        const targetCategory = await resolveCategory(rawCategoryParam);
        setCategoryInfo(targetCategory);

        // Fetch questions for this category
        const loadedQuestions = await fetchQuestions(authUser.id, targetCategory?.id);
        if (loadedQuestions && loadedQuestions.length > 0) {
          setCurrentQuestionIndex(0);
        }
      } catch (error) {
        console.error('Error initializing data:', error);
        toast({
          title: "Error",
          description: "Failed to load questions",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [navigate, rawCategoryParam, resolveCategory, fetchQuestions]);

  // Strictly bound question index
  const safeQuestionIndex = questions.length > 0
    ? Math.min(Math.max(0, currentQuestionIndex), questions.length - 1)
    : 0;

  const currentQuestion = questions[safeQuestionIndex] || null;
  const progress = questions.length > 0 ? ((safeQuestionIndex + 1) / questions.length) * 100 : 0;
  const hasResponse = currentQuestion ? !!responses[currentQuestion.id] : false;
  const isQuestionSubmitted = currentQuestion ? submittedQuestions.has(currentQuestion.id) : false;

  // Swipe gesture handlers
  const { handlers: swipeHandlers } = useSwipeGesture({
    onSwipeLeft: () => {
      if (safeQuestionIndex < questions.length - 1 && !isUploading) {
        haptic.lightTap();
        setCurrentQuestionIndex(safeQuestionIndex + 1);
        setLocalSaveStatus(null);
      }
    },
    onSwipeRight: () => {
      if (safeQuestionIndex > 0 && !isUploading) {
        haptic.lightTap();
        setCurrentQuestionIndex(safeQuestionIndex - 1);
        setLocalSaveStatus(null);
      }
    },
    enabled: !isUploading,
  });

  // Check for pending recordings on mount
  useEffect(() => {
    const checkPendingRecordings = async () => {
      clearOldRecordings();
      const pending = getAllPendingRecordings();
      if (pending.length > 0) {
        setPendingRecordings(pending);
        setShowRecoveryDialog(true);
      }
    };

    if (user && questions.length > 0) {
      checkPendingRecordings();
    }
  }, [user, questions.length]);

  const handleConsentAgree = async () => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({
          voice_recording_consent: true,
          consent_timestamp: new Date().toISOString()
        })
        .eq('id', user.id);

      setHasConsented(true);
      setShowConsentModal(false);

      toast({
        title: "Consent confirmed",
        description: "You can now proceed with recording your responses."
      });
    } catch (error) {
      console.error('Error storing consent:', error);
      setHasConsented(true);
      setShowConsentModal(false);
    }
  };

  const handleConsentDecline = () => {
    setShowConsentModal(false);
    navigate('/dashboard');
  };

  // Upload recording directly to Supabase Storage ('voice-recordings' bucket)
  const handleRecordingComplete = async (audioBlob: Blob, durationSeconds: number) => {
    if (!currentQuestion || !user) return;

    haptic.success();

    const userName = userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Volunteer';
    const saved = await saveRecordingLocally(
      currentQuestion.id,
      audioBlob,
      durationSeconds,
      {
        userName,
        questionText: currentQuestion.question_text,
      }
    );

    if (saved) {
      setLocalSaveStatus('saved');
    }

    setIsUploading(true);
    setLocalSaveStatus('uploading');

    try {
      setResponses(prev => ({
        ...prev,
        [currentQuestion.id]: audioBlob,
      }));

      // Upload to Supabase Storage in 'voice-recordings' bucket
      // Storage path convention: <user_id>/<question_id>_<timestamp>.webm
      const filePath = `${user.id}/${currentQuestion.id}_${Date.now()}.webm`;

      const { error: uploadError } = await supabase.storage
        .from('voice-recordings')
        .upload(filePath, audioBlob, {
          contentType: 'audio/webm',
          upsert: true,
        });

      if (uploadError) {
        console.error('Supabase Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Obtain the public URL for playback and transcription
      const { data: { publicUrl } } = supabase.storage
        .from('voice-recordings')
        .getPublicUrl(filePath);

      // Save recording record into public.voice_responses
      const cappedDuration = Math.min(durationSeconds, 30);
      const { error: dbError } = await supabase
        .from('voice_responses')
        .insert({
          user_id: user.id,
          question_id: currentQuestion.id,
          audio_file_url: publicUrl,
          duration_seconds: cappedDuration,
          response_type: 'voice',
          status: 'pending'
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw new Error(`Failed to save recording information: ${dbError.message}`);
      }

      // Mark question as completed
      setSubmittedQuestions(prev => new Set([...prev, currentQuestion.id]));
      clearLocalRecording(currentQuestion.id);
      setLocalSaveStatus('uploaded');

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      toast({
        title: "Response saved!",
        description: "Moving to next question...",
      });

      // Auto advance after 1.2s
      setTimeout(() => {
        handleNext();
      }, 1200);

    } catch (error) {
      console.error('Error saving recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try recording again.';
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkip = () => {
    const hasRecording = currentQuestion && responses[currentQuestion.id];
    if (!hasRecording && shouldShowSkipConfirmation()) {
      setShowSkipConfirmation(true);
      return;
    }
    proceedWithSkip();
  };

  const proceedWithSkip = () => {
    if (safeQuestionIndex < questions.length - 1) {
      haptic.lightTap();
      setCurrentQuestionIndex(safeQuestionIndex + 1);
      setLocalSaveStatus(null);
    } else {
      navigate('/dashboard');
      toast({
        title: "Assessment Incomplete",
        description: "You can continue answering questions anytime.",
      });
    }
  };

  const handleResumeUpload = async (questionId: string) => {
    const recording = getLocalRecording(questionId);
    if (!recording) {
      toast({
        title: "Recording not found",
        description: "Unable to retrieve the saved recording.",
        variant: "destructive",
      });
      return;
    }

    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const questionIndex = questions.findIndex(q => q.id === questionId);
    if (questionIndex >= 0) {
      setCurrentQuestionIndex(questionIndex);
    }

    await handleRecordingComplete(recording.blob, recording.duration);

    setPendingRecordings(prev => prev.filter(p => p.questionId !== questionId));
    if (pendingRecordings.length <= 1) {
      setShowRecoveryDialog(false);
    }
  };

  const handleDiscardRecording = (questionId: string) => {
    clearLocalRecording(questionId);
    setPendingRecordings(prev => prev.filter(p => p.questionId !== questionId));

    if (pendingRecordings.length <= 1) {
      setShowRecoveryDialog(false);
    }

    toast({
      title: "Recording discarded",
      description: "The saved recording has been removed.",
    });
  };

  const handleDiscardAll = () => {
    pendingRecordings.forEach(recording => {
      clearLocalRecording(recording.questionId);
    });
    setPendingRecordings([]);
    setShowRecoveryDialog(false);

    toast({
      title: "All recordings discarded",
      description: "All saved recordings have been removed.",
    });
  };

  const handleNext = async () => {
    if (safeQuestionIndex < questions.length - 1) {
      if (currentQuestion && hasResponse) {
        setSubmittedQuestions(prev => new Set([...prev, currentQuestion.id]));
      }
      setCurrentQuestionIndex(safeQuestionIndex + 1);
    } else {
      try {
        const { data: responseData } = await supabase
          .from('voice_responses')
          .select('duration_seconds')
          .eq('user_id', user.id);

        const totalDuration = responseData?.reduce((sum, r) => sum + (r.duration_seconds || 0), 0) || 0;
        const questionsAnswered = submittedQuestions.size + (hasResponse ? 1 : 0);

        navigate('/completion', {
          state: {
            stats: {
              questionsAnswered,
              totalDuration,
            }
          }
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        navigate('/completion', {
          state: {
            stats: {
              questionsAnswered: submittedQuestions.size,
              totalDuration: 0,
            }
          }
        });
      }
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen relative w-full flex items-center justify-center bg-slate-50 p-4">
        <div className="relative z-10 bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center space-y-5 max-w-sm w-full mx-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <Mic className="absolute inset-0 m-auto w-6 h-6 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-900">Setting up session</h2>
            <p className="text-slate-500 text-sm font-medium">Preparing category prompts...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Empty state fallback
  if (!loading && (!currentQuestion || questions.length === 0)) {
    return (
      <div className="min-h-screen relative w-full flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">All Caught Up</h2>
          <p className="text-slate-500 mb-8">
            {categoryInfo?.name
              ? `There are no pending questions for you in ${categoryInfo.name} at this moment.`
              : 'There are no pending questions for you at this moment.'}
          </p>
          <Button onClick={() => navigate('/dashboard')} className="w-full h-12 text-base">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // 3. Active Question View
  return (
    <div
      className="min-h-screen relative w-full bg-slate-50 flex flex-col font-sans selection:bg-blue-100"
      ref={containerRef}
      {...pullHandlers}
      {...swipeHandlers}
    >
      <SkipToContent targetId="main-content" />
      <OfflineIndicator />

      {/* Background depth gradient */}
      <div className="fixed inset-0 w-full h-full z-0 bg-slate-50 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-[40vh] bg-gradient-to-b from-blue-50/70 to-transparent" />
      </div>

      <PullToRefreshIndicator
        pullDistance={pullDistance}
        pullProgress={pullProgress}
        isRefreshing={isRefreshing}
      />

      <Confetti active={showConfetti} particleCount={40} duration={2500} />

      <SkipConfirmationDialog
        open={showSkipConfirmation}
        onOpenChange={setShowSkipConfirmation}
        onConfirmSkip={proceedWithSkip}
        questionNumber={safeQuestionIndex + 1}
      />
      <RecoveryDialog
        open={showRecoveryDialog}
        pendingRecordings={pendingRecordings}
        onResume={handleResumeUpload}
        onDiscard={handleDiscardRecording}
        onDiscardAll={handleDiscardAll}
      />

      {/* HEADER */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Dashboard (Left) */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
          >
            <div className="p-1.5 bg-slate-100 rounded-lg border border-slate-200">
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold">Dashboard</span>
          </button>

          {/* Progress (Center) */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Question
            </span>
            <div className="flex items-center gap-1">
              <span className="text-base font-bold text-slate-900">{safeQuestionIndex + 1}</span>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-medium text-slate-500">{questions.length}</span>
            </div>
          </div>

          {/* Logout (Right) */}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/login');
            }}
            className="flex items-center gap-1.5 text-slate-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 text-sm font-medium"
          >
            <span>Log Out</span>
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 flex flex-col items-center justify-start py-4 px-3 sm:py-6 sm:px-4 w-full max-w-2xl mx-auto focus:outline-none z-10"
        aria-label={`Question ${safeQuestionIndex + 1} of ${questions.length}`}
      >
        {/* Consent Banner if not yet consented */}
        {!hasConsented && (
          <div className="w-full mb-4 bg-gradient-to-r from-blue-500/10 via-primary/10 to-indigo-500/10 border border-blue-200 dark:border-blue-900 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-xl">
                <Shield className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900">Voice Recording Consent</p>
                <p className="text-xs text-slate-600">Please review and accept project research consent before recording.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConsentModal(true)}
                className="text-xs flex-1 sm:flex-none border-blue-200"
              >
                Read Form
              </Button>
              <Button
                size="sm"
                onClick={handleConsentAgree}
                className="text-xs flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                I Agree
              </Button>
            </div>
          </div>
        )}

        <div className="w-full space-y-4" key={currentQuestion.id || safeQuestionIndex}>
          {/* Question Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-slate-100 overflow-hidden">
            <div className="p-5 sm:p-7 space-y-5">
              {/* Question Badge + Text */}
              <div className="space-y-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] sm:text-xs font-bold tracking-wider uppercase border border-slate-200">
                    Q{safeQuestionIndex + 1}
                  </span>
                  {categoryInfo?.name && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] sm:text-xs font-semibold tracking-wide border border-blue-200">
                      {categoryInfo.name}
                    </span>
                  )}
                </div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 leading-snug">
                  {currentQuestion.question_text}
                </h1>
              </div>

              {/* Image Section */}
              {currentQuestion.image_url && (
                <div className="w-full flex flex-col items-center">
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-2xl shadow-inner max-w-md w-full flex justify-center">
                    <img
                      src={currentQuestion.image_url}
                      alt="Question Context"
                      className="rounded-xl shadow-sm max-h-[180px] sm:max-h-[240px] w-auto object-contain bg-white"
                    />
                  </div>
                  {currentQuestion.image_attribution && (
                    <p className="text-[10px] sm:text-xs text-slate-400 text-center mt-1.5">
                      {currentQuestion.image_attribution}
                    </p>
                  )}
                </div>
              )}

              {/* Recorder Section */}
              <div className="pt-2">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <MinimalRecorder
                    key={currentQuestion.id}
                    onRecordingComplete={handleRecordingComplete}
                    disabled={isRecordingDisabled || isUploading || isQuestionSubmitted || !hasConsented}
                  />
                  {!hasConsented && (
                    <p className="text-center text-xs text-amber-600 font-medium mt-3">
                      Please accept the consent declaration above to start recording.
                    </p>
                  )}
                </div>

                {/* Upload Status Feedback */}
                <div className="h-7 flex items-center justify-center mt-2.5">
                  {isUploading && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving to Supabase storage...
                    </span>
                  )}
                  {localSaveStatus === 'saved' && !isUploading && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5" /> Saved
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Question Progress Dots */}
          <QuestionProgressDots
            total={questions.length}
            current={safeQuestionIndex}
            completed={submittedQuestions}
            questionIds={questions.map(q => q.id)}
            onDotClick={(index) => {
              if (submittedQuestions.has(questions[index].id)) {
                haptic.lightTap();
                setCurrentQuestionIndex(index);
                setLocalSaveStatus(null);
              }
            }}
            className="py-3"
          />

          {/* Skip Button */}
          <div className="flex justify-center w-full pt-2">
            <Button
              onClick={handleSkip}
              disabled={isUploading}
              className="h-12 px-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-md text-base font-bold transition-all transform hover:scale-105 active:scale-95 group"
            >
              <span className="flex items-center gap-2">
                Skip Question
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
          </div>
        </div>
      </main>

      {/* CONSENT DIALOG */}
      <Dialog open={showConsentModal} onOpenChange={setShowConsentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 shadow-2xl rounded-2xl p-0 gap-0 z-50">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-center text-xl sm:text-2xl font-bold text-slate-900 mb-1 uppercase tracking-tight">
              {dbConsentContent?.title || 'Data Collection Consent Form'}
            </DialogTitle>
            {!dbConsentContent && (
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">
                  Project Name: Kikuyu Speech Data Collection
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  Institution: Centre for Data Science and Artificial Intelligence, Nyeri, Kenya
                </p>
              </div>
            )}
          </div>

          <div className="p-6 space-y-5">
            {dbConsentContent ? (
              /* DB content: render preserving line breaks */
              <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                {dbConsentContent.content_md}
              </div>
            ) : (
              /* Hardcoded fallback */
              <>
                <p className="text-slate-700 leading-relaxed text-sm">
                  You are invited to participate in a data collection exercise conducted by <span className="font-semibold text-slate-900">Centre for Data Science and Artificial Intelligence (DSAIL)</span> at Dedan Kimathi University of Technology (DeKuT), using <span className="font-semibold text-slate-900">JasinaHub</span>. The goal of this project is to collect speech data in Kikuyu language to support the development of Large Language Models (LLMs) specifically for health-related applications.
                </p>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h4 className="font-bold text-blue-900 text-xs mb-2 flex items-center gap-2">
                      <UserCheck className="w-4 h-4" /> Eligibility
                    </h4>
                    <ul className="list-disc list-inside text-xs text-blue-800 space-y-1">
                      <li>At least 18 years of age</li>
                      <li>Fluent Kikuyu speaker</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h4 className="font-bold text-blue-900 text-xs mb-2 flex items-center gap-2">
                      <Mic2 className="w-4 h-4" /> Activities
                    </h4>
                    <ul className="list-disc list-inside text-xs text-blue-800 space-y-1">
                      <li>Audio recording prompts</li>
                      <li>Image descriptions</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Key Confidentiality Points
                  </h4>
                  <p>Participation is voluntary; you may stop at any time.</p>
                  <p>Your contributions are pseudonymised for downstream machine learning datasets.</p>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleConsentDecline}
              className="w-full sm:w-auto h-11 border-slate-200 text-slate-600"
            >
              Decline
            </Button>
            <Button
              onClick={handleConsentAgree}
              className="w-full sm:w-auto h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md"
            >
              I Agree & Start Recording
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
