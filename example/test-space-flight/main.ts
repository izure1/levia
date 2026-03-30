import { World } from '../../src/index.js'

const world = new World()
const camera = world.createCamera()
world.camera = camera

await world.loader.load({
  'star': '../asset/image/star.png',
})

// 별 1500개를 랜덤한 3D 공간에 배치
for (let i = 0; i < 1500; i++) {
  const x = (Math.random() - 0.5) * 8000
  const y = (Math.random() - 0.5) * 8000
  const z = (Math.random() - 0.5) * 8000
  const size = Math.random() * 20 + 5

  world.createImage({
    style: { width: size, height: size, blendMode: 'lighter' },
    transform: { position: { x, y, z } }
  }).play('star')
}

const keys: Record<string, boolean> = {}

window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true
})

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false
})

let targetRotationZ = 0
window.addEventListener('wheel', (e) => {
  targetRotationZ += e.deltaY * 0.05
  camera.animate({ transform: { rotation: { z: targetRotationZ } } }, 400, 'easeOutSine')
}, { passive: true })

const SPEED = 10

const loop = () => {
  // W, S: y축 제어 (상하 변경)
  if (keys['w']) camera.transform.position.y -= SPEED
  if (keys['s']) camera.transform.position.y += SPEED

  // A, D: x축 제어 (좌우 변경)
  if (keys['a']) camera.transform.position.x -= SPEED
  if (keys['d']) camera.transform.position.x += SPEED

  // Space, Shift: z축 제어 (깊이 변경: Z방향 전/후진)
  if (keys[' ']) camera.transform.position.z += SPEED    // Space로 직진
  if (keys['shift']) camera.transform.position.z -= SPEED // Shift로 후진

  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)

world.start()
