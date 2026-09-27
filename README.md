# Despachos Mobile

Starter kit móvil para el microservicio de Gestión de Entregas y Despachos.

## Alcance del móvil

Este repositorio contiene los cimientos técnicos, autenticación y el servicio base de ubicación en segundo plano. Aún no incluye un módulo de despachos o rutas que active el seguimiento según sus estados. El portal del cliente y el panel administrativo quedan fuera de este proyecto móvil.

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

La app restaura la sesión al arrancar y protege las rutas privadas. Define `EXPO_PUBLIC_API_URL` con la dirección del backend accesible desde el teléfono; la URL debe incluir `/api`.

## Decisiones base

- `TanStack Query` para estado remoto, caché e invalidación.
- `SecureStore` y AsyncStorage encapsulados como infraestructura reutilizable.
- `SQLite` embebido (`expo-sqlite` en modo WAL) con cifrado AES-256-CBC de payloads y UUID v7 para persistencia offline (ST-79.1).
- `SyncService` con detección reactiva de red (`NetInfo`), cola secuencial FIFO y reintentos con backoff exponencial y jitter (ST-79.2).
- Cliente HTTP (`apiClient`) con Bearer automático, renovación coordinada del token y cierre de sesión ante un 401 definitivo.
- Expo Router con shell de autenticación, tabs y rutas dinámicas.
- `NativeWind` v4 configurado para usar clases Tailwind en componentes React Native.
- `expo-location` y `expo-task-manager` para ubicación en segundo plano durante despachos activos (ST-77.1).

## Seguimiento GPS (ST-77.1)

`src/features/tracking` gestiona permisos, registro de la tarea nativa y el inicio o la parada del servicio. El módulo de despachos debe llamar a `reconcileTracking(activeDispatchCount)` cuando cambie la cantidad de despachos activos; con cero se detiene la tarea. Al cerrar sesión también se detiene y se elimina la última lectura local.

La tarea guarda solamente la última lectura válida en SQLite con el cifrado existente. No envía coordenadas al backend. Los umbrales iniciales de distancia y precisión están en `src/features/tracking/config.ts` y requieren calibración en dispositivos reales.

La ubicación en segundo plano se prueba en una compilación de desarrollo de Android o iOS; Expo Go no ofrece la misma ejecución nativa. Los permisos se solicitan al iniciar un despacho, no al abrir la aplicación.

### Prueba manual en el simulador iOS

En desarrollo, la pestaña **GPS** (con sesión iniciada) y la ruta `app/tracking-test.tsx` permiten iniciar y detener un despacho de prueba sin depender del módulo de despachos. La ruta directa sirve también cuando el backend de autenticación no está disponible en el teléfono. La pestaña se oculta y la ruta directa redirige al inicio en compilaciones de producción.

1. Ejecuta `npx expo run:ios --device <UDID_DEL_SIMULADOR>` para compilar e instalar la app nativa.
2. Abre la pantalla con `xcrun simctl openurl booted despachos://tracking-test`.
3. Pulsa **Iniciar seguimiento** y concede ubicación precisa y permiso **Siempre**. Si iOS solo ofrece el permiso de uso, cambia el acceso a **Siempre** en Ajustes > Flash Pack > Ubicación.
4. Simula movimiento con `xcrun simctl location booted start --speed=8 --distance=25 37.7749,-122.4194 37.7755,-122.4187`. Envía la app a segundo plano y vuelve; **Actualizar lectura** debe mostrar coordenadas y hora nuevas.
5. Pulsa **Detener seguimiento**, simula otro movimiento y comprueba que la hora de la última lectura ya no cambia. Finaliza la simulación con `xcrun simctl location booted clear`.

Esta prueba verifica el servicio en el simulador. La continuidad con pantalla bloqueada, el consumo de batería y los permisos de producción deben comprobarse también en un dispositivo físico.

### Prueba manual en un iPhone físico

1. Conecta y desbloquea el iPhone, confía en el Mac y activa **Modo desarrollador** en el teléfono si iOS lo solicita.
2. Ejecuta `npx expo run:ios --device` y selecciona el iPhone. Mantén Metro abierto mientras usas esta compilación de desarrollo.
3. Con sesión iniciada, entra a la pestaña **GPS**. Si no tienes un backend de autenticación accesible desde el teléfono, abre la ruta de prueba con `xcrun devicectl device process launch --device <UDID_DEL_IPHONE> --payload-url despachos://tracking-test com.grupoh.despachos`.
4. Concede ubicación **Siempre** y **Ubicación precisa**, pulsa **Iniciar seguimiento** y camina al aire libre más de 100 m con la app en segundo plano o el teléfono bloqueado. Vuelve y pulsa **Actualizar lectura** para comparar coordenadas y hora.
5. Pulsa **Detener seguimiento**, vuelve a moverte y confirma que la hora de la última lectura no cambia.

Esta compilación local se firmó con un equipo Apple personal. Se quitó `aps-environment` del proyecto iOS generado solo para instalarla en el iPhone; las notificaciones push no se pueden probar con esa firma. El seguimiento GPS no depende de esa capacidad.

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
