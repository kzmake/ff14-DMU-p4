import { touch } from "@/lib/shareStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/share/[code]/ping — クライアントからの keepalive。
// 何も操作しなくても定期的に叩かれ、部屋を生存扱いにする。pong を返す。
export async function POST(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  touch(code);
  return Response.json({ pong: true, t: Date.now() });
}
