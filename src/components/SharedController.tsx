"use client";

import { useCallback, useRef, useState } from "react";
import {
  type BoardState,
  elementKind,
  INITIAL_BOARD_STATE,
  type Option,
  type Row,
  ROWS,
  toneClass,
  type Tone,
} from "@/components/Board";
import { applyMarkToggle } from "@/lib/marks";
import { useShareConnection } from "@/lib/useShareConnection";

function makeClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `c-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

// 加速列キー（早・遅）
const ACCEL_COLS = [
  { col: "e-accel", label: "早" },
  { col: "l-accel", label: "遅" },
] as const;

const outlineTone: Record<Tone, string> = {
  blue: "border-[#4dadff] text-[#8fcaff]",
  red: "border-[#ff4d4d] text-[#ff9999]",
  thunder: "border-[#a64dff] text-[#c79bff]",
  ice: "border-[#bfe6f5] text-[#cdeeff]",
  both: "border-[#ff9933] text-[#ffc080]",
  safe: "border-[#4ddd7e] text-[#8fe8b0]",
  green: "border-[#3fbf6f] text-[#8fe6ad]",
};

// スマホ向け操作リモコン。ボタンを押すと状態がサーバー同期される。
export default function SharedController({ code }: { code: string }) {
  const [state, setState] = useState<BoardState>(INITIAL_BOARD_STATE);
  const clientIdRef = useRef<string>("");
  const appliedRevRef = useRef<number>(-1);
  const stateRef = useRef<BoardState>(state);
  const dirtyRef = useRef<boolean>(false);

  if (!clientIdRef.current) clientIdRef.current = makeClientId();
  stateRef.current = state;

  const postState = useCallback(
    (next: BoardState) => {
      void fetch(`/api/share/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: next, origin: clientIdRef.current }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((res: { rev: number } | null) => {
          if (res) appliedRevRef.current = Math.max(appliedRevRef.current, res.rev);
        })
        .catch(() => {});
    },
    [code],
  );

  const { connected } = useShareConnection(code, {
    onMessage: (payload) => {
      if (payload.origin && payload.origin === clientIdRef.current) {
        appliedRevRef.current = Math.max(appliedRevRef.current, payload.rev);
        return;
      }
      if (payload.rev < appliedRevRef.current) return;
      appliedRevRef.current = payload.rev;
      setState(payload.state);
    },
    onReconnect: () => {
      if (dirtyRef.current) postState(stateRef.current);
    },
  });

  const commit = useCallback(
    (next: BoardState) => {
      dirtyRef.current = true;
      setState(next);
      postState(next);
    },
    [postState],
  );

  const setSelect = (rowId: string, optionKey: string) =>
    commit({
      ...state,
      selections: {
        ...state.selections,
        [rowId]: state.selections[rowId] === optionKey ? null : optionKey,
      },
    });

  const toggleMark = (id: string) => {
    const { marks, dimmedMarks } = applyMarkToggle(state, id);
    commit({ ...state, marks, dimmedMarks });
  };

  const resetAll = () => commit({ ...state, selections: {}, marks: {}, dimmedMarks: {} });

  const visibleRows = ROWS.filter((row) => state.showCharge || !row.id.startsWith("charge-"));

  // 行の有効な選択結果（ミラー連動考慮）
  const activeResultOf = (row: Row): Option | null => {
    const activeKey = state.selections[row.id] ?? null;
    let opts = row.options;
    if (row.mirrorOf) {
      const srcKey = state.selections[row.mirrorOf] ?? null;
      const srcKind = srcKey ? elementKind(srcKey) : null;
      if (!srcKind) return null;
      const wantKind = srcKind === "fire" ? "tsunami" : "fire";
      opts = row.options.filter((o) => elementKind(o.key) === wantKind);
    }
    return opts.find((o) => o.key === activeKey) ?? null;
  };

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-3 p-2">
      <div className="flex shrink-0 items-center justify-between border-b-2 border-[#ffcc00] pb-2">
        <div className="text-lg font-bold text-[#ffcc00]">🎮 操作リモコン</div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-bold ${
              connected
                ? "border-[#3fbf6f] bg-[rgba(63,191,111,0.15)] text-[#8fe6ad]"
                : "border-[#888] bg-[rgba(255,255,255,0.06)] text-[#aaa]"
            }`}
          >
            {connected ? "🟢" : "⚪"} {code}
          </span>
          <button
            type="button"
            className="cursor-pointer rounded border-none bg-[#ff3333] px-3 py-1 text-xs font-bold text-white"
            onClick={resetAll}
          >
            リセット
          </button>
        </div>
      </div>

      {visibleRows.map((row) => {
        const activeKey = state.selections[row.id] ?? null;
        // ミラー連動で表示する選択肢を絞る
        let opts = row.options;
        let mirrorWaiting = false;
        if (row.mirrorOf) {
          const srcKey = state.selections[row.mirrorOf] ?? null;
          const srcKind = srcKey ? elementKind(srcKey) : null;
          if (srcKind) {
            const want = srcKind === "fire" ? "tsunami" : "fire";
            opts = row.options.filter((o) => elementKind(o.key) === want);
          } else {
            mirrorWaiting = true;
          }
        }
        const activeOption = activeResultOf(row);
        const isGc = row.id === "gc1" || row.id === "gc2";

        return (
          <div key={row.id} className="rounded-lg border border-[#333] bg-[#1a1a1a] p-2">
            <div className="mb-2 text-sm font-bold text-[#ffcc00]">{row.name}</div>

            {/* 選択ボタン */}
            {mirrorWaiting ? (
              <div className="py-3 text-center text-sm text-[#777]">↑前の行を選択してください</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {opts.map((opt) => {
                  const isActive = activeKey === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      className={`min-h-[52px] cursor-pointer rounded-md border-2 text-base font-bold ${
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

            {/* GC行：雷水/加速マーカーボタン（選択後のみ） */}
            {isGc && activeOption && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {ACCEL_COLS.map(({ col, label }) => {
                  const cell = activeOption.results[col as keyof typeof activeOption.results];
                  if (!cell?.stack) return <div key={col} />;
                  // stack: [加速(i=0), 雷水(i=1)] → 雷水を上に
                  return (
                    <div key={col} className="flex flex-col gap-1">
                      <div className="text-center text-[10px] font-bold text-[#888]">{label}</div>
                      {[1, 0].map((i) => {
                        const s = cell.stack?.[i];
                        if (!s) return null;
                        const id = `${row.id}:${col}:${i}`;
                        const lit = state.marks[id];
                        const dimmed = state.dimmedMarks[id] && !lit;
                        const isRaisui = i === 1;
                        return (
                          <button
                            key={id}
                            type="button"
                            className={`min-h-[44px] cursor-pointer rounded-md border-2 text-sm font-bold ${
                              dimmed
                                ? "border-[#555] bg-[rgba(255,255,255,0.03)] text-[#777] opacity-60"
                                : lit
                                  ? isRaisui
                                    ? toneClass[s.tone]
                                    : "border-[#3fbf6f] bg-[#3fbf6f] text-white"
                                  : isRaisui
                                    ? `bg-transparent ${outlineTone[s.tone]}`
                                    : "border-[#3fbf6f] bg-[rgba(63,191,111,0.12)] text-[#8fe6ad]"
                            }`}
                            onClick={() => toggleMark(id)}
                          >
                            {s.action}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
