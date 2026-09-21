# Lenguaje visual móvil

## Tesis

Delivery Dispatch es una herramienta operativa. En móvil la interfaz debe permitir leer, decidir y actuar con una mano y bajo presión. La personalidad visual conserva la sobriedad, precisión y jerarquía del producto web, pero reduce densidad y prioriza objetivos táctiles.

## Tokens y color

La fuente canónica del proyecto móvil es:

- `src/theme/tokens.ts` para tokens usados desde TypeScript.
- `tailwind.config.js` para los nombres de clase NativeWind.

Usa nombres semánticos y no hexadecimales dentro de las pantallas:

- lienzo: `bg-canvas` o el token equivalente;
- superficie: `bg-white` o token de superficie;
- texto principal: `text-ink`;
- metadatos: `text-slate` y `text-muted`;
- estructura: `border-border`;
- acción primaria: `bg-brand text-white`;
- error: `bg-danger` con texto contrastado.

El color de marca se reserva para la acción primaria, selección, foco o identidad. Los estados deben acompañarse de texto o icono; el color nunca es el único significado.

## Tipografía

- Título de pantalla: `text-2xl` o `text-3xl`, semibold o bold.
- Encabezado de sección: `text-base` o `text-lg`, semibold.
- Texto operativo y controles: `text-sm` o `text-base`.
- Metadatos: `text-xs`, solo cuando sean realmente secundarios.
- Errores y ayudas accionables: nunca menores que `text-sm`.

Evita mayúsculas extensas y textos centrados largos. Mantén una línea de lectura cómoda y no reduzcas la tipografía para hacer caber contenido.

## Espaciado y geometría

- Usa pasos de 4 px; prioriza 8, 12, 16, 24 y 32 px.
- Padding horizontal de pantalla: 16 px en móvil.
- Campos y botones: mínimo 44 px de alto cuando sean controles táctiles.
- Icon buttons: área táctil mínima de 44 × 44 px aunque el icono mida 18–20 px.
- Superficies: bordes y cambios de fondo antes que sombras fuertes.
- No anides tarjetas sin necesidad; usa separación, encabezados y divisores.

## Iconografía

Usa `lucide-react-native` con tamaños consistentes por contexto:

- 16 px para iconos dentro de campos o metadatos;
- 20–22 px para acciones y navegación;
- 24 px para encabezados o estados importantes.

Un icono decorativo lleva `accessibilityElementsHidden` o equivalente cuando aplique. Un icon-only button siempre lleva `accessibilityLabel`, estado de foco y objetivo táctil completo.

## Movimiento y plataforma

- Usa transiciones breves y evita movimiento continuo.
- Respeta `prefers-reduced-motion` cuando la plataforma o la librería lo exponga.
- No dependas de hover.
- Prueba safe areas, teclado, back de Android y gesto de regreso de iOS.
- Los permisos nativos se solicitan en el flujo que los necesita, nunca al abrir la app sin contexto.

## Voz del producto

- Títulos concretos: `Despachos`, `Perfil`, `Configuración`.
- Empty states: explica qué falta y qué se podrá hacer después.
- Errores: indica qué debe corregirse y junto a qué control.
- Éxito: confirma el resultado, no describas la interfaz.
- Si no hay dominio conectado, usa `Pantalla base`, `Módulo pendiente` o un texto equivalente; no inventes datos operativos.
