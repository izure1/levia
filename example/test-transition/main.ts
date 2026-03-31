import { World } from '../../src/index.js'

const world = new World()
const camera = world.createCamera()
world.camera = camera

// 에셋 로드
await world.loader.load({
  'transition_before': '../asset/image/transition_before.png',
  'transition_after': '../asset/image/transition_after.png',
})

// 안내 텍스트
world.createText({
  attribute: { text: '이미지를 클릭하면 크로스페이드가 실행됩니다.' },
  style: { color: '#ffffff', fontSize: 20, textAlign: 'center' },
  transform: { position: { x: -200, y: -180, z: 0 } },
})

// 이미지 생성
const image = world.createImage({
  transform: {
    position: { x: -300, y: -100, z: 0 }
  }
})

image.play('transition_before')

// 회전 및 스케일 애니메이션 추가 (반복)
function startPulse() {
  image.animate({
    transform: { scale: { x: 1.2, y: 1.2 } }
  }, 1000, 'easeInOutQuad').on('end', () => {
    image.animate({
      transform: { scale: { x: 1.0, y: 1.0 } }
    }, 1000, 'easeInOutQuad').on('end', startPulse)
  })
}
startPulse()

// 매 프레임 지속적 회전
world.on('update', () => {
  image.transform.rotation.z += 1
})

// 클릭 이벤트로 트랜지션 실행
let isToggled = false

image.on('click', (e) => {
  e.stopImmediatePropagation()
  isToggled = !isToggled
  const nextSrc = isToggled ? 'transition_after' : 'transition_before'

  // 1초(1000ms) 동안 크로스페이드
  image.transition(nextSrc, 1000)
})

world.start()
