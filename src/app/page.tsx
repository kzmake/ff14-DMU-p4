"use client";

import { useEffect, useState } from "react";

type Tone = "blue" | "red" | "thunder" | "ice" | "both" | "safe" | "green";

// 横＝列（画像準拠）。先頭の本体列が操作、右側は表示専用。
// personal: 個人ギミック（自分の早/遅デバフ依存）。トグルで非表示にできる。
const COLUMNS = [
  { key: "boss", label: "🤡本体", group: "" },
  // 早加速グループ（個人ギミックは狭く）
  { key: "e-accel", label: "💨加速", group: "早", personal: true, narrow: true },
  { key: "e-thunder", label: "⚡雷", group: "早", personal: true, narrow: true },
  { key: "e-water", label: "💧水", group: "早", personal: true, narrow: true },
  { key: "e-look", label: "👁視線", group: "早", narrow: true },
  // 炎
  { key: "fire", label: "🔥", group: "" },
  // 遅加速グループ（個人ギミックは狭く）
  { key: "l-accel", label: "💨加速", group: "遅", personal: true, narrow: true },
  { key: "l-thunder", label: "⚡雷", group: "遅", personal: true, narrow: true },
  { key: "l-water", label: "💧水", group: "遅", personal: true, narrow: true },
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
          "e-accel": { action: "止まる", tone: "green" },
          "e-thunder": { action: "散開", tone: "green" },
          "e-water": { action: "頭割り", tone: "green" },
          "e-look": { action: "見ない", tone: "blue" },
          // この時点で早/遅が分かるので遅の個人ギミックも表示
          "l-accel": { action: "止まる", tone: "green" },
          "l-thunder": { action: "散開", tone: "green" },
          "l-water": { action: "頭割り", tone: "green" },
        },
      },
      {
        key: "uso",
        label: "ウソ",
        tone: "red",
        results: {
          "e-accel": { action: "動く", tone: "green" },
          "e-thunder": { action: "頭割り", tone: "green" },
          "e-water": { action: "散開", tone: "green" },
          "e-look": { action: "見る", tone: "red", outline: true },
          "l-accel": { action: "動く", tone: "green" },
          "l-thunder": { action: "頭割り", tone: "green" },
          "l-water": { action: "散開", tone: "green" },
        },
      },
    ],
  },
  {
    id: "fire",
    name: "🔥🌊1",
    cols: 2,
    options: [
      {
        key: "fire-honto",
        label: "🔥ホント",
        tone: "blue",
        results: { fire: { action: "🔥離れる", tone: "blue" } },
      },
      {
        key: "fire-uso",
        label: "🔥ウソ",
        tone: "red",
        results: { fire: { action: "🔥集合", tone: "red", outline: true } },
      },
      {
        key: "tsunami-honto",
        label: "🌊ホント",
        tone: "blue",
        results: { tsunami: { action: "🌊集合", tone: "blue", outline: true } },
      },
      {
        key: "tsunami-uso",
        label: "🌊ウソ",
        tone: "red",
        results: { tsunami: { action: "🌊離れる", tone: "red" } },
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
          "e-accel": { action: "止まる", tone: "green" },
          "e-thunder": { action: "散開", tone: "green" },
          "e-water": { action: "頭割り", tone: "green" },
          "l-accel": { action: "止まる", tone: "green" },
          "l-thunder": { action: "散開", tone: "green" },
          "l-water": { action: "頭割り", tone: "green" },
          "l-look": { action: "見ない", tone: "blue" },
        },
      },
      {
        key: "uso",
        label: "ウソ",
        tone: "red",
        results: {
          "e-accel": { action: "動く", tone: "green" },
          "e-thunder": { action: "頭割り", tone: "green" },
          "e-water": { action: "散開", tone: "green" },
          "l-accel": { action: "動く", tone: "green" },
          "l-thunder": { action: "頭割り", tone: "green" },
          "l-water": { action: "散開", tone: "green" },
          "l-look": { action: "見る", tone: "red", outline: true },
        },
      },
    ],
  },
  {
    id: "tsunami",
    name: "🔥🌊2",
    cols: 2,
    mirrorOf: "fire", // 1回目（🔥🌊1）で選んだ種別の逆だけ選べる
    options: [
      {
        key: "fire-honto",
        label: "🔥ホント",
        tone: "blue",
        results: { fire: { action: "🔥離れる", tone: "blue" } },
      },
      {
        key: "fire-uso",
        label: "🔥ウソ",
        tone: "red",
        results: { fire: { action: "🔥集合", tone: "red", outline: true } },
      },
      {
        key: "tsunami-honto",
        label: "🌊ホント",
        tone: "blue",
        results: { tsunami: { action: "🌊集合", tone: "blue", outline: true } },
      },
      {
        key: "tsunami-uso",
        label: "🌊ウソ",
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
        label: "ホント",
        tone: "blue",
        results: { tsunami: { action: "⚡ふまない", tone: "blue", outline: true } },
      },
      {
        key: "uso",
        label: "ウソ",
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
        label: "ホント",
        tone: "blue",
        results: { tsunami: { action: "🧊ふまない", tone: "blue", outline: true } },
      },
      {
        key: "uso",
        label: "ウソ",
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

export default function Home() {
  // rowId -> 選択した option.key
  const [selections, setSelections] = useState<Record<string, string | null>>({});
  // 個人ギミック（加速度・雷水）の表示トグル
  const [showPersonal, setShowPersonal] = useState(false);
  // 個人ギミックの「自分用マーカー」点灯（"rowId:colKey" -> bool）
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  // フルスクリーン状態
  const [isFullscreen, setIsFullscreen] = useState(false);
  // フォントサイズ（大中小）。既定は大。
  const [fontSize, setFontSize] = useState<FontSize>("large");

  // 選択したフォントサイズを html の --font-scale に反映
  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", String(FONT_SCALE[fontSize]));
  }, [fontSize]);

  // フルスクリーン状態の変化を監視（Escでの解除なども反映）
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  };

  const toggleMark = (id: string) => setMarks((prev) => ({ ...prev, [id]: !prev[id] }));

  const setSelect = (rowId: string, optionKey: string) => {
    setSelections((prev) => ({
      ...prev,
      // 同じ選択肢をもう一度押したらトグルで解除
      [rowId]: prev[rowId] === optionKey ? null : optionKey,
    }));
  };

  const resetAll = () => {
    setSelections({});
    setMarks({});
  };

  // トグルOFFのとき個人ギミック列を隠す
  const visibleColumns = COLUMNS.filter((c) => showPersonal || !("personal" in c && c.personal));
  const resultCols = visibleColumns.filter((c) => c.key !== "boss") as readonly {
    key: ResultColKey;
    label: string;
    group: string;
  }[];
  // グリッドの列幅（行見出し + 各列）。
  // 個人ギミック表示中は視線などを狭く、非表示時は残り列を等間隔にする。
  const gridTemplate = `2.8rem ${visibleColumns
    .map((c) => (showPersonal && "narrow" in c && c.narrow ? "0.55fr" : "1fr"))
    .join(" ")}`;

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
          <div className="text-[1.2em] font-bold text-[#ffcc00]">🤡 絶妖星乱舞 P4 真偽判定</div>
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
            onClick={() => setShowPersonal((v) => !v)}
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

        {/* 縦軸＝判断していく行 */}
        {ROWS.map((row, rowIndex) => {
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
                      result.alt ? (
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
    </>
  );
}
