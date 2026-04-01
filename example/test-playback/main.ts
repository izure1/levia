import { World } from '../../src/index.js'

const world = new World()
const camera = world.createCamera()
world.camera = camera

await world.loader.load({
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

function label(text: string, x: number, y: number) {
  world.createText({
    attribute: { text },
    style: { color: '#888', fontSize: 16, fontFamily: 'sans-serif', textAlign: 'center' },
    transform: { position: { x, y, z: 0 } },
  })
}

// Sprite 생성
label('Sprite (playbackRate, currentTime)', -200, -150)
const spr = world.createSprite({
  style: { width: 132 },
  transform: { position: { x: -200, y: 0, z: 0 } },
})
spr.play('play')

// Video 생성
label('Video (playbackRate, volume, currentTime)', 250, -150)
const vid = world.createVideo({
  style: { width: 300 },
  transform: { position: { x: 250, y: 0, z: 0 } },
})
vid.play('sample')

// UI Bindings
const sprRate = document.getElementById('spr-rate') as HTMLInputElement
const sprRateVal = document.getElementById('spr-rate-val')!
sprRate?.addEventListener('input', () => {
  const rate = parseFloat(sprRate.value)
  spr.playbackRate = rate
  sprRateVal.textContent = String(rate)
})

const vidRate = document.getElementById('vid-rate') as HTMLInputElement
const vidRateVal = document.getElementById('vid-rate-val')!
vidRate?.addEventListener('input', () => {
  const rate = parseFloat(vidRate.value)
  vid.playbackRate = rate
  vidRateVal.textContent = rate.toFixed(1)
})

const vidVol = document.getElementById('vid-vol') as HTMLInputElement
const vidVolVal = document.getElementById('vid-vol-val')!
vidVol?.addEventListener('input', () => {
  const vol = parseFloat(vidVol.value)
  vid.volume = vol
  vidVolVal.textContent = vol.toFixed(1)
})

document.getElementById('btn-spr-seek')?.addEventListener('click', () => {
  spr.currentTime = 0
})

document.getElementById('btn-vid-seek')?.addEventListener('click', () => {
  vid.currentTime = 5
})

world.start()
