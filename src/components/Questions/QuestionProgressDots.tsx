import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface QuestionProgressDotsProps {
  total: number;
  current: number;
  completed: Set<string>;
  questionIds: string[];
  onDotClick?: (index: number) => void;
  className?: string;
}

export const QuestionProgressDots = ({
  total,
  current,
  completed,
  questionIds,
  onDotClick,
  className,
}: QuestionProgressDotsProps) => {
  // For many questions, show a compact view
  const showCompact = total > 10;
  
  if (showCompact) {
    // Show first 3, current area (current-1 to current+1), and last 3
    const dotsToShow: number[] = [];
    const addedIndices = new Set<number>();
    
    // First 2
    for (let i = 0; i < Math.min(2, total); i++) {
      if (!addedIndices.has(i)) {
        dotsToShow.push(i);
        addedIndices.add(i);
      }
    }
    
    // Around current
    for (let i = Math.max(0, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      if (!addedIndices.has(i)) {
        dotsToShow.push(i);
        addedIndices.add(i);
      }
    }
    
    // Last 2
    for (let i = Math.max(0, total - 2); i < total; i++) {
      if (!addedIndices.has(i)) {
        dotsToShow.push(i);
        addedIndices.add(i);
      }
    }
    
    dotsToShow.sort((a, b) => a - b);
    
    return (
      <div 
        className={cn("flex items-center justify-center gap-0.5 sm:gap-1", className)}
        role="navigation"
        aria-label="Question progress"
      >
        {dotsToShow.map((index, arrayIndex) => {
          const questionId = questionIds[index];
          const isCompleted = completed.has(questionId);
          const isCurrent = index === current;
          const showEllipsis = arrayIndex > 0 && dotsToShow[arrayIndex - 1] < index - 1;
          
          return (
            <div key={index} className="flex items-center gap-0.5 sm:gap-1">
              {showEllipsis && (
                <span className="text-muted-foreground text-[10px] sm:text-xs px-0.5">••</span>
              )}
              <button
                onClick={() => isCompleted && onDotClick?.(index)}
                disabled={!isCompleted && index !== current}
                className={cn(
                  "transition-all duration-200 flex items-center justify-center",
                  isCurrent 
                    ? "w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground shadow-md scale-105 sm:scale-110" 
                    : isCompleted 
                      ? "w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer" 
                      : "w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-muted"
                )}
                aria-label={`Question ${index + 1}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCurrent ? (
                  <span className="text-[10px] sm:text-xs font-bold">{index + 1}</span>
                ) : isCompleted ? (
                  <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  // Standard view for fewer questions
  return (
    <div 
      className={cn("flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap", className)}
      role="navigation"
      aria-label="Question progress"
    >
      {Array.from({ length: total }, (_, index) => {
        const questionId = questionIds[index];
        const isCompleted = completed.has(questionId);
        const isCurrent = index === current;
        
        return (
          <button
            key={index}
            onClick={() => isCompleted && onDotClick?.(index)}
            disabled={!isCompleted && index !== current}
            className={cn(
              "transition-all duration-200 flex items-center justify-center",
              isCurrent 
                ? "w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground shadow-md scale-105 sm:scale-110" 
                : isCompleted 
                  ? "w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer" 
                  : "w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-muted hover:bg-muted/80"
            )}
            aria-label={`Question ${index + 1}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            {isCurrent ? (
              <span className="text-[10px] sm:text-xs font-bold">{index + 1}</span>
            ) : isCompleted ? (
              <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
};
