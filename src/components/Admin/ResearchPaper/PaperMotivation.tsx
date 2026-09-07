export function PaperMotivation() {
  return (
    <section className="mb-8">
      <h2 className="text-[17px] font-bold mb-3">1. Motivation and significance</h2>
      <p className="text-justify mb-4">
        Africa is home to over 2,000 languages, yet the vast majority remain critically under-represented in modern speech technology. While ASR systems for high-resource languages such as English and Mandarin have achieved near-human accuracy, African languages lack the foundational speech corpora necessary to train competitive models. This disparity limits access to voice-driven technologies — including virtual assistants, medical transcription tools, and accessibility software — for hundreds of millions of speakers.
      </p>
      <p className="text-justify mb-4">
        Existing speech datasets overwhelmingly favour languages with large digital footprints. Projects such as Common Voice by Mozilla have made progress in crowdsourcing speech data, but participation from African language communities remains low due to digital literacy barriers, limited internet penetration, and the absence of localised collection interfaces. Furthermore, health-domain speech data — essential for clinical NLP applications — is virtually non-existent for most African languages.
      </p>
      <p className="text-justify mb-4">
        <em>JasinaHub</em> addresses this gap by providing a purpose-built, mobile-optimised platform that lowers the barrier to participation. Rather than relying on open-ended crowd contributions, the platform uses structured health-related question prompts organised into thematic categories. This guided approach ensures consistency in the collected data, produces naturally elicited speech (as opposed to read speech), and generates paired audio-transcription records that are immediately usable for supervised ASR training.
      </p>
      <p className="text-justify mb-4">
        The name <em>JasinaHub</em> is derived from the Swahili word <em>"fasiri"</em> meaning "to translate" or "to interpret", reflecting the platform's mission to bridge the gap between spoken African languages and digital understanding through speech technology.
      </p>

      <h3 className="text-[15px] font-semibold mb-2">1.1. Related work</h3>
      <p className="text-justify mb-4">
        Several initiatives have contributed to speech data collection for under-resourced languages. Mozilla Common Voice [1] provides a crowdsourced platform for read speech in multiple languages, but its open-ended contribution model and English-centric interface limit participation from African language communities. The Masakhane project [5] has advanced machine translation for African languages through community-driven research, though its focus remains on text rather than speech modalities.
      </p>
      <p className="text-justify mb-4">
        The Multilingual LibriSpeech (MLS) dataset [6] provides large-scale speech data but covers only eight European languages. Wav2vec 2.0 [2] and XLSR [3] have demonstrated the potential of self-supervised learning to reduce data requirements for ASR, yet they still require substantial amounts of labelled speech data for fine-tuning — data that does not exist for most African languages.
      </p>
      <p className="text-justify">
        <em>JasinaHub</em> differs from these approaches in three key respects: (1) it uses structured prompts rather than read-aloud scripts, producing more naturalistic speech; (2) it implements a complete pipeline from collection through transcription to dataset export, rather than focusing on a single stage; and (3) it is designed as a mobile-first progressive web application, acknowledging that most African language speakers access the internet primarily through mobile devices.
      </p>
    </section>
  );
}
