// P4 真偽判定のルール（spec.md の唯一の実装）。
// 盤面・コントローラー・結果ビュー・PiP すべてがここを参照する。
// クライアント/サーバー両方から import するため "use client" は付けない。

export type Choice = "honto" | "uso" | null; // ホント / ウソ / 未選択
export type Side = "early" | "late"; // 早 / 遅
export type GcKey = "gc1" | "gc2";

// 共有・同期する盤面の状態。
export type BoardState = {
  gc1: Choice;
  gc2: Choice;
  fire: Choice;
  tsunami: Choice;
  sankai: Side | null; // 雷水さんかい：GC1の雷水を早/遅どちらに置くか（1つ必須）
  accel: string | null; // 加速：`${gc}:${side}`（例 "gc1:early"）。4択中0〜1つ。
};

export const INITIAL_BOARD_STATE: BoardState = {
  gc1: null,
  gc2: null,
  fire: null,
  tsunami: null,
  sankai: null,
  accel: null,
};

// 結果セルの色トーン。
export type Tone = "blue" | "red" | "green" | "outline-blue" | "outline-red" | "outline-green";

export type ResultCell = { text: string; tone: Tone };
export type ResultColumn = { key: string; placeholder: string; cells: ResultCell[] };

// --- GC の雷/水・動く動かない（ホント=雷/止まる=青、ウソ=水/動く=赤） ---
export const raisuiTone = (s: BoardState, gc: GcKey): Tone => (s[gc] === "uso" ? "red" : "blue");
export const raisuiLabel = (s: BoardState, gc: GcKey): string =>
  s[gc] === "uso" ? "水散会" : "雷散会";
export const accelLabel = (s: BoardState, gc: GcKey): string =>
  s[gc] === "uso" ? "動く" : "止まる";

// 1-a: sankai='early' → 早=GC1・遅=GC2 ／ 'late' → 早=GC2・遅=GC1。
// その side に来る雷水の GC を返す（未選択は null）。
export function sankaiGcFor(s: BoardState, side: Side): GcKey | null {
  if (!s.sankai) return null;
  if (s.sankai === "early") return side === "early" ? "gc1" : "gc2";
  return side === "early" ? "gc2" : "gc1"; // sankai === 'late'
}

// 早側/遅側のセル（雷水[上]＋動く/動かない[下]・個人ギミックは緑枠）。
function sideCells(s: BoardState, side: Side): ResultCell[] {
  const cells: ResultCell[] = [];
  const gc = sankaiGcFor(s, side);
  if (gc && s[gc]) cells.push({ text: raisuiLabel(s, gc), tone: raisuiTone(s, gc) });
  if (s.accel) {
    const [aGc, aSide] = s.accel.split(":") as [GcKey, Side];
    if (aSide === side && s[aGc]) cells.push({ text: accelLabel(s, aGc), tone: "outline-green" });
  }
  return cells;
}

// 状態 → 結果5列（左から ①〜⑤）。spec.md「結果」の唯一の実装。
export function resultColumns(s: BoardState): ResultColumn[] {
  return [
    { key: "early", placeholder: "早\n雷水・加速", cells: sideCells(s, "early") }, // ①
    {
      key: "look",
      placeholder: "早\n視線",
      cells: !s.gc1
        ? []
        : [
            s.gc1 === "honto"
              ? { text: "みない", tone: "blue" }
              : { text: "みる", tone: "outline-red" }, // 何もしない＝枠線
          ],
    }, // ②
    {
      key: "fire",
      placeholder: "🔥\nほのお",
      cells:
        s.fire === "honto"
          ? [{ text: "離れる", tone: "blue" }]
          : s.fire === "uso"
            ? [{ text: "そのまま", tone: "outline-red" }] // 何もしない＝枠線
            : [],
    }, // ③
    { key: "late", placeholder: "遅\n雷水・加速", cells: sideCells(s, "late") }, // ④
    {
      key: "lookLate",
      placeholder: "遅\n視線",
      cells: !s.gc2
        ? []
        : [
            s.gc2 === "honto"
              ? { text: "みない", tone: "blue" }
              : { text: "みる", tone: "outline-red" }, // 何もしない＝枠線
          ],
    }, // ⑤
    {
      key: "tsunami",
      placeholder: "🌊\nつなみ",
      cells:
        s.tsunami === "honto"
          ? [{ text: "そのまま", tone: "outline-blue" }] // 何もしない＝枠線
          : s.tsunami === "uso"
            ? [{ text: "離れる", tone: "red" }]
            : [],
    }, // ⑥
  ];
}

// 連動表示（GC2の雷水が早/遅どちらに来るか・押せない表示用）。
// sankai='early'（GC1を早）→ GC2は遅側。'late' → GC2は早側。
export function linkedGc2Side(s: BoardState): Side | null {
  if (!s.sankai) return null;
  return s.sankai === "early" ? "late" : "early";
}
