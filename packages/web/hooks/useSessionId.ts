"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "malro-session-id";

export function useSessionId() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) {
      setSessionId(existing);
      return;
    }
    const fresh = createSessionId();
    window.localStorage.setItem(STORAGE_KEY, fresh);
    setSessionId(fresh);
  }, []);

  const resetSession = useCallback(() => {
    const fresh = createSessionId();
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, fresh);
    }
    setSessionId(fresh);
  }, []);

  return { sessionId, resetSession };
}

function createSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session-${Math.random().toString(36).slice(2, 10)}`;
}

