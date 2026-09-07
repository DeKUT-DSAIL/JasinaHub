import { MermaidDiagram } from "./MermaidDiagram";
import {
  useCaseDiagram,
  recordingSequenceDiagram,
  transcriptionSequenceDiagram,
  erDiagram,
  componentDiagram,
} from "./diagramDefinitions";

export function PaperSystemDesign() {
  return (
    <section className="mb-8">
      <h2 className="text-[17px] font-bold mb-3">3. System design</h2>

      <p className="mb-4">
        This section presents the architectural design of JasinaHub through standard UML diagrams.
        The system follows a client-server architecture using a Backend-as-a-Service (BaaS) model,
        with a React single-page application communicating with PostgreSQL through auto-generated
        REST APIs secured by Row-Level Security policies.
      </p>

      <h3 className="text-[15px] font-bold mb-2">3.1 Use case diagram</h3>
      <p className="mb-2">
        The platform serves three primary actors: <em>Volunteers</em> who record voice responses,
        <em>Transcribers</em> who convert audio to text, and <em>Administrators</em> who manage
        quality assurance and dataset export. Figure 1 illustrates the complete set of use cases.
      </p>
      <MermaidDiagram
        chart={useCaseDiagram}
        caption="Use case diagram showing the three actor roles and their interactions with the JasinaHub system."
        figureNumber="Figure 1"
      />

      <h3 className="text-[15px] font-bold mb-2">3.2 Component and deployment architecture</h3>
      <p className="mb-2">
        JasinaHub is deployed as a progressive web application with a layered architecture.
        The client layer handles UI rendering, offline storage, and media capture. The BaaS
        layer provides authentication, database operations, file storage, and serverless functions.
        Figure 2 shows the component relationships across these layers.
      </p>
      <MermaidDiagram
        chart={componentDiagram}
        caption="Component and deployment diagram showing the layered architecture from client through backend to ASR dataset output."
        figureNumber="Figure 2"
      />

      <h3 className="text-[15px] font-bold mb-2">3.3 Voice recording sequence</h3>
      <p className="mb-2">
        The voice recording pipeline is the primary data collection mechanism. Figure 3
        details the interaction sequence from category selection through audio capture,
        IndexedDB backup, cloud upload, and database persistence.
      </p>
      <MermaidDiagram
        chart={recordingSequenceDiagram}
        caption="Sequence diagram for the voice recording and submission pipeline, including offline backup via IndexedDB."
        figureNumber="Figure 3"
      />

      <h3 className="text-[15px] font-bold mb-2">3.4 Transcription assignment sequence</h3>
      <p className="mb-2">
        Transcription uses an atomic locking mechanism to prevent duplicate work. The
        <code className="text-[12px] bg-muted px-1 rounded"> claim_random_transcription()</code> PostgreSQL
        function executes within a transaction, selecting an untranscribed response and inserting
        a time-limited lock. Figure 4 shows this sequence.
      </p>
      <MermaidDiagram
        chart={transcriptionSequenceDiagram}
        caption="Sequence diagram for the atomic transcription claiming and submission process with pessimistic locking."
        figureNumber="Figure 4"
      />

      <h3 className="text-[15px] font-bold mb-2">3.5 Entity-relationship diagram</h3>
      <p className="mb-2">
        The database schema comprises nine tables with foreign key constraints and
        Row-Level Security policies. The central entity is <code className="text-[12px] bg-muted px-1 rounded">voice_responses</code>,
        linking volunteers' recordings to questions and enabling downstream transcription.
        Figure 5 presents the complete ER diagram with attributes and cardinality.
      </p>
      <MermaidDiagram
        chart={erDiagram}
        caption="Entity-relationship diagram showing all nine database tables, their attributes, and relationships."
        figureNumber="Figure 5"
      />
    </section>
  );
}
