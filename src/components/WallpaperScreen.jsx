import { useEffect, useMemo, useRef, useState } from 'react'
import { detectBrowserAndPlatform } from '../utils/deviceUtils'
import { isInLine, openLiffWindow } from '../services/liffService'
import { preloadImages } from '../utils/preloadImages'
import { HORSE_LOADING_FRAMES } from '../utils/sequenceAssets'
import head02 from '../assets/images/head02.png'
import chooseFrame from '../assets/images/choose.png'
import waitingImg from '../assets/images/waiting.png'
import button04 from '../assets/buttons/button04.png'
import btnDownload from '../assets/buttons/download.png'
import btnShare from '../assets/buttons/share.png'
import btnPlayAgain from '../assets/buttons/playagain.png'

function WallpaperScreen({
  onBack,
  onCreate,
  isGenerating = false,
  aiResult = null,
  aiError = '',
  onPlayAgain,
  topicOptions = [],
  zodiacOptions = [],
  selectedTopic,
  selectedZodiac,
  setSelectedTopic,
  setSelectedZodiac,
}) {
  const [modalOpen, setModalOpen] = useState(null) // 'topic' | 'zodiac' | null

  const isBusy = isGenerating || !!aiResult

  // Preload loading sequence frames upfront to avoid decode jank during playback
  const loadingFramesTotal = HORSE_LOADING_FRAMES.length
  const [areLoadingFramesReady, setAreLoadingFramesReady] = useState(() => loadingFramesTotal === 0)
  const [loadingFramesProgress, setLoadingFramesProgress] = useState(() => ({
    loaded: 0,
    total: loadingFramesTotal,
  }))
  const loadingSeqImgRef = useRef(null)
  const loadingFramesSrcRef = useRef(HORSE_LOADING_FRAMES)

  const { isIOS, isSafari, isAndroid, isChrome } = useMemo(() => {
    try {
      return detectBrowserAndPlatform()
    } catch {
      return { isIOS: false, isSafari: false, isAndroid: false, isChrome: false }
    }
  }, [])
  const isIosSafari = isIOS || isSafari
  const isAndroidChrome = isAndroid && isChrome

  const inLine = useMemo(() => isInLine(), [])

  const bestImageUrl = useMemo(() => {
    if (!aiResult) return null
    // In LIFF we must prefer cloudUrl (external browser).
    // In normal browsers we prefer local imageSrc (mock/real base64) to avoid broken/fake cloud links.
    if (inLine) return aiResult.cloudUrl || aiResult.imageSrc || null
    return aiResult.imageSrc || aiResult.cloudUrl || null
  }, [aiResult, inLine])

  // Preload+decode loading frames once (start immediately when entering screen)
  useEffect(() => {
    if (loadingFramesTotal === 0) return undefined

    const controller = new AbortController()

    preloadImages(HORSE_LOADING_FRAMES, {
      concurrency: 3,
      decode: true,
      signal: controller.signal,
      onProgress: ({ loaded, total }) => {
        setLoadingFramesProgress({ loaded, total })
      },
    })
      .then(() => {
        loadingFramesSrcRef.current = HORSE_LOADING_FRAMES
        setAreLoadingFramesReady(true)
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return
        console.warn('preload loading frames failed (fallback to on-demand)', e)
        setAreLoadingFramesReady(true)
      })

    return () => controller.abort()
  }, [loadingFramesTotal])

  const prefersReducedMotion = useMemo(() => {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  }, [])

  // Animate loading sequence while generating (without re-rendering the whole component per frame)
  useEffect(() => {
    if (!isGenerating) return undefined

    const frames = loadingFramesSrcRef.current || HORSE_LOADING_FRAMES
    const el = loadingSeqImgRef.current
    if (!el || frames.length === 0) return undefined

    // Always show a valid frame immediately
    el.src = frames[0]

    // If not ready (or reduced motion), keep static to avoid flicker
    if (!areLoadingFramesReady || prefersReducedMotion) return undefined

    const fps = 12
    const interval = 1000 / fps

    let rafId = 0
    let frameIdx = 0
    let lastTime = performance.now()

    const tick = (now) => {
      const elapsed = now - lastTime
      if (elapsed >= interval) {
        lastTime = now - (elapsed % interval)
        frameIdx = (frameIdx + 1) % frames.length
        el.src = frames[frameIdx] || frames[0]
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [areLoadingFramesReady, isGenerating, prefersReducedMotion])

  const openImageLink = async () => {
    const url = bestImageUrl
    if (!url) return

    if (inLine) {
      await openLiffWindow(url, true)
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const getImageBlobForSharing = async () => {
    // Prefer local/mock asset (reliable CORS) then fallback to cloud url
    const url = (aiResult && aiResult.imageSrc) || bestImageUrl
    if (!url) return null

    const res = await fetch(url)
    const blob = await res.blob()
    if (blob && blob.type) return blob
    // Some environments return empty type; force png for wallpaper
    return new Blob([blob], { type: 'image/png' })
  }

  const downloadImage = async () => {
    // In LIFF: requirement says to open the image link instead of downloading
    // Prefer local/mock image asset for download (more reliable than cloudUrl during mock)
    const url = (aiResult && aiResult.imageSrc) || bestImageUrl
    if (!url) return

    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `lucky-seemsee-wallpaper-${Date.now()}.png`
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch (e) {
      console.warn('download failed, fallback to open link', e)
      await openImageLink()
    }
  }

  const shareImageFile = async () => {
    // In LIFF: open link (LINE in-app has limitations)
    if (inLine) {
      await openImageLink()
      return
    }

    try {
      const blob = await getImageBlobForSharing()
      if (!blob) return

      const file = new File([blob], `lucky-seemsee-wallpaper-${Date.now()}.png`, {
        type: blob.type || 'image/png',
      })

      const shareData = {
        files: [file],
        title: 'Lucky Seemsee',
      }

      if (navigator.canShare && !navigator.canShare(shareData)) {
        // Fallback: if platform can't share files, download instead
        await downloadImage()
        return
      }

      if (navigator.share) {
        await navigator.share(shareData)
        return
      }

      // No share support -> download as best effort
      await downloadImage()
    } catch (e) {
      // Android/Chrome often rejects with AbortError when the share sheet is dismissed
      // (sometimes even after successful share). Do NOT fallback to download in that case.
      if (e?.name === 'AbortError') {
        return
      }

      console.warn('share file failed, fallback to download', e)
      await downloadImage()
    }
  }

  const getSelectedLabel = (type) => {
    if (type === 'topic') {
      const option = topicOptions.find((opt) => opt.value === selectedTopic)
      return option ? option.label : ''
    }
    if (type === 'zodiac') {
      const option = zodiacOptions.find((opt) => opt.value === selectedZodiac)
      return option ? option.label : ''
    }
    return ''
  }

  const handleSelect = (type, value) => {
    if (type === 'topic') {
      setSelectedTopic(value)
    } else if (type === 'zodiac') {
      setSelectedZodiac(value)
    }
    setModalOpen(null)
  }

  const options = modalOpen === 'topic' ? topicOptions : zodiacOptions

  const canCreate = !!selectedTopic && !!selectedZodiac && !isBusy && areLoadingFramesReady

  return (
    <div className="app-root wallpaper-root">
      {/* Hide underlying UI while generating to avoid overlap */}
      {!isGenerating && (
        <>
          <button className="back-icon" type="button" onClick={onBack} aria-label="Back">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="wall-container">
            <div className="wall-head">
              <img src={head02} alt="สร้างวอลเปเปอร์มงคล" />
            </div>

            <div className="wall-choose">
              <img src={chooseFrame} alt="" aria-hidden="true" className="choose-frame" />

              <div className="choose-grid">
                <div className="choose-field">
                  <div className="select-wrapper">
                    <button
                      type="button"
                      className="select-button"
                      onClick={() => setModalOpen('topic')}
                      aria-label="เลือกเสริมดวง"
                      disabled={isBusy}
                    >
                      <span className="select-button-text">
                        {getSelectedLabel('topic') || '\u00A0'}
                      </span>
                      <svg className="select-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="choose-field">
                  <div className="select-wrapper">
                    <button
                      type="button"
                      className="select-button"
                      onClick={() => setModalOpen('zodiac')}
                      aria-label="เลือกปีนักษัตร"
                      disabled={isBusy}
                    >
                      <span className="select-button-text">
                        {getSelectedLabel('zodiac') || '\u00A0'}
                      </span>
                      <svg className="select-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="wall-action">
              <button
                className="image-button"
                type="button"
                onClick={onCreate}
                disabled={!canCreate}
              >
                <img src={button04} alt="สร้างวอลเปเปอร์มงคล" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      {modalOpen && !isBusy && (
        <div className="select-modal-overlay" onClick={() => setModalOpen(null)}>
          <div className="select-modal" onClick={(e) => e.stopPropagation()}>
            <div className="select-modal-header">
              <h3 className="select-modal-title">
                {modalOpen === 'topic' ? 'เลือกเสริมดวง' : 'เลือกปีนักษัตร'}
              </h3>
              <button
                type="button"
                className="select-modal-close"
                onClick={() => setModalOpen(null)}
                aria-label="ปิด"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="select-modal-content">
              {options.map((opt) => {
                const isSelected = modalOpen === 'topic'
                  ? selectedTopic === opt.value
                  : selectedZodiac === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`select-modal-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(modalOpen, opt.value)}
                  >
                    {opt.label}
                    {isSelected && (
                      <svg className="select-check" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* AI generation loading UI (mock) */}
      {isGenerating && (
        <div className="ai-wallpaper-overlay ai-wallpaper-overlay--loading" role="status" aria-live="polite">
          <div className="ai-loading-layout">
            {HORSE_LOADING_FRAMES.length > 0 && (
              <img
                className="ai-loading-seq"
                ref={loadingSeqImgRef}
                src={HORSE_LOADING_FRAMES[0]}
                alt=""
                aria-hidden="true"
              />
            )}

            <div className="ai-loading-waiting-wrap" aria-hidden="true">
              <img className="ai-loading-waiting" src={waitingImg} alt="" aria-hidden="true" />
              <div className="ai-loading-waiting-text">
                กำลังเสริมดวง
                <span className="ai-dots" aria-hidden="true">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preload toast (fixed; doesn't affect layout) */}
      {!areLoadingFramesReady && loadingFramesProgress.total > 0 && (
        <div className="asset-preload-toast" role="status" aria-live="polite">
          {isGenerating ? 'กำลังเตรียมแอนิเมชัน…' : 'กำลังเตรียมไฟล์…'}{' '}
          {Math.round((loadingFramesProgress.loaded / loadingFramesProgress.total) * 100)}%
        </div>
      )}

      {/* AI result UI (mock) */}
      {aiResult && (
        <div className="ai-wallpaper-overlay" role="dialog" aria-modal="true">
          {/* Match horse PreviewModal sizing/placement */}
          <div className="ai-preview-stack">
            <div className="ai-preview-frame">
              {aiResult.imageSrc ? (
                <img className="ai-preview-content" src={aiResult.imageSrc} alt="AI wallpaper result" />
              ) : (
                <div className="ai-preview-placeholder" />
              )}
            </div>

            <div className="ai-preview-actions-container">
              {inLine ? (
                <div className="ai-preview-actions-row">
                  {/* LIFF: use download icon instead of "download&share" */}
                  <button type="button" className="image-button ai-icon-button" onClick={openImageLink} disabled={!bestImageUrl} aria-label="บันทึก">
                    <img src={btnDownload} alt="บันทึก" />
                  </button>
                  <button type="button" className="image-button ai-icon-button" onClick={onPlayAgain} aria-label="เล่นอีกครั้ง">
                    <img src={btnPlayAgain} alt="เล่นอีกครั้ง" />
                  </button>
                </div>
              ) : isAndroidChrome ? (
                <div className="ai-preview-actions-row">
                  <button type="button" className="image-button ai-icon-button" onClick={downloadImage} disabled={!bestImageUrl} aria-label="บันทึก">
                    <img src={btnDownload} alt="บันทึก" />
                  </button>
                  <button type="button" className="image-button ai-icon-button" onClick={shareImageFile} disabled={!bestImageUrl} aria-label="แชร์">
                    <img src={btnShare} alt="แชร์" />
                  </button>
                  <button type="button" className="image-button ai-icon-button" onClick={onPlayAgain} aria-label="เล่นอีกครั้ง">
                    <img src={btnPlayAgain} alt="เล่นอีกครั้ง" />
                  </button>
                </div>
              ) : isIosSafari ? (
                <div className="ai-preview-actions-row">
                  <button type="button" className="image-button ai-icon-button" onClick={shareImageFile} disabled={!bestImageUrl} aria-label="บันทึก">
                    <img src={btnDownload} alt="บันทึก" />
                  </button>
                  <button type="button" className="image-button ai-icon-button" onClick={onPlayAgain} aria-label="เล่นอีกครั้ง">
                    <img src={btnPlayAgain} alt="เล่นอีกครั้ง" />
                  </button>
                </div>
              ) : (
                <div className="ai-preview-actions-row">
                  <button type="button" className="image-button ai-icon-button" onClick={downloadImage} disabled={!bestImageUrl} aria-label="บันทึก">
                    <img src={btnDownload} alt="บันทึก" />
                  </button>
                  <button type="button" className="image-button ai-icon-button" onClick={onPlayAgain} aria-label="เล่นอีกครั้ง">
                    <img src={btnPlayAgain} alt="เล่นอีกครั้ง" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI error UI (mock) */}
      {!isGenerating && !aiResult && aiError && (
        <div className="ai-wallpaper-overlay" role="alertdialog" aria-modal="true">
          <div className="ai-wallpaper-card ai-wallpaper-result">
            <div className="ai-wallpaper-text">สร้างภาพไม่สำเร็จ</div>
            <div className="ai-wallpaper-subtext">{aiError}</div>
            <div className="ai-wallpaper-actions" style={{ marginTop: 14 }}>
              <button type="button" className="ai-wallpaper-btn secondary" onClick={onPlayAgain}>
                เล่นอีกครั้ง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WallpaperScreen


