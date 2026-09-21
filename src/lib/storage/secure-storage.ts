import * as SecureStore from 'expo-secure-store';

export async function setSecureItem(key: string, value: string) {
  await SecureStore.setItemAsync(key, value);
}

export function getSecureItem(key: string) {
  return SecureStore.getItemAsync(key);
}

export function removeSecureItem(key: string) {
  return SecureStore.deleteItemAsync(key);
}

export async function setSecureJson<T>(key: string, value: T) {
  await setSecureItem(key, JSON.stringify(value));
}

export async function getSecureJson<T>(key: string): Promise<T | null> {
  const value = await getSecureItem(key);
  return value ? (JSON.parse(value) as T) : null;
}
