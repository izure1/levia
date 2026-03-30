import { World } from '../../src/index.js'

const world = new World()
const camera = world.createCamera()
camera.transform.position.z = -100

await world.loader.load({
  'logo': '../asset/image/logo.png',
  'sprite': '../asset/image/sprite.png',
  'video': '../asset/video/sample.mp4',
})

// 스프라이트 클립 등록
world.spriteManager.create({
  name: 'play',
  src: 'sprite',
  frameWidth: 44,
  frameHeight: 40,
  frameRate: 10,
  loop: true,
  start: 0,
  end: 10,
})

// 비디오 클립 등록
world.videoManager.create({
  name: 'sample',
  src: 'video',
  loop: true,
  start: 0,
})

function label(text: string, x: number, y: number, z: number) {
  world.createText({
    attribute: { text },
    style: { color: '#888', fontSize: 13, fontFamily: 'sans-serif, monospace' },
    transform: { position: { x, y, z } },
  })
}

// ① LveImage — logo.png (auto size)
label('① LveImage — logo.png (auto size)', -500, -250, 300)
const img1 = world.createImage({
  transform: { position: { x: -380, y: -160, z: 300 } },
})
img1.play('logo')

// ② LveImage — logo.png (지정 크기 200×200)
label('② LveImage — logo.png (200×200)', -500, 20, 300)
const img2 = world.createImage({
  style: { width: 200, height: 200 },
  transform: { position: { x: -400, y: 120, z: 300 } },
})
img2.play('logo')

// ③ Placeholder (src 없음)
label('③ Placeholder (no src)', -500, 250, 300)
world.createImage({
  style: { width: 80, height: 80 },
  transform: { position: { x: -460, y: 310, z: 300 } },
})

// ④ Sprite — sprite.png, 10fps
label('④ Sprite — sprite.png (10fps, 44×40)', 80, -250, 300)
const spr = world.createSprite({
  style: { width: 132, height: 120 },
  transform: { position: { x: 180, y: -160, z: 300 } },
})
spr.play('play')

// ⑤ Sprite — 원경 (z=600, perspective 축소)
label('⑤ Sprite 원경 (z=600)', 80, 60, 300)
const sprFar = world.createSprite({
  style: { width: 132, height: 120 },
  transform: { position: { x: 180, y: 160, z: 600 } },
})
sprFar.play('play')

// ⑥ LveVideo — sample.mp4
label('⑥ LveVideo — sample.mp4', -200, -250, 300)
const vid = world.createVideo({
  style: { width: 200, height: 120 },
  transform: { position: { x: -120, y: -160, z: 300 } },
})
vid.play('sample')

// ⑦ Particle — 파티클 에미터 (일반 모드)
world.particleManager.create({
  name: 'flame',
  src: 'star',
  loop: true,
  lifespan: 1500,
  interval: 200,
  rate: 8,
})

label('⑦ Particle — flame (일반 모드)', -200, 60, 300)
const ptcl = world.createParticle({
  style: { width: 30, height: 30, blendMode: 'lighter' },
  transform: { position: { x: -120, y: 160, z: 300 } },
})
ptcl.play('flame')

// 마우스로 카메라 이동
window.addEventListener('mousemove', (e) => {
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  camera.transform.position.x = (e.clientX - cx) * 0.1
  camera.transform.position.y = (e.clientY - cy) * 0.1
})

world.start()
