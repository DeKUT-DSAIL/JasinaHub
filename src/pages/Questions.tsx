import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MinimalRecorder } from "@/components/VoiceRecording/MinimalRecorder";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  FileText,
  ChevronRight,
  Shield,
  Mic2,
  UserCheck,
  LayoutDashboard,
  AlertCircle,
  User,
  Mic,
  Loader2,
  BarChart3,
  Save,
  Home,
  LogOut,
  Play,
  Volume2,
  RefreshCw
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
  image_url: string | null;
  image_attribution?: string | null;
  category_id: string;
  order_index: number;
}

declare global {
  interface Window {
    google: any;
  }
}

export default function Questions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || 'health';

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
  const [gisLoaded, setGisLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [driveFolderId] = useState(import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID);
  const [googleClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [isUploading, setIsUploading] = useState(false);

  // Phase 3 improvements state
  const [showConfetti, setShowConfetti] = useState(false);
  const [pendingRecordings, setPendingRecordings] = useState<any[]>([]);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [localSaveStatus, setLocalSaveStatus] = useState<'saved' | 'uploading' | 'uploaded' | null>(null);
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);

  // Mobile experience hooks
  const haptic = useHapticFeedback();

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    haptic.lightTap();
    // Refresh questions
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('category_id', '00000000-0000-0000-0000-000000000001')
        .order('order_index');

      // Fetch unique user counts per question via RPC (bypasses RLS to get accurate counts)
      const { data: countsData } = await supabase.rpc('get_question_counts' as any);
      const questionUserCounts = new Map<string, number>();
      if (Array.isArray(countsData)) {
        countsData.forEach((item: { question_id: string; unique_user_count: number }) => {
          questionUserCounts.set(item.question_id, Number(item.unique_user_count));
        });
      }

      // Filter out questions that already have 3 or more unique users
      const availableQuestions = (questionsData || []).filter((q: Question) => {
        const count = questionUserCounts.get(q.id) || 0;
        return count < 3;
      });

      const { data: existingResponses } = await supabase
        .from('voice_responses')
        .select('question_id')
        .eq('user_id', currentUser.id);

      if (existingResponses && availableQuestions) {
        const submittedQuestionIds = new Set(existingResponses.map(r => r.question_id));
        setSubmittedQuestions(submittedQuestionIds);
        const unansweredQuestions = availableQuestions.filter(
          (q: Question) => !submittedQuestionIds.has(q.id)
        );
        setQuestions(unansweredQuestions);
      }

      toast({ title: "Refreshed", description: "Questions updated" });
    } catch (error) {
      console.error('Refresh error:', error);
    }
  }, [haptic]);

  const { containerRef, pullDistance, pullProgress, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: !isUploading,
  });

  // Load Google Identity Services
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGisLoaded(true);
    script.onerror = () => console.error('Failed to load GIS script');
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Initialize GIS OAuth client and get token silently
  useEffect(() => {
    if (!gisLoaded || !window.google?.accounts) return;

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: async (tokenResponse: any) => {
        if (tokenResponse.access_token) {
          console.log('Token obtained successfully');
          setAccessToken(tokenResponse.access_token);

          // Store token in localStorage for persistence
          localStorage.setItem('google_drive_token', tokenResponse.access_token);
          localStorage.setItem('google_token_expiry', (Date.now() + 3500000).toString()); // 58 minutes
          localStorage.setItem('google_drive_authorized', 'true'); // Mark as previously authorized
        } else {
          console.error('Failed to get token:', tokenResponse);
          // Only show error if not a silent refresh attempt
          if (!localStorage.getItem('google_drive_authorized')) {
            toast({
              title: "Authentication Required",
              description: "Please sign in to Google to save your recordings.",
              variant: "destructive"
            });
          }
        }
      },
    });

    setTokenClient(client);

    // Check for existing valid token
    const storedToken = localStorage.getItem('google_drive_token');
    const tokenExpiry = localStorage.getItem('google_token_expiry');
    const hasAuthorizedBefore = localStorage.getItem('google_drive_authorized') === 'true';

    if (storedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
      console.log('Using stored token');
      setAccessToken(storedToken);
    } else if (hasAuthorizedBefore) {
      // Token expired but user has authorized before - try silent refresh
      console.log('Token expired, attempting silent refresh...');
      localStorage.removeItem('google_drive_token');
      localStorage.removeItem('google_token_expiry');
      // Silent refresh will happen automatically when needed
    } else {
      // Clear expired tokens
      localStorage.removeItem('google_drive_token');
      localStorage.removeItem('google_token_expiry');
    }
  }, [gisLoaded, googleClientId]);

  // Load user and questions
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Get user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }
        setUser(user);

        // Load user profile and check verification
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, verified, voice_recording_consent')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserProfile(profile);

          // Set consent from database
          if (profile.voice_recording_consent) {
            setHasConsented(true);
          }

          // Check if user is verified
          if (!profile.verified) {
            // Check if user is admin
            const { data: roles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id)
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

        // Load questions
        const { data: questionsData, error } = await supabase
          .from('questions')
          .select('*')
          .eq('category_id', '00000000-0000-0000-0000-000000000001')
          .order('order_index');

        if (error) throw error;

        // Fetch unique user counts per question via RPC (bypasses RLS to get accurate counts)
        const { data: countsData } = await supabase.rpc('get_question_counts' as any);
        const questionUserCounts = new Map<string, number>();
        if (Array.isArray(countsData)) {
          countsData.forEach((item: { question_id: string; unique_user_count: number }) => {
            questionUserCounts.set(item.question_id, Number(item.unique_user_count));
          });
        }

        // Filter out questions that already have 3 or more unique users
        const availableQuestions = (questionsData || []).filter((q: Question) => {
          const count = questionUserCounts.get(q.id) || 0;
          return count < 3;
        });

        // Fetch existing responses to check which questions are already answered by current user
        const { data: existingResponses } = await supabase
          .from('voice_responses')
          .select('question_id')
          .eq('user_id', user.id);

        if (existingResponses) {
          const submittedQuestionIds = new Set(existingResponses.map(r => r.question_id));
          setSubmittedQuestions(submittedQuestionIds);

          // Filter out already answered questions by this user
          const unansweredQuestions = availableQuestions.filter(
            (q: Question) => !submittedQuestionIds.has(q.id)
          );

          setQuestions(unansweredQuestions);

          // Start at the first unanswered question
          if (unansweredQuestions.length > 0) {
            setCurrentQuestionIndex(0);
          }
        } else {
          setQuestions(availableQuestions);
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
  }, [navigate]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const hasResponse = currentQuestion ? !!responses[currentQuestion.id] : false;
  const completedQuestions = Object.keys(responses).length;
  const isQuestionSubmitted = currentQuestion ? submittedQuestions.has(currentQuestion.id) : false;

  // Swipe gesture handlers with haptic feedback
  const { handlers: swipeHandlers } = useSwipeGesture({
    onSwipeLeft: () => {
      if (currentQuestionIndex < questions.length - 1 && !isUploading) {
        haptic.lightTap();
        setCurrentQuestionIndex(prev => prev + 1);
        setLocalSaveStatus(null);
      }
    },
    onSwipeRight: () => {
      if (currentQuestionIndex > 0 && !isUploading) {
        haptic.lightTap();
        setCurrentQuestionIndex(prev => prev - 1);
        setLocalSaveStatus(null);
      }
    },
    enabled: !isUploading,
  });

  // Check for pending recordings on mount
  useEffect(() => {
    const checkPendingRecordings = async () => {
      // Clear old recordings first
      clearOldRecordings();

      // Get pending recordings
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
      // Store consent in database permanently
      const { error } = await supabase
        .from('profiles')
        .update({
          voice_recording_consent: true,
          consent_timestamp: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setHasConsented(true);
      setShowConsentModal(false);

      toast({
        title: "Consent confirmed",
        description: "You can now proceed with recording your responses."
      });
    } catch (error) {
      console.error('Error storing consent:', error);
      toast({
        title: "Error",
        description: "Failed to store consent. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleConsentDecline = () => {
    setShowConsentModal(false);
    navigate('/dashboard');
  };

  const ensureGoogleAuth = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (accessToken) {
        resolve(accessToken);
        return;
      }

      if (!tokenClient) {
        toast({
          title: "Setup Error",
          description: "Google Drive authentication not initialized. Please refresh the page.",
          variant: "destructive"
        });
        reject(new Error('Google auth not initialized'));
        return;
      }

      // Set up a timeout to handle the case where token callback doesn't fire
      const timeout = setTimeout(() => {
        toast({
          title: "Authentication Timeout",
          description: "Google Drive connection timed out. Please try again.",
          variant: "destructive"
        });
        reject(new Error('Authentication timeout'));
      }, 30000); // 30 second timeout

      // Override the callback temporarily to handle this specific request
      const originalCallback = tokenClient.callback;
      tokenClient.callback = (tokenResponse: any) => {
        clearTimeout(timeout);
        tokenClient.callback = originalCallback; // Restore original callback

        if (tokenResponse.error) {
          // If error and user canceled, don't show error toast
          if (tokenResponse.error === 'access_denied') {
            reject(new Error('User canceled'));
            return;
          }
          toast({
            title: "Google Sign-in Required",
            description: "Please allow access to Google Drive to save your recordings.",
            variant: "destructive"
          });
          reject(new Error(tokenResponse.error));
          return;
        }

        if (tokenResponse.access_token) {
          setAccessToken(tokenResponse.access_token);
          localStorage.setItem('google_drive_token', tokenResponse.access_token);
          localStorage.setItem('google_token_expiry', (Date.now() + 3500000).toString());
          localStorage.setItem('google_drive_authorized', 'true'); // Mark as previously authorized
          resolve(tokenResponse.access_token);
        } else {
          toast({
            title: "Authentication Failed",
            description: "Could not connect to Google Drive. Please try again.",
            variant: "destructive"
          });
          reject(new Error('Authentication failed'));
        }
      };

      // Request token - only show consent if user hasn't authorized before
      try {
        const hasAuthorizedBefore = localStorage.getItem('google_drive_authorized') === 'true';
        tokenClient.requestAccessToken({
          prompt: hasAuthorizedBefore ? '' : 'consent' // Silent refresh if previously authorized
        });
      } catch (err) {
        clearTimeout(timeout);
        toast({
          title: "Error",
          description: "Failed to request Google Drive access. Please refresh and try again.",
          variant: "destructive"
        });
        reject(err);
      }
    });
  };

  const handleRecordingComplete = async (audioBlob: Blob, durationSeconds: number) => {
    if (!currentQuestion || !user || !userProfile) return;

    // Haptic feedback on recording complete
    haptic.success();

    // Save locally first for recovery
    const userName = `${userProfile.first_name} ${userProfile.last_name}`;
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
      toast({
        title: "Saved locally",
        description: "Recording saved. Uploading...",
      });
    }

    setIsUploading(true);
    setLocalSaveStatus('uploading');

    try {
      setResponses(prev => ({
        ...prev,
        [currentQuestion.id]: audioBlob,
      }));

      // Mark question as submitted
      setSubmittedQuestions(prev => new Set([...prev, currentQuestion.id]));

      // Ensure we have a valid Google auth token
      let tokenToUse = accessToken;
      if (!tokenToUse) {
        toast({
          title: "Connecting to Google Drive...",
          description: "Please sign in to Google to save your recordings.",
        });

        try {
          tokenToUse = await ensureGoogleAuth();
        } catch (authError) {
          console.error('Authentication error:', authError);
          throw new Error('Failed to authenticate with Google Drive. Please try again.');
        }
      }

      // Upload to Google Drive with better error handling
      const fileMetadata = {
        name: `${userProfile.first_name}_${userProfile.last_name}_${currentQuestion.order_index + 1}.webm`,
        parents: [driveFolderId],
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
      form.append('media', audioBlob, fileMetadata.name);

      let uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenToUse}`,
        },
        body: form,
      });

      // Handle token expiration
      if (uploadResponse.status === 401) {
        console.log('Token expired, getting new token...');
        localStorage.removeItem('google_drive_token');
        localStorage.removeItem('google_token_expiry');
        setAccessToken(null);

        toast({
          title: "Reconnecting to Google Drive...",
          description: "Getting fresh credentials.",
        });

        try {
          tokenToUse = await ensureGoogleAuth();
        } catch (authError) {
          console.error('Re-authentication error:', authError);
          throw new Error('Failed to reconnect to Google Drive. Please try again.');
        }

        // Recreate form data for retry
        const retryForm = new FormData();
        retryForm.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
        retryForm.append('media', audioBlob, fileMetadata.name);

        // Retry upload with new token
        uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenToUse}`,
          },
          body: retryForm,
        });
      }

      // Check if upload was successful
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        console.error('Google Drive upload failed:', errorData);
        throw new Error(
          errorData.error?.message ||
          `Upload failed with status ${uploadResponse.status}. Please check your Google Drive permissions.`
        );
      }

      const fileData = await uploadResponse.json();

      if (!fileData.id) {
        throw new Error('Upload succeeded but no file ID returned');
      }

      // Save to database
      await saveResponseToDatabase(fileData, audioBlob, durationSeconds);

      // Mark question as submitted immediately after saving
      if (currentQuestion) {
        setSubmittedQuestions(prev => new Set([...prev, currentQuestion.id]));

        // Clear local storage after successful upload
        clearLocalRecording(currentQuestion.id);
        setLocalSaveStatus('uploaded');

        // Trigger confetti animation
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);

        // Notify user
        toast({
          title: "Response saved!",
          description: "Moving to the next question...",
        });

        // === AUTO ADVANCE LOGIC ===
        // Wait 1.5s for user to see success message, then advance
        setTimeout(() => {
          handleNext();
        }, 1500);
      }

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

  const saveResponseToDatabase = async (fileData: any, audioBlob: Blob, durationSeconds: number) => {
    try {
      const fileUrl = `https://drive.google.com/file/d/${fileData.id}/view`;

      // Set public permissions for playback
      try {
        const permissionResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role: 'reader', type: 'anyone' }),
        });

        if (!permissionResponse.ok) {
          const permError = await permissionResponse.json().catch(() => ({}));
          console.warn('Failed to set public permissions:', permError);
          // Continue anyway - file is still accessible to the user
        }
      } catch (permError) {
        console.warn('Permission setting error (non-critical):', permError);
        // Continue - file upload was successful even if permissions couldn't be set
      }

      // Save to database with capped duration (max 30 seconds)
      const cappedDuration = Math.min(durationSeconds, 30);
      const { error: dbError } = await supabase
        .from('voice_responses')
        .insert({
          user_id: user.id,
          question_id: currentQuestion.id,
          audio_file_url: fileUrl,
          duration_seconds: cappedDuration,
          response_type: 'voice'
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error(`Failed to save recording information: ${dbError.message}`);
      }
    } catch (error) {
      console.error('Error in saveResponseToDatabase:', error);
      throw error;
    }
  };

  const handleSkip = () => {
    // Check if user has a recording for this question
    const hasRecording = currentQuestion && responses[currentQuestion.id];

    // If no recording and skip confirmation is enabled, show dialog
    if (!hasRecording && shouldShowSkipConfirmation()) {
      setShowSkipConfirmation(true);
      return;
    }

    // Otherwise proceed with skip
    proceedWithSkip();
  };

  const proceedWithSkip = () => {
    if (currentQuestionIndex < questions.length - 1) {
      haptic.lightTap();
      setCurrentQuestionIndex(prev => prev + 1);
      setLocalSaveStatus(null);
    } else {
      // Last question - go to dashboard
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

    // Find the question
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    // Navigate to the question
    const questionIndex = questions.findIndex(q => q.id === questionId);
    if (questionIndex >= 0) {
      setCurrentQuestionIndex(questionIndex);
    }

    // Trigger upload
    await handleRecordingComplete(recording.blob, recording.duration);

    // Close dialog and remove from pending list
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
    if (!hasConsented) {
      toast({
        title: "Consent required",
        description: "Please agree to the recording consent before proceeding.",
        variant: "destructive"
      });
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      // Mark current question as submitted after successful upload
      if (currentQuestion && hasResponse) {
        setSubmittedQuestions(prev => new Set([...prev, currentQuestion.id]));
      }
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Last question - calculate stats and navigate to completion
      try {
        // Fetch total duration from database for accurate stats
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
        // Navigate anyway with estimated stats
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

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const CleanBackground = () => (
    <div className="fixed inset-0 w-full h-full z-0 bg-slate-50 pointer-events-none">
      {/* Subtle static gradient for depth without animation cost */}
      <div className="absolute top-0 left-0 right-0 h-[50vh] bg-gradient-to-b from-blue-50/80 to-transparent" />
    </div>
  );

  // --- Main Component ---

  // 1. Loading State (High Contrast)
  if (loading) {
    return (
      <div
        className="min-h-screen relative w-full flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg.webp')" }}
      >
        {/* Overlay: Adds a white tint and blur to ensure the text is readable */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm z-0" />

        {/* Loading Card */}
        <div className="relative z-10 bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white/60 text-center space-y-6 animate-fade-in max-w-sm w-full mx-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 border-4 border-slate-200/60 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <Mic className="absolute inset-0 m-auto w-6 h-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Setting up session</h2>
            <p className="text-slate-600 font-medium">Preparing secure connection...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. No Questions State
  if (!loading && questions.length === 0) {
    return (
      <div className="min-h-screen relative w-full flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">All Caught Up</h2>
          <p className="text-slate-500 mb-8">
            There are no pending questions for you at this moment.
          </p>
          <Button onClick={() => navigate('/dashboard')} className="w-full h-12 text-base">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  // 3. Active Question State (Linear Flow)
  return (
    <div
      className="min-h-screen relative w-full bg-slate-50 flex flex-col font-sans selection:bg-blue-100"
      ref={containerRef}
      {...pullHandlers}
      {...swipeHandlers}
    >
      <style>{animationStyles}</style>

      {/* Accessibility: Skip to main content link */}
      <SkipToContent targetId="main-content" />

      {/* Offline detection banner */}
      <OfflineIndicator />

      <CleanBackground />

      {/* Pull to Refresh Indicator */}
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        pullProgress={pullProgress}
        isRefreshing={isRefreshing}
      />

      <Confetti active={showConfetti} particleCount={40} duration={2500} />

      {/* Skip Confirmation Dialog */}
      <SkipConfirmationDialog
        open={showSkipConfirmation}
        onOpenChange={setShowSkipConfirmation}
        onConfirmSkip={proceedWithSkip}
        questionNumber={currentQuestionIndex + 1}
      />
      <RecoveryDialog
        open={showRecoveryDialog}
        pendingRecordings={pendingRecordings}
        onResume={handleResumeUpload}
        onDiscard={handleDiscardRecording}
        onDiscardAll={handleDiscardAll}
      />

      {/* BLUR WRAPPER */}
      <div className={`relative z-10 flex-1 flex flex-col transition-all duration-300 ${showConsentModal || !hasConsented
        ? "blur-sm opacity-50 grayscale pointer-events-none"
        : "blur-0 opacity-100"
        }`}>

        {/* --- HEADER: Solid & Clear --- */}
        <header className="bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200 px-4 py-3 shadow-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">

            {/* Dashboard (Left) */}
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors group px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-white border border-transparent group-hover:border-slate-200 transition-all">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold leading-none mt-1">Dashboard</span>
              </div>
            </button>

            {/* Progress (Center) - Visual "Steps" */}
            <div className="hidden sm:flex flex-col items-center">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">
                Progress
              </span>
              <div className="flex items-center gap-1">
                <span className="text-base font-bold text-slate-900">{currentQuestionIndex + 1}</span>
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
              className="flex items-center gap-2 text-slate-600 hover:text-red-600 transition-colors group px-2 py-1 rounded-lg hover:bg-red-50"
            >
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold leading-none mt-1">Log Out</span>
              </div>
              <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-white border border-transparent group-hover:border-red-100 transition-all">
                <LogOut className="w-4 h-4" />
              </div>
            </button>
          </div>

          {/* Mobile Progress Bar */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        {/* --- MAIN CONTENT: Mobile-first compact layout --- */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 flex flex-col items-center justify-start py-3 px-3 sm:py-6 sm:px-4 w-full max-w-2xl mx-auto focus:outline-none"
          aria-label={`Question ${currentQuestionIndex + 1} of ${questions.length}`}
        >

          <div
            className="w-full space-y-3 sm:space-y-4 motion-safe:animate-slide-up"
            key={currentQuestionIndex}
          >
            {/* Question Card - Mobile Compact */}
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">

              <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">

                {/* Question Badge + Text */}
                <div className="space-y-2 sm:space-y-3 text-center">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] sm:text-xs font-bold tracking-wider uppercase border border-slate-200">
                    Q{currentQuestionIndex + 1}
                  </span>
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 leading-snug">
                    {currentQuestion.question_text}
                  </h1>
                </div>

                {/* Image Section - Compact on mobile */}
                {currentQuestion.image_url && (
                  <div className="w-full">
                    <div className="flex justify-center">
                      <div className="relative p-1.5 sm:p-2 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl shadow-inner">
                        <img
                          src={currentQuestion.image_url}
                          alt="Question Context"
                          className="rounded-lg sm:rounded-xl shadow-sm max-h-[160px] sm:max-h-[220px] md:max-h-[280px] w-auto object-contain bg-white"
                        />
                      </div>
                    </div>
                    {currentQuestion.image_attribution && (
                      <p className="text-[10px] sm:text-xs text-slate-400 text-center mt-1.5">
                        {currentQuestion.image_attribution}
                      </p>
                    )}
                  </div>
                )}

                {/* Recorder Section - Compact */}
                <div className="pt-1 sm:pt-2">
                  <div className="bg-slate-50/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-100/50">
                    <MinimalRecorder
                      key={currentQuestion.id}
                      onRecordingComplete={handleRecordingComplete}
                      disabled={isRecordingDisabled || isUploading || isQuestionSubmitted}
                    />
                  </div>

                  {/* Minimal Status Feedback */}
                  <div className="h-6 sm:h-8 flex items-center justify-center mt-2 sm:mt-3">
                    {isUploading && (
                      <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                      </span>
                    )}
                    {localSaveStatus === 'saved' && !isUploading && (
                      <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Saved
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Question Progress Dots */}
            <QuestionProgressDots
              total={questions.length}
              current={currentQuestionIndex}
              completed={submittedQuestions}
              questionIds={questions.map(q => q.id)}
              onDotClick={(index) => {
                // Only allow navigating to completed questions
                if (submittedQuestions.has(questions[index].id)) {
                  haptic.lightTap();
                  setCurrentQuestionIndex(index);
                  setLocalSaveStatus(null);
                }
              }}
              className="py-4"
            />

            {/* --- FOOTER: Compact Navigation --- */}
            <div className="flex justify-center w-full pt-4">
              {/* Skip Button - Highly visible as requested */}
              <Button
                onClick={handleSkip}
                disabled={isUploading}
                className="h-12 sm:h-14 px-12 sm:px-20 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 text-base sm:text-lg font-bold transition-all transform hover:scale-105 active:scale-95 group"
              >
                <span className="flex items-center gap-2">
                  Skip Question
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
            </div>

            <p className="text-center text-[10px] sm:text-xs text-slate-400 mt-2 sm:mt-3">
              * Answers cannot be changed after proceeding
            </p>

          </div>
        </main>
      </div>

      {/* --- CONSENT DIALOG (High Contrast Version) --- */}
      <Dialog open={!hasConsented || showConsentModal} onOpenChange={setShowConsentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 shadow-2xl rounded-2xl p-0 gap-0 z-50">

          {/* Header */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-center text-xl sm:text-2xl font-bold text-slate-900 mb-1 uppercase tracking-tight">
              Data Collection Consent Form
            </DialogTitle>
            <div className="text-center space-y-2">
              <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">
                Project Name: Kikuyu Speech Data Collection
              </p>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Institution: Center for Data Science and Artificial Intelligence, Nyeri, Kenya
                </p>
                <p className="text-xs sm:text-sm text-blue-500 font-medium font-semibold underline decoration-blue-200 underline-offset-2">
                  Email: dsail.info@dkut.ac.ke
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <p className="text-slate-700 leading-relaxed text-sm">
              You are invited to participate in a data collection exercise conducted by <span className="font-semibold text-slate-900">Center for Data Science and Artificial Intelligence (DSAIL)</span> at Dedan Kimathi University of Technology (DeKuT), using <span className="font-semibold text-slate-900">JasinaHub</span>. The goal of this project is to collect speech data in Kikuyu language to support the development of Large Language Models (LLMs) specifically for health-related applications.
            </p>

            <p className="text-slate-700 leading-relaxed text-sm">
              Each participant is expected to take part for a <span className="font-medium text-slate-900">maximum of one hour</span>, during which you will record short audio clips of about <span className="font-medium text-slate-900">30 seconds</span> each.
            </p>

            {/* Info Cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h4 className="font-bold text-blue-900 text-sm mb-2 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" /> Eligibility
                </h4>
                <ul className="list-disc list-inside text-xs text-blue-800 space-y-1">
                  <li>Are 18 years of age</li>
                  <li>Are a fluent Kikuyu speaker</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h4 className="font-bold text-blue-900 text-sm mb-2 flex items-center gap-2">
                  <Mic2 className="w-4 h-4" /> Activities
                </h4>
                <ul className="list-disc list-inside text-xs text-blue-800 space-y-1">
                  <li>Audio recording (Prompts: Image, Question)</li>
                  <li>Image annotation (Describing/Labelling)</li>
                  <li>Transcription (Listening & Typing)</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Important Notes
                </h4>
                <ul className="list-disc list-inside text-xs text-slate-600 leading-relaxed space-y-2">
                  <li>Participation is <span className="font-medium text-slate-800">voluntary</span>; you may choose not to participate or stop at any time.</li>
                  <li>Data is stored securely on <span className="font-medium text-slate-800">password protected and encrypted servers</span> managed by DSAIL.</li>
                  <li>Data may be used in future AI research and shared with other researchers under <span className="font-medium text-slate-800">strict data sharing agreements</span> ensuring confidentiality and responsible use.</li>
                  <li>Please respond <span className="font-medium text-slate-800">honestly</span> to ensures accuracy and usefulness of research findings.</li>
                </ul>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-3">
                <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Pseudonymisation &amp; Your Rights
                </h4>
                <ul className="list-disc list-inside text-xs text-emerald-900/80 leading-relaxed space-y-2">
                  <li>
                    Your contributions are <span className="font-medium text-emerald-900">pseudonymised</span>: whenever the
                    data is used for downstream machine learning tasks or dataset curation, your name, email and phone
                    number are replaced with an anonymous contributor ID (e.g. <span className="font-mono">JSN-4F2A9C1</span>).
                  </li>
                  <li>
                    You have the right to <span className="font-medium text-emerald-900">withdraw your consent at any time</span>,
                    without giving a reason and without penalty.
                  </li>
                  <li>
                    You have the right to <span className="font-medium text-emerald-900">delete your account</span> and request
                    erasure of the data you provided.
                  </li>
                  <li>
                    You have the right to <span className="font-medium text-emerald-900">access the data you provided</span> on
                    the platform at any time via "My Responses" and "My Transcriptions".
                  </li>
                  <li>
                    Full details of how your data is protected under Kenya's Data Protection Act, 2019 are in our{" "}
                    <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                      Privacy Policy
                    </a>.
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 text-blue-900">
                <h4 className="font-bold text-sm mb-2">Consent Declaration</h4>
                <p className="text-[11px] leading-relaxed font-medium">
                  By signing this, I consent to participate in the data collection exercise described above toward the development of a Kenyan language corpus. I understand the procedures to be used in this project. I understand that my voice will be recorded, and that my recorded voice will be included in a data corpus that may be made publicly available to other researchers. I understand that it may be possible for others to identify me by my voice, and I understand that no personal information will be connected to my voice &mdash; my contributions are pseudonymised for downstream machine learning and dataset curation. I understand that I may withdraw my consent at any time, request deletion of my account and the data I provided, and access the data I have contributed on the platform.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleConsentDecline}
              className="w-full sm:w-auto h-12 border-slate-200 text-slate-600"
            >
              Decline
            </Button>
            <Button
              onClick={handleConsentAgree}
              className="w-full sm:w-auto h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md"
            >
              I Agree & Start Recording
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}