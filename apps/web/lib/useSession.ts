"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, WS_URL } from "./api";
import type { SensingProgress, Snapshot } from "./types";

/** Live session state: initial fetch + WebSocket snapshots, with polling fallback. */
export function useSession(sessionId: string | undefined) {
  const [snapshot, setSnapshotRaw] = useState<Snapshot | null>(null);
  // HTTP responses and WebSocket pushes can arrive out of order; keep the newest.
  const setSnapshot = useCallback(
    (s: Snapshot) => setSnapshotRaw((prev) => (prev && prev.session_id === s.session_id && prev.version > s.version ? prev : s)),
    [],
  );
  const [progress, setProgress] = useState<SensingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    try {
      setSnapshot(await api<Snapshot>(`/api/sessions/${sessionId}`));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [sessionId, setSnapshot]);

  useEffect(() => {
    if (!sessionId) return;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const ws = new WebSocket(`${WS_URL}/ws/sessions/${sessionId}`);
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === "snapshot") setSnapshot(msg.snapshot);
        else if (msg.type === "sensing_progress") setProgress(msg.progress);
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) retry = setTimeout(connect, 1500);
      };
      ws.onerror = () => ws.close();
    };
    api<Snapshot>(`/api/sessions/${sessionId}`)
      .then((s) => {
        setSnapshot(s);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
    connect();
    // Fallback in case the socket is blocked: refresh every few seconds.
    const poll = setInterval(() => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) refresh();
    }, 3000);
    return () => {
      closed = true;
      clearTimeout(retry);
      clearInterval(poll);
      wsRef.current?.close();
    };
  }, [sessionId, refresh, setSnapshot]);

  // Progress only means something while a check is running.
  const checking = !!snapshot && ["awaiting_patient", "measuring"].includes(snapshot.case.functional_status);

  return { snapshot, setSnapshot, progress: checking ? progress : null, error, connected, refresh };
}
