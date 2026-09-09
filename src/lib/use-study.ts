"use client";
import { useCallback, useEffect, useState } from "react";
import { request } from "./client";
import type { StudyData } from "./study-types";
export function useStudy() {
  const [data, setData] = useState<StudyData | null>(null),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      setData(await request<StudyData>("/api/study"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", refresh);
    };
  }, [refresh]);
  return { data, error, refresh };
}
