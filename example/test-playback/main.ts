import { World } from '../../src/index.js'

const world = new World()
const camera = world.createCamera()
world.camera = camera

await world.loader.load({
  'sprite': '../asset/image/sprite.png',
  'mummy': '../asset/image/mummy.png',
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

// 스프라이트 클립 2번 (테스트용)
world.spriteManager.create({
  name: 'play2',
  src: 'mummy',
  frameWidth: 256,
  frameHeight: 256,
  frameRate: 18,
  loop: true,
  start: 0,
  end: 18,
})

// 비디오 클립 등록
world.videoManager.create({
  name: 'sample',
  src: 'video',
  loop: true,
  start: 0,
})

// 비디오 클립 2번 (테스트용)
world.videoManager.create({
  name: 'sample2',
  src: 'video',
  loop: false,
  start: 2,
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
spr.attr({ src: 'play' }).play()

// Video 생성
label('Video (playbackRate, volume, currentTime)', 250, -150)
const vid = world.createVideo({
  style: { width: 300 },
  transform: { position: { x: 250, y: 0, z: 0 } },
})
vid.attr({ src: 'sample' }).play()

// UI Bindings
const sprRate = document.getElementById('spr-rate') as HTMLInputElement
const sprRateVal = document.getElementById('spr-rate-val')!
sprRate?.addEventListener('input', () => {
  const rate = parseFloat(sprRate.value)
  spr.attribute.playbackRate = rate
  sprRateVal.textContent = String(rate)
})

const vidRate = document.getElementById('vid-rate') as HTMLInputElement
const vidRateVal = document.getElementById('vid-rate-val')!
vidRate?.addEventListener('input', () => {
  const rate = parseFloat(vidRate.value)
  vid.attribute.playbackRate = rate
  vidRateVal.textContent = rate.toFixed(1)
})

const vidVol = document.getElementById('vid-vol') as HTMLInputElement
const vidVolVal = document.getElementById('vid-vol-val')!
vidVol?.addEventListener('input', () => {
  const vol = parseFloat(vidVol.value)
  vid.attribute.volume = vol
  vidVolVal.textContent = vol.toFixed(1)
})

document.getElementById('btn-spr-seek')?.addEventListener('click', () => {
  spr.attribute.currentTime = 0
})

document.getElementById('btn-vid-seek')?.addEventListener('click', () => {
  vid.attribute.currentTime = 5
})

document.getElementById('btn-spr-toggle')?.addEventListener('click', () => {
  const s = spr as any
  if (s._playing && !s._paused) spr.pause()
  else spr.play()
})

document.getElementById('btn-vid-toggle')?.addEventListener('click', () => {
  const v = vid as any
  if (v._playing && !v._paused) vid.pause()
  else vid.play()
})

let sprToggleSrc = false
document.getElementById('btn-spr-src')?.addEventListener('click', () => {
  sprToggleSrc = !sprToggleSrc
  spr.attr({ src: sprToggleSrc ? 'play2' : 'play' })
})

let vidToggleSrc = false
document.getElementById('btn-vid-src')?.addEventListener('click', () => {
  vidToggleSrc = !vidToggleSrc
  vid.attr({ src: vidToggleSrc ? 'sample2' : 'sample' })
})

world.start()
