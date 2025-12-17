import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import GLBModel from './GLBModel'
import houseTestModel from '../assets/models/house_test.glb'
import cameraIcon from '../assets/svg/camera-icon.svg'
import recIcon from '../assets/svg/rec-icon.svg'
import wish01 from '../assets/horse_fire/wish01.png'
import wish02 from '../assets/horse_fire/wish02.png'
import wish03 from '../assets/horse_fire/wish03.png'
import wish04 from '../assets/horse_fire/wish04.png'
import wish05 from '../assets/horse_fire/wish05.png'
import wishPropR from '../assets/horse_fire/wish_prop_r.png'
import wishPropL from '../assets/horse_fire/wish_prop_l.png'

// Preload default model once at module load
useGLTF.preload(houseTestModel)

function HorseScreen({
  onBack,
  captureMode,
  setCaptureMode,
  isRecording,
  handleCapture,
  preview,
  closePreview,
  cameraError,
  modelSrc,
}) {
  const toggleMode = () => {
    if (isRecording) return
    setCaptureMode(captureMode === 'photo' ? 'video' : 'photo')
  }

  const canvasKey = useMemo(() => modelSrc || 'horse-canvas', [modelSrc])

  // Random wish image (1-5)
  const wishImages = [wish01, wish02, wish03, wish04, wish05]
  const [selectedWish] = useState(() => {
    const randomIndex = Math.floor(Math.random() * 5)
    return wishImages[randomIndex]
  })

  // Preload incoming modelSrc (if different) before render to reduce flicker
  useEffect(() => {
    const target = modelSrc || houseTestModel
    if (!target) return
    try {
      useGLTF.preload(target)
    } catch (err) {
      console.error('preload model failed', err)
    }
  }, [modelSrc])

  return (
    <div className="app-root horse-root">
      <button className="back-icon" type="button" onClick={onBack} aria-label="Back">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Wish image at top */}
      <div className="wish-image-container">
        <img src={selectedWish} alt="wish" className="wish-image" />
      </div>

      {/* Decorative props */}
      <img src={wishPropR} alt="" className="wish-prop wish-prop-r" />
      <img src={wishPropL} alt="" className="wish-prop wish-prop-l" />

      <div className="horse-container minimal">
        <div className="model-frame minimal">
          <Canvas
            key={canvasKey}
            camera={{ position: [0, 0, 5], fov: 50 }}
            style={{ width: '100%', height: '100%', background: 'transparent' }}
          >
            <ambientLight intensity={1} />
            <directionalLight position={[5, 5, 5]} intensity={1.5} />
            <pointLight position={[-5, -5, -5]} intensity={0.5} />
            <Suspense fallback={null}>
              <GLBModel
                modelPath={modelSrc || houseTestModel}
                animationName="loop"
                scale={1.25}
                position={[-0.25, -2, 0]} // ขยับลงด้านล่างมากขึ้น
                rotation={[-0.25, 0, 0]} // หมุนโมเดลไปทางซ้าย
              />
            </Suspense>

          </Canvas>
        </div>

        <div className="capture-panel minimal">
          <label id="switch-button" className="switch" htmlFor="mode-switch">
            <input
              type="checkbox"
              id="mode-switch"
              className="input"
              checked={captureMode === 'video'}
              onChange={toggleMode}
              disabled={isRecording}
              aria-label="toggle photo/video"
            />
            {/* video mode icon */}
            <span className="rec-icon">
              <img src={recIcon} alt="video mode" />
            </span>
            {/* camera mode icon */}
            <span className="camera-icon">
              <img src={cameraIcon} alt="camera mode" />
            </span>
            <span className="slider"></span>
          </label>

          <button
            type="button"
            className={`capture-circle ${captureMode} ${isRecording ? 'recording' : ''}`}
            onClick={handleCapture}
            disabled={!!cameraError}
            aria-label={captureMode === 'photo' ? 'ถ่ายภาพ' : isRecording ? 'หยุดบันทึก' : 'เริ่มบันทึก'}
          >
            <span className="ring">
              {isRecording && (
                <svg className="progress-ring" viewBox="0 0 100 100">
                  <circle
                    className="progress-circle-bg"
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="3"
                  />
                  <circle
                    className="progress-circle"
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeDasharray="283"
                    strokeDashoffset="283"
                  />
                </svg>
              )}
            </span>
            <span className="core" />
          </button>
        </div>

        {preview.type && (
          <div className="preview-modal">
            <div className="preview-card">
              <button className="close-preview" onClick={closePreview} type="button">
                ✕
              </button>
              {preview.type === 'photo' ? (
                <img src={preview.url} alt="preview" />
              ) : (
                <video controls src={preview.url} autoPlay loop />
              )}
            </div>
          </div>
        )}

        {cameraError && <div className="error-banner">{cameraError}</div>}
      </div>
    </div>
  )
}

export default HorseScreen

