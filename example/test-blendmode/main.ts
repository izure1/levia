import { World } from '../../src/index.js'

const world = new World()
const camera = world.createCamera()
world.camera = camera

await world.loader.load({
  'logo': '../asset/image/logo.png',
  'star': '../asset/image/star.png',
})

world.setGravity({ x: 0, y: -0.1 })

const blendModes: any[] = [
  'source-over', 'lighter', 'multiply', 'screen',
  'overlay', 'darken', 'lighten', 'color-dodge',
  'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'
]

// 중앙 디스플레이 상태 텍스트
const currentModeLabel = world.createText({
  attribute: { text: 'Current: source-over' },
  style: { color: '#7ec8e3', fontSize: 32, textAlign: 'center', fontWeight: 'bold' },
  transform: { position: { x: 0, y: -220, z: 0 } }
})

// 중앙 디스플레이 (크게)
const dest = world.createImage({
  style: { width: 300, height: 300 },
  transform: { position: { x: 0, y: 0, z: 0 } }
})
dest.play('logo')

world.particleManager.create({
  name: 'star-anti-gravity',
  src: 'star',
  loop: true,
  lifespan: 3000,
  interval: 500,
  rate: 1,
  spawnWidth: 220,
  spawnHeight: 20
})

const src = world.createParticle({
  strict: true,
  attribute: { gravityScale: 0, friction: 0.005, density: 0.001 },
  style: { width: 100, height: 100, blendMode: 'source-over', zIndex: 1 },
  transform: { position: { x: 0, y: -150, z: 0 } }
}).play('star-anti-gravity')

// 하단에 버튼 라벨 13개 배치
const cols = 7;
const xSpace = 150;
const ySpace = 60;
const startX = -450;
const startY = 200;

blendModes.forEach((mode, i) => {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const cx = startX + col * xSpace;
  const cy = startY + row * ySpace + (col === 3 && row === 1 ? 0 : 0); // 가운데 정렬 맞춤용

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
    currentModeLabel.attribute.text = `Current: ${mode}`;
  })
})

window.addEventListener('mousemove', (e) => {
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  camera.transform.position.x = (e.clientX - cx) * 0.05
  camera.transform.position.y = (e.clientY - cy) * 0.05
})

world.start()
