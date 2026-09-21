# Mapa de implementación móvil

## Stack y convenciones

- Expo + React Native + TypeScript.
- Expo Router para navegación basada en archivos.
- NativeWind v4 para clases Tailwind en componentes React Native.
- TanStack Query para estado remoto cuando se incorpore un módulo.
- Axios como cliente HTTP genérico.
- SecureStore y AsyncStorage encapsulados en `src/lib/storage`.
- `src/theme/tokens.ts` y `tailwind.config.js` como fuentes de tokens visuales.

## Rutas relevantes

- `app/_layout.tsx`: providers globales e import de `global.css`.
- `app/index.tsx`: entrada inicial.
- `app/(auth)/`: shell de acceso.
- `app/(app)/_layout.tsx`: shell autenticado o de aplicación.
- `app/(app)/(tabs)/`: destinos principales de navegación.
- `app/(app)/<modulo>/[id].tsx`: rutas dinámicas de detalle o formulario.

## Componentes y estilos

- `src/components/ui/`: primitives shared de la aplicación.
- `src/theme/tokens.ts`: tokens consumibles desde TypeScript.
- `global.css`: capas Tailwind.
- `tailwind.config.js`: contenido, preset NativeWind y tokens de clase.
- `babel.config.js`: `jsxImportSource` y preset de NativeWind.
- `metro.config.js`: `withNativeWind` y entrada CSS.
- `nativewind-env.d.ts`: tipos de `className`.

## Separación de responsabilidades

- `app/` compone navegación y presentación de rutas.
- `src/components/ui/` no conoce entidades ni reglas del dominio.
- `src/lib/` contiene infraestructura genérica y no debe decidir estados de negocio.
- `src/features/` queda reservado para módulos futuros; allí viven API, hooks, esquemas y componentes específicos.
- La skill de diseño no autoriza agregar autenticación, datos mock, endpoints, permisos de usuario, GPS o reglas operativas.

## Verificación

Después de cambiar estilos globales, NativeWind, rutas o primitives:

1. Ejecuta `npm run typecheck`.
2. Ejecuta `EXPO_NO_TELEMETRY=1 npx expo export --platform android`.
3. Ejecuta `EXPO_NO_TELEMETRY=1 npx expo export --platform ios`.
4. Revisa la pantalla en 320–390 px, teclado abierto y safe areas.
5. Si se usa web, verifica también `web.bundler: "metro"` y el bundle web por separado.

No afirmes que una pantalla fue revisada visualmente en dispositivo si solo se ejecutó el bundle. Distingue entre validación de tipos, bundle y revisión manual.
