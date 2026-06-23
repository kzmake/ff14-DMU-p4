"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { type BoardState, INITIAL_BOARD_STATE } from "@/lib/boardState";

export { type BoardState, INITIAL_BOARD_STATE };

// Document Picture-in-Picture API（Chrome系のみ。型定義が無いので最小限で宣言）
declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow: (opts?: { width?: number; height?: number }) => Promise<Window>;
      window: Window | null;
    };
  }
}

type Tone = "blue" | "red" | "thunder" | "ice" | "both" | "safe" | "green";

// 横＝列（画像準拠）。先頭の本体列が操作、右側は表示専用。
// personal: 個人ギミック（自分の早/遅デバフ依存）。トグルで非表示にできる。
const COLUMNS = [
  { key: "boss", label: "🤡本体", group: "" },
  // 早グループ（個人ギミックは狭く）。加速＋雷水を1列に集約
  { key: "e-accel", label: "加速・⚡💧", group: "早", personal: true, narrow: true },
  { key: "e-look", label: "👁視線", group: "早", narrow: true },
  // 炎
  { key: "fire", label: "🔥", group: "" },
  // 遅グループ（個人ギミックは狭く）。加速＋雷水を1列に集約
  { key: "l-accel", label: "加速・⚡💧", group: "遅", personal: true, narrow: true },
  { key: "l-look", label: "👁視線", group: "遅", narrow: true },
  // つなみ
  { key: "tsunami", label: "🌊", group: "" },
] as const;

type ColKey = (typeof COLUMNS)[number]["key"];
type ResultColKey = Exclude<ColKey, "boss">;

// 結果セル。alt がある場合は「ほんと時／ウソ時」の2候補を枠線だけで並べて表示。
type ResultCell = {
  action: string;
  tone: Tone;
  // ウソ（対照）時の結果。あると2候補表示になる。
  alt?: { action: string; tone: Tone };
  // 塗りつぶしなし・枠線だけで表示する（例：ふまない）
  outline?: boolean;
  // 1セルに複数結果を縦積みで表示（例：加速＋雷水）。指定時は action/tone より優先。
  stack?: { action: string; tone: Tone }[];
};

// 本体列のボタン1つ。押すと results の各列に結果が表示される。
type Option = {
  key: string;
  label: string;
  tone: Tone;
  results: Partial<Record<ResultColKey, ResultCell>>;
};

// 縦＝判断していく行
type Row = {
  id: string;
  name: string;
  cols: number; // 本体列ボタンのグリッド列数
  options: Option[];
  // ほのお/つなみ用：指定した行と逆の種別だけを選べるようにする
  mirrorOf?: string;
};

// option.key から種別（fire / tsunami）を取り出す
const elementKind = (optionKey: string): "fire" | "tsunami" | null =>
  optionKey.startsWith("fire") ? "fire" : optionKey.startsWith("tsunami") ? "tsunami" : null;

const ROWS: Row[] = [
  {
    id: "gc1",
    name: "GC1",
    cols: 1,
    options: [
      {
        key: "honto",
        label: "ホント",
        tone: "blue",
        results: {
          "e-accel": {
            action: "動かない",
            tone: "green",
            stack: [
              { action: "動かない", tone: "green" },
              { action: "雷さんかい", tone: "blue" },
            ],
          },
          "e-look": { action: "見ない", tone: "blue" },
          // この時点で早/遅が分かるので遅の個人ギミックも表示
          "l-accel": {
            action: "動かない",
            tone: "green",
            stack: [
              { action: "動かない", tone: "green" },
              { action: "雷さんかい", tone: "blue" },
            ],
          },
        },
      },
      {
        key: "uso",
        label: "ウソ",
        tone: "red",
        results: {
          "e-accel": {
            action: "動く",
            tone: "green",
            stack: [
              { action: "動く", tone: "green" },
              { action: "水さんかい", tone: "red" },
            ],
          },
          "e-look": { action: "見る", tone: "red", outline: true },
          "l-accel": {
            action: "動く",
            tone: "green",
            stack: [
              { action: "動く", tone: "green" },
              { action: "水さんかい", tone: "red" },
            ],
          },
        },
      },
    ],
  },
  {
    id: "fire",
    name: "🔥",
    cols: 2,
    options: [
      {
        key: "fire-honto",
        label: "ホント",
        tone: "blue",
        results: { fire: { action: "🔥離れる", tone: "blue" } },
      },
      {
        key: "fire-uso",
        label: "ウソ",
        tone: "red",
        results: { fire: { action: "🔥集合", tone: "red", outline: true } },
      },
    ],
  },
  {
    id: "gc2",
    name: "GC2",
    cols: 1,
    options: [
      {
        key: "honto",
        label: "ホント",
        tone: "blue",
        results: {
          "e-accel": {
            action: "動かない",
            tone: "green",
            stack: [
              { action: "動かない", tone: "green" },
              { action: "雷さんかい", tone: "blue" },
            ],
          },
          "l-accel": {
            action: "動かない",
            tone: "green",
            stack: [
              { action: "動かない", tone: "green" },
              { action: "雷さんかい", tone: "blue" },
            ],
          },
          "l-look": { action: "見ない", tone: "blue" },
        },
      },
      {
        key: "uso",
        label: "ウソ",
        tone: "red",
        results: {
          "e-accel": {
            action: "動く",
            tone: "green",
            stack: [
              { action: "動く", tone: "green" },
              { action: "水さんかい", tone: "red" },
            ],
          },
          "l-accel": {
            action: "動く",
            tone: "green",
            stack: [
              { action: "動く", tone: "green" },
              { action: "水さんかい", tone: "red" },
            ],
          },
          "l-look": { action: "見る", tone: "red", outline: true },
        },
      },
    ],
  },
  {
    id: "tsunami",
    name: "🌊",
    cols: 2,
    options: [
      {
        key: "tsunami-honto",
        label: "ホント",
        tone: "blue",
        results: { tsunami: { action: "🌊集合", tone: "blue", outline: true } },
      },
      {
        key: "tsunami-uso",
        label: "ウソ",
        tone: "red",
        results: { tsunami: { action: "🌊離れる", tone: "red" } },
      },
    ],
  },
  {
    id: "charge-thunder",
    name: "⚡",
    cols: 2,
    options: [
      {
        key: "honto",
        label: "ふまない",
        tone: "blue",
        results: { tsunami: { action: "⚡ふまない", tone: "blue", outline: true } },
      },
      {
        key: "uso",
        label: "ふむ",
        tone: "red",
        results: { tsunami: { action: "⚡ふむ", tone: "red" } },
      },
    ],
  },
  {
    id: "charge-ice",
    name: "🧊",
    cols: 2,
    options: [
      {
        key: "honto",
        label: "ふまない",
        tone: "blue",
        results: { tsunami: { action: "🧊ふまない", tone: "blue", outline: true } },
      },
      {
        key: "uso",
        label: "ふむ",
        tone: "red",
        results: { tsunami: { action: "🧊ふむ", tone: "red" } },
      },
    ],
  },
];

// 選択中ボタン・結果セルの塗りつぶし配色（Tailwind 任意値で元の色を維持）
const toneClass: Record<Tone, string> = {
  blue: "bg-[#4dadff] text-white border-[#3399ff]",
  red: "bg-[#ff4d4d] text-white border-[#ff3333]",
  thunder: "bg-[#a64dff] text-white border-[#8a2be2]",
  ice: "bg-[#eaf7ff] text-[#2a5a6e] border-[#bfe6f5]",
  both: "bg-[#ff9933] text-black border-[#e67e00]",
  safe: "bg-[#4ddd7e] text-[#003311] border-[#2fbf5f]",
  green: "bg-[#3fbf6f] text-white border-[#2fa85c]",
};

// 塗りつぶしなし・枠線だけ版（2候補表示用）
const outlineClass: Record<Tone, string> = {
  blue: "bg-transparent text-[#8fcaff] border-[1.5px] border-[#4dadff]",
  red: "bg-transparent text-[#ff9999] border-[1.5px] border-[#ff4d4d]",
  thunder: "bg-transparent text-[#c79bff] border-[1.5px] border-[#a64dff]",
  ice: "bg-transparent text-[#cdeeff] border-[1.5px] border-[#bfe6f5]",
  both: "bg-transparent text-[#ffc080] border-[1.5px] border-[#ff9933]",
  safe: "bg-transparent text-[#8fe8b0] border-[1.5px] border-[#4ddd7e]",
  green: "bg-transparent text-[#7fd9a0] border-[1.5px] border-[#3fbf6f]",
};

// フォントサイズ（大中小）。html の --font-scale に「実効dvh値」を渡す。
// 基準が 1dvh なので、この値がそのまま root font-size の dvh になる。
// iPad mini で崩れない上限を実測した値（大=3.2 / 中=3.0 / 小=2.8）。
type FontSize = "small" | "medium" | "large";
const FONT_SCALE: Record<FontSize, number> = {
  small: 2.8,
  medium: 3.0,
  large: 3.2,
};
const FONT_OPTIONS: { key: FontSize; label: string }[] = [
  { key: "large", label: "大" },
  { key: "medium", label: "中" },
  { key: "small", label: "小" },
];

// 結果セル共通レイアウト（中央寄せ・枠線等）
const linkedResultBase =
  "flex flex-1 min-h-0 items-center justify-center text-center text-[0.77rem] font-bold rounded leading-[1.15] p-px whitespace-pre-line break-all";

// 結果列だけ（本体=boss を除く）
const RESULT_COLS = COLUMNS.filter((c) => c.key !== "boss") as readonly {
  key: ResultColKey;
  label: string;
  group: string;
}[];

// 状態から「最終結果」セルの表示項目を列ごとに計算する（描画とは独立）。
// 雷水を上・加速を下に並べ替え済み。点灯マーカーだけを集約する。
function computeSummaryItems(
  state: BoardState,
  col: ResultColKey,
): { s: { action: string; tone: Tone }; outline: boolean }[] {
  const { selections, marks, showCharge } = state;
  const visibleRows = ROWS.filter((row) => showCharge || !row.id.startsWith("charge-"));

  const activeResultOf = (row: Row): Option | null => {
    const activeKey = selections[row.id] ?? null;
    let opts = row.options;
    if (row.mirrorOf) {
      const srcKey = selections[row.mirrorOf] ?? null;
      const srcKind = srcKey ? elementKind(srcKey) : null;
      if (!srcKind) return null;
      const wantKind = srcKind === "fire" ? "tsunami" : "fire";
      opts = row.options.filter((o) => elementKind(o.key) === wantKind);
    }
    return opts.find((o) => o.key === activeKey) ?? null;
  };

  const cells = visibleRows
    .map((row) => {
      const cell = activeResultOf(row)?.results[col] ?? null;
      return cell ? { rowId: row.id, cell } : null;
    })
    .filter((x): x is { rowId: string; cell: ResultCell } => x !== null);

  const raw = cells.flatMap(({ rowId, cell }) => {
    if (cell.stack) {
      // i=0=加速, i=1=雷水。点灯したものだけ、種別(rank)付きで返す。
      return cell.stack
        .map((s, i) => ({
          s,
          outline: false,
          rank: i === 1 ? 0 : 1, // 雷水=0(上), 加速=1(下)
          lit: marks[`${rowId}:${col}:${i}`],
        }))
        .filter((x) => x.lit);
    }
    return [{ s: { action: cell.action, tone: cell.tone }, outline: !!cell.outline, rank: 0 }];
  });
  return raw
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .map(({ s, outline }) => ({ s, outline }));
}

// 「最終結果」だけを描画する読み取り専用ビュー。
//  - variant="full": 列ラベル付きで画面いっぱい（/share/[code]/result 用）
//  - variant="pip" : ラベル無しのコンパクト（PiP小窓用）
export function SummaryView({
  state,
  variant,
}: {
  state: BoardState;
  variant: "full" | "pip";
}) {
  const gridCols = `repeat(${RESULT_COLS.length}, 1fr)`;
  if (variant === "pip") {
    return (
      <div className="grid h-full w-full gap-[3px]" style={{ gridTemplateColumns: gridCols }}>
        {RESULT_COLS.map((col) => (
          <SummaryCell key={col.key} items={computeSummaryItems(state, col.key)} />
        ))}
      </div>
    );
  }
  // full: 列見出し + セル
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-[3px]">
      <div className="grid shrink-0 gap-[3px]" style={{ gridTemplateColumns: gridCols }}>
        {RESULT_COLS.map((col) => (
          <div
            key={col.key}
            className="flex items-center justify-center rounded-[3px] bg-[rgba(255,204,0,0.08)] px-px py-[2px] text-center text-[min(2dvh,15px)] font-bold leading-[1.1] text-[#ffcc00]"
          >
            {col.label}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 gap-[3px]" style={{ gridTemplateColumns: gridCols }}>
        {RESULT_COLS.map((col) => (
          <SummaryCell key={col.key} items={computeSummaryItems(state, col.key)} />
        ))}
      </div>
    </div>
  );
}

// 最終結果の1列ぶんのセル（共通描画）
function SummaryCell({
  items,
}: {
  items: { s: { action: string; tone: Tone }; outline: boolean }[];
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[3px] rounded border border-[#333] bg-[rgba(255,255,255,0.03)] p-[3px]">
      {items.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center text-center text-[0.7rem] text-[#3a3a3a]">
          ·
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-stretch justify-center gap-[3px]">
          {items.map(({ s, outline }, i) => (
            <div
              key={i}
              className={`${linkedResultBase} ${outline ? outlineClass[s.tone] : toneClass[s.tone]}`}
            >
              {s.action}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 小さなトグルスイッチ（個人ギミックと同デザイン）。表の上部の表示切替に使う。
function RowToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="group inline-flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0"
      onClick={onChange}
    >
      <span className={`text-[0.85em] font-bold ${checked ? "text-[#ffcc00]" : "text-[#aaa]"}`}>
        {label}
      </span>
      <span
        className={`relative h-[16px] w-[30px] rounded-[8px] border transition-[background,border-color] duration-150 ${
          checked ? "border-[#e6b800] bg-[#ffcc00]" : "border-[#555] bg-[#444]"
        }`}
      >
        <span
          className={`absolute top-px left-px h-[12px] w-[12px] rounded-full transition-[transform,background] duration-150 ${
            checked ? "translate-x-[14px] bg-[#0f0f0f]" : "bg-[#ccc]"
          }`}
        />
      </span>
    </button>
  );
}

// 盤面本体。状態は controlled（state と onChange を外部から注入）。
// ローカルページと共有ページの両方から使う。
export default function Board({
  state,
  onChange,
  shareInfo,
}: {
  state: BoardState;
  onChange: (next: BoardState) => void;
  // 共有ページのとき、ヘッダーに表示する情報（コード等）。未指定ならローカル扱い。
  shareInfo?: { code: string; connected: boolean };
}) {
  const { selections, marks, dimmedMarks, showPersonal, showTimeline, showCharge } = state;

  // フルスクリーン状態（ローカルのみ）
  const [isFullscreen, setIsFullscreen] = useState(false);
  // フォントサイズ（大中小）。既定は大。（ローカルのみ）
  const [fontSize, setFontSize] = useState<FontSize>("large");
  // Document PiP（最終結果を最前面の小窓に出す）。開いている間だけ container を保持。
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);

  // 選択したフォントサイズを html の --font-scale に反映
  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", String(FONT_SCALE[fontSize]));
  }, [fontSize]);

  // フルスクリーン状態の変化を監視（Escでの解除なども反映）
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  };

  // 最終結果を Document PiP（常に最前面の小窓）で開く／閉じる
  const togglePip = async () => {
    const dpip = window.documentPictureInPicture;
    if (!dpip) {
      alert("この機能はDocument Picture-in-Picture対応ブラウザ（Chrome系）でのみ使えます。");
      return;
    }
    if (dpip.window) {
      dpip.window.close();
      return;
    }
    const pip = await dpip.requestWindow({ width: 480, height: 160 });
    // 親ページのスタイル（Tailwind等）を小窓へコピー
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const css = Array.from(sheet.cssRules)
          .map((r) => r.cssText)
          .join("");
        const style = pip.document.createElement("style");
        style.textContent = css;
        pip.document.head.appendChild(style);
      } catch {
        // CORS で読めない外部シートはリンクで取り込む
        if (sheet.href) {
          const link = pip.document.createElement("link");
          link.rel = "stylesheet";
          link.href = sheet.href;
          pip.document.head.appendChild(link);
        }
      }
    }
    // 小窓は dvh が極小（高さ160px）になり文字が潰れるので、root font-size を
    // 小窓の高さ基準のpx固定にする（rem系のセル文字が大きく表示される）。
    const applyPipFont = () => {
      const h = pip.innerHeight || 160;
      // 高さに比例（おおむね本体の見やすさに合わせた係数）。下限14px。
      const px = Math.max(14, Math.round(h * 0.16));
      pip.document.documentElement.style.fontSize = `${px}px`;
    };
    applyPipFont();
    pip.addEventListener("resize", applyPipFont);
    pip.document.body.style.margin = "0";
    pip.document.body.style.background = "#0f0f0f";
    pip.document.body.style.padding = "6px";
    const container = pip.document.createElement("div");
    container.style.width = "100%";
    container.style.height = "100%";
    pip.document.body.appendChild(container);
    pip.addEventListener("pagehide", () => setPipContainer(null));
    setPipContainer(container);
  };

  // マーカーのキー: "<gc1|gc2>:<e|l>-accel:<0=加速|1=雷水>"
  // 加速マーカー（GC1/GC2の早/遅 計4つ）のキー一覧
  const ACCEL_KEYS = ["gc1:e-accel:0", "gc1:l-accel:0", "gc2:e-accel:0", "gc2:l-accel:0"];

  // 雷水(⚡💧)マーカーのキーから、GC1↔GC2・早↔遅 を逆にした相手キーを返す。
  // 雷水でなければ null。例: gc1:e-accel:1 → gc2:l-accel:1
  const raisuiPartner = (id: string): string | null => {
    const m = /^(gc1|gc2):(e|l)-accel:1$/.exec(id);
    if (!m) return null;
    const otherRow = m[1] === "gc1" ? "gc2" : "gc1";
    const otherCol = m[2] === "e" ? "l" : "e";
    return `${otherRow}:${otherCol}-accel:1`;
  };

  // 雷水マーカーのキーから、同じGC行内の反対側（早↔遅）の雷水キーを返す。
  // 雷水でなければ null。例: gc1:e-accel:1 → gc1:l-accel:1
  const raisuiSameRow = (id: string): string | null => {
    const m = /^(gc1|gc2):(e|l)-accel:1$/.exec(id);
    if (!m) return null;
    const otherCol = m[2] === "e" ? "l" : "e";
    return `${m[1]}:${otherCol}-accel:1`;
  };

  // 雷水マーカーのキーから、別GCの同じ早/遅 の雷水キーを返す。
  // 雷水でなければ null。例: gc1:e-accel:1 → gc2:e-accel:1
  const raisuiOtherGc = (id: string): string | null => {
    const m = /^(gc1|gc2):(e|l)-accel:1$/.exec(id);
    if (!m) return null;
    const otherRow = m[1] === "gc1" ? "gc2" : "gc1";
    return `${otherRow}:${m[2]}-accel:1`;
  };

  // 緑マーカーの点灯ルール（要素ごとに独立）
  //  - 加速(:0)  : GC1/GC2 合わせて1つだけ点灯。残り3つは薄表示（クリックで移せる）。
  //  - 雷水(:1)  : 押すと自分＋対角(GC・早遅とも逆)を点灯し、同行・同列は薄表示にする。
  const toggleMark = (id: string) => {
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
      // 自分自身が薄表示中にクリックされたら、その薄表示は解除する。
      nextDimmed[id] = false;
      if (sameRow) nextDimmed[sameRow] = !wasLit;
      if (otherGc) nextDimmed[otherGc] = !wasLit;
    }

    onChange({ ...state, marks: nextMarks, dimmedMarks: nextDimmed });
  };

  const setSelect = (rowId: string, optionKey: string) => {
    onChange({
      ...state,
      selections: {
        ...selections,
        // 同じ選択肢をもう一度押したらトグルで解除
        [rowId]: selections[rowId] === optionKey ? null : optionKey,
      },
    });
  };

  const resetAll = () => {
    onChange({ ...state, selections: {}, marks: {}, dimmedMarks: {} });
  };

  // 加速列(e-accel/l-accel)は雷水を常に出すため列ごとは隠さない。
  // 個人ギミックOFFのときは列内の「加速(動く/動かない)」サブセルだけを隠す。
  const visibleColumns = COLUMNS;
  const resultCols = visibleColumns.filter((c) => c.key !== "boss") as readonly {
    key: ResultColKey;
    label: string;
    group: string;
  }[];
  // グリッドの列幅（行見出し + 各列）。
  // タイムライン列はすべて等幅（narrow 指定は無視）。
  const gridTemplate = `2.8rem ${visibleColumns.map(() => "1fr").join(" ")}`;

  // 表示中の行（⚡🧊トグル反映）
  const visibleRows = ROWS.filter((row) => showCharge || !row.id.startsWith("charge-"));

  // 最終結果グリッド（インライン表示・PiP小窓）。集約ロジックは共通関数を再利用。
  const summaryGrid = (variant: "inline" | "pip") => {
    if (variant === "pip") return <SummaryView state={state} variant="pip" />;
    // inline: 行見出し「最終結果」＋ 空の本体列 ＋ 各結果列
    return (
      <div
        className="grid min-h-0 flex-1 gap-[3px] rounded border border-[#ffcc00] bg-[rgba(255,204,0,0.06)]"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div
          className="flex items-center justify-center border-l-2 border-[#ffcc00] px-px text-center font-bold leading-[1.1] text-[#ffcc00]"
          style={{ fontSize: "min(1.5dvh, 11px)" }}
        >
          最終結果
        </div>
        {/* 本体（記憶）列は空白 */}
        <div className="min-w-0 rounded" />
        {resultCols.map((col) => (
          <SummaryCell key={col.key} items={computeSummaryItems(state, col.key)} />
        ))}
      </div>
    );
  };

  return (
    <>
      {/* ヘッダー：本文(4dvh)に引きずられないよう 2dvh 基準。子は em で追従 */}
      <div
        className="flex shrink-0 items-center justify-between border-b-2 border-[#ffcc00] mb-1 pb-[3px]"
        style={{ fontSize: "min(2dvh, 16px)" }}
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="inline-flex h-[1.6em] w-[1.6em] cursor-pointer items-center justify-center rounded border border-[#555] bg-[#1c1c1c] text-[0.95em] leading-none text-[#ffcc00] hover:border-[#ffcc00] hover:bg-[#2a2a2a]"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "フルスクリーン解除" : "フルスクリーン"}
            title={isFullscreen ? "フルスクリーン解除" : "フルスクリーン"}
          >
            {isFullscreen ? "🗗" : "⛶"}
          </button>
          <button
            type="button"
            className={`inline-flex h-[1.6em] cursor-pointer items-center justify-center gap-[0.2em] rounded border px-[0.4em] text-[0.8em] font-bold leading-none ${
              pipContainer
                ? "border-[#ffcc00] bg-[#2a2a2a] text-[#ffcc00]"
                : "border-[#555] bg-[#1c1c1c] text-[#ffcc00] hover:border-[#ffcc00] hover:bg-[#2a2a2a]"
            }`}
            onClick={togglePip}
            aria-label="最終結果を別窓(最前面)で表示"
            title="最終結果を別窓(最前面)で表示"
          >
            🪟 最終結果
          </button>
          <div className="text-[1.2em] font-bold text-[#ffcc00]">🤡 絶妖星乱舞 P4 真偽判定</div>
          {shareInfo && (
            <span
              className={`inline-flex items-center gap-1 rounded border px-[0.4em] py-[0.1em] text-[0.7em] font-bold ${
                shareInfo.connected
                  ? "border-[#3fbf6f] bg-[rgba(63,191,111,0.15)] text-[#8fe6ad]"
                  : "border-[#888] bg-[rgba(255,255,255,0.06)] text-[#aaa]"
              }`}
              title={shareInfo.connected ? "同期中" : "接続中…"}
            >
              {shareInfo.connected ? "🟢" : "⚪"} 共有 {shareInfo.code}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* フォントサイズ切替（大中小） */}
          <div className="inline-flex overflow-hidden rounded border border-[#555]">
            {FONT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                aria-pressed={fontSize === opt.key}
                className={`cursor-pointer border-none px-2 py-[3px] text-[0.85em] font-bold ${
                  fontSize === opt.key
                    ? "bg-[#ffcc00] text-[#0f0f0f]"
                    : "bg-[#1c1c1c] text-[#aaa] hover:bg-[#2a2a2a]"
                }`}
                onClick={() => setFontSize(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showPersonal}
            className="group inline-flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0"
            onClick={() => onChange({ ...state, showPersonal: !showPersonal })}
          >
            <span
              className={`text-[0.85em] font-bold ${showPersonal ? "text-[#ffcc00]" : "text-[#aaa]"}`}
            >
              個人ギミック
            </span>
            <span
              className={`relative h-[18px] w-[34px] rounded-[9px] border transition-[background,border-color] duration-150 ${
                showPersonal ? "border-[#e6b800] bg-[#ffcc00]" : "border-[#555] bg-[#444]"
              }`}
            >
              <span
                className={`absolute top-px left-px h-[14px] w-[14px] rounded-full transition-[transform,background] duration-150 ${
                  showPersonal ? "translate-x-4 bg-[#0f0f0f]" : "bg-[#ccc]"
                }`}
              />
            </span>
          </button>
          <RowToggle
            label="結果タイムライン"
            checked={showTimeline}
            onChange={() => onChange({ ...state, showTimeline: !showTimeline })}
          />
          <RowToggle
            label="⚡🧊"
            checked={showCharge}
            onChange={() => onChange({ ...state, showCharge: !showCharge })}
          />
          <button
            type="button"
            className="cursor-pointer rounded border-none bg-[#ff3333] px-2 py-[3px] text-[0.85em] font-bold text-white"
            onClick={resetAll}
          >
            ALLリセット
          </button>
        </div>
      </div>

      {/* 表全体：利用可能な高さいっぱいに広げ、各行で等分する */}
      <div className="flex h-full min-h-0 flex-1 flex-col gap-[2px]">
        {/* 用途見出し行：本体＝記憶、それ以外＝タイムライン（小さめ＝2dvh基準） */}
        <div
          className="grid shrink-0 gap-[3px]"
          style={{ gridTemplateColumns: gridTemplate, fontSize: "min(2dvh, 15px)" }}
        >
          <div />
          <div
            className="flex items-center justify-center gap-[3px] rounded-[5px] border border-[#b07fe6] bg-[linear-gradient(135deg,#8a4fd0_0%,#5e2a99_100%)] px-[2px] py-1 text-center text-[0.95em] font-extrabold leading-[1.1] text-white [box-shadow:inset_0_1px_0_rgba(255,255,255,0.25),0_0_6px_rgba(138,79,208,0.5)] [text-shadow:0_1px_1px_rgba(0,0,0,0.4)]"
            style={{ gridColumn: "span 1" }}
          >
            <span className="text-[1.1em] leading-none [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.5))]">
              🧠
            </span>
            <span>記憶</span>
          </div>
          <div
            className="flex items-center justify-center gap-1 rounded-[5px] border border-[#4fd6d6] bg-[linear-gradient(135deg,#2bb3b3_0%,#146e6e_100%)] px-[2px] py-1 text-center text-[0.95em] font-extrabold leading-[1.1] tracking-[1.5px] text-white [box-shadow:inset_0_1px_0_rgba(255,255,255,0.25),0_0_6px_rgba(43,179,179,0.5)] [text-shadow:0_1px_1px_rgba(0,0,0,0.4)]"
            style={{ gridColumn: `span ${visibleColumns.length - 1}` }}
          >
            <span className="text-[1.1em] leading-none [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.5))]">
              ⏱
            </span>
            <span className="tracking-[inherit]">タイムライン</span>
          </div>
        </div>

        {/* グループ見出し行（小さめ＝2dvh基準） */}
        <div
          className="grid shrink-0 gap-[3px]"
          style={{ gridTemplateColumns: gridTemplate, fontSize: "min(2dvh, 15px)" }}
        >
          <div />
          {visibleColumns.map((col) => (
            <div
              key={col.key}
              className={
                col.group
                  ? "flex items-center justify-center rounded-[3px] bg-[#ffcc00] px-px py-[2px] text-center text-[0.95em] font-bold leading-[1.1] text-[#0f0f0f]"
                  : "bg-transparent"
              }
            >
              {col.group}
            </div>
          ))}
        </div>

        {/* 列名ヘッダー行（小さめ＝2dvh基準） */}
        <div
          className="grid shrink-0 gap-[3px]"
          style={{ gridTemplateColumns: gridTemplate, fontSize: "min(2dvh, 15px)" }}
        >
          <div />
          {visibleColumns.map((col) => (
            <div
              key={col.key}
              className="flex items-center justify-center rounded-[3px] bg-[rgba(255,204,0,0.08)] px-px py-[2px] text-center text-[0.85em] font-bold leading-[1.1] text-[#ffcc00]"
            >
              {col.label}
            </div>
          ))}
        </div>

        {/* 最終結果行（結果タイムラインONのとき、GC1の上に集約表示） */}
        {showTimeline && summaryGrid("inline")}

        {/* 縦軸＝判断していく行（⚡🧊行はトグルOFFで隠す） */}
        {visibleRows.map((row, rowIndex) => {
          const activeKey = selections[row.id] ?? null;
          const zebra = rowIndex % 2 === 0 ? "bg-[#1c1c1c]" : "bg-black";

          // ほのお/つなみ逆連動：参照元の種別の逆だけを表示
          let displayOptions = row.options;
          let mirrorWaiting = false;
          if (row.mirrorOf) {
            const srcKey = selections[row.mirrorOf] ?? null;
            const srcKind = srcKey ? elementKind(srcKey) : null;
            if (srcKind) {
              const wantKind = srcKind === "fire" ? "tsunami" : "fire";
              displayOptions = row.options.filter((o) => elementKind(o.key) === wantKind);
            } else {
              // 1回目が未選択なら2回目は待機表示
              mirrorWaiting = true;
            }
          }

          // 表示中のオプションに含まれる選択だけ有効（連動で種別が変わったら無効化）
          const activeOption = displayOptions.find((o) => o.key === activeKey) ?? null;

          return (
            <div
              key={row.id}
              className={`grid min-h-0 flex-1 gap-[3px] rounded ${zebra}`}
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div
                className="flex items-center justify-center border-l-2 border-[#ffcc00] px-px text-center font-bold leading-[1.1] text-white"
                style={{ fontSize: "min(1.7dvh, 13px)" }}
              >
                {row.name}
              </div>

              {/* 本体列：操作ボタン */}
              <div className="flex min-w-0 flex-col gap-[3px] rounded border border-[#333] bg-[rgba(255,255,255,0.03)] p-[3px]">
                {mirrorWaiting ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center text-center text-[0.85rem] text-[#777]">
                    ↑1回目を選択
                  </div>
                ) : (
                  <div
                    className="grid min-h-0 flex-1 auto-rows-fr gap-[3px]"
                    style={{
                      gridTemplateColumns: `repeat(${displayOptions.length === 4 ? 2 : displayOptions.length}, 1fr)`,
                    }}
                  >
                    {displayOptions.map((opt) => {
                      const isActive = activeKey === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          className={`h-full w-full min-h-0 min-w-0 cursor-pointer rounded border p-0 text-[0.85rem] font-bold ${
                            isActive ? toneClass[opt.tone] : "border-[#444] bg-[#222] text-[#ccc]"
                          }`}
                          onClick={() => setSelect(row.id, opt.key)}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 右側：表示専用。本体の選択結果を表示 */}
              {resultCols.map((col) => {
                const result = activeOption?.results[col.key] ?? null;
                const usesCol = row.options.some((o) => o.results[col.key]);
                if (!usesCol) {
                  return <div key={col.key} className="min-w-0 rounded" />;
                }
                // 個人ギミック（緑）は自分用マーカーとして点灯トグルできる
                const isPersonalGreen = result?.tone === "green";
                const markId = `${row.id}:${col.key}`;
                const lit = marks[markId];
                return (
                  <div
                    key={col.key}
                    className="flex min-w-0 flex-col gap-[3px] rounded border border-[#333] bg-[rgba(255,255,255,0.03)] p-[3px]"
                  >
                    {result ? (
                      result.stack ? (
                        // 縦積み：上=雷水(常表示・青赤・クリック連動)、下=加速(個人ギミック・緑)
                        // stack順は [加速(i=0), 雷水(i=1)] のままで、表示だけ reverse で雷水を上に。
                        <div className="flex min-h-0 flex-1 flex-col-reverse items-stretch justify-center gap-[3px]">
                          {result.stack.map((s, i) => {
                            const isRaisui = i === 1; // i=1 が 雷/水さんかい
                            // 加速(i=0)は個人ギミックOFFで隠す。雷水は常に表示。
                            if (!isRaisui && !showPersonal) return null;
                            const subId = `${markId}:${i}`;
                            const subLit = marks[subId];
                            const subDimmed = dimmedMarks[subId] && !subLit;
                            if (isRaisui) {
                              // 雷水：青(雷)/赤(水)。点灯で塗り、未点灯は枠線のみ、薄表示はグレー。
                              return (
                                <button
                                  key={subId}
                                  type="button"
                                  className={`${linkedResultBase} w-full cursor-pointer border-2 font-[inherit] ${
                                    subDimmed
                                      ? "border-[#555] bg-[rgba(255,255,255,0.03)] text-[#777] opacity-60"
                                      : subLit
                                        ? toneClass[s.tone]
                                        : outlineClass[s.tone]
                                  }`}
                                  onClick={() => toggleMark(subId)}
                                >
                                  {s.action}
                                </button>
                              );
                            }
                            // 加速：緑の個人ギミックマーカー
                            return (
                              <button
                                key={subId}
                                type="button"
                                className={`${linkedResultBase} w-full cursor-pointer border-2 border-[#3fbf6f] font-[inherit] ${
                                  subDimmed
                                    ? "border-[#555] bg-[rgba(255,255,255,0.03)] text-[#777] opacity-60"
                                    : subLit
                                      ? "bg-[#3fbf6f] text-white [box-shadow:0_0_8px_2px_rgba(63,191,111,0.8)]"
                                      : "bg-[rgba(63,191,111,0.12)] text-[#8fe6ad]"
                                }`}
                                onClick={() => toggleMark(subId)}
                              >
                                {s.action}
                              </button>
                            );
                          })}
                        </div>
                      ) : result.alt ? (
                        // ほんと/ウソで対照になる2候補を枠線だけで並べて表示
                        <div className="flex min-h-0 flex-1 flex-col items-stretch justify-center gap-px">
                          <div
                            className={`${linkedResultBase} flex-[1_1_auto] ${outlineClass[result.tone]}`}
                          >
                            {result.action}
                          </div>
                          <div className="shrink-0 text-center text-[0.62rem] font-bold leading-none text-[#888]">
                            or
                          </div>
                          <div
                            className={`${linkedResultBase} flex-[1_1_auto] ${outlineClass[result.alt.tone]}`}
                          >
                            {result.alt.action}
                          </div>
                        </div>
                      ) : isPersonalGreen ? (
                        <button
                          type="button"
                          className={`${linkedResultBase} w-full cursor-pointer border-2 border-[#3fbf6f] font-[inherit] ${
                            lit
                              ? "bg-[#3fbf6f] text-white [box-shadow:0_0_8px_2px_rgba(63,191,111,0.8)]"
                              : "bg-[rgba(63,191,111,0.12)] text-[#8fe6ad]"
                          }`}
                          onClick={() => toggleMark(markId)}
                        >
                          {result.action}
                        </button>
                      ) : (
                        <div
                          className={`${linkedResultBase} ${
                            result.outline ? outlineClass[result.tone] : toneClass[result.tone]
                          }`}
                        >
                          {result.action}
                        </div>
                      )
                    ) : (
                      <div className="flex min-h-0 flex-1 items-center justify-center text-center text-[0.7rem] text-[#3a3a3a]">
                        ·
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Document PiP の小窓へ最終結果を描画（親stateと自動同期） */}
      {pipContainer && createPortal(summaryGrid("pip"), pipContainer)}
    </>
  );
}
