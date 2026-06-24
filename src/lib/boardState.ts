// 共有・同期する盤面の状態。実体は p4rules.ts（ルールの唯一の実装）に集約。
// 既存の import パス（@/lib/boardState）を保つための再エクスポート。
export { type BoardState, INITIAL_BOARD_STATE } from "@/lib/p4rules";
