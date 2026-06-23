// 共有・同期する盤面の状態の型と初期値。
// クライアント/サーバー両方から import するため "use client" を付けない独立モジュール。

export type BoardState = {
  selections: Record<string, string | null>;
  marks: Record<string, boolean>;
  dimmedMarks: Record<string, boolean>;
  showPersonal: boolean;
  showTimeline: boolean;
  showCharge: boolean;
};

export const INITIAL_BOARD_STATE: BoardState = {
  selections: {},
  marks: {},
  dimmedMarks: {},
  showPersonal: true,
  showTimeline: true,
  showCharge: true,
};
