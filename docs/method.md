# Method (메서드) 가이드

안녕하세요! **Method**는 객체가 수행할 수 있는 **구체적인 행동**입니다. 레비아 엔진은 개발자가 코드를 통해 객체를 정밀하게 제어할 수 있도록 강력하고 직관적인 메서드들을 제공합니다.

---

## 📋 1. 객체 공용 메서드 (Common Methods)

모든 객체(`LveObject`)가 공통적으로 사용할 수 있는 핵심 기능들입니다.

### ✨ 상태 및 시각 효과
-  **animate(target: AnimateTarget, duration: number, easing: EasingType = 'linear'): Animation**
   객체의 속성을 목표값까지 부드럽게 변화시킵니다.
   - `target`: 변경할 속성(style, transform, dataset)과 목표값을 담은 객체입니다. `+=`, `-=` 등의 연산자를 사용할 수 있습니다.
   - `duration`: 애니메이션이 지속될 시간(ms)입니다.
   - `easing`: 움직임의 가속도 조절 함수 이름입니다. (기본값: `'linear'`)
   - **반환값**: 제어 가능한 `Animation` 객체를 반환합니다.

-  **fadeIn(durationMs: number, easing?: EasingType): FadeTransition**
   객체를 투명도 0에서 1로 서서히 나타나게 합니다.
   - **작동 방식**: 호출 즉시 `style.display`를 `'block'`으로 설정한 후 투명도 애니메이션을 시작합니다.
   - **중요**: 이때의 투명도는 `style.opacity` 값을 최대치(100%)로 보고 계산합니다. 예를 들어 `style.opacity`가 `0.5`라면, 최종적으로는 `0.5` 만큼만 밝아집니다.
   - **반환값**: `FadeTransition` 객체를 반환합니다.

-  **fadeOut(durationMs: number, easing?: EasingType): FadeTransition**
   객체를 투명도 1에서 0으로 서서히 사라지게 합니다.
   - **작동 방식**: 애니메이션이 완료되면 `style.display`를 `'none'`으로 자동 전환합니다. 이 시점부터는 물리 엔진의 충돌 계산에서도 제외됩니다.
   - **중요**: 현재 설정된 `style.opacity` 값에서부터 서서히 투명해집니다.
   - **반환값**: `FadeTransition` 객체를 반환합니다.

-  **remove(options?: { follower?: boolean; child?: boolean }): this**
   객체를 월드와 메모리에서 안전하게 제거합니다.
   - `options.child`: `true`로 설정하면 모든 자식 객체도 함께 제거합니다. (기본값: `false`)
   - `options.follower`: `true`로 설정하면 자신을 따라다니는 객체(`follow`)들도 함께 제거합니다. (기본값: `false`)
   - **부수 효과**: 월드에서 제외됨과 동시에 물리 바디도 삭제됩니다.

### 🏷️ 클래스 및 상태 확인
-  **hasClass(classNames: string): boolean**
   객체가 특정 클래스 이름을 가지고 있는지 확인합니다. 공백으로 구분하여 여러 개를 동시에 체크할 수 있으며, 모두 포함하고 있을 때만 `true`를 반환합니다.
-  **addClass(classNames: string): this**
   객체에 하나 이상의 클래스 이름을 추가합니다. 이미 존재하는 이름은 중복 추가되지 않습니다.
-  **removeClass(classNames: string): this**
   객체에서 하나 이상의 클래스 이름을 제거합니다.

-  **setDataset(key: string, value: any): this**
   객체의 `dataset` 보관소에 데이터를 직접 저장합니다. `datamodified` 이벤트를 발생시킵니다.

### ⛓️ 계층 구조 (Hierarchy)
-  **addChild(child: LveObject): this**
   다른 객체를 자식으로 등록합니다.
   - **작동 방식**: 자식 객체는 부모의 위치, 회전, 크기 변환(Matrix)을 그대로 상속받습니다. 이미 다른 부모가 있다면 자동으로 기존 연결을 끊고 이동합니다.
-  **removeChild(child: LveObject): this**
   지정한 자식 객체를 해제합니다. 해제된 자식은 더 이상 부모의 움직임을 따르지 않습니다.
-  **removeFromParent(): this**
   현재 부모 객체로부터 독립합니다.

### 👣 추적 (Following)
-  **follow(target: LveObject, offset?: { x?: number, y?: number, z?: number }): this**
   다른 객체를 일정 거리를 두고 실시간으로 따라다니게 합니다.
   - **작동 방식**: 타겟 객체의 위치 변경 이벤트를 구독하여 매 프레임 위치를 동기화합니다. 자식 관계(addChild)와 달리 부모의 회전이나 크기 변화에는 영향을 받지 않습니다.
-  **unfollow(): this**
   추적 동작을 중단합니다.
-  **kick(follower: LveObject): this**
   나를 따라다니고 있는 특정 객체와의 연결을 끊어냅니다.
-  **get following(): LveObject | undefined** (Getter)
   현재 내가 누구를 따라다니고 있는지 확인합니다.
-  **get followers(): LveObject[]** (Getter)
   나를 따라다니고 있는 객체들의 목록을 확인합니다.

### ⚖️ 물리 엔진 제어 (Physics)
*이 메서드들은 `attribute.physics`가 설정된 동적/정적 객체에서만 유효합니다.*
-  **applyForce(force: { x?: number, y?: number }): this**
   객체의 중심에 특정 방향으로 힘을 가합니다. 질량에 따라 가속도가 결정됩니다.
-  **setVelocity(velocity: { x?: number, y?: number }): this**
   현재 속도를 무시하고 즉시 새로운 속도로 설정합니다. 인자를 생략하면 현재 속도를 유지합니다.
-  **setAngularVelocity(angularVelocity: number): this**
   회전 속도(라디안/초)를 즉시 설정합니다.
-  **applyTorque(torque: number): this**
   회전하는 힘(토크)을 가합니다.

---

## 📋 2. 객체별 고유 메서드 (Specific Methods)

### 📸 Camera 전용
-  **canvasToWorld(x: number, y: number, targetZ?: number): { x: number, y: number, z: number }**
   화면상의 한 점(픽셀 좌표)이 실제 월드의 어떤 좌표에 해당하는지 계산합니다.
   - `targetZ`: 투영하고자 하는 심도입니다. 생략 시 카메라의 초점이 1:1로 맺히는 심도를 사용합니다.
-  **canvasToLocal(x: number, y: number, targetZ?: number): { x: number, y: number, z: number }**
   화면 좌표를 카메라 내부의 로컬 좌표계로 변환합니다. UI 요소를 카메라 전면에 배치할 때 유용합니다.
-  **calcDepthRatio(targetZ: number, value: number): number**
   특정 심도(`targetZ`)에서 특정 픽셀 크기(`value`)로 보이게 하려면 실제 객체 크기를 얼마로 설정해야 하는지 계산해 줍니다.

### 🎬 Video / Sprite / Particle 재생 제어
-  **play(clipName: string): this**
   지정한 이름의 클립을 재생합니다.
-  **pause(): this**
   재생을 일시정지합니다.
-  **stop(): this**
   재생을 정지합니다. (비디오/스프라이트의 경우 처음으로 돌아가지 않고 그 자리에 멈춥니다.)
-  **resume(): this** (Sprite 전용)
   정지되거나 일시정지된 애니메이션을 이어서 재생합니다.

---

## 📋 3. 월드 메서드 (World Methods)

월드 전체의 생명주기와 객체들을 관리하는 `World` 클래스의 메서드입니다.

-  **createImage / createVideo / createRectangle / createEllipse / createText / createSprite / createParticle / createCamera (options?): LveObject**
   새로운 타입의 객체를 생성하고 월드에 자동으로 등록합니다. 각 메서드는 생성된 구체적인 객체 인스턴스(예: `createImage`는 `LveImage`)를 반환합니다. 초기 속성을 담은 `options` 객체는 선택사항입니다.
-  **select(selector: string): LveObject[]**
   CSS 스타일 선택자를 사용해 월드 내의 객체들을 찾으며 속성과 클래스를 잇는 **복합 검색**을 지원합니다.
   - Class 검색: `.className` (예: `.active`, 여러 개인 경우 `.student.leader` 로 점표기법 체이닝)
   - Attribute 검색: `[attr-key=value]` (예: `[attr-id="hero"]`, `[attr-physics=true]`)
   - Dataset 검색: `[data-key=value]` (예: `[data-hp=100]`, 값 입력시 따옴표 여부에 맞춰 부울/숫자로 자동 파싱됨)
   - 복합 검색 예제: `world.select('.student.leader[data-hp=100][attr-id="asdf"]')`
-  **start(): this** / **stop(): this**
   월드의 렌더링 루프와 물리 엔진 시뮬레이션을 시작하거나 멈춥니다.
