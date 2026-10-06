// anvil-usage: dibuja el uso de contexto y el costo estimado a la derecha de la
// linea de modo (SessionMode, donde sale "auto mode on (shift+tab to cycle)").
//
// SIN VERIFICAR EN VIVO (requiere Claude Code v2.1.287+). Pendientes:
//   - forma exacta de $.session.usage().cost (se lee de forma defensiva)
//   - tokens de entrada/salida (no se muestran todavia)
//   - que el Box con justifyContent/width sea aceptado en SessionMode
// Si un arbol no valida, Claude Code dibuja su propio SessionMode y deja una
// linea en el transcript con el motivo (ver troubleshoot de mods).

const BAR_WIDTH = 10
const REFRESH_MS = 2000
const PARTIALS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉']

// 950 -> "950", 15500 -> "15.5k", 1000000 -> "1M"
function fmtTokens(n) {
  const v = Number(n) || 0
  const s = v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'k' : String(Math.round(v))
  return s.replace(/\.0([kM])$/, '$1')
}

// Barra con resolucion de octavos de celda: [lleno, vacio]
function bar(percent) {
  const clamped = Math.min(100, Math.max(0, Number(percent) || 0))
  const eighths = Math.round((clamped * BAR_WIDTH * 8) / 100)
  const full = Math.floor(eighths / 8)
  const rem = eighths % 8
  const filled = '█'.repeat(full) + PARTIALS[rem]
  const empty = '░'.repeat(BAR_WIDTH - full - (rem > 0 ? 1 : 0))
  return [filled, empty]
}

// Verde < 60, amarillo < 85, rojo despues
function colorFor(percent) {
  return percent >= 85 ? 'red' : percent >= 60 ? 'yellow' : 'green'
}

// La forma de usage().cost no esta confirmada: acepta un numero o un objeto
// con alguno de los nombres habituales. Devuelve USD o null.
function costUsd(cost) {
  if (typeof cost === 'number') return cost
  if (cost && typeof cost === 'object') {
    for (const key of ['usd', 'totalUsd', 'total_cost_usd', 'total']) {
      if (typeof cost[key] === 'number') return cost[key]
    }
  }
  return null
}

export function register(on) {
  // Refresca el dibujo en cada medicion (tras cada turno) y por timer, porque
  // Claude Code no redibuja solo cuando cambian los datos del mod.
  on('session.start', async ($, e, next) => {
    $.clock.every(REFRESH_MS, () => $.ui.invalidate('ui.render'))
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    $.ui.invalidate('ui.render')
    return next(e)
  })

  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const { Box, Text } = $.ui.resolve(e)
    // El dibujo propio de Claude Code (auto mode on ...), que se conserva
    const theirs = await next(e)

    const usage = await $.session.usage()
    const percent = Number(usage?.context?.percent) || 0
    const color = colorFor(percent)
    const [filled, empty] = bar(percent)
    const usd = costUsd(usage?.cost)

    const parts = [
      Text({ color, children: [filled] }),
      Text({ dimColor: true, children: [empty] }),
      Text({ color, children: [' ' + percent.toFixed(1) + '%'] }),
      Text({
        children: [' (' + fmtTokens(usage?.context?.tokens) + '/' + fmtTokens(usage?.context?.window) + ')'],
      }),
    ]
    if (usd !== null) parts.push(Text({ children: [' · ~$' + usd.toFixed(3)] }))

    // Modo a la izquierda, uso a la derecha
    return Box({
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      children: [theirs, Box({ flexDirection: 'row', children: parts })],
    })
  })
}
