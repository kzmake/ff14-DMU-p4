import { getState } from "@/lib/shareStore";

// SSE は長時間接続を保つので動的・Node ランタイムで動かす。
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Vercel の関数実行上限を可能な範囲で延ばす（Hobby は最大60s）。
// この時間に達したら自発的に閉じ、クライアントが自動再接続する。
export const maxDuration = 60;

// KV をポーリングする間隔（ms）。変化があればクライアントへ配信。
const POLL_INTERVAL_MS = 1000;
// 関数上限の手前で自発的に閉じる時間（ms）
const LIFESPAN_MS = 55000;
// ハートビート（プロキシ切断対策）
const HEARTBEAT_MS = 15000;

// GET /api/share/[code]/stream
// SSE で「現在状態」を初回送信し、以後 KV の rev 変化をポーリングしてプッシュ配信する。
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          close();
        }
      };

      // 初回：現在の状態を送る
      let lastRev = -1;
      try {
        const snap = await getState(code);
        lastRev = snap.rev;
        send(snap);
      } catch {
        // KV エラーでも接続は維持（次のポーリングで再試行）
      }

      // KV を定期ポーリングし、rev が進んでいれば配信
      const poll = setInterval(async () => {
        if (closed) return;
        try {
          const snap = await getState(code);
          if (snap.rev !== lastRev) {
            lastRev = snap.rev;
            send(snap);
          }
        } catch {
          // 一時的なKVエラーは無視
        }
      }, POLL_INTERVAL_MS);

      // ハートビート
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          close();
        }
      }, HEARTBEAT_MS);

      // 上限手前で自発close → クライアント再接続
      const lifespan = setTimeout(() => close(), LIFESPAN_MS);

      function close() {
        if (closed) return;
        closed = true;
        clearInterval(poll);
        clearInterval(heartbeat);
        clearTimeout(lifespan);
        try {
          controller.close();
        } catch {
          // already closed
        }
      }

      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
