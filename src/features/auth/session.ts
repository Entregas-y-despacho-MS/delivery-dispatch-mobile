import { useSyncExternalStore } from 'react';
import { getSecureJson, removeSecureItem, setSecureJson } from '@/lib/storage/secure-storage';

const SESSION_KEY = 'flash-pack.auth.tokens.v1';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

let tokens: SessionTokens | null = null;
let status: SessionStatus = 'loading';
let generation = 0;
const listeners = new Set<() => void>();

function publish(next: SessionStatus) {
  status = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSessionStatus() {
  return status;
}

export function useSessionStatus() {
  return useSyncExternalStore(subscribe, getSessionStatus, getSessionStatus);
}

export function getSessionTokens() {
  return tokens;
}

export function getSessionGeneration() {
  return generation;
}

function isSessionTokens(value: unknown): value is SessionTokens {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SessionTokens>;
  return typeof candidate.accessToken === 'string' && candidate.accessToken.length > 0
    && typeof candidate.refreshToken === 'string' && candidate.refreshToken.length > 0;
}

export async function restoreSessionTokens(): Promise<SessionTokens | null> {
  try {
    const stored = await getSecureJson<unknown>(SESSION_KEY);
    if (isSessionTokens(stored)) {
      tokens = stored;
      return stored;
    }
    if (stored !== null) await removeSecureItem(SESSION_KEY);
  } catch {
    // Missing, invalid, or inaccessible secure storage should not trap the app on the splash screen.
  }
  tokens = null;
  return null;
}

export function finishSessionRestore() {
  publish(tokens ? 'authenticated' : 'unauthenticated');
}

export async function saveSessionTokens(next: SessionTokens, isNewSession = false) {
  await setSecureJson(SESSION_KEY, next);
  if (isNewSession) generation += 1;
  tokens = next;
  publish('authenticated');
}

export async function clearSessionTokens() {
  generation += 1;
  tokens = null;
  publish('unauthenticated');
  await removeSecureItem(SESSION_KEY);
}
