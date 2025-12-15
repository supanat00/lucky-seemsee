import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

function getRandomColor() {
  const r = Math.floor(Math.random() * 256)
  const g = Math.floor(Math.random() * 256)
  const b = Math.floor(Math.random() * 256)
  return `rgb(${r}, ${g}, ${b})`
}

function App() {
  const [isStarted, setIsStarted] = useState(false)
  const [message, setMessage] = useState('กดปุ่มด้านล่างเพื่อเริ่มต้น')
  const [bgColor, setBgColor] = useState('#242424')

  const lastShakeTimeRef = useRef(0)

  const handleShake = useCallback((event) => {
    const acc = event.accelerationIncludingGravity || event.acceleration
    if (!acc) return

    const x = acc.x || 0
    const y = acc.y || 0
    const z = acc.z || 0

    // คำนวณความแรงของการเขย่าแบบง่าย ๆ
    const magnitude = Math.sqrt(x * x + y * y + z * z)

    const now = Date.now()
    const threshold = 15 // ปรับได้ตามต้องการ
    const minInterval = 800 // ms ป้องกันเปลี่ยนสีรัวเกินไป

    if (magnitude > threshold && now - lastShakeTimeRef.current > minInterval) {
      lastShakeTimeRef.current = now
      setBgColor(getRandomColor())
      setMessage('เขย่าอีกครั้งเพื่อเปลี่ยนสีพื้นหลังใหม่')
    }
  }, [])

  useEffect(() => {
    if (!isStarted) return

    // iOS / บางเบราว์เซอร์ต้องขอ permission ก่อนใช้เซ็นเซอร์
    async function enableMotion() {
      try {
        // eslint-disable-next-line no-undef
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
  }, [isStarted, handleShake])

  const onStartClick = async () => {
    setIsStarted(true)
  }

  return (
    <div className="app-root" style={{ backgroundColor: bgColor }}>
      <div className="shake-container">
        <h1>Device Motion Demo</h1>
        <p className="shake-message">{message}</p>
        <div className="color-preview-wrapper">
          <div className="color-preview" style={{ backgroundColor: bgColor }} />
          <span className="color-label">สีพื้นหลังปัจจุบัน</span>
        </div>
        <button
          className="start-button"
          type="button"
          onClick={onStartClick}
          disabled={isStarted}
        >
          {isStarted ? 'กำลังรอการเขย่า...' : 'Start'}
        </button>
        <p className="note">
          หมายเหตุ: ฟีเจอร์นี้รองรับบนอุปกรณ์มือถือบางรุ่น/เบราว์เซอร์เท่านั้น และต้องใช้งานผ่าน
          HTTPS ตามสเปกของ <code>DeviceMotionEvent</code> ดูรายละเอียดเพิ่มเติมที่ MDN
          (DeviceMotionEvent).
        </p>
      </div>
    </div>
  )
}

export default App
