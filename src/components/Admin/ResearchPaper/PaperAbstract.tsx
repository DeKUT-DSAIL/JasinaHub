export function PaperAbstract() {
  return (
    <section className="mb-8">
      <h2 className="text-[13px] font-bold uppercase tracking-wider mb-2">Abstract</h2>
      <p className="text-[14px] text-justify">
        The development of Automatic Speech Recognition (ASR) systems for African languages is critically hindered by the scarcity of structured, high-quality speech corpora. <em>JasinaHub</em> is an open-source web-based platform designed to address this gap by enabling community-driven collection and transcription of voice data in low-resource African languages. The platform provides a structured data collection pipeline where volunteers respond to categorised health-related prompts in their native language, producing paired audio-transcription datasets suitable for ASR model training. Built on a modern serverless architecture using React, TypeScript, and a Backend-as-a-Service (BaaS) infrastructure, <em>JasinaHub</em> implements role-based access control, atomic transcription locking, offline resilience, and administrative quality assurance workflows. The system features a comprehensive database schema with Row-Level Security policies, mobile-first progressive web application design with haptic feedback and gesture navigation, and an informed consent framework for ethical data collection. <em>JasinaHub</em> is currently deployed for Kikuyu language data collection and is designed to be extensible to other under-resourced African languages.
      </p>
      <div className="mt-3">
        <span className="text-[12px] font-bold uppercase tracking-wider">Keywords: </span>
        <span className="text-[13px] italic">Speech corpus; Low-resource languages; Automatic Speech Recognition; Voice data collection; Transcription; African languages; Kikuyu; Progressive Web Application</span>
      </div>
    </section>
  );
}
