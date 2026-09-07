import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SegmentedProgressProps {
  total: number;
  current: number;
  completed: Set<string>;
  questions: Array<{ id: string }>;
  onQuestionClick?: (index: number) => void;
}

export const SegmentedProgress = ({ 
  total, 
  current, 
  completed, 
  questions,
  onQuestionClick 
}: SegmentedProgressProps) => {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {Array.from({ length: total }).map((_, index) => {
        const isCompleted = questions[index] && completed.has(questions[index].id);
        const isCurrent = index === current;
        const isPast = index < current;
        
        return (
          <button
            key={index}
            onClick={() => onQuestionClick?.(index)}
            disabled={!onQuestionClick}
            className={cn(
              "relative flex items-center justify-center transition-all duration-300",
              "w-8 h-8 rounded-full border-2",
              onQuestionClick && "cursor-pointer hover:scale-110",
              isCurrent && "scale-110 animate-pulse",
              isCompleted && "bg-primary border-primary text-primary-foreground",
              isCurrent && !isCompleted && "border-primary bg-primary/10 text-primary",
              !isCurrent && !isCompleted && isPast && "border-muted bg-muted text-muted-foreground",
              !isCurrent && !isCompleted && !isPast && "border-border bg-background text-muted-foreground"
            )}
            aria-label={`Question ${index + 1}${isCompleted ? ' - Completed' : isCurrent ? ' - Current' : ''}`}
          >
            {isCompleted ? (
              <Check className="w-4 h-4" />
            ) : (
              <span className="text-xs font-semibold">{index + 1}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
