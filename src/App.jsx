import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import CameraStage from './components/CameraStage'
import HomeScreen from './components/HomeScreen'
import HorseScreen from './components/HorseScreen'
import ShakeScreen from './components/ShakeScreen'
import horseModel from './assets/models/house_test.glb'

function App() {
  const [view, setView] = useState('home') // 'home' | 'shake' | 'horse'
  const [isStarted, setIsStarted] = useState(false)
  const [message, setMessage] = useState('กดปุ่มด้านล่างเพื่อเริ่มต้น')
  const [bgColor, setBgColor] = useState('#242424')
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
      setMessage('กำลังเสี่ยงเซียมซี...')
    }
  }, [])

  useEffect(() => {
    if (!isStarted || view !== 'shake') return

    async function enableMotion() {
      try {
        const DeviceMotionEventRef = window.DeviceMotionEvent
        if (
          DeviceMotionEventRef &&
          typeof DeviceMotionEventRef.requestPermission === 'function'
        ) {
          const result = await DeviceMotionEventRef.requestPermission()
          if (result !== 'granted') {
            setMessage('ไม่สามารถเปิดใช้งานการตรวจจับการเขย่าได้ (permission ถูกปฏิเสธ)')
            return
          }
        }

        window.addEventListener('devicemotion', handleShake)
        setMessage('โปรดเขย่าหน้าจอ')
      } catch (err) {
        console.error(err)
        setMessage('เบราว์เซอร์นี้ไม่รองรับ devicemotion หรือไม่สามารถใช้งานได้')
      }
    }

    enableMotion()

    return () => {
      window.removeEventListener('devicemotion', handleShake)
    }
  }, [isStarted, handleShake, view])

  // โหลดสคริปต์ model-viewer ถ้ายังไม่มี (สำหรับหน้า horse)
  useEffect(() => {
    if (window.customElements?.get('model-viewer')) return
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js'
    document.head.appendChild(script)
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

  const onStartClick = () => {
    setIsStarted(true)
  }

  const goHome = () => {
    setIsStarted(false)
    setMessage('กดปุ่มด้านล่างเพื่อเริ่มต้น')
    setBgColor('#242424')
    setView('home')
  }

  const goToShake = () => {
    setIsStarted(false)
    setMessage('กดปุ่มด้านล่างเพื่อเริ่มต้น')
    setBgColor('#242424')
    setView('shake')
  }

  const goToHorse = () => {
    setIsStarted(false)
    setMessage('กดปุ่มด้านล่างเพื่อเริ่มต้น')
    setBgColor('#242424')
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
        bgColor={bgColor}
        message={message}
        isStarted={isStarted}
        onStartClick={onStartClick}
        onBack={goHome}
        onSequenceDone={() => setMessage('เขย่าอีกครั้งเพื่อเสี่ยงใหม่')}
        shakeTrigger={shakeTrigger}
      />
    </CameraStage>
  )
}

export default App
