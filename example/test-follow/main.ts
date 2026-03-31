import { World } from '../../src/index.js'

const world = new World()
const camera = world.createCamera()
world.camera = camera

// 1. 좌우로 반복 이동하는 타겟 객체
const targetItem = world.createRectangle({
  style: { color: '#ff5e5b', width: 60, height: 60 },
  transform: { position: { x: -250, y: 0, z: 0 } },
})

function moveRight() {
  targetItem.animate({ position: { x: 250 } }, 1500, 'easeInOut').on('end', moveLeft)
}
function moveLeft() {
  targetItem.animate({ position: { x: -250 } }, 1500, 'easeInOut').on('end', moveRight)
}
moveRight()

// 2. targetItem을 따라다닐 첫 번째 객체
const followerA = world.createEllipse({
  style: { color: '#00cecb', width: 40, height: 40 },
  transform: { position: { x: 0, y: 0, z: 0 } },
})
// targetItem의 좌측 아래로 80, 50만큼 떨어진 위치를 끝없이 추적
followerA.follow(targetItem, { x: -80, y: 50 })

// 3. followerA를 따라다닐 두 번째 객체 (연쇄 추적)
const followerB = world.createText({
  attribute: { text: 'Follower B' },
  style: { color: '#ffed66', fontSize: 24, fontWeight: 'bold' },
  transform: { position: { x: 0, y: 0, z: 0 } },
})
// followerA의 좌측으로 100만큼 떨어진 위치를 추적
followerB.follow(followerA, { x: -120, y: 0 })

// 4. 추적 대상 변경(덮어쓰기) 테스트
const overwriteTestText = world.createText({
  attribute: { text: '타겟 덮어쓰기 대기중 (3초 뒤 변경)' },
  style: { color: '#ffffff', fontSize: 20 },
  transform: { position: { x: 0, y: -100, z: 0 } },
})

// 처음엔 targetItem을 쫓아다님
overwriteTestText.follow(targetItem, { y: -80 })

// 3초 뒤에 followerB를 쫓아다니도록 타겟을 변경
setTimeout(() => {
  overwriteTestText.attribute.text = '타겟을 Follower B로 변경 완료!'
  overwriteTestText.style.color = '#c77dff'
  overwriteTestText.follow(followerB, { y: 60 })
}, 3000)

// 5. kick() 및 followers 속성 지정 테스트
const kickTestText = world.createText({
  attribute: { text: 'Kick 테스트 대기중... (5초 뒤 타겟이 나를 찰 예정)' },
  style: { color: '#ffaaaa', fontSize: 20 },
  transform: { position: { x: 0, y: 150, z: 0 } },
})
kickTestText.follow(targetItem, { y: 100 })

// 5초 뒤 targetItem이 자신을 따라다니는 followers 목록 중 kickTestText를 찾아 kick 함
setTimeout(() => {
  if (targetItem.followers.includes(kickTestText)) {
    targetItem.kick(kickTestText)
    kickTestText.attribute.text = '타겟에게 Kick 당했습니다! (독자적 왕복 시작)'
    kickTestText.style.color = '#888888'

    // kick 당해 분리된 후, 스스로 좌우로 왕복하는 모션 추가
    function splitMoveRight() {
      kickTestText.animate({ transform: { position: { x: '+=150' } } }, 1000, 'easeInOut').on('end', splitMoveLeft)
    }
    function splitMoveLeft() {
      kickTestText.animate({ transform: { position: { x: '-=150' } } }, 1000, 'easeInOut').on('end', splitMoveRight)
    }
    splitMoveRight()
  }
}, 5000)

world.start()
