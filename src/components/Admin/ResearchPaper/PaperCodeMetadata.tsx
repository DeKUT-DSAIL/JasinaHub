export function PaperCodeMetadata() {
  const rows = [
    ["Current code version", "v1.0"],
    ["Permanent link to code/repository", "GitHub (Private Repository)"],
    ["Permanent link to reproducible capsule", "—"],
    ["Legal code license", "MIT"],
    ["Code versioning system used", "Git"],
    ["Software code languages", "TypeScript, SQL, HTML, CSS"],
    ["Compilation requirements / dependencies", "Node.js ≥ 18, React 18, Vite 5, Supabase JS SDK"],
    ["Developer documentation / manual", "In-app Admin Documentation Tab"],
    ["Support email for questions", "dsail@dkut.ac.ke"],
  ];

  return (
    <section className="mb-8">
      <h2 className="text-[13px] font-bold uppercase tracking-wider mb-3">Code Metadata</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <tbody>
            {rows.map(([label, value], i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                <td className="border border-border px-3 py-2 font-semibold w-[45%]">{label}</td>
                <td className="border border-border px-3 py-2">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1 italic">Table 1: Code metadata.</p>
    </section>
  );
}
