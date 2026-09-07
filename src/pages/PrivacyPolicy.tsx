import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Shield, Lock, UserCheck, Trash2, Download, Scale } from "lucide-react";

const retention: { category: string; rule: string }[] = [
  {
    category: "Account and contact records",
    rule: "Retained for 30 days after account closure to complete account administration.",
  },
  {
    category: "Consent, withdrawal, and rights requests",
    rule: "Consent records: 5 years after study completion, to document authorised processing. Withdrawal and rights-request records: 3 years after resolution, to document the response and compliance.",
  },
  {
    category: "Rejected or abandoned recordings",
    rule: "Deleted within 30 days after rejection or after a submission is marked abandoned.",
  },
  {
    category: "Accepted recordings, transcripts, and metadata",
    rule: "Retained for 5 years after study completion for research validation and reproducibility, with continued necessity reviewed every 12 months.",
  },
  {
    category: "Activity, presence, audit, and security records",
    rule: "Activity and presence records: 90 days after collection. Audit and security records: 12 months after creation.",
  },
  {
    category: "Browser recovery copies and drafts",
    rule: "Until handled or removed as described above; clearing site data may destroy unsent work.",
  },
  {
    category: "Backups",
    rule: "Residual copies deleted or overwritten within 90 days after deletion of the corresponding records from active systems.",
  },
  {
    category: "Controlled exports and recipient copies",
    rule: "Period authorised in the relevant data-access agreement.",
  },
  {
    category: "Research outputs and trained models",
    rule: "Documented research/model-governance period, subject to the rights and limitations in Section 5.",
  },
];

const sections: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Information We Collect",
    body: (
      <>
        <p>
          We collect information directly from you, through administrators, and automatically through operation of the
          Service:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Account and contact details:</strong> email address, password, first and last name, telephone
            number, age, gender, and dialect; administrator-verification status, account role, and transcription
            approval. Required fields are identified in the registration form; without them, you cannot create or
            verify an account. Other fields are optional.
          </li>
          <li>
            <strong>Contributions and consent:</strong> voice recordings in WebM/Opus format, text responses, prompts,
            recording duration, transcripts, corrections, timestamps, and review status; whether and when you consented
            to participation and accepted transcription guidelines.
          </li>
          <li>
            <strong>Participant and sensitive information:</strong> language, dialect, demographics, and other
            project-specific attributes you provide. We do not collect clinical records as part of this workflow.
          </li>
          <li>
            <strong>Operational and usage information:</strong> page visits, submissions, task reservations and expiry
            times, progress, presence, network state, browser/device information, error and security logs, review
            decisions, and administrative actions. These records may be linked to your account; they are not
            necessarily non-personal telemetry.
          </li>
          <li>
            <strong>Feedback:</strong> responses about your experience with the Service. Feedback records are stored
            anonymously to limit identification of responses with users. Avoid including personally-identifying details
            in feedback.
          </li>
        </ul>
        <p>
          <strong>Browser storage.</strong> Supabase GoTrue stores session information for authentication. JasinaHub
          uses <code className="font-mono text-xs">localStorage</code> for recoverable audio copies, browser storage for
          unfinished transcripts, and service-worker caching for interface resources. These support interrupted-upload
          recovery and the installable application. Activity and presence records are stored in the managed database.
          Browser recovery does not mean that submitted data remain local; see Section 4.
        </p>
        <p>
          <strong>Voice identifiability.</strong> Personal data include information relating to an identifiable person.
          Removing a name from audio does not make it anonymous: a familiar person or technical system may recognise the
          speaker. Voice processed for unique identification may constitute biometric data. A response may also reveal
          information about someone else.
        </p>
      </>
    ),
  },
  {
    title: "2. How and Why We Use Information",
    body: (
      <>
        <p>We use information to:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>create, authenticate, verify, and administer accounts, roles, and requested support;</li>
          <li>
            collect spontaneous and read speech or text, prepare and review transcripts, curate datasets, and measure
            contribution progress;
          </li>
          <li>
            develop, train, adapt, test, and evaluate speech and language technologies, including automatic speech
            recognition systems such as Jasina ASR;
          </li>
          <li>
            coordinate transcription tasks, recover interrupted work, prevent misuse, investigate errors or incidents,
            and maintain audit records;
          </li>
          <li>
            improve performance, data quality, and usability, and report research findings and aggregate participation
            statistics; and
          </li>
          <li>respond to data-rights requests and meet applicable legal and research-governance requirements.</li>
        </ul>
        <p>
          <strong>Legal grounds and consent.</strong> Under Kenya's Data Protection Act, 2019 and applicable
          regulations, the purposes and grounds described by this policy are:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Requested account services and support:</strong> steps necessary to provide the Service requested by
            the user.
          </li>
          <li>
            <strong>Contribution collection, research, and compatible model development:</strong> explicit informed
            consent and the applicable condition for sensitive-data processing.
          </li>
          <li>
            <strong>Security, task coordination, quality assurance, and improvement:</strong> legitimate operational,
            research, and security interests, assessed against your rights and freedoms; this does not override limits
            in your research consent.
          </li>
          <li>
            <strong>Required records and regulatory responses:</strong> applicable legal obligations. Institutional and
            ethics requirements also govern how the project operates.
          </li>
          <li>
            <strong>Controlled research sharing:</strong> participant consent and documented project-governance and
            data-access conditions.
          </li>
        </ul>
        <p>
          Future research is limited to compatible speech, language, data-quality, accessibility, and related
          language-technology research explained when consent was obtained. Materially incompatible use, public release
          of identifiable recordings, or materially broader sharing requires a new lawful basis and fresh consent where
          required. Before new high-risk processing or material changes, DSAIL will complete or review a Data Protection
          Impact Assessment and record the applicable sensitive-data condition.
        </p>
        <p>
          <strong>Automated functions and human review.</strong> The Service calculates progress, retires prompts at
          configured response thresholds, selects eligible transcription candidates, manages expiring task locks and
          skipped candidates, records activity and presence, and detects recoverable work. Administrators manually
          verify volunteers, approve transcribers, review recordings and transcripts, and authorise exports. The
          described Service does not make legal or similarly significant participant decisions solely by automated
          means. You may request reconsideration using Section 6.
        </p>
      </>
    ),
  },
  {
    title: "3. Sharing and International Transfers",
    body: (
      <>
        <p>
          We do not sell personal data or use participant contact details for unrelated commercial advertising. We limit
          access to what is needed for an authorised purpose. Recipients may include:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            authorised DSAIL/DeKUT staff, administrators, and approved transcribers with access to temporarily reserved
            recordings;
          </li>
          <li>
            <strong>Supabase</strong>, providing authentication, managed PostgreSQL, serverless functions, and audio
            storage, and <strong>Vercel</strong>, providing web hosting and delivery;
          </li>
          <li>
            authorised research collaborators and controlled-dataset recipients whose proposed use is consistent with
            participant consent and project governance;
          </li>
          <li>institutional ethics, audit, legal, security, and research-oversight personnel; and</li>
          <li>
            courts, regulators, law-enforcement bodies, or other authorities where disclosure is lawfully required or
            necessary to protect a person, the Service, or legal rights.
          </li>
        </ul>
        <p>
          Dataset exports replace names with unique contributor codes. This is <em>pseudonymisation</em>: contributions
          from the same person remain linked, and audio, transcripts, prompts, demographics, dialect, and provenance may
          remain identifiable. Access is controlled rather than treated as anonymous public release.
        </p>
        <p>
          Providers and research recipients must limit use to the authorised purpose and comply with contractual and
          legal safeguards. Funding alone does not grant access to participant-level data. The software's open-source
          licence does not authorise access to or unrestricted reuse of contributed data.
        </p>
      </>
    ),
  },
  {
    title: "4. Storage, Retention, and Security",
    body: (
      <>
        <p>
          <strong>Local and cloud storage.</strong> Submitted recordings and associated records are stored in managed
          cloud infrastructure. Unsent audio and unfinished transcripts may also remain in your browser for recovery. A
          local copy may remain until successful handling, removal by you or the Service, or clearing or eviction by the
          browser. Authentication information is subject to the configured session, expiry, and revocation rules. Cached
          resources support the application interface under degraded connectivity; the Service is not wholly offline.
        </p>
        <p>
          <strong>Retention.</strong> We retain information only as reasonably needed for the stated purposes, consent
          conditions, and approved research protocol, including reproducibility, dataset stewardship, security, audit,
          dispute resolution, and legal requirements.
        </p>
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200">
          <strong>Draft sample schedule.</strong> The periods below are illustrative examples for editing, not statutory
          requirements or confirmed JasinaHub practices. Before publication, approve them against the consent terms,
          research protocol, institutional requirements, and actual deletion and backup capabilities. They do not
          override earlier erasure obligations.
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-semibold text-foreground p-3 w-1/3">Record category</th>
                <th className="text-left font-semibold text-foreground p-3">Sample retention rule</th>
              </tr>
            </thead>
            <tbody>
              {retention.map((r) => (
                <tr key={r.category} className="border-t border-border align-top">
                  <td className="p-3 font-medium text-foreground">{r.category}</td>
                  <td className="p-3">{r.rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          After the applicable period, information is securely deleted, de-identified, or retained only for a lawful,
          documented reason.
        </p>
        <p>
          <strong>Safeguards.</strong> Controls include database Row-Level Security, separate role records,
          administrator verification, approved transcriber access, email/password authentication, restricted export
          functions, activity logging, and administrative quality review. Atomic transcription-candidate reservations
          prevent concurrent work; the described deployment uses a configurable 10-minute lease. Exports omit names,
          while upload recovery reduces accidental loss. Source-code transparency supplements these safeguards; it does
          not guarantee security or anonymity.
        </p>
        <p>
          No transmission or storage system is completely secure. We investigate, mitigate, and document breaches, and
          notify the ODPC and affected people within legally required periods where the relevant notification conditions
          apply. Report a security concern using Section 6 for escalation to DeKUT's data protection office.
        </p>
      </>
    ),
  },
  {
    title: "5. Your Rights and Choices",
    body: (
      <>
        <p>
          <strong>Participation and eligibility.</strong> Participation is voluntary and intended for adults aged{" "}
          <strong>18 years or older</strong>. You may skip prompts, stop recording, or leave without submitting work. Do
          not create a participant account or submit recordings if under 18. If we learn that children's data were
          collected without appropriate authorisation, we will take reasonable steps to remove them.
        </p>
        <p>
          Do not record others without authority or disclose names, addresses, identification numbers, telephone
          numbers, or other private information in contributions. Identifying content may be flagged, marked as{" "}
          <code className="font-mono text-xs">[personal information]</code> in a transcript, redacted where practicable,
          or rejected during review.
        </p>
        <p>
          <strong>Data-protection rights.</strong> Subject to applicable law, you may:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>be informed about processing and request access to your personal data;</li>
          <li>request correction, object to processing, or request restriction;</li>
          <li>withdraw consent, delete your account, and request erasure of eligible contributions;</li>
          <li>request portable data where that right applies; and</li>
          <li>request information and human review concerning significant solely automated decisions.</li>
        </ul>
        <p>
          These rights concern your personal data, including recordings, transcripts, account details, and linked
          activity records, not only contact information. Send a request to{" "}
          <a className="text-primary underline" href="mailto:dsail-info@dkut.ac.ke">
            dsail-info@dkut.ac.ke
          </a>
          , preferably from your account email, identifying the request and relevant records. We may verify your
          identity. Subject to applicable exceptions, we provide access within seven days and respond to rectification
          or erasure requests within fourteen days. We explain lawful limitations, refusals, extensions, or permitted
          fees and offer internal reconsideration.
        </p>
        <p>
          <strong>Withdrawal and completed research.</strong> Withdrawal does not invalidate earlier lawful processing.
          After verification, we remove eligible information from active systems and exclude it from future dataset
          releases and training runs where required and reasonably practicable. We instruct authorised recipients to
          restrict or erase eligible copies when required by law or agreement. Necessary compliance records and backup
          copies pending overwrite may remain.
        </p>
        <p>
          Completed publications, aggregate results, irreversibly anonymised material, or model parameters from which a
          contribution cannot reasonably be isolated may limit removal. Each limitation is assessed and explained
          individually. Trained models are not an automatic exemption from your rights.
        </p>
        <p>
          <strong>Browser controls.</strong> You may clear or restrict site storage through browser settings, but this
          can sign you out, remove unsent audio or drafts, or disable functions. Clearing local data does not delete
          server-held contributions. This notice does not promise a telemetry-disable setting. The described deployment
          does not use advertising cookies or third-party behavioural advertising; if non-essential tracking is
          introduced, we will update this notice and obtain consent where required.
        </p>
      </>
    ),
  },
  {
    title: "6. Contact, Complaints, and Policy Updates",
    body: (
      <>
        <p>For privacy, participation, security, support, collaboration, or rights requests, contact:</p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <tbody>
              <tr className="align-top">
                <td className="p-3 font-medium text-foreground w-1/3">Controller</td>
                <td className="p-3">Dedan Kimathi University of Technology, acting through DSAIL</td>
              </tr>
              <tr className="border-t border-border align-top">
                <td className="p-3 font-medium text-foreground">Address</td>
                <td className="p-3">Along Nyeri&ndash;Mweiga Road; P.O. Box 657&ndash;10100, Nyeri, Kenya</td>
              </tr>
              <tr className="border-t border-border align-top">
                <td className="p-3 font-medium text-foreground">Privacy and support</td>
                <td className="p-3">
                  <a className="text-primary underline" href="mailto:dsail-info@dkut.ac.ke">
                    dsail-info@dkut.ac.ke
                  </a>
                  ; requests may be referred to the University's designated data protection office
                </td>
              </tr>
              <tr className="border-t border-border align-top">
                <td className="p-3 font-medium text-foreground">Policy page</td>
                <td className="p-3">
                  <a
                    className="text-primary underline"
                    href="https://jasinahub.vercel.app/privacy-policy"
                    target="_blank"
                    rel="noreferrer"
                  >
                    jasinahub.vercel.app/privacy-policy
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          You may complain to Kenya's <strong>Office of the Data Protection Commissioner (ODPC)</strong> through{" "}
          <a
            className="text-primary underline"
            href="https://www.odpc.go.ke/file-a-complaint/"
            target="_blank"
            rel="noreferrer"
          >
            its complaint service
          </a>
          . Contacts:{" "}
          <a className="text-primary underline" href="mailto:info@odpc.go.ke">
            info@odpc.go.ke
          </a>
          ; 020 780 1800. The Nyeri regional contact is{" "}
          <a className="text-primary underline" href="mailto:nyeri@odpc.go.ke">
            nyeri@odpc.go.ke
          </a>
          .
        </p>
        <p>
          We may update this policy as practices change, showing its version and revision date on the policy page and
          providing notice and renewed consent where required. External websites and repository hosts have their own
          privacy notices. Never post private participant data in public issues or discussions.
        </p>
      </>
    ),
  },
];

const highlights = [
  { icon: Shield, title: "Pseudonymised exports", text: "Dataset exports omit names, but voices may remain identifiable." },
  { icon: UserCheck, title: "Voluntary participation", text: "You may skip prompts, stop recording, or leave at any time." },
  { icon: Trash2, title: "Withdraw and erase", text: "Withdraw consent, delete your account and request erasure." },
  { icon: Download, title: "Access your data", text: "Request access to and a portable copy of your personal data." },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            <span className="font-semibold">Privacy Policy</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        <section className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">JasinaHub Privacy Policy</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This policy explains how <strong className="text-foreground">JasinaHub</strong> (the "Service") collects,
            uses, shares, and protects information when you use its hosted website and Progressive Web Application,
            contribute speech or text, transcribe recordings, or contact the project. JasinaHub is an open-source web
            platform developed by the{" "}
            <strong className="text-foreground">Centre for Data Science and Artificial Intelligence (DSAIL)</strong> at{" "}
            <strong className="text-foreground">Dedan Kimathi University of Technology (DeKUT)</strong>. In this policy,
            "we", "our", and "us" refer to DeKUT acting through DSAIL, the data controller for the Service.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" /> Last updated:{" "}
            {new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </section>

        <section className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-sm leading-relaxed">
          Participation is voluntary. Recordings and related data are uploaded to managed cloud services, not kept
          exclusively on your device. We do not sell personal data. Dataset exports omit contributor names, but voices
          may remain identifiable. Open-source access to the software does not make participant data publicly available.
        </section>

        <p className="text-sm text-muted-foreground">
          Read this policy together with the informed-consent information presented before participation. Additional or
          more restrictive project-specific consent conditions also apply.
        </p>

        <section className="grid sm:grid-cols-2 gap-4">
          {highlights.map((h) => (
            <Card key={h.title} className="bg-card/70 backdrop-blur-sm">
              <CardContent className="p-4 flex gap-3">
                <h.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">{h.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{h.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <article className="space-y-8">
          {sections.map((s) => (
            <section key={s.title} className="space-y-3">
              <h2 className="text-xl font-semibold tracking-tight border-b border-primary/30 pb-2">{s.title}</h2>
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground">
                {s.body}
              </div>
            </section>
          ))}
        </article>
      </main>
    </div>
  );
}
