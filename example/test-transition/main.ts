import { World } from '../../src/index.js'

const world = new World()
const camera = world.createCamera()
world.camera = camera

// 에셋 로드
await world.loader.load({
  'transition_before': '../asset/image/transition_before.png',
  'transition_after': '../asset/image/transition_after.png',
  'mummy': '../asset/image/mummy.png',
})

// 이미지 생성
const image = world.createImage({
  style: {
    height: 1000,
  },
  transform: {
    position: { x: 0, y: 0, z: 0 }
  }
})

const textObj = world.createText({
  attribute: { text: '이미지 클릭!' },
  style: { color: '#ffffff', fontSize: 40, textAlign: 'center', borderColor: '#ae00ffff', borderWidth: 5, lineHeight: 1.5 },
  transform: { position: { y: -250 } },
})

image.attribute.src = 'transition_before'
image.addChild(textObj)

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
  const nextText = isToggled ? '새로운 텍스트가 여러 줄로\n서서히 등장해야 합니다.\n<style color="yellow" letterSpacing="10">스타일 태그</style>도 가능!' : '이미지 클릭!'

  // 1초(1000ms) 동안 크로스페이드
  image.transition(nextSrc, 1000).on('end', () => {
    console.log('이미지 전환 완료!')
  })

  // 글자 단위로 50ms의 타이핑 속도를 적용해 텍스트 그라데이션 전환 효과
  textObj.transition(nextText, 50).on('end', () => {
    console.log('텍스트 전환 완료!')
  })
})

world.start()
