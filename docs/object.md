## 렌더링 요소

그릴 수 있는 요소는 다음과 같습니다.

- camera
- ellipse
- rectangle
- text
- image (asset)
- video (asset)
- sprite (asset)
- particle (asset)

asset 이 포함된 요소는, 렌더링 시 asset을 로드하여 렌더링합니다.
asset은 loader를 통해 로드할 수 있습니다.

## 요소의 공통 속성

각 렌더링 요소는 attribute, dataset, style, transform 속성을 가집니다.

- attribute: 요소의 속성을 정의합니다. html의 attribute와 비슷하게, 요소의 속성을 정의합니다.
  - `type`: 문자열. 요소의 타입을 정의합니다. 위에서 언급된 camera, ellipse, rectangle, text, image, video, sprite, particle 등.
  - `id`: 문자열. 요소의 id를 정의합니다. uuid4로 자동 생성됩니다.
  - `name`: 문자열. 요소의 이름을 정의합니다. 선택자로 선택할 수 있습니다.
  - `className`: 문자열. 요소의 class를 정의합니다. 띄어쓰기로 여러개를 지정할 수 있습니다. 선택자로 선택할 수 있습니다.
  - `text`: 문자열. 요소의 텍스트를 정의합니다. text 요소만 해당됩니다.
  - `physics`: 문자열 또는 null. 요소의 물리엔진 바디 타입을 정의합니다. null이면 물리엔진을 적용하지 않습니다. 기본값은 'null'입니다.
    - `dynamic`: 동적 바디. 물리엔진에 의해 움직입니다.
    - `static`: 정적 바디. 물리엔진에 의해 움직이지 않습니다.
  - `density`: 숫자. 요소의 밀도를 정의합니다. 물리엔진에 영향을 줍니다.
  - `friction`: 숫자. 요소의 마찰력을 정의합니다. 물리엔진에 영향을 줍니다.
  - `restitution`: 숫자. 요소의 복원력을 정의합니다. 물리엔진에 영향을 줍니다.
  - `fixedRotation`: 불리언. 요소의 회전을 고정합니다. 물리엔진에 영향을 줍니다.
  - `gravityScale`: 숫자. 요소의 중력 스케일을 정의합니다. 물리엔진에 영향을 줍니다.
  - `collisionGroup`: 숫자. 요소의 충돌 그룹을 정의합니다. 물리엔진에 영향을 줍니다.
  - `collisionMask`: 숫자. 요소의 충돌 마스크를 정의합니다. 물리엔진에 영향을 줍니다.
  - `collisionCategory`: 숫자. 요소의 충돌 카테고리를 정의합니다. 물리엔진에 영향을 줍니다.
- dataset: 요소의 데이터를 정의합니다. html의 dataset과 비슷하게, 사용자 정의 데이터를 보관하는 용도입니다.
  - `key`: 문자열. 요소의 데이터를 정의합니다.
  - `value`: 문자열, 숫자, 불리언, 객체, 배열 등. 요소의 데이터를 정의합니다.
- style: 요소의 스타일을 정의합니다. css의 style과 비슷하게, 요소의 스타일을 정의합니다.
  - `color`: 문자열, hex, rgb, rgba, hsl, hsla. css의 color와 동일한 형식을 사용합니다. 요소의 색상을 정의합니다.
  - `opacity`: 숫자. 0 ~ 1 사이의 값을 가집니다. 요소의 투명도를 정의합니다.
  - `width`: 숫자. 요소의 너비를 정의합니다.
  - `height`: 숫자. 요소의 높이를 정의합니다.
  - `blur`: 숫자. 요소의 블러를 정의합니다.
  - `borderColor`: 문자열, hex, rgb, rgba, hsl, hsla. css의 color와 동일한 형식을 사용합니다. 요소의 테두리 색상을 정의합니다.
  - `borderWidth`: 숫자. 요소의 테두리 두께를 정의합니다.
  - `fontSize`: 숫자. 요소의 폰트 크기를 정의합니다. text 요소만 해당됩니다.
  - `fontFamily`: 문자열. 요소의 폰트 패밀리를 정의합니다. 쉼표로 구분하여 여러 폰트를 지정하여 우선순위를 정할 수 있습니다. text 요소만 해당됩니다.
  - `fontWeight`: 문자열, 숫자. 요소의 폰트 두께를 정의합니다. text 요소만 해당됩니다.
  - `fontStyle`: 문자열. normal, italic. 기본값은 normal입니다. 요소의 폰트 스타일을 정의합니다. text 요소만 해당됩니다.
  - `textAlign`: 문자열. left, center, right. 기본값은 left입니다. 요소의 텍스트 정렬을 정의합니다. text 요소만 해당됩니다.
  - `lineHeight`: 숫자. 요소의 줄 높이를 정의합니다. 기본값은 1입니다. 해당 문자열의 가장 큰 fontSize값을 기준으로 배수로 계산됩니다. 예를 들어 fontSize가 10이고, lineHeight가 2이면, 줄 높이는 20이 됩니다. text 요소만 해당됩니다.
  - `display`: 문자열. 요소의 표시 여부를 정의합니다. 기본값은 'block'입니다.
    - `block`: 블록 요소. 요소의 너비를 100%로 설정합니다.
    - `none`: 요소가 렌더링되지 않으며, 마우스 이벤트에 반응하지 않습니다.
  - `opacity`: 숫자. 0 ~ 1 사이의 값을 가집니다. 요소의 투명도를 정의합니다. 0이면 완전히 투명하고, 1이면 완전히 불투명합니다. 값으로 0을 넣을 경우, 객체가 월드에서 보이진 않겠지만 완전히 사라진 것은 아닙니다. 따라서 물리 효과를 받으며 다른 객체와 충돌도 합니다. 마우스 이벤트도 정상적으로 수신됩니다.
  - `pointerEvents`: 불리언. 요소의 마우스 이벤트 반응 여부를 정의합니다. 기본값은 true입니다.
    - `true`: 요소가 마우스 이벤트에 반응합니다.
    - `false`: 요소가 마우스 이벤트에 반응하지 않습니다.
  - `margin`: 문자열. 요소의 마진을 정의합니다. 물리 객체의 여백을 지정합니다. 해당 객체가 물리 효과를 받고 있을 경우, 이 객체의 주변에 값만큼 빈 공간이 생깁니다. 다른 물리 객체는 이 여백을 침투할 수 없습니다.
    - `"10"`: 모든 방향으로 10px의 마진을 설정합니다.
    - `"10 20"`: 위쪽과 아래쪽으로 10, 왼쪽과 오른쪽으로 20의 마진을 설정합니다.
    - `"10 20 30"`: 위쪽으로 10, 왼쪽과 오른쪽으로 20, 아래쪽으로 30의 마진을 설정합니다.
    - `"10 20 30 40"`: 위쪽으로 10, 오른쪽으로 20, 아래쪽으로 30, 왼쪽으로 40의 마진을 설정합니다.
  - `shadowColor`: 문자열. 요소의 그림자 색상을 정의합니다. css의 color와 동일한 형식을 사용합니다.
  - `shadowBlur`: 숫자. 요소의 그림자 블러를 정의합니다.
  - `shadowOffsetX`: 숫자. 요소의 그림자 x축 오프셋을 정의합니다.
  - `shadowOffsetY`: 숫자. 요소의 그림자 y축 오프셋을 정의합니다.
  - `zIndex`: 객체의 렌더링 순서를 정의합니다. 숫자가 클수록 위에 렌더링됩니다.
    - transform.position.z 속성과 다른 점은, 동일한 transform.position.z 값을 가진 객체들 사이에서 우선순위를 정할 수 있다는 점입니다. style.zIndex 값이 높더라도, transform.position.z 값이 더 낮다면 렌더링 순위가 낮아집니다.
  - `blendMode`: 객체를 그려넣을 때, 색상 합성 방식을 지정합니다. https://developer.mozilla.org/ko/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation 을 참조하십시오.
- transform: 요소의 변환을 정의합니다. 3d 공간에서의 변환을 정의합니다.
  - `position`: 객체. 요소의 위치를 정의합니다.
    - `x`: 숫자. 요소의 x축 위치를 정의합니다.
    - `y`: 숫자. 요소의 y축 위치를 정의합니다.
    - `z`: 숫자. 요소의 z축 위치를 정의합니다.
  - `rotation`: 객체. 요소의 회전을 정의합니다.
    - `x`: 숫자. 요소의 x축 회전을 정의합니다.
    - `y`: 숫자. 요소의 y축 회전을 정의합니다.
    - `z`: 숫자. 요소의 z축 회전을 정의합니다.
  - `scale`: 객체. 요소의 크기를 정의합니다.
    - `x`: 숫자. 요소의 x축 크기를 정의합니다.
    - `y`: 숫자. 요소의 y축 크기를 정의합니다.
    - `z`: 숫자. 요소의 z축 크기를 정의합니다.

다음과 같이 사용합니다.

```typescript
const rect = world.createRectangle({
  attribute: {
    name: 'my-rectangle',
    class: 'my-class',
  },
  dataset: {
    key: 'my-dataset',
    value: 'my-value',
  },
  style: {
    color: 'red',
    opacity: 0.5,
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  transform: {
    position: {
      x: 100,
      y: 100,
      z: 100,
    },
    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },
    scale: {
      x: 1,
      y: 1,
      z: 1,
    },
  },
})
```

또는 다음과 같이 속성을 변경할 수 있습니다.

```typescript
rect.attribute.name = 'my-rectangle'
rect.attribute.class = 'my-class'
rect.dataset.key = 'my-dataset'
rect.dataset.value = 'my-value'
rect.style.color = 'red'
rect.style.opacity = 0.5
rect.style.width = 100
rect.style.height = 100
rect.style.borderRadius = 10
rect.transform.position.x = 100
rect.transform.position.y = 100
rect.transform.position.z = 100
rect.transform.rotation.x = 0
rect.transform.rotation.y = 0
rect.transform.rotation.z = 0
rect.transform.scale.x = 1
rect.transform.scale.y = 1
rect.transform.scale.z = 1
```

각 요소마다 기본값은 정해져있습니다.


### 카메라

카메라 요소는 렌더링되지는 않지만, 일반적인 객체와 동일한 취급을 받습니다. 따라서 물리엔진의 영향을 받으며, 다른 모든 요소를 활용할 수 있습니다.
