// 雷水/加速マーカーのトグルロジック（Board と Controller で共有）。
// 状態を受け取り、新しい marks / dimmedMarks を返す純粋関数。
import type { BoardState } from "@/lib/boardState";

// マーカーのキー: "<gc1|gc2>:<e|l>-accel:<0=加速|1=雷水>"
// 加速マーカー（GC1/GC2の早/遅 計4つ）のキー一覧
export const ACCEL_KEYS = ["gc1:e-accel:0", "gc1:l-accel:0", "gc2:e-accel:0", "gc2:l-accel:0"];

// 雷水(⚡💧)マーカーのキーから、GC1↔GC2・早↔遅 を逆にした相手キーを返す。
const raisuiPartner = (id: string): string | null => {
  const m = /^(gc1|gc2):(e|l)-accel:1$/.exec(id);
  if (!m) return null;
  const otherRow = m[1] === "gc1" ? "gc2" : "gc1";
  const otherCol = m[2] === "e" ? "l" : "e";
  return `${otherRow}:${otherCol}-accel:1`;
};

// 同じGC行内の反対側（早↔遅）の雷水キー。
const raisuiSameRow = (id: string): string | null => {
  const m = /^(gc1|gc2):(e|l)-accel:1$/.exec(id);
  if (!m) return null;
  const otherCol = m[2] === "e" ? "l" : "e";
  return `${m[1]}:${otherCol}-accel:1`;
};

// 別GCの同じ早/遅 の雷水キー。
const raisuiOtherGc = (id: string): string | null => {
  const m = /^(gc1|gc2):(e|l)-accel:1$/.exec(id);
  if (!m) return null;
  const otherRow = m[1] === "gc1" ? "gc2" : "gc1";
  return `${otherRow}:${m[2]}-accel:1`;
};

// マーカー点灯ルール（要素ごとに独立）
//  - 加速(:0)  : GC1/GC2 合わせて1つだけ点灯。残り3つは薄表示（クリックで移せる）。
//  - 雷水(:1)  : 押すと自分＋対角(GC・早遅とも逆)を点灯し、同行・同列は薄表示にする。
// 返り値は更新後の marks / dimmedMarks。
export function applyMarkToggle(
  state: BoardState,
  id: string,
): { marks: Record<string, boolean>; dimmedMarks: Record<string, boolean> } {
  const { marks, dimmedMarks } = state;
  const wasLit = marks[id];
  const isAccel = id.endsWith(":0");
  const partner = raisuiPartner(id);
  const sameRow = raisuiSameRow(id);
  const otherGc = raisuiOtherGc(id);

  const nextMarks: Record<string, boolean> = { ...marks };
  if (isAccel) {
    // 加速：4つを全消ししてから対象だけ点灯（点灯中を再押下なら消灯）
    for (const k of ACCEL_KEYS) nextMarks[k] = false;
    if (!wasLit) nextMarks[id] = true;
  } else if (!wasLit) {
    // 雷水：自分＋対角を点灯。同行・同列は消灯（薄表示にまわす）。
    nextMarks[id] = true;
    if (partner) nextMarks[partner] = true;
    if (sameRow) nextMarks[sameRow] = false;
    if (otherGc) nextMarks[otherGc] = false;
  } else {
    // 再押下で消灯：自分＋対角をまとめて消灯
    nextMarks[id] = false;
    if (partner) nextMarks[partner] = false;
  }

  const nextDimmed: Record<string, boolean> = { ...dimmedMarks };
  if (isAccel) {
    // 加速：点灯時はクリックしたもの以外を薄表示。再押下で消灯なら全解除。
    for (const k of ACCEL_KEYS) nextDimmed[k] = !wasLit && k !== id;
  } else {
    // 雷水：同行・同列をグレーで薄く表示（クリック可・再押下で解除）。
    nextDimmed[id] = false;
    if (sameRow) nextDimmed[sameRow] = !wasLit;
    if (otherGc) nextDimmed[otherGc] = !wasLit;
  }

  return { marks: nextMarks, dimmedMarks: nextDimmed };
}
