import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight, FlaskConical, Clock, Copy, MinusCircle, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { allSuites, runSuites, TestResult, TestStatus } from "@/lib/tests";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function statusIcon(s: TestStatus) {
  switch (s) {
    case "passed": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "failed": return <XCircle className="w-4 h-4 text-red-500" />;
    case "running": return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
    case "skipped": return <MinusCircle className="w-4 h-4 text-muted-foreground" />;
    default: return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
}

export function AdminTestsTab() {
  const { toast } = useToast();
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [running, setRunning] = useState(false);
  const [includeDestructive, setIncludeDestructive] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [totalDuration, setTotalDuration] = useState(0);

  const summary = useMemo(() => {
    const list = Object.values(results);
    return {
      total: list.length,
      passed: list.filter(r => r.status === "passed").length,
      failed: list.filter(r => r.status === "failed").length,
      skipped: list.filter(r => r.status === "skipped").length,
    };
  }, [results]);

  const totalTests = allSuites.reduce((acc, s) => acc + s.tests.length, 0);

  const passRate = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0;
  const failRate = summary.total > 0 ? (summary.failed / summary.total) * 100 : 0;
  const skipRate = summary.total > 0 ? (summary.skipped / summary.total) * 100 : 0;
  const completionRate = totalTests > 0 ? (summary.total / totalTests) * 100 : 0;

  const healthColor =
    passRate >= 90 ? "text-emerald-600" :
    passRate >= 70 ? "text-amber-600" :
    passRate > 0 ? "text-red-600" : "text-muted-foreground";

  async function handleRun(suitesToRun = allSuites) {
    setRunning(true);
    setResults({});
    const start = performance.now();
    await runSuites(suitesToRun, {
      includeDestructive,
      onTestStart: (suiteId, testId) => {
        setResults(prev => ({
          ...prev,
          [`${suiteId}.${testId}`]: {
            suiteId, testId, name: testId, status: "running", durationMs: 0,
          },
        }));
      },
      onResult: (r) => {
        setResults(prev => ({ ...prev, [`${r.suiteId}.${r.testId}`]: r }));
      },
    });
    setTotalDuration(Math.round(performance.now() - start));
    setRunning(false);
  }

  function copyJson() {
    const out = JSON.stringify(Object.values(results), null, 2);
    navigator.clipboard.writeText(out);
    toast({ title: "Copied", description: "Test results copied as JSON" });
  }

  function toggle(key: string) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <CardTitle className="text-base">Test Runner</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 mr-3">
                <Switch
                  id="destructive"
                  checked={includeDestructive}
                  onCheckedChange={setIncludeDestructive}
                  disabled={running}
                />
                <Label htmlFor="destructive" className="text-xs cursor-pointer">
                  Include destructive tests
                </Label>
              </div>
              <Button
                onClick={() => handleRun()}
                disabled={running}
                size="sm"
              >
                {running ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Running…</>) : "Run all tests"}
              </Button>
              <Button
                onClick={copyJson}
                variant="outline"
                size="sm"
                disabled={!summary.total}
              >
                <Copy className="w-4 h-4 mr-1" /> Copy JSON
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
              >
                <a
                  href="/FasiriNET_Test_Plan_v1.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <FileText className="w-4 h-4 mr-1" /> Test Plan PDF
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Headline pass rate */}
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Overall pass rate
                </div>
                <div className={cn("text-4xl font-bold tabular-nums", healthColor)}>
                  {passRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {summary.passed} of {summary.total} executed tests passed
                  {totalDuration > 0 && !running && <> · {(totalDuration / 1000).toFixed(2)}s</>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Coverage
                </div>
                <div className="text-2xl font-bold tabular-nums text-foreground">
                  {completionRate.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {summary.total} / {totalTests} tests run
                </div>
              </div>
            </div>

            {/* Stacked bar */}
            {summary.total > 0 && (
              <div className="space-y-2">
                <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
                  <div className="bg-emerald-500 transition-all" style={{ width: `${passRate}%` }} />
                  <div className="bg-red-500 transition-all" style={{ width: `${failRate}%` }} />
                  <div className="bg-muted-foreground/40 transition-all" style={{ width: `${skipRate}%` }} />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">Passed</span>
                    <span className="font-semibold text-emerald-600 tabular-nums">
                      {summary.passed} ({passRate.toFixed(1)}%)
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-muted-foreground">Failed</span>
                    <span className="font-semibold text-red-600 tabular-nums">
                      {summary.failed} ({failRate.toFixed(1)}%)
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                    <span className="text-muted-foreground">Skipped</span>
                    <span className="font-semibold tabular-nums">
                      {summary.skipped} ({skipRate.toFixed(1)}%)
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {allSuites.map(suite => {
          const suiteResults = suite.tests.map(t => results[`${suite.id}.${t.id}`]);
          const passedCount = suiteResults.filter(r => r?.status === "passed").length;
          const failedCount = suiteResults.filter(r => r?.status === "failed").length;
          const skippedCount = suiteResults.filter(r => r?.status === "skipped").length;
          const ranCount = passedCount + failedCount + skippedCount;
          const suitePassRate = ranCount > 0 ? (passedCount / ranCount) * 100 : 0;
          const suitePassColor =
            ranCount === 0 ? "text-muted-foreground" :
            suitePassRate === 100 ? "text-emerald-600" :
            suitePassRate >= 70 ? "text-amber-600" : "text-red-600";

          return (
            <Card key={suite.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {suite.name}
                      <span className={cn("text-sm font-bold tabular-nums", suitePassColor)}>
                        {ranCount > 0 ? `${suitePassRate.toFixed(0)}%` : "—"}
                      </span>
                    </CardTitle>
                    {suite.description && (
                      <p className="text-xs text-muted-foreground mt-1">{suite.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {passedCount > 0 && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{passedCount} ✓</Badge>}
                    {failedCount > 0 && <Badge className="bg-red-500/10 text-red-600 border-red-500/20">{failedCount} ✘</Badge>}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRun([suite])}
                      disabled={running}
                    >
                      Run suite
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-border">
                  {suite.tests.map(test => {
                    const key = `${suite.id}.${test.id}`;
                    const r = results[key];
                    const isOpen = expanded[key];
                    const hasDetails = !!(r?.error || r?.details);
                    return (
                      <div key={key} className="py-2">
                        <button
                          className={cn(
                            "w-full flex items-center gap-3 text-left text-sm py-1 rounded-md px-1 hover:bg-muted/50 transition",
                            !hasDetails && "cursor-default hover:bg-transparent"
                          )}
                          onClick={() => hasDetails && toggle(key)}
                          disabled={!hasDetails}
                        >
                          {statusIcon(r?.status ?? "pending")}
                          <span className="flex-1">{test.name}</span>
                          {test.destructive && (
                            <Badge variant="outline" className="text-[10px]">destructive</Badge>
                          )}
                          {r && r.status !== "running" && r.status !== "pending" && (
                            <span className="text-xs text-muted-foreground tabular-nums">{r.durationMs} ms</span>
                          )}
                          {hasDetails && (isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />)}
                        </button>
                        {isOpen && hasDetails && (
                          <div className="ml-7 mt-2 mb-1 rounded-md bg-muted/40 border border-border p-3 text-xs font-mono whitespace-pre-wrap break-words">
                            {r?.error && (
                              <div className="text-red-600 mb-2">
                                <strong>Error:</strong> {r.error}
                              </div>
                            )}
                            {r?.details !== undefined && r?.details !== null && (
                              <div className="text-muted-foreground">
                                <strong>Details:</strong>
                                {"\n"}
                                {typeof r.details === "string"
                                  ? r.details
                                  : JSON.stringify(r.details, null, 2)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}