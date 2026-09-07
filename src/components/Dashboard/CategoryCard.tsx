import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, Clock, CheckCircle } from "lucide-react";

interface CategoryCardProps {
  title: string;
  description: string;
  questionsCount: number;
  completedCount: number;
  estimatedTime: string;
  onStart: () => void;
}

export const CategoryCard = ({
  title,
  description,
  questionsCount,
  completedCount,
  estimatedTime,
  onStart,
}: CategoryCardProps) => {
  const isCompleted = completedCount === questionsCount;
  const progressPercentage = (completedCount / questionsCount) * 100;

  return (
    <Card className="category-card group cursor-pointer">
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-inter font-bold text-foreground mb-2">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground font-inter leading-relaxed">
              {description}
            </p>
          </div>
          {isCompleted && (
            <CheckCircle className="w-6 h-6 text-primary ml-4 flex-shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
          <div className="flex items-center gap-1">
            <PlayCircle className="w-4 h-4" />
            <span>{questionsCount} questions</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{estimatedTime}</span>
          </div>
        </div>

        {completedCount > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-primary">
                {completedCount}/{questionsCount}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        <Button
          onClick={onStart}
          variant={isCompleted ? "secondary" : "default"}
          className="w-full mt-auto"
        >
          {isCompleted ? "Review Responses" : completedCount > 0 ? "Continue" : "Start"}
        </Button>
      </div>
    </Card>
  );
};