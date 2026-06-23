import SharedBoard from "@/components/SharedBoard";

// /share/[code] — 同じ code を開いた全クライアントで状態をサーバー同期する盤面。
export default async function SharePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <SharedBoard code={code} />;
}
