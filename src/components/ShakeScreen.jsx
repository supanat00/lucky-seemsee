import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import step2 from '../assets/images/step2.png'

function ShakeScreen({ onBack, onSequenceDone, shakeTrigger }) {
    const [frameIndex, setFrameIndex] = useState(4) // เริ่มจาก stick0004
    const [isPlaying, setIsPlaying] = useState(false)
    const timerRef = useRef(null)
    const timeoutRef = useRef(null)
    const preloadRef = useRef([])

    // รีเซ็ต state เมื่อ component mount ใหม่
    useEffect(() => {
        // Cleanup timers ที่อาจเหลืออยู่
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
        // รีเซ็ต state
        setIsPlaying(false)
        setFrameIndex(4)
    }, [])

    // โหลดภาพทั้งหมดจากโฟลเดอร์ stick เป็น image-sequence
    const frames = useMemo(() => {
        const pngs = import.meta.glob('../assets/stick/stick*.png', { eager: true, import: 'default' })
        const webps = import.meta.glob('../assets/stick/stick*.webp', { eager: true, import: 'default' })
        const merged = { ...pngs, ...webps }
        return Object.keys(merged)
            .sort()
            .map((key) => merged[key])
    }, [])

    // preload frames for smoother playback
    useEffect(() => {
        preloadRef.current = []
        frames.forEach((src) => {
            const img = new Image()
            img.src = src
            if (img.decode) img.decode().catch(() => { })
            preloadRef.current.push(img)
        })
    }, [frames])

    const startSequence = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }

        if (frames.length === 0) return undefined

        setIsPlaying(true)
        setFrameIndex(0)

        const totalFrames = frames.length
        const fps = 10 // ช้าลงเพื่อให้การเปลี่ยนภาพนุ่มนวลขึ้น
        const interval = 1000 / fps
        const duration = 3000 + Math.random() * 2000 // 3-5 วินาที

        timerRef.current = setInterval(() => {
            setFrameIndex((current) => {
                const next = current + 1
                if (next >= totalFrames) {
                    return 0
                }
                return next
            })
        }, interval)

        timeoutRef.current = setTimeout(() => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
            setIsPlaying(false)
            onSequenceDone?.()
        }, duration)

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }
            setIsPlaying(false)
        }
    }, [frames, onSequenceDone])

    useEffect(() => {
        // ไม่ทำงานถ้า shakeTrigger เป็น 0 หรือไม่มี frames
        if (!shakeTrigger || shakeTrigger <= 0 || frames.length === 0) return

        let cleanupFn
        const rafId = requestAnimationFrame(() => {
            cleanupFn = startSequence()
        })

        return () => {
            cancelAnimationFrame(rafId)
            cleanupFn?.()
        }
    }, [shakeTrigger, frames.length, startSequence])

    // cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }
            setIsPlaying(false)
        }
    }, [])

    const currentFrame = frames[frameIndex] ?? null

    return (
        <div className="app-root">
            <button className="back-icon" type="button" onClick={onBack} aria-label="Back">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            <div className="shake-container only-sequence">
                <div className="stick-preview">
                    <img src={step2} alt="" aria-hidden="true" className="stick-bg" />
                    {currentFrame ? (
                        <img
                            src={currentFrame}
                            alt="เซียมซี"
                            className={`stick-frame ${isPlaying ? 'playing' : ''}`}
                        />
                    ) : (
                        <div className="stick-placeholder" />
                    )}
                </div>
                <button type="button" className="manual-shake" onClick={() => startSequence()}>
                    เขย่า
                </button>
            </div>
        </div>
    )
}

export default ShakeScreen

