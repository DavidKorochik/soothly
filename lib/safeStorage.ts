// Web storage that never throws. Access can throw a SecurityError (Safari Private mode, disabled
// cookies, locked-down in-app webviews) and an unguarded call there crashes the whole page. Here it
// degrades to in-memory: dismissals and interview resume just don't persist across reloads.
function guarded(store: () => Storage) {
  return {
    get(key: string): string | null {
      try {
        return store().getItem(key);
      } catch {
        return null;
      }
    },
    set(key: string, value: string): void {
      try {
        store().setItem(key, value);
      } catch {
        // storage unavailable or full — nothing to persist; the app keeps running in memory
      }
    },
    remove(key: string): void {
      try {
        store().removeItem(key);
      } catch {
        // storage unavailable — nothing to clear
      }
    },
  };
}

export const safeStorage = guarded(() => window.localStorage);
export const safeSessionStorage = guarded(() => window.sessionStorage);
