## 비디오

비디오는 비디오 영상을 재생하는 객체입니다. 다음과 같이 사용합니다.

```typescript
import { World } from 'lve4'

const world = new World()

await world.loader.loadAssets({
  'my-video': './video/my-video.mp4',
})

world.videoManager.create({
  name: 'video',
  src: 'my-video',
  loop: true,
  start: 0, // video start time (ms)
  end: 10000 // video end time (ms)
})

const video = world.createVideo({
  attribute: {
    name: 'video-object',
  },
  style: {
    width: 100,
    height: 100,
  },
})

video.play('video')
```

style.width, style.height가 지정되지 않을 경우, 비디오의 원본 크기를 사용합니다.