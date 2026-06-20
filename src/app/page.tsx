"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

type Tone = "blue" | "red" | "thunder" | "ice" | "both" | "safe" | "green";

// 横＝列（画像準拠）。先頭の本体列が操作、右側は表示専用。
// personal: 個人ギミック（自分の早/遅デバフ依存）。トグルで非表示にできる。
const COLUMNS = [
  { key: "boss", label: "🤡 本体", group: "" },
  // 早加速グループ（個人ギミックは狭く）
  { key: "e-accel", label: "加速度", group: "早", personal: true, narrow: true },
  { key: "e-thunder", label: "雷", group: "早", personal: true, narrow: true },
  { key: "e-water", label: "水", group: "早", personal: true, narrow: true },
  { key: "e-look", label: "視線", group: "早", narrow: true },
  // 炎
  { key: "fire", label: "ほのお", group: "" },
  // 遅加速グループ（個人ギミックは狭く）
  { key: "l-accel", label: "加速度", group: "遅", personal: true, narrow: true },
  { key: "l-thunder", label: "雷", group: "遅", personal: true, narrow: true },
  { key: "l-water", label: "水", group: "遅", personal: true, narrow: true },
  { key: "l-look", label: "視線", group: "遅", narrow: true },
  // つなみ
  { key: "tsunami", label: "つなみ ＆ マジックアウト", group: "" },
] as const;

type ColKey = (typeof COLUMNS)[number]["key"];
type ResultColKey = Exclude<ColKey, "boss">;

// 結果セル。alt がある場合は「ほんと時／ウソ時」の2候補を枠線だけで並べて表示。
type ResultCell = {
  action: string;
  tone: Tone;
  // ウソ（対照）時の結果。あると2候補表示になる。
  alt?: { action: string; tone: Tone };
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
    name: "GC1回目",
    cols: 1,
    options: [
      {
        key: "honto",
        label: "本当",
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
        label: "嘘",
        tone: "red",
        results: {
          "e-accel": { action: "動く", tone: "green" },
          "e-thunder": { action: "頭割り", tone: "green" },
          "e-water": { action: "散開", tone: "green" },
          "e-look": { action: "見る", tone: "red" },
          "l-accel": { action: "動く", tone: "green" },
          "l-thunder": { action: "頭割り", tone: "green" },
          "l-water": { action: "散開", tone: "green" },
        },
      },
    ],
  },
  {
    id: "fire1",
    name: "ほのお or つなみ1回目",
    cols: 2,
    options: [
      {
        key: "fire-honto",
        label: "ほのお本当",
        tone: "blue",
        results: { fire: { action: "🔥タケノコ", tone: "blue" } },
      },
      {
        key: "fire-uso",
        label: "ほのお嘘",
        tone: "red",
        results: { fire: { action: "🔥ドーナツ", tone: "red" } },
      },
      {
        key: "tsunami-honto",
        label: "つなみ本当",
        tone: "blue",
        results: { tsunami: { action: "🌊ドーナツ", tone: "blue" } },
      },
      {
        key: "tsunami-uso",
        label: "つなみ嘘",
        tone: "red",
        results: { tsunami: { action: "🌊タケノコ", tone: "red" } },
      },
    ],
  },
  {
    id: "gc2",
    name: "GC2回目",
    cols: 1,
    options: [
      {
        key: "honto",
        label: "本当",
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
        label: "嘘",
        tone: "red",
        results: {
          "e-accel": { action: "動く", tone: "green" },
          "e-thunder": { action: "頭割り", tone: "green" },
          "e-water": { action: "散開", tone: "green" },
          "l-accel": { action: "動く", tone: "green" },
          "l-thunder": { action: "頭割り", tone: "green" },
          "l-water": { action: "散開", tone: "green" },
          "l-look": { action: "見る", tone: "red" },
        },
      },
    ],
  },
  {
    id: "tsunami1",
    name: "ほのお or つなみ2回目",
    cols: 2,
    mirrorOf: "fire1", // 1回目で選んだ種別の逆だけ選べる
    options: [
      {
        key: "fire-honto",
        label: "ほのお本当",
        tone: "blue",
        results: { fire: { action: "🔥タケノコ", tone: "blue" } },
      },
      {
        key: "fire-uso",
        label: "ほのお嘘",
        tone: "red",
        results: { fire: { action: "🔥ドーナツ", tone: "red" } },
      },
      {
        key: "tsunami-honto",
        label: "つなみ本当",
        tone: "blue",
        results: { tsunami: { action: "🌊ドーナツ", tone: "blue" } },
      },
      {
        key: "tsunami-uso",
        label: "つなみ嘘",
        tone: "red",
        results: { tsunami: { action: "🌊タケノコ", tone: "red" } },
      },
    ],
  },
  {
    id: "magic",
    name: "マジックチャージ",
    cols: 2,
    options: [
      {
        key: "none",
        label: "踏まない",
        tone: "blue",
        results: {
          tsunami: {
            action: "踏まない",
            tone: "blue",
            alt: { action: "全部ふむ", tone: "red" },
          },
        },
      },
      {
        key: "thunder",
        label: "雷だけ",
        tone: "thunder",
        results: {
          tsunami: {
            action: "雷だけ",
            tone: "thunder",
            alt: { action: "氷だけ", tone: "ice" },
          },
        },
      },
      {
        key: "ice",
        label: "氷だけ",
        tone: "ice",
        results: {
          tsunami: {
            action: "氷だけ",
            tone: "ice",
            alt: { action: "雷だけ", tone: "thunder" },
          },
        },
      },
      {
        key: "both",
        label: "全部ふむ",
        tone: "red",
        results: {
          tsunami: {
            action: "全部ふむ",
            tone: "red",
            alt: { action: "踏まない", tone: "blue" },
          },
        },
      },
    ],
  },
];

const toneClass: Record<Tone, string> = {
  blue: styles.onBlue,
  red: styles.onRed,
  thunder: styles.onThunder,
  ice: styles.onIce,
  both: styles.onBoth,
  safe: styles.onSafe,
  green: styles.onGreen,
};

// 塗りつぶしなし・枠線だけ版（2候補表示用）
const outlineClass: Record<Tone, string> = {
  blue: styles.outBlue,
  red: styles.outRed,
  thunder: styles.outThunder,
  ice: styles.outIce,
  both: styles.outBoth,
  safe: styles.outSafe,
  green: styles.outGreen,
};

export default function Home() {
  // rowId -> 選択した option.key
  const [selections, setSelections] = useState<Record<string, string | null>>({});
  // 個人ギミック（加速度・雷水）の表示トグル
  const [showPersonal, setShowPersonal] = useState(false);
  // 個人ギミックの「自分用マーカー」点灯（"rowId:colKey" -> bool）
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  // フルスクリーン状態
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  const gridTemplate = `4rem ${visibleColumns
    .map((c) => (showPersonal && "narrow" in c && c.narrow ? "0.55fr" : "1fr"))
    .join(" ")}`;

  return (
    <>
      <div className={styles.headerArea}>
        <div className={styles.titleArea}>
          <button
            type="button"
            className={styles.fsBtn}
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "フルスクリーン解除" : "フルスクリーン"}
            title={isFullscreen ? "フルスクリーン解除" : "フルスクリーン"}
          >
            {isFullscreen ? "🗗" : "⛶"}
          </button>
          <div className={styles.title}>🤡 絶妖星乱舞 P4 真偽判定</div>
        </div>
        <div className={styles.headerBtns}>
          <button
            type="button"
            role="switch"
            aria-checked={showPersonal}
            className={`${styles.toggleSwitch} ${showPersonal ? styles.toggleSwitchOn : ""}`}
            onClick={() => setShowPersonal((v) => !v)}
          >
            <span className={styles.toggleSwitchLabel}>個人ギミック</span>
            <span className={styles.toggleSwitchTrack}>
              <span className={styles.toggleSwitchThumb} />
            </span>
          </button>
          <button type="button" className={styles.resetBtn} onClick={resetAll}>
            ALLリセット
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {/* 用途見出し行：本体＝記憶、それ以外＝タイムライン */}
        <div
          className={`${styles.gridRow} ${styles.headRow}`}
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <div className={styles.rowHead} />
          <div className={styles.usageMemory} style={{ gridColumn: "span 1" }}>
            <span className={styles.usageIcon}>🧠</span>
            <span className={styles.usageText}>記憶</span>
          </div>
          <div
            className={styles.usageTimeline}
            style={{ gridColumn: `span ${visibleColumns.length - 1}` }}
          >
            <span className={styles.usageIcon}>⏱</span>
            <span className={styles.usageText}>タイムライン</span>
          </div>
        </div>

        {/* グループ見出し行 */}
        <div
          className={`${styles.gridRow} ${styles.headRow}`}
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <div className={styles.rowHead} />
          {visibleColumns.map((col) => (
            <div key={col.key} className={col.group ? styles.groupHead : styles.groupBlank}>
              {col.group}
            </div>
          ))}
        </div>

        {/* 列名ヘッダー行 */}
        <div
          className={`${styles.gridRow} ${styles.headRow}`}
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <div className={styles.rowHead} />
          {visibleColumns.map((col) => (
            <div key={col.key} className={styles.colHead}>
              {col.label}
            </div>
          ))}
        </div>

        {/* 縦軸＝判断していく行 */}
        {ROWS.map((row, rowIndex) => {
          const activeKey = selections[row.id] ?? null;
          const zebra = rowIndex % 2 === 0 ? styles.zebraDark : styles.zebraBlack;

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
              className={`${styles.gridRow} ${zebra}`}
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div className={styles.rowHead}>{row.name}</div>

              {/* 本体列：操作ボタン */}
              <div className={`${styles.cell} ${styles.cellActive}`}>
                {mirrorWaiting ? (
                  <div className={styles.linkedWaiting}>↑1回目を選択</div>
                ) : (
                  <div
                    className={styles.btnGroup}
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
                          className={[styles.choiceBtn, isActive ? toneClass[opt.tone] : ""]
                            .filter(Boolean)
                            .join(" ")}
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
                  return <div key={col.key} className={styles.cell} />;
                }
                // 個人ギミック（緑）は自分用マーカーとして点灯トグルできる
                const isPersonalGreen = result?.tone === "green";
                const markId = `${row.id}:${col.key}`;
                const lit = marks[markId];
                return (
                  <div key={col.key} className={`${styles.cell} ${styles.cellActive}`}>
                    {result ? (
                      result.alt ? (
                        // ほんと/ウソで対照になる2候補を枠線だけで並べて表示
                        <div className={styles.altPair}>
                          <div
                            className={`${styles.linkedResult} ${styles.altChoice} ${outlineClass[result.tone]}`}
                          >
                            {result.action}
                          </div>
                          <div className={styles.altOr}>or</div>
                          <div
                            className={`${styles.linkedResult} ${styles.altChoice} ${outlineClass[result.alt.tone]}`}
                          >
                            {result.alt.action}
                          </div>
                        </div>
                      ) : isPersonalGreen ? (
                        <button
                          type="button"
                          className={`${styles.linkedResult} ${styles.markBtn} ${lit ? styles.markLit : styles.markDim}`}
                          onClick={() => toggleMark(markId)}
                        >
                          {result.action}
                        </button>
                      ) : (
                        <div className={`${styles.linkedResult} ${toneClass[result.tone]}`}>
                          {result.action}
                        </div>
                      )
                    ) : (
                      <div className={styles.linkedWaiting}>−</div>
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
