export function PaperSoftwareDescription() {
  return (
    <section className="mb-8">
      <h2 className="text-[17px] font-bold mb-3">2. Software description</h2>

      <h3 className="text-[15px] font-semibold mb-2">2.1. Architecture</h3>
      <p className="text-justify mb-4">
        <em>JasinaHub</em> employs a client-server architecture built on the Backend-as-a-Service (BaaS) paradigm. The frontend is a single-page application (SPA) developed with React 18 and TypeScript, bundled with Vite for optimal performance. The backend leverages a managed PostgreSQL database with Row-Level Security (RLS), authentication services (GoTrue), object storage for audio files, and serverless edge functions for specialised operations.
      </p>

      <h3 className="text-[15px] font-semibold mb-2">2.2. Database schema</h3>
      <p className="text-justify mb-4">
        The relational schema comprises nine interconnected tables designed to support the complete data collection pipeline:
      </p>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-muted/40">
              <th className="border border-border px-3 py-2 text-left font-semibold">Table</th>
              <th className="border border-border px-3 py-2 text-left font-semibold">Purpose</th>
              <th className="border border-border px-3 py-2 text-left font-semibold">Key Fields</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["profiles", "Extended user metadata linked to auth.users", "first_name, last_name, phone_number, dialect, gender, age, verified, transcription_approved, voice_recording_consent"],
              ["categories", "Thematic groupings for health-related questions", "name, description"],
              ["questions", "Individual prompts within categories", "question_text, category_id, order_index, image_url"],
              ["voice_responses", "Audio recordings linked to users and questions", "audio_file_url, duration_seconds, status (pending/accepted/rejected), question_id, user_id"],
              ["transcriptions", "Textual transcriptions of voice responses", "transcription_text, voice_response_id, user_id, edit_count, status"],
              ["transcription_locks", "Atomic locking mechanism for transcription assignment", "voice_response_id, user_id, locked_at, expires_at"],
              ["user_progress", "Per-category completion tracking for volunteers", "category_id, user_id, completed_questions, total_questions"],
              ["user_roles", "Role-based access control (admin/user)", "user_id, role (app_role enum)"],
              ["user_activity_logs", "Audit trail for platform interactions", "user_id, action, page, details (JSONB)"],
            ].map(([table, purpose, fields], i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                <td className="border border-border px-3 py-2 font-mono text-[12px]">{table}</td>
                <td className="border border-border px-3 py-2">{purpose}</td>
                <td className="border border-border px-3 py-2 text-[12px]">{fields}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground mb-4 italic">Table 2: Database schema overview.</p>

      <h3 className="text-[15px] font-semibold mb-2">2.3. Security and access control</h3>
      <p className="text-justify mb-4">
        Security is enforced at the database level through PostgreSQL Row-Level Security (RLS) policies on all tables. A custom <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">has_role()</code> function, defined with <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">SECURITY DEFINER</code> privileges, enables non-recursive role checking within RLS policies. The <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">user_roles</code> table stores role assignments using a PostgreSQL enum (<code className="text-[13px] bg-muted/50 px-1 rounded font-mono">app_role</code>) with values <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">'admin'</code> and <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">'user'</code>. This architecture ensures that role verification occurs at the database layer rather than the client, preventing privilege escalation attacks.
      </p>
      <p className="text-justify mb-4">
        The <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">voice_responses</code> table implements a three-state status enum (<code className="text-[13px] bg-muted/50 px-1 rounded font-mono">pending</code>, <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">accepted</code>, <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">rejected</code>) enabling administrator quality control before recordings enter the dataset pipeline. Each user can only access their own recordings, while transcribers gain read-only access to voice responses they have been assigned through the locking mechanism.
      </p>

      <h3 className="text-[15px] font-semibold mb-2">2.4. Authentication and consent</h3>
      <p className="text-justify mb-4">
        User authentication is handled through GoTrue with email/password registration. New accounts require email verification before access is granted. The registration flow collects demographic metadata (age, gender, dialect) that serves dual purposes: user profiling and dataset annotation. A dedicated consent workflow records explicit voice recording consent with timestamps (<code className="text-[13px] bg-muted/50 px-1 rounded font-mono">voice_recording_consent</code>, <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">consent_timestamp</code>) before volunteers can begin recording. Transcribers must additionally agree to transcription guidelines, tracked via <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">transcription_guidelines_agreed</code> and <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">transcription_guidelines_agreed_at</code> fields.
      </p>

      <h3 className="text-[15px] font-semibold mb-2">2.5. Functionalities</h3>

      <h4 className="text-[14px] font-semibold italic mb-1">2.5.1. Voice recording module</h4>
      <p className="text-justify mb-4">
        Authenticated volunteers navigate a structured set of health-related questions organised by category. For each question, the volunteer records a spoken response in their native language using the browser's MediaRecorder API. The system captures audio in WebM/Opus format, provides real-time waveform visualisation during recording via the <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">AudioWaveform</code> component, and uploads the audio file to cloud storage upon submission. Metadata — including duration, question association, and user identity — is persisted in the database. Progress tracking allows volunteers to resume across sessions, with category-level completion indicators displayed on their dashboard through the <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">SegmentedProgress</code> component.
      </p>

      <h4 className="text-[14px] font-semibold italic mb-1">2.5.2. Transcription module</h4>
      <p className="text-justify mb-4">
        Approved transcribers are assigned voice recordings through an atomic locking mechanism implemented as a PostgreSQL function (<code className="text-[13px] bg-muted/50 px-1 rounded font-mono">claim_random_transcription</code>). This function randomly selects an untranscribed recording, assigns it to the requesting transcriber, and creates a time-limited lock (via the <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">transcription_locks</code> table) to prevent concurrent assignment. A complementary <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">release_transcription_lock</code> function handles lock expiry. Transcribers listen to the audio and provide a textual transcription in the original language. The system tracks edit counts and submission timestamps. Comprehensive transcription guidelines — covering borrowed word handling, punctuation conventions, and dialectal variations — are accessible via the <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">TranscriptionGuidelinesReference</code> panel.
      </p>

      <h4 className="text-[14px] font-semibold italic mb-1">2.5.3. Administration and quality assurance module</h4>
      <p className="text-justify mb-4">
        Administrators access a comprehensive dashboard providing real-time statistics: total recordings, transcriptions completed, active users (tracked via the <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">usePresenceTracking</code> hook), and per-question response distributions. The admin panel includes user management (verification, role assignment via dedicated user tables), response review (accept/reject recordings with status transitions), transcription oversight, and activity logging through the <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">user_activity_logs</code> table. A dataset export capability enables administrators to extract paired audio-transcription records for downstream ASR model training.
      </p>

      <h3 className="text-[15px] font-semibold mb-2">2.6. Mobile-first design and offline resilience</h3>
      <p className="text-justify mb-4">
        Recognising that most target users access the platform via mobile devices, <em>JasinaHub</em> is implemented as a Progressive Web Application (PWA) with mobile-first design principles. The interface employs responsive layouts, touch-optimised controls, and native-like interactions including haptic feedback (<code className="text-[13px] bg-muted/50 px-1 rounded font-mono">useHapticFeedback</code> hook), swipe gestures for navigation (<code className="text-[13px] bg-muted/50 px-1 rounded font-mono">useSwipeGesture</code> hook), and pull-to-refresh functionality (<code className="text-[13px] bg-muted/50 px-1 rounded font-mono">usePullToRefresh</code> hook).
      </p>
      <p className="text-justify mb-4">
        To prevent data loss on unstable network connections — a common reality in many African communities — the platform implements a robust offline recovery system. Audio recordings are persisted to IndexedDB/localStorage via a dedicated <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">recordingStorage</code> service before upload begins. If an upload is interrupted, the <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">RecoveryDialog</code> component automatically detects orphaned recordings on the user's next visit and prompts them to resume or retry the upload. An <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">OfflineIndicator</code> component provides real-time network status feedback.
      </p>

      <h3 className="text-[15px] font-semibold mb-2">2.7. Activity tracking and monitoring</h3>
      <p className="text-justify">
        The platform implements comprehensive activity monitoring through the <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">useActivityTracker</code> hook, which logs user interactions (page visits, recording submissions, transcription completions) to the <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">user_activity_logs</code> table. Real-time presence tracking via the <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">PresenceTracker</code> component enables administrators to monitor concurrent platform usage. The admin dashboard visualises this data through interactive charts (built with Recharts) showing recording trends, transcription progress, and user engagement metrics.
      </p>
    </section>
  );
}
