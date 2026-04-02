import { World } from '../../src/index.js'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const world = new World({ canvas })
const camera = world.createCamera()
world.camera = camera

world.setGravity({ x: 0, y: -1 })

// 더미 백그라운드 이미지 로드 (없다면 빈 화면이 나옴)
await world.loader.load({
  'bg': '../asset/image/background.jpg',
  'star': '../asset/image/star.png'
})

// 카메라 z 위치
const camZ = camera.transform.position.z

// 배경을 Z: 0에 배치한다고 가정하고 필요한 캔버스 비율(꽉 찬 크기) 계산
const vw = camera.calcDepthRatio(0, canvas.width)
const vh = camera.calcDepthRatio(0, canvas.height)

// 마우스를 움직이면 좌우로 5%씩 움직일 수 있도록 하기 위해 10% 만큼 더 넓게 설정
const bgWidth = camera.calcDepthRatio(10, canvas.width)
const bgHeight = camera.calcDepthRatio(10, canvas.height)

// 1. 꽉 찬 이미지 배경
const bgImage = world.createImage({
  style: {
    width: bgWidth,
    height: bgHeight
  }
})
bgImage.play('bg')

// 대사창 좌표
const talkBoxW = 800
const talkBoxH = 150
const talkBoxPos = camera.canvasToWorld(0, canvas.height)

// 2. 그라디언트 대사창 Rectangle 생성
const talkBox = world.createRectangle({
  style: {
    width: talkBoxW,
    height: talkBoxH,
    // 위에서 아래로 투명도 변화
    gradient: '180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 50%',
    zIndex: 1
  },
  transform: {
    pivot: { x: 0, y: 1 },
    position: { x: -talkBoxW / 2, y: talkBoxPos.y, z: 100 }
  }
})

console.log(talkBox)

// 3. 텍스트 추가
const padding = 20
const textWidth = talkBoxW - (padding * 2)
const textHeight = talkBoxH - padding

const dialogText = `<style color="#ffb570ff" borderWidth="1" fontSize="20" fontWeight="600" letterSpacing="3">주인공</style>\n\n<style color="#dddddd" fontSize="16" lineHeight="1.5">이곳은 대사창입니다.\n<style color="#ffb570ff" fontSize="16" letterSpacing="1">calcDepthRatio</style>를 사용해 캔버스를 꽉 채우고,\ngradient를 주어 비주얼 노벨 느낌을 구현했습니다.</style>`
const dialogue = world.createText({
  attribute: {
    text: dialogText
  },
  style: {
    fontFamily: 'sans-serif, arial',
    width: textWidth,
    height: textHeight,
    zIndex: 2,
  },
  transform: {
    pivot: { x: 0, y: 1 },
    position: { x: 20, y: 0 }
  }
})

world.particleManager.create({
  name: 'mouse-particle',
  src: 'star',
  impulse: 0.15,
  rate: 1,
  lifespan: 1000,
  interval: 100,
  loop: true,
})

world.particleManager.create({
  name: 'dust-particle',
  src: 'star',
  impulse: 0.15,
  rate: 1,
  lifespan: 10000,
  interval: 250,
  size: {
    start: {
      min: 0.5,
      max: 1,
    },
    end: {
      min: 0,
      max: 0.5,
    }
  },
  spawnX: canvas.width,
  spawnY: canvas.height,
  spawnZ: 100,
  loop: true,
})

const mouseParticle = world.createParticle({
  strict: true,
  attribute: {
    physics: 'dynamic',
    gravityScale: 0.1,
  },
  style: {
    width: 15,
    height: 15,
    zIndex: 3,
    blendMode: 'lighter',
  },
  transform: {
    position: { x: 0, y: 0, z: 100 }
  }
}).play('mouse-particle')

const dustParticle = world.createParticle({
  strict: true,
  attribute: {
    physics: 'dynamic',
    density: 0.00001,
    friction: 0.001,
    gravityScale: 0,
  },
  style: {
    width: 2,
    height: 2,
    zIndex: 3,
    blendMode: 'lighter',
  },
  transform: {
    position: { x: 0, y: 0, z: 100 }
  }
}).play('dust-particle')

camera.addChild(talkBox)
camera.addChild(mouseParticle)
camera.addChild(dustParticle)
talkBox.addChild(dialogue)

// 창 크기가 변경될 때 비율 다시 맞추기 (선택)
window.addEventListener('resize', () => {
  const newW = camera.calcDepthRatio(0, canvas.width)
  const newH = camera.calcDepthRatio(0, canvas.height)
  const newBoxH = camera.calcDepthRatio(0, canvas.height * 0.3)

  bgImage.style.width = newW
  bgImage.style.height = newH

  talkBox.style.width = newW
  talkBox.style.height = newBoxH
  talkBox.transform.position.y = -(newH / 2) + (newBoxH / 2)

  const p = camera.calcDepthRatio(0, 40)
  dialogue.style.width = newW - (p * 2)
  dialogue.style.height = newBoxH - p
  dialogue.transform.position.y = -(newH / 2) + (newBoxH / 2) - (p / 4)
})

world.on('click', () => {
  console.log(dialogue.transition(dialogText, 35))
})

world.on('mousemove', (obj, e) => {
  const pos = camera.canvasToWorld(e.offsetX, e.offsetY)
  mouseParticle.transform.position.x = pos.x
  mouseParticle.transform.position.y = pos.y
})

world.start()
