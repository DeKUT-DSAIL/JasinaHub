import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SkipForward } from "lucide-react";

interface SkipConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmSkip: () => void;
  questionNumber: number;
}

const STORAGE_KEY = "skip_confirmation_disabled";

export const SkipConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirmSkip,
  questionNumber,
}: SkipConfirmationDialogProps) => {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  const handleConfirm = () => {
    if (dontAskAgain) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    onConfirmSkip();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-2">
            <SkipForward className="w-6 h-6 text-amber-600" aria-hidden="true" />
          </div>
          <AlertDialogTitle className="text-center">
            Skip Question {questionNumber}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            You haven't recorded an answer for this question. Are you sure you want to skip it? You can come back later to answer skipped questions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="flex items-center space-x-2 py-4 justify-center">
          <Checkbox
            id="dontAskAgain"
            checked={dontAskAgain}
            onCheckedChange={(checked) => setDontAskAgain(checked as boolean)}
          />
          <Label
            htmlFor="dontAskAgain"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Don't ask me again
          </Label>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="w-full sm:w-auto">
            Go Back
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white"
          >
            Skip Question
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Utility function to check if skip confirmation should be shown
export const shouldShowSkipConfirmation = (): boolean => {
  return localStorage.getItem(STORAGE_KEY) !== "true";
};
