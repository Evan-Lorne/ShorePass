"use client";
import { useState } from "react";
import Dialog from "./Dialog";
import { request } from "@/lib/client";
export default function SyncModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState("generate"),
    [code, setCode] = useState(""),
    [expiry, setExpiry] = useState(""),
    [input, setInput] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  async function generate() {
    setBusy(true);
    setStatus("");
    try {
      const data = await request<{ code: string; expiresAt: string }>("/api/sync/code/generate", {
        method: "POST",
      });
      setCode(data.code);
      setExpiry(new Date(data.expiresAt).toLocaleTimeString("zh-CN"));
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function consume() {
    setBusy(true);
    setStatus("");
    try {
      await request("/api/sync/code/consume", {
        method: "POST",
        body: JSON.stringify({ code: input }),
      });
      window.location.reload();
    } catch (e) {
      setStatus((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Dialog title="设备同步" onClose={onClose}>
      <div className="tabs">
        <button
          className={tab === "generate" ? "active" : ""}
          onClick={() => {
            setTab("generate");
            setStatus("");
          }}
        >
          生成同步码
        </button>
        <button
          className={tab === "consume" ? "active" : ""}
          onClick={() => {
            setTab("consume");
            setStatus("");
          }}
        >
          绑定设备
        </button>
      </div>
      {tab === "generate" ? (
        <div className="sync-content">
          <p className="muted">一次性配对码 · 有效期 10 分钟</p>
          {code && (
            <>
              <output className="sync-code">{code}</output>
              <p className="muted">{expiry} 到期</p>
            </>
          )}
          <button className="button primary" disabled={busy} onClick={generate}>
            {busy ? "生成中…" : code ? "重新生成" : "生成同步码"}
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            consume();
          }}
        >
          <label className="field-label" htmlFor="sync-code">
            另一台设备的同步码
          </label>
          <input
            id="sync-code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoComplete="one-time-code"
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\D/g, ""))}
            className="answer-text"
          />
          <p className="muted my-4">
            绑定后合并两端已保存的学习记录。未同步的离线草稿请先联网保存。
          </p>
          <button className="button primary" disabled={busy || input.length !== 6}>
            {busy ? "绑定中…" : "绑定并合并记录"}
          </button>
        </form>
      )}
      {status && (
        <p className="notice error" role="alert">
          {status}
        </p>
      )}
    </Dialog>
  );
}
