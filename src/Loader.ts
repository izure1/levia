import type { AssetMap, LoadedAsset, LoadedAssets, LoaderEventType } from './types.js'

type LoaderEventCallback<T> = (payload: T) => void

interface LoaderEvents {
  load: { assets: AssetMap }
  loading: { key: string; src: string }
  loaded: { key: string; asset: LoadedAsset }
  error: { key: string; src: string; error: Error }
  complete: { assets: LoadedAssets }
}

export class Loader {
  private listeners: {
    [K in LoaderEventType]?: LoaderEventCallback<LoaderEvents[K]>[]
  } = {}

  readonly assets: LoadedAssets = {}

  on<K extends LoaderEventType>(event: K, callback: LoaderEventCallback<LoaderEvents[K]>) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    (this.listeners[event] as LoaderEventCallback<LoaderEvents[K]>[]).push(callback)
    return this
  }

  off<K extends LoaderEventType>(event: K, callback: LoaderEventCallback<LoaderEvents[K]>) {
    const list = this.listeners[event] as LoaderEventCallback<LoaderEvents[K]>[] | undefined
    if (!list) return this
    const idx = list.indexOf(callback)
    if (idx !== -1) list.splice(idx, 1)
    return this
  }

  private emit<K extends LoaderEventType>(event: K, payload: LoaderEvents[K]) {
    const list = this.listeners[event] as LoaderEventCallback<LoaderEvents[K]>[] | undefined
    list?.forEach(cb => cb(payload))
  }

  async load(assets: AssetMap): Promise<LoadedAssets> {
    this.emit('load', { assets })

    const entries = Object.entries(assets)

    await Promise.all(
      entries.map(([key, src]) => {
        this.emit('loading', { key, src })
        return this.loadAsset(key, src)
      })
    )

    this.emit('complete', { assets: this.assets })
    return this.assets
  }

  private loadAsset(key: string, src: string): Promise<void> {
    return new Promise(resolve => {
      const ext = src.split('.').pop()?.toLowerCase() ?? ''
      const isVideo = ['mp4', 'webm', 'ogg'].includes(ext)

      if (isVideo) {
        // fetch로 전체 다운로드 후 Blob URL을 사용하여
        // HTTP Range 미지원 서버에서도 seek가 동작하도록 함
        fetch(src)
          .then(res => res.blob())
          .then(blob => {
            const video = document.createElement('video')
            video.src = URL.createObjectURL(blob)
            video.preload = 'auto'
            video.playsInline = true
            video.onloadeddata = () => {
              this.assets[key] = video
              this.emit('loaded', { key, asset: video })
              resolve()
            }
            video.onerror = () => {
              const error = new Error(`Failed to load video: ${src}`)
              this.emit('error', { key, src, error })
              resolve()
            }
          })
          .catch(() => {
            const error = new Error(`Failed to fetch video: ${src}`)
            this.emit('error', { key, src, error })
            resolve()
          })
      } else {
        const image = new Image()
        image.src = src
        image.onload = () => {
          this.assets[key] = image
          this.emit('loaded', { key, asset: image })
          resolve()
        }
        image.onerror = () => {
          const error = new Error(`Failed to load image: ${src}`)
          this.emit('error', { key, src, error })
          resolve()
        }
      }
    })
  }
}
