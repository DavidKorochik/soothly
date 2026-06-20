// webm/opus works in Chrome, Edge, Firefox and Safari 18.4+; mp4 (AAC) is the iOS Safari baseline.
// Probe in order and let the browser default ("") win if neither is reported supported.
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined"
  );
}

export function pickMimeType(): string {
  if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") return "";
  for (const type of MIME_CANDIDATES) {
    if (window.MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}
