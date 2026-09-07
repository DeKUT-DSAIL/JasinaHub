import { AlertCircle, Upload, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PendingRecording {
  questionId: string;
  timestamp: number;
  duration: number;
  metadata: {
    userName: string;
    questionText: string;
  };
}

interface RecoveryDialogProps {
  open: boolean;
  pendingRecordings: PendingRecording[];
  onResume: (questionId: string) => void;
  onDiscard: (questionId: string) => void;
  onDiscardAll: () => void;
}

export const RecoveryDialog = ({
  open,
  pendingRecordings,
  onResume,
  onDiscard,
  onDiscardAll,
}: RecoveryDialogProps) => {
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            <DialogTitle>Unsaved Recordings Found</DialogTitle>
          </div>
          <DialogDescription>
            We found {pendingRecordings.length} recording{pendingRecordings.length > 1 ? "s" : ""} that{" "}
            {pendingRecordings.length > 1 ? "weren't" : "wasn't"} uploaded. Would you like to resume uploading?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {pendingRecordings.map((recording) => (
            <div
              key={recording.questionId}
              className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{recording.metadata.questionText}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {formatDuration(recording.duration)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatTimestamp(recording.timestamp)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onResume(recording.questionId)}
                  className="shrink-0"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDiscard(recording.questionId)}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onDiscardAll}>
            <Trash2 className="h-4 w-4 mr-2" />
            Discard All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
