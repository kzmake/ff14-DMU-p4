"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Board from "@/components/Board";
import { type BoardState, INITIAL_BOARD_STATE } from "@/lib/boardState";

// クライアント識別子（自分が送った更新のエコーバックを無視するため）。
function makeClientId(): string {
  // crypto.randomUUID は対応ブラウザのみ。無ければ時刻＋乱数で代用。
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `c-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export default function SharedBoard({ code }: { code: string }) {
  const [state, setState] = useState<BoardState>(INITIAL_BOARD_STATE);
  const [connected, setConnected] = useState(false);
  const clientIdRef = useRef<string>("");
  // 自分が送った更新の rev を覚えておき、エコー判定に使う。
  const lastSentRevRef = useRef<number>(-1);
  // 受理済みの最新 rev。古い更新で巻き戻らないようにする。
  const appliedRevRef = useRef<number>(-1);

  if (!clientIdRef.current) clientIdRef.current = makeClientId();

  // SSE 購読：サーバーからの状態更新を受けて反映する。
  useEffect(() => {
    const es = new EventSource(`/api/share/${encodeURIComponent(code)}/stream`);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data) as {
          state: BoardState;
          rev: number;
          origin: string | null;
        };
        // 自分が送った更新のエコーは無視（ローカルが既に最新）。
        if (payload.origin && payload.origin === clientIdRef.current) {
          appliedRevRef.current = Math.max(appliedRevRef.current, payload.rev);
          return;
        }
        // 古い更新は適用しない。
        if (payload.rev < appliedRevRef.current) return;
        appliedRevRef.current = payload.rev;
        setState(payload.state);
      } catch {
        // ignore malformed
      }
    };
    return () => es.close();
  }, [code]);

  // ローカル変更：即座に画面反映しつつ、サーバーへ POST して全員に配信。
  const onChange = useCallback(
    (next: BoardState) => {
      setState(next);
      void fetch(`/api/share/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: next, origin: clientIdRef.current }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((res: { rev: number } | null) => {
          if (res) {
            lastSentRevRef.current = res.rev;
            appliedRevRef.current = Math.max(appliedRevRef.current, res.rev);
          }
        })
        .catch(() => {
          // 送信失敗は握りつぶす（次の操作でまた送る）
        });
    },
    [code],
  );

  return <Board state={state} onChange={onChange} shareInfo={{ code, connected }} />;
}
