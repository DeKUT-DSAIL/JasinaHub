import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Confetti } from "@/components/ui/confetti";
import { 
  CheckCircle, 
  BarChart3, 
  Clock, 
  Home, 
  FileText,
  Award,
  Sparkles
} from "lucide-react";

interface CompletionStats {
  questionsAnswered: number;
  totalDuration: number;
}

export default function Completion() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showConfetti, setShowConfetti] = useState(true);
  const [animateStats, setAnimateStats] = useState(false);
  
  // Get stats from navigation state or use defaults
  const stats: CompletionStats = location.state?.stats || {
    questionsAnswered: 0,
    totalDuration: 0,
  };

  useEffect(() => {
    // Trigger stats animation after a brief delay
    const timer = setTimeout(() => setAnimateStats(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  return (
    <div className="min-h-screen relative w-full bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4 overflow-hidden">
      {/* Confetti celebration */}
      <Confetti 
        active={showConfetti} 
        particleCount={80} 
        duration={4000}
        onComplete={() => setShowConfetti(false)} 
      />

      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Success Card */}
        <Card className="bg-card/80 backdrop-blur-md border-border/50 shadow-2xl overflow-hidden">
          <CardContent className="p-8 text-center">
            {/* Success Icon */}
            <div className={`mx-auto mb-6 transition-all duration-700 ${animateStats ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <CheckCircle className="w-12 h-12 text-primary-foreground" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Title */}
            <div className={`mb-6 transition-all duration-700 delay-100 ${animateStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Assessment Complete!
              </h1>
              <p className="text-muted-foreground">
                Thank you for contributing to health research
              </p>
            </div>

            {/* Stats Grid */}
            <div className={`grid grid-cols-2 gap-4 mb-8 transition-all duration-700 delay-200 ${animateStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.questionsAnswered}
                </p>
                <p className="text-sm text-muted-foreground">Questions Answered</p>
              </div>
              
              <div className="bg-accent/5 rounded-2xl p-4 border border-accent/10">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-5 h-5 text-accent-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {formatDuration(stats.totalDuration)}
                </p>
                <p className="text-sm text-muted-foreground">Total Duration</p>
              </div>
            </div>

            {/* Achievement Badge */}
            <div className={`mb-8 transition-all duration-700 delay-300 ${animateStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <div className="inline-flex items-center gap-2 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 px-4 py-2 rounded-full border border-yellow-500/20">
                <Award className="w-4 h-4" />
                <span className="text-sm font-medium">Health Contributor</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className={`space-y-3 transition-all duration-700 delay-400 ${animateStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <Button 
                onClick={() => navigate('/my-responses')}
                className="w-full h-12 text-base gap-2"
              >
                <FileText className="w-5 h-5" />
                View My Responses
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="w-full h-12 text-base gap-2"
              >
                <Home className="w-5 h-5" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer note */}
        <p className={`text-center text-sm text-muted-foreground mt-6 transition-all duration-700 delay-500 ${animateStats ? 'opacity-100' : 'opacity-0'}`}>
          Your responses are securely stored and encrypted
        </p>
      </div>
    </div>
  );
}
