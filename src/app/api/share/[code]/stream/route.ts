import { getState, subscribe } from "@/lib/shareStore";

// SSE は長時間接続を保つので動的・Node ランタイムで動かす。
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Vercel の関数実行上限を可能な範囲で延ばす（Hobby は最大60s）。
// この時間に達したら自発的に閉じ、クライアントが自動再接続する。
export const maxDuration = 60;

// GET /api/share/[code]/stream
// SSE で「現在状態」を初回送信し、以後の更新をプッシュ配信する。
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // 初回：現在の状態を送る（origin は無し＝必ず適用させる）
      const { state, rev } = getState(code);
      send({ state, rev, origin: null });

      // 以後の更新を購読
      const unsubscribe = subscribe(code, (payload) => send(payload));

      // 接続維持用のハートビート（プロキシ切断対策）。Vercel向けに短め(15s)。
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          close();
        }
      }, 15000);

      // クライアント切断時のクリーンアップ
      const close = () => {
        clearInterval(heartbeat);
        clearTimeout(lifespan);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      // 関数実行上限の手前(55s)で自発的に閉じる。クライアントが再接続する。
      const lifespan = setTimeout(close, 55000);

      // abort シグナルで解放
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
