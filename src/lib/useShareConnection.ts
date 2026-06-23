"use client";

import { useEffect, useRef, useState } from "react";
import type { BoardState } from "@/lib/boardState";

type StreamPayload = { state: BoardState; rev: number; origin: string | null };

// 共有コードの SSE を購読し、接続断からの自動復帰を行う共通フック。
//  - 接続が切れたら指数バックオフで再接続を試みる（EventSource 任せにせず明示制御）。
//  - 復帰（再 open）時に onReconnect を呼ぶ。result は再取得、board は再送に使う。
//  - タブ復帰(visibilitychange)・オンライン復帰(online) でも即再接続を試みる。
export function useShareConnection(
  code: string,
  opts: {
    onMessage: (payload: StreamPayload) => void;
    // 切断後に再接続が成功したとき（初回 open では呼ばない）
    onReconnect?: () => void;
  },
) {
  const [connected, setConnected] = useState(false);
  // 最新のコールバックを ref で保持（再接続ループを張り直さないため）
  const onMessageRef = useRef(opts.onMessage);
  const onReconnectRef = useRef(opts.onReconnect);
  onMessageRef.current = opts.onMessage;
  onReconnectRef.current = opts.onReconnect;

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0; // 連続失敗回数（バックオフ用）
    let everOpened = false; // 一度でも開いたか（初回 vs 復帰の判定）
    let stopped = false;

    const clearRetry = () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (stopped || retryTimer) return;
      // 1s, 2s, 4s … 最大 10s
      const delay = Math.min(10000, 1000 * 2 ** attempt);
      attempt += 1;
      retryTimer = setTimeout(connect, delay);
    };

    const connect = () => {
      clearRetry();
      if (stopped) return;
      // 既存接続を閉じてから張り直す
      es?.close();
      es = new EventSource(`/api/share/${encodeURIComponent(code)}/stream`);

      es.onopen = () => {
        attempt = 0;
        setConnected(true);
        // 初回 open は復帰ではない。2回目以降の open＝復帰。
        if (everOpened) onReconnectRef.current?.();
        everOpened = true;
      };
      es.onmessage = (ev) => {
        try {
          onMessageRef.current(JSON.parse(ev.data) as StreamPayload);
        } catch {
          // ignore malformed
        }
      };
      es.onerror = () => {
        setConnected(false);
        // EventSource は内部再試行するが、確実な復帰のため明示的に張り直す。
        es?.close();
        es = null;
        scheduleReconnect();
      };
    };

    // keepalive: 何も操作しなくても定期的に ping を送り、部屋を生存扱いにする。
    // pong(POST応答)が来なければ接続不良とみなして再接続を促す。
    const sendPing = () => {
      if (stopped) return;
      // タブが裏のときは送らない（表示復帰時に送る）
      if (document.visibilityState === "hidden") return;
      fetch(`/api/share/${encodeURIComponent(code)}/ping`, { method: "POST", keepalive: true })
        .then((r) => {
          if (!r.ok) throw new Error("ping failed");
        })
        .catch(() => {
          // ping 失敗＝サーバー到達不可。SSE も切れている可能性が高いので再接続を促す。
          if (!es || es.readyState !== EventSource.OPEN) kick();
        });
    };
    const pingTimer = setInterval(sendPing, 20000);

    // タブ/ネットワーク復帰時に即再接続＋ping を試みる
    const kick = () => {
      if (stopped) return;
      if (!es || es.readyState === EventSource.CLOSED) {
        attempt = 0;
        clearRetry();
        connect();
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        kick();
        sendPing();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", kick);

    connect();
    sendPing(); // 開いた直後に1回

    return () => {
      stopped = true;
      clearRetry();
      clearInterval(pingTimer);
      es?.close();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", kick);
    };
  }, [code]);

  return { connected };
}
