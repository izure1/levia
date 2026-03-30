import { World } from '../../src/index.js'

const W = window.innerWidth
const H = window.innerHeight
const CX = W / 2
const Z = 300

const world = new World()
const camera = world.createCamera()
camera.transform.position.z = -100

await world.loader.load({
  'star': '../asset/image/star.png',
})

// ────────────────────────────────────────────────────────
// ① 일반 모드 — 왼쪽 절반에 파티클 에미터 3개 배치
// ────────────────────────────────────────────────────────

world.particleManager.create({
  name: 'star-slow',
  src: 'star',
  loop: true,
  lifespan: 2000,
  interval: 300,
  rate: 5,
  spawnWidth: 300,
  spawnHeight: 300,
})

world.particleManager.create({
  name: 'star-burst',
  src: 'star',
  loop: true,
  lifespan: 1000,
  interval: 100,
  rate: 15,
})

world.particleManager.create({
  name: 'star-large',
  src: 'star',
  loop: true,
  lifespan: 3000,
  interval: 500,
  rate: 3,
})

const leftX = -CX / 2

// 에미터 ① — 느린 별 (가운데)
world.createParticle({
  style: { width: 20, height: 20, blendMode: 'lighter' },
  transform: { position: { x: leftX, y: 0, z: Z } },
}).play('star-slow')

// 에미터 ② — 빠른 버스트 (왼쪽)
world.createParticle({
  style: { width: 12, height: 12, blendMode: 'lighter' },
  transform: { position: { x: leftX - 120, y: 60, z: Z } },
}).play('star-burst')

// 에미터 ③ — 크고 느린 별 (오른쪽)
world.createParticle({
  style: { width: 36, height: 36, blendMode: 'lighter' },
  transform: { position: { x: leftX + 120, y: -60, z: Z } },
}).play('star-large')

// ────────────────────────────────────────────────────────
// ② strict 모드 — 오른쪽 절반, matter-js 물리 기반
// ────────────────────────────────────────────────────────

world.setGravity({ x: 0, y: 1 })

world.particleManager.create({
  name: 'star-strict',
  src: 'star',
  loop: true,
  lifespan: 3000,
  interval: 250,
  rate: 6,
})

world.particleManager.create({
  name: 'star-strict-fast',
  src: 'star',
  loop: true,
  lifespan: 1500,
  interval: 150,
  rate: 10,
})

const rightX = CX / 2

// strict 에미터 ① — 중앙
world.createParticle({
  strict: true,
  style: { width: 18, height: 18, blendMode: 'lighter' },
  transform: { position: { x: rightX, y: -60, z: Z } },
  attribute: { restitution: 0.6, friction: 0.05, density: 0.002, gravityScale: 0.8 },
}).play('star-strict')

// strict 에미터 ② — 오른쪽
world.createParticle({
  strict: true,
  style: { width: 12, height: 12, blendMode: 'lighter' },
  transform: { position: { x: rightX + 100, y: 30, z: Z } },
  attribute: { restitution: 0.4, friction: 0.1, density: 0.001, gravityScale: 1.2 },
}).play('star-strict-fast')

// static 바닥 (파티클 bounce)
const floorY = H / 2 - 40
const floor = world.createRectangle({
  attribute: { name: 'floor', physics: 'static' },
  style: { width: 600, height: 20, color: '#1a1a3a' },
  transform: { position: { x: rightX, y: floorY, z: Z } },
})
floor.style.opacity = 0.3

world.start()
