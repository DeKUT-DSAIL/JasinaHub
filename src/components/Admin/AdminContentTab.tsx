import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Eye, Edit3, FileEdit, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SiteContent {
  id: string;
  key: string;
  title: string;
  content_md: string;
  updated_at: string;
  updated_by: string | null;
}

type ContentKey = "consent_form" | "privacy_policy";

interface ContentState {
  title: string;
  content_md: string;
  original_title: string;
  original_content_md: string;
  loading: boolean;
  saving: boolean;
  saved: boolean;
  updated_at: string | null;
}

const CONTENT_KEYS: { key: ContentKey; label: string; description: string; icon: string }[] = [
  {
    key: "consent_form",
    label: "Consent Form",
    description: "Shown to participants before they start recording. Explain data usage, rights, and how recordings will be processed.",
    icon: "📋",
  },
  {
    key: "privacy_policy",
    label: "Privacy Policy",
    description: "Displayed on the /privacy-policy page. Detail data collection, retention, sharing, and user rights.",
    icon: "🔒",
  },
];

// ─── Markdown Preview ─────────────────────────────────────────────────────────
// Lightweight renderer — no external deps required.
// Converts a small subset of Markdown (headings, bold, italic, lists, hr, links)
// to HTML-safe JSX-friendly output using dangerouslySetInnerHTML with basic
// escaping. For a full renderer, install react-markdown.
function renderMarkdown(md: string): string {
  if (!md.trim()) return "<p class=\"text-muted-foreground italic\">No content yet — start typing in the editor.</p>";

  let html = md
    // Escape HTML entities first
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Headings
    .replace(/^######\s+(.+)$/gm, "<h6 class=\"text-xs font-bold mt-4 mb-1\">$1</h6>")
    .replace(/^#####\s+(.+)$/gm, "<h5 class=\"text-sm font-bold mt-4 mb-1\">$1</h5>")
    .replace(/^####\s+(.+)$/gm, "<h4 class=\"text-base font-bold mt-4 mb-1\">$1</h4>")
    .replace(/^###\s+(.+)$/gm, "<h3 class=\"text-lg font-bold mt-5 mb-2\">$1</h3>")
    .replace(/^##\s+(.+)$/gm, "<h2 class=\"text-xl font-extrabold mt-6 mb-2\">$1</h2>")
    .replace(/^#\s+(.+)$/gm, "<h1 class=\"text-2xl font-extrabold mt-6 mb-3\">$1</h1>")
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Horizontal rule
    .replace(/^---$/gm, "<hr class=\"my-4 border-border\" />")
    // Unordered lists (simple, no nesting)
    .replace(/^\s*[-*]\s+(.+)$/gm, "<li class=\"ml-4 list-disc\">$1</li>")
    // Ordered lists
    .replace(/^\s*\d+\.\s+(.+)$/gm, "<li class=\"ml-4 list-decimal\">$1</li>")
    // Inline links
    .replace(/\[(.+?)\]\((.+?)\)/g, "<a href=\"$2\" class=\"text-primary underline\" target=\"_blank\" rel=\"noreferrer\">$1</a>")
    // Line breaks → paragraphs (double newline)
    .replace(/\n\n+/g, "</p><p class=\"mb-3\">")
    // Single newlines
    .replace(/\n/g, "<br />");

  // Wrap consecutive <li> in <ul> / <ol>
  html = html
    .replace(/(<li class="ml-4 list-disc">[\s\S]*?<\/li>)(?=<li class="ml-4 list-disc">|<\/p>|<p|<h|<hr|$)/g, (m) => m)
    .replace(/((?:<li class="ml-4 list-disc">.*?<\/li>)+)/g, "<ul class=\"my-2 space-y-1\">$1</ul>")
    .replace(/((?:<li class="ml-4 list-decimal">.*?<\/li>)+)/g, "<ol class=\"my-2 space-y-1\">$1</ol>");

  return `<p class="mb-3">${html}</p>`;
}

// ─── Single Content Editor ────────────────────────────────────────────────────

function ContentEditor({
  contentKey,
  label,
  description,
  icon,
}: {
  contentKey: ContentKey;
  label: string;
  description: string;
  icon: string;
}) {
  const { toast } = useToast();
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [state, setState] = useState<ContentState>({
    title: "",
    content_md: "",
    original_title: "",
    original_content_md: "",
    loading: true,
    saving: false,
    saved: false,
    updated_at: null,
  });

  const isDirty =
    state.title !== state.original_title ||
    state.content_md !== state.original_content_md;

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchContent = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const { data, error } = await supabase
      .from("site_content")
      .select("id, key, title, content_md, updated_at, updated_by")
      .eq("key", contentKey)
      .maybeSingle();

    if (error) {
      console.error(`[AdminContentTab] fetch ${contentKey}:`, error);
      toast({
        title: "Load Error",
        description: `Could not load ${label}: ${error.message}`,
        variant: "destructive",
      });
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    const title = (data as SiteContent | null)?.title ?? "";
    const content_md = (data as SiteContent | null)?.content_md ?? "";
    const updated_at = (data as SiteContent | null)?.updated_at ?? null;

    setState((s) => ({
      ...s,
      title,
      content_md,
      original_title: title,
      original_content_md: content_md,
      updated_at,
      loading: false,
      saved: false,
    }));
  }, [contentKey, label, toast]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setState((s) => ({ ...s, saving: true, saved: false }));

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;

    const payload = {
      title: state.title,
      content_md: state.content_md,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    const { error } = await supabase
      .from("site_content")
      .update(payload)
      .eq("key", contentKey);

    if (error) {
      console.error(`[AdminContentTab] save ${contentKey}:`, error);
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
      setState((s) => ({ ...s, saving: false }));
      return;
    }

    setState((s) => ({
      ...s,
      saving: false,
      saved: true,
      original_title: s.title,
      original_content_md: s.content_md,
      updated_at: payload.updated_at,
    }));

    toast({
      title: "Saved",
      description: `${label} updated successfully.`,
    });

    // Clear the "saved" badge after 3 s
    setTimeout(() => setState((s) => ({ ...s, saved: false })), 3000);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading {label}…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm text-muted-foreground max-w-lg">{description}</p>
          {state.updated_at && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <Clock className="w-3 h-3 shrink-0" />
              Last saved {new Date(state.updated_at).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDirty && (
            <Badge variant="secondary" className="text-amber-600 bg-amber-50 border-amber-200 text-xs">
              Unsaved changes
            </Badge>
          )}
          {state.saved && (
            <Badge variant="secondary" className="text-emerald-600 bg-emerald-50 border-emerald-200 text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Saved
            </Badge>
          )}
          <Button
            onClick={handleSave}
            disabled={!isDirty || state.saving}
            size="sm"
            className="gap-1.5"
          >
            {state.saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {state.saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Title field */}
      <div className="space-y-1.5">
        <Label htmlFor={`${contentKey}-title`} className="text-sm font-medium">
          Document Title
        </Label>
        <Input
          id={`${contentKey}-title`}
          value={state.title}
          onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
          placeholder={`e.g. "${label}"`}
          className="max-w-xl"
        />
        <p className="text-xs text-muted-foreground">
          Shown as the heading in the{" "}
          {contentKey === "consent_form" ? "consent dialog" : "/privacy-policy page"}.
        </p>
      </div>

      <Separator />

      {/* Editor / Preview toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Content (Markdown)</Label>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setView("edit")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                view === "edit"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={() => setView("preview")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                view === "preview"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
          </div>
        </div>

        {view === "edit" ? (
          <textarea
            value={state.content_md}
            onChange={(e) => setState((s) => ({ ...s, content_md: e.target.value }))}
            placeholder={`Write your ${label.toLowerCase()} content here using Markdown…\n\nExample:\n# Section Heading\n\nParagraph text here.\n\n## Sub-section\n\n- Bullet point one\n- Bullet point two`}
            className={cn(
              "w-full min-h-[420px] font-mono text-sm rounded-lg border border-input bg-background",
              "px-4 py-3 resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "placeholder:text-muted-foreground/60"
            )}
            spellCheck={false}
          />
        ) : (
          <div
            className={cn(
              "min-h-[420px] rounded-lg border border-input bg-background px-6 py-5",
              "text-sm text-foreground overflow-auto"
            )}
          >
            {/* Render title preview */}
            {state.title && (
              <h1 className="text-2xl font-extrabold mb-4 pb-2 border-b border-border">
                {state.title}
              </h1>
            )}
            <div
              dangerouslySetInnerHTML={{ __html: renderMarkdown(state.content_md) }}
            />
          </div>
        )}

        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          Supports basic Markdown: <code className="bg-muted px-1 rounded text-[11px]"># headings</code>,{" "}
          <code className="bg-muted px-1 rounded text-[11px]">**bold**</code>,{" "}
          <code className="bg-muted px-1 rounded text-[11px]">*italic*</code>,{" "}
          <code className="bg-muted px-1 rounded text-[11px]">- lists</code>,{" "}
          <code className="bg-muted px-1 rounded text-[11px]">[text](url)</code>,{" "}
          <code className="bg-muted px-1 rounded text-[11px]">---</code> for dividers.
        </p>
      </div>
    </div>
  );
}

// ─── Main Tab Component ───────────────────────────────────────────────────────

export function AdminContentTab() {
  return (
    <div className="space-y-6 p-6 max-w-4xl">
      {/* Intro card */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20 p-4 flex items-start gap-3">
        <FileEdit className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
            Database-driven Content
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
            Changes saved here are immediately reflected on the live site — no code deploy needed.
            The <strong>Consent Form</strong> is shown to participants before recording; the{" "}
            <strong>Privacy Policy</strong> is rendered on <code>/privacy-policy</code>.
            Use Markdown formatting to add headings, bullet lists, bold text, and links.
          </p>
        </div>
      </div>

      {/* Per-document editors in sub-tabs */}
      <Tabs defaultValue="consent_form">
        <TabsList className="mb-4">
          {CONTENT_KEYS.map((c) => (
            <TabsTrigger key={c.key} value={c.key} className="gap-1.5">
              <span>{c.icon}</span>
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CONTENT_KEYS.map((c) => (
          <TabsContent key={c.key} value={c.key} className="mt-0">
            <ContentEditor
              contentKey={c.key}
              label={c.label}
              description={c.description}
              icon={c.icon}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

