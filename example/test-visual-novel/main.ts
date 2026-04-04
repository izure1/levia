import { World } from '../../src/index.js'
import { Visualnovel } from '../../helpers/Visualnovel.js'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const world = new World({ canvas })
const camera = world.createCamera()
world.camera = camera

// 에셋 미리 로드
await world.loader.load({
  'bg': '../asset/image/background.jpg',
  'girl_before': '../asset/image/transition_before.png',
  'dust': '../asset/image/star.png' // 임시: 프리셋에서 인식할 수 있는 dust 이미지로 사용 
})

// Visualnovel 인스턴스 생성
const vn = new Visualnovel(world, {
  width: canvas.width,
  height: canvas.height,
  depth: 500
})

// 파티클 설정 (미리 정의)
world.particleManager.create({
  name: 'dust',
  src: 'dust',
  impulse: 0.01,
  rate: 5,
  lifespan: 10000,
  interval: 250,
  size: { start: { min: 0.5, max: 1 }, end: { min: 0, max: 0.5 } },
  spawnX: canvas.width * 2,
  spawnY: canvas.height * 2,
  spawnZ: 100,
  loop: true,
})

// 씬 연출 시작
vn.setBackground('bg', 'cover')
  .setMood('sunset')
  .addEffect('dust', 'light')
  .addCharacter('girl_before', 'center')
  .addOverlay('테스트 씬이 시작되었습니다...', 'caption')

// 화면을 검게 암전시킨 후, 서서히 나타남
vn.screenFade('out', 'black', 0)
setTimeout(() => {
  vn.screenFade('in', 'black', 1500)
}, 500)

let step = 0
world.on('click', () => {
  step++

  if (step === 1) {
    vn.clearOverlay()
    vn.addOverlay('선생님이 다가옵니다!', 'title')
    vn.focusCharacter('center', 'medium', 1000)
    vn.screenFlash('white')
  }
  else if (step === 2) {
    vn.clearOverlay()
    vn.addOverlay('밤이 되었습니다.', 'caption')
    vn.setMood('night')
    vn.addLight('spot', { style: { width: 500, height: 500 } })
    // vn.setFlicker('candle') // 조명 생성 후 깜빡임 적용 가능
  }
  else if (step === 3) {
    vn.screenWipe('left', 800)
    setTimeout(() => {
      vn.clear()
      vn.setBackground('bg', 'cover')
      vn.setMood('none')
      vn.addOverlay('씬이 초기화되었습니다.', 'caption')
      vn.screenFade('in', 'black', 500)
    }, 800)
  }
})

world.start()
