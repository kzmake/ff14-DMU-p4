"use client";

import { useState } from "react";
import styles from "./page.module.css";

type Tone = "blue" | "red" | "thunder" | "ice" | "both" | "safe";

// 横＝列の種類（先頭の本体列が操作、右側は表示専用）
const COLUMNS = ["boss", "accel", "share", "look", "element"] as const;
type ColKey = (typeof COLUMNS)[number];
type ResultColKey = Exclude<ColKey, "boss">;

const COL_LABELS: Record<ColKey, string> = {
  boss: "🤡 ボス本体",
  accel: "⏳ 加速度",
  share: "📢 頭割り・散開",
  look: "👁️ 視線",
  element: "🌊 ほのお・みず",
};

// 本体列のボタン1つ。押すと results の各列に結果が表示される。
type Option = {
  key: string;
  label: string; // ボタン表記
  tone: Tone; // ボタンの色
  // この選択肢を選んだとき、右側のどの列に何を出すか
  results: Partial<Record<ResultColKey, { action: string; tone: Tone }>>;
};

// 縦＝判断していく行
type Row = {
  id: string;
  name: string;
  cols: number; // 本体列ボタンのグリッド列数
  options: Option[];
};

const ROWS: Row[] = [
  {
    id: "gc1",
    name: "GC1回目（視線）",
    cols: 1,
    options: [
      {
        key: "honto",
        label: "ホント",
        tone: "blue",
        results: {
          accel: { action: "止まる", tone: "blue" },
          share: { action: "ライトニング散開", tone: "blue" },
          look: { action: "視線見ない", tone: "blue" },
        },
      },
      {
        key: "uso",
        label: "ウソ",
        tone: "red",
        results: {
          accel: { action: "動き続ける", tone: "red" },
          share: { action: "ライトニング頭割り", tone: "red" },
          look: { action: "視線見る", tone: "red" },
        },
      },
    ],
  },
  {
    id: "elem1",
    name: "ほのお・つなみ1回目",
    cols: 2,
    options: [
      {
        key: "fire-honto",
        label: "炎ホント",
        tone: "red",
        results: { element: { action: "🔥タケノコ", tone: "red" } },
      },
      {
        key: "fire-uso",
        label: "炎ウソ",
        tone: "blue",
        results: { element: { action: "🔥ドーナツ", tone: "blue" } },
      },
      {
        key: "water-honto",
        label: "水ホント",
        tone: "blue",
        results: { element: { action: "🌊ドーナツ", tone: "blue" } },
      },
      {
        key: "water-uso",
        label: "水ウソ",
        tone: "red",
        results: { element: { action: "🌊タケノコ", tone: "red" } },
      },
    ],
  },
  {
    id: "gc2",
    name: "GC2回目（視線）",
    cols: 1,
    options: [
      {
        key: "honto",
        label: "ホント",
        tone: "blue",
        results: {
          accel: { action: "止まる", tone: "blue" },
          share: { action: "ライトニング散開", tone: "blue" },
          look: { action: "視線見ない", tone: "blue" },
        },
      },
      {
        key: "uso",
        label: "ウソ",
        tone: "red",
        results: {
          accel: { action: "動き続ける", tone: "red" },
          share: { action: "ライトニング頭割り", tone: "red" },
          look: { action: "視線見る", tone: "red" },
        },
      },
    ],
  },
  {
    id: "elem2",
    name: "ほのお・つなみ2回目",
    cols: 2,
    options: [
      {
        key: "fire-honto",
        label: "炎ホント",
        tone: "red",
        results: { element: { action: "🔥タケノコ", tone: "red" } },
      },
      {
        key: "fire-uso",
        label: "炎ウソ",
        tone: "blue",
        results: { element: { action: "🔥ドーナツ", tone: "blue" } },
      },
      {
        key: "water-honto",
        label: "水ホント",
        tone: "blue",
        results: { element: { action: "🌊ドーナツ", tone: "blue" } },
      },
      {
        key: "water-uso",
        label: "水ウソ",
        tone: "red",
        results: { element: { action: "🌊タケノコ", tone: "red" } },
      },
    ],
  },
  {
    id: "thunder-ice",
    name: "雷・氷",
    cols: 2,
    options: [
      {
        key: "both",
        label: "全部ふむ",
        tone: "both",
        results: { accel: { action: "全部ふむ", tone: "both" } },
      },
      {
        key: "thunder",
        label: "雷のみ",
        tone: "thunder",
        results: { accel: { action: "雷のみ", tone: "thunder" } },
      },
      {
        key: "ice",
        label: "氷のみ",
        tone: "ice",
        results: { accel: { action: "氷のみ", tone: "ice" } },
      },
      {
        key: "none",
        label: "ふまない",
        tone: "safe",
        results: { accel: { action: "ふまない", tone: "safe" } },
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
};

export default function Home() {
  // rowId -> 選択した option.key
  const [selections, setSelections] = useState<Record<string, string | null>>({});

  const setSelect = (rowId: string, optionKey: string) => {
    setSelections((prev) => ({
      ...prev,
      // 同じ選択肢をもう一度押したらトグルで解除
      [rowId]: prev[rowId] === optionKey ? null : optionKey,
    }));
  };

  const resetAll = () => setSelections({});

  return (
    <>
      <div className={styles.headerArea}>
        <div className={styles.title}>🤡 絶妖星乱舞 P4 真偽判定</div>
        <button type="button" className={styles.resetBtn} onClick={resetAll}>
          ALLリセット
        </button>
      </div>

      <div className={styles.grid}>
        {/* ヘッダー行（横軸＝列の種類） */}
        <div className={`${styles.gridRow} ${styles.headRow}`}>
          <div className={styles.rowHead} />
          {COLUMNS.map((col) => (
            <div key={col} className={styles.colHead}>
              {COL_LABELS[col]}
            </div>
          ))}
        </div>

        {/* 縦軸＝判断していく行 */}
        {ROWS.map((row) => {
          const activeKey = selections[row.id] ?? null;
          const activeOption = row.options.find((o) => o.key === activeKey) ?? null;
          return (
            <div key={row.id} className={styles.gridRow}>
              <div className={styles.rowHead}>{row.name}</div>

              {/* 本体列：操作ボタン */}
              <div className={`${styles.cell} ${styles.cellActive}`}>
                <div
                  className={styles.btnGroup}
                  style={{ gridTemplateColumns: `repeat(${row.cols}, 1fr)` }}
                >
                  {row.options.map((opt) => {
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
              </div>

              {/* 右側：表示専用。本体の選択結果を表示 */}
              {(COLUMNS.filter((c) => c !== "boss") as ResultColKey[]).map((col) => {
                const result = activeOption?.results[col] ?? null;
                // この行がこの列を使うか（どれかのオプションが結果を持つか）
                const usesCol = row.options.some((o) => o.results[col]);
                if (!usesCol) {
                  return <div key={col} className={styles.cell} />;
                }
                return (
                  <div key={col} className={`${styles.cell} ${styles.cellActive}`}>
                    {result ? (
                      <div className={`${styles.linkedResult} ${toneClass[result.tone]}`}>
                        {result.action}
                      </div>
                    ) : (
                      <div className={styles.linkedWaiting}>← 本体で判断</div>
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
