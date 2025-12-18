import { useMemo, useState } from 'react'
import { detectBrowserAndPlatform } from '../utils/deviceUtils'
import { getLineUserId, isInLine, openLiffWindow } from '../services/liffService'
import { uploadImageUrlToCloudinary } from '../services/cloudinaryService'
import head02 from '../assets/images/head02.png'
import chooseFrame from '../assets/images/choose.png'
import button04 from '../assets/buttons/button04.png'

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
    return aiResult.cloudUrl || aiResult.imageSrc || null
  }, [aiResult])

  const uploadAndOpenForLiff = async () => {
    // LIFF-only: upload to cloud then open external link
    if (!inLine) {
      await openImageLink()
      return
    }

    // Use stable public_id per user to overwrite
    const userId = await getLineUserId()
    const publicId = userId ? `lucky_seemsee_wallpaper_${userId}` : 'lucky_seemsee_wallpaper_default'

    const imageUrl = (aiResult && aiResult.imageSrc) || bestImageUrl
    if (!imageUrl) return

    const result = await uploadImageUrlToCloudinary({
      imageUrl,
      folder: 'lucky-seemsee',
      publicId,
    })

    if (result.success && result.url) {
      await openLiffWindow(result.url, true)
    } else {
      // fallback: still try open something
      await openImageLink()
    }
  }

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

  return (
    <div className="app-root wallpaper-root">
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
            disabled={!selectedTopic || !selectedZodiac || isBusy}
          >
            <img src={button04} alt="สร้างวอลเปเปอร์มงคล" />
          </button>
        </div>
      </div>

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
        <div className="ai-wallpaper-overlay" role="status" aria-live="polite">
          <div className="ai-wallpaper-card">
            <div className="ai-wallpaper-text">
              กำลังสร้างภาพ
              <span className="ai-dots" aria-hidden="true">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </div>
            <div className="ai-wallpaper-subtext">
              โปรดรอสักครู่
            </div>
          </div>
        </div>
      )}

      {/* AI result UI (mock) */}
      {aiResult && (
        <div className="ai-wallpaper-overlay" role="dialog" aria-modal="true">
          <div className="ai-wallpaper-card ai-wallpaper-result">
            {aiResult.imageSrc && (
              <div className="ai-wallpaper-image-wrap">
                <img className="ai-wallpaper-image" src={aiResult.imageSrc} alt="AI wallpaper result" />
              </div>
            )}

            {isIosSafari ? (
              <div className="ai-wallpaper-actions ai-wallpaper-actions-top-row">
                <button type="button" className="ai-wallpaper-btn secondary" onClick={shareImageFile} disabled={!bestImageUrl}>
                  บันทึก
                </button>
                <button type="button" className="ai-wallpaper-btn" onClick={onPlayAgain}>
                  เล่นอีกครั้ง
                </button>
              </div>
            ) : inLine ? (
              <div className="ai-wallpaper-actions ai-wallpaper-actions-top-row">
                <button type="button" className="ai-wallpaper-btn secondary" onClick={uploadAndOpenForLiff} disabled={!bestImageUrl}>
                  บันทึก&แชร์
                </button>
                <button type="button" className="ai-wallpaper-btn" onClick={onPlayAgain}>
                  เล่นอีกครั้ง
                </button>
              </div>
            ) : isAndroidChrome ? (
              <div className="ai-wallpaper-actions ai-wallpaper-actions-column">
                <div className="ai-wallpaper-actions-top-row">
                  <button type="button" className="ai-wallpaper-btn secondary" onClick={downloadImage} disabled={!bestImageUrl}>
                    บันทึก
                  </button>
                  <button type="button" className="ai-wallpaper-btn secondary" onClick={shareImageFile} disabled={!bestImageUrl}>
                    แชร์
                  </button>
                </div>
                <button type="button" className="ai-wallpaper-btn full-width" onClick={onPlayAgain}>
                  เล่นอีกครั้ง
                </button>
              </div>
            ) : (
              <div className="ai-wallpaper-actions ai-wallpaper-actions-top-row">
                <button type="button" className="ai-wallpaper-btn secondary" onClick={openImageLink} disabled={!bestImageUrl}>
                  บันทึก
                </button>
                <button type="button" className="ai-wallpaper-btn" onClick={onPlayAgain}>
                  เล่นอีกครั้ง
                </button>
              </div>
            )}
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


