import { World } from '../../src/index.js'

const world = new World()
const camera = world.createCamera({
  attribute: {
    physics: 'dynamic'
  }
})
world.camera = camera
world.setGravity({ x: 0, y: 0 })

await world.loader.load({
  'star': '../asset/image/star.png',
})

// 별 15000개를 랜덤한 3D 공간에 배치
for (let i = 0; i < 15000; i++) {
  const x = (Math.random() - 0.5) * 8000
  const y = (Math.random() - 0.5) * 8000
  const z = (Math.random() - 0.5) * 8000
  const size = Math.random() * 20 + 5

  world.createImage({
    style: { width: size, height: size, blendMode: 'lighter' },
    transform: { position: { x, y, z } }
  }).play('star')
}

world.on('mouseover', (obj, e) => {
  if (obj?.attribute.type === 'image') {
    obj.animate({ transform: { scale: { x: 1.5, y: 1.5, z: 1.5 } } }, 1000, 'easeInOut')
  }
})

world.on('mouseout', (obj, e) => {
  if (obj?.attribute.type === 'image') {
    obj.animate({ transform: { scale: { x: 1, y: 1, z: 1 } } }, 1000, 'easeInOut')
  }
})

const keys: Record<string, boolean> = {}

window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true
})

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false
})

window.addEventListener('wheel', (e) => {
  camera.setAngularVelocity(e.deltaY * 0.0001)
}, { passive: true })

const SPEED = 0.00015

world.on('update', () => {
  // W, S: y축 제어 (상하 변경)
  if (keys['w']) camera.applyForce({ y: SPEED })
  if (keys['s']) camera.applyForce({ y: -SPEED })

  // A, D: x축 제어 (좌우 변경)
  if (keys['a']) camera.applyForce({ x: -SPEED })
  if (keys['d']) camera.applyForce({ x: SPEED })

  // Space, Shift: z축 제어 (깊이 변경: Z방향 전/후진)
  if (keys[' ']) camera.transform.position.z += (SPEED * 10000)    // Space로 직진
  if (keys['shift']) camera.transform.position.z -= (SPEED * 10000) // Shift로 후진
})

world.start()
