import { World } from '../../src/index.js'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const world = new World({ canvas })
const camera = world.createCamera()
world.camera = camera

// 더미 백그라운드 이미지 로드 (없다면 빈 화면이 나옴)
await world.loader.load({
  'bg': '../asset/image/background.jpg'
})

// 카메라 z 위치
const camZ = camera.transform.position.z

// 배경을 Z: 0에 배치한다고 가정하고 필요한 캔버스 비율(꽉 찬 크기) 계산
const vw = world.calcDepthRatio(camZ, 0, canvas.width)
const vh = world.calcDepthRatio(camZ, 0, canvas.height)

// 마우스를 움직이면 좌우로 5%씩 움직일 수 있도록 하기 위해 10% 만큼 더 넓게 설정
const bgWidth = world.calcDepthRatio(camZ, 10, canvas.width)
const bgHeight = world.calcDepthRatio(camZ, 10, canvas.height)

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
const talkBoxPos = world.canvasToWorld(0, canvas.height)

// 2. 그라디언트 대사창 Rectangle 생성
const talkBox = world.createRectangle({
  style: {
    width: talkBoxW,
    height: talkBoxH,
    // 위에서 아래로 투명도 변화
    gradient: '180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%',
    zIndex: 10
  },
  transform: {
    pivot: { x: 0, y: 1 },
    position: { x: -talkBoxW / 2, y: talkBoxPos.y }
  }
})

console.log(talkBox)

// 3. 텍스트 추가
const padding = 20
const textWidth = talkBoxW - (padding * 2)
const textHeight = talkBoxH - padding

const dialogText = `<style color="#ffb570ff" borderWidth="1" borderColor="#ffffffff" fontSize="24" fontWeight="600">주인공</style>\n\n<style color="#dddddd" fontSize="16" lineHeight="1.5">이곳은 대사창입니다.\ncalcDepthRatio를 사용해 캔버스를 꽉 채우고,\ngradient를 주어 비주얼 노벨 느낌을 구현했습니다.</style>`
const dialogue = world.createText({
  attribute: {
    text: dialogText
  },
  style: {
    width: textWidth,
    height: textHeight,
    zIndex: 20
  },
  transform: {
    pivot: { x: 0, y: 1 },
    position: { x: 20, y: 0 }
  }
})

talkBox.addChild(dialogue)

// 창 크기가 변경될 때 비율 다시 맞추기 (선택)
window.addEventListener('resize', () => {
  const newW = world.calcDepthRatio(camZ, 0, canvas.width)
  const newH = world.calcDepthRatio(camZ, 0, canvas.height)
  const newBoxH = world.calcDepthRatio(camZ, 0, canvas.height * 0.3)

  bgImage.style.width = newW
  bgImage.style.height = newH

  talkBox.style.width = newW
  talkBox.style.height = newBoxH
  talkBox.transform.position.y = -(newH / 2) + (newBoxH / 2)

  const p = world.calcDepthRatio(camZ, 0, 40)
  dialogue.style.width = newW - (p * 2)
  dialogue.style.height = newBoxH - p
  dialogue.transform.position.y = -(newH / 2) + (newBoxH / 2) - (p / 4)
})

world.on('click', () => {
  console.log(dialogue.transition(dialogText, 35))

})

world.start()
