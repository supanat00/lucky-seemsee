import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import GLBModel from './GLBModel'
import houseTestModel from '../assets/models/house_test.glb'

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
                scale={1.5} // ลดขนาดลง ~20%
                position={[0, -1, 0]} // ขยับลงด้านล่าง
              />
            </Suspense>

          </Canvas>
        </div>

        <div className="capture-panel minimal">
          <button
            type="button"
            className="mode-switch"
            onClick={toggleMode}
            disabled={isRecording}
            aria-label="toggle photo/video"
          >
            <span className={`switch-track ${captureMode}`} />
            <span className={`switch-knob ${captureMode}`}>
              {captureMode === 'photo' ? '📸' : '🎥'}
            </span>
          </button>

          <button
            type="button"
            className={`capture-circle ${captureMode} ${isRecording ? 'recording' : ''}`}
            onClick={handleCapture}
            disabled={!!cameraError}
            aria-label={captureMode === 'photo' ? 'ถ่ายภาพ' : isRecording ? 'หยุดบันทึก' : 'เริ่มบันทึก'}
          >
            <span className="ring" />
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

