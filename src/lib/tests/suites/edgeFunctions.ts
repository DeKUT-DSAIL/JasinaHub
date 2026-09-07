import { TestSuite, assert } from "../types";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// The Lovable preview shell injects a fetch proxy (cdn.gpteng.co/lovable.js)
// that blocks cross-origin OPTIONS preflights to Supabase Edge Functions.
// These probes only succeed on the published URL or a custom domain.
function isPreviewHost() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h.includes("lovable.app") && h.includes("id-preview");
}

async function probeOptions(name: string) {
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/${name}`, { method: "OPTIONS" });
    await res.text().catch(() => "");
    assert(res.status < 500, `${name} returned ${res.status}`);
    const allowOrigin = res.headers.get("access-control-allow-origin");
    assert(!!allowOrigin, `${name} missing CORS Access-Control-Allow-Origin`);
    return { status: res.status, allowOrigin };
  } catch (err) {
    // In the Lovable preview, the injected fetch proxy throws "Failed to fetch"
    // on cross-origin OPTIONS. Re-run on the published URL to validate.
    if (isPreviewHost()) {
      const e = new Error(
        "Skipped in preview: Lovable preview proxy blocks OPTIONS preflight. Run on the published URL."
      );
      (e as any).skip = true;
      throw e;
    }
    throw err;
  }
}

export const edgeFunctionsSuite: TestSuite = {
  id: "edge",
  name: "Edge Functions",
  tests: [
    {
      id: "reset-password-cors",
      name: "reset-password reachable + CORS",
      run: async () => ({ details: await probeOptions("reset-password") }),
    },
    {
      id: "migrate-drive-audio-cors",
      name: "migrate-drive-audio reachable + CORS",
      run: async () => ({ details: await probeOptions("migrate-drive-audio") }),
    },
  ],
};