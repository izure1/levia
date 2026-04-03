import { World } from '../../src/index.js'
import type { BlendMode } from '../../src/types.js'

const world = new World()
const camera = world.createCamera({
  transform: {
    position: {
      z: -60
    }
  }
})
world.camera = camera

await world.loader.load({
  'logo': '../asset/image/logo.png',
  'star': '../asset/image/star.png',
})

world.gravity = { x: 0, y: 1 }

const blendModes: BlendMode[] = [
  'source-over', 'source-in', 'source-out', 'source-atop',
  'destination-over', 'destination-in', 'destination-out',
  'lighter', 'copy', 'xor', 'multiply', 'screen',
  'lighten', 'darken', 'difference', 'exclusion'
]

// 중앙 디스플레이 상태 텍스트
const currentModeLabel = world.createText({
  attribute: { text: 'Current: source-over' },
  style: { color: '#7ec8e3', fontSize: 32, textAlign: 'center', fontWeight: 'bold' },
  transform: { position: { x: 0, y: -220, z: 0 } }
})

// 중앙 디스플레이 (크게)
const dest = world.createImage({
  transform: { position: { x: 0, y: 0, z: 0 } }
})
dest.play('logo')

world.particleManager.create({
  name: 'star-anti-gravity',
  src: 'star',
  loop: true,
  lifespan: 20000,
  interval: 150,
  rate: 1,
  impulse: 0,
  spawnX: 500,
  spawnY: 20,
  spawnZ: 100,
  size: {
    start: { min: 1, max: 1.5 },
    end: { min: 0.5, max: 1 }
  }
})

const src = world.createParticle({
  strict: true,
  attribute: { gravityScale: 0.15, friction: 0.005, density: 0.001 },
  style: { blendMode: 'source-over', zIndex: 1 },
  transform: { position: { x: 0, y: -500, z: 0 } }
}).play('star-anti-gravity')

// 하단에 버튼 라벨 16개 배치
const cols = 8;
const xSpace = 150;
const ySpace = 60;
const startX = -525;
const startY = 200;

blendModes.forEach((mode, i) => {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const cx = startX + col * xSpace;
  const cy = startY + row * ySpace;

  const btn = world.createText({
    attribute: { text: mode },
    style: {
      color: '#ffffff',
      fontSize: 20,
      textAlign: 'center',
      pointerEvents: true,
      borderColor: '#444',
      borderWidth: 1
    },
    transform: { position: { x: cx, y: cy, z: 10 } }
  })

  btn.on('mouseover', () => {
    btn.style.outlineColor = '#ff5555';
    btn.style.outlineWidth = 2;
  })

  btn.on('mouseout', () => {
    btn.style.outlineColor = undefined;
    btn.style.outlineWidth = 0;
  })

  btn.on('mousedown', () => {
    src.style.blendMode = mode;
    currentModeLabel.attribute.text = `Current: <style fontSize="32" color="rgba(255, 136, 0, 1)" fontWeight="400">${mode}</style>`;
  })
})

window.addEventListener('mousemove', (e) => {
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  camera.transform.position.x = (e.clientX - cx) * 0.05
  camera.transform.position.y = (e.clientY - cy) * 0.05
})

world.start()
