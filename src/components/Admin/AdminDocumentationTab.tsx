import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Server, Shield, Database, Activity, GitBranch, Users, ArrowRightLeft, Network } from "lucide-react";
import { InteractiveMermaidDiagram } from "./ResearchPaper/InteractiveMermaidDiagram";
import {
  useCaseDiagram,
  recordingSequenceDiagram,
  transcriptionSequenceDiagram,
  erDiagram,
  componentDiagram,
  highLevelArchitectureDiagram,
} from "./ResearchPaper/diagramDefinitions";

export function AdminDocumentationTab() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column: Quick Links & Context */}
        <div className="lg:sticky lg:top-10 space-y-6 h-fit">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" />
                Technology Stack
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Core</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">React 18</Badge>
                    <Badge variant="secondary">Vite</Badge>
                    <Badge variant="secondary">TypeScript</Badge>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Backend</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Supabase</Badge>
                    <Badge variant="secondary">PostgreSQL</Badge>
                    <Badge variant="secondary">Edge Functions</Badge>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">UI & Styling</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Tailwind CSS</Badge>
                    <Badge variant="secondary">Shadcn UI</Badge>
                    <Badge variant="secondary">Lucide Icons</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Security & RBAC
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>The system implements <strong>Role-Based Access Control</strong> through Supabase Auth and Database Triggers.</p>
              <ul className="text-xs space-y-1 pl-4">
                <li><strong>Admin:</strong> Full access to all data and verification workflows.</li>
                <li><strong>Transcriber:</strong> Access to audio files and transcription creation.</li>
                <li><strong>Volunteer:</strong> Limited to profile management and answer recording.</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Main Documentation */}
        <div className="lg:col-span-2 space-y-6">
          {/* High-Level Architecture (top of documentation) */}
          <Card id="high-level-architecture">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5 text-primary" />
                High-Level System Architecture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                End-to-end view of JasinaHub — from end users (Volunteers, Transcribers, Admins),
                through the React PWA frontend and Lovable Cloud backend (Auth, PostgreSQL with RLS,
                Object Storage, Edge Functions, Realtime), down to the curated ASR dataset that feeds
                downstream speech model training (wav2vec 2.0, Whisper, MMS).
              </p>
              <InteractiveMermaidDiagram chart={highLevelArchitectureDiagram} title="High-Level System Architecture" />
            </CardContent>
          </Card>

          {/* UML Diagrams Section */}
          <Card id="use-case-diagram">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Use Case Diagram
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Shows the three actor roles (Volunteer, Transcriber, Admin) and their interactions with the system.
              </p>
              <InteractiveMermaidDiagram chart={useCaseDiagram} title="Use Case Diagram" />
            </CardContent>
          </Card>

          <Card id="architecture">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-primary" />
                Component & Deployment Architecture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Layered architecture from the React SPA client through the BaaS backend to ASR dataset output.
              </p>
              <InteractiveMermaidDiagram chart={componentDiagram} title="Component & Deployment Architecture" />
            </CardContent>
          </Card>

          <Card id="recording-flow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Voice Recording Sequence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                The recording pipeline from category selection through audio capture, IndexedDB backup, cloud upload, and database persistence.
              </p>
              <InteractiveMermaidDiagram chart={recordingSequenceDiagram} title="Voice Recording Sequence" />
            </CardContent>
          </Card>

          <Card id="transcription-flow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
                Transcription Assignment Sequence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Atomic locking mechanism for transcription claiming and submission with pessimistic locking.
              </p>
              <InteractiveMermaidDiagram chart={transcriptionSequenceDiagram} title="Transcription Assignment Sequence" />
            </CardContent>
          </Card>

          <Card id="database">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Entity-Relationship Diagram
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Complete database schema with all nine tables, their attributes, foreign key constraints, and cardinality relationships.
              </p>
              <InteractiveMermaidDiagram chart={erDiagram} title="Entity-Relationship Diagram" />
            </CardContent>
          </Card>

          <Card id="deployment">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Environment & Deployment
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>The project requires several environment variables for both the local development server and the Edge Functions:</p>
              <div className="grid grid-cols-1 gap-2 not-prose">
                <div className="p-2 border border-border bg-muted/30 rounded flex items-center justify-between">
                  <span className="font-mono text-xs">VITE_SUPABASE_URL</span>
                  <Badge variant="outline" className="text-[10px]">Required</Badge>
                </div>
                <div className="p-2 border border-border bg-muted/30 rounded flex items-center justify-between">
                  <span className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</span>
                  <Badge variant="outline" className="text-[10px]">Required</Badge>
                </div>
                <div className="p-2 border border-border bg-muted/30 rounded flex items-center justify-between">
                  <span className="font-mono text-xs">GOOGLE_DRIVE_FOLDER_ID</span>
                  <Badge variant="outline" className="text-[10px]">Required (Edge)</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id="integrations">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                External Integrations: Google Drive
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>The system uses a <strong>dual-mode</strong> Google Drive integration strategy:</p>
              <ul className="text-xs space-y-1">
                <li><strong>Direct Upload (GIS):</strong> Volunteers upload recordings directly from the browser using Google Identity Services (OAuth2).</li>
                <li><strong>Migration (Edge):</strong> Administrative batches can be "ferried" between storage buckets using specialized <strong>Edge Functions</strong> for archival.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="resilience">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Offline Support & Recovery
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>To prevent data loss on unstable connections, the platform implements a robust recovery system:</p>
              <ul className="text-xs space-y-1">
                <li><strong>Local Storage:</strong> Recordings are saved to IndexedDB/LocalStorage via <code>recordingStorage.ts</code> before upload begins.</li>
                <li><strong>Recovery Dialog:</strong> If an upload is interrupted, the <code>RecoveryDialog</code> automatically prompts the user to resume or retry upon their next visit.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="ux-mobile">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Advanced Mobile UX
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>The frontend is optimized for a native-like experience through specialized hooks:</p>
              <ul className="text-xs space-y-1">
                <li><strong><code>useHapticFeedback</code>:</strong> Provides physical tactile responses for recording states and navigation.</li>
                <li><strong><code>useSwipeGesture</code>:</strong> Allows intuitive swiping between assessment questions.</li>
                <li><strong><code>usePullToRefresh</code>:</strong> A custom implementation for manual data syncing on mobile views.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
