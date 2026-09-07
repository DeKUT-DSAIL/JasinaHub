import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, AlertTriangle } from "lucide-react";

export function TranscriptionGuidelinesReference() {
  return (
    <Card className="bg-card/80 backdrop-blur-md border border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          Guidelines (quick reference)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <a
            href="#tg-core"
            className="text-xs px-2.5 py-1 rounded-full border bg-background/60 hover:bg-background transition-colors"
          >
            Core rules
          </a>
          <a
            href="#tg-skip"
            className="text-xs px-2.5 py-1 rounded-full border bg-background/60 hover:bg-background transition-colors"
          >
            When to skip
          </a>
        </div>

        <div id="tg-core" className="space-y-2 scroll-mt-24">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Core rules</p>
          <ul className="space-y-1.5 text-sm text-foreground leading-relaxed">
            <li>
              Write <span className="font-semibold">exactly</span> what you hear (don’t “fix” wording).
            </li>
            <li>Use natural punctuation and capitalization.</li>
            <li>
              Numbers as <span className="font-semibold">words</span> (e.g. “twenty-three”, not “23”).
            </li>
            <li>
              Mark non-Kikuyu words with{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">[cs]</code>.
            </li>
            <li>
              Use{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">[Pause]</code>{" "}
              for pauses longer than 1–2 seconds.
            </li>
          </ul>
        </div>

        <div id="tg-skip" className="rounded-lg border border-amber-200/60 bg-amber-50/60 p-3 scroll-mt-24">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-xs font-semibold text-amber-900">When to skip</p>
          </div>
          <ul className="space-y-1.5 text-sm text-amber-950/90 leading-relaxed">
            <li>
              <Badge className="bg-amber-500/90 text-white mr-2" variant="secondary">
                Skip
              </Badge>
              More than 2 seconds of pause.
            </li>
            <li>
              <Badge className="bg-amber-500/90 text-white mr-2" variant="secondary">
                Skip
              </Badge>
              More than two filler words.
            </li>
            <li>
              <Badge className="bg-amber-500/90 text-white mr-2" variant="secondary">
                Skip
              </Badge>
              More than two prolonged words.
            </li>
          </ul>
        </div>

        <div className="text-xs text-muted-foreground leading-relaxed">
          Tip: keep this panel open while typing—consistency matters more than perfection.
        </div>
      </CardContent>
    </Card>
  );
}

