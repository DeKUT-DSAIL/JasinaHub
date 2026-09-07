import { Button } from "@/components/ui/button";
import { Headphones, ChevronRight } from "lucide-react";

interface TranscribePreviewCardProps {
  isVerified: boolean;
  isAdmin: boolean;
  onStartTranscribing: () => void;
}

export const TranscribePreviewCard = ({
  isVerified,
  isAdmin,
  onStartTranscribing,
}: TranscribePreviewCardProps) => {
  return (
    <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white p-4 sm:p-6 rounded-3xl shadow-lg relative overflow-hidden motion-safe:transition-transform motion-safe:hover:scale-[1.01] duration-300">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none" aria-hidden="true" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <div className="p-1.5 sm:p-2 bg-white/10 rounded-lg backdrop-blur-md border border-white/10">
              <Headphones className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </div>
            <span>Transcription</span>
          </h3>
        </div>

        {/* Description */}
        <div className="mb-3 sm:mb-4">
          <div className="bg-white/20 border border-white/20 p-3 sm:p-4 rounded-xl">
            <p className="text-sm sm:text-base font-medium">
              Listen to accepted recordings and type what you hear
            </p>
            <p className="text-xs text-white/70 mt-1">
              Help improve data quality by transcribing audio
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <Button
          onClick={onStartTranscribing}
          disabled={!isVerified && !isAdmin}
          className="w-full h-10 sm:h-12 bg-white text-purple-600 hover:bg-white/90 font-bold shadow-lg rounded-xl border-none motion-safe:transition-all motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed text-sm sm:text-base"
          aria-label={
            !isVerified && !isAdmin
              ? "Account pending verification"
              : "Start transcribing recordings"
          }
        >
          {!isVerified && !isAdmin ? "Pending Verification" : "Start Transcribing"}
          {(isVerified || isAdmin) && <ChevronRight className="w-4 h-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
};
