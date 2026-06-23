// 共有コードごとの盤面状態をプロセス内メモリで保持し、SSE購読者へ配信する。
// 注意: インメモリなのでサーバー再起動・複数インスタンスでは共有されない。
import { type BoardState, INITIAL_BOARD_STATE } from "@/lib/boardState";

type Subscriber = (payload: { state: BoardState; rev: number; origin: string | null }) => void;

type Room = {
  state: BoardState;
  rev: number; // 単調増加。更新のたびに +1。
  subscribers: Set<Subscriber>;
};

// HMR/モジュール再評価でも状態が消えないよう globalThis に保持する。
const g = globalThis as unknown as { __shareRooms?: Map<string, Room> };
const rooms: Map<string, Room> = g.__shareRooms ?? (g.__shareRooms = new Map());

function getRoom(code: string): Room {
  let room = rooms.get(code);
  if (!room) {
    room = { state: { ...INITIAL_BOARD_STATE }, rev: 0, subscribers: new Set() };
    rooms.set(code, room);
  }
  return room;
}

// 現在の状態とリビジョンを取得（部屋が無ければ初期状態で作成）。
export function getState(code: string): { state: BoardState; rev: number } {
  const room = getRoom(code);
  return { state: room.state, rev: room.rev };
}

// 状態を更新し、購読者へ配信。origin は更新元のクライアントID（エコー判定用）。
export function setState(code: string, state: BoardState, origin: string | null): number {
  const room = getRoom(code);
  room.state = state;
  room.rev += 1;
  const payload = { state: room.state, rev: room.rev, origin };
  for (const sub of room.subscribers) {
    try {
      sub(payload);
    } catch {
      // 配信失敗した購読者は無視（close 済みなど）
    }
  }
  return room.rev;
}

// 購読を登録。戻り値を呼ぶと解除。
export function subscribe(code: string, sub: Subscriber): () => void {
  const room = getRoom(code);
  room.subscribers.add(sub);
  return () => {
    room.subscribers.delete(sub);
  };
}
