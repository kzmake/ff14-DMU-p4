"use client";

import { useState } from "react";
import styles from "./page.module.css";

type Choice = "shin" | "gi" | null;

type Gimmick = {
  id: string;
  name: string;
  shin: string;
  gi: string;
};

type Section = {
  title: string;
  rows: Gimmick[];
};

const SECTIONS: Section[] = [
  {
    title: "【早デバフの皆様】",
    rows: [
      { id: "1water", name: "💧 早水", shin: "📢 【真】水頭割り参加", gi: "📢 【偽】水散開（頭割り入らない）" },
      { id: "1light", name: "⚡ 早ライトニング", shin: "📢 【真】ライトニング散開", gi: "📢 【偽】ライトニング頭割り" },
      { id: "1look", name: "👁️ 早視線", shin: "📢 【真】視線見ない", gi: "📢 【偽】視線見る" },
      { id: "element1", name: "🔥ほのお", shin: "📢 【真】タケノコ", gi: "📢 【偽】ドーナツ" },
    ],
  },
  {
    title: "【遅デバフの皆様】",
    rows: [
      { id: "2water", name: "💧 遅水", shin: "📢 【真】水頭割り参加", gi: "📢 【偽】水散開（頭割り入らない）" },
      { id: "2light", name: "⚡ 遅ライトニング", shin: "📢 【真】ライトニング散開", gi: "📢 【偽】ライトニング頭割り" },
      { id: "2look", name: "👁️ 遅視線", shin: "📢 【真】視線見ない", gi: "📢 【偽】視線見る" },
      { id: "element2", name: "🌊つなみ", shin: "📢 【真】ドーナツ", gi: "📢 【偽】タケノコ " },
    ],
  },
  {
    title: "【安置、加速度判断】",
    rows: [
      { id: "thunda", name: "⚡ サンダガ", shin: "📢 【真】直線踏まない", gi: "📢 【偽】直線踏む" },
      { id: "blizza", name: "❄️ ブリザガ", shin: "📢 【真】扇踏まない", gi: "📢 【偽】扇踏む" },
      { id: "accel", name: "⏳ 加速度爆弾", shin: "📢 【真】止まる", gi: "📢 【偽】動き続ける" },
    ],
  },
];

export default function Home() {
  const [selections, setSelections] = useState<Record<string, Choice>>({});

  const setSelect = (id: string, type: "shin" | "gi") => {
    setSelections((prev) => ({
      ...prev,
      // 同じ選択肢をもう一度押したらトグルで解除
      [id]: prev[id] === type ? null : type,
    }));
  };

  const resetAll = () => setSelections({});

  return (
    <>
      <div className={styles.headerArea}>
        <div className={styles.title}>🤡 絶妖星乱舞 P4 真偽判定</div>
        <button className={styles.resetBtn} onClick={resetAll}>
          ALLリセット
        </button>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title}>
          <div className={styles.sectionTitle}>{section.title}</div>
          {section.rows.map((row) => {
            const active = selections[row.id] ?? null;
            return (
              <div
                key={row.id}
                className={[
                  styles.row,
                  active === "shin" ? styles.activeShin : "",
                  active === "gi" ? styles.activeGi : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className={styles.gimmickInfo}>
                  <div className={styles.gimmickName}>{row.name}</div>
                  <div className={styles.navContainer}>
                    <div
                      className={styles.navText}
                      style={{ opacity: active === "shin" ? 1 : 0 }}
                    >
                      {row.shin}
                    </div>
                    <div
                      className={styles.navText}
                      style={{ opacity: active === "gi" ? 1 : 0 }}
                    >
                      {row.gi}
                    </div>
                  </div>
                </div>
                <div className={styles.btnGroup}>
                  <button
                    className={`${styles.choiceBtn} ${styles.btnShin}`}
                    onClick={() => setSelect(row.id, "shin")}
                  >
                    真
                  </button>
                  <button
                    className={`${styles.choiceBtn} ${styles.btnGi}`}
                    onClick={() => setSelect(row.id, "gi")}
                  >
                    偽
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
