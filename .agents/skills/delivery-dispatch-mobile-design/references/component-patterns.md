# Patrones de componentes móviles

## Shell y navegación

- El root layout configura providers globales y carga `global.css` una sola vez.
- Los grupos de Expo Router separan autenticación, app y tabs; no dupliques layouts dentro de cada pantalla.
- Las tabs representan destinos principales y usan icono + etiqueta visible.
- Los detalles y formularios viven en Stack routes. Usa rutas dinámicas solo para parámetros de navegación, no para esconder lógica de negocio.
- El botón back debe ser claro en Stack screens; no recrees navegación con estados locales.

## Pantalla base

Orden recomendado:

1. Safe area y encabezado contextual.
2. Título y descripción breve.
3. Contenido principal o estado del módulo.
4. Acción primaria y acciones secundarias.

Usa `Screen`, `Card`, `AppText`, `PrimaryButton`, `TextField`, `EmptyView` y `IconButton` antes de crear markup nuevo.

## Listados

- Una columna en móvil; cada item debe poder escanearse con título, dato secundario, estado y acción.
- No uses tablas con scroll horizontal salvo que comparar columnas sea la tarea principal.
- Estado de carga: conserva la estructura si ya hay contenido; usa `LoadingView` o skeleton si aún no hay datos.
- Estado vacío: explica cómo aparecerá el primer elemento o qué módulo falta.
- Error: mensaje cercano y acción de reintento cuando la capa de datos exista.
- Texto largo: permite varias líneas y no cortes identificadores importantes.

## Formularios

- Una columna y label visible encima del campo.
- Usa `TextField` o una primitive accesible; no construyas inputs sin label.
- Declara teclado y autofill adecuados para el tipo de dato.
- `KeyboardAvoidingView` y `ScrollView` deben mantener visible el campo activo y el botón de envío.
- Mantén la acción primaria al final y accesible con una mano.
- La validación de negocio pertenece al módulo o feature, no a los componentes shared.

## Detalle

- Empieza con back, contexto, identificador visible y título principal.
- Agrupa pares label/valor en bloques fáciles de leer.
- Coloca acciones según la prioridad del flujo; no muestres acciones inventadas para llenar espacio.
- La línea de actividad, evidencia o estado solo aparece cuando el dominio la conecte.

## Feedback

- Toast o banner: confirma algo que ya terminó.
- Inline: errores o decisiones que requieren acción.
- Dialog: confirmaciones destructivas o decisiones irreversibles.
- Loading en el área que cambia; evita bloquear toda la pantalla después del primer render.

## Accesibilidad táctil

- Objetivo táctil mínimo de 44 px.
- No uses solo color para estados.
- Icon-only controls necesitan `accessibilityLabel`.
- Botones deshabilitados deben explicar el motivo si el contexto lo requiere.
- Revisa orden de lectura, contraste, Dynamic Type y contenido con VoiceOver/TalkBack.

## Responsive móvil

- 320–390 px: una columna, acciones sin recorte, teclado usable.
- 600–768 px: tablet o landscape con contenido que pueda crecer sin fijar alturas innecesarias.
- iOS: safe areas, teclado, gestos y tamaños de texto.
- Android: botón back, barra de navegación y densidades variadas.
