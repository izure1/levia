## 이벤트

각 객체는 고유의 이벤트가 있습니다. 다음은 사용할 수 있는 이벤트 목록입니다.  
이벤트는 객체의 on, off, once, emit 메서드를 사용하여 관리할 수 있습니다.

```typescript
object.on('event', () => {
  console.log('event')
})

object.off('event', () => {
  console.log('event')
})

object.once('event', () => {
  console.log('event')
})

object.emit('event')
```

on, off, once, emit 메서드는 띄어쓰기로 구분하여 여러 이벤트를 동시에 등록하거나 해제할 수 있습니다.

```typescript
object.on('event1 event2', () => {
  console.log('event1 or event2')
})

object.off('event1 event2', () => {
  console.log('event1 or event2')
})

object.once('event1 event2', () => {
  console.log('event1 or event2')
})

object.emit('event1 event2')
```

매개변수의 콜백 함수에서는 각 이벤트마다 고유의 매개변수를 전달받을 수 있습니다.

### 공통 이벤트

- 'cssmodified'
  - css 속성이 변경되었을 때 발생합니다. 매개변수로 변경된 속성명, 현재값, 이전값을 받을 수 있습니다.
- 'attrmodified'
  - attribute 속성이 변경되었을 때 발생합니다. 매개변수로 변경된 속성명, 현재값, 이전값을 받을 수 있습니다.
- 'datamodified'
  - dataset 속성이 변경되었을 때 발생합니다. 매개변수로 변경된 속성명, 현재값, 이전값을 받을 수 있습니다.
- 'rotationmodified'
  - rotation 속성이 변경되었을 때 발생합니다. 매개변수로 변경된 속성명, 현재값, 이전값을 받을 수 있습니다.
- 'positionmodified'
  - position 속성이 변경되었을 때 발생합니다. 매개변수로 변경된 속성명, 현재값, 이전값을 받을 수 있습니다.
- 'scalemodified'
  - scale 속성이 변경되었을 때 발생합니다. 매개변수로 변경된 속성명, 현재값, 이전값을 받을 수 있습니다.
- 'play'
  - 재생이 시작되었을 때 발생합니다. video, sprite, particle 객체에서 사용 가능합니다.
- 'pause'
  - 재생이 일시정지되었을 때 발생합니다. video, sprite, particle 객체에서 사용 가능합니다.
- 'ended'
  - 재생이 종료되었을 때 발생합니다. video, sprite, particle 객체에서 사용 가능합니다. 이는 loop가 false일때만 호출됩니다.
- 'repeat'
  - 재생이 반복되었을 때 발생합니다. video, sprite, particle 객체에서 사용 가능합니다. 이는 loop가 true일때만 호출됩니다.
- 'click'
  - 객체를 클릭했을 때 발생합니다. 매개변수로 마우스 이벤트를 전달받습니다.
- 'dblclick'
  - 객체를 더블 클릭했을 때 발생합니다. 매개변수로 마우스 이벤트를 전달받습니다.
- 'contextmenu'
  - 객체를 우클릭했을 때 발생합니다. 매개변수로 마우스 이벤트를 전달받습니다.
- 'mousedown'
  - 마우스 버튼을 눌렀을 때 발생합니다. 매개변수로 마우스 이벤트를 전달받습니다.
- 'mouseup'
  - 마우스 버튼을 뗐을 때 발생합니다. 매개변수로 마우스 이벤트를 전달받습니다.
- 'mousemove'
  - 마우스를 움직였을 때 발생합니다. 매개변수로 마우스 이벤트를 전달받습니다.
- 'mouseover'
  - 마우스가 객체 위로 올라갔을 때 발생합니다. 매개변수로 마우스 이벤트를 전달받습니다.
- 'mouseout'
  - 마우스가 객체 밖으로 나갔을 때 발생합니다. 매개변수로 마우스 이벤트를 전달받습니다.

## 전역 이벤트

아래와 같은 방식으로 전역 이벤트를 등록할 수 있습니다.

```typescript
const world = new World()

world.on('event', () => {
  console.log('event')
})

world.off('event', () => {
  console.log('event')
})

world.once('event', () => {
  console.log('event')
})

world.emit('event')
```

특정 객체에서 발생한 이벤트를 전역에서 받아 수신할 수 있습니다.
전역 on, off, once 메서드는 첫번째 매개변수로 객체를 받습니다.

```typescript
const world = new World()
const obj = world.createRectangle()

world.on('click', (obj, e) => {
  console.log('click', obj, e)
})
```

만일 특정 객체에서 발생한 마우스 이벤트를 e.stopPropagation()으로 막으면 전역에서 해당 이벤트를 수신할 수 없습니다.
이벤트의 우선순위는 객체 -> 월드 순입니다.

```typescript
const world = new World()
const obj = world.createRectangle()

world.on('click', (obj, e) => {
  console.log('click', obj, e)
})

obj.on('click', (e) => {
  e.stopPropagation()
})
```

만일 월드를 클릭했지만, 객체를 클릭하지 않았을 경우, obj는 undefined가 됩니다.