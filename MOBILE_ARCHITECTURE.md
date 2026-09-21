# Delivery Dispatch Mobile

Guía de arquitectura, estructura y reglas de trabajo para la aplicación móvil.

## 1. Propósito del proyecto

Este repositorio es el starter kit móvil de Delivery Dispatch. Está construido con:

- Expo SDK 52.
- React Native.
- TypeScript.
- Expo Router.
- NativeWind v4 para estilos Tailwind en React Native.
- TanStack Query, Axios, SecureStore y AsyncStorage como infraestructura preparada.

La base intencionalmente no contiene lógica de negocio. No hay autenticación real, pedidos, estados de entrega, incidencias, GPS, pagos, datos mock ni llamadas a endpoints del dominio. Las pantallas actuales son shells y placeholders para que los módulos puedan agregarse después sin rehacer la arquitectura.

## 2. Regla principal para cualquier agente

Antes de modificar una pantalla, componente o estilo, el agente debe leer primero:

```text
.agents/skills/delivery-dispatch-mobile-design/SKILL.md
```

Después debe leer únicamente las referencias necesarias para la tarea:

```text
.agents/skills/delivery-dispatch-mobile-design/references/visual-language.md
.agents/skills/delivery-dispatch-mobile-design/references/component-patterns.md
.agents/skills/delivery-dispatch-mobile-design/references/implementation-map.md
```

El flujo obligatorio para agentes es:

1. Leer `delivery-dispatch-mobile-design/SKILL.md`.
2. Identificar si el cambio es visual, de navegación, de infraestructura o de dominio.
3. Revisar la ruta y los componentes shared existentes.
4. Reutilizar `src/components/ui` antes de crear nuevos componentes.
5. Mantener la separación entre UI e infraestructura.
6. No agregar lógica de negocio cuando la tarea sea solo de diseño o estructura.
7. Ejecutar las validaciones correspondientes antes de terminar.

Prompt recomendado para compañeros:

```text
Antes de trabajar en la app móvil, lee obligatoriamente:
.agents/skills/delivery-dispatch-mobile-design/SKILL.md
Luego inspecciona los archivos relacionados y respeta sus referencias visuales,
de componentes, NativeWind, accesibilidad y compatibilidad Android/iOS.
No agregues lógica de negocio si no fue solicitada explícitamente.
```

## 3. Estructura general

```text
delivery-dispatch-mobile/
├── app/                              # Rutas y navegación de Expo Router
│   ├── _layout.tsx                   # Providers globales e import de NativeWind
│   ├── index.tsx                     # Entrada inicial de la aplicación
│   ├── (auth)/                       # Grupo visual de autenticación
│   │   ├── _layout.tsx               # Stack de autenticación
│   │   └── login.tsx                 # Shell visual de acceso, sin auth real
│   └── (app)/                        # Shell principal de la aplicación
│       ├── _layout.tsx               # Stack principal
│       ├── (tabs)/                   # Navegación principal por tabs
│       │   ├── _layout.tsx           # Configuración de tabs
│       │   ├── index.tsx             # Shell de inicio
│       │   ├── history.tsx           # Placeholder de historial
│       │   └── profile.tsx           # Placeholder de perfil
│       ├── delivery/[id].tsx         # Route dinámico de detalle, sin dominio
│       └── incident/[id].tsx         # Route dinámico de formulario, sin dominio
├── src/
│   ├── components/ui/                # Primitivas visuales reutilizables
│   ├── config/                       # Configuración de entorno
│   ├── features/                     # Espacio reservado para futuros módulos
│   ├── lib/                          # Infraestructura transversal
│   ├── theme/                        # Tokens de diseño TypeScript
│   └── types/                        # Tipos genéricos compartidos
├── .agents/skills/                   # Reglas locales para agentes
├── app.json                          # Configuración Expo y capacidades nativas
├── babel.config.js                   # Babel + NativeWind
├── metro.config.js                   # Metro + NativeWind
├── global.css                        # Capas Tailwind
├── tailwind.config.js                # Tokens y archivos escaneados por Tailwind
├── nativewind-env.d.ts               # Tipos para className
├── tsconfig.json                     # TypeScript y alias @/*
├── package.json                      # Scripts y dependencias
├── package-lock.json                 # Versiones instaladas reproducibles
└── README.md                         # Resumen rápido del proyecto
```

## 4. Carpeta `app/`: navegación

Expo Router transforma los archivos de `app/` en rutas. Las carpetas entre paréntesis son grupos visuales: organizan layouts y navegación, pero no forman parte de la URL.

### `app/_layout.tsx`

Es el layout raíz. Configura `QueryClientProvider`, importa `global.css` y monta el `Stack` raíz. No debe contener reglas de dominio ni resolver autenticación.

### `app/index.tsx`

Es la entrada de la app. Actualmente redirige al shell de acceso para que la navegación pueda probarse sin implementar login real.

### `app/(auth)/`

Contiene el flujo visual de acceso.

- `_layout.tsx`: configura el Stack del grupo de autenticación.
- `login.tsx`: muestra campos y navega al shell principal. El botón solo prueba navegación; no valida credenciales ni guarda sesión.

### `app/(app)/`

Contiene el shell principal.

- `_layout.tsx`: configura el Stack de la app.
- `(tabs)/_layout.tsx`: define los destinos principales y sus iconos.
- `(tabs)/index.tsx`: pantalla inicial de shell.
- `(tabs)/history.tsx`: placeholder para un futuro módulo de historial.
- `(tabs)/profile.tsx`: placeholder para un futuro módulo de perfil.
- `delivery/[id].tsx`: ejemplo de route dinámico con parámetro `id`.
- `incident/[id].tsx`: ejemplo de route dinámico para un futuro formulario.

Las rutas dinámicas solo reciben parámetros de navegación. No deben cargar entidades, cambiar estados ni inventar datos hasta que exista su feature correspondiente.

## 5. Carpeta `src/components/ui/`: shared visual

Estos componentes no conocen pedidos, usuarios, entregas ni reglas del dominio. Reciben props visuales y deben poder reutilizarse en cualquier módulo.

### `AppText.tsx`

Texto tipado por variantes: `title`, `heading`, `body`, `caption` y `label`. Usa clases NativeWind semánticas y acepta `style` o `className` adicional.

### `Card.tsx`

Superficie reutilizable con borde, radio y padding base. Úsala para agrupar información; evita anidar tarjetas sin necesidad.

### `Divider.tsx`

Separador horizontal para dividir grupos de contenido sin repetir estilos.

### `IconButton.tsx`

Control icon-only con área táctil aproximada de 44 × 44 px. Siempre debe recibir `accessibilityLabel`.

### `PrimaryButton.tsx`

Botón base con variantes `primary`, `secondary` y `danger`, estado de carga y estado deshabilitado.

### `Screen.tsx`

Contenedor común con safe area, fondo de aplicación, padding y scroll opcional. Es el punto de partida recomendado para cada pantalla.

### `StateView.tsx`

Contiene `LoadingView` y `EmptyView`. Sirve para estados de infraestructura o shell sin inventar datos de dominio.

### `TextField.tsx`

Campo base con label visible, placeholder, teclado y contraseña. La validación específica debe vivir en el feature, no aquí.

### `index.ts`

Barrel de exports para importar primitives desde un único lugar:

```tsx
import { AppText, Card, PrimaryButton, Screen } from '@/components/ui';
```

## 6. Carpeta `src/lib/`: infraestructura

### `lib/http/api-client.ts`

Cliente Axios genérico con `baseURL`, timeout y un proveedor opcional de token. No conoce autenticación ni endpoints de negocio.

```ts
configureTokenProvider(async () => tokenOrNull);
```

La función que entregue el token deberá pertenecer a la futura capa de sesión, no al cliente HTTP.

### `lib/query/query-client.ts`

Instancia central de TanStack Query con configuración base de cache y reintentos. No contiene queries de negocio.

### `lib/storage/secure-storage.ts`

Wrapper genérico para `expo-secure-store`. Úsalo para secretos, tokens o credenciales cuando el módulo de autenticación sea implementado.

### `lib/storage/async-storage.ts`

Wrapper genérico para valores persistentes no sensibles. No guardes tokens aquí.

### `lib/sync/sync-queue.ts`

Cola genérica de operaciones pendientes. Solo administra entradas serializables, intentos y eliminación; no decide qué significa cada evento.

## 7. Carpetas `src/config`, `src/theme` y `src/types`

### `src/config/env.ts`

Lee `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_APP_ENV` y el fallback definido en `app.json`. No debe contener secretos.

### `src/theme/tokens.ts`

Tokens TypeScript para colores, spacing y radius. Se usan cuando una API nativa necesita valores JavaScript, por ejemplo el color de un icono.

### `src/types/common.ts`

Tipos genéricos como `ID`, `Nullable`, `PaginationParams` y `PaginatedResponse`. Los tipos de negocio deben vivir en su futuro `feature`, no en esta carpeta global.

### `src/features/`

Está reservada para módulos de dominio. Cuando se agregue un módulo, su estructura recomendada es:

```text
src/features/<module>/
├── api/              # Requests y contratos del módulo
├── components/       # UI específica del módulo
├── hooks/            # Casos de lectura/escritura conectados a UI
├── schemas/          # Validaciones del módulo
├── types.ts          # Tipos del módulo
└── state/            # Estado local del módulo, si hace falta
```

No muevas componentes genéricos allí: si se usan en dos módulos, deben vivir en `src/components/ui` o en una futura carpeta shared común.

## 8. NativeWind y Tailwind

La configuración está repartida así:

- `global.css`: importa `@tailwind base`, `components` y `utilities`.
- `tailwind.config.js`: escanea `app/` y `src/`, carga el preset de NativeWind y registra tokens semánticos.
- `babel.config.js`: configura `jsxImportSource: 'nativewind'` y `nativewind/babel`.
- `metro.config.js`: conecta Metro con NativeWind y `global.css`.
- `nativewind-env.d.ts`: agrega los tipos de `className` a React Native.
- `app/_layout.tsx`: importa el CSS una sola vez en el layout raíz.

Ejemplo:

```tsx
<View className="flex-1 bg-canvas p-4">
  <AppText variant="heading" className="text-brand">
    Título de pantalla
  </AppText>
</View>
```

Reglas:

- Preferir `className` para composición visual.
- Usar `src/theme/tokens.ts` cuando se necesite un valor desde JavaScript.
- No poner hexadecimales repetidos en cada pantalla.
- No usar clases de Tailwind web que no tengan soporte real en React Native.
- Mantener `StyleSheet` solo para casos nativos o cálculos que NativeWind no resuelva bien.

## 9. Configuración multiplataforma

### `app.json`

Define nombre, slug, scheme, bundle identifiers, plugins Expo y bundler web Metro. Toda nueva capability nativa debe agregarse solo con una necesidad concreta y documentarse.

### Android

La aplicación usa `com.grupoh.despachos` como package base. Las capacidades como ubicación se configuran mediante plugins Expo cuando el feature correspondiente sea implementado.

### iOS

La aplicación usa `com.grupoh.despachos` como bundle identifier base. Los permisos deben solicitarse dentro del flujo que los necesita y nunca al iniciar sin contexto.

## 10. Comandos de trabajo

Instalar dependencias:

```bash
npm install
```

Iniciar Metro:

```bash
npm run start
```

Limpiar cache de Metro:

```bash
npx expo start -c
```

Abrir en Android o iOS:

```bash
npm run android
npm run ios
```

Validar TypeScript:

```bash
npm run typecheck
```

Validar que el bundle nativo resuelva rutas e imports:

```bash
EXPO_NO_TELEMETRY=1 npx expo export --platform android
EXPO_NO_TELEMETRY=1 npx expo export --platform ios
```

El export verifica el bundle, pero no reemplaza la revisión manual en un dispositivo o simulador.

## 11. Checklist para una nueva pantalla

- [ ] El agente leyó `delivery-dispatch-mobile-design/SKILL.md`.
- [ ] Se clasificó la pantalla y se definió su tarea principal.
- [ ] Se reutilizaron primitives de `src/components/ui`.
- [ ] Se usaron tokens semánticos y `className` de NativeWind.
- [ ] Los controles tienen objetivo táctil suficiente.
- [ ] Los icon-only buttons tienen `accessibilityLabel`.
- [ ] Se consideraron safe areas, teclado y back de Android/iOS.
- [ ] Se incluyeron los estados alcanzables: carga, vacío, error y deshabilitado.
- [ ] No se agregó lógica de negocio sin solicitud explícita.
- [ ] Pasó `npm run typecheck`.
- [ ] Si afectó rutas, estilos o NativeWind, pasaron los bundles Android/iOS.
