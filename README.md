# Despachos Mobile

Starter kit móvil para el microservicio de Gestión de Entregas y Despachos.

## Alcance del móvil

Este repositorio contiene únicamente los cimientos técnicos. No incluye lógica de negocio, modelos de pedidos, autenticación real, estados, incidencias, GPS, pagos ni datos mock. El portal del cliente y el panel administrativo quedan fuera de este proyecto móvil.

## Arquitectura

La base usa Expo + React Native + TypeScript + Expo Router. La organización es por funcionalidad, con una capa de componentes compartidos y servicios de infraestructura:

```text
app/                         # Rutas y navegación (Expo Router)
src/
  components/ui/             # Primitivas visuales reutilizables
  config/                    # Configuración y entorno
  features/                  # Espacio reservado para futuros módulos
  hooks/                     # Hooks transversales
  lib/                       # HTTP, almacenamiento, sincronización, query
  theme/                     # Tokens de diseño
  types/                     # Contratos de dominio
```

## Inicio

```bash
npm install
npm run start
```

Para validar TypeScript:

```bash
npm run typecheck
```

La app inicia en un shell navegable sin datos ni lógica de negocio. Para conectar el backend, define `EXPO_PUBLIC_API_URL` y agrega módulos dentro de `src/features`; la infraestructura compartida y las rutas pueden mantenerse sin cambios.

## Decisiones base

- `TanStack Query` para estado remoto, caché e invalidación.
- `SecureStore` y AsyncStorage encapsulados como infraestructura reutilizable.
- `SQLite` embebido (`expo-sqlite` en modo WAL) con cifrado AES-256-CBC de payloads y UUID v7 para persistencia offline (ST-79.1).
- `SyncService` con detección reactiva de red (`NetInfo`), cola secuencial FIFO y reintentos con backoff exponencial y jitter (ST-79.2).
- Cliente HTTP (`apiClient`) preparado para inyección de token sin conocer autenticación.
- Expo Router con shell de autenticación, tabs y rutas dinámicas.
- `NativeWind` v4 configurado para usar clases Tailwind en componentes React Native.

## Estilos

Los componentes compartidos aceptan clases Tailwind mediante `className`:

```tsx
<View className="flex-1 bg-canvas p-4">
  <Text className="text-xl font-bold text-ink">Título</Text>
</View>
```

La configuración está en `tailwind.config.js`, `metro.config.js`, `global.css` y `nativewind-env.d.ts`.

Para conocer la estructura completa, las responsabilidades de cada carpeta y las reglas para trabajar con agentes, consulta [MOBILE_ARCHITECTURE.md](./MOBILE_ARCHITECTURE.md).
- Componentes de UI con tokens centralizados para evitar estilos repetidos.
