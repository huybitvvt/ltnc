import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

// Hermes does not need a TextEncoder polyfill for this small UTF-8 conversion.
const utf8Bytes = (text: string) => Uint8Array.from(encodeURIComponent(text).match(/%[0-9A-F]{2}|./g) || [],
  part => part.startsWith('%') ? parseInt(part.slice(1), 16) : part.charCodeAt(0));

export interface CommandStorage {
  get(key: string): string | null | Promise<string | null>;
  set(key: string, value: string): void | Promise<void>;
  remove(key: string): void | Promise<void>;
}
export function createPendingCommands(storage: CommandStorage) {
  let actor: string | null = null;
  const pending = new Map<string, Promise<string>>();
  return {
    setActor(id: string | null) { actor = id; pending.clear(); },
    async acquire(url: string, payload: unknown) {
      if (!actor) throw new Error('Chưa xác định tài khoản cho thao tác tài chính');
      const body = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
      const digest = bytesToHex(sha256(utf8Bytes(url + ':' + body)));
      const storageKey = `trohub_cmd_${actor}_${digest}`;
      let promise = pending.get(storageKey);
      if (!promise) {
        promise = (async () => {
          const saved = await storage.get(storageKey);
          if (saved) return saved;
          const key = `cmd-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
          await storage.set(storageKey, key);
          return key;
        })();
        pending.set(storageKey, promise);
        promise.catch(() => pending.delete(storageKey));
      }
      return { key: await promise, storageKey };
    },
    async release(storageKey?: string) {
      if (!storageKey) return;
      await storage.remove(storageKey);
      pending.delete(storageKey);
    },
  };
}
