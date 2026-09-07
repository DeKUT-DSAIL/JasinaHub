import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Users, BarChart3, CheckCircle, XCircle, Timer } from "lucide-react";

interface AdminStatsCardsProps {
  questionsCount: number;
  totalUsers: number;
  totalResponses: number;
  acceptedResponses: number;
  rejectedResponses: number;
  acceptedDurationSeconds: number;
  rejectedDurationSeconds: number;
  totalDurationSeconds: number;
  totalTranscribed: number;
  verifiedTranscriptions: number;
  pendingTranscriptions: number;
  acceptedMigratedCount: number;
}

// Format seconds into hrs, mins, secs
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Animated counter hook
function useCountUp(target: number, duration = 1000): number {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setValue(target);
      return;
    }

    const start = prevTarget.current;
    prevTarget.current = target;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(start + (target - start) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

const STAT_COLORS: Record<string, string> = {
  Questions: "hsl(217, 91%, 60%)",   // blue
  Users: "hsl(160, 84%, 39%)",       // emerald
  Responses: "hsl(38, 92%, 50%)",    // amber
  Accepted: "hsl(142, 71%, 45%)",    // green
  Rejected: "hsl(0, 84%, 60%)",      // red
  "Total Time": "hsl(239, 84%, 67%)",    // indigo
  "Accepted Time": "hsl(142, 71%, 45%)", // green
  "Rejected Time": "hsl(0, 84%, 60%)",   // red
  "Verified Transcriptions": "hsl(142, 71%, 45%)", // green
  "Pending Verification": "hsl(38, 92%, 50%)", // amber
};

export function AdminStatsCards({
  questionsCount,
  totalUsers,
  totalResponses,
  acceptedResponses,
  rejectedResponses,
  acceptedDurationSeconds,
  rejectedDurationSeconds,
  totalDurationSeconds,
  verifiedTranscriptions,
  pendingTranscriptions,
}: AdminStatsCardsProps) {
  const mainStats = [
    { label: "Questions", value: questionsCount, isDuration: false, icon: FileText },
    { label: "Users", value: totalUsers, isDuration: false, icon: Users },
    { label: "Responses", value: totalResponses, isDuration: false, icon: BarChart3 },
    { label: "Total Time", value: totalDurationSeconds, isDuration: true, icon: Timer },
    { label: "Accepted", value: acceptedResponses, isDuration: false, icon: CheckCircle },
    { label: "Rejected", value: rejectedResponses, isDuration: false, icon: XCircle },
    { label: "Accepted Time", value: acceptedDurationSeconds, isDuration: true, icon: Timer },
    { label: "Rejected Time", value: rejectedDurationSeconds, isDuration: true, icon: Timer },
    { label: "Verified Transcriptions", value: verifiedTranscriptions, isDuration: false, icon: CheckCircle },
    { label: "Pending Verification", value: pendingTranscriptions, isDuration: false, icon: Timer },
  ];

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
        {mainStats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            isDuration={stat.isDuration}
            icon={stat.icon}
            color={STAT_COLORS[stat.label] || "hsl(0, 0%, 50%)"}
          />
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  isDuration,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  isDuration: boolean;
  icon: React.ElementType;
  color: string;
}) {
  const animatedValue = useCountUp(value, 900);
  const displayValue = isDuration
    ? formatDuration(Math.round(animatedValue))
    : formatNumber(Math.round(animatedValue));

  return (
    <Card
      className="group border border-border/50 shadow-none hover:shadow-md transition-all duration-200 bg-card/60 backdrop-blur-sm"
      style={{ '--card-accent': color } as React.CSSProperties}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = color)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4" style={{ color }} />
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">
            {label}
          </span>
        </div>
        <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          {displayValue}
        </p>
      </CardContent>
    </Card>
  );
}
