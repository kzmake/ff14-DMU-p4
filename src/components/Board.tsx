"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  accelLabel,
  type BoardState,
  type GcKey,
  INITIAL_BOARD_STATE,
  linkedGc2Side,
  type ResultCell,
  raisuiLabel,
  raisuiTone,
  resultColumns,
  type Side,
  type Tone,
} from "@/lib/p4rules";

export { type BoardState, INITIAL_BOARD_STATE };

// トーン→クラス。塗り（雷=青/水=赤）と枠線だけ（何もしない・個人ギミック）。
const toneClass: Record<Tone, string> = {
  blue: "bg-[#4dadff] text-white border-[#3399ff]",
  red: "bg-[#ff4d4d] text-white border-[#ff3333]",
  green: "bg-[#3fbf6f] text-white border-[#2fa85c]",
  "outline-blue": "bg-transparent text-[#8fcaff] border-[#4dadff]",
  "outline-red": "bg-transparent text-[#ff9999] border-[#ff4d4d]",
  "outline-green": "bg-transparent text-[#8fe6ad] border-[#3fbf6f]",
};

// ボタンの選択中クラス（ホント=青/ウソ=赤）。
const onBlue = "bg-[#4dadff] text-white border-[#3399ff]";
const onRed = "bg-[#ff4d4d] text-white border-[#ff3333]";
const onGreenOutline = "bg-transparent text-[#3fbf6f] border-[#3fbf6f]";
const offBtn = "bg-[#222] text-[#ccc] border-[#444]";

const cellBase =
  "flex flex-1 min-h-0 items-center justify-center rounded-md border-2 text-center text-[0.8rem] font-bold leading-[1.2] p-1 whitespace-pre-line";

// 結果1列ぶん（空ならプレースホルダーをうっすら）。
function ResultColumn({ placeholder, cells }: { placeholder: string; cells: ResultCell[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md border border-[#333] bg-[rgba(255,255,255,0.03)] p-1">
      {cells.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center whitespace-pre-line rounded-md border-2 border-dashed border-[#2c2c2c] text-center text-[0.7rem] font-semibold leading-[1.2] text-[#555]">
          {placeholder}
        </div>
      ) : (
        cells.map((c) => (
          <div key={`${c.text}:${c.tone}`} className={`${cellBase} ${toneClass[c.tone]}`}>
            {c.text}
          </div>
        ))
      )}
    </div>
  );
}

// 結果5列（左から ①〜⑤）。盤面・PiP・結果ページで共通。
export function SummaryView({ state }: { state: BoardState }) {
  const cols = resultColumns(state);
  return (
    <div className="grid min-h-0 flex-1 grid-cols-5 gap-[6px]">
      {cols.map((col) => (
        <ResultColumn key={col.key} placeholder={col.placeholder} cells={col.cells} />
      ))}
    </div>
  );
}

// 記憶のボタン（早/遅タグ付き or ホント/ウソ）。
function OptButton({
  label,
  sub,
  onClass,
  active,
  big,
  disabled,
  onClick,
}: {
  label: string;
  sub?: string; // 早/遅 タグ
  onClass: string;
  active: boolean;
  big?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-full min-h-[44px] w-full min-w-0 cursor-pointer items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-[10px] border-2 font-extrabold leading-[1.1] ${
        big ? "text-[18px]" : "text-[16px]"
      } ${disabled ? "cursor-default border-dashed" : ""} ${active ? onClass : offBtn}`}
    >
      {sub && (
        <b className="inline-flex h-[1.7em] min-w-[1.7em] items-center justify-center rounded-[7px] bg-[#ffcc00] text-[20px] font-black text-[#0f0f0f]">
          {sub}
        </b>
      )}
      <span>{label}</span>
    </button>
  );
}

// 盤面本体。状態は controlled。
export default function Board({
  state,
  onChange,
  shareInfo,
}: {
  state: BoardState;
  onChange: (next: BoardState) => void;
  shareInfo?: { code: string; connected: boolean };
}) {
  // 結果エリアの高さ（px）。null は既定。本体と PiP で別々に保持。
  const [resultH, setResultH] = useState<number | null>(null); // 本体
  const [pipResultH, setPipResultH] = useState<number | null>(null); // PiP

  // 仕切りドラッグの共通実装。win=対象ウィンドウ、setH=高さ更新先。
  const startResize = (
    downY: number,
    win: Window,
    current: number | null,
    setH: (h: number) => void,
  ) => {
    const startH = current ?? win.innerHeight * 0.4;
    const move = (clientY: number) => {
      setH(Math.max(60, Math.min(win.innerHeight - 120, startH + (clientY - downY))));
    };
    const mm = (e: MouseEvent) => move(e.clientY);
    const tm = (e: TouchEvent) => move(e.touches[0].clientY);
    const up = () => {
      win.removeEventListener("mousemove", mm);
      win.removeEventListener("mouseup", up);
      win.removeEventListener("touchmove", tm);
      win.removeEventListener("touchend", up);
    };
    win.addEventListener("mousemove", mm);
    win.addEventListener("mouseup", up);
    win.addEventListener("touchmove", tm, { passive: true });
    win.addEventListener("touchend", up);
  };

  // 本体の仕切り
  const onDividerDown = (downY: number) => startResize(downY, window, resultH, setResultH);
  // PiP の仕切り（PiP のウィンドウ基準）
  const onPipDividerDown = (downY: number) => {
    const win = pipContainer?.ownerDocument.defaultView;
    if (win) startResize(downY, win, pipResultH, setPipResultH);
  };

  // オーバーレイ(PiP)。記憶も含めるか・上下反転するかをトグルできる。
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);
  const [pipMemo, setPipMemo] = useState(true); // 既定: 記憶も表示
  const [pipFlip, setPipFlip] = useState(true); // 既定: 上下反転（記憶が上・結果が下）
  const pipOpen = pipContainer !== null;

  const openPip = async (withMemo: boolean, flip: boolean) => {
    const dpip = window.documentPictureInPicture;
    if (!dpip) {
      alert("この機能はDocument Picture-in-Picture対応ブラウザ（Chrome系）でのみ使えます。");
      return;
    }
    if (dpip.window) dpip.window.close();
    const pip = await dpip.requestWindow({ width: 480, height: withMemo ? 360 : 150 });
    // 親のスタイルを小窓へコピー
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const css = Array.from(sheet.cssRules)
          .map((r) => r.cssText)
          .join("");
        const style = pip.document.createElement("style");
        style.textContent = css;
        pip.document.head.appendChild(style);
      } catch {
        if (sheet.href) {
          const link = pip.document.createElement("link");
          link.rel = "stylesheet";
          link.href = sheet.href;
          pip.document.head.appendChild(link);
        }
      }
    }
    pip.document.body.style.cssText =
      "margin:0;background:#0f0f0f;padding:6px;height:100dvh;display:flex;overflow:hidden;";
    // 結果＋記憶はこの el の flex子。flip は el の flex-direction を切り替える。
    const el = pip.document.createElement("div");
    el.style.cssText = `display:flex;flex-direction:${
      flip ? "column-reverse" : "column"
    };gap:6px;min-height:0;flex:1;width:100%;`;
    pip.document.body.appendChild(el);
    pip.addEventListener("pagehide", () => setPipContainer(null));
    setPipContainer(el);
  };

  const togglePip = () => {
    if (window.documentPictureInPicture?.window) {
      window.documentPictureInPicture.window.close();
      return;
    }
    openPip(pipMemo, pipFlip);
  };
  // 開いている最中にトグルを変えたら開き直す
  const reopenIfOpen = (withMemo: boolean, flip: boolean) => {
    if (pipOpen) openPip(withMemo, flip);
  };

  // ホント/ウソ等を選ぶ（同じ値の再押下で解除）。
  const setChoice = (key: "gc1" | "gc2" | "fire" | "tsunami", v: "honto" | "uso") =>
    onChange({ ...state, [key]: state[key] === v ? null : v });
  const setSankai = (v: Side) => onChange({ ...state, sankai: state.sankai === v ? null : v });
  // 加速は4択中1つだけ（再押下で解除）。
  const setAccel = (key: string) => onChange({ ...state, accel: state.accel === key ? null : key });

  // 加速ボタン（GC1/GC2 × 早/遅）。値=そのGCのホント/ウソに従う。
  const accelBtn = (gc: GcKey, side: Side) => {
    const key = `${gc}:${side}`;
    return (
      <OptButton
        sub={side === "early" ? "早" : "遅"}
        label={state[gc] ? accelLabel(state, gc) : "動く"}
        onClass={onGreenOutline}
        active={state.accel === key}
        onClick={() => setAccel(key)}
      />
    );
  };

  // 雷水位置ボタン（GC1のみ連動）。
  const sankaiBtn = (side: Side) => {
    const tone = state.gc1 ? raisuiTone(state, "gc1") : "blue";
    return (
      <OptButton
        sub={side === "early" ? "早" : "遅"}
        label={state.gc1 ? raisuiLabel(state, "gc1") : "雷水"}
        onClass={tone === "red" ? onRed : onBlue}
        active={state.sankai === side}
        onClick={() => setSankai(side)}
      />
    );
  };

  // GC2 雷水の連動表示（押せない）。GC1の早/遅選択で来る側だけ点灯。
  const linkedSide = linkedGc2Side(state);
  const linkedBtn = (side: Side) => {
    const isActive = side === linkedSide && state.gc2;
    return (
      <OptButton
        sub={side === "early" ? "早" : "遅"}
        label={isActive ? raisuiLabel(state, "gc2") : "雷水"}
        onClass={raisuiTone(state, "gc2") === "red" ? onRed : onBlue}
        active={!!isActive}
        disabled
      />
    );
  };

  const hontoUso = (key: "gc1" | "gc2" | "fire" | "tsunami") => (
    <>
      <OptButton
        big
        label="ホント"
        onClass={onBlue}
        active={state[key] === "honto"}
        onClick={() => setChoice(key, "honto")}
      />
      <OptButton
        big
        label="ウソ"
        onClass={onRed}
        active={state[key] === "uso"}
        onClick={() => setChoice(key, "uso")}
      />
    </>
  );

  const RowLabel = ({ children }: { children: React.ReactNode }) => (
    <span className="flex items-center justify-center text-center text-[14px] font-extrabold leading-[1.1] text-[#ffcc00]">
      {children}
    </span>
  );

  // 記憶（4行×6列）。盤面・PiP で共通利用。
  const memoGrid = (
    <div className="grid min-h-0 flex-1 grid-cols-[2.4em_1fr_1fr_2.4em_1fr_1fr] grid-rows-4 gap-1.5">
      <RowLabel>GC1</RowLabel>
      {hontoUso("gc1")}
      <RowLabel>GC2</RowLabel>
      {hontoUso("gc2")}

      <RowLabel>加速</RowLabel>
      {accelBtn("gc1", "early")}
      {accelBtn("gc1", "late")}
      <RowLabel>加速</RowLabel>
      {accelBtn("gc2", "early")}
      {accelBtn("gc2", "late")}

      <RowLabel>雷水</RowLabel>
      {sankaiBtn("early")}
      {sankaiBtn("late")}
      <RowLabel>雷水</RowLabel>
      {linkedBtn("early")}
      {linkedBtn("late")}

      <RowLabel>🔥</RowLabel>
      {hontoUso("fire")}
      <RowLabel>🌊</RowLabel>
      {hontoUso("tsunami")}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-1.5">
      {/* ヘッダー：PiP と共有状態 */}
      <div
        className="flex shrink-0 items-center gap-2 border-b-2 border-[#ffcc00] pb-[3px]"
        style={{ fontSize: "min(2dvh, 16px)" }}
      >
        <button
          type="button"
          onClick={togglePip}
          className={`inline-flex cursor-pointer items-center gap-[0.2em] rounded border px-[0.5em] py-[0.2em] text-[0.8em] font-bold ${
            pipOpen
              ? "border-[#ffcc00] bg-[#2a2a2a] text-[#ffcc00]"
              : "border-[#555] bg-[#1c1c1c] text-[#ffcc00] hover:border-[#ffcc00]"
          }`}
        >
          🪟 オーバーレイ表示
        </button>
        <button
          type="button"
          aria-pressed={!pipMemo}
          onClick={() => {
            const next = !pipMemo;
            setPipMemo(next);
            reopenIfOpen(next, pipFlip);
          }}
          className={`inline-flex cursor-pointer items-center gap-[0.2em] rounded border px-[0.5em] py-[0.2em] text-[0.8em] font-bold ${
            !pipMemo
              ? "border-[#ffcc00] bg-[#ffcc00] text-[#0f0f0f]"
              : "border-[#555] bg-[#1c1c1c] text-[#ffcc00] hover:border-[#ffcc00]"
          }`}
        >
          {/* 既定で記憶も表示。ボタンは隠す方向 */}
          {pipMemo ? "🧠 記憶を隠す" : "🧠 記憶も表示"}
        </button>
        <button
          type="button"
          aria-pressed={!pipFlip}
          onClick={() => {
            const next = !pipFlip;
            setPipFlip(next);
            // 開いていれば結果/記憶のコンテナを即その場で上下入れ替え
            if (pipContainer) {
              pipContainer.style.flexDirection = next ? "column-reverse" : "column";
            }
          }}
          className={`inline-flex cursor-pointer items-center gap-[0.2em] rounded border px-[0.5em] py-[0.2em] text-[0.8em] font-bold ${
            !pipFlip
              ? "border-[#ffcc00] bg-[#ffcc00] text-[#0f0f0f]"
              : "border-[#555] bg-[#1c1c1c] text-[#ffcc00] hover:border-[#ffcc00]"
          }`}
        >
          {/* 既定で反転（記憶が上）。ボタンは結果を上へ戻す方向 */}
          {pipFlip ? "🔃 結果を上に" : "🔃 記憶を上に"}
        </button>
        {shareInfo && (
          <span
            className={`inline-flex items-center gap-1 rounded border px-[0.4em] py-[0.1em] text-[0.7em] font-bold ${
              shareInfo.connected
                ? "border-[#3fbf6f] bg-[rgba(63,191,111,0.15)] text-[#8fe6ad]"
                : "border-[#888] bg-[rgba(255,255,255,0.06)] text-[#aaa]"
            }`}
          >
            {shareInfo.connected ? "🟢" : "⚪"} 共有 {shareInfo.code}
          </span>
        )}
      </div>

      {/* 結果（上） */}
      <div
        className="flex shrink-0 flex-col rounded-lg border-2 border-[#ffcc00] bg-[rgba(255,204,0,0.06)] p-1.5"
        style={{ height: resultH != null ? `${resultH}px` : "40dvh" }}
      >
        <SummaryView state={state} />
      </div>

      {/* 結果と記憶の間：ドラッグで上下サイズ変更 */}
      <div
        className="flex shrink-0 cursor-row-resize items-center justify-center py-[2px]"
        onMouseDown={(e) => {
          e.preventDefault();
          onDividerDown(e.clientY);
        }}
        onTouchStart={(e) => onDividerDown(e.touches[0].clientY)}
        title="ドラッグで結果と記憶の高さを調整"
      >
        <span className="h-[4px] w-12 rounded-full bg-[#555] hover:bg-[#ffcc00]" />
      </div>

      {/* 記憶（下）：4行×6列。本体は常に表示（PiPに出していても残す） */}
      {memoGrid}

      {/* PiP 小窓：結果（＋記憶も表示ON時は記憶）を描画。state と自動同期・操作可 */}
      {pipContainer &&
        createPortal(
          <>
            <div
              className="flex shrink-0 flex-col rounded-lg border-2 border-[#ffcc00] bg-[rgba(255,204,0,0.06)] p-1.5"
              style={{
                height: pipMemo ? (pipResultH != null ? `${pipResultH}px` : "40%") : "100%",
              }}
            >
              <SummaryView state={state} />
            </div>
            {pipMemo && (
              <>
                <div
                  className="flex shrink-0 cursor-row-resize items-center justify-center py-[2px]"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPipDividerDown(e.clientY);
                  }}
                  onTouchStart={(e) => onPipDividerDown(e.touches[0].clientY)}
                >
                  <span className="h-[4px] w-12 rounded-full bg-[#555] hover:bg-[#ffcc00]" />
                </div>
                {memoGrid}
              </>
            )}
          </>,
          pipContainer,
        )}
    </div>
  );
}
