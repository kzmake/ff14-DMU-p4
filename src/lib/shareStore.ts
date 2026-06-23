// 共有コードごとの盤面状態を保持する。
// Vercel KV(Upstash Redis) があればそれを使い、複数インスタンス間で共有する。
// KV の環境変数が無い場合（ローカル等）はプロセス内メモリにフォールバックする。
import { Redis } from "@upstash/redis";
import { type BoardState, INITIAL_BOARD_STATE } from "@/lib/boardState";

export type RoomSnapshot = { state: BoardState; rev: number; origin: string | null };

// KV レコード（1コード=1JSON）。
const KEY = (code: string) => `share:${code}`;
// アイドル破棄まで（KVのTTL）。アクセスのたびに延長する。
const TTL_SECONDS = 60 * 60; // 1時間

// Upstash Redis クライアント（環境変数があれば生成）。
// Vercel KV 統合は KV_REST_API_URL / KV_REST_API_TOKEN を、
// Upstash 直は UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN を提供する。
function makeRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const g = globalThis as unknown as {
  __shareRedis?: Redis | null;
  __shareMem?: Map<string, RoomSnapshot>;
};
const redis: Redis | null = g.__shareRedis ?? (g.__shareRedis = makeRedis());
// KV が無いときのメモリフォールバック
const mem: Map<string, RoomSnapshot> = g.__shareMem ?? (g.__shareMem = new Map());

export const usingKV = redis !== null;

// 現在の状態とリビジョンを取得（無ければ初期状態）。
export async function getState(code: string): Promise<RoomSnapshot> {
  if (redis) {
    const data = await redis.get<RoomSnapshot>(KEY(code));
    if (data) {
      // アクセスで TTL 延長
      await redis.expire(KEY(code), TTL_SECONDS);
      return data;
    }
    return { state: { ...INITIAL_BOARD_STATE }, rev: 0, origin: null };
  }
  return mem.get(code) ?? { state: { ...INITIAL_BOARD_STATE }, rev: 0, origin: null };
}

// 状態を更新し、新しい rev を返す。origin は更新元クライアントID（エコー判定用）。
export async function setState(
  code: string,
  state: BoardState,
  origin: string | null,
): Promise<number> {
  const prev = await getState(code);
  const next: RoomSnapshot = { state, rev: prev.rev + 1, origin };
  if (redis) {
    await redis.set(KEY(code), next, { ex: TTL_SECONDS });
  } else {
    mem.set(code, next);
  }
  return next.rev;
}

// keepalive: 生存延長（KVはTTL延長、メモリは何もしない）。
export async function touch(code: string): Promise<void> {
  if (redis) {
    // キーが無ければ作らない（存在時のみ延長）
    await redis.expire(KEY(code), TTL_SECONDS);
  }
}
