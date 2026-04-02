import { World } from '../../src/index.js'

const world = new World()
const camera = world.createCamera()

world.camera = camera

function label(text: string, x: number, y: number, z: number) {
  world.createText({
    attribute: { text },
    style: { color: '#aaaaaa', fontSize: 16, fontFamily: 'sans-serif, monospace' },
    transform: { position: { x, y, z } },
  })
}

// ① 기본 텍스트
label('① 기본 텍스트 (auto size)', -550, -280, 0)
world.createText({
  attribute: { text: 'Hello, World!\nYou can use multiple lines.' },
  style: { color: '#ffffff', fontSize: 22, fontFamily: 'sans-serif' },
  transform: { position: { x: -550, y: -250, z: 0 } },
})

// ② 인라인 마크업
label('② 인라인 마크업 스타일', -550, -130, 0)
world.createText({
  attribute: {
    text: 'Normal <style fontSize="28" fontWeight="bold" color="#7ec8e3">Bold Blue</style> and <style fontStyle="italic" color="#f4a261">Italic Orange</style> text.',
  },
  style: { color: '#ffffff', fontSize: 18, fontFamily: 'sans-serif' },
  transform: { position: { x: -550, y: -100, z: 0 } },
})

// ③ 중첩 마크업
label('③ 중첩 마크업 (부모 상속)', -550, 30, 0)
world.createText({
  attribute: {
    text: '<style color="#e76f51" fontSize="22">Outer <style fontSize="14" fontWeight="300" fontStyle="italic" color="#00ff00ff" textShadowColor="#00ff00ff" textShadowBlur="3" textShadowOffsetX="5" textShadowOffsetY="5">inner-lighter</style> back-to-outer</style>',
  },
  style: { color: '#ffffff', fontSize: 18, fontFamily: 'sans-serif', textShadowBlur: 5, textShadowColor: '#e76f51', textShadowOffsetX: 10, textShadowOffsetY: 10 },
  transform: { position: { x: -550, y: 60, z: 0 } },
})

// ④ borderColor
label('④ borderColor / borderWidth', -550, 140, 0)
world.createText({
  attribute: { text: '<style fontSize="36" fontWeight="bold" color="#0a0a14" borderColor="#c77dff" borderWidth="2">Outlined Text</style>' },
  style: { fontSize: 36, fontFamily: 'sans-serif' },
  transform: { position: { x: -550, y: 170, z: 0 } },
})

// ⑤ word-wrap + textAlign: center
label('⑤ width + word-wrap + textAlign: center', 50, -280, 0)
world.createRectangle({
  style: { color: '#1a1a2e', width: 300, height: 150, borderColor: '#444', borderWidth: 1 },
  transform: { position: { x: 200, y: -195, z: 0 } },
})
world.createText({
  attribute: { text: 'This is a long sentence that should wrap inside the fixed width container.' },
  style: { color: '#e0e0e0', fontSize: 18, fontFamily: 'sans-serif', width: 300, textAlign: 'center', zIndex: 1 },
  transform: { position: { x: 200, y: -195, z: 0 } },
})

// ⑥ 클리핑 (height: 40)
label('⑥ width + height → 클리핑', 50, 20, 0)
world.createRectangle({
  style: { color: '#1a1a2e', width: 300, height: 40, borderColor: '#e76f51', borderWidth: 1 },
  transform: { position: { x: 200, y: 60, z: 0 } },
})
world.createText({
  attribute: { text: 'Line 1: visible\nLine 2: visible\nLine 3: clipped out\nLine 4: also clipped' },
  style: { color: '#90e0ef', fontSize: 18, fontFamily: 'sans-serif', width: 300, height: 40, zIndex: 1 },
  transform: { position: { x: 200, y: 60, z: 0 } },
})

// ⑦ textAlign 비교
label('⑦ textAlign 비교', 50, 180, 0)
const aligns: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right']
const alignColors = ['#f4a261', '#2ec4b6', '#e71d36']
aligns.forEach((align, i) => {
  world.createRectangle({
    style: { color: '#1a1a2e', width: 200, height: 50, borderColor: '#555', borderWidth: 1 },
    transform: { position: { x: 150, y: 220 + i * 70, z: 0 } },
  })
  world.createText({
    attribute: { text: `align: ${align}` },
    style: { color: alignColors[i], fontSize: 18, fontFamily: 'sans-serif', width: 200, textAlign: align },
    transform: { position: { x: 150, y: 220 + i * 70, z: 0 } },
  })
})

window.addEventListener('mousemove', (e) => {
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  camera.transform.position.x = (e.clientX - cx) * 0.12
  camera.transform.position.y = (e.clientY - cy) * 0.12
})

world.start()
