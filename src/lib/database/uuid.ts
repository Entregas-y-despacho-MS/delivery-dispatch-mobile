import * as Crypto from 'expo-crypto';

/**
 * Generador de UUID v7 (RFC 9562).
 * Estructura de 128 bits:
 * - 48 bits: timestamp en milisegundos desde epoch Unix (orden temporal)
 * - 4 bits: versión (0b0111 = 7)
 * - 12 bits: aleatorio A
 * - 2 bits: variante (0b10)
 * - 62 bits: aleatorio B
 *
 * Ventaja: índices B-Tree secuenciales sin fragmentación en PostgreSQL/SQLite
 * y generación segura offline en el dispositivo móvil.
 */
export function generateUUIDv7(): string {
  const bytes = Crypto.getRandomBytes(16);
  const now = Date.now();

  // 48 bits de timestamp
  bytes[0] = (now / 0x10000000000) & 0xff;
  bytes[1] = (now / 0x100000000) & 0xff;
  bytes[2] = (now / 0x1000000) & 0xff;
  bytes[3] = (now / 0x10000) & 0xff;
  bytes[4] = (now / 0x100) & 0xff;
  bytes[5] = now & 0xff;

  // Versión 7 en los 4 bits más significativos del byte 6
  bytes[6] = (bytes[6] & 0x0f) | 0x70;

  // Variante RFC 9562 (10xx) en los 2 bits más significativos del byte 8
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  // Convertir a string hexadecimal con formato estándar 8-4-4-4-12
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
