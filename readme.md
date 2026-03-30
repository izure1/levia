# Lve4

해당 프로젝트는 WebGL을 이용한 2.5D 렌더링 엔진을 구현하는 프로젝트입니다.

패럴랙스 스크롤링을 구현하기 위해 카메라가 있고, 2D 이미지를 3D로 렌더링하는 것이 목표입니다.

카메라는 2D 평면을 바라보지만, 3D 공간에 떠 있는 2D 이미지들을 렌더링합니다.

카메라의 이동에 따라 2D 이미지들이 3D 공간에서 이동하며, 이를 통해 패럴랙스 스크롤링 효과를 구현합니다.

## 간단한 사용 방법

```typescript
import { World } from 'lve4'

const world = new World()
const loader = world.createLoader()

// load, loading, loaded, error, complete 이벤트가 있습니다.
// load: 로드 시작
// loading: 개별 에셋 로드 시작
// loaded: 개별 에셋 로드 완료
// error: 개별 에셋 로드 실패
// complete: 모든 로드가 완료되었을 때
loader.on('loaded', (assets) => {
  console.log(assets)
})

await loader.load({
  'my-image': 'https://example.com/image.png',
  'my-video': 'https://example.com/video.mp4',
  'my-sprite': 'https://example.com/sprite.png',
  'my-particle': 'https://example.com/particle.png',
})

// 각 요소는 3D 공간에 배치됩니다.
const camera = world.createCamera()
const image = world.createImage({
  src: 'my-image',
})

image.transform.position.x = 100
image.transform.position.y = 100
image.transform.position.z = 100

world.start()
```

## 렌더링 요소

다음 [문서](./docs/object.md)를 확인하십시오.

## 텍스트 요소

다음 [문서](./docs/text.md)를 확인하십시오.

## 스프라이트 요소

다음 [문서](./docs/sprite.md)를 확인하십시오.

## 파티클 요소

다음 [문서](./docs/particle.md)를 확인하십시오.

## 물리엔진

다음 [문서](./docs/physics.md)를 확인하십시오.

## 빌드

빌드는 esbuild를 활용합니다.

## 개발 환경

현재는 canvas2d를 활용하여 개발되고 있으나, 향후 webgl로 변경될 예정입니다. 이를 고려하여 개발하십시오.
