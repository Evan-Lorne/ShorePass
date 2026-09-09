"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
export default function OfflineSupport() {
  const path = usePathname();
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((reg) =>
        reg.active?.postMessage({
          type: "CACHE_PAGE",
          url: location.href,
          assets: [
            ...Array.from(document.scripts, (s) => s.src),
            ...Array.from(
              document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
              (s) => s.href
            ),
          ].filter(Boolean),
        })
      )
      .catch(() => {});
  }, [path]);
  return null;
}
