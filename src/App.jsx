import { useCallback, useEffect, useRef, useState } from 'react'
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { createCorrectBlob } from './utils/videoUtils'
import { detectBrowserAndPlatform, isAndroid, isChrome, getVideoMimeTypes } from './utils/deviceUtils'
import { buildAiWallpaperPrompt } from './utils/aiWallpaperPrompt'
import { generateImageFromPrompt } from './services/openaiImageApi'
import { getLineUserId, initLiff, isInLine } from './services/liffService'
import { uploadImageToCloudinary } from './services/cloudinaryService'
import { mockGenerateAndUploadAiWallpaper } from './services/aiWallpaperMock'
import './App.css'
import CameraStage from './components/CameraStage'
import HomeScreen from './components/HomeScreen'
import HorseScreen from './components/HorseScreen'
import ShakeScreen from './components/ShakeScreen'
import FortuneScreen from './components/FortuneScreen'
import WallpaperScreen from './components/WallpaperScreen'
import horseModel from './assets/models/house_test.glb'
import wish01 from './assets/horse_fire/wish01.png'
import wish02 from './assets/horse_fire/wish02.png'
import wish03 from './assets/horse_fire/wish03.png'
import wish04 from './assets/horse_fire/wish04.png'
import wish05 from './assets/horse_fire/wish05.png'
import wishPropRImg from './assets/horse_fire/wish_prop_r.png'
import wishPropLImg from './assets/horse_fire/wish_prop_l.png'
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

const HORSE_WISH_IMAGES = [wish01, wish02, wish03, wish04, wish05]

const WALLPAPER_TOPIC_OPTIONS = [
  { value: 'health', label: 'สุขภาพ' },
  { value: 'love', label: 'ความรัก' },
  { value: 'career', label: 'การงาน' },
  { value: 'money', label: 'การเงิน' },
]

const WALLPAPER_ZODIAC_OPTIONS = [
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

/**
 * Main App Component
 * จัดการ routing, state management, และ camera logic
 */
function App() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================

  /** หน้าปัจจุบัน: 'home' | 'shake' | 'horse' | 'fortune' | 'wallpaper' */
  const [view, setView] = useState('home')

  /** ข้อความ error จากกล้อง */
  const [cameraError, setCameraError] = useState('')

  /** โหมดถ่ายภาพ: 'photo' | 'video' */
  const [captureMode, setCaptureMode] = useState('photo')

  /** สถานะการบันทึกวิดีโอ */
  const [isRecording, setIsRecording] = useState(false)

  /** สถานะการประมวลผลวิดีโอหลังอัดเสร็จ */
  const [isProcessing, setIsProcessing] = useState(false)

  /** Preview ของภาพ/วิดีโอที่ถ่าย: { type: 'photo' | 'video' | null, url: string | null } */
  const [preview, setPreview] = useState({ type: null, url: null })

  /** Wish image ที่ใช้ในหน้า horse (ต้อง deterministic เพื่อให้ output เหมือนกันทุกเครื่อง) */
  const [selectedWishSrc, setSelectedWishSrc] = useState(HORSE_WISH_IMAGES[0])

  /** Trigger สำหรับเขย่าเซียมซี (increment เมื่อเขย่า) */
  const [shakeTrigger, setShakeTrigger] = useState(0)

  /** Index ของเซียมซีที่ได้ (0-4) */
  const [fortuneIndex, setFortuneIndex] = useState(null)

  /** ตัวเลือกเสริมดวงสำหรับวอลเปเปอร์ */
  const [selectedTopic, setSelectedTopic] = useState('')

  /** ตัวเลือกปีนักษัตรสำหรับวอลเปเปอร์ */
  const [selectedZodiac, setSelectedZodiac] = useState('')

  /** AI wallpaper mock state */
  const [aiWallpaperStatus, setAiWallpaperStatus] = useState('idle') // 'idle' | 'generating' | 'ready' | 'error'
  const [aiWallpaperResult, setAiWallpaperResult] = useState(null)
  const [aiWallpaperError, setAiWallpaperError] = useState('')

  // ============================================
  // REFS
  // ============================================

  /** เวลาที่เขย่าครั้งล่าสุด (เพื่อป้องกันการเขย่าซ้ำ) */
  const lastShakeTimeRef = useRef(0)

  /** Reference ไปยัง video element */
  const videoRef = useRef(null)

  /** Reference ไปยัง camera stream */
  const streamRef = useRef(null)

  /** Reference ไปยัง MediaRecorder */
  const mediaRecorderRef = useRef(null)

  /** Chunks ของวิดีโอที่บันทึก */
  const recordedChunksRef = useRef([])

  /** Timeout สำหรับจำกัดเวลาบันทึกวิดีโอ (30 วินาที) */
  const recordingTimeoutRef = useRef(null)

  /** Reference ไปยัง container ของ HorseScreen (สำหรับ AR capture) */
  const horseContainerRef = useRef(null)

  /** Reference ไปยัง Three.js Canvas (สำหรับ AR capture) */
  const threeCanvasRef = useRef(null)

  /** Reference ไปยัง composite canvas สำหรับ video recording */
  const compositeCanvasRef = useRef(null)

  /** Animation frame ID สำหรับ video recording */
  const recordingAnimationFrameRef = useRef(null)

  /** Refs สำหรับ mp4-muxer (Android/Chrome) */
  const muxerRef = useRef(null)
  const videoEncoderRef = useRef(null)
  const audioEncoderRef = useRef(null)
  const isRecordingRef = useRef(false)
  const audioTrackRef = useRef(null)
  const audioSourceNodeRef = useRef(null)
  const audioProcessorNodeRef = useRef(null)
  const audioStreamRef = useRef(null)

  /** Cache รูป overlay เพื่อไม่ต้องโหลดซ้ำ */
  const overlayImageCacheRef = useRef(new Map())

  const loadOverlayImage = useCallback((src) => {
    if (!src) return Promise.resolve(null)

    const cached = overlayImageCacheRef.current.get(src)
    if (cached) return cached

    const promise = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Failed to load overlay image: ${src}`))
      img.src = src
    })

    overlayImageCacheRef.current.set(src, promise)
    return promise
  }, [])

  const drawHorseOverlayFixed = useCallback((ctx, W, H, wishImg, propRImg, propLImg) => {
    if (!ctx) return

    // === Wish image (match existing design but deterministic in 720x1280 space) ===
    if (wishImg?.naturalWidth && wishImg?.naturalHeight) {
      const wishW = W * 1.3
      const wishX = W * 0.5 - wishW * 0.42
      // ขยับขึ้นด้านบนอีกเล็กน้อยให้ตรงกับหน้าจอ preview (match CSS padding-top: 40px)
      const wishY = 40
      const wishH = wishW * (wishImg.naturalHeight / wishImg.naturalWidth)
      ctx.drawImage(
        wishImg,
        Math.round(wishX),
        Math.round(wishY),
        Math.round(wishW),
        Math.round(wishH)
      )
    }

    // === Props (match CSS: bottom 12%, widths 38%/40% + translateX) ===
    if (propRImg?.naturalWidth && propRImg?.naturalHeight) {
      const w = W * 0.38
      const h = w * (propRImg.naturalHeight / propRImg.naturalWidth)
      const x = W - 0.7 * w // right:0 + translateX(30%) => W - w + 0.3w = W - 0.7w
      // ขยับ prop ขวาลงอีกเล็กน้อยให้ตรงตามต้องการ (match CSS bottom: 8%)
      const y = H * (1 + 0.015) - h
      ctx.drawImage(propRImg, Math.round(x), Math.round(y), Math.round(w), Math.round(h))
    }

    if (propLImg?.naturalWidth && propLImg?.naturalHeight) {
      const w = W * 0.4
      const h = w * (propLImg.naturalHeight / propLImg.naturalWidth)
      const x = -0.60 * w // left:0 + translateX(-50%)
      const y = H * (1 - 0.12) - h
      ctx.drawImage(propLImg, Math.round(x), Math.round(y), Math.round(w), Math.round(h))
    }
  }, [])

  // ============================================
  // EVENT HANDLERS
  // ============================================

  /**
   * จัดการการเขย่าเครื่อง
   * ตรวจสอบความแรงของการเขย่าและ trigger sequence
   */
  const handleShake = useCallback((event) => {
    const acc = event.accelerationIncludingGravity || event.acceleration
    if (!acc) return

    const x = acc.x || 0
    const y = acc.y || 0
    const z = acc.z || 0

    const magnitude = Math.sqrt(x * x + y * y + z * z)
    const now = Date.now()
    const threshold = 15 // ความแรงขั้นต่ำ
    const minInterval = 800 // ระยะเวลาขั้นต่ำระหว่างการเขย่า (ms)

    if (magnitude > threshold && now - lastShakeTimeRef.current > minInterval) {
      lastShakeTimeRef.current = now
      setShakeTrigger((v) => v + 1)
    }
  }, [])

  // ============================================
  // EFFECTS
  // ============================================

  /**
   * ตั้งค่า DeviceMotion listener สำหรับหน้า shake
   */
  useEffect(() => {
    if (view !== 'shake') return

    window.addEventListener('devicemotion', handleShake)
    return () => {
      window.removeEventListener('devicemotion', handleShake)
    }
  }, [handleShake, view])

  /**
   * โหลดสคริปต์ model-viewer ถ้ายังไม่มี (สำหรับหน้า horse)
   */
  useEffect(() => {
    if (window.customElements?.get('model-viewer')) return
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js'
    document.head.appendChild(script)
  }, [])

  /**
   * Preload โมเดลม้าไฟไว้ล่วงหน้า เพื่อให้แสดงได้ทันทีเมื่อเข้าหน้า
   */
  useEffect(() => {
    fetch(horseModel).catch((err) => {
      console.error('preload horse model failed', err)
    })
  }, [])

  /**
   * เปิดกล้องหน้าเป็นพื้นหลังตั้งแต่เข้าแอป
   */
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

  // Init LIFF once (safe no-op in normal browsers when VITE_LIFF_ID not set)
  useEffect(() => {
    initLiff().catch(() => null)
  }, [])

  /**
   * อัปเดต srcObject เมื่อ videoRef เปลี่ยน
   */
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [videoRef])

  // ============================================
  // NAVIGATION FUNCTIONS
  // ============================================

  /**
   * กลับไปหน้าหลัก
   * ทำความสะอาด state และหยุดการบันทึกวิดีโอ (ถ้ามี)
   */
  const goHome = () => {
    // Stop recording if active
    if (isRecording && mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop()
        }
      } catch (err) {
        console.error('Error stopping recorder:', err)
      }
    }
    setIsRecording(false)
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }
    setPreview({ type: null, url: null })
    // reset wallpaper selections so user can "play again" without confusion
    setSelectedTopic('')
    setSelectedZodiac('')
    setAiWallpaperStatus('idle')
    setAiWallpaperResult(null)
    setAiWallpaperError('')
    setShakeTrigger(0)
    setView('home')
  }

  /**
   * ไปหน้าหน้าเขย่าเซียมซี
   * ขอ permission สำหรับ DeviceMotion (iOS) และรีเซ็ต state
   */
  const goToShake = async () => {
    try {
      const DeviceMotionEventRef = window.DeviceMotionEvent
      if (DeviceMotionEventRef && typeof DeviceMotionEventRef.requestPermission === 'function') {
        await DeviceMotionEventRef.requestPermission().catch(() => null)
      }
    } catch (err) {
      console.error(err)
    }
    setShakeTrigger(0)
    lastShakeTimeRef.current = 0
    setView('shake')
  }

  /**
   * ไปหน้าถ่ายภาพมงคล
   * รีเซ็ต preview และ recording state
   */
  const goToHorse = () => {
    setPreview({ type: null, url: null })
    setIsRecording(false)
    setCaptureMode('photo')
    // เลือก wish ให้คงที่สำหรับ session นี้ (photo+video ใช้รูปเดียวกัน)
    const randomWish = HORSE_WISH_IMAGES[Math.floor(Math.random() * HORSE_WISH_IMAGES.length)]
    setSelectedWishSrc(randomWish)
    setView('horse')
  }

  /**
   * ไปหน้าแสดงผลเซียมซี
   * สุ่ม index ของเซียมซี (0-4)
   */
  const goToFortune = () => {
    const idx = Math.floor(Math.random() * 5)
    setFortuneIndex(idx)
    setView('fortune')
  }

  /**
   * ไปหน้าสร้างวอลเปเปอร์
   */
  const goToWallpaper = () => {
    // reset to blank defaults every time user enters this step
    setSelectedTopic('')
    setSelectedZodiac('')
    setAiWallpaperStatus('idle')
    setAiWallpaperResult(null)
    setAiWallpaperError('')
    setView('wallpaper')
  }

  const handleCreateAiWallpaper = useCallback(async () => {
    if (!selectedTopic || !selectedZodiac) return
    if (aiWallpaperStatus === 'generating') return

    const topicOpt = WALLPAPER_TOPIC_OPTIONS.find((o) => o.value === selectedTopic)
    const zodiacOpt = WALLPAPER_ZODIAC_OPTIONS.find((o) => o.value === selectedZodiac)
    const prompt = buildAiWallpaperPrompt({
      topicValue: selectedTopic,
      topicLabel: topicOpt?.label || selectedTopic,
      zodiacValue: selectedZodiac,
      zodiacLabel: zodiacOpt?.label || selectedZodiac,
    })

    console.log('🧠 AI Wallpaper prompt:', prompt)

    setAiWallpaperError('')
    setAiWallpaperResult(null)
    setAiWallpaperStatus('generating')
    try {
      // IMPORTANT: Save credits.
      // - LINE LIFF: use REAL OpenAI + REAL Cloudinary upload.
      // - Normal browsers (Android/Chrome, iOS/Safari, desktop): use MOCK images for now.
      try {
        await initLiff()
      } catch {
        // ignore
      }

      if (!isInLine()) {
        const mock = await mockGenerateAndUploadAiWallpaper({ prompt })
        setAiWallpaperResult(mock)
        setAiWallpaperStatus('ready')
        return
      }

      // 1) Generate image (REAL) - LIFF only
      const gen = await generateImageFromPrompt(prompt)
      if (!gen.success || !gen.base64) {
        throw new Error(gen.error || 'เกิดข้อผิดพลาดในการสร้างภาพ')
      }

      // 2) Upload to Cloudinary BEFORE showing preview (so preview can open link immediately)
      const userId = await getLineUserId()
      const publicId = userId ? `lucky_seemsee_wallpaper_${userId}` : 'lucky_seemsee_wallpaper_default'
      const up = await uploadImageToCloudinary({
        dataUrl: gen.base64,
        folder: 'lucky-seemsee',
        publicId,
      })
      if (!up.success || !up.url) {
        throw new Error(up.error || 'อัปโหลดไปยัง Cloudinary ไม่สำเร็จ')
      }

      // Cache busting for external browser:
      // Even if we overwrite the same public_id, external browsers/CDNs can serve a cached (old) image.
      // Cloudinary returns a "version" on upload; use it (fallback to timestamp) to force a fresh URL.
      // Use ms-level cache busting to avoid "old image" when multiple overwrites happen quickly
      // (Cloudinary version can be second-level; LINE/external browser can aggressively cache).
      const cacheKey = `${up.version || '0'}-${Date.now()}`
      const cloudUrl = `${up.url}${up.url.includes('?') ? '&' : '?'}cb=${encodeURIComponent(cacheKey)}`

      setAiWallpaperResult({
        imageSrc: gen.base64,
        cloudUrl,
        prompt,
        revisedPrompt: gen.revisedPrompt || null,
      })
      setAiWallpaperStatus('ready')
    } catch (e) {
      console.error('AI wallpaper failed:', e)
      setAiWallpaperError(e?.message || 'เกิดข้อผิดพลาดในการสร้างภาพ')
      setAiWallpaperStatus('error')
    }
  }, [aiWallpaperStatus, selectedTopic, selectedZodiac])

  const handleAiWallpaperPlayAgain = () => {
    // กลับไปหน้าแรกตามที่ต้องการ
    goHome()
  }

  // ============================================
  // CAPTURE FUNCTIONS
  // ============================================

  /**
   * ถ่ายภาพแบบ AR (รวม video + 3D model + decorative elements)
   * กลับด้านและตั้งเป็นแนวตั้ง
   */
  const capturePhoto = async () => {
    if (!videoRef.current || !horseContainerRef.current) return

    try {
      const videoEl = videoRef.current
      const container = horseContainerRef.current

      if (videoEl.readyState < 2) {
        await new Promise((resolve) => {
          videoEl.addEventListener('loadeddata', resolve, { once: true })
        })
      }

      // สร้าง canvas สำหรับ composite - ตั้งเป็นแนวตั้ง 9:16
      // ใช้ 720x1280 เพื่อไม่ให้เกิน AVC level 3.1 limit (921,600 pixels)
      const canvas = document.createElement('canvas')
      const OUTPUT_WIDTH = 720
      const OUTPUT_HEIGHT = 1280
      canvas.width = OUTPUT_WIDTH
      canvas.height = OUTPUT_HEIGHT
      const ctx = canvas.getContext('2d')

      // 1. วาด video stream ก่อน (เต็ม canvas 720x1280)
      const videoWidth = videoEl.videoWidth || OUTPUT_WIDTH
      const videoHeight = videoEl.videoHeight || OUTPUT_HEIGHT
      const videoAspect = videoWidth / videoHeight

      // คำนวณขนาด video ให้เต็ม canvas โดยยึดความสูงเป็นหลัก (9:16)
      let bgWidth = OUTPUT_WIDTH
      let bgHeight = bgWidth / videoAspect
      if (bgHeight < OUTPUT_HEIGHT) {
        bgHeight = OUTPUT_HEIGHT
        bgWidth = bgHeight * videoAspect
      }
      const bgX = (OUTPUT_WIDTH - bgWidth) / 2
      const bgY = (OUTPUT_HEIGHT - bgHeight) / 2

      // Mirror แนวนอน (สำหรับกล้องหน้า)
      ctx.save()
      ctx.translate(OUTPUT_WIDTH, 0)
      ctx.scale(-1, 1) // mirror แนวนอน
      ctx.drawImage(videoEl, bgX, bgY, bgWidth, bgHeight)
      ctx.restore()

      // 2. วาด decorative elements แบบ deterministic ใน output 720x1280 (ไม่อิง DOM)
      const [wishImg, propRImg, propLImg] = await Promise.all([
        loadOverlayImage(selectedWishSrc),
        loadOverlayImage(wishPropRImg),
        loadOverlayImage(wishPropLImg),
      ])
      drawHorseOverlayFixed(ctx, OUTPUT_WIDTH, OUTPUT_HEIGHT, wishImg, propRImg, propLImg)

      // 3. วาด Three.js canvas (3D model) ทับ
      // ใช้ threeCanvasRef ที่เก็บ gl.domElement ไว้แล้ว
      // ใช้วิธีเดียวกับ noodleverse: ใช้ canvas size โดยตรงและวาดให้เต็มความสูง
      const threeCanvasEl = threeCanvasRef.current
      if (threeCanvasEl && threeCanvasEl.width > 0 && threeCanvasEl.height > 0) {
        // คำนวณ aspect ratio ของ Three.js canvas
        const arAspectRatio = threeCanvasEl.width / threeCanvasEl.height

        // คำนวณขนาดใหม่ของ Three.js canvas ที่จะวาดลงไป โดยยึด "ความสูง" เป็นหลัก
        const drawHeight = OUTPUT_HEIGHT // กำหนดให้ความสูงเต็ม 1280px
        const drawWidth = drawHeight * arAspectRatio // คำนวณความกว้างตามสัดส่วนเดิม

        // คำนวณตำแหน่งในแนวนอน เพื่อให้ภาพอยู่กึ่งกลาง
        const drawX = (OUTPUT_WIDTH - drawWidth) / 2

        // วาด Three.js canvas ลงไปตรงกลาง โดยมีขนาดที่ถูกต้อง ไม่ล้นในแนวตั้ง
        ctx.drawImage(threeCanvasEl, drawX, 0, drawWidth, drawHeight)
        console.log('✅ Three.js canvas drawn successfully:', drawX, 0, drawWidth, drawHeight)
      } else {
        console.warn('❌ Three.js canvas element not found or has invalid size:', threeCanvasEl)
        // Fallback: ลอง query จาก DOM
        const modelFrame = container.querySelector('.model-frame')
        if (modelFrame) {
          const fallbackCanvas = modelFrame.querySelector('canvas')
          if (fallbackCanvas && fallbackCanvas.width > 0 && fallbackCanvas.height > 0) {
            console.log('Using fallback canvas from DOM')
            const arAspectRatio = fallbackCanvas.width / fallbackCanvas.height
            const drawHeight = OUTPUT_HEIGHT
            const drawWidth = drawHeight * arAspectRatio
            const drawX = (OUTPUT_WIDTH - drawWidth) / 2
            ctx.drawImage(fallbackCanvas, drawX, 0, drawWidth, drawHeight)
          }
        }
      }

      // canvas นี้คือผลลัพธ์สุดท้ายแล้ว (มี video + decorative elements + 3D model)

      const dataUrl = canvas.toDataURL('image/png')
      setPreview({ type: 'photo', url: dataUrl })
    } catch (error) {
      console.error('Error capturing photo:', error)
      setCameraError('ไม่สามารถถ่ายภาพได้')
    }
  }

  /**
   * ฟังก์ชันสำหรับใช้ mp4-muxer (Android/Chrome)
   */
  const startRecordingWithMuxer = useCallback(async () => {
    // ใช้ขนาด 720x1280 (9:16 portrait) เพื่อไม่ให้เกิน AVC level 3.1 limit (921,600 pixels)
    // 720x1280 = 921,600 pixels (พอดี limit)
    let videoWidth = 720
    let videoHeight = 1280

    if (videoWidth % 2 !== 0) videoWidth++
    if (videoHeight % 2 !== 0) videoHeight++

    muxerRef.current = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: 'avc', width: videoWidth, height: videoHeight },
      audio: { codec: 'aac', sampleRate: 44100, numberOfChannels: 1 },
      fastStart: 'in-memory',
    })

    videoEncoderRef.current = new VideoEncoder({
      output: (chunk, meta) => muxerRef.current.addVideoChunk(chunk, meta),
      error: (e) => console.error('VideoEncoder error:', e),
    })
    await videoEncoderRef.current.configure({
      codec: 'avc1.42001f', // AVC level 3.1 (รองรับได้ถึง 921,600 pixels)
      width: videoWidth,
      height: videoHeight,
      bitrate: 3_000_000, // ใช้ bitrate เดียวกับ noodleverse เพื่อคุณภาพที่ดีกว่า
    })

    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const sampleRate = audioContext.sampleRate

    // พยายามรับ audio stream จาก microphone
    let lastAudioTimestamp = 0

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      audioStreamRef.current = audioStream

      const audioSourceNode = audioContext.createMediaStreamSource(audioStream)
      audioSourceNodeRef.current = audioSourceNode

      const bufferSize = 4096
      const audioProcessorNode = audioContext.createScriptProcessor(bufferSize, 1, 1)
      audioProcessorNodeRef.current = audioProcessorNode

      audioProcessorNode.onaudioprocess = (event) => {
        if (!isRecordingRef.current || !audioEncoderRef.current) return

        const inputBuffer = event.inputBuffer
        const inputData = inputBuffer.getChannelData(0)

        // สร้าง AudioData และ encode
        try {
          const audioData = new AudioData({
            timestamp: lastAudioTimestamp,
            data: inputData,
            numberOfFrames: inputData.length,
            numberOfChannels: 1,
            sampleRate: sampleRate,
            format: 'f32-planar'
          })

          if (audioEncoderRef.current?.state === 'configured') {
            audioEncoderRef.current.encode(audioData)
            lastAudioTimestamp += Math.round((inputData.length / sampleRate) * 1_000_000) // microseconds
          }

          audioData.close()
        } catch (err) {
          console.error('Error encoding audio:', err)
        }
      }

      audioSourceNode.connect(audioProcessorNode)
      audioProcessorNode.connect(audioContext.destination)

      audioTrackRef.current = audioStream.getAudioTracks()[0]
      console.log('✅ Audio stream connected for muxer recording')
    } catch (audioError) {
      console.warn("⚠️ Audio permission denied or not available, recording without audio:", audioError)
      // ถ้าไม่มี audio stream จะบันทึกวิดีโอโดยไม่มีเสียง
    }

    audioEncoderRef.current = new AudioEncoder({
      output: (chunk, meta) => muxerRef.current.addAudioChunk(chunk, meta),
      error: (e) => console.error('AudioEncoder error:', e),
    })
    await audioEncoderRef.current.configure({
      codec: 'mp4a.40.2',
      sampleRate: sampleRate,
      numberOfChannels: 1,
      bitrate: 96000,
    })

    let recordingStartTime = null

    const processFrame = (currentTime) => {
      if (!isRecordingRef.current) return
      if (recordingStartTime === null) recordingStartTime = currentTime

      // ตรวจสอบว่า compositeCanvas มีข้อมูล
      if (!compositeCanvasRef.current) {
        recordingAnimationFrameRef.current = requestAnimationFrame(processFrame)
        return
      }

      // ส่ง Frame ไป Encode
      if (videoEncoderRef.current?.state === 'configured') {
        const elapsedTimeMs = currentTime - recordingStartTime
        const timestamp = Math.round(elapsedTimeMs * 1000)

        try {
          // ใช้ compositeCanvas โดยตรง (ขนาด 720x1280)
          // compositeCanvas ถูกอัปเดตโดย compositeFrame loop
          const videoFrame = new VideoFrame(compositeCanvasRef.current, { timestamp })
          if (videoFrame) {
            videoEncoderRef.current.encode(videoFrame)
          }
          videoFrame.close()
        } catch (err) {
          console.error('Error creating/encoding VideoFrame:', err)
        }
      }

      recordingAnimationFrameRef.current = requestAnimationFrame(processFrame)
    }
    requestAnimationFrame(processFrame)
    return true
  }, [])

  /**
   * ฟังก์ชันสำหรับใช้ MediaRecorder (browser อื่นๆ)
   */
  const startRecordingWithMediaRecorder = useCallback(async () => {
    if (!compositeCanvasRef.current) return false

    const videoStream = compositeCanvasRef.current.captureStream(30)

    let audioStream = null
    let audioTrack = null
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      audioTrack = audioStream.getAudioTracks()[0]
      audioTrackRef.current = audioTrack
    } catch (audioError) {
      console.warn("Audio permission denied or not available, recording without audio:", audioError)
    }

    const streamTracks = [...videoStream.getVideoTracks()]
    if (audioTrack) {
      streamTracks.push(audioTrack)
    }
    const combinedStream = new MediaStream(streamTracks)

    const mimeTypes = getVideoMimeTypes()
    const { isIOS, isSafari, isChrome } = detectBrowserAndPlatform()

    let selectedMimeType = null
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType
        break
      }
    }

    if (!selectedMimeType) {
      if (isIOS || isSafari) {
        selectedMimeType = 'video/mp4'
      } else if (isChrome) {
        selectedMimeType = 'video/mp4'
      } else {
        selectedMimeType = 'video/mp4'
      }
    }

    const options = selectedMimeType ? { mimeType: selectedMimeType } : {}

    mediaRecorderRef.current = new MediaRecorder(combinedStream, options)
    recordedChunksRef.current = []

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data)
        console.log(`Received chunk: ${(event.data.size / 1024).toFixed(2)}KB, Total chunks: ${recordedChunksRef.current.length}`)
      }
    }

    mediaRecorderRef.current.onerror = (event) => {
      console.error("MediaRecorder error:", event.error)
      setCameraError("เกิดข้อผิดพลาดในการอัดวิดีโอ กรุณาลองใหม่อีกครั้ง")
      if (audioTrackRef.current) {
        audioTrackRef.current.stop()
        audioTrackRef.current = null
      }
      setIsRecording(false)
    }

    // เก็บ reference ไปยัง canvas ของ session นี้ไว้ใน closure เพื่อป้องกัน race condition
    const sessionCanvas = compositeCanvasRef.current

    mediaRecorderRef.current.onstop = async () => {
      setIsRecording(false)
      isRecordingRef.current = false
      if (recordingAnimationFrameRef.current) {
        cancelAnimationFrame(recordingAnimationFrameRef.current)
        recordingAnimationFrameRef.current = null
      }

      // เริ่มประมวลผลวิดีโอ
      setIsProcessing(true)

      try {
        const actualMimeType = mediaRecorderRef.current?.mimeType
        let finalMimeType = actualMimeType
        if (!finalMimeType || finalMimeType === 'video/webm') {
          const { isIOS, isSafari, isChrome } = detectBrowserAndPlatform()
          if (isIOS || isSafari) {
            finalMimeType = 'video/mp4'
          } else if (isChrome) {
            finalMimeType = 'video/mp4'
          } else {
            finalMimeType = 'video/mp4'
          }
        }

        // ตรวจสอบว่า chunks มีข้อมูล
        if (recordedChunksRef.current.length === 0) {
          throw new Error("No video chunks recorded")
        }

        const totalSize = recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)
        console.log(`Total chunks: ${recordedChunksRef.current.length}, Total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`)

        const videoBlob = createCorrectBlob(recordedChunksRef.current, finalMimeType)

        if (videoBlob.size === 0) {
          throw new Error("Recorded video is empty")
        }

        console.log(`Video blob size: ${(videoBlob.size / 1024 / 1024).toFixed(2)}MB`)
        console.log(`Video blob type: ${videoBlob.type}`)

        // สร้าง video URL และแสดง preview โดยไม่ต้อง test playability
        // เพราะอาจทำให้ timeout และวิดีโอที่บันทึกได้ควรจะเล่นได้อยู่แล้ว
        const videoUrl = URL.createObjectURL(videoBlob)
        setPreview({ type: 'video', url: videoUrl, mimeType: finalMimeType })

        console.log(`✅ Video recorded successfully: ${(videoBlob.size / 1024 / 1024).toFixed(2)}MB`)
      } catch (processingError) {
        console.error("Error processing video:", processingError)
        setCameraError("เกิดข้อผิดพลาดในการประมวลผลวิดีโอ กรุณาลองใหม่อีกครั้ง")
      } finally {
        setIsProcessing(false) // เสร็จสิ้นการประมวลผล
        recordedChunksRef.current = []
        mediaRecorderRef.current = null
        if (audioTrackRef.current) {
          audioTrackRef.current.stop()
          audioTrackRef.current = null
        }
        // ⚠️ สำคัญ: ตรวจสอบว่า canvas ที่จะลบเป็น canvas ของ session นี้เท่านั้น
        // เพื่อป้องกัน race condition เมื่อมีการเรียก startRecording() ใหม่
        if (compositeCanvasRef.current === sessionCanvas) {
          compositeCanvasRef.current = null
        }
      }
    }

    mediaRecorderRef.current.start()
    return true
  }, [])

  /**
   * เริ่มบันทึกวิดีโอแบบ AR (รวม video + 3D model + decorative elements)
   * จำกัดเวลา 30 วินาที
   * รองรับทั้ง mp4-muxer (Android/Chrome) และ MediaRecorder (browser อื่นๆ)
   */
  const startRecording = async () => {
    if (!streamRef.current || !horseContainerRef.current) return false

    try {
      // สร้าง canvas สำหรับ composite - ตั้งเป็นแนวตั้ง 9:16
      const canvas = document.createElement('canvas')
      // ใช้ขนาด 720x1280 (9:16 portrait) เพื่อไม่ให้เกิน AVC level 3.1 limit
      const OUTPUT_WIDTH = 720
      const OUTPUT_HEIGHT = 1280
      canvas.width = OUTPUT_WIDTH
      canvas.height = OUTPUT_HEIGHT
      compositeCanvasRef.current = canvas

      // Capture overlay โดยใช้ Three.js canvas โดยตรง + decorative elements แยก
      // เพื่อไม่ให้ปุ่มต่างๆ ไปอยู่ในเฟรม
      // ⚠️ ต้อง await ให้เสร็จก่อนเริ่ม compositeFrame() เพื่อป้องกัน race condition
      let overlayCanvasCache = null
      try {
        // สร้าง canvas สำหรับ overlay (เฉพาะ decorative elements, ไม่รวม video และไม่รวม 3D model)
        const overlayCanvas = document.createElement('canvas')
        const OUTPUT_WIDTH = 720
        const OUTPUT_HEIGHT = 1280
        overlayCanvas.width = OUTPUT_WIDTH
        overlayCanvas.height = OUTPUT_HEIGHT
        const overlayCtx = overlayCanvas.getContext('2d')

        // วาด decorative elements แบบ deterministic ใน output 720x1280 (ไม่อิง DOM)
        const [wishImg, propRImg, propLImg] = await Promise.all([
          loadOverlayImage(selectedWishSrc),
          loadOverlayImage(wishPropRImg),
          loadOverlayImage(wishPropLImg),
        ])
        drawHorseOverlayFixed(overlayCtx, OUTPUT_WIDTH, OUTPUT_HEIGHT, wishImg, propRImg, propLImg)

        // 3. ไม่วาด Three.js canvas ที่นี่ เพราะต้องวาดใหม่ทุก frame เพื่อให้ animation ทำงาน
        // overlayCanvasCache จะเก็บเฉพาะ decorative elements เท่านั้น

        overlayCanvasCache = overlayCanvas
        console.log('✅ Decorative elements captured successfully (without buttons and 3D model) for video recording')
      } catch (err) {
        console.error('❌ Error capturing overlay:', err)
      }

      // เก็บ overlayCanvasCache ไว้ใน closure ของ compositeFrame
      // เพื่อให้ compositeFrame สามารถเข้าถึงได้

      // สร้าง compositeFrame function ที่สามารถเข้าถึง overlayCanvasCache ได้
      const compositeFrame = () => {
        if (!compositeCanvasRef.current || !videoRef.current) return

        const ctx = compositeCanvasRef.current.getContext('2d')
        const videoEl = videoRef.current
        const container = horseContainerRef.current

        const OUTPUT_WIDTH = 720
        const OUTPUT_HEIGHT = 1280

        ctx.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT)

        // 1. วาด video stream ก่อน (เต็ม canvas 720x1280)
        const videoWidth = videoEl.videoWidth || OUTPUT_WIDTH
        const videoHeight = videoEl.videoHeight || OUTPUT_HEIGHT
        const videoAspect = videoWidth / videoHeight

        // คำนวณขนาด video ให้เต็ม canvas โดยยึดความสูงเป็นหลัก (9:16)
        let bgWidth = OUTPUT_WIDTH
        let bgHeight = bgWidth / videoAspect
        if (bgHeight < OUTPUT_HEIGHT) {
          bgHeight = OUTPUT_HEIGHT
          bgWidth = bgHeight * videoAspect
        }
        const bgX = (OUTPUT_WIDTH - bgWidth) / 2
        const bgY = (OUTPUT_HEIGHT - bgHeight) / 2

        // Mirror แนวนอน (สำหรับกล้องหน้า)
        ctx.save()
        ctx.translate(OUTPUT_WIDTH, 0)
        ctx.scale(-1, 1) // mirror แนวนอน
        ctx.drawImage(videoEl, bgX, bgY, bgWidth, bgHeight)
        ctx.restore()

        // 2. วาด decorative elements จาก overlayCanvasCache (ไม่รวม 3D model)
        // overlayCanvasCache ถูก capture แล้วก่อนเริ่ม compositeFrame() loop
        if (overlayCanvasCache) {
          // overlayCanvasCache มีเฉพาะ decorative elements (wish images, props)
          // วาดโดยตรง (ไม่ต้อง scale เพราะ overlayCanvasCache มีขนาด 720x1280 อยู่แล้ว)
          ctx.drawImage(overlayCanvasCache, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT)
        }

        // 3. วาด Three.js canvas (3D model) ใหม่ทุก frame เพื่อให้ animation ทำงาน
        // ใช้วิธีเดียวกับ noodleverse: ใช้ canvas size โดยตรงและวาดให้เต็มความสูง
        const threeCanvasEl = threeCanvasRef.current
        if (threeCanvasEl && threeCanvasEl.width > 0 && threeCanvasEl.height > 0) {
          const arAspectRatio = threeCanvasEl.width / threeCanvasEl.height
          const drawHeight = OUTPUT_HEIGHT
          const drawWidth = drawHeight * arAspectRatio
          const drawX = (OUTPUT_WIDTH - drawWidth) / 2
          ctx.drawImage(threeCanvasEl, drawX, 0, drawWidth, drawHeight)
        } else {
          // Fallback: ลอง query จาก DOM
          const modelFrame = container?.querySelector('.model-frame')
          if (modelFrame) {
            const fallbackCanvas = modelFrame.querySelector('canvas')
            if (fallbackCanvas && fallbackCanvas.width > 0 && fallbackCanvas.height > 0) {
              const arAspectRatio = fallbackCanvas.width / fallbackCanvas.height
              const drawHeight = OUTPUT_HEIGHT
              const drawWidth = drawHeight * arAspectRatio
              const drawX = (OUTPUT_WIDTH - drawWidth) / 2
              ctx.drawImage(fallbackCanvas, drawX, 0, drawWidth, drawHeight)
            }
          }
        }

        // ใช้ isRecordingRef แทน isRecording เพื่อให้แน่ใจว่าได้ค่าล่าสุด
        if (isRecordingRef.current) {
          recordingAnimationFrameRef.current = requestAnimationFrame(compositeFrame)
        }
      }

      const androidChrome = isAndroid() && isChrome()

      // ⚠️ สำคัญ: ตั้งค่า isRecording และเริ่ม compositeFrame loop หลังจาก overlayCanvasCache ถูก capture เสร็จแล้ว
      // เพื่อป้องกัน race condition ที่ overlayCanvasCache ยังเป็น null
      setIsRecording(true)
      isRecordingRef.current = true

      // เริ่ม composite frame loop (overlayCanvasCache ถูก capture แล้ว)
      compositeFrame()

      if (androidChrome) {
        console.log("Using mp4-muxer for Android/Chrome")
        const success = await startRecordingWithMuxer()
        if (success) {
          recordingTimeoutRef.current = setTimeout(() => {
            stopRecording()
          }, 30000)
        } else {
          // ถ้า startRecordingWithMuxer ล้มเหลว ให้หยุด recording
          setIsRecording(false)
          isRecordingRef.current = false
          if (recordingAnimationFrameRef.current) {
            cancelAnimationFrame(recordingAnimationFrameRef.current)
            recordingAnimationFrameRef.current = null
          }
        }
        return success
      } else {
        console.log("Using MediaRecorder for other browsers")
        const success = await startRecordingWithMediaRecorder()
        if (success) {
          recordingTimeoutRef.current = setTimeout(() => {
            stopRecording()
          }, 30000)
        } else {
          // ถ้า startRecordingWithMediaRecorder ล้มเหลว ให้หยุด recording
          setIsRecording(false)
          isRecordingRef.current = false
          if (recordingAnimationFrameRef.current) {
            cancelAnimationFrame(recordingAnimationFrameRef.current)
            recordingAnimationFrameRef.current = null
          }
        }
        return success
      }
    } catch (err) {
      console.error("Failed to start recording:", err)
      setCameraError('ไม่สามารถเริ่มอัดวิดีโอได้')
      return false
    }
  }

  /**
   * หยุดบันทึกวิดีโอ
   */
  const stopRecording = async () => {
    const androidChrome = isAndroid() && isChrome()

    // หยุด timeout และ animation frame
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }

    if (recordingAnimationFrameRef.current) {
      cancelAnimationFrame(recordingAnimationFrameRef.current)
      recordingAnimationFrameRef.current = null
    }

    if (androidChrome) {
      // หยุดการอัดด้วย Muxer
      if (isRecordingRef.current) {
        isRecordingRef.current = false
        clearTimeout(recordingTimeoutRef.current)
        cancelAnimationFrame(recordingAnimationFrameRef.current)

        setIsProcessing(true)

        // ใช้ requestAnimationFrame wrapper เพื่อให้แน่ใจว่า frame สุดท้ายถูก encode แล้ว
        requestAnimationFrame(async () => {
          console.log("Processing video file with muxer...")

          try {
            if (videoEncoderRef.current?.state === 'configured') {
              await videoEncoderRef.current.flush().catch(console.error)
            }
            if (audioEncoderRef.current?.state === 'configured') {
              await audioEncoderRef.current.flush().catch(console.error)
            }

            if (muxerRef.current) {
              muxerRef.current.finalize()
              const { buffer } = muxerRef.current.target
              const videoBlob = new Blob([buffer], { type: 'video/mp4' })
              const videoUrl = URL.createObjectURL(videoBlob)
              setPreview({ type: 'video', url: videoUrl, mimeType: 'video/mp4' })
              console.log(`✅ Video recorded successfully with muxer: ${(videoBlob.size / 1024 / 1024).toFixed(2)}MB`)
            }
          } catch (error) {
            console.error("Error processing video:", error)
            setCameraError("เกิดข้อผิดพลาดในการประมวลผลวิดีโอ กรุณาลองใหม่อีกครั้ง")
          } finally {
            // Cleanup audio stream และ nodes
            if (audioProcessorNodeRef.current) {
              audioProcessorNodeRef.current.disconnect()
              audioProcessorNodeRef.current = null
            }
            if (audioSourceNodeRef.current) {
              audioSourceNodeRef.current.disconnect()
              audioSourceNodeRef.current = null
            }
            if (audioStreamRef.current) {
              audioStreamRef.current.getTracks().forEach(track => track.stop())
              audioStreamRef.current = null
            }
            if (audioTrackRef.current) {
              audioTrackRef.current.stop()
              audioTrackRef.current = null
            }

            // Cleanup refs
            videoEncoderRef.current = null
            audioEncoderRef.current = null
            muxerRef.current = null
            setIsProcessing(false)
            setIsRecording(false)
          }
        })
      }
    } else {
      // สำหรับ MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        // หยุดการบันทึก - onstop event จะจัดการ preview และ setIsRecording(false)
        mediaRecorderRef.current.stop()
      } else {
        // ถ้า MediaRecorder ไม่มีหรือหยุดแล้ว ให้ set state เป็น false
        setIsRecording(false)
        isRecordingRef.current = false
      }
    }
  }

  /**
   * จัดการการถ่ายภาพ/วิดีโอ
   * เรียกใช้ capturePhoto หรือ startRecording/stopRecording ตามโหมด
   */
  const handleCapture = () => {
    // ป้องกันการกดปุ่มถ่ายซ้ำขณะกำลังประมวลผล
    if (isProcessing) {
      return
    }

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

  /**
   * ปิด preview modal
   */
  const handleSave = async () => {
    if (!preview.url) return

    try {
      const link = document.createElement('a')
      link.href = preview.url

      if (preview.type === 'photo') {
        link.download = `lucky-seemsee-${Date.now()}.png`
      } else {
        link.download = `lucky-seemsee-${Date.now()}.mp4`
      }

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error saving file:', error)
      setCameraError('ไม่สามารถบันทึกไฟล์ได้')
    }
  }

  /**
   * แชร์ภาพ/วิดีโอ
   */
  const handleShare = async () => {
    if (!preview.url) return

    try {
      if (navigator.share && navigator.canShare) {
        const response = await fetch(preview.url)
        const blob = await response.blob()
        const file = new File(
          [blob],
          preview.type === 'photo'
            ? `lucky-seemsee-${Date.now()}.png`
            : `lucky-seemsee-${Date.now()}.mp4`,
          { type: preview.type === 'photo' ? 'image/png' : 'video/mp4' }
        )

        const shareData = { files: [file] }

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData)
        } else {
          handleSave()
        }
      } else {
        handleSave()
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing file:', error)
        handleSave()
      }
    }
  }

  /**
   * เล่นอีกครั้ง (retry)
   * ปิด preview และกลับไปหน้าแรก
   */
  const handleRetry = () => {
    setPreview({ type: null, url: null })
    goHome()
  }

  // ============================================
  // RENDER
  // ============================================

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
            if (!isRecording && !isProcessing) setCaptureMode(mode)
          }}
          isRecording={isRecording}
          isProcessing={isProcessing}
          handleCapture={handleCapture}
          preview={preview}
          cameraError={cameraError}
          modelSrc={horseModel}
          selectedWishSrc={selectedWishSrc}
          containerRef={horseContainerRef}
          threeCanvasRef={threeCanvasRef}
          onSave={handleSave}
          onShare={handleShare}
          onRetry={handleRetry}
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
    return (
      <CameraStage videoRef={videoRef}>
        <WallpaperScreen
          onBack={goHome}
          onCreate={handleCreateAiWallpaper}
          onPlayAgain={handleAiWallpaperPlayAgain}
          isGenerating={aiWallpaperStatus === 'generating'}
          aiResult={aiWallpaperStatus === 'ready' ? aiWallpaperResult : null}
          aiError={aiWallpaperStatus === 'error' ? aiWallpaperError : ''}
          topicOptions={WALLPAPER_TOPIC_OPTIONS}
          zodiacOptions={WALLPAPER_ZODIAC_OPTIONS}
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
