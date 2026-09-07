import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Home, LogOut, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuestionsHeaderProps {
  progress: number;
  currentIndex: number;
  totalQuestions: number;
  localSaveStatus: 'saved' | 'uploading' | 'uploaded' | null;
  onLogout: () => void;
}

export function QuestionsHeader({ 
  progress, 
  currentIndex, 
  totalQuestions,
  localSaveStatus,
  onLogout,
}: QuestionsHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="gap-1 sm:gap-2 text-slate-600 hover:text-slate-900 h-8 sm:h-9 px-2 sm:px-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
          
          <div className="flex items-center gap-2">
            {localSaveStatus && (
              <Badge 
                variant="outline" 
                className={`text-xs gap-1 ${
                  localSaveStatus === 'uploaded' ? 'bg-green-50 text-green-700 border-green-200' :
                  localSaveStatus === 'uploading' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <Save className="w-3 h-3" />
                {localSaveStatus === 'uploaded' ? 'Saved' : 
                 localSaveStatus === 'uploading' ? 'Uploading...' : 'Saved locally'}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
            >
              <Home className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="h-8 w-8 p-0 text-slate-600 hover:text-red-600"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600">
            <span>Question {currentIndex + 1} of {totalQuestions}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2 bg-slate-100" />
        </div>
      </div>
    </header>
  );
}
