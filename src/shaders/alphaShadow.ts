/**
 * 알파채널 경계 기반 BoxShadow 셰이더
 *
 * image/sprite 객체에서 style.boxShadow* 를
 * 이미지 사각형이 아닌 알파채널 외곽에 그림자를 렌더링합니다.
 *
 * 동작 방식:
 *   - 현재 픽셀이 이미지 불투명 영역 위 → discard (그림자는 이미지 뒤에 숨겨짐)
 *   - 그림자 소스 위치 = CSS offset 역변환: shadowSrcP = p - vec2(offsetX, -offsetY)
 *   - blur: Gaussian 링 샘플링 (1 center + 3 rings × 8 = 25 samples) 으로 소프트 블러 근사
 *   - spread: effectiveBlur = blur + spread 로 그림자 확장 처리
 */

export const alphaShadowVertex = /* glsl */ `
  attribute vec2 position;
  attribute vec2 uv;
  uniform mat4 uModelMatrix;
  uniform mat4 uViewMatrix;
  uniform mat4 uProjectionMatrix;
  varying vec2 vUV;

  void main() {
    vUV = uv;
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(position, 0.0, 1.0);
  }
`

export const alphaShadowFragment = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform vec4  uColor;          // 그림자 색상 RGBA
  uniform float uOpacity;        // 전체 불투명도
  uniform vec2  uQuadSize;       // 그림자 쿼드 크기 (world units)
  uniform vec2  uImageSize;      // 이미지 표시 크기 (world units)
  uniform vec2  uOffset;         // CSS 그림자 offset [x, y] (+y = down)
  uniform float uBlur;           // 블러 반경 (world units)
  uniform float uSpread;         // 확장 반경 (world units)
  uniform float uAlphaThreshold; // 픽셀을 불투명으로 판단할 최솟값

  varying vec2 vUV;

  uniform vec2 uUVOffset;
  uniform vec2 uUVScale;

  // 이미지 UV 범위 클램프 체크
  bool inUV(vec2 uv) {
    return uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0;
  }

  // 월드 좌표 → 이미지 UV 변환
  vec2 worldToImageUV(vec2 worldPos) {
    return (worldPos + uImageSize * 0.5) / uImageSize;
  }

  void main() {
    // 그림자 쿼드 중심 기준의 현재 픽셀 월드 좌표
    vec2 p = (vUV - 0.5) * uQuadSize;

    // 이미지 불투명 영역 위는 그림자 렌더 제외
    vec2 imgUV = worldToImageUV(p);
    if (inUV(imgUV)) {
      vec2 texUV = imgUV * uUVScale + uUVOffset;
      if (texture2D(uTexture, texUV).a > uAlphaThreshold) {
        discard;
      }
    }

    // CSS 그림자 offset 역변환: WebGL +y = up, CSS +y = down
    vec2 shadowSrcP = p - vec2(uOffset.x, -uOffset.y);

    // blur + spread 를 합산하여 유효 블러 반경 계산
    float effectiveBlur = uBlur + uSpread;

    // ── Gaussian 링 샘플링 ─────────────────────────────────────────────
    // 1 center + 3 rings × 8 samples = 25 samples
    float PI2 = 6.28318;
    float accAlpha = 0.0;
    float totalWeight = 0.0;

    // Ring 0: 중심 샘플 (가중치 최대)
    {
      float w = 1.0;
      vec2 sUV = worldToImageUV(shadowSrcP);
      if (inUV(sUV)) {
        vec2 texUV = sUV * uUVScale + uUVOffset;
        accAlpha += texture2D(uTexture, texUV).a * w;
      }
      totalWeight += w;
    }

    // Rings 1–3: 원주 방향 8 샘플씩, Gaussian 가중치
    for (int ring = 1; ring <= 3; ring++) {
      float r = float(ring) * effectiveBlur / 3.0;
      float sigma = max(effectiveBlur / 2.0, 0.001);
      float w = exp(-r * r / (2.0 * sigma * sigma));

      for (int i = 0; i < 8; i++) {
        float angle = float(i) / 8.0 * PI2;
        vec2 s = shadowSrcP + vec2(cos(angle), sin(angle)) * r;
        vec2 sUV = worldToImageUV(s);
        if (inUV(sUV)) {
          vec2 texUV = sUV * uUVScale + uUVOffset;
          accAlpha += texture2D(uTexture, texUV).a * w;
        }
        totalWeight += w;
      }
    }

    float shadowAlpha = accAlpha / max(totalWeight, 0.001);
    if (shadowAlpha <= uAlphaThreshold) discard;

    float finalA = uColor.a * uOpacity * shadowAlpha;
    gl_FragColor = vec4(uColor.rgb * finalA, finalA);
  }
`
