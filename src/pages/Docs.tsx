import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Database,
  Shield,
  Users,
  Mic,
  Code,
  Layers,
  Terminal,
  ChevronRight,
  ChevronDown,
  Search,
  Menu,
  X,
  ExternalLink,
  Home,
  Copy,
  Check,
  Folder,
  FileCode,
  Link as LinkIcon,
  FileText,
  BarChart3,
  ArrowRight,
  ArrowLeftIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children?: { id: string; title: string }[];
}

const navigation: NavItem[] = [
  {
    id: "getting-started",
    title: "Getting started",
    icon: <Home className="h-4 w-4" />,
    children: [
      { id: "introduction", title: "Introduction" },
      { id: "quick-start", title: "Quick start" },
      { id: "features", title: "Features" },
    ],
  },
  {
    id: "guides",
    title: "Guides",
    icon: <BookOpen className="h-4 w-4" />,
    children: [
      { id: "voice-recording", title: "Voice recording" },
      { id: "user-dashboard", title: "User dashboard" },
      { id: "admin-panel", title: "Admin panel" },
    ],
  },
  {
    id: "transcription",
    title: "Transcription",
    icon: <FileText className="h-4 w-4" />,
    children: [
      { id: "transcription-workflow", title: "Workflow" },
      { id: "transcription-guidelines", title: "Guidelines" },
      { id: "transcription-admin", title: "Admin review" },
    ],
  },
  {
    id: "architecture",
    title: "Architecture",
    icon: <Layers className="h-4 w-4" />,
    children: [
      { id: "system-design", title: "System design" },
      { id: "data-flow", title: "Data flow" },
      { id: "data-pipeline", title: "Data pipeline" },
      { id: "project-structure", title: "Project structure" },
    ],
  },
  {
    id: "database",
    title: "Database",
    icon: <Database className="h-4 w-4" />,
    children: [
      { id: "schema", title: "Schema overview" },
      { id: "tables", title: "Tables reference" },
      { id: "relationships", title: "Relationships" },
      { id: "rpc-functions", title: "RPC functions" },
    ],
  },
  {
    id: "security",
    title: "Security",
    icon: <Shield className="h-4 w-4" />,
    children: [
      { id: "auth-flow", title: "Authentication" },
      { id: "rls-policies", title: "RLS policies" },
      { id: "roles", title: "User roles" },
    ],
  },
  {
    id: "reference",
    title: "Reference",
    icon: <Terminal className="h-4 w-4" />,
    children: [
      { id: "edge-functions", title: "Edge functions" },
      { id: "storage", title: "Storage" },
      { id: "env-variables", title: "Environment variables" },
      { id: "tech-stack", title: "Tech stack" },
    ],
  },
];

// Flatten all section IDs for prev/next navigation
const allSectionIds = navigation.flatMap(
  (nav) => nav.children?.map((c) => c.id) ?? []
);

// Code block component with copy functionality
function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative rounded-lg bg-muted/80 dark:bg-muted/40 overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
        <span className="text-xs text-muted-foreground">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="ml-1.5">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Table component for clean data display
function DocsTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {headers.map((header, i) => (
              <th key={i} className="text-left px-4 py-3 font-medium text-foreground">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-muted/30 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className={cn("px-4 py-3", j === 0 && "font-mono text-primary text-xs")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Info callout component
function Callout({ type = "info", title, children }: { type?: "info" | "warning" | "tip"; title: string; children: React.ReactNode }) {
  const styles = {
    info: "border-l-primary bg-primary/5",
    warning: "border-l-yellow-500 bg-yellow-500/5",
    tip: "border-l-green-500 bg-green-500/5",
  };

  return (
    <div className={cn("border-l-4 rounded-r-lg p-4 my-4", styles[type])}>
      <p className="font-medium text-sm mb-1">{title}</p>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

// Section heading with anchor link
function SectionHeading({ id, children, level = 2 }: { id: string; children: React.ReactNode; level?: 2 | 3 }) {
  const Tag = level === 2 ? "h2" : "h3";
  const sizeClass = level === 2 ? "text-2xl font-bold" : "text-lg font-semibold";

  return (
    <Tag id={id} className={cn(sizeClass, "group flex items-center gap-2 scroll-mt-20 mb-4")}>
      {children}
      <a
        href={`#${id}`}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
        aria-label={`Link to ${id}`}
      >
        <LinkIcon className="h-4 w-4" />
      </a>
    </Tag>
  );
}

export default function Docs() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("introduction");
  const [expandedSections, setExpandedSections] = useState<string[]>(["getting-started"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find current section info for breadcrumbs
  const currentSectionInfo = useMemo(() => {
    for (const nav of navigation) {
      const child = nav.children?.find(c => c.id === activeSection);
      if (child) {
        return { parent: nav, child };
      }
    }
    return null;
  }, [activeSection]);

  // Prev/Next navigation
  const prevNextNav = useMemo(() => {
    const idx = allSectionIds.indexOf(activeSection);
    const prevId = idx > 0 ? allSectionIds[idx - 1] : null;
    const nextId = idx < allSectionIds.length - 1 ? allSectionIds[idx + 1] : null;

    const findTitle = (id: string | null) => {
      if (!id) return null;
      for (const nav of navigation) {
        const child = nav.children?.find(c => c.id === id);
        if (child) return child.title;
      }
      return null;
    };

    return {
      prev: prevId ? { id: prevId, title: findTitle(prevId)! } : null,
      next: nextId ? { id: nextId, title: findTitle(nextId)! } : null,
    };
  }, [activeSection]);

  // Auto-expand parent when navigating
  useEffect(() => {
    if (currentSectionInfo && !expandedSections.includes(currentSectionInfo.parent.id)) {
      setExpandedSections(prev => [...prev, currentSectionInfo.parent.id]);
    }
  }, [activeSection, currentSectionInfo]);

  // ⌘K keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Scroll spy with IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    allSectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    setMobileNavOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Filter navigation based on search
  const filteredNavigation = useMemo(() => {
    if (!searchQuery.trim()) return navigation;

    const query = searchQuery.toLowerCase();
    return navigation.map(nav => ({
      ...nav,
      children: nav.children?.filter(child =>
        child.title.toLowerCase().includes(query) ||
        nav.title.toLowerCase().includes(query)
      )
    })).filter(nav => (nav.children?.length ?? 0) > 0);
  }, [searchQuery]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center px-4 lg:px-6 max-w-screen-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden mr-2"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="flex items-center gap-2 mr-6">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Mic className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold hidden sm:inline">JasinaHub</span>
            <Badge variant="outline" className="hidden sm:inline-flex text-xs">Docs</Badge>
          </div>

          <div className="flex-1 max-w-md mr-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="Search documentation..."
                className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
              className="hidden sm:inline-flex"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Admin
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden max-w-screen-2xl mx-auto w-full">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 bg-background border-r transform transition-transform duration-200 pt-14",
          "lg:static lg:h-full lg:translate-x-0 lg:pt-0 lg:z-auto lg:inset-auto lg:shrink-0",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          <ScrollArea className="h-full py-6 px-4">
            <div className="lg:hidden mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <nav className="space-y-1">
              {filteredNavigation.map((item) => (
                <div key={item.id} className="mb-1">
                  <button
                    onClick={() => toggleSection(item.id)}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      "hover:bg-muted text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-muted-foreground">{item.icon}</span>
                      {item.title}
                    </span>
                    {item.children && (
                      expandedSections.includes(item.id)
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {item.children && expandedSections.includes(item.id) && (
                    <div className="mt-1 ml-4 pl-4 border-l border-border space-y-1">
                      {item.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => scrollToSection(child.id)}
                          className={cn(
                            "block w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors",
                            activeSection === child.id
                              ? "text-primary font-medium bg-primary/10"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          {child.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            <div className="mt-8 pt-4 border-t border-border">
              <div className="px-3 text-xs text-muted-foreground">
                Version <Badge variant="outline" className="ml-1 text-xs">2.0.0</Badge>
              </div>
            </div>
          </ScrollArea>
        </aside>

        {mobileNavOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* Main Content */}
        <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto h-full scroll-smooth">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8">
            {/* Breadcrumbs */}
            {currentSectionInfo && (
              <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
                <button onClick={() => scrollToSection("introduction")} className="hover:text-foreground">
                  Docs
                </button>
                <ChevronRight className="h-4 w-4" />
                <span className="hover:text-foreground">{currentSectionInfo.parent.title}</span>
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground font-medium">{currentSectionInfo.child.title}</span>
              </nav>
            )}

            {/* ===== GETTING STARTED ===== */}

            <section id="introduction" className="mb-16 scroll-mt-20">
              <h1 className="text-4xl font-bold tracking-tight mb-4">
                DSAIL Voice Data Collection
              </h1>
              <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                A voice data collection and transcription platform designed for gathering, managing, and transcribing audio recordings at scale. Built with a focus on user experience, data quality, and robust data management for NLP research.
              </p>

              <div className="flex flex-wrap gap-2 mb-8">
                <Badge variant="secondary">TypeScript</Badge>
                <Badge variant="secondary">React 18</Badge>
                <Badge variant="secondary">Vite</Badge>
                <Badge variant="secondary">Tailwind CSS</Badge>
                <Badge variant="secondary">PostgreSQL</Badge>
                <Badge variant="secondary">Dark/Light Mode</Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  onClick={() => scrollToSection("quick-start")}
                  className="group p-4 rounded-lg border bg-card hover:border-primary/50 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center gap-2 font-medium mb-1">
                    Quick start
                    <ChevronRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </div>
                  <p className="text-sm text-muted-foreground">Get up and running in 5 minutes</p>
                </button>
                <button
                  onClick={() => scrollToSection("transcription-workflow")}
                  className="group p-4 rounded-lg border bg-card hover:border-primary/50 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center gap-2 font-medium mb-1">
                    Transcription
                    <ChevronRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </div>
                  <p className="text-sm text-muted-foreground">Audio-to-text workflow and guidelines</p>
                </button>
              </div>
            </section>

            {/* Quick Start */}
            <section id="quick-start" className="mb-16 scroll-mt-20">
              <SectionHeading id="quick-start">Quick start</SectionHeading>
              <p className="text-muted-foreground mb-6">
                Follow these steps to get the development environment set up and running locally.
              </p>

              <h3 className="text-lg font-semibold mb-3">Prerequisites</h3>
              <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-1">
                <li>Node.js 18+ or Bun</li>
                <li>Git</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">Installation</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Clone the repository:</p>
                  <CodeBlock code={`git clone <repository-url>\ncd <project-directory>`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Install dependencies:</p>
                  <CodeBlock code="npm install" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Start the development server:</p>
                  <CodeBlock code="npm run dev" />
                </div>
              </div>

              <Callout type="info" title="Development server">
                The app will be available at <code className="text-xs bg-muted px-1 py-0.5 rounded">http://localhost:8080</code>
              </Callout>
            </section>

            {/* Features */}
            <section id="features" className="mb-16 scroll-mt-20">
              <SectionHeading id="features">Features</SectionHeading>
              <p className="text-muted-foreground mb-6">
                The platform provides comprehensive features for volunteers, transcribers, and administrators.
              </p>

              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Volunteer features
              </h3>
              <DocsTable
                headers={["Feature", "Description"]}
                rows={[
                  ["Voice Recording", "In-browser audio capture with real-time waveform visualization"],
                  ["Progress Tracking", "Visual progress indicators showing completion status per category"],
                  ["Consent Management", "GDPR-compliant consent flow before recording"],
                  ["Offline Support", "PWA capabilities with offline recording and sync"],
                  ["Pull-to-Refresh", "Native-like refresh gesture for mobile users"],
                  ["Dark/Light Mode", "Seamless theme toggle applied universally"],
                ]}
              />

              <h3 className="text-lg font-semibold mb-3 mt-8 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Transcriber features
              </h3>
              <DocsTable
                headers={["Feature", "Description"]}
                rows={[
                  ["Guidelines Consent", "Mandatory agreement to Kikuyu transcription rules before access"],
                  ["Admin Approval Gate", "Transcription access only after admin verification"],
                  ["Atomic Locking", "15-minute lock per clip to prevent duplicate work"],
                  ["Auto-Save & Recovery", "Drafts stored in localStorage with resume capability"],
                  ["Submission Confirmation", "Preview dialog before final submit"],
                  ["Edit History", "Up to 3 edits allowed on own transcriptions (unless accepted)"],
                  ["My Transcriptions", "Personal history page with audio playback and status tracking"],
                  ["Variable Playback", "0.5×, 1×, and 1.5× playback speed controls"],
                ]}
              />

              <h3 className="text-lg font-semibold mb-3 mt-8 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Admin features
              </h3>
              <DocsTable
                headers={["Feature", "Description"]}
                rows={[
                  ["Dashboard Analytics", "Real-time statistics with charts (responses & transcriptions over time)"],
                  ["User Management", "Verify users and view individual progress"],
                  ["Transcriber Management", "Approve/reject transcriber access, view guideline consent status"],
                  ["Question Management", "CRUD operations with category organization"],
                  ["Response Review", "Accept/reject workflow for recordings with audio playback"],
                  ["Transcription Review", "Review, edit, accept/reject transcriptions for quality assurance"],
                  ["Dataset Export", "HuggingFace-style dataset view with ZIP export (audio + metadata.csv)"],
                  ["Activity Logs", "Comprehensive user activity audit trail"],
                  ["Active Users", "Real-time presence tracking"],
                  ["Drive Scan & Match", "Match Google Drive audio files to database responses"],
                ]}
              />
            </section>

            {/* ===== GUIDES ===== */}

            <section id="voice-recording" className="mb-16 scroll-mt-20">
              <SectionHeading id="voice-recording">Voice recording</SectionHeading>
              <p className="text-muted-foreground mb-6">
                The platform uses the MediaRecorder API for in-browser audio capture with several advanced features.
              </p>

              <ul className="space-y-3">
                {[
                  { title: "Real-time visualization", desc: "Audio waveform display during recording" },
                  { title: "Offline storage", desc: "IndexedDB storage for unreliable connections" },
                  { title: "Automatic sync", desc: "Auto-upload when connection is restored" },
                  { title: "Haptic feedback", desc: "Physical tactile responses for recording states on mobile" },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <div>
                      <span className="font-medium">{item.title}</span>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section id="user-dashboard" className="mb-16 scroll-mt-20">
              <SectionHeading id="user-dashboard">User dashboard</SectionHeading>
              <p className="text-muted-foreground mb-6">
                The dashboard provides users with an overview of their progress and quick access to recording and transcription sessions.
              </p>

              <ul className="space-y-2 text-muted-foreground">
                {[
                  "Category-based progress tracking with segmented visual indicators",
                  "Resume recording from last position",
                  "Profile management with phone number updates",
                  "Transcription duration card showing total time transcribed",
                  "Dark/light mode toggle in the header",
                  "Pull-to-refresh for mobile users",
                  "Swipe gestures for question navigation",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section id="admin-panel" className="mb-16 scroll-mt-20">
              <SectionHeading id="admin-panel">Admin panel</SectionHeading>
              <p className="text-muted-foreground mb-6">
                A comprehensive admin interface for managing the entire platform.
              </p>

              <DocsTable
                headers={["Tab", "Description"]}
                rows={[
                  ["Overview", "Dashboard with response/transcription charts and key statistics"],
                  ["Questions", "CRUD operations with category filtering and image support"],
                  ["Users", "View all users, verify accounts, track progress"],
                  ["Responses", "Review recordings with accept/reject workflow and audio playback"],
                  ["Transcribers", "Manage transcriber approvals and guideline consent status"],
                  ["Transcriptions", "Review, edit, accept/reject transcriptions"],
                  ["Dataset", "HuggingFace-style minimalist view with export to ZIP"],
                  ["Active Users", "Real-time presence tracking"],
                  ["Activity Logs", "Comprehensive audit trail"],
                  ["Documentation", "Technical system documentation (this page)"],
                ]}
              />
            </section>

            {/* ===== TRANSCRIPTION ===== */}

            <section id="transcription-workflow" className="mb-16 scroll-mt-20">
              <SectionHeading id="transcription-workflow">
                <FileText className="h-6 w-6 text-primary" />
                Transcription workflow
              </SectionHeading>
              <p className="text-muted-foreground mb-6">
                The end-to-end transcription workflow ensures data quality through a multi-step gated process.
              </p>

              <ol className="space-y-4">
                {[
                  { step: 1, title: "Guidelines Consent", desc: "User reads and accepts the detailed Kikuyu transcription guidelines. This is a one-time action." },
                  { step: 2, title: "Admin Approval", desc: "Admin reviews the user's consent and approves them as a transcriber. Until approved, the user cannot access the transcription interface." },
                  { step: 3, title: "Claim Audio Clip", desc: "System assigns a random unclaimed audio clip with a 15-minute atomic lock to prevent duplicate work." },
                  { step: 4, title: "Transcribe", desc: "User listens to audio (with variable playback speeds), types transcription in the expanding textarea. Auto-save stores drafts in localStorage." },
                  { step: 5, title: "Confirm & Submit", desc: "A confirmation dialog shows the transcription preview. User confirms before final submission." },
                  { step: 6, title: "Admin Review", desc: "Admin reviews the transcription, can edit for quality, and accepts or rejects it." },
                  { step: 7, title: "Edit Window", desc: "Transcribers can edit their own submissions up to 3 times, unless already accepted by admin." },
                ].map(({ step, title, desc }) => (
                  <li key={step} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {step}
                    </div>
                    <div>
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <Callout type="warning" title="Locking mechanism">
                Each audio clip is locked for 15 minutes when claimed. If the transcriber doesn't submit within this window, the lock expires and the clip becomes available to other transcribers.
              </Callout>
            </section>

            <section id="transcription-guidelines" className="mb-16 scroll-mt-20">
              <SectionHeading id="transcription-guidelines">Transcription guidelines</SectionHeading>
              <p className="text-muted-foreground mb-6">
                The following Kikuyu transcription rules are presented to users before they can begin transcribing.
              </p>

              <h3 className="text-lg font-semibold mb-3">Steps</h3>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-6">
                <li>Listen to the entire audio clip first before transcribing</li>
                <li>If the clip is audible and okay to transcribe, continue — else skip</li>
                <li>If you have any doubts with the audio, skip it</li>
                <li>Proofread your work before submitting</li>
              </ol>

              <h3 className="text-lg font-semibold mb-3">Rules</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-lg border bg-card">
                  <p className="font-medium text-sm mb-1">Capitalization, Spelling & Punctuation</p>
                  <p className="text-sm text-muted-foreground">Include all necessary punctuation, capitalization, and proper spelling. Do not correct the audio — write exactly what was said without omitting any word.</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="font-medium text-sm mb-1">Code-Switching</p>
                  <p className="text-sm text-muted-foreground">Wrap non-Kikuyu words (except proper nouns) in <code className="bg-muted px-1 rounded">[cs]</code> tags.</p>
                  <CodeBlock language="example" code={`Mũndũ ũyũ etagwo Dedan Kimathi arwarĩte mũrimũ wa [cs] Measles [cs] na e thibitarĩ.`} />
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="font-medium text-sm mb-1">Figures</p>
                  <p className="text-sm text-muted-foreground">All figures must be written in words (e.g., "mĩrongo ĩtatũ" instead of "30").</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="font-medium text-sm mb-1">Pauses</p>
                  <p className="text-sm text-muted-foreground">Use <code className="bg-muted px-1 rounded">[Pause]</code> for pauses longer than 1–2 seconds. A clip with more than 2-second pause should not be transcribed.</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="font-medium text-sm mb-1">Filler Words</p>
                  <p className="text-sm text-muted-foreground">Include fillers but don't lengthen them. A clip with more than two filler words should be skipped.</p>
                  <CodeBlock language="example" code={`Audio: "He was like uhhhh." → Correct: He was like [uh].`} />
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="font-medium text-sm mb-1">Prolonged Words</p>
                  <p className="text-sm text-muted-foreground">A clip with more than two prolonged words should not be transcribed.</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="font-medium text-sm mb-1">Hesitation & Truncation</p>
                  <p className="text-sm text-muted-foreground">All words including hesitations must be transcribed.</p>
                  <CodeBlock language="example" code={`ũũ ũyũ nĩ mũrimũ wango wangothi`} />
                </div>
              </div>
            </section>

            <section id="transcription-admin" className="mb-16 scroll-mt-20">
              <SectionHeading id="transcription-admin">Admin review</SectionHeading>
              <p className="text-muted-foreground mb-6">
                Administrators manage transcription quality through several tools.
              </p>

              <DocsTable
                headers={["Capability", "Description"]}
                rows={[
                  ["Transcriber Verification", "Admin reviews guideline consent status and approves users before they can transcribe"],
                  ["Transcription Editing", "Admin can directly edit transcription text to ensure quality"],
                  ["Accept / Reject", "Admin marks each transcription as accepted or rejected"],
                  ["Dataset Export", "Accepted transcriptions can be exported as a ZIP containing audio files and metadata.csv"],
                  ["Quality Metrics", "Overview charts show transcription volume over time"],
                ]}
              />

              <Callout type="tip" title="Edit lock">
                Once a transcription is accepted by an admin, the original transcriber can no longer edit it. This preserves the validated dataset.
              </Callout>
            </section>

            {/* ===== ARCHITECTURE ===== */}

            <section id="system-design" className="mb-16 scroll-mt-20">
              <SectionHeading id="system-design">
                <Layers className="h-6 w-6 text-primary" />
                System design
              </SectionHeading>
              <p className="text-muted-foreground mb-6">
                The platform follows a three-tier architecture with clear separation of concerns.
              </p>

              <CodeBlock
                language="text"
                code={`┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  React SPA │ PWA Service Worker │ IndexedDB (Offline Storage)   │
│  Dark/Light Theme │ Swipe/Haptic │ Auto-Save (localStorage)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│  Supabase Client SDK │ REST API │ Realtime WebSocket            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend Services                             │
├──────────────────┬──────────────────┬───────────────────────────┤
│   PostgreSQL     │  Edge Functions  │     Storage               │
│   + RLS Policies │  (Deno Runtime)  │  (Audio / Google Drive)   │
│   + RPC Funcs    │                  │                           │
└──────────────────┴──────────────────┴───────────────────────────┘`}
              />
            </section>

            <section id="data-flow" className="mb-16 scroll-mt-20">
              <SectionHeading id="data-flow">Data flow</SectionHeading>
              <p className="text-muted-foreground mb-6">
                The application follows a clear data flow pattern from authentication through to dataset export.
              </p>

              <ol className="space-y-4">
                {[
                  { step: 1, title: "Authentication", desc: "Users authenticate via email/password with email verification" },
                  { step: 2, title: "Authorization", desc: "RLS policies enforce row-level access based on auth.uid() and has_role()" },
                  { step: 3, title: "Recording", desc: "Audio captured via MediaRecorder API, processed client-side" },
                  { step: 4, title: "Upload", desc: "Files uploaded to Google Drive / cloud storage via Edge Function" },
                  { step: 5, title: "Transcription", desc: "Transcribers claim clips, transcribe with guidelines, submit for review" },
                  { step: 6, title: "Validation", desc: "Admin reviews and accepts/rejects recordings and transcriptions" },
                  { step: 7, title: "Export", desc: "Validated data exported as HuggingFace-style dataset (audio + metadata.csv)" },
                ].map(({ step, title, desc }) => (
                  <li key={step} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {step}
                    </div>
                    <div>
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section id="data-pipeline" className="mb-16 scroll-mt-20">
              <SectionHeading id="data-pipeline">
                <BarChart3 className="h-6 w-6 text-primary" />
                Data pipeline
              </SectionHeading>
              <p className="text-muted-foreground mb-6">
                The end-to-end pipeline from recording to research-ready dataset.
              </p>

              <CodeBlock
                language="text"
                code={`Recording → Google Drive Upload → Database Metadata
                                    │
                         Drive Scan & Match (Admin)
                                    │
                              ▼
                     Transcription Assignment
                              │
                     Transcription + Review
                              │
                         Dataset Export
                    (audio.webm + metadata.csv)`}
              />

              <h3 className="text-lg font-semibold mt-6 mb-3">File naming convention</h3>
              <p className="text-muted-foreground mb-3">
                Audio files in Google Drive follow a strict naming format for automated matching:
              </p>
              <CodeBlock
                language="text"
                code={`firstname_secondname_question.webm

Example: catherine_mwangi_what_is_your_name.webm`}
              />
              <Callout type="info" title="Drive scan & match">
                The admin panel includes a "Scan & Match" tool that reads Google Drive filenames, parses the contributor name and question, and links them to the correct database records automatically.
              </Callout>
            </section>

            <section id="project-structure" className="mb-16 scroll-mt-20">
              <SectionHeading id="project-structure">
                <Folder className="h-6 w-6 text-primary" />
                Project structure
              </SectionHeading>
              <p className="text-muted-foreground mb-6">
                The project follows a standard React application structure with clear separation of concerns.
              </p>

              <CodeBlock
                language="text"
                code={`src/
├── components/
│   ├── Admin/           # Admin panel tabs and components
│   ├── Auth/            # Authentication guards (ProtectedRoute, AdminRoute)
│   ├── Dashboard/       # User dashboard cards and progress
│   ├── Questions/       # Question display, consent, and recording
│   ├── Transcription/   # Transcription guidelines and reference
│   ├── VoiceRecording/  # Audio recording, waveform, minimal recorder
│   └── ui/              # shadcn/ui components + custom UI
├── hooks/               # Custom hooks (mobile, haptic, swipe, presence, roles)
├── integrations/        # Supabase client and types
├── pages/               # Route components (Dashboard, Transcribe, Admin, etc.)
├── services/            # Business logic (GCS upload)
└── utils/               # Utility functions (recording storage)

supabase/
├── functions/           # Edge functions
│   ├── migrate-drive-audio/
│   ├── reset-password/
│   └── upload-to-gcs/
└── config.toml`}
              />
            </section>

            {/* ===== DATABASE ===== */}

            <section id="schema" className="mb-16 scroll-mt-20">
              <SectionHeading id="schema">
                <Database className="h-6 w-6 text-primary" />
                Schema overview
              </SectionHeading>
              <p className="text-muted-foreground mb-6">
                The database is built on PostgreSQL with Row Level Security (RLS) enabled on all tables for fine-grained access control.
              </p>

              <Callout type="tip" title="Security first">
                All tables have RLS policies ensuring users can only access their own data, while admins have full access through the has_role() security definer function.
              </Callout>
            </section>

            <section id="tables" className="mb-16 scroll-mt-20">
              <SectionHeading id="tables">Tables reference</SectionHeading>

              <DocsTable
                headers={["Table", "Description"]}
                rows={[
                  ["profiles", "User profile data (name, phone, dialect, age, gender, consent, verification)"],
                  ["categories", "Question categories for organization"],
                  ["questions", "Questions with optional images, attribution, and ordering"],
                  ["voice_responses", "Audio recordings with review status (pending/accepted/rejected)"],
                  ["transcriptions", "Transcription text linked to voice responses with status and edit count"],
                  ["transcription_locks", "Atomic 15-minute locks preventing duplicate transcription work"],
                  ["user_progress", "Per-category completion tracking"],
                  ["user_roles", "Role assignments (admin/user) — separate table for security"],
                  ["user_activity_logs", "Audit trail of user actions with page and detail metadata"],
                ]}
              />
            </section>

            <section id="relationships" className="mb-16 scroll-mt-20">
              <SectionHeading id="relationships">Relationships</SectionHeading>
              <p className="text-muted-foreground mb-6">
                The entity relationship diagram showing core table connections.
              </p>

              <CodeBlock
                language="text"
                code={`profiles ──┬── voice_responses ──── questions ──── categories
           │        │
           │        ├── transcriptions (voice_response_id)
           │        │
           │        └── transcription_locks (voice_response_id)
           │
           ├── user_progress ────── categories
           │
           ├── user_roles
           │
           └── user_activity_logs`}
              />
            </section>

            <section id="rpc-functions" className="mb-16 scroll-mt-20">
              <SectionHeading id="rpc-functions">RPC functions</SectionHeading>
              <p className="text-muted-foreground mb-6">
                Server-side PostgreSQL functions callable via the Supabase SDK.
              </p>

              <DocsTable
                headers={["Function", "Description"]}
                rows={[
                  ["has_role(_user_id, _role)", "Security definer function that checks if a user has a specific role. Used in RLS policies to avoid recursive lookups."],
                  ["claim_random_transcription(_user_id)", "Assigns a random unclaimed audio clip to a transcriber with a 15-minute lock. Returns audio URL, duration, and question ID."],
                  ["release_transcription_lock(_user_id)", "Releases the current transcription lock held by a user."],
                  ["get_admin_chart_data()", "Returns aggregated chart data for the admin overview dashboard."],
                  ["get_question_counts()", "Returns the count of responses per question."],
                  ["get_question_unique_user_counts()", "Returns unique user counts per question for progress analytics."],
                ]}
              />
            </section>

            {/* ===== SECURITY ===== */}

            <section id="auth-flow" className="mb-16 scroll-mt-20">
              <SectionHeading id="auth-flow">
                <Shield className="h-6 w-6 text-primary" />
                Authentication
              </SectionHeading>
              <p className="text-muted-foreground mb-6">
                The platform uses email/password authentication with secure session management.
              </p>

              <ul className="space-y-3">
                {[
                  "Email/password authentication with email verification",
                  "Multi-step signup wizard (name, phone, demographics, consent)",
                  "Password strength validation on signup",
                  "Password reset via Edge Function with secure token handling",
                  "Protected routes using React Router guards (ProtectedRoute, AdminRoute)",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section id="rls-policies" className="mb-16 scroll-mt-20">
              <SectionHeading id="rls-policies">RLS policies</SectionHeading>
              <p className="text-muted-foreground mb-6">
                Row Level Security policies ensure data isolation and proper access control.
              </p>

              <DocsTable
                headers={["Policy Type", "Description"]}
                rows={[
                  ["User Isolation", "Users can only access their own data via auth.uid() checks"],
                  ["Admin Access", "Admins verified via has_role() security definer function"],
                  ["Public Data", "Categories and questions readable by all authenticated users"],
                  ["Transcription Access", "Transcribers can read voice_responses for assigned clips only"],
                ]}
              />
            </section>

            <section id="roles" className="mb-16 scroll-mt-20">
              <SectionHeading id="roles">User roles</SectionHeading>
              <p className="text-muted-foreground mb-4">
                Roles are stored in a dedicated <code className="bg-muted px-1 rounded text-xs">user_roles</code> table (never on the profiles table) to prevent privilege escalation.
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 rounded-lg border bg-card">
                  <Badge className="mb-2">user</Badge>
                  <p className="text-sm text-muted-foreground">
                    Default role. Can record responses, view own progress, and manage profile.
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <Badge variant="secondary" className="mb-2">transcriber</Badge>
                  <p className="text-sm text-muted-foreground">
                    Users with guidelines consent and admin approval. Can claim and transcribe audio clips.
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <Badge variant="destructive" className="mb-2">admin</Badge>
                  <p className="text-sm text-muted-foreground">
                    Full access. Manage questions, review responses/transcriptions, verify users, export datasets.
                  </p>
                </div>
              </div>

              <Callout type="warning" title="Security">
                Roles are checked server-side via the <code className="bg-muted px-1 rounded text-xs">has_role()</code> security definer function. Never check admin status via client-side storage.
              </Callout>
            </section>

            {/* ===== REFERENCE ===== */}

            <section id="edge-functions" className="mb-16 scroll-mt-20">
              <SectionHeading id="edge-functions">
                <Terminal className="h-6 w-6 text-primary" />
                Edge functions
              </SectionHeading>
              <p className="text-muted-foreground mb-6">
                Serverless functions running on Deno runtime for backend logic.
              </p>

              <div className="space-y-4">
                {[
                  {
                    name: "upload-to-gcs",
                    desc: "Handles secure file uploads to Google Cloud Storage.",
                    endpoint: "POST /functions/v1/upload-to-gcs",
                  },
                  {
                    name: "reset-password",
                    desc: "Handles password reset requests with secure token validation.",
                    endpoint: "POST /functions/v1/reset-password",
                  },
                  {
                    name: "migrate-drive-audio",
                    desc: "Migrates audio files from Google Drive to storage buckets. Used for admin batch operations and the Drive scan & match feature.",
                    endpoint: "POST /functions/v1/migrate-drive-audio",
                  },
                ].map((fn) => (
                  <div key={fn.name} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <FileCode className="h-4 w-4 text-primary" />
                      <code className="font-mono text-sm font-semibold">{fn.name}</code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{fn.desc}</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{fn.endpoint}</code>
                  </div>
                ))}
              </div>
            </section>

            <section id="storage" className="mb-16 scroll-mt-20">
              <SectionHeading id="storage">Storage</SectionHeading>
              <p className="text-muted-foreground mb-6">
                Audio files are stored in Google Drive and/or Google Cloud Storage via edge functions.
              </p>

              <ul className="space-y-2 text-muted-foreground">
                {[
                  "Secure upload with authentication via edge functions",
                  "File URLs stored in voice_responses.audio_file_url",
                  "Naming convention: firstname_secondname_question.webm",
                  "Drive Scan & Match tool for linking files to database records",
                  "Bulk ZIP export available for admin users (audio + metadata.csv)",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section id="env-variables" className="mb-16 scroll-mt-20">
              <SectionHeading id="env-variables">Environment variables</SectionHeading>
              <p className="text-muted-foreground mb-6">
                The project requires several environment variables for both the local development server and edge functions.
              </p>

              <h3 className="text-lg font-semibold mb-3">Client-side (Vite)</h3>
              <DocsTable
                headers={["Variable", "Required", "Description"]}
                rows={[
                  ["VITE_SUPABASE_URL", "Yes", "Supabase project URL"],
                  ["VITE_SUPABASE_PUBLISHABLE_KEY", "Yes", "Supabase anon/public key"],
                  ["VITE_SUPABASE_PROJECT_ID", "Yes", "Supabase project identifier"],
                ]}
              />

              <h3 className="text-lg font-semibold mt-6 mb-3">Edge Functions (Secrets)</h3>
              <DocsTable
                headers={["Variable", "Required", "Description"]}
                rows={[
                  ["GOOGLE_DRIVE_FOLDER_ID", "Yes", "Google Drive folder for audio storage"],
                  ["GCS_BUCKET_NAME", "Yes", "Google Cloud Storage bucket name"],
                  ["GCS_SERVICE_ACCOUNT_KEY", "Yes", "GCS service account JSON credentials"],
                  ["SUPABASE_SERVICE_ROLE_KEY", "Yes", "Service role key for admin operations"],
                ]}
              />
            </section>

            <section id="tech-stack" className="mb-16 scroll-mt-20">
              <SectionHeading id="tech-stack">
                <Code className="h-6 w-6 text-primary" />
                Tech stack
              </SectionHeading>

              <h3 className="text-lg font-semibold mb-3">Frontend</h3>
              <DocsTable
                headers={["Technology", "Purpose"]}
                rows={[
                  ["React 18", "UI library with concurrent features"],
                  ["TypeScript", "Static type checking and enhanced DX"],
                  ["Vite", "Next-generation build tool with HMR"],
                  ["Tailwind CSS", "Utility-first CSS framework"],
                  ["shadcn/ui", "Accessible, customizable components"],
                  ["TanStack Query", "Server state management and caching"],
                  ["next-themes", "Dark/light mode with system preference detection"],
                  ["Recharts", "Data visualization for admin charts"],
                  ["Lucide React", "Icon library"],
                ]}
              />

              <h3 className="text-lg font-semibold mb-3 mt-8">Backend</h3>
              <DocsTable
                headers={["Technology", "Purpose"]}
                rows={[
                  ["PostgreSQL", "Primary database with JSONB support"],
                  ["Row Level Security", "Fine-grained access control"],
                  ["Auth (GoTrue)", "Email/password authentication with email verification"],
                  ["Realtime", "WebSocket-based presence and live queries"],
                  ["Edge Functions", "Deno-based serverless functions"],
                  ["Google Drive API", "Audio file storage and retrieval"],
                ]}
              />
            </section>

            {/* Prev / Next Navigation */}
            <nav className="flex items-center justify-between border-t border-border pt-6 mt-16 mb-8">
              {prevNextNav.prev ? (
                <button
                  onClick={() => scrollToSection(prevNextNav.prev!.id)}
                  className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                  <div className="text-left">
                    <span className="text-xs text-muted-foreground">Previous</span>
                    <p className="font-medium text-foreground">{prevNextNav.prev.title}</p>
                  </div>
                </button>
              ) : <div />}
              {prevNextNav.next ? (
                <button
                  onClick={() => scrollToSection(prevNextNav.next!.id)}
                  className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors text-right"
                >
                  <div>
                    <span className="text-xs text-muted-foreground">Next</span>
                    <p className="font-medium text-foreground">{prevNextNav.next.title}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : <div />}
            </nav>

            {/* Footer */}
            <footer className="border-t pt-8 mt-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                <p>Centre for Data Science and Artificial Intelligence (DSAIL) © 2026</p>
                <a
                  href="https://www.dsail-health.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Live Preview <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
