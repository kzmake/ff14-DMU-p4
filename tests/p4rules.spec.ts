// spec.md「検証ケース」表と p4rules.resultColumns の一致を検証する。
// 実行：npm run check:spec （Node 22 の型ストリップで .ts を直接実行）
import { type BoardState, INITIAL_BOARD_STATE, resultColumns } from "../src/lib/p4rules.ts";

// セル配列を "テキスト(トーン) / ..." の文字列へ。空は "-"。
function fmt(cells: { text: string; tone: string }[]): string {
  if (cells.length === 0) return "-";
  return cells.map((c) => `${c.text}(${c.tone})`).join(" / ");
}

// state を6列の文字列配列へ（左から ①〜⑥）。
function cols(partial: Partial<BoardState>): string[] {
  const state: BoardState = { ...INITIAL_BOARD_STATE, ...partial };
  return resultColumns(state).map((c) => fmt(c.cells));
}

// spec.md「検証ケース」表（① early ② look ③ fire ④ late ⑤ lookLate ⑥ tsunami）
const CASES: { name: string; input: Partial<BoardState>; expect: string[] }[] = [
  { name: "全部未選択", input: {}, expect: ["-", "-", "-", "-", "-", "-"] },
  {
    name: "gc1=honto, sankai=early",
    input: { gc1: "honto", sankai: "early" },
    expect: ["雷散会(blue)", "みない(blue)", "-", "-", "-", "-"],
  },
  {
    name: "gc1=uso, sankai=early",
    input: { gc1: "uso", sankai: "early" },
    expect: ["水散会(red)", "みる(outline-red)", "-", "-", "-", "-"],
  },
  {
    name: "gc1=honto, gc2=uso, sankai=early",
    input: { gc1: "honto", gc2: "uso", sankai: "early" },
    expect: ["雷散会(blue)", "みない(blue)", "-", "水散会(red)", "みる(outline-red)", "-"],
  },
  {
    name: "gc1=honto, gc2=uso, sankai=late",
    input: { gc1: "honto", gc2: "uso", sankai: "late" },
    expect: ["水散会(red)", "みない(blue)", "-", "雷散会(blue)", "みる(outline-red)", "-"],
  },
  {
    name: "gc1=honto, sankai=early, accel=gc1:early",
    input: { gc1: "honto", sankai: "early", accel: "gc1:early" },
    expect: ["雷散会(blue) / 止まる(outline-green)", "みない(blue)", "-", "-", "-", "-"],
  },
  {
    name: "gc1=uso, sankai=early, accel=gc1:late",
    input: { gc1: "uso", sankai: "early", accel: "gc1:late" },
    expect: ["水散会(red)", "みる(outline-red)", "-", "動く(outline-green)", "-", "-"],
  },
  {
    name: "fire=honto",
    input: { fire: "honto" },
    expect: ["-", "-", "離れる(blue)", "-", "-", "-"],
  },
  {
    name: "fire=uso",
    input: { fire: "uso" },
    expect: ["-", "-", "そのまま(outline-red)", "-", "-", "-"],
  },
  {
    name: "tsunami=honto",
    input: { tsunami: "honto" },
    expect: ["-", "-", "-", "-", "-", "そのまま(outline-blue)"],
  },
  {
    name: "tsunami=uso",
    input: { tsunami: "uso" },
    expect: ["-", "-", "-", "-", "-", "離れる(red)"],
  },
];

let failed = 0;
for (const c of CASES) {
  const got = cols(c.input);
  const ok = JSON.stringify(got) === JSON.stringify(c.expect);
  if (!ok) {
    failed++;
    console.error(`✗ ${c.name}`);
    console.error(`  expected: ${JSON.stringify(c.expect)}`);
    console.error(`  got     : ${JSON.stringify(got)}`);
  } else {
    console.log(`✓ ${c.name}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} / ${CASES.length} ケース不一致。spec.md と p4rules.ts を確認。`);
  process.exit(1);
}
console.log(`\n全 ${CASES.length} ケース一致。spec.md と実装は整合。`);
