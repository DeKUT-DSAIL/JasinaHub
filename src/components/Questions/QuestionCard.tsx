import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  image_url: string | null;
  image_attribution?: string | null;
  category_id: string;
  order_index: number;
}

interface QuestionCardProps {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  children: React.ReactNode;
}

export function QuestionCard({ question, currentIndex, totalQuestions, children }: QuestionCardProps) {
  return (
    <Card className="bg-white/90 backdrop-blur-md shadow-xl border-0 rounded-2xl sm:rounded-3xl overflow-hidden">
      <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-md">
              {question.order_index + 1}
            </div>
            <div>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-xs">
                Question {currentIndex + 1} of {totalQuestions}
              </Badge>
            </div>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 rounded-full flex items-center justify-center">
            <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Question Image */}
        {question.image_url && (
          <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-md">
            <img 
              src={question.image_url} 
              alt="Question visual"
              className="w-full h-40 sm:h-48 md:h-56 object-cover"
              loading="lazy"
            />
            {question.image_attribution && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <p className="text-white/80 text-xs">{question.image_attribution}</p>
              </div>
            )}
          </div>
        )}

        {/* Question Text */}
        <div className="space-y-2 sm:space-y-3">
          <p className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 leading-relaxed">
            {question.question_text}
          </p>
        </div>

        {/* Children (VoiceRecorder, AudioPlayback, etc.) */}
        {children}
      </CardContent>
    </Card>
  );
}
