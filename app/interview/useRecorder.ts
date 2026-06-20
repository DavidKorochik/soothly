"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isRecordingSupported, pickMimeType } from "./recorderMime";

export type RecorderStatus = "idle" | "requesting" | "recording" | "transcribing" | "error";

type State = { status: RecorderStatus; errorMessage: string | null };

// Hard stop well before Vercel's ~4.5MB request-body limit; the UI nudges as it approaches.
export const MAX_RECORD_SECONDS = 180;

export function useRecorder(opts: { sessionId?: string; questionKey?: string; onTranscript: (text: string) => void }) {
  const { sessionId, questionKey, onTranscript } = opts;
  const [state, setState] = useState<State>({ status: "idle", errorMessage: null });
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canceledRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const set = useCallback((status: RecorderStatus, errorMessage: string | null = null) => {
    setState({ status, errorMessage });
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const upload = useCallback(
    async (blob: Blob) => {
      set("transcribing");
      try {
        const form = new FormData();
        form.append("audio", blob, "answer");
        if (sessionId) form.append("sessionId", sessionId);
        if (questionKey) form.append("questionKey", questionKey);
        const res = await fetch("/api/interview/transcribe", { method: "POST", body: form });
        const json = (await res.json().catch(() => null)) as { text?: string; error?: string } | null;
        if (!res.ok || !json || typeof json.text !== "string") {
          set("error", json?.error ?? "התמלול נכשל. נסו שוב או הקלידו ידנית.");
          return;
        }
        onTranscriptRef.current(json.text);
        set("idle");
      } catch {
        set("error", "אין חיבור כרגע. אפשר לנסות שוב עוד רגע, או להקליד בינתיים.");
      }
    },
    [sessionId, questionKey, set],
  );

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const cancel = useCallback(() => {
    canceledRef.current = true;
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      stopTracks();
      set("idle");
    }
  }, [clearTimer, stopTracks, set]);

  const start = useCallback(async () => {
    if (!isRecordingSupported()) {
      set("error", "ההקלטה לא נתמכת בדפדפן הזה - אפשר להקליד.");
      return;
    }
    if (state.status === "recording" || state.status === "requesting" || state.status === "transcribing") return;

    canceledRef.current = false;
    set("requesting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
      });
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        set("error", "אין הרשאה למיקרופון. אפשר להפעיל בהגדרות הדפדפן, או פשוט להקליד.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        set("error", "לא נמצא מיקרופון. אפשר להקליד את התשובה.");
      } else {
        set("error", "לא הצלחנו לפתוח את המיקרופון. אפשר להקליד את התשובה.");
      }
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    const mime = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      recorder = new MediaRecorder(stream);
    }
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current = [...chunksRef.current, e.data];
    };
    recorder.onerror = () => {
      clearTimer();
      stopTracks();
      set("error", "ההקלטה נכשלה. אפשר לנסות שוב או להקליד.");
    };
    recorder.onstop = () => {
      clearTimer();
      const type = recorder.mimeType || mime || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      stopTracks();
      if (canceledRef.current) {
        set("idle");
        return;
      }
      if (blob.size === 0) {
        set("error", "לא קלטנו קול. אפשר לנסות שוב או להקליד.");
        return;
      }
      void upload(blob);
    };

    // Timeslice so an iOS suspension (backgrounding / screen-lock) loses at most one chunk.
    recorder.start(3000);
    setSeconds(0);
    set("recording");

    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += 1;
      setSeconds(elapsed);
      if (elapsed >= MAX_RECORD_SECONDS && recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    }, 1000);
  }, [state.status, set, stopTracks, clearTimer, upload]);

  // Flush-and-stop when the page hides — iOS suspends MediaRecorder on background/lock and may
  // never fire onstop otherwise. Also release the mic on unmount.
  useEffect(() => {
    const flush = () => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      clearTimer();
      stopTracks();
    };
  }, [clearTimer, stopTracks]);

  return {
    status: state.status,
    errorMessage: state.errorMessage,
    seconds,
    start,
    stop,
    cancel,
  };
}
