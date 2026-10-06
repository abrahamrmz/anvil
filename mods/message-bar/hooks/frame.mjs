// Arma el arbol de message-bar. Es una funcion pura que recibe el elemento Box
// ya resuelto, para poder probarla con `node --test` sin el API de mods.

export const BAR_COLOR = 'cyan'

// Una columna de 1 celda con fondo de color a la izquierda del mensaje: al
// estirarse a toda la altura de la fila, la barra cubre todas las lineas del
// mensaje aunque ocupe varias. Una fila en blanco arriba y abajo da aire.
export function buildFrame(Box, message, color = BAR_COLOR) {
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
