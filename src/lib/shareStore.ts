// 共有コードごとの盤面状態を Vercel KV(Upstash Redis) に保持する。
// 複数インスタンス間で共有するため、KV は必須（メモリフォールバックは無し）。
import { Redis } from "@upstash/redis";
import { type BoardState, INITIAL_BOARD_STATE } from "@/lib/boardState";

export type RoomSnapshot = { state: BoardState; rev: number; origin: string | null };

// KV レコード（1コード=1JSON）。
const KEY = (code: string) => `share:${code}`;
// アイドル破棄まで（KVのTTL）。アクセスのたびに延長する。
const TTL_SECONDS = 60 * 60; // 1時間

// Upstash Redis クライアント。
// Vercel KV 統合は KV_REST_API_URL / KV_REST_API_TOKEN を、
// Upstash 直は UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN を提供する。
function makeRedis(): Redis {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "KV is not configured: set KV_REST_API_URL/KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN)",
    );
  }
  return new Redis({ url, token });
}

// 遅延初期化（モジュール読み込み時ではなく初回アクセス時に生成）。
// ビルドのデータ収集フェーズで KV 未設定でも throw しないようにするため。
const g = globalThis as unknown as { __shareRedis?: Redis };
function getRedis(): Redis {
  if (!g.__shareRedis) g.__shareRedis = makeRedis();
  return g.__shareRedis;
}

const EMPTY = (): RoomSnapshot => ({ state: { ...INITIAL_BOARD_STATE }, rev: 0, origin: null });

// KV から読んだ値を RoomSnapshot に正規化（文字列で返ることがあるため両対応）。
function parseSnapshot(raw: unknown): RoomSnapshot | null {
  if (raw == null) return null;
  let obj: unknown = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof obj !== "object" || obj === null) return null;
  const o = obj as Partial<RoomSnapshot>;
  if (typeof o.rev !== "number" || typeof o.state !== "object" || o.state === null) return null;
  return { state: o.state as BoardState, rev: o.rev, origin: o.origin ?? null };
}

// 現在の状態とリビジョンを取得（無ければ初期状態）。
export async function getState(code: string): Promise<RoomSnapshot> {
  const raw = await getRedis().get(KEY(code));
  const snap = parseSnapshot(raw);
  if (snap) {
    await getRedis().expire(KEY(code), TTL_SECONDS); // アクセスで TTL 延長
    return snap;
  }
  return EMPTY();
}

// 状態を更新し、新しい rev を返す。origin は更新元クライアントID（エコー判定用）。
export async function setState(
  code: string,
  state: BoardState,
  origin: string | null,
): Promise<number> {
  const prev = await getState(code);
  const next: RoomSnapshot = { state, rev: prev.rev + 1, origin };
  // JSON 文字列で保存（read 側は parseSnapshot で両対応）。
  await getRedis().set(KEY(code), JSON.stringify(next), { ex: TTL_SECONDS });
  return next.rev;
}

// keepalive: 生存延長（キーが存在するときのみ TTL を延長）。
export async function touch(code: string): Promise<void> {
  await getRedis().expire(KEY(code), TTL_SECONDS);
}
