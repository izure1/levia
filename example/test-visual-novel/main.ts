import { World } from '../../src/index.js'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const world = new World({ canvas })
const camera = world.createCamera({
  transform: {
    position: {
      y: 200
    }
  }
})
world.camera = camera

// 더미 백그라운드 이미지 로드 (없다면 빈 화면이 나옴)
await world.loader.load({
  'bg': '../asset/image/background.jpg',
  'star': '../asset/image/star.png',
  'girl_before': '../asset/image/transition_before.png',
  'coin': '../asset/image/sprite.png'
})

// 패닝(Parallax) 시 배경 가장자리의 빈 공간이 드러나지 않도록 원래 캔버스 크기보다 20% 더 크게 그립니다.
const bgWidth = camera.calcDepthRatio(500, canvas.width * 1.2)
const bgHeight = camera.calcDepthRatio(500, canvas.height * 1.2)

// 1. 꽉 찬 이미지 배경
const bgImage = world.createImage({
  style: {
    width: bgWidth,
    height: bgHeight,
  },
  transform: {
    position: {
      z: 500
    }
  }
})
bgImage.attr({ src: 'bg' })

// 캐릭터 이미지
const girl = world.createImage({
  style: {
    width: 500,
  },
  transform: {
    position: {
      z: 0,
    }
  }
})
girl.attr({ src: 'girl_before' })

// 대사창 좌표
const talkBoxW = 800
const talkBoxH = 150
const talkBoxPos = camera.canvasToLocal(0, canvas.height)

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
    textShadowColor: '#000',
    textShadowBlur: 1,
    textShadowOffsetX: 1,
    textShadowOffsetY: 1,
  },
  transform: {
    pivot: { x: 0, y: 1 },
    position: { x: 20, y: 0 }
  }
})

// 4. 코인 추가
world.spriteManager.create({
  name: 'coin',
  src: 'coin',
  frameWidth: 44,
  frameHeight: 40,
  frameRate: 10,
  loop: true,
  start: 0,
  end: 10,
})

const coin = world.createSprite({
  style: {
    width: 32,
  },
  transform: {
    position: { z: 100 }
  }
}).attr({ src: 'coin' }).play()

Object.assign(coin.transform.position, camera.canvasToLocal(canvas.width - 100, 30))

const coinText = world.createText({
  attribute: { text: 'x <style fontSize="24">100</style>' },
  style: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
    borderWidth: 2,
    borderColor: '#000',
  },
  transform: {
    position: { z: 100 }
  }
}).follow(coin, { x: 55 })

world.particleManager.create({
  name: 'mouse-particle',
  src: 'star',
  impulse: 0.1,
  rate: 1,
  lifespan: 600,
  interval: 50,
  loop: true,
})

world.particleManager.create({
  name: 'dust-particle',
  src: 'star',
  impulse: 0.01,
  rate: 5,
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
  spawnX: canvas.width * 2,
  spawnY: canvas.height * 2,
  spawnZ: 100,
  loop: true,
})

const mouseParticle = world.createParticle({
  attribute: {
    physics: 'dynamic',
    gravityScale: 3,
  },
  style: {
    width: 35,
    height: 35,
    zIndex: 3,
    blendMode: 'lighter',
  },
  transform: {
    position: { x: 0, y: 0, z: 100 }
  }
}).play('mouse-particle')

world.createParticle({
  strict: true,
  attribute: {
    physics: 'dynamic',
    density: 1,
    friction: 0,
    frictionAir: 0,
    gravityScale: 0,
  },
  style: {
    width: 5,
    height: 5,
    zIndex: 3,
    blendMode: 'lighter',
  },
  transform: {
    position: camera.canvasToWorld(canvas.width / 2, canvas.height / 2)
  }
}).play('dust-particle')

camera.addChild(talkBox)
camera.addChild(mouseParticle)
camera.addChild(coin)
camera.addChild(coinText)
talkBox.addChild(dialogue)

world.on('click', () => {
  console.log(dialogue.transition(dialogText, 35))
})

let targetCamX = 0
let targetCamY = 0

world.on('mousemove', (obj, e) => {
  const pos = camera.canvasToLocal(e.offsetX, e.offsetY)
  mouseParticle.transform.position.x = pos.x
  mouseParticle.transform.position.y = pos.y

  // 화면 크기 기준 정규화 좌표 (-1 ~ 1)
  const normX = (e.offsetX / canvas.width) * 2 - 1
  const normY = (e.offsetY / canvas.height) * 2 - 1

  targetCamX = normX * 100
  targetCamY = (-normY * 100) + 200
})

world.on('update', () => {
  camera.transform.position.x += (targetCamX - camera.transform.position.x) * 0.05
  camera.transform.position.y += (targetCamY - camera.transform.position.y) * 0.05
})

world.start()
