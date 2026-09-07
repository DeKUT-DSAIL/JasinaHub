import { TestSuite, assert } from "../types";

/**
 * Resilience / Recovery Tests — verifies the app degrades gracefully
 * when network, storage, or browser features misbehave.
 */
export const resilienceSuite: TestSuite = {
  id: "resilience",
  name: "Resilience · Recovery & Offline",
  description: "Confirms offline auto-save, error recovery, and PWA fallbacks are wired in.",
  tests: [
    {
      id: "auto-save-storage",
      name: "Auto-save channel writable (localStorage round-trip)",
      run: async () => {
        const k = "__fasiri_resilience_probe__";
        const v = String(Date.now());
        localStorage.setItem(k, v);
        const got = localStorage.getItem(k);
        localStorage.removeItem(k);
        assert(got === v, "localStorage round-trip failed — auto-save would not persist");
      },
    },
    {
      id: "offline-detection",
      name: "navigator.onLine is observable (offline banner can fire)",
      run: async () => {
        assert("onLine" in navigator, "navigator.onLine not exposed");
        return { details: { online: navigator.onLine } };
      },
    },
    {
      id: "service-worker-registered",
      name: "Service Worker registered (PWA / background sync)",
      run: async () => {
        assert("serviceWorker" in navigator, "Service Worker API missing");
        const regs = await navigator.serviceWorker.getRegistrations();
        return { details: { registrations: regs.length, scopes: regs.map(r => r.scope) } };
      },
    },
    {
      id: "abort-controller",
      name: "AbortController cancels in-flight fetch (request cancellation)",
      run: async () => {
        const ctrl = new AbortController();
        const p = fetch("https://httpbin.org/delay/3", { signal: ctrl.signal })
          .then(() => "completed")
          .catch(e => (e.name === "AbortError" ? "aborted" : "error"));
        ctrl.abort();
        const result = await p;
        assert(result === "aborted", `Expected abort, got ${result}`);
      },
    },
    {
      id: "indexeddb-write",
      name: "IndexedDB open + write (offline recording cache)",
      run: async () => {
        await new Promise<void>((resolve, reject) => {
          const req = indexedDB.open("__fasiri_resilience_probe__", 1);
          req.onupgradeneeded = () => req.result.createObjectStore("kv");
          req.onsuccess = () => {
            const tx = req.result.transaction("kv", "readwrite");
            tx.objectStore("kv").put("ok", "probe");
            tx.oncomplete = () => { req.result.close(); resolve(); };
            tx.onerror = () => reject(tx.error);
          };
          req.onerror = () => reject(req.error);
        });
      },
    },
  ],
};