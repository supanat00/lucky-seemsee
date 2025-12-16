import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import CameraStage from './components/CameraStage'
import HomeScreen from './components/HomeScreen'
import HorseScreen from './components/HorseScreen'
import ShakeScreen from './components/ShakeScreen'
import horseModel from './assets/models/house_test.glb'

function App() {
  const [view, setView] = useState('home') // 'home' | 'shake' | 'horse'
  const [cameraError, setCameraError] = useState('')
  const [captureMode, setCaptureMode] = useState('photo') // 'photo' | 'video'
  const [isRecording, setIsRecording] = useState(false)
  const [preview, setPreview] = useState({ type: null, url: null }) // type: 'photo' | 'video'
  const [shakeTrigger, setShakeTrigger] = useState(0)

  const lastShakeTimeRef = useRef(0)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const recordingTimeoutRef = useRef(null)

  const handleShake = useCallback((event) => {
    const acc = event.accelerationIncludingGravity || event.acceleration
    if (!acc) return

    const x = acc.x || 0
    const y = acc.y || 0
    const z = acc.z || 0

    const magnitude = Math.sqrt(x * x + y * y + z * z)
    const now = Date.now()
    const threshold = 15
    const minInterval = 800

    if (magnitude > threshold && now - lastShakeTimeRef.current > minInterval) {
      lastShakeTimeRef.current = now
      setShakeTrigger((v) => v + 1) // trigger image sequence
    }
  }, [])

  useEffect(() => {
    if (view !== 'shake') return

    async function enableMotion() {
      try {
        const DeviceMotionEventRef = window.DeviceMotionEvent
        if (
          DeviceMotionEventRef &&
          typeof DeviceMotionEventRef.requestPermission === 'function'
        ) {
          const result = await DeviceMotionEventRef.requestPermission()
          if (result !== 'granted') {
            return
          }
        }

        window.addEventListener('devicemotion', handleShake)
      } catch (err) {
        console.error(err)
      }
    }

    enableMotion()

    return () => {
      window.removeEventListener('devicemotion', handleShake)
    }
  }, [handleShake, view])

  // โหลดสคริปต์ model-viewer ถ้ายังไม่มี (สำหรับหน้า horse)
  useEffect(() => {
    if (window.customElements?.get('model-viewer')) return
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js'
    document.head.appendChild(script)
  }, [])

  // preload โมเดลม้าไฟไว้ล่วงหน้า เพื่อให้แสดงได้ทันทีเมื่อเข้าหน้า
  useEffect(() => {
    fetch(horseModel).catch((err) => {
      console.error('preload horse model failed', err)
    })
  }, [])

  // เปิดกล้องหน้าเป็นพื้นหลังตั้งแต่เข้าแอป
  useEffect(() => {
    async function startCamera() {
      try {
        if (streamRef.current) return
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'user' } },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setCameraError('')
      } catch (err) {
        console.error(err)
        setCameraError('ไม่สามารถเปิดกล้องหน้าได้ โปรดตรวจสอบ permission หรืออุปกรณ์')
      }
    }

    startCamera()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  // อัปเดต srcObject เมื่อ videoRef เปลี่ยน
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [videoRef])

  const goHome = () => {
    setView('home')
  }

  const goToShake = () => {
    setView('shake')
  }

  const goToHorse = () => {
    setPreview({ type: null, url: null })
    setIsRecording(false)
    setCaptureMode('photo')
    setView('horse')
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    const videoEl = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = videoEl.videoWidth || 720
    canvas.height = videoEl.videoHeight || 1280
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/png')
    setPreview({ type: 'photo', url: dataUrl })
  }

  const startRecording = () => {
    if (!streamRef.current) return
    recordedChunksRef.current = []
    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' })
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        setIsRecording(false)
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        setPreview({ type: 'video', url })
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current)
          recordingTimeoutRef.current = null
        }
      }
      recorder.start()
      setIsRecording(true)
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording()
      }, 30000)
    } catch (err) {
      console.error(err)
      setCameraError('ไม่สามารถเริ่มอัดวิดีโอได้')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }
  }

  const handleCapture = () => {
    if (captureMode === 'photo') {
      capturePhoto()
    } else if (captureMode === 'video') {
      if (isRecording) {
        stopRecording()
      } else {
        startRecording()
      }
    }
  }

  const closePreview = () => {
    setPreview({ type: null, url: null })
  }

  if (view === 'home') {
    return (
      <CameraStage videoRef={videoRef}>
        <HomeScreen onHorse={goToHorse} onShake={goToShake} cameraError={cameraError} />
      </CameraStage>
    )
  }

  if (view === 'horse') {
    return (
      <CameraStage videoRef={videoRef}>
        <HorseScreen
          onBack={goHome}
          captureMode={captureMode}
          setCaptureMode={(mode) => {
            if (!isRecording) setCaptureMode(mode)
          }}
          isRecording={isRecording}
          handleCapture={handleCapture}
          preview={preview}
          closePreview={closePreview}
          cameraError={cameraError}
          modelSrc={horseModel}
        />
      </CameraStage>
    )
  }

  return (
    <CameraStage videoRef={videoRef}>
      <ShakeScreen
        onBack={goHome}
        shakeTrigger={shakeTrigger}
      />
    </CameraStage>
  )
}

export default App
