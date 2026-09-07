import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Clock, Download, ExternalLink, CheckCircle2, XCircle, Timer, Calendar, Headphones } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

// --- Types ---
interface Response {
  id: string;
  question_id: string;
  response_type: string;
  text_response: string | null;
  audio_file_url: string | null;
  created_at: string;
  status: 'pending' | 'accepted' | 'rejected';
  duration_seconds?: number;
  questions: {
    question_text: string;
    image_url: string | null;
  };
}

// --- Background Component ---
const CleanBackground = () => (
  <div className="fixed inset-0 w-full h-full z-0 bg-slate-50 pointer-events-none">
    <div className="absolute top-0 left-0 right-0 h-[40vh] bg-gradient-to-b from-blue-50/80 to-transparent" />
  </div>
);

const MyResponses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDuration, setTotalDuration] = useState(0);
  const [acceptedDuration, setAcceptedDuration] = useState(0);
  const [rejectedDuration, setRejectedDuration] = useState(0);

  // --- Logic Helpers ---
  const getFileId = (url: string): string | null => {
    const patterns = [
      /\/d\/([a-zA-Z0-9-_]+)/,
      /id=([a-zA-Z0-9-_]+)/,
      /\/file\/d\/([a-zA-Z0-9-_]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const getDirectDownloadUrl = (url: string): string => {
    const fileId = getFileId(url);
    return fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : url;
  };

  const getViewUrl = (url: string): string => {
    const fileId = getFileId(url);
    return fileId ? `https://drive.google.com/file/d/${fileId}/view` : url;
  };

  // --- Data Loading ---
  useEffect(() => {
    loadResponses();
  }, []);

  const loadResponses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from('voice_responses')
        .select(`*, questions(question_text, image_url)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setResponses(data || []);
      
      // Calculate total duration (capped at 30s per response)
      const total = (data || []).reduce((sum, response) => {
        const cappedDuration = Math.min(response.duration_seconds || 0, 30);
        return sum + cappedDuration;
      }, 0);
      setTotalDuration(total);

      // Calculate accepted duration
      const accepted = (data || []).reduce((sum, response) => {
        if (response.status === 'accepted') {
          return sum + Math.min(response.duration_seconds || 0, 30);
        }
        return sum;
      }, 0);
      setAcceptedDuration(accepted);

      // Calculate rejected duration
      const rejected = (data || []).reduce((sum, response) => {
        if (response.status === 'rejected') {
          return sum + Math.min(response.duration_seconds || 0, 30);
        }
        return sum;
      }, 0);
      setRejectedDuration(rejected);
    } catch (error) {
      console.error("Error loading responses:", error);
      toast({ title: "Error", description: "Failed to load responses.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- Action Handlers ---
  const togglePlayAudio = (audioUrl: string) => {
    const viewUrl = getViewUrl(audioUrl);
    const width = 800;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    window.open(viewUrl, 'AudioPlayer', `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
  };

  const downloadAudio = (audioUrl: string, responseId: string) => {
    try {
      const link = document.createElement('a');
      link.href = getDirectDownloadUrl(audioUrl);
      link.download = `recording-${responseId}.mp3`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Download Started", description: "Check your downloads folder." });
    } catch (error) {
      toast({ title: "Download Failed", description: "Try opening in Drive.", variant: "destructive" });
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "0s";
    const capped = Math.min(Math.max(0, seconds), 30);
    const mins = Math.floor(capped / 60);
    const secs = Math.floor(capped % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'accepted': return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2, label: 'Accepted' };
      case 'rejected': return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle, label: 'Rejected' };
      default: return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Timer, label: 'Pending Review' };
    }
  };

  if (loading) {
    return <PageSkeleton stats={2} rows={5} />;
  }

  return (
    <div className="min-h-screen relative w-full bg-slate-50 font-sans selection:bg-blue-100">
      <CleanBackground />
      
      {/* --- Sticky Header (Centered Title) --- */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 mb-6">
        <div className="max-w-3xl mx-auto px-4 py-4 relative flex items-center justify-center">
          
          {/* Back Button (Absolute Left) */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/dashboard")} 
            className="absolute left-4 rounded-full hover:bg-slate-100 text-slate-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Centered Title */}
          <div className="text-center">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              My Responses
            </h1>
          </div>

          {/* Total Duration (Absolute Right - Hidden on very small screens if needed, or kept compact) */}
          {responses.length > 0 && (
            <div className="absolute right-4 hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-slate-700">
                {formatDuration(totalDuration)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* --- Content Area --- */}
      <div className="max-w-3xl mx-auto px-4 pb-12 space-y-6 relative z-10">
        
        {/* Mobile Duration Summary (Visible only on small screens) */}
        {responses.length > 0 && (
          <div className="sm:hidden flex justify-center pb-2">
            <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur border border-slate-200 px-3 py-1 rounded-full shadow-sm">
               <Clock className="h-3.5 w-3.5 text-blue-600" />
               <span className="text-xs font-medium text-slate-600">Total Recorded: {formatDuration(totalDuration)}</span>
            </div>
          </div>
        )}

        {/* Summary Cards for Accepted & Rejected Duration */}
        {responses.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {/* Accepted Duration Card */}
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-0 shadow-sm overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-bold text-emerald-700">
                      {formatDuration(acceptedDuration)}
                    </p>
                    <p className="text-xs font-medium text-emerald-600/80 truncate">
                      Accepted Duration
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rejected Duration Card */}
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-0 shadow-sm overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-sm">
                    <XCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-bold text-red-700">
                      {formatDuration(rejectedDuration)}
                    </p>
                    <p className="text-xs font-medium text-red-600/80 truncate">
                      Rejected Duration
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {responses.length === 0 ? (
          <div className="mt-12 bg-white/60 backdrop-blur-sm border border-white/60 rounded-3xl p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Headphones className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Responses Yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-8">
              Your recording history will appear here once you start completing the assessment questions.
            </p>
            <Button onClick={() => navigate("/dashboard")} className="rounded-full bg-slate-900 text-white px-8">
              Start Assessment
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {responses.map((response) => {
              const status = getStatusStyles(response.status);
              const StatusIcon = status.icon;
              
              return (
                <div 
                  key={response.id} 
                  className="group bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-300 border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-md"
                >
                  {/* Card Header: Status Bar */}
                  <div className={`px-6 py-3 border-b border-slate-100 flex items-center justify-between ${status.bg} bg-opacity-30`}>
                    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${status.color}`}>
                      <StatusIcon className="h-4 w-4" />
                      {status.label}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(response.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Question Text */}
                    <h3 className="text-lg font-semibold text-slate-800 leading-snug mb-6">
                      {response.questions.question_text}
                    </h3>

                    {/* Content: Audio Player (Simplified Layout) */}
                    {response.audio_file_url ? (
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <div className="flex items-center gap-4">
                          
                          {/* Play Button */}
                          <button
                            onClick={() => togglePlayAudio(response.audio_file_url!)}
                            className="flex-shrink-0 h-12 w-12 rounded-full bg-slate-900 hover:bg-blue-600 text-white flex items-center justify-center transition-colors shadow-lg shadow-slate-200 hover:shadow-blue-200"
                            title="Open Audio Player"
                          >
                            <Play className="h-5 w-5 ml-1 fill-current" />
                          </button>

                          {/* Text Label (Replaces Waveform) */}
                          <div className="flex-1 flex flex-col justify-center cursor-pointer" onClick={() => togglePlayAudio(response.audio_file_url!)}>
                             <span className="text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors">
                               Play Recording
                             </span>
                             <span className="text-xs text-slate-400">
                               Opens in popup
                             </span>
                          </div>

                          {/* Duration Badge */}
                          <div className="text-xs font-mono font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                            {formatDuration(response.duration_seconds)}
                          </div>
                        </div>

                        {/* Action Toolbar */}
                        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-200/60">
                           <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadAudio(response.audio_file_url!, response.id)}
                            className="h-8 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                          >
                            <Download className="h-3.5 w-3.5 mr-2" />
                            Download
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(getViewUrl(response.audio_file_url!), '_blank')}
                            className="h-8 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-2" />
                            Drive
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Text Response Fallback
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-600 text-sm leading-relaxed">
                        {response.text_response || "No content available."}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyResponses;