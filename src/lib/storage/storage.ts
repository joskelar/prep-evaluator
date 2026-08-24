import { ExamSession, SessionSnapshot, SessionResult } from '@/types';
import { checkSessionExpiration } from '@/lib/session/sessionOperations';

const STORAGE_VERSION = 1;
const SESSION_PREFIX = 'prep_evaluator_session_';
const ACTIVE_SESSION_ID_KEY = 'prep_evaluator_active_session_id';
const RESULT_PREFIX = 'prep_evaluator_result_';

// Environment-agnostic storage provider fallback
const getStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch (e) {
    // Ignore and fallback
  }

  // Fallback in-memory storage for non-browser/unit tests
  const memStorage: Record<string, string> = {};
  return {
    getItem: (key: string) => memStorage[key] || null,
    setItem: (key: string, value: string) => { memStorage[key] = value; },
    removeItem: (key: string) => { delete memStorage[key]; },
    clear: () => { for (const k in memStorage) delete memStorage[k]; },
    get length() { return Object.keys(memStorage).length; },
    key: (i: number) => Object.keys(memStorage)[i] || null
  };
};

const storage = getStorage();

/**
 * Saves a session to local storage.
 */
export function saveSession(session: ExamSession): void {
  try {
    const snapshot: SessionSnapshot = {
      version: STORAGE_VERSION,
      session
    };
    storage.setItem(`${SESSION_PREFIX}${session.id}`, JSON.stringify(snapshot));
    
    // If it's active, update the active session pointer
    if (session.status === 'active') {
      storage.setItem(ACTIVE_SESSION_ID_KEY, session.id);
    }
  } catch (err) {
    console.error('Failed to save session to localStorage:', err);
  }
}

/**
 * Loads a session by ID from local storage.
 */
export function loadSession(sessionId: string): ExamSession | null {
  try {
    const data = storage.getItem(`${SESSION_PREFIX}${sessionId}`);
    if (!data) return null;

    const snapshot = JSON.parse(data) as SessionSnapshot;
    
    // Version compatibility check
    if (snapshot.version !== STORAGE_VERSION || !snapshot.session) {
      console.warn(`Incompatible session version ${snapshot.version} found. Failing safely.`);
      return null;
    }

    const session = snapshot.session;
    // Check if session has expired since it was last saved
    const now = Date.now();
    const updatedSession = checkSessionExpiration(session, now);
    
    if (updatedSession.status !== session.status) {
      saveSession(updatedSession);
    }

    return updatedSession;
  } catch (err) {
    console.error(`Failed to load session ${sessionId} from localStorage:`, err);
    return null;
  }
}

/**
 * Loads the active session, if any.
 */
export function loadActiveSession(): ExamSession | null {
  const activeId = storage.getItem(ACTIVE_SESSION_ID_KEY);
  if (!activeId) return null;

  const session = loadSession(activeId);
  if (!session || session.status !== 'active') {
    // If session is no longer active, clear the active pointer
    storage.removeItem(ACTIVE_SESSION_ID_KEY);
    return null;
  }

  return session;
}

/**
 * Deletes a specific session.
 */
export function deleteSession(sessionId: string): void {
  try {
    storage.removeItem(`${SESSION_PREFIX}${sessionId}`);
    const activeId = storage.getItem(ACTIVE_SESSION_ID_KEY);
    if (activeId === sessionId) {
      storage.removeItem(ACTIVE_SESSION_ID_KEY);
    }
  } catch (err) {
    console.error(`Failed to delete session ${sessionId} from localStorage:`, err);
  }
}

/**
 * Clears all completed or expired sessions from localStorage.
 */
export function clearCompletedSessions(): void {
  try {
    const keysToRemove: string[] = [];
    const activeId = storage.getItem(ACTIVE_SESSION_ID_KEY);

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(SESSION_PREFIX)) {
        const id = key.substring(SESSION_PREFIX.length);
        const session = loadSession(id);
        if (session && (session.status === 'completed' || session.status === 'expired')) {
          keysToRemove.push(key);
          if (activeId === id) {
            storage.removeItem(ACTIVE_SESSION_ID_KEY);
          }
        }
      }
    }

    keysToRemove.forEach(key => storage.removeItem(key));
  } catch (err) {
    console.error('Failed to clear completed sessions from localStorage:', err);
  }
}

/**
 * Saves a completed session result to storage.
 */
export function saveLatestCompletedResult(result: SessionResult): void {
  try {
    storage.setItem(`${RESULT_PREFIX}${result.sessionId}`, JSON.stringify(result));
  } catch (err) {
    console.error('Failed to save completed result:', err);
  }
}

/**
 * Loads a completed session result by session ID.
 */
export function loadLatestCompletedResult(sessionId: string): SessionResult | null {
  try {
    const data = storage.getItem(`${RESULT_PREFIX}${sessionId}`);
    if (!data) return null;
    return JSON.parse(data) as SessionResult;
  } catch (err) {
    console.error(`Failed to load completed result for ${sessionId}:`, err);
    return null;
  }
}
