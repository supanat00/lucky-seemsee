import { useRef, useEffect, useMemo, useState } from 'react'
import { detectBrowserAndPlatform } from '../utils/deviceUtils'
import { isInLine } from '../services/liffService'
import './PreviewModal.css'

import btnDownload from '../assets/buttons/download.png'
import btnShare from '../assets/buttons/share.png'
import btnPlayAgain from '../assets/buttons/playagain.png'

/**
 * PreviewModal
 * 
 * Component ที่แสดงผลลัพธ์ (ภาพนิ่งหรือวิดีโอ) และจัดการ action ของผู้ใช้
 * - ปรับปรุง Layout ปุ่มใหม่เป็น 3 ปุ่ม
 * - แก้ปัญหา Asset โหลดช้าโดยใช้ Preloader และจัดการ State
 */
const PreviewModal = ({ preview, onRetry, onSave, onShare }) => {
  const videoRef = useRef(null)
  const [areAssetsReady] = useState(true) // ไม่ต้อง preload background image

  const inLine = useMemo(() => isInLine(), [])

  // --- Platform detection ---
  let isIOS_Safari = false
  try {
    const { isIOS, isSafari } = detectBrowserAndPlatform()
    isIOS_Safari = isIOS || (isSafari && /iP(hone|od|ad)/.test(navigator.userAgent))
  } catch {
    isIOS_Safari = false
  }

  // Effect จัดการการเล่นวิดีโอ
  useEffect(() => {
    if (preview.type === 'video' && videoRef.current) {
      // บังคับให้เล่นอีกครั้งเมื่อ component แสดงผล
      videoRef.current.play().catch(error => {
        console.warn('Video autoplay was prevented on preview:', error)
      })
    }
  }, [preview.type, preview.url])

  // ฟังก์ชันจัดการการบันทึก
  const handleSave = () => {
    onSave()
  }

  // ฟังก์ชันจัดการการแชร์
  const handleShare = () => {
    onShare()
  }

  if (!preview.type || !preview.url) return null

  return (
    <>
      {areAssetsReady && (
        <div
          className="preview-modal visible"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-heading"
        >
          <div className="preview-content-frame" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* เราจะใส่กรอบ (border) ให้กับ content โดยตรง แทนที่จะหวังพึ่ง frame */}
            {preview.type === 'photo' && (
              <img
                src={preview.url}
                alt="Capture preview"
                className="preview-content with-border"
                style={{ position: 'relative', zIndex: 1 }}
              />
            )}

            {preview.type === 'video' && (
              <video
                ref={videoRef}
                src={preview.url}
                autoPlay
                loop
                muted
                playsInline
                className="preview-content with-border"
                style={{ position: 'relative', zIndex: 1 }}
              />
            )}
          </div>

          <h2 id="preview-heading" className="visually-hidden">Content Preview</h2>

          {/* --- Layout ปุ่มแบบใหม่ --- */}
          <div className="preview-actions-container">
            {isIOS_Safari ? (
              <>
                <div className="preview-actions-top-row">
                  <button className="image-button preview-icon-button" type="button" onClick={handleShare} aria-label="บันทึก">
                    <img src={btnDownload} alt="บันทึก" />
                  </button>
                  <button className="image-button preview-icon-button" type="button" onClick={onRetry} aria-label="เล่นอีกครั้ง">
                    <img src={btnPlayAgain} alt="เล่นอีกครั้ง" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="preview-actions-top-row">
                  {/* Chrome/Android: show 3 buttons in one row (download/share/playagain) */}
                  <button className="image-button preview-icon-button" type="button" onClick={handleSave} aria-label="บันทึก">
                    <img src={btnDownload} alt="บันทึก" />
                  </button>

                  {!inLine && (
                    <button className="image-button preview-icon-button" type="button" onClick={handleShare} aria-label="แชร์">
                      <img src={btnShare} alt="แชร์" />
                    </button>
                  )}

                  <button className="image-button preview-icon-button" type="button" onClick={onRetry} aria-label="เล่นอีกครั้ง">
                    <img src={btnPlayAgain} alt="เล่นอีกครั้ง" />
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      )}
    </>
  )
}

export default PreviewModal

