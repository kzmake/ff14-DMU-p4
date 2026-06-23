import type { BoardState } from "@/lib/boardState";
import { getState, setState } from "@/lib/shareStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/share/[code] — 現在状態を一回だけ取得（フォールバック用）
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  return Response.json(await getState(code));
}

// POST /api/share/[code] — 状態を更新して全購読者へ配信
// body: { state: BoardState, origin: string }
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  let body: { state?: BoardState; origin?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }
  if (!body.state) return new Response("missing state", { status: 400 });
  const rev = await setState(code, body.state, body.origin ?? null);
  return Response.json({ rev });
}
