import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaperHeader } from "./ResearchPaper/PaperHeader";
import { PaperAbstract } from "./ResearchPaper/PaperAbstract";
import { PaperCodeMetadata } from "./ResearchPaper/PaperCodeMetadata";
import { PaperMotivation } from "./ResearchPaper/PaperMotivation";
import { PaperSoftwareDescription } from "./ResearchPaper/PaperSoftwareDescription";
import { PaperSystemDesign } from "./ResearchPaper/PaperSystemDesign";
import { PaperIllustrativeExamples } from "./ResearchPaper/PaperIllustrativeExamples";
import { PaperImpact } from "./ResearchPaper/PaperImpact";
import { PaperConclusions } from "./ResearchPaper/PaperConclusions";
import { PaperReferences } from "./ResearchPaper/PaperReferences";

export function AdminResearchPaper() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="relative">
      <div className="flex justify-end mb-4 print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" />
          Print / Save PDF
        </Button>
      </div>

      <article className="research-paper-printable max-w-[720px] mx-auto bg-white dark:bg-gray-950 px-8 py-12 rounded-lg border border-border shadow-sm font-serif text-[15px] leading-[1.8] text-gray-900 dark:text-gray-100 print:shadow-none print:border-none print:px-0">
        <PaperHeader />
        <PaperAbstract />
        <PaperCodeMetadata />
        <PaperMotivation />
        <PaperSoftwareDescription />
        <PaperSystemDesign />
        <PaperIllustrativeExamples />
        <PaperImpact />
        <PaperConclusions />
        <PaperReferences />
      </article>
    </div>
  );
}
