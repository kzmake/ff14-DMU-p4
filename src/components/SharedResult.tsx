"use client";

import { useEffect, useRef, useState } from "react";
import { SummaryView } from "@/components/Board";
import { type BoardState, INITIAL_BOARD_STATE } from "@/lib/boardState";

// /share/[code]/result — 最終結果だけをサーバーから受け続けて表示する読み取り専用ビュー。
// SSE が使えれば購読、ダメなら定期ポーリングにフォールバックして「pullし続ける」。
export default function SharedResult({ code }: { code: string }) {
  const [state, setState] = useState<BoardState>(INITIAL_BOARD_STATE);
  const [connected, setConnected] = useState(false);
  const appliedRevRef = useRef<number>(-1);

  useEffect(() => {
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let closed = false;

    const apply = (payload: { state: BoardState; rev: number }) => {
      if (payload.rev < appliedRevRef.current) return;
      appliedRevRef.current = payload.rev;
      setState(payload.state);
    };

    // 1秒ごとに GET して取得（SSE が落ちたときのフォールバック）
    const startPolling = () => {
      if (pollTimer) return;
      const pull = () => {
        fetch(`/api/share/${encodeURIComponent(code)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((res: { state: BoardState; rev: number } | null) => {
            if (res && !closed) apply(res);
          })
          .catch(() => {});
      };
      pull();
      pollTimer = setInterval(pull, 1000);
    };

    try {
      es = new EventSource(`/api/share/${encodeURIComponent(code)}/stream`);
      es.onopen = () => {
        setConnected(true);
        // SSE が生きている間はポーリング停止
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      };
      es.onmessage = (ev) => {
        try {
          apply(JSON.parse(ev.data));
        } catch {
          // ignore
        }
      };
      es.onerror = () => {
        setConnected(false);
        // SSE 不調時はポーリングで pull し続ける
        startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      closed = true;
      es?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [code]);

  return (
    <>
      <div
        className="flex shrink-0 items-center justify-between border-b-2 border-[#ffcc00] mb-1 pb-[3px]"
        style={{ fontSize: "min(2dvh, 16px)" }}
      >
        <div className="text-[1.1em] font-bold text-[#ffcc00]">🏁 最終結果</div>
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
      <SummaryView state={state} variant="full" />
    </>
  );
}
