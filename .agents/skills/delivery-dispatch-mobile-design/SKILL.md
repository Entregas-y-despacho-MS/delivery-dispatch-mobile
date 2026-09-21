---
name: delivery-dispatch-mobile-design
description: Diseña, implementa o revisa interfaces móviles de Delivery Dispatch con React Native, Expo Router y NativeWind, manteniendo el lenguaje visual operativo, la accesibilidad táctil y la compatibilidad entre Android e iOS. No la uses para lógica de negocio, backend o cambios de datos sin interfaz.
---

# Delivery Dispatch Mobile Design

Construye interfaces móviles operativas, claras y rápidas de leer para Delivery Dispatch. Esta skill adapta el patrón visual de la aplicación web a React Native + Expo + NativeWind sin trasladar literalmente patrones de escritorio.

## Antes de diseñar

1. Inspecciona la ruta, el shell de navegación y los componentes shared que ya existen.
2. Lee [references/visual-language.md](references/visual-language.md) para decisiones de color, tipografía, espaciado, iconos y tono.
3. Lee [references/component-patterns.md](references/component-patterns.md) cuando crees o modifiques una pantalla, formulario, listado, detalle, estado o navegación.
4. Lee [references/implementation-map.md](references/implementation-map.md) antes de editar rutas, componentes compartidos o configuración de NativeWind.

## Reglas esenciales

- No introduzcas lógica de negocio en una tarea de diseño. Si el módulo aún no existe, crea una composición visual, estado placeholder o contrato de props sin mocks ni reglas inventadas.
- Usa `className` de NativeWind para composición visual. Conserva `src/theme/tokens.ts` y `tailwind.config.js` como fuentes de tokens; no disperses colores literales por las pantallas.
- Reutiliza primero `src/components/ui` y extiende un componente shared solo cuando el patrón sea transversal a varias pantallas.
- Diseña primero para una columna y ancho móvil. Las pantallas deben funcionar con 320–390 px de ancho, teclado abierto, safe areas y texto largo.
- Todo control táctil debe tener un objetivo cercano a 44 px. No uses iconos como única etiqueta si una etiqueta visible mejora la comprensión; los controles icon-only necesitan `accessibilityLabel`.
- Usa `SafeAreaView`, `KeyboardAvoidingView` y `ScrollView` cuando el contenido o el teclado puedan ocultar acciones.
- Respeta las diferencias de plataforma: back gesture y áreas seguras en iOS; botón back, densidad y permisos en Android. No dependas de un comportamiento exclusivo de una plataforma.
- Mantén una acción primaria por superficie. Usa los colores de marca con disciplina y estados semánticos consistentes.
- Usa iconos Lucide con un tamaño estable por contexto. No uses emojis, iconos decorativos sin propósito ni color como único indicador de estado.
- Incluye estados de carga, vacío, error, deshabilitado y éxito cuando la pantalla pueda alcanzarlos. Si no hay lógica conectada, usa un estado de shell explícito, no datos ficticios.
- Los labels permanecen visibles sobre los campos. Los placeholders muestran ejemplos breves, no sustituyen al label ni explican reglas de negocio.
- Mantén accesibilidad con contraste suficiente, orden de foco, roles, labels, lectura clara y `accessibilityState` cuando corresponda.
- No agregues dependencias, funcionalidades o permisos nativos solo para completar la pantalla. Toda capacidad nativa debe justificarse por una necesidad real del módulo.

## Forma de trabajo

1. Clasifica la pantalla como shell, listado, formulario, detalle, flujo paso a paso o estado.
2. Define la tarea principal, la información necesaria y las acciones secundarias.
3. Compón con primitives shared y clases NativeWind; evita repetir estilos inline.
4. Verifica el flujo en ancho móvil, orientación relevante, teclado, texto largo, estado vacío y error.
5. Ejecuta typecheck y bundles de Android e iOS cuando el cambio afecte rutas, estilos globales, NativeWind o componentes shared.

Lee solo la referencia adicional que corresponda al trabajo actual. La skill debe preservar la separación entre presentación y lógica del dominio.
