# Attribute (속성) 가이드

안녕하세요! **Attribute**는 객체의 **식별 정보와 물리적 성격**을 정의하는 데이터 세트입니다. 레비아 엔진은 모든 객체의 기본 사양을 이 속성들을 통해 관리합니다.

---

## 📋 1. 식별 및 분류 (Identity)
객체를 구분하고 선택하는 데 사용되는 가장 기본적인 정보입니다.
-  **id: string**
   객체의 고유 식별자입니다. 생성 시 자동으로 UUID가 부여되지만, 사용자가 원하는 문자열로 직접 지정할 수 있습니다. (`world.select('[attr-id="..."]')`로 검색 가능)
-  **type: string**
   객체의 종류를 나타냅니다. (`image`, `video`, `rectangle`, `ellipse`, `text`, `sprite`, `particle`, `camera`)
-  **name: string**
   객체의 이름입니다. 논리적인 분류를 위해 자유롭게 사용할 수 있습니다. (`[attr-name="hero"]` 형식을 통해 검색할 수도 있습니다.)
-  **className: string**
   객체에 부여된 클래스 목록입니다. 공백으로 구분하여 여러 개를 넣을 수 있으며, 스타일링이나 그룹 선택에 활용됩니다. (`.active` 형식을 통해 검색 가능)

---

## 📋 2. 물리적 성질 (Physics)
`physics` 속성이 설정된 동적(`dynamic`) 또는 정적(`static`) 객체에 적용되는 물리 사양입니다.
-  **physics: 'dynamic' | 'static' | null**
   물리 시스템 적용 여부를 결정합니다.
   - `dynamic`: 충돌과 중력의 영향을 모두 받는 일반적인 물체입니다.
   - `static`: 자리에 고정되어 있으며, 다른 물체와 충돌은 하지만 움직이지 않는 벽이나 바닥 같은 물체입니다.
-  **density: number**
   물체의 밀도입니다. 면적과 곱해져서 질량(`mass`)이 결정됩니다. 질량이 높을수록 다른 물체를 밀어낼 때 힘이 더 강해집니다.
-  **friction: number (0 ~ 1)**
   다른 물체와 접촉했을 때 발생하는 마찰 계수입니다. 0이면 아주 미끄럽고, 1이면 매우 뻑뻑합니다.
-  **frictionAir: number**
   공기 저항 계수입니다. 물체가 움직일 때 매 프레임 속도가 줄어드는 정도를 결정합니다.
-  **restitution: number (0 ~ 1)**
   탄성 계수(반발력)입니다. 0이면 전혀 튀지 않고, 1이면 에너지를 잃지 않고 완벽하게 튕겨 나갑니다.
-  **fixedRotation: boolean**
   `true`로 설정하면 충돌이 발생해도 물체가 회전하지 않고 똑바로 유지됩니다. 캐릭터 조작 시 유용합니다.
-  **gravityScale: number**
   이 물체에만 적용되는 중력의 배율입니다. 0이면 무중력 상태가 되고, 2이면 남들보다 두 배 빠르게 떨어집니다.

---

## 📋 3. 충돌 필터 (Collision Filter)
물체끼리 부딪힐지 말지를 결정하는 비트마스크 시스템입니다.
-  **collisionGroup: number**
   특수 충돌 그룹 번호입니다. 같은 음수(`-1` 등)면 서로 절대 부딪히지 않고, 같은 양수면 무조건 부딪힙니다.
-  **collisionMask: number**
   내가 어떤 카테고리의 물체와 부딪힐 것인지를 결정하는 32비트 정수입니다.
-  **collisionCategory: number**
   내가 어떤 카테고리에 속해 있는지를 나타내는 32비트 정수입니다.

---

## 📋 4. 특수 속성 (Special Attributes)
특정 객체 타입에만 존재하는 데이터들입니다.
-  **focalLength: number (Camera 전용)**
   카메라의 초점 거리입니다. (기본값: `100`) 이 거리를 기준으로 원근감이 계산됩니다.
-  **src: string (Image / Video / Sprite / Particle)**
   사용할 소스 자원의 경로 또는 키 값입니다.
-  **volume: number (0 ~ 1, Video 전용)**
   비디오의 음량 크기입니다.
-  **playbackRate: number (Video / Sprite 전용)**
   재생 속도 배율입니다. `1.0`이 정상 속도입니다.
-  **currentTime: number (Video / Sprite 전용)**
   현재 재생 지점(초 또는 프레임 단위)입니다. 이 값을 바꾸면 즉시 해당 위치로 건너뜁니다.
