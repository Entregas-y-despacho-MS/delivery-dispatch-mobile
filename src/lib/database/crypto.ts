import * as Crypto from 'expo-crypto';
import aesjs from 'aes-js';
import { getSecureItem, setSecureItem } from '@/lib/storage/secure-storage';

const ENCRYPTION_KEY_STORAGE = 'db.local_events.encryption_key';
let cachedKey: Uint8Array | null = null;

/**
 * Obtiene o inicializa la clave de cifrado AES-256 (32 bytes) almacenada de forma segura
 * en Keychain (iOS) o Keystore (Android) mediante SecureStore.
 */
export async function getOrCreateEncryptionKey(): Promise<Uint8Array> {
  if (cachedKey) {
    return cachedKey;
  }

  const existingHex = await getSecureItem(ENCRYPTION_KEY_STORAGE);
  if (existingHex && existingHex.length === 64) {
    cachedKey = aesjs.utils.hex.toBytes(existingHex);
    return cachedKey;
  }

  // Generar nueva clave criptográfica de 256 bits (32 bytes)
  const newKeyBytes = Crypto.getRandomBytes(32);
  const newHex = aesjs.utils.hex.fromBytes(newKeyBytes);
  await setSecureItem(ENCRYPTION_KEY_STORAGE, newHex);

  cachedKey = newKeyBytes;
  return cachedKey;
}

/**
 * Cifra un payload JSON utilizando AES-256-CBC con padding PKCS7 y un IV aleatorio de 16 bytes.
 * Retorna el string formateado como `${iv_hex}:${ciphertext_hex}`.
 */
export async function encryptPayload<T extends object>(data: T): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  const jsonString = JSON.stringify(data);
  const textBytes = aesjs.utils.utf8.toBytes(jsonString);
  const paddedBytes = aesjs.padding.pkcs7.pad(textBytes);

  // Generar IV fresco de 16 bytes para cada operación de cifrado
  const iv = Crypto.getRandomBytes(16);
  // eslint-disable-next-line new-cap
  const aesCbc = new aesjs.ModeOfOperation.cbc(key, iv);
  const encryptedBytes = aesCbc.encrypt(paddedBytes);

  const ivHex = aesjs.utils.hex.fromBytes(iv);
  const cipherHex = aesjs.utils.hex.fromBytes(encryptedBytes);

  return `${ivHex}:${cipherHex}`;
}

/**
 * Descifra una cadena `${iv_hex}:${ciphertext_hex}` y deserializa el objeto JSON original.
 */
export async function decryptPayload<T = unknown>(encryptedString: string): Promise<T> {
  const [ivHex, cipherHex] = encryptedString.split(':');
  if (!ivHex || !cipherHex) {
    throw new Error('Formato de payload cifrado inválido');
  }

  const key = await getOrCreateEncryptionKey();
  const iv = aesjs.utils.hex.toBytes(ivHex);
  const encryptedBytes = aesjs.utils.hex.toBytes(cipherHex);

  // eslint-disable-next-line new-cap
  const aesCbc = new aesjs.ModeOfOperation.cbc(key, iv);
  const decryptedBytes = aesCbc.decrypt(encryptedBytes);
  const unpaddedBytes = aesjs.padding.pkcs7.strip(decryptedBytes);
  const jsonString = aesjs.utils.utf8.fromBytes(unpaddedBytes);

  return JSON.parse(jsonString) as T;
}
