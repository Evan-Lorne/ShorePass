"use client";
let identity: Promise<{ userId: string }> | undefined;
export function connect() {
  if (!identity)
    identity = fetch("/api/device", { method: "POST", signal: AbortSignal.timeout(12000) })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        localStorage.setItem("shorepass_identity", JSON.stringify(data));
        return data;
      })
      .catch((e) => {
        identity = undefined;
        if (!navigator.onLine) {
          const saved = localStorage.getItem("shorepass_identity");
          if (saved) return JSON.parse(saved);
        }
        throw e;
      });
  return identity;
}
export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  await connect();
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || "请求失败"), { status: res.status });
  return data;
}
