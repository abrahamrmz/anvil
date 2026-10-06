// Arma los arboles de message-bar. Son funciones puras que reciben los
// elementos ya resueltos (Box, Text), para probarlas con `node --test` sin el
// API de mods.

export const BAR_COLOR = 'cyan'
// Clave del tema: se adapta a tema claro u oscuro. Una terminal no tiene
// opacidad real, asi que "un poco opaco" se logra con el fondo del tema.
export const MESSAGE_BG = 'userMessageBackground'
// Mas lineas que esto y se deja el dibujo original (conserva expandir/contraer)
export const MAX_LINES = 12

// 1737000000000 -> "11:26" (hora local, 24 h)
export function formatTime(ms) {
  const d = new Date(ms)
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

// Solo se redibuja el mensaje que escribes tu y es corto. Los mensajes de
// tareas u otros agentes (props.task / props.from) y los largos conservan el
// dibujo original de Claude Code.
export function shouldRedraw(props) {
  if (!props || typeof props.text !== 'string') return false
  if (props.task || props.from) return false
  return props.text.split('\n').length <= MAX_LINES
}

// Envuelve el dibujo original con la barra y aire arriba/abajo. La barra es una
// columna de 1 celda con fondo de color que se estira a la altura del mensaje.
export function wrapEngine(Box, message, color = BAR_COLOR) {
  return Box({
    flexDirection: 'row',
    marginTop: 1,
    marginBottom: 1,
    children: [
      Box({ key: 'bar', width: 1, backgroundColor: color, children: [] }),
      Box({ key: 'message', flexDirection: 'column', paddingLeft: 1, children: [message] }),
    ],
  })
}

// Dibuja el mensaje propio: barra, linea tenue con nombre y hora, y el texto con
// un fondo que cubre solo el ancho del texto (alignSelf evita que se estire).
export function buildMessage(Box, Text, { name, time, text }, colors = {}) {
  const bar = colors.bar ?? BAR_COLOR
  const bg = colors.bg ?? MESSAGE_BG
  const header = [name, time].filter(Boolean).join(' · ')
  const lines = text.split('\n').map((line, i) => (i === 0 ? '❯ ' : '  ') + (line || ' '))

  return Box({
    flexDirection: 'row',
    marginTop: 1,
    marginBottom: 1,
    children: [
      Box({ key: 'bar', width: 1, backgroundColor: bar, children: [] }),
      Box({
        key: 'message',
        flexDirection: 'column',
        paddingLeft: 1,
        children: [
          Text({ key: 'header', dimColor: true, children: [header] }),
          Box({
            key: 'body',
            flexDirection: 'column',
            alignSelf: 'flex-start',
            backgroundColor: bg,
            paddingLeft: 1,
            paddingRight: 1,
            children: lines.map((line, i) => Text({ key: 'line-' + i, children: [line] })),
          }),
        ],
      }),
    ],
  })
}
