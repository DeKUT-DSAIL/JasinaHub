import { TestSuite, assert } from "../types";

export const compatibilitySuite: TestSuite = {
  id: "compatibility",
  name: "Browser & Device Compatibility",
  description: "Verifies the runtime supports every browser API the app depends on.",
  tests: [
    {
      id: "mediarecorder",
      name: "MediaRecorder API available (voice recording)",
      run: async () => {
        assert(typeof MediaRecorder !== "undefined", "MediaRecorder not supported");
        return { details: { mimeTypes: ["audio/webm", "audio/mp4"].filter(t => MediaRecorder.isTypeSupported(t)) } };
      },
    },
    {
      id: "getusermedia",
      name: "navigator.mediaDevices.getUserMedia available",
      run: async () => {
        assert(!!navigator.mediaDevices?.getUserMedia, "getUserMedia not supported");
      },
    },
    {
      id: "indexeddb",
      name: "IndexedDB available (offline storage)",
      run: async () => {
        assert(typeof indexedDB !== "undefined", "IndexedDB not supported");
      },
    },
    {
      id: "service-worker",
      name: "Service Worker API available (PWA)",
      run: async () => {
        assert("serviceWorker" in navigator, "Service Worker not supported");
        const reg = await navigator.serviceWorker.getRegistration();
        return { details: { registered: !!reg, scope: reg?.scope } };
      },
    },
    {
      id: "localstorage",
      name: "localStorage writable (auto-save recovery)",
      run: async () => {
        const k = "__fasiri_compat_test__";
        localStorage.setItem(k, "1");
        const ok = localStorage.getItem(k) === "1";
        localStorage.removeItem(k);
        assert(ok, "localStorage not writable");
      },
    },
    {
      id: "web-audio",
      name: "Web Audio API available",
      run: async () => {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        assert(!!Ctx, "AudioContext not supported");
      },
    },
    {
      id: "fetch-api",
      name: "Fetch + AbortController available",
      run: async () => {
        assert(typeof fetch !== "undefined", "fetch not supported");
        assert(typeof AbortController !== "undefined", "AbortController not supported");
      },
    },
    {
      id: "online-status",
      name: "navigator.onLine reachable (offline banner)",
      run: async () => {
        assert(typeof navigator.onLine === "boolean", "navigator.onLine missing");
        return { details: { online: navigator.onLine } };
      },
    },
  ],
};