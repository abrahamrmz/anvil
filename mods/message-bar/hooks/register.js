// message-bar: dibuja una barra de color a la izquierda de tus mensajes en el
// transcript, con una fila en blanco arriba y abajo, para ubicarlos de un vistazo
// al hacer scroll. Conserva el dibujo original de Claude Code (colores, fondo,
// expandir/contraer) y solo lo envuelve.
//
// SIN VERIFICAR EN VIVO (requiere Claude Code v2.1.287+). Pendientes:
//   - que un Box de 1 celda con backgroundColor se estire a toda la altura
//   - que children: [] sea valido en un Box vacio (si no, usar un Text ' ')
//   - si conviene limitar la barra a los mensajes que escribes tu, usando
//     e.props.origin (no se confirmaron sus valores)
// Si el arbol no valida, Claude Code dibuja su propia fila y deja una linea en
// el transcript con el motivo.
//
// La terminal no permite cambiar el tamano de la letra: el "mas grande" se logra
// con espacio, color y barra.

import { buildFrame } from './frame.mjs'

export function register(on) {
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const { Box } = $.ui.resolve(e)
    // El dibujo propio de Claude Code para el mensaje
    const theirs = await next(e)
    return buildFrame(Box, theirs)
  })
}
