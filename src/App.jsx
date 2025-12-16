import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import CameraStage from './components/CameraStage'
import HomeScreen from './components/HomeScreen'
import HorseScreen from './components/HorseScreen'
import ShakeScreen from './components/ShakeScreen'
import FortuneScreen from './components/FortuneScreen'
import WallpaperScreen from './components/WallpaperScreen'
import horseModel from './assets/models/house_test.glb'
import head1 from './assets/head_text/head_text01.png'
import head2 from './assets/head_text/head_text02.png'
import head3 from './assets/head_text/head_text03.png'
import head4 from './assets/head_text/head_text04.png'
import head5 from './assets/head_text/head_text05.png'
import text1 from './assets/text/text01.png'
import text2 from './assets/text/text02.png'
import text3 from './assets/text/text03.png'
import text4 from './assets/text/text04.png'
import text5 from './assets/text/text05.png'

function App() {
  const [view, setView] = useState('home') // 'home' | 'shake' | 'horse'
  const [cameraError, setCameraError] = useState('')
  const [captureMode, setCaptureMode] = useState('photo') // 'photo' | 'video'
  const [isRecording, setIsRecording] = useState(false)
  const [preview, setPreview] = useState({ type: null, url: null }) // type: 'photo' | 'video'
  const [shakeTrigger, setShakeTrigger] = useState(0)
  const [fortuneIndex, setFortuneIndex] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState('')
  const [selectedZodiac, setSelectedZodiac] = useState('')
  const [motionAllowed, setMotionAllowed] = useState(false)

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
    if (view !== 'shake' || !motionAllowed) return

    window.addEventListener('devicemotion', handleShake)
    return () => {
      window.removeEventListener('devicemotion', handleShake)
    }
  }, [handleShake, view, motionAllowed])

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

  const requestMotionPermission = async () => {
    try {
      const DeviceMotionEventRef = window.DeviceMotionEvent
      if (DeviceMotionEventRef && typeof DeviceMotionEventRef.requestPermission === 'function') {
        const result = await DeviceMotionEventRef.requestPermission()
        setMotionAllowed(result === 'granted')
      } else {
        setMotionAllowed(true) // not needed on this platform
      }
    } catch (err) {
      console.error(err)
      setMotionAllowed(true) // best-effort allow listener
    }
  }

  const goToShake = async () => {
    await requestMotionPermission()
    setView('shake')
  }

  const goToHorse = () => {
    setPreview({ type: null, url: null })
    setIsRecording(false)
    setCaptureMode('photo')
    setView('horse')
  }

  const goToFortune = () => {
    const idx = Math.floor(Math.random() * 5)
    setFortuneIndex(idx)
    setView('fortune')
  }

  const goToWallpaper = () => {
    setView('wallpaper')
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

  if (view === 'fortune') {
    const headList = [head1, head2, head3, head4, head5]
    const textList = [text1, text2, text3, text4, text5]
    const idx = fortuneIndex ?? 0
    return (
      <CameraStage videoRef={videoRef}>
        <FortuneScreen
          onBack={goHome}
          onConfirm={(type) => {
            if (type === 'wallpaper') {
              goToWallpaper()
            }
          }}
          headSrc={headList[idx]}
          textSrc={textList[idx]}
        />
      </CameraStage>
    )
  }

  if (view === 'wallpaper') {
    const topicOptions = [
      { value: 'health', label: 'สุขภาพ' },
      { value: 'love', label: 'ความรัก' },
      { value: 'career', label: 'การงาน' },
      { value: 'money', label: 'การเงิน' },
    ]
    const zodiacOptions = [
      { value: 'rat', label: 'ชวด' },
      { value: 'ox', label: 'ฉลู' },
      { value: 'tiger', label: 'ขาล' },
      { value: 'rabbit', label: 'เถาะ' },
      { value: 'dragon', label: 'มะโรง' },
      { value: 'snake', label: 'มะเส็ง' },
      { value: 'horse', label: 'มะเมีย' },
      { value: 'goat', label: 'มะแม' },
      { value: 'monkey', label: 'วอก' },
      { value: 'rooster', label: 'ระกา' },
      { value: 'dog', label: 'จอ' },
      { value: 'pig', label: 'กุน' },
    ]

    return (
      <CameraStage videoRef={videoRef}>
        <WallpaperScreen
          onBack={goHome}
          onCreate={goHome}
          topicOptions={topicOptions}
          zodiacOptions={zodiacOptions}
          selectedTopic={selectedTopic}
          selectedZodiac={selectedZodiac}
          setSelectedTopic={setSelectedTopic}
          setSelectedZodiac={setSelectedZodiac}
        />
      </CameraStage>
    )
  }

  return (
    <CameraStage videoRef={videoRef}>
      <ShakeScreen
        onBack={goHome}
        shakeTrigger={shakeTrigger}
        onSequenceDone={goToFortune}
      />
    </CameraStage>
  )
}

export default App
