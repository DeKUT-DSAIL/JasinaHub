import { TrendingUp, Award, Clock } from "lucide-react";

interface MobileProgressSnippetProps {
  completedQuestions: number;
  totalQuestions: number;
  totalDuration: number;
  expectedDuration?: number; // in seconds, default 1 hour (3600s)
}

export const MobileProgressSnippet = ({
  completedQuestions,
  totalQuestions,
  totalDuration,
  expectedDuration = 3600, // 1 hour default
}: MobileProgressSnippetProps) => {
  // Progress based on time, not questions
  const timeProgress = expectedDuration > 0 ? Math.min((totalDuration / expectedDuration) * 100, 100) : 0;
  
  const formatDuration = (seconds: number): string => {
    if (seconds === null || seconds === undefined || seconds === 0) return "0m 0s";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const isComplete = totalDuration >= expectedDuration;

  return (
    <div className="bg-white/80 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-3">
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="p-2 bg-primary/10 rounded-xl flex-shrink-0">
          <Clock className="w-4 h-4 text-primary" aria-hidden="true" />
        </div>
        
        {/* Progress info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-700">Progress</span>
            <span className="text-xs font-bold text-primary">
              {formatDuration(totalDuration)} / 1h
            </span>
          </div>
          
          {/* Progress bar based on time */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${timeProgress}%` }}
            />
          </div>
        </div>

        {/* Questions count badge */}
        <div className="flex-shrink-0 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg">
          <span className="text-xs font-semibold text-blue-700">
            {completedQuestions}/{totalQuestions}
          </span>
        </div>

        {/* Completion indicator */}
        {isComplete && (
          <div className="flex-shrink-0">
            <Award className="w-4 h-4 text-green-500" aria-label="Completed" />
          </div>
        )}
      </div>
    </div>
  );
};
