import { useCallback, useEffect, useRef, useState } from 'react'
import step2 from '../assets/images/step2.png'
import { preloadImages } from '../utils/preloadImages'
import { RADIEN_STICK_FRAMES, STICK_FRAMES } from '../utils/sequenceAssets'

function ShakeScreen({ onBack, onSequenceDone, shakeTrigger }) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [areAssetsReady, setAreAssetsReady] = useState(false)
    const [assetProgress, setAssetProgress] = useState({ loaded: 0, total: 0 })

    const stickImgRef = useRef(null)
    const radienImgRef = useRef(null)
    const rafRef = useRef(0)

    // Preload+decode all frames upfront (avoid first-play stutter)
    useEffect(() => {
        const total = STICK_FRAMES.length + RADIEN_STICK_FRAMES.length
        setAssetProgress({ loaded: 0, total })
        setAreAssetsReady(false)

        const controller = new AbortController()

        preloadImages([...STICK_FRAMES, ...RADIEN_STICK_FRAMES], {
            concurrency: 4,
            decode: true,
            signal: controller.signal,
            onProgress: ({ loaded }) => setAssetProgress({ loaded, total }),
        })
            .then(() => {
                setAreAssetsReady(true)
                // Set initial static frame (stick0004) once assets are ready
                if (stickImgRef.current && STICK_FRAMES[4]) stickImgRef.current.src = STICK_FRAMES[4]
                if (radienImgRef.current && RADIEN_STICK_FRAMES[4]) radienImgRef.current.src = RADIEN_STICK_FRAMES[4]
            })
            .catch((e) => {
                if (e?.name === 'AbortError') return
                console.warn('preload shake sequence failed (fallback to on-demand)', e)
                setAreAssetsReady(true)
                if (stickImgRef.current && STICK_FRAMES[4]) stickImgRef.current.src = STICK_FRAMES[4]
                if (radienImgRef.current && RADIEN_STICK_FRAMES[4]) radienImgRef.current.src = RADIEN_STICK_FRAMES[4]
            })

        return () => {
            controller.abort()
        }
    }, [])

    const startSequence = useCallback(() => {
        if (!areAssetsReady) return undefined
        if (STICK_FRAMES.length === 0) return undefined

        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = 0
        }

        setIsPlaying(true)

        const stickEl = stickImgRef.current
        const radienEl = radienImgRef.current
        if (!stickEl) return undefined

        const fps = 10 // ช้าลงเพื่อให้การเปลี่ยนภาพนุ่มนวลขึ้น
        const interval = 1000 / fps
        const duration = 3000 + Math.random() * 2000 // 3-5 วินาที

        let idx = 0
        let lastTime = performance.now()
        const startTime = lastTime

        stickEl.src = STICK_FRAMES[0] || STICK_FRAMES[4]
        if (radienEl) radienEl.src = RADIEN_STICK_FRAMES[0] || RADIEN_STICK_FRAMES[4]

        const tick = (now) => {
            if (now - startTime >= duration) {
                rafRef.current = 0
                setIsPlaying(false)
                onSequenceDone?.()
                return
            }

            const elapsed = now - lastTime
            if (elapsed >= interval) {
                lastTime = now - (elapsed % interval)
                idx = (idx + 1) % STICK_FRAMES.length
                stickEl.src = STICK_FRAMES[idx] || STICK_FRAMES[0]
                if (radienEl && RADIEN_STICK_FRAMES.length > 0) {
                    radienEl.src = RADIEN_STICK_FRAMES[idx % RADIEN_STICK_FRAMES.length] || RADIEN_STICK_FRAMES[0]
                }
            }

            rafRef.current = requestAnimationFrame(tick)
        }

        rafRef.current = requestAnimationFrame(tick)

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            rafRef.current = 0
            setIsPlaying(false)
        }
    }, [areAssetsReady, onSequenceDone])

    useEffect(() => {
        // ไม่ทำงานถ้า shakeTrigger เป็น 0 หรือไม่มี frames
        if (!areAssetsReady) return
        if (!shakeTrigger || shakeTrigger <= 0 || STICK_FRAMES.length === 0) return

        let cleanupFn
        const rafId = requestAnimationFrame(() => {
            cleanupFn = startSequence()
        })

        return () => {
            cancelAnimationFrame(rafId)
            cleanupFn?.()
        }
    }, [shakeTrigger, frames.length, startSequence])

    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            rafRef.current = 0
            setIsPlaying(false)
        }
    }, [])

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
                    {RADIEN_STICK_FRAMES.length > 0 ? (
                        <img
                            ref={radienImgRef}
                            src={RADIEN_STICK_FRAMES[4] || RADIEN_STICK_FRAMES[0]}
                            alt=""
                            aria-hidden="true"
                            className={`radien-frame ${isPlaying ? 'playing' : ''}`}
                        />
                    ) : null}
                    {STICK_FRAMES.length > 0 ? (
                        <img
                            ref={stickImgRef}
                            src={STICK_FRAMES[4] || STICK_FRAMES[0]}
                            alt="เซียมซี"
                            className={`stick-frame ${isPlaying ? 'playing' : ''}`}
                        />
                    ) : (
                        <div className="stick-placeholder" />
                    )}
                </div>
                <button type="button" className="manual-shake" onClick={() => startSequence()} disabled={!areAssetsReady || isPlaying}>
                    เขย่า
                </button>
            </div>

            {!areAssetsReady && assetProgress.total > 0 && (
                <div className="asset-preload-toast" role="status" aria-live="polite">
                    กำลังเตรียมไฟล์… {Math.round((assetProgress.loaded / assetProgress.total) * 100)}%
                </div>
            )}
        </div>
    )
}

export default ShakeScreen

