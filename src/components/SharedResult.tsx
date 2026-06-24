"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SummaryView } from "@/components/Board";
import { type BoardState, INITIAL_BOARD_STATE } from "@/lib/boardState";
import { useDocumentPip } from "@/lib/useDocumentPip";
import { useShareConnection } from "@/lib/useShareConnection";

// /share/[code]/result — 最終結果だけをサーバーから受け続けて表示する読み取り専用ビュー。
// 接続が切れたら再接続し、復帰時に最新状態を GET で再取得する。
export default function SharedResult({ code }: { code: string }) {
  const [state, setState] = useState<BoardState>(INITIAL_BOARD_STATE);
  const appliedRevRef = useRef<number>(-1);

  const apply = useCallback((payload: { state: BoardState; rev: number }) => {
    if (payload.rev < appliedRevRef.current) return;
    appliedRevRef.current = payload.rev;
    setState(payload.state);
  }, []);

  // 最新状態を一回 GET で取り直す（復帰時・フォールバック用）。
  const pullOnce = useCallback(() => {
    fetch(`/api/share/${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res: { state: BoardState; rev: number } | null) => {
        if (res) apply(res);
      })
      .catch(() => {});
  }, [code, apply]);

  const { connected } = useShareConnection(code, {
    onMessage: apply,
    // 復帰処理：再接続できたら念のため最新を再取得する。
    onReconnect: pullOnce,
  });

  // 切断中は 1 秒ごとに GET で pull し続ける（SSE が張れない環境のフォールバック）。
  useEffect(() => {
    if (connected) return;
    const t = setInterval(pullOnce, 1000);
    return () => clearInterval(t);
  }, [connected, pullOnce]);

  // 最終結果を最前面の小窓(Document PiP)に出すためのフック
  const { container: pipContainer, toggle: togglePip, open: pipOpen } = useDocumentPip();

  return (
    <>
      <div
        className="flex shrink-0 items-center justify-between border-b-2 border-[#ffcc00] mb-1 pb-[3px]"
        style={{ fontSize: "min(2dvh, 16px)" }}
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={`inline-flex h-[1.6em] cursor-pointer items-center justify-center gap-[0.2em] rounded border px-[0.4em] text-[0.8em] font-bold leading-none ${
              pipOpen
                ? "border-[#ffcc00] bg-[#2a2a2a] text-[#ffcc00]"
                : "border-[#555] bg-[#1c1c1c] text-[#ffcc00] hover:border-[#ffcc00] hover:bg-[#2a2a2a]"
            }`}
            onClick={togglePip}
            aria-label="最終結果を別窓(最前面)で表示"
            title="最終結果を別窓(最前面)で表示"
          >
            🪟 PiP
          </button>
          <div className="text-[1.1em] font-bold text-[#ffcc00]">🏁 最終結果</div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded border px-[0.4em] py-[0.1em] text-[0.7em] font-bold ${
            connected
              ? "border-[#3fbf6f] bg-[rgba(63,191,111,0.15)] text-[#8fe6ad]"
              : "border-[#888] bg-[rgba(255,255,255,0.06)] text-[#aaa]"
          }`}
        >
          {connected ? "🟢" : "⚪"} 共有 {code}
        </span>
      </div>
      <SummaryView state={state} />

      {/* Document PiP の小窓へ最終結果を描画（state と自動同期） */}
      {pipContainer && createPortal(<SummaryView state={state} />, pipContainer)}
    </>
  );
}
