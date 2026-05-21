const STORAGE_KEY = "catalog_session_id";

/** Anonymous session id stored in localStorage (UUID). */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}
