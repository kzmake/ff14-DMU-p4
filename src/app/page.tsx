"use client";

import { useState } from "react";
import Board, { type BoardState, INITIAL_BOARD_STATE } from "@/components/Board";

export default function Home() {
  const [state, setState] = useState<BoardState>(INITIAL_BOARD_STATE);
  return <Board state={state} onChange={setState} />;
}
