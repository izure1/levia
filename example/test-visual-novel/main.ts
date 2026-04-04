import { World } from '../../src/index.js'
import { Visualnovel } from '../../helpers/Visualnovel.js'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const world = new World({ canvas })
const camera = world.createCamera()
world.camera = camera
world.gravity.x = 0.2

// 에셋 미리 로드
await world.loader.load({
  'bg': '../asset/image/background.jpg',
  'girl_before': '../asset/image/transition_before.png',
  'dust': '../asset/image/star.png',
  'rain': '../asset/image/rain.png',
  'snow': '../asset/image/snow.png',
  'sakura': '../asset/image/sakura.png',
  'fog': '../asset/image/fog.png',
})

// Visualnovel 인스턴스 생성
const vn = new Visualnovel(world, {
  width: canvas.width,
  height: canvas.height,
  depth: 500
})


// 씬 연출 시작
vn.setBackground('bg', 'cover')
  .setMood('sunset')
  .addEffect('snow', 100)
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
