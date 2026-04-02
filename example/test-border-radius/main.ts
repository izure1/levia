import { World } from '../../src/index.js'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const world = new World(canvas)
const camera = world.createCamera()

await world.loader.load({
  'img': '../asset/image/background.jpg',
  'vid': '../asset/video/sample.mp4',
  'sprite': '../asset/image/sprite.png',
})

world.camera = camera

// 1. 단일 픽셀 반경 측정
world.createRectangle({
  style: {
    width: 100,
    height: 100,
    color: '#ff4d4d',
    borderRadius: 20,
    boxShadowColor: 'rgba(255, 77, 77, 0.5)',
    boxShadowBlur: 10,
    boxShadowSpread: 5
  },
  transform: { position: { x: -200, y: 150, z: 0 } }
})

// 2. 4가지 값 단위 CSS 표기
world.createRectangle({
  style: {
    width: 120,
    height: 80,
    color: '#4dff4d',
    borderRadius: '10 20 40 10',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  transform: { position: { x: 0, y: 150, z: 0 } }
})

// 3. 퍼센티지 및 복합 표기
world.createRectangle({
  style: {
    width: 100,
    height: 150,
    color: '#4d4dff',
    borderRadius: '50% 10',
    boxShadowColor: '#4d4dff',
    boxShadowSpread: 20,
    boxShadowBlur: 20
  },
  transform: { position: { x: 200, y: 150, z: 0 } }
})

// 4. 그라디언트 + 두꺼운 테두리 및 그림자 복합 검증
world.createRectangle({
  style: {
    width: 200,
    height: 100,
    gradient: '45deg, #ff00cc 0%, #333399 100%',
    borderRadius: '30',
    outlineColor: '#ffffff',
    outlineWidth: 5,
    borderWidth: 5,
    borderColor: '#00ffff',
    boxShadowColor: '#ff00cc',
    boxShadowBlur: 15,
    boxShadowSpread: 10
  },
  transform: { position: { x: 0, y: -100, z: 0 } }
})

// 5. 이미지 텍스처 곡률 검증
const testImg = world.createImage({
  style: {
    width: 150,
    height: 150,
    borderRadius: '20 50%',
    boxShadowColor: 'rgba(255, 104, 104, 0.8)',
    boxShadowSpread: 10,
    boxShadowBlur: 10,
    borderWidth: 2,
    borderColor: '#00ffff',
  },
  transform: { position: { x: -200, y: -250, z: 0 } }
})
testImg.play('img')

// 6. 비디오 텍스처 곡률 검증
world.videoManager.create({
  name: 'sample_vid',
  src: 'vid',
  loop: true,
  start: 0,
})

const testVid = world.createVideo({
  style: {
    width: 150,
    height: 150,
    borderRadius: '25%',
    boxShadowColor: 'rgba(255, 104, 104, 0.8)',
    boxShadowSpread: 10,
    boxShadowBlur: 10,
    borderWidth: 2,
    borderColor: '#00ffff',
  },
  transform: { position: { x: 0, y: -250, z: 0 } }
})
testVid.play('sample_vid')

// 7. 스프라이트 텍스처 곡률 검증
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

const testSprite = world.createSprite({
  style: {
    width: 150,
    height: 150,
    borderRadius: '30 30 10 10',
    boxShadowColor: 'rgba(255, 104, 104, 0.8)',
    boxShadowSpread: 10,
    boxShadowBlur: 10,
    borderWidth: 2,
    borderColor: '#00ffff',
  },
  transform: { position: { x: 200, y: -250, z: 0 } }
})
testSprite.play('play')

world.start()
