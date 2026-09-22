import * as SQLite from 'expo-sqlite';
import { runMigrations } from './schema';
import { getOrCreateEncryptionKey } from './crypto';

const DB_NAME = 'delivery_dispatch_local.db';
let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Inicializa la conexión SQLite, modo WAL para concurrencia off-UI-thread,
 * la clave de cifrado en SecureStore y las migraciones del esquema.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    // 1. Abrir base de datos SQLite asíncrona
    const db = await SQLite.openDatabaseAsync(DB_NAME);

    // 2. Optimización de rendimiento y concurrencia (WAL mode)
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // 3. Inicializar clave de cifrado en hardware seguro si no existe
    await getOrCreateEncryptionKey();

    // 4. Ejecutar migraciones DDL
    await runMigrations(db);

    dbInstance = db;
    return db;
  })();

  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
}

/**
 * Obtiene la instancia activa de la base de datos local SQLite.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    throw new Error(
      'La base de datos local no ha sido inicializada. Llama a initDatabase() antes de usar el repositorio.'
    );
  }
  return dbInstance;
}

/**
 * Cierra la conexión de base de datos activa (útil para tests o reset de sesión).
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}
