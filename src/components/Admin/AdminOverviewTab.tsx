import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, BarChart3, ShieldCheck } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { AdminStatsCards } from "./AdminStatsCards";

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

interface ChartData {
  responses_over_time: { day: string; count: number }[] | null;
  transcriptions_over_time: { day: string; count: number }[] | null;
  status_distribution: { status: string; count: number }[] | null;
  transcription_status_distribution: { status: string; count: number }[] | null;
  top_contributors: { name: string; count: number }[] | null;
  top_transcription_contributors: { name: string; count: number }[] | null;
}
interface ActionCounts {
  unverifiedUsers: number;
  pendingResponses: number;
  pendingTranscribers: number;
}

const TRANSCRIPTION_STATUS_COLORS: Record<string, string> = {
  pending: "hsl(45, 93%, 47%)",
  accepted: "hsl(142, 71%, 45%)",
  rejected: "hsl(0, 84%, 60%)",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="tabular-nums">
          {p.name}: {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const total = item.payload?.total || 0;
  const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground capitalize mb-1">{item.name}</p>
      <p style={{ color: item.payload?.fill }} className="tabular-nums">
        {item.value?.toLocaleString()} ({percentage}%)
      </p>
    </div>
  );
};

export function AdminOverviewTab({
  onActionClick,
  stats
}: {
  onActionClick?: (tab: string) => void,
  stats: AdminStatsCardsProps
}) {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionCounts, setActionCounts] = useState<ActionCounts>({
    unverifiedUsers: 0,
    pendingResponses: 0,
    pendingTranscribers: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          { data: result, error },
          unverifiedRes,
          pendingResponsesRes,
          pendingTranscribersRes,
        ] = await Promise.all([
          supabase.rpc("get_admin_chart_data" as any),
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("verified", false),
          supabase
            .from("voice_responses")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("transcription_guidelines_agreed", true)
            .eq("transcription_approved", false),
        ]);

        if (error) throw error;
        setData(result as unknown as ChartData);

        setActionCounts({
          unverifiedUsers: unverifiedRes.count || 0,
          pendingResponses: pendingResponsesRes.count || 0,
          pendingTranscribers: pendingTranscribersRes.count || 0,
        });
      } catch (err) {
        console.error("Error fetching admin overview data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent><Skeleton className="h-56 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No data available yet.
        </CardContent>
      </Card>
    );
  }

  const formatDay = (day: string) => {
    const d = new Date(day);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Overall Stats Cards */}
      <AdminStatsCards {...stats} />

      {/* Action items */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Action items
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            <button
              onClick={() => onActionClick?.('users')}
              className="w-full flex items-center justify-between p-4 hover:bg-amber-500/5 transition-colors group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                <span className="font-medium text-foreground">User accounts waiting for verification</span>
              </div>
              <Badge className="bg-amber-500 text-white min-w-[2.25rem] justify-center rounded-lg shadow-sm">
                {actionCounts.unverifiedUsers}
              </Badge>
            </button>

            <button
              onClick={() => onActionClick?.('responses')}
              className="w-full flex items-center justify-between p-4 hover:bg-blue-500/5 transition-colors group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <span className="font-medium text-foreground">Responses pending review</span>
              </div>
              <Badge className="bg-blue-500 text-white min-w-[2.25rem] justify-center rounded-lg shadow-sm">
                {actionCounts.pendingResponses}
              </Badge>
            </button>

            <button
              onClick={() => onActionClick?.('transcriptions')}
              className="w-full flex items-center justify-between p-4 hover:bg-emerald-500/5 transition-colors group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="font-medium text-foreground">Transcribers awaiting approval</span>
              </div>
              <Badge className="bg-emerald-500 text-white min-w-[2.25rem] justify-center rounded-lg shadow-sm">
                {actionCounts.pendingTranscribers}
              </Badge>
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Responses Over Time */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Responses Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.responses_over_time || []}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tickFormatter={formatDay} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" name="Responses" stroke="hsl(var(--primary))" fill="url(#colorCount)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Transcriptions Over Time */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Transcriptions Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.transcriptions_over_time || []}>
                  <defs>
                    <linearGradient id="colorTranscriptions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(270, 70%, 55%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(270, 70%, 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tickFormatter={formatDay} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" name="Transcriptions" stroke="hsl(270, 70%, 55%)" fill="url(#colorTranscriptions)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>


        {/* Response Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Response Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center justify-center">
              {(() => {
                const total = (data.status_distribution || []).reduce((s, e) => s + e.count, 0);
                const pieData = (data.status_distribution || []).map(e => ({ ...e, total }));
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="count" nameKey="status" cx="50%" cy="45%" innerRadius={60} outerRadius={95} paddingAngle={4} strokeWidth={2} stroke="hsl(var(--background))">
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={TRANSCRIPTION_STATUS_COLORS[entry.status] || "hsl(var(--muted))"} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <Legend verticalAlign="bottom" iconType="circle" iconSize={10} formatter={(value: string) => (<span className="text-xs text-foreground capitalize">{value}</span>)} />
                    </PieChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Transcription Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Transcription Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center justify-center">
              {(() => {
                const total = (data.transcription_status_distribution || []).reduce((s, e) => s + e.count, 0);
                const pieData = (data.transcription_status_distribution || []).map(e => ({ ...e, total }));
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="count" nameKey="status" cx="50%" cy="45%" innerRadius={60} outerRadius={95} paddingAngle={4} strokeWidth={2} stroke="hsl(var(--background))">
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={TRANSCRIPTION_STATUS_COLORS[entry.status] || "hsl(var(--muted))"} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <Legend verticalAlign="bottom" iconType="circle" iconSize={10} formatter={(value: string) => (<span className="text-xs text-foreground capitalize">{value}</span>)} />
                    </PieChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Top Recording Contributors */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Top Recording Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.top_contributors || []} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={80} stroke="hsl(var(--border))" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Recordings" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Transcription Contributors */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Top Transcription Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.top_transcription_contributors || []} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={80} stroke="hsl(var(--border))" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Transcriptions" fill="hsl(270, 70%, 55%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
