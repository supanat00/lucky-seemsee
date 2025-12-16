import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

function ShakeScreen({ bgColor, message, isStarted, onStartClick, onBack, onSequenceDone, shakeTrigger }) {
    const [frameIndex, setFrameIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const timerRef = useRef(null)

    // โหลดภาพทั้งหมดจากโฟลเดอร์ stick เป็น image-sequence
    const frames = useMemo(() => {
        const pngs = import.meta.glob('../assets/stick/stick*.png', { eager: true, import: 'default' })
        const webps = import.meta.glob('../assets/stick/stick*.webp', { eager: true, import: 'default' })
        const merged = { ...pngs, ...webps }
        return Object.keys(merged)
            .sort()
            .map((key) => merged[key])
    }, [])

    const startSequence = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }

        if (frames.length === 0) return undefined

        setIsPlaying(true)
        setFrameIndex(0)

        const totalFrames = frames.length
        const fps = 18
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

    // autoplay loop so we can verify sequence without needing to shake
    useEffect(() => {
        if (frames.length === 0) return
        let cleanupFn
        const rafId = requestAnimationFrame(() => {
            cleanupFn = startSequence()
        })

        return () => {
            cancelAnimationFrame(rafId)
            cleanupFn?.()
        }
    }, [frames.length, startSequence])

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
            <div className="shake-container">
                <h1>เสี่ยงเซียมซี</h1>
                <p className="shake-message">{message}</p>

                <div className="stick-preview">
                    {currentFrame ? (
                        <img
                            src={currentFrame}
                            alt="เซียมซี"
                            className={`stick-frame ${isPlaying ? 'playing' : ''}`}
                            style={{ backgroundColor: bgColor }}
                        />
                    ) : (
                        <div className="stick-placeholder" style={{ backgroundColor: bgColor }} />
                    )}
                </div>

                <button
                    className="start-button"
                    type="button"
                    onClick={onStartClick}
                    disabled={isStarted}
                >
                    {isStarted ? 'กำลังรอการเขย่า...' : 'เริ่มต้น'}
                </button>
                <p className="note">
                    เขย่าอุปกรณ์หรือเคลื่อนที่เร็ว ๆ เพื่อเล่นแอนิเมชันไม้เซียมซี
                </p>
            </div>
        </div>
    )
}

export default ShakeScreen

