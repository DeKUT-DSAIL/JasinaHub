export function PaperImpact() {
  return (
    <section className="mb-8">
      <h2 className="text-[17px] font-bold mb-3">5. Impact</h2>
      <p className="text-justify mb-4">
        <em>JasinaHub</em> contributes to the growing body of work on digital inclusion and language technology equity. By providing an accessible, structured platform for speech data collection, it enables communities to directly participate in building the technological infrastructure for their own languages. The health-domain focus ensures that the resulting datasets have immediate practical applications in clinical speech technology, aligning with the WHO Global Strategy on Digital Health [7].
      </p>
      <p className="text-justify mb-4">
        The community-driven model — where speakers, transcribers, and quality reviewers all contribute distinct expertise — distributes the workload of corpus creation and embeds local linguistic knowledge directly into the dataset. This is particularly important for languages with significant dialectal variation, where native speaker judgement is essential for accurate transcription. The platform's consent framework and demographic metadata collection establish an ethical foundation for data provenance and speaker attribution.
      </p>
      <p className="text-justify mb-4">
        The technical architecture demonstrates that production-quality data collection platforms can be built using modern serverless infrastructure without requiring dedicated backend engineering teams. The combination of RLS policies, atomic database functions, and PWA capabilities provides a replicable pattern for similar initiatives targeting other under-resourced language communities.
      </p>
      <p className="text-justify">
        The platform's modular architecture and category-based question system make it readily adaptable to new languages and domains. Adding support for a new African language requires only the creation of appropriate question sets and the onboarding of native-speaker volunteers and transcribers — no architectural changes to the platform are necessary.
      </p>
    </section>
  );
}
