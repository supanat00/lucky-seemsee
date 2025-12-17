import { useRef, useEffect, useState } from 'react'
import { detectBrowserAndPlatform } from '../utils/deviceUtils'
import './PreviewModal.css'

/**
 * PreviewModal
 * 
 * Component ที่แสดงผลลัพธ์ (ภาพนิ่งหรือวิดีโอ) และจัดการ action ของผู้ใช้
 * - ปรับปรุง Layout ปุ่มใหม่เป็น 3 ปุ่ม
 * - แก้ปัญหา Asset โหลดช้าโดยใช้ Preloader และจัดการ State
 */
const PreviewModal = ({ preview, onRetry, onSave, onShare }) => {
  const videoRef = useRef(null)
  const [areAssetsReady, setAreAssetsReady] = useState(true) // ไม่ต้อง preload background image
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')

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

  // ฟังก์ชันแสดงผลยืนยัน
  const showFeedbackMessage = (message) => {
    setFeedbackMessage(message)
    setShowFeedback(true)
    setTimeout(() => setShowFeedback(false), 2000)
  }

  // ฟังก์ชันจัดการการบันทึก
  const handleSave = () => {
    onSave()
    showFeedbackMessage('✅ บันทึกแล้ว!')
  }

  // ฟังก์ชันจัดการการแชร์
  const handleShare = () => {
    onShare()
    showFeedbackMessage('📤 แชร์แล้ว!')
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
                  <button className="preview-button primary" onClick={onRetry}>
                    เล่นอีกครั้ง
                  </button>
                  <button className="preview-button secondary" onClick={handleShare}>
                    บันทึก
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="preview-actions-top-row">
                  <button className="preview-button secondary" onClick={handleSave}>
                    บันทึก
                  </button>
                  <button className="preview-button secondary" onClick={handleShare}>
                    แชร์
                  </button>
                </div>
                <button className="preview-button primary full-width retry-bottom-btn" style={{ marginTop: '14px' }} onClick={onRetry}>
                  เล่นอีกครั้ง
                </button>
              </>
            )}
          </div>

          {/* --- การแสดงผลยืนยัน --- */}
          {showFeedback && (
            <div className="feedback-message">
              <p>{feedbackMessage}</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default PreviewModal

