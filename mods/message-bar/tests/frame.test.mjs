// Pruebas de la logica pura. Se corren con: node --test mods/message-bar/tests/frame.test.mjs
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BAR_COLOR, buildFrame } from '../hooks/frame.mjs'

// Box de mentira: devuelve sus props, para inspeccionar el arbol
const Box = (props) => props

test('envuelve el mensaje en una fila con aire arriba y abajo', () => {
  const message = { type: 'engine' }
  const tree = buildFrame(Box, message)
  assert.equal(tree.flexDirection, 'row')
  assert.equal(tree.marginTop, 1)
  assert.equal(tree.marginBottom, 1)
  assert.equal(tree.children.length, 2)
})

test('la barra es una columna de 1 celda con fondo de color', () => {
  const [bar] = buildFrame(Box, {}).children
  assert.equal(bar.width, 1)
  assert.equal(bar.backgroundColor, BAR_COLOR)
})

test('el mensaje original va dentro, sin modificarse', () => {
  const message = { type: 'engine', ref: 'x' }
  const [, body] = buildFrame(Box, message).children
  assert.deepEqual(body.children, [message])
  assert.equal(body.children[0], message)
})

test('se puede cambiar el color de la barra', () => {
  const [bar] = buildFrame(Box, {}, 'magenta').children
  assert.equal(bar.backgroundColor, 'magenta')
})

test('las claves de los hijos son distintas', () => {
  const [bar, body] = buildFrame(Box, {}).children
  assert.notEqual(bar.key, body.key)
})
