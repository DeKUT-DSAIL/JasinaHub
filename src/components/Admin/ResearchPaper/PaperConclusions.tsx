export function PaperConclusions() {
  return (
    <section className="mb-8">
      <h2 className="text-[17px] font-bold mb-3">6. Conclusions</h2>
      <p className="text-justify mb-4">
        <em>JasinaHub</em> presents a practical, deployable solution for the systematic collection of speech data in low-resource African languages. The platform combines structured data elicitation through health-related prompts, community-driven transcription with atomic locking and quality assurance mechanisms, mobile-first PWA design with offline resilience, comprehensive security through database-level RLS policies and role-based access control, and administrative tools for dataset curation and export. The system is currently operational for Kikuyu language data collection and has been designed with extensibility as a core principle.
      </p>
      <p className="text-justify">
        Future work will focus on four directions: (1) expanding the platform to additional African languages by onboarding new language communities, (2) integrating semi-automated transcription using preliminary ASR models trained on collected data to accelerate the transcription pipeline, (3) developing and benchmarking ASR models trained on <em>JasinaHub</em>-curated datasets to validate the quality and utility of the collected corpora, and (4) implementing inter-annotator agreement metrics to quantify transcription consistency across multiple transcribers.
      </p>
    </section>
  );
}
