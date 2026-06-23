import { getState, subscribe } from "@/lib/shareStore";

// SSE は長時間接続を保つので動的・Node ランタイムで動かす。
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

      // 接続維持用のハートビート（プロキシ切断対策）
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 25000);

      // クライアント切断時のクリーンアップ
      const close = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
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
