"use client";

import { useCallback, useRef, useState } from "react";
import Board from "@/components/BoardBeta";
import { type BoardState, INITIAL_BOARD_STATE } from "@/lib/boardState";
import { useShareConnection } from "@/lib/useShareConnection";

// クライアント識別子（自分が送った更新のエコーバックを無視するため）。
function makeClientId(): string {
  // crypto.randomUUID は対応ブラウザのみ。無ければ時刻＋乱数で代用。
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `c-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export default function SharedBoardBeta({ code }: { code: string }) {
  const [state, setState] = useState<BoardState>(INITIAL_BOARD_STATE);
  const clientIdRef = useRef<string>("");
  // 受理済みの最新 rev。古い更新で巻き戻らないようにする。
  const appliedRevRef = useRef<number>(-1);
  // 復帰時の再送に使うため、最新のローカル状態を ref に保持。
  const stateRef = useRef<BoardState>(state);
  // 一度でもローカルで操作したか（操作前は復帰再送しない）。
  const dirtyRef = useRef<boolean>(false);

  if (!clientIdRef.current) clientIdRef.current = makeClientId();
  stateRef.current = state;

  // サーバーへ状態を送信（POST）。成功で rev を更新。
  const postState = useCallback(
    (next: BoardState) => {
      void fetch(`/api/share/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: next, origin: clientIdRef.current }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((res: { rev: number } | null) => {
          if (res) appliedRevRef.current = Math.max(appliedRevRef.current, res.rev);
        })
        .catch(() => {
          // 送信失敗は握りつぶす（復帰時に再送される）
        });
    },
    [code],
  );

  const { connected } = useShareConnection(code, {
    onMessage: (payload) => {
      // 自分が送った更新のエコーは無視（ローカルが既に最新）。
      if (payload.origin && payload.origin === clientIdRef.current) {
        appliedRevRef.current = Math.max(appliedRevRef.current, payload.rev);
        return;
      }
      // 古い更新は適用しない。
      if (payload.rev < appliedRevRef.current) return;
      appliedRevRef.current = payload.rev;
      setState(payload.state);
    },
    // 復帰処理：再接続できたらローカルの最新状態をサーバーへ再送（再更新）。
    // サーバー再起動等で状態が失われていても、操作側の状態で復元できる。
    onReconnect: () => {
      if (dirtyRef.current) postState(stateRef.current);
    },
  });

  // ローカル変更：即座に画面反映しつつ、サーバーへ POST して全員に配信。
  const onChange = useCallback(
    (next: BoardState) => {
      dirtyRef.current = true;
      setState(next);
      postState(next);
    },
    [postState],
  );

  return <Board state={state} onChange={onChange} shareInfo={{ code, connected }} />;
}
