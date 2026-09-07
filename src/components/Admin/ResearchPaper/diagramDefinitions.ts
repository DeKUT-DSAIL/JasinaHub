export const useCaseDiagram = `
graph TB
  subgraph Actors
    V["Volunteer"]
    T["Transcriber"]
    A["Admin"]
  end

  subgraph JasinaHub System
    UC1["Register / Login"]
    UC2["Grant Voice Recording Consent"]
    UC3["Browse Question Categories"]
    UC4["Record Voice Response"]
    UC5["Review Own Recordings"]
    UC6["Agree to Transcription Guidelines"]
    UC7["Claim Transcription Task"]
    UC8["Submit Transcription"]
    UC9["Review Own Transcriptions"]
    UC10["View Dashboard Analytics"]
    UC11["Manage Users & Roles"]
    UC12["Verify Responses"]
    UC13["Export ASR Dataset"]
    UC14["Monitor Activity Logs"]
  end

  V --> UC1
  V --> UC2
  V --> UC3
  V --> UC4
  V --> UC5
  T --> UC1
  T --> UC6
  T --> UC7
  T --> UC8
  T --> UC9
  A --> UC10
  A --> UC11
  A --> UC12
  A --> UC13
  A --> UC14
`;

export const recordingSequenceDiagram = `
sequenceDiagram
  participant Vol as Volunteer
  participant UI as React Frontend
  participant IDB as IndexedDB
  participant Store as Object Storage
  participant DB as PostgreSQL

  Vol->>UI: Select category from Dashboard
  UI->>DB: Fetch questions for category
  DB-->>UI: Return question list
  UI->>Vol: Display QuestionCard with prompt
  Vol->>UI: Tap Record button
  UI->>UI: Activate MediaRecorder API
  UI->>UI: Render AudioWaveform visualisation
  UI->>IDB: Save recording backup (recordingStorage)
  Vol->>UI: Stop recording, tap Submit
  UI->>Store: Upload audio blob
  Store-->>UI: Return file URL
  UI->>DB: INSERT voice_responses (audio_url, duration, status=pending)
  DB-->>UI: Confirm insert
  UI->>DB: UPDATE user_progress
  UI->>IDB: Clear backup
  UI->>Vol: Show success + confetti animation
`;

export const transcriptionSequenceDiagram = `
sequenceDiagram
  participant Tr as Transcriber
  participant UI as React Frontend
  participant DB as PostgreSQL
  participant Lock as transcription_locks

  Tr->>UI: Navigate to Transcribe page
  UI->>DB: Verify transcription_approved = true
  UI->>DB: Call claim_random_transcription(user_id)
  DB->>DB: BEGIN TRANSACTION
  DB->>DB: SELECT random untranscribed response
  DB->>Lock: INSERT lock (expires_at = now + 30min)
  DB-->>UI: Return response data (audio_url, question)
  UI->>Tr: Display audio player + transcription area
  Tr->>Tr: Listen to audio
  Tr->>UI: Type transcription in native orthography
  Tr->>UI: Submit transcription
  UI->>DB: INSERT into transcriptions table
  UI->>DB: Call release_transcription_lock(user_id)
  DB->>Lock: DELETE expired/completed lock
  DB-->>UI: Confirm submission
  UI->>Tr: Show success feedback
`;

export const erDiagram = `
erDiagram
  profiles {
    uuid id PK
    text email
    text first_name
    text last_name
    text phone_number
    text gender
    int age
    text dialect
    text account_type
    bool verified
    bool transcription_approved
    bool voice_recording_consent
    timestamp consent_timestamp
  }

  categories {
    uuid id PK
    text name
    text description
  }

  questions {
    uuid id PK
    uuid category_id FK
    text question_text
    int order_index
    text image_url
    text image_attribution
  }

  voice_responses {
    uuid id PK
    uuid user_id FK
    uuid question_id FK
    text audio_file_url
    float duration_seconds
    enum status
    text response_type
  }

  transcriptions {
    uuid id PK
    uuid voice_response_id FK
    uuid user_id FK
    text transcription_text
    text status
    int edit_count
  }

  transcription_locks {
    uuid id PK
    uuid voice_response_id FK
    uuid user_id FK
    timestamp expires_at
  }

  user_roles {
    uuid id PK
    uuid user_id FK
    enum role
  }

  user_progress {
    uuid id PK
    uuid user_id FK
    uuid category_id FK
    int completed_questions
    int total_questions
    uuid last_question_id FK
  }

  user_activity_logs {
    uuid id PK
    uuid user_id FK
    text action
    text page
    json details
  }

  profiles ||--o{ voice_responses : "records"
  profiles ||--o{ transcriptions : "transcribes"
  profiles ||--o{ user_roles : "has"
  profiles ||--o{ user_progress : "tracks"
  profiles ||--o{ user_activity_logs : "generates"
  categories ||--o{ questions : "contains"
  questions ||--o{ voice_responses : "answered_by"
  voice_responses ||--o{ transcriptions : "transcribed_in"
  voice_responses ||--o| transcription_locks : "locked_by"
  categories ||--o{ user_progress : "tracked_in"
`;

export const componentDiagram = `
graph TB
  subgraph Client ["Client Layer - React SPA"]
    direction TB
    subgraph Pages ["Page Components"]
      P1["Dashboard"]
      P2["Questions"]
      P3["Transcribe"]
      P4["Admin Panel"]
      P5["Auth Pages"]
    end
    subgraph Core ["Core Modules"]
      C1["VoiceRecorder / MinimalRecorder"]
      C2["AudioWaveform"]
      C3["CategoryCard"]
      C4["QuestionCard"]
      C5["TranscriptionGuidelines"]
    end
    subgraph Infra ["Client Infrastructure"]
      I1["React Query - State"]
      I2["React Router - Navigation"]
      I3["IndexedDB - Offline Storage"]
      I4["Service Worker - PWA"]
      I5["Haptic / Gesture Hooks"]
    end
  end

  subgraph Backend ["Backend-as-a-Service Layer"]
    direction TB
    subgraph Auth ["Authentication"]
      A1["GoTrue Auth Service"]
      A2["RLS Policies"]
      A3["has_role SECURITY DEFINER"]
    end
    subgraph Data ["Data Layer"]
      D1["PostgreSQL Database"]
      D2["9 Tables with RLS"]
      D3["DB Functions"]
    end
    subgraph Services ["Services"]
      S1["Object Storage"]
      S2["Edge Functions - Deno"]
      S3["Realtime Subscriptions"]
    end
  end

  subgraph Output ["ASR Dataset Output"]
    O1["Audio Files - WebM/WAV"]
    O2["Transcription Text"]
    O3["Metadata - JSON/CSV"]
  end

  Pages --> Core
  Core --> Infra
  Infra --> Backend
  I1 --> D1
  C1 --> S1
  P5 --> A1
  A2 --> D2
  Data --> Output
  S1 --> Output
`;

export const highLevelArchitectureDiagram = `
graph LR
  subgraph Users ["End Users"]
    U1["Volunteers<br/>(Voice Contributors)"]
    U2["Transcribers<br/>(Text Annotators)"]
    U3["Administrators<br/>(QA & Curators)"]
  end

  subgraph Frontend ["Frontend - Progressive Web App"]
    F1["React 18 + Vite + TypeScript"]
    F2["Tailwind + Shadcn UI"]
    F3["IndexedDB Offline Cache"]
    F4["MediaRecorder API"]
    F5["Service Worker / PWA Shell"]
  end

  subgraph Backend ["Lovable Cloud - Backend as a Service"]
    B1["Auth Service<br/>(Email + Password)"]
    B2["PostgreSQL Database<br/>(9 tables, RLS enforced)"]
    B3["Object Storage<br/>(voice-recordings bucket)"]
    B4["Edge Functions - Deno<br/>(reset-password, migrate-drive-audio,<br/>upload-to-gcs)"]
    B5["Realtime Channels<br/>(presence + activity logs)"]
  end

  subgraph Logic ["Domain Logic in Postgres"]
    L1["claim_random_transcription()<br/>Atomic locking RPC"]
    L2["has_role() SECURITY DEFINER<br/>RBAC enforcement"]
    L3["get_question_counts()<br/>Question retirement"]
    L4["Triggers + RLS policies"]
  end

  subgraph Output ["ASR Dataset Pipeline"]
    O1["Audio Files<br/>(WebM / WAV)"]
    O2["Verbatim Transcriptions<br/>(native orthography)"]
    O3["Metadata Manifest<br/>(JSON / CSV)"]
    O4["Downstream ASR Training<br/>(wav2vec 2.0 / Whisper / MMS)"]
  end

  U1 -->|Records audio| Frontend
  U2 -->|Submits transcriptions| Frontend
  U3 -->|Reviews + exports| Frontend

  Frontend -->|HTTPS / JWT| Backend
  F3 -.->|Auto-recovery on reconnect| B3

  B2 --> Logic
  Logic --> B2

  B3 --> O1
  B2 --> O2
  B2 --> O3
  O1 --> O4
  O2 --> O4
  O3 --> O4
`;
