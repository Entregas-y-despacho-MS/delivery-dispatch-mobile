import AsyncStorage from '@react-native-async-storage/async-storage';

export async function setStoredJson<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function getStoredJson<T>(key: string): Promise<T | null> {
  const value = await AsyncStorage.getItem(key);
  return value ? (JSON.parse(value) as T) : null;
}

export function removeStoredItem(key: string) {
  return AsyncStorage.removeItem(key);
}
