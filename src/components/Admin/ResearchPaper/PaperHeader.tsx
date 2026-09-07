export function PaperHeader() {
  return (
    <header className="mb-8">
      <h1 className="text-[22px] font-bold leading-tight mb-3">
        <em>JasinaHub</em>: A Web-Based Platform for Curating Speech Datasets in Low-Resource African Languages Toward Automatic Speech Recognition
      </h1>

      <div className="text-sm mb-2">
        <p className="font-semibold">
          Braxton Mandara<sup>a,*</sup>
        </p>
      </div>

      <div className="text-[12px] text-muted-foreground mb-3 space-y-0.5">
        <p>
          <sup>a</sup> DSAIL Research Group, Dedan Kimathi University of Technology, Nyeri, Kenya
        </p>
        <p>
          <sup>*</sup> Corresponding author.
        </p>
      </div>

      <hr className="border-t-2 border-primary/20" />
    </header>
  );
}
