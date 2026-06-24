import SharedBoardBeta from "@/components/SharedBoardBeta";

// /share/[code]/beta — /share/[code] の盤面を複製した調整用ページ。
// 本番（SharedBoard / Board）に影響を出さず、レイアウト・サイズを試せる。
export default async function ShareBetaPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <SharedBoardBeta code={code} />;
}
