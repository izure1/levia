import { World } from '../../src/index.js'

const world = new World()
const camera = world.createCamera()

world.camera = camera

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
label('① LveImage — logo.png (auto size)', -500, -250, 0)
const img1 = world.createImage({
  transform: { position: { x: -380, y: -160, z: 0 } },
})
img1.attr({ src: 'logo' })

// ② LveImage — logo.png (지정 크기 200×auto)
label('② LveImage — logo.png (200×auto)', -500, 20, 0)
const img2 = world.createImage({
  style: { width: 200 },
  transform: { position: { x: -400, y: 120, z: 0 } },
})
img2.attr({ src: 'logo' })

// ③ Placeholder (src 없음)
label('③ Placeholder (no src)', -500, 250, 0)
world.createImage({
  style: { width: 80, height: 80 },
  transform: { position: { x: -460, y: 310, z: 0 } },
})

// ④ Sprite — sprite.png, 10fps
label('④ Sprite — sprite.png (132×auto)', 80, -250, 0)
const spr = world.createSprite({
  style: { width: 132 },
  transform: { position: { x: 180, y: -160, z: 0 } },
})
spr.attr({ src: 'play' }).play()

// ⑤ Sprite — 원경 (z=300, perspective 축소)
label('⑤ Sprite 원경 (z300)', 80, 60, 0)
const sprFar = world.createSprite({
  style: { width: 132, height: 120 },
  transform: { position: { x: 180, y: 160, z: 300 } },
})
sprFar.attr({ src: 'play' }).play()

// ⑥ LveVideo — sample.mp4
label('⑥ LveVideo — sample.mp4 (200×auto)', -200, -250, 0)
const vid = world.createVideo({
  style: { width: 200 },
  transform: { position: { x: -120, y: -160, z: 0 } },
})
vid.attr({ src: 'sample' }).play()

// ⑦ Particle — 파티클 에미터 (일반 모드)
world.particleManager.create({
  name: 'flame',
  src: 'star',
  loop: true,
  lifespan: 1500,
  interval: 200,
  rate: 8,
  impulse: 0.25,
})

label('⑦ Particle — flame (일반 모드)', -200, 60, 0)
const ptcl = world.createParticle({
  style: { width: 30, height: 30, blendMode: 'lighter' },
  transform: { position: { x: -120, y: 160, z: 0 } },
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
