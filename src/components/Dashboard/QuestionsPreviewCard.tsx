import { Button } from "@/components/ui/button";
import { Mic, ChevronRight, Play, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question_text: string;
  order_index: number;
}

interface QuestionsPreviewCardProps {
  questions: Question[];
  completedQuestionIds: Set<string>;
  totalQuestions: number;
  completedCount: number;
  isVerified: boolean;
  isAdmin: boolean;
  onStartRecording: () => void;
}

export const QuestionsPreviewCard = ({
  questions,
  completedQuestionIds,
  totalQuestions,
  completedCount,
  isVerified,
  isAdmin,
  onStartRecording,
}: QuestionsPreviewCardProps) => {
  const hasStarted = completedCount > 0;
  const isComplete = completedCount === totalQuestions && totalQuestions > 0;
  
  // Find the next unanswered question
  const nextQuestion = questions.find(q => !completedQuestionIds.has(q.id)) || null;

  return (
    <div className="bg-gradient-to-br from-primary to-blue-600 text-white p-4 sm:p-6 rounded-3xl shadow-lg relative overflow-hidden motion-safe:transition-transform motion-safe:hover:scale-[1.01] duration-300">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none" aria-hidden="true" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <div className="p-1.5 sm:p-2 bg-white/10 rounded-lg backdrop-blur-md border border-white/10">
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </div>
            <span className="hidden sm:inline">Health Questions</span>
            <span className="sm:hidden">Questions</span>
          </h3>
          {isComplete ? (
            <div className="flex items-center gap-1 text-xs font-medium bg-white/20 px-2 py-1 rounded-lg">
              <CheckCircle2 className="w-3 h-3" />
              Done
            </div>
          ) : (
            <div className="text-xs font-medium bg-white/20 px-2 py-1 rounded-lg">
              {completedCount}/{totalQuestions}
            </div>
          )}
        </div>

        {/* Next Question Preview - Only show the next unanswered question */}
        <div className="mb-3 sm:mb-4">
          {nextQuestion ? (
            <div className="bg-white/20 border border-white/20 p-3 sm:p-4 rounded-xl">
              <div className="flex items-start gap-2 sm:gap-3">
                {/* Play indicator */}
                <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white text-primary flex items-center justify-center">
                  <Play className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5" />
                </div>
                
                {/* Question text */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs text-white/70 mb-1">Next question</p>
                  <p className="text-sm sm:text-base font-medium line-clamp-2">
                    {nextQuestion.question_text}
                  </p>
                </div>
              </div>
            </div>
          ) : isComplete ? (
            <div className="bg-white/20 border border-white/20 p-3 sm:p-4 rounded-xl text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-white/80" />
              <p className="text-sm font-medium">All questions completed!</p>
              <p className="text-xs text-white/70 mt-1">Thank you for your responses</p>
            </div>
          ) : (
            <div className="bg-white/20 border border-white/20 p-3 sm:p-4 rounded-xl text-center">
              <p className="text-sm text-white/80">No questions available</p>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <Button 
          onClick={onStartRecording}
          disabled={isComplete}
          className="w-full h-10 sm:h-12 bg-white text-primary font-bold shadow-lg rounded-xl border-none disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base hover:bg-white/90 hover:scale-[1.02] motion-safe:transition-all"
          aria-label={isComplete ? "All questions completed" : hasStarted ? "Continue recording" : "Start recording"}
        >
          {isComplete ? "All Done!" : hasStarted ? "Continue Recording" : "Start Recording"}
          {!isComplete && <ChevronRight className="w-4 h-4 ml-1" aria-hidden="true" />}
        </Button>
      </div>
    </div>
  );
};
