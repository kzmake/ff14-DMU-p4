"use client";

import { useCallback, useRef, useState } from "react";
import {
  accelLabel,
  type BoardState,
  type GcKey,
  INITIAL_BOARD_STATE,
  raisuiLabel,
  raisuiTone,
  type Side,
} from "@/lib/p4rules";
import { useShareConnection } from "@/lib/useShareConnection";

function makeClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `c-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

const onBlue = "bg-[#7398c4] text-white border-[#5f86b5]";
const onRed = "bg-[#c2705e] text-white border-[#b3604e]";
const onGreen = "bg-transparent text-[#7f9f76] border-[#7f9f76]";
const offBtn = "bg-[#30302e] text-[#c2bfb4] border-[#46443f]";

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

  const setChoice = (key: "gc1" | "gc2" | "fire" | "tsunami", v: "honto" | "uso") =>
    commit({ ...state, [key]: state[key] === v ? null : v });
  const setSankai = (v: Side) => commit({ ...state, sankai: state.sankai === v ? null : v });
  const setAccel = (key: string) => commit({ ...state, accel: state.accel === key ? null : key });

  const Btn = ({
    label,
    sub,
    onClass,
    active,
    onClick,
  }: {
    label: string;
    sub?: string;
    onClass: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[72px] cursor-pointer items-center justify-center gap-2 rounded-lg border-2 text-2xl font-bold ${
        active ? onClass : offBtn
      }`}
    >
      {sub && (
        <b className="inline-flex h-[1.6em] min-w-[1.6em] items-center justify-center rounded-md bg-[#c96442] text-xl font-black text-[#262624]">
          {sub}
        </b>
      )}
      <span>{label}</span>
    </button>
  );

  const accelBtn = (gc: GcKey, side: Side) => {
    const key = `${gc}:${side}`;
    return (
      <Btn
        sub={side === "early" ? "早" : "遅"}
        label={state[gc] ? accelLabel(state, gc) : "止まる"}
        onClass={onGreen}
        active={state.accel === key}
        onClick={() => setAccel(key)}
      />
    );
  };

  const sankaiBtn = (side: Side) => {
    const tone = state.gc1 ? raisuiTone(state, "gc1") : "blue";
    return (
      <Btn
        sub={side === "early" ? "早" : "遅"}
        label={state.gc1 ? raisuiLabel(state, "gc1") : "雷水"}
        onClass={tone === "red" ? onRed : onBlue}
        active={state.sankai === side}
        onClick={() => setSankai(side)}
      />
    );
  };

  const hontoUso = (key: "gc1" | "gc2" | "fire" | "tsunami") => (
    <div className="grid grid-cols-2 gap-2">
      <Btn
        label="ホント"
        onClass={onBlue}
        active={state[key] === "honto"}
        onClick={() => setChoice(key, "honto")}
      />
      <Btn
        label="ウソ"
        onClass={onRed}
        active={state[key] === "uso"}
        onClick={() => setChoice(key, "uso")}
      />
    </div>
  );

  const Section = ({ name, children }: { name: string; children: React.ReactNode }) => (
    <div className="flex items-stretch gap-2">
      <div className="flex w-10 shrink-0 items-center justify-center text-lg font-bold text-[#c96442]">
        {name}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">{children}</div>
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-3 p-1">
      <div
        title={connected ? "同期中" : "未接続"}
        className={`h-[3px] w-full rounded-full ${connected ? "bg-[#7f9f76]" : "bg-[#54524c]"}`}
      />

      <Section name="GC1">{hontoUso("gc1")}</Section>
      <Section name="加速">
        <div className="grid grid-cols-2 gap-2">
          {accelBtn("gc1", "early")}
          {accelBtn("gc1", "late")}
        </div>
      </Section>
      <Section name="雷水">
        <div className="grid grid-cols-2 gap-2">
          {sankaiBtn("early")}
          {sankaiBtn("late")}
        </div>
      </Section>

      <Section name="GC2">{hontoUso("gc2")}</Section>
      <Section name="加速">
        <div className="grid grid-cols-2 gap-2">
          {accelBtn("gc2", "early")}
          {accelBtn("gc2", "late")}
        </div>
      </Section>

      <Section name="🔥">{hontoUso("fire")}</Section>
      <Section name="🌊">{hontoUso("tsunami")}</Section>
    </div>
  );
}
