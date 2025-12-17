import { useEffect, useRef, useState } from 'react'
import { LoopOnce, LoopRepeat } from 'three'
import { useAnimations, useGLTF } from '@react-three/drei'

function GLBModel({
  modelPath,
  animationName = 'Take 001',
  openAnimation = 'open',
  loopAnimation = 'loop',
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) {
  const group = useRef()
  const { scene, animations } = useGLTF(modelPath)
  const { actions, mixer } = useAnimations(animations, group)
  const [isVisible, setIsVisible] = useState(false)
  const hasStartedRef = useRef(false)

  // preload in case parent reuses modelPath
  useEffect(() => {
    if (modelPath) {
      // not a hook; safe to call
      useGLTF.preload(modelPath)
    }
  }, [modelPath])

  useEffect(() => {
    const open = openAnimation ? actions?.[openAnimation] : null
    const loop = loopAnimation ? actions?.[loopAnimation] : null
    const fallback = !open && !loop ? actions?.[animationName] : null

    const stopAll = () => {
      if (!actions) return
      Object.values(actions).forEach((a) => {
        if (a) {
          a.stop()
        }
      })
    }

    // Reset all actions to prevent unwanted autoplay / blinking
    stopAll()

    if (open && loop && !hasStartedRef.current) {
      hasStartedRef.current = true

      // ตั้งค่าให้ animation เริ่มที่ frame แรก
      open.reset()
      open.setLoop(LoopOnce, 1)

      // ใช้ requestAnimationFrame เพื่อแสดงโมเดลและเล่น animation พร้อมกัน
      requestAnimationFrame(() => {
        setIsVisible(true)
        open.fadeIn(0.05).play()
      })

      const handler = (e) => {
        if (e.action !== open) return
        loop.reset()
        loop.setLoop(LoopRepeat, Infinity)
        loop.fadeIn(0.05).play()
      }

      mixer?.addEventListener('finished', handler)

      return () => {
        mixer?.removeEventListener('finished', handler)
        stopAll()
        hasStartedRef.current = false
      }
    }

    if (fallback) {
      requestAnimationFrame(() => {
        setIsVisible(true)
        fallback.reset()
        fallback.setLoop(LoopRepeat, Infinity)
        fallback.fadeIn(0.05).play()
      })
      return () => {
        stopAll()
      }
    }

    // ถ้าไม่มี animation ให้แสดงทันที
    if (!open && !loop && !fallback) {
      requestAnimationFrame(() => {
        setIsVisible(true)
      })
    }

    return undefined
  }, [actions, animationName, loopAnimation, mixer, openAnimation])

  return (
    <primitive
      ref={group}
      object={scene}
      dispose={null}
      scale={scale}
      position={position}
      visible={isVisible}
      rotation={rotation}
    />
  )
}

export default GLBModel


