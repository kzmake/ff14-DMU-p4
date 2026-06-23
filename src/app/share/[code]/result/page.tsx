import SharedResult from "@/components/SharedResult";

// /share/[code]/result — 同じ code の最終結果だけを受け続けて表示する。
export default async function ResultPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <SharedResult code={code} />;
}
