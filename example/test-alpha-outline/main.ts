import { World } from '../../src/index.js'

// ── World 초기화 ─────────────────────────────────────────────────────────────

const world = new World()
const camera = world.createCamera()
world.camera = camera

// 사이드바(270px) 영역만큼 카메라 중심 오프셋
camera.transform.position.x = 135

await world.loader.load({
  girl: '../asset/image/girl_sd.png',
  sprite: '../asset/image/sprite.png',
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

// ── 캐릭터 이미지 ─────────────────────────────────────────────────────────────

const img = world.createImage({
  style: { width: 200 },
  transform: { position: { x: -100, y: 0, z: 0 }, pivot: { x: 0.5, y: 0.5 } },
})
img.attribute.src = 'girl'

// ── 애니메이션 스프라이트 ──────────────────────────────────────────────────────

const spr = world.createSprite({
  style: { width: 220 },
  transform: { position: { x: 200, y: 0, z: 0 }, pivot: { x: 0.5, y: 0.5 } },
})
spr.attribute.src = 'play'
spr.play()

// 레이블
world.createText({
  attribute: { text: 'LeviarImage' },
  style: { color: '#4a5068', fontSize: 12, textAlign: 'center' },
  transform: { position: { x: -100, y: -185, z: 0 } },
})
world.createText({
  attribute: { text: 'Sprite (animated)' },
  style: { color: '#4a5068', fontSize: 12, textAlign: 'center' },
  transform: { position: { x: 200, y: -65, z: 0 } },
})

// ── 유틸리티 ──────────────────────────────────────────────────────────────────

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T
}

function hexToRgba(hex: string, alpha = 1): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ── 스타일 반영 ───────────────────────────────────────────────────────────────

function applyStyles() {
  const borderOn  = el<HTMLInputElement>('cb-border').checked
  const outlineOn = el<HTMLInputElement>('cb-outline').checked
  const shadowOn  = el<HTMLInputElement>('cb-shadow').checked

  const borderW  = Number(el<HTMLInputElement>('border-width').value)
  const outlineW = Number(el<HTMLInputElement>('outline-width').value)
  const blurV    = Number(el<HTMLInputElement>('shadow-blur').value)
  const spreadV  = Number(el<HTMLInputElement>('shadow-spread').value)
  const oxV      = Number(el<HTMLInputElement>('shadow-ox').value)
  const oyV      = Number(el<HTMLInputElement>('shadow-oy').value)

  const borderC  = el<HTMLInputElement>('border-color').value
  const outlineC = el<HTMLInputElement>('outline-color').value
  const shadowC  = el<HTMLInputElement>('shadow-color').value

  // 이미지와 스프라이트 모두 동일하게 적용 (any 캐스팅으로 strict color type 우회)
  for (const obj of [img, spr] as any[]) {
    obj.style.borderColor      = borderOn  ? hexToRgba(borderC)        : undefined
    obj.style.borderWidth      = borderOn  ? borderW                   : undefined
    obj.style.outlineColor     = outlineOn ? hexToRgba(outlineC)       : undefined
    obj.style.outlineWidth     = outlineOn ? outlineW                  : undefined
    obj.style.boxShadowColor   = shadowOn  ? hexToRgba(shadowC, 0.9)   : undefined
    obj.style.boxShadowBlur    = shadowOn  ? blurV                     : undefined
    obj.style.boxShadowSpread  = shadowOn  ? spreadV                   : undefined
    obj.style.boxShadowOffsetX = shadowOn  ? oxV                       : undefined
    obj.style.boxShadowOffsetY = shadowOn  ? oyV                       : undefined
  }

  // 카드 활성 테두리 표시
  el('card-border') .classList.toggle('active', borderOn)
  el('card-outline').classList.toggle('active', outlineOn)
  el('card-shadow') .classList.toggle('active', shadowOn)
}

// ── 슬라이더 값 표시 + 리스너 ────────────────────────────────────────────────

function bindRange(rangeId: string, valId: string) {
  const input = el<HTMLInputElement>(rangeId)
  const valEl = el(valId)
  valEl.textContent = input.value
  input.addEventListener('input', () => {
    valEl.textContent = input.value
    applyStyles()
  })
}

bindRange('border-width',  'border-width-val')
bindRange('outline-width', 'outline-width-val')
bindRange('shadow-blur',   'shadow-blur-val')
bindRange('shadow-spread', 'shadow-spread-val')
bindRange('shadow-ox',     'shadow-ox-val')
bindRange('shadow-oy',     'shadow-oy-val')

// ── 체크박스 / 컬러 피커 리스너 ──────────────────────────────────────────────

for (const id of ['cb-border', 'cb-outline', 'cb-shadow',
                   'border-color', 'outline-color', 'shadow-color']) {
  el(id).addEventListener('change', applyStyles)
}

// ── 리셋 버튼 ────────────────────────────────────────────────────────────────

el('reset-btn').addEventListener('click', () => {
  el<HTMLInputElement>('cb-border').checked  = false
  el<HTMLInputElement>('cb-outline').checked = false
  el<HTMLInputElement>('cb-shadow').checked  = false
  applyStyles()
})

// ── 시작 ─────────────────────────────────────────────────────────────────────

world.start()
