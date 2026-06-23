import SharedController from "@/components/SharedController";

// /share/[code]/controller — スマホで開く操作リモコン（ボタンだけ）。
export default async function ControllerPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  // body は overflow:hidden なので、リモコンは自前でスクロール可能にする。
  return (
    <div className="h-full min-h-0 flex-1 overflow-y-auto">
      <SharedController code={code} />
    </div>
  );
}
