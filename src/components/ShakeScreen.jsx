import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import step2 from '../assets/images/step2.png'

function ShakeScreen({ onBack, onSequenceDone, shakeTrigger }) {
    const [frameIndex, setFrameIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const timerRef = useRef(null)
    const preloadRef = useRef([])

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

        if (frames.length === 0) return undefined

        setIsPlaying(true)
        setFrameIndex(0)

        const totalFrames = frames.length
        const fps = 10 // ช้าลงเพื่อให้การเปลี่ยนภาพนุ่มนวลขึ้น
        const interval = 1000 / fps

        timerRef.current = setInterval(() => {
            setFrameIndex((current) => {
                const next = current + 1
                if (next >= totalFrames) {
                    onSequenceDone?.()
                    return 0 // loop
                }
                return next
            })
        }, interval)

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
    }, [frames, onSequenceDone])

    useEffect(() => {
        if (!shakeTrigger || frames.length === 0) return

        let cleanupFn
        const rafId = requestAnimationFrame(() => {
            cleanupFn = startSequence()
        })

        return () => {
            cancelAnimationFrame(rafId)
            cleanupFn?.()
        }
    }, [shakeTrigger, frames.length, startSequence])

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
            </div>
        </div>
    )
}

export default ShakeScreen

