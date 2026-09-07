export function PaperIllustrativeExamples() {
  return (
    <section className="mb-8">
      <h2 className="text-[17px] font-bold mb-3">4. Illustrative examples</h2>

      <h3 className="text-[15px] font-semibold mb-2">4.1. Volunteer recording workflow</h3>
      <p className="text-justify mb-4">
        A Kikuyu-speaking community health volunteer registers on <em>JasinaHub</em> using their email address and phone number, providing demographic metadata (age, gender, dialect region) during signup. After email verification, they are presented with a consent modal explaining how their voice data will be used for ASR research. Upon granting consent (recorded with timestamp), they access their dashboard, which displays available question categories (e.g., "Maternal Health", "Nutrition", "Common Ailments") as interactive cards with progress indicators. Selecting a category presents a sequence of health-related prompts with optional contextual images. For each prompt, the volunteer taps the record button, speaks their response naturally in Kikuyu, observes real-time waveform feedback, and submits. The recording is backed up to local storage before upload, ensuring no data loss. A segmented progress bar tracks completion across all categories, and the volunteer can return at any time to continue from where they left off.
      </p>

      <h3 className="text-[15px] font-semibold mb-2">4.2. Transcription workflow</h3>
      <p className="text-justify mb-4">
        An approved transcriber (whose <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">transcription_approved</code> flag has been set by an administrator) logs in and navigates to the Transcription page. They first agree to transcription guidelines covering conventions for borrowed words, punctuation, and dialectal variations. The platform automatically assigns an untranscribed recording using the atomic <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">claim_random_transcription</code> function, which executes within a database transaction to ensure no two transcribers receive the same recording simultaneously. The 30-minute lock prevents stale assignments. The transcriber listens to the audio, reads the original question prompt for context, and types the transcription in Kikuyu orthography. Upon submission, the lock is released and a new recording is presented. Completed transcriptions are accessible on the "My Transcriptions" page with audio playback and edit capabilities.
      </p>

      <h3 className="text-[15px] font-semibold mb-2">4.3. Dataset curation pipeline</h3>
      <p className="text-justify mb-4">
        An administrator reviews incoming recordings on the Responses tab, marking each as "accepted" or "rejected" based on audio quality, relevance, and completeness. The admin dashboard provides real-time statistics via the <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">get_admin_chart_data</code> and <code className="text-[13px] bg-muted/50 px-1 rounded font-mono">get_question_unique_user_counts</code> database functions, enabling monitoring of collection coverage across questions and categories. Accepted recordings that have been transcribed form complete data pairs. The administrator can export the dataset — consisting of audio file URLs, transcription texts, speaker metadata (age, gender, dialect), question identifiers, and duration — in formats compatible with standard speech recognition training frameworks such as those used by wav2vec 2.0 and Whisper.
      </p>
    </section>
  );
}
