import type { LveObject } from './LveObject.js'
import type { Camera } from './objects/Camera.js'
import type { Sprite } from './objects/Sprite.js'
import type { LveImage } from './objects/LveImage.js'
import type { LveVideo } from './objects/LveVideo.js'
import type { Particle } from './objects/Particle.js'
import { parseTextMarkup } from './utils/textMarkup.js'
import type { TextSpan } from './utils/textMarkup.js'
import type { LoadedAssets } from './types.js'

/**
 * WebGL 기반 렌더러.
 * 현재는 기본 2D Canvas를 폴백으로 사용하며, 향후 WebGL 렌더링 파이프라인으로 확장 예정입니다.
 */
export class Renderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('[Renderer] Failed to get 2D context from canvas.')
    this.ctx = ctx
  }

  get width() {
    return this.canvas.width
  }

  get height() {
    return this.canvas.height
  }

  render(objects: Set<LveObject>, assets: LoadedAssets = {}, timestamp: number = 0) {
    const { ctx } = this
    ctx.clearRect(0, 0, this.width, this.height)

    // Camera 찾기
    let camera: Camera | null = null
    for (const obj of objects) {
      if (obj.attribute.type === 'camera') {
        camera = obj as Camera
        break
      }
    }

    const camX = camera?.transform.position.x ?? 0
    const camY = camera?.transform.position.y ?? 0
    const camZ = camera?.transform.position.z ?? 0

    // z 기준 오름차순 정렬 (낮은 z가 먼저 그려짐 = 배경)
    const renderables = Array.from(objects)
      .filter(o => o.attribute.type !== 'camera' && o.style.display !== 'none')
      .sort((a, b) => {
        const zdiff = a.transform.position.z - b.transform.position.z
        return zdiff !== 0 ? zdiff : a.style.zIndex - b.style.zIndex
      })

    for (const obj of renderables) {
      this.drawObject(ctx, obj, camX, camY, camZ, assets, timestamp)
    }
  }

  private drawObject(
    ctx: CanvasRenderingContext2D,
    obj: LveObject,
    camX: number,
    camY: number,
    camZ: number,
    assets: LoadedAssets = {},
    timestamp: number = 0
  ) {
    const { style, transform } = obj

    // 패럴랙스: z 깊이에 따른 스케일 및 오프셋 계산
    // 카메라가 z=0에서 바라볼 때, z가 높을수록 더 가까이 있는 물체
    const depth = transform.position.z - camZ
    // depth가 0이면 1:1 스케일, 음수면 카메라 뒤 (렌더링 스킵)
    if (depth <= 0) return

    // 간단한 원근 투영 (f: focal length)
    const focalLength = 500
    const perspectiveScale = focalLength / depth

    const screenX =
      (this.width / 2) +
      (transform.position.x - camX) * perspectiveScale * transform.scale.x
    const screenY =
      (this.height / 2) +
      (transform.position.y - camY) * perspectiveScale * transform.scale.y

    // width/height가 undefined인 경우 0으로 처리 (text 등에서 자체 계산)
    const w = (style.width ?? 0) * perspectiveScale * transform.scale.x
    const h = (style.height ?? 0) * perspectiveScale * transform.scale.y

    ctx.save()
    ctx.globalAlpha = style.opacity
    if (style.blendMode) ctx.globalCompositeOperation = style.blendMode

    // 회전
    if (transform.rotation.z !== 0) {
      ctx.translate(screenX, screenY)
      ctx.rotate((transform.rotation.z * Math.PI) / 180)
      ctx.translate(-screenX, -screenY)
    }

    // 그림자
    if (style.shadowColor) {
      ctx.shadowColor = style.shadowColor
      ctx.shadowBlur = style.shadowBlur ?? 0
      ctx.shadowOffsetX = style.shadowOffsetX ?? 0
      ctx.shadowOffsetY = style.shadowOffsetY ?? 0
    }

    const type = obj.attribute.type

    if (type === 'rectangle') {
      this.drawRectangle(ctx, obj, screenX, screenY, w, h)
    } else if (type === 'ellipse') {
      this.drawEllipse(ctx, obj, screenX, screenY, w, h)
    } else if (type === 'text') {
      this.drawText(ctx, obj, screenX, screenY, perspectiveScale)
    } else if (type === 'image') {
      this.drawAsset(ctx, obj as LveImage, screenX, screenY, w, h, assets)
    } else if (type === 'video') {
      this.drawVideo(ctx, obj as LveVideo, screenX, screenY, w, h, assets)
    } else if (type === 'sprite') {
      this.drawSprite(ctx, obj as Sprite, screenX, screenY, w, h, assets, timestamp)
    } else if (type === 'particle') {
      this.drawParticle(ctx, obj as Particle, screenX, screenY, w, h, assets, perspectiveScale, timestamp)
    }

    ctx.restore()
  }

  private drawRectangle(
    ctx: CanvasRenderingContext2D,
    obj: LveObject,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    const { style } = obj
    const rx = x - w / 2
    const ry = y - h / 2
    const br = (obj as import('./objects/Rectangle.js').Rectangle).borderRadius ?? 0

    ctx.beginPath()
    if (br > 0 && ctx.roundRect) {
      ctx.roundRect(rx, ry, w, h, br)
    } else {
      ctx.rect(rx, ry, w, h)
    }

    if (style.color) {
      ctx.fillStyle = style.color
      ctx.fill()
    }

    if (style.blur && style.blur > 0) {
      ctx.filter = `blur(${style.blur}px)`
    }

    if (style.borderColor && style.borderWidth) {
      ctx.strokeStyle = style.borderColor
      ctx.lineWidth = style.borderWidth
      ctx.stroke()
    }
  }

  private drawEllipse(
    ctx: CanvasRenderingContext2D,
    obj: LveObject,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    const { style } = obj
    ctx.beginPath()
    ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2)

    if (style.color) {
      ctx.fillStyle = style.color
      ctx.fill()
    }

    if (style.borderColor && style.borderWidth) {
      ctx.strokeStyle = style.borderColor
      ctx.lineWidth = style.borderWidth
      ctx.stroke()
    }
  }

  private drawText(
    ctx: CanvasRenderingContext2D,
    obj: LveObject,
    x: number,
    y: number,
    perspectiveScale: number
  ) {
    const { style, attribute } = obj
    const baseFontSize = (style.fontSize ?? 16) * perspectiveScale
    const fontFamily = style.fontFamily ?? 'sans-serif'
    const baseFontWeight = style.fontWeight ?? 'normal'
    const baseFontStyle = style.fontStyle ?? 'normal'
    const baseColor = style.color ?? '#000000'
    const lineHeightMul = style.lineHeight ?? 1
    const textAlign = style.textAlign ?? 'left'
    const rawText = attribute.text ?? ''

    const maxW = style.width == null ? null : style.width * perspectiveScale
    const maxH = style.height == null ? null : style.height * perspectiveScale

    // ─── 마크업 파싱 ─────────────────────────────────────
    const spans = parseTextMarkup(rawText, {
      fontSize: baseFontSize,
      fontWeight: baseFontWeight,
      fontStyle: baseFontStyle,
      color: baseColor,
    })

    // ─── 한 줄을 스팬 단위로 쪼개어 렌더링 단위 생성 ─────
    // 각 논리 줄('\n' 기준)을 처리한 뒤 width wrap을 적용합니다.
    interface RenderToken { text: string; span: TextSpan }
    interface RenderLine { tokens: RenderToken[]; lineH: number }

    const renderLines: RenderLine[] = []

    // ① 스팬을 '\n' 기준 논리 줄로 분리
    const logicalLines: RenderToken[][] = [[]]
    for (const span of spans) {
      const parts = span.text.split('\n')
      parts.forEach((p, i) => {
        if (i > 0) logicalLines.push([])
        if (p) logicalLines[logicalLines.length - 1].push({ text: p, span })
      })
    }

    // ② 각 논리 줄을 width 기반 word-wrap으로 분리
    const spaceRe = /(\S+|\s+)/g

    for (const logLine of logicalLines) {
      let curLine: RenderToken[] = []
      let curW = 0
      let curH = baseFontSize * lineHeightMul

      const flushLine = () => {
        if (curLine.length > 0 || renderLines.length === 0) {
          renderLines.push({ tokens: curLine, lineH: curH })
        }
        curLine = []
        curW = 0
        curH = baseFontSize * lineHeightMul
      }

      if (logLine.length === 0) {
        renderLines.push({ tokens: [], lineH: baseFontSize * lineHeightMul })
        continue
      }

      for (const token of logLine) {
        const fs = (token.span.style.fontSize ?? baseFontSize)
        const fw = token.span.style.fontWeight ?? baseFontWeight
        const fi = token.span.style.fontStyle ?? baseFontStyle
        curH = Math.max(curH, fs * lineHeightMul)

        ctx.font = `${fi} ${fw} ${fs}px ${fontFamily}`

        if (maxW === null) {
          // auto width: 줄바꿈 없이 추가
          curLine.push(token)
        } else {
          // word-wrap
          const words = token.text.match(spaceRe) ?? [token.text]
          for (const word of words) {
            const wordW = ctx.measureText(word).width
            if (curW > 0 && curW + wordW > maxW) {
              flushLine()
            }
            curLine.push({ text: word, span: token.span })
            curW += wordW
          }
        }
      }
      flushLine()
    }

    // ─── 줄 너비 미리 계산 (textAlign 에 필요) ────────────
    const measuredWidths = renderLines.map(rl => {
      let w = 0
      for (const tok of rl.tokens) {
        const fs = tok.span.style.fontSize ?? baseFontSize
        const fw = tok.span.style.fontWeight ?? baseFontWeight
        const fi = tok.span.style.fontStyle ?? baseFontStyle
        ctx.font = `${fi} ${fw} ${fs}px ${fontFamily}`
        w += ctx.measureText(tok.text).width
      }
      return w
    })

    const containerW = maxW ?? Math.max(...measuredWidths, 0)

    // ─── 클리핑 영역 설정 ────────────────────────────────
    if (maxW !== null || maxH !== null) {
      const totalH = renderLines.reduce((s, r) => s + r.lineH, 0)
      const clipW = maxW ?? containerW
      const clipH = maxH ?? totalH
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, clipW, clipH)
      ctx.clip()
    }

    // ─── 실제 렌더링 ─────────────────────────────────────
    let curY = y
    for (let li = 0; li < renderLines.length; li++) {
      const rl = renderLines[li]

      // textAlign에 따른 시작 x 계산
      const lineW = measuredWidths[li]
      let lineStartX: number
      if (textAlign === 'center') {
        lineStartX = x + (containerW - lineW) / 2
      } else if (textAlign === 'right') {
        lineStartX = x + containerW - lineW
      } else {
        lineStartX = x
      }

      let penX = lineStartX
      const baseline = curY + rl.lineH * 0.8 // 근사 baseline

      for (const tok of rl.tokens) {
        const fs = tok.span.style.fontSize ?? baseFontSize
        const fw = tok.span.style.fontWeight ?? baseFontWeight
        const fi = tok.span.style.fontStyle ?? baseFontStyle
        const fc = tok.span.style.color ?? baseColor
        const bc = tok.span.style.borderColor
        const bw = tok.span.style.borderWidth ?? 1

        ctx.font = `${fi} ${fw} ${fs}px ${fontFamily}`
        ctx.fillStyle = fc
        ctx.fillText(tok.text, penX, baseline)

        if (bc) {
          ctx.strokeStyle = bc
          ctx.lineWidth = bw
          ctx.strokeText(tok.text, penX, baseline)
        }

        penX += ctx.measureText(tok.text).width
      }

      curY += rl.lineH
    }

    if (maxW !== null || maxH !== null) {
      ctx.restore()
    }
  }

  // ─── 에셋 드로잉 (image / particle) ───────────────────────

  private drawAsset(
    ctx: CanvasRenderingContext2D,
    obj: LveImage,
    x: number,
    y: number,
    w: number,
    h: number,
    assets: LoadedAssets
  ) {
    const src = obj._src
    const asset = src ? assets[src] : undefined

    if (!asset) {
      this.drawPlaceholder(ctx, x, y, w || 60, h || 60)
      return
    }

    const natW = asset instanceof HTMLImageElement
      ? asset.naturalWidth
      : (asset as HTMLVideoElement).videoWidth
    const natH = asset instanceof HTMLImageElement
      ? asset.naturalHeight
      : (asset as HTMLVideoElement).videoHeight

    const drawW = w || natW
    const drawH = h || natH

    ctx.drawImage(asset as CanvasImageSource, x - drawW / 2, y - drawH / 2, drawW, drawH)

    if (obj.style.borderColor && obj.style.borderWidth) {
      ctx.strokeStyle = obj.style.borderColor
      ctx.lineWidth = obj.style.borderWidth
      ctx.strokeRect(x - drawW / 2, y - drawH / 2, drawW, drawH)
    }
  }

  // ─── 비디오 드로잉 ────────────────────────────────────────

  private drawVideo(
    ctx: CanvasRenderingContext2D,
    obj: LveVideo,
    x: number,
    y: number,
    w: number,
    h: number,
    assets: LoadedAssets
  ) {
    const src = obj._src
    const asset = src ? assets[src] : undefined

    if (!asset || !(asset instanceof HTMLVideoElement)) {
      this.drawPlaceholder(ctx, x, y, w || 60, h || 60)
      return
    }

    const clip = obj._clip

    // 재생 상태 동기화
    if (obj._playing) {
      if (clip) {
        asset.loop = clip.loop
        // start 지정 시 초기화
        if (asset.paused && clip.start != null) {
          asset.currentTime = clip.start / 1000
        }
      }
      if (asset.paused) asset.play().catch(() => { })
    } else {
      if (!asset.paused) asset.pause()
    }

    // end 시각 도달 시 처리
    if (clip?.end != null && asset.currentTime >= clip.end / 1000) {
      if (clip.loop) {
        asset.currentTime = (clip.start ?? 0) / 1000
      } else {
        asset.pause()
        obj.stop()
      }
    }

    const drawW = w || asset.videoWidth
    const drawH = h || asset.videoHeight

    ctx.drawImage(asset, x - drawW / 2, y - drawH / 2, drawW, drawH)

    if (obj.style.borderColor && obj.style.borderWidth) {
      ctx.strokeStyle = obj.style.borderColor
      ctx.lineWidth = obj.style.borderWidth
      ctx.strokeRect(x - drawW / 2, y - drawH / 2, drawW, drawH)
    }
  }

  // ─── 스프라이트 시트 드로잉 ───────────────────────────────

  private drawSprite(
    ctx: CanvasRenderingContext2D,
    sprite: Sprite,
    x: number,
    y: number,
    w: number,
    h: number,
    assets: LoadedAssets,
    timestamp: number
  ) {
    sprite.tick(timestamp)

    const clip = sprite._clip
    const src = clip?.src
    if (!src) return

    const asset = assets[src]
    if (!asset || !(asset instanceof HTMLImageElement)) {
      this.drawPlaceholder(ctx, x, y, w || 60, h || 60)
      return
    }

    if (!clip) {
      // 클립 미지정: 이미지 전체 렌더링
      const drawW = w || asset.naturalWidth
      const drawH = h || asset.naturalHeight
      ctx.drawImage(asset, x - drawW / 2, y - drawH / 2, drawW, drawH)
      return
    }

    const { frameWidth, frameHeight } = clip
    const sheetCols = Math.floor(asset.naturalWidth / frameWidth)

    const frameIdx = sprite._currentFrame
    const col = frameIdx % sheetCols
    const row = Math.floor(frameIdx / sheetCols)
    const sx = col * frameWidth
    const sy = row * frameHeight

    const drawW = w || frameWidth
    const drawH = h || frameHeight

    ctx.drawImage(
      asset,
      sx, sy, frameWidth, frameHeight,
      x - drawW / 2, y - drawH / 2, drawW, drawH
    )
  }

  // ─── 파티클 시스템 드로잉 ───────────────────────────────

  private drawParticle(
    ctx: CanvasRenderingContext2D,
    obj: Particle,
    emX: number,
    emY: number,
    w: number,
    h: number,
    assets: LoadedAssets,
    perspectiveScale: number,
    timestamp: number
  ) {
    // tick 호출 — 인스턴스 스폰/업데이트/제거
    obj.tick(timestamp)

    const clip = obj._clip
    if (!clip) return

    const asset = assets[clip.src]
    // 에셋 없으면 placeholder
    if (!asset || !(asset instanceof HTMLImageElement)) {
      this.drawPlaceholder(ctx, emX, emY, w || 30, h || 30)
      return
    }

    const baseBlend = obj.style.blendMode ?? 'lighter'
    const natW = asset.naturalWidth
    const natH = asset.naturalHeight
    const drawW = (w || natW) * perspectiveScale
    const drawH = (h || natH) * perspectiveScale

    for (const inst of obj._instances) {
      const age = timestamp - inst.born
      const t = Math.min(age / inst.lifespan, 1)
      const scale = 1 - t          // 서서히 작아짐
      const opacity = 1 - t        // 서서히 투명해짐
      if (opacity <= 0 || scale <= 0) continue

      const iw = drawW * scale
      const ih = drawH * scale
      const ix = emX + inst.x * perspectiveScale
      const iy = emY + inst.y * perspectiveScale

      ctx.save()
      ctx.globalAlpha = obj.style.opacity * opacity
      ctx.globalCompositeOperation = baseBlend as GlobalCompositeOperation
      ctx.drawImage(asset, ix - iw / 2, iy - ih / 2, iw, ih)
      ctx.restore()
    }
  }


  private drawPlaceholder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    ctx.strokeStyle = '#ff006688'
    ctx.lineWidth = 1
    ctx.strokeRect(x - w / 2, y - h / 2, w, h)
    ctx.beginPath()
    ctx.moveTo(x - w / 2, y - h / 2)
    ctx.lineTo(x + w / 2, y + h / 2)
    ctx.moveTo(x + w / 2, y - h / 2)
    ctx.lineTo(x - w / 2, y + h / 2)
    ctx.stroke()
  }
}
