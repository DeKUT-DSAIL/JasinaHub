import { Button } from "@/components/ui/button";
import { Shield, Mic2, UserCheck } from "lucide-react";

interface ConsentModalProps {
  onAgree: () => void;
  onDecline: () => void;
  isVisible: boolean;
}

export function ConsentModal({ onAgree, onDecline, isVisible }: ConsentModalProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 animate-slide-up">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-blue-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto shadow-lg">
            <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Voice Recording Consent</h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            We need your permission to record voice responses. Your recordings will be used 
            to improve healthcare services and will be stored securely.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
            <Mic2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-900 text-sm">Audio Recording</p>
              <p className="text-slate-600 text-xs">Your voice responses will be recorded and stored</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
            <UserCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-900 text-sm">Data Privacy</p>
              <p className="text-slate-600 text-xs">Your data is encrypted and handled securely</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onDecline}
            className="flex-1 h-11 sm:h-12 text-sm sm:text-base"
          >
            Decline
          </Button>
          <Button
            onClick={onAgree}
            className="flex-1 h-11 sm:h-12 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-sm sm:text-base"
          >
            I Agree
          </Button>
        </div>

        <p className="text-center text-xs text-slate-500">
          By agreeing, you consent to our voice recording policy
        </p>
      </div>
    </div>
  );
}
