import { World } from '../../src/index.js'

const world = new World()
const camera = world.createCamera()
camera.transform.position.z = -100

const loader = world.createLoader()
const manager = world.createSpriteManager()

await loader.load({
  'logo': '../asset/image/logo.png',
  'sprite': '../asset/image/sprite.png',
})

// 스프라이트: 440×40, 10프레임 → frameWidth: 44, frameHeight: 40
manager.create({
  name: 'play',
  src: 'sprite',
  frameWidth: 44,
  frameHeight: 40,
  frameRate: 10,
  loop: true,
  start: 0,
  end: 10,
})

function label(text: string, x: number, y: number, z: number) {
  world.createText({
    attribute: { text },
    style: { color: '#888', fontSize: 13, fontFamily: 'monospace' },
    transform: { position: { x, y, z } },
  })
}

// ① LveImage — logo.png (auto size)
label('① LveImage — logo.png (auto size)', -500, -250, 300)
world.createImage({
  attribute: { src: 'logo' },
  transform: { position: { x: -380, y: -160, z: 300 } },
})

// ② LveImage — logo.png (지정 크기 200×200)
label('② LveImage — logo.png (200×200)', -500, 20, 300)
world.createImage({
  attribute: { src: 'logo' },
  style: { width: 200, height: 200 },
  transform: { position: { x: -400, y: 120, z: 300 } },
})

// ③ Placeholder (src 없음)
label('③ Placeholder (no src)', -500, 250, 300)
world.createImage({
  style: { width: 80, height: 80 },
  transform: { position: { x: -460, y: 310, z: 300 } },
})

// ④ Sprite — sprite.png, 10fps
label('④ Sprite — sprite.png (10fps, 44×40)', 80, -250, 300)
const spr = world.createSprite({
  attribute: { src: 'sprite' },
  style: { width: 132, height: 120 },   // 3× 확대
  transform: { position: { x: 180, y: -160, z: 300 } },
})
spr.play('play', manager)

// ⑤ Sprite — 원경 (z=600, perspective 축소)
label('⑤ Sprite 원경 (z=600)', 80, 60, 300)
const sprFar = world.createSprite({
  attribute: { src: 'sprite' },
  style: { width: 132, height: 120 },
  transform: { position: { x: 180, y: 160, z: 600 } },
})
sprFar.play('play', manager)

// 마우스로 카메라 이동
window.addEventListener('mousemove', (e) => {
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  camera.transform.position.x = (e.clientX - cx) * 0.1
  camera.transform.position.y = (e.clientY - cy) * 0.1
})

world.start()
