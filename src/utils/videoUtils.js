import { detectBrowserAndPlatform } from './deviceUtils'

/**
 * แปลง Blob เป็นไฟล์ที่มี MIME type ที่ถูกต้อง
 * @param {Blob} blob - Blob ที่ต้องการแปลง
 * @param {string} mimeType - MIME type ที่ต้องการ
 * @returns {File} ไฟล์ที่มี MIME type ที่ถูกต้อง
 */
export const convertBlobToFile = (blob, mimeType) => {
  const { isIOS, isSafari, isChrome, isAndroid } = detectBrowserAndPlatform()

  // กำหนดนามสกุลไฟล์ตาม MIME type
  let extension = 'mp4'
  if (mimeType?.includes('webm')) {
    extension = 'webm'
  } else if (mimeType?.includes('ogg')) {
    extension = 'ogv'
  }

  // สำหรับ iOS/Safari ใช้ mp4 เสมอ
  if (isIOS || isSafari) {
    extension = 'mp4'
  }

  // สำหรับ Android/Chrome ใช้ WebM
  if (isAndroid || isChrome) {
    extension = 'webm'
  }

  const filename = `lucky-seemsee.${extension}`

  // สร้างไฟล์ใหม่ด้วย MIME type ที่ถูกต้อง
  return new File([blob], filename, { type: mimeType })
}

/**
 * ตรวจสอบและแก้ไข MIME type ให้ถูกต้อง
 * @param {string} originalMimeType - MIME type เดิม
 * @returns {string} MIME type ที่ถูกต้อง
 */
export const fixMimeType = (originalMimeType) => {
  const { isIOS, isSafari, isChrome } = detectBrowserAndPlatform()

  // หากไม่มี MIME type หรือเป็น webm ให้ใช้ fallback
  if (!originalMimeType || originalMimeType === 'video/webm') {
    if (isIOS || isSafari) {
      return 'video/mp4'
    } else if (isChrome) {
      return 'video/mp4'
    } else {
      return 'video/mp4'
    }
  }

  return originalMimeType
}

/**
 * สร้าง Blob ที่มี MIME type ที่ถูกต้อง
 * @param {Array} chunks - Array ของ Blob chunks
 * @param {string} mimeType - MIME type ที่ต้องการ
 * @returns {Blob} Blob ที่มี MIME type ที่ถูกต้อง
 */
export const createCorrectBlob = (chunks, mimeType) => {
  const correctedMimeType = fixMimeType(mimeType)
  console.log(`Creating blob with MIME type: ${correctedMimeType}`)

  return new Blob(chunks, { type: correctedMimeType })
}

/**
 * ตรวจสอบว่าไฟล์วิดีโอสามารถเปิดได้หรือไม่
 * @param {Blob} blob - Blob ที่ต้องการตรวจสอบ
 * @returns {Promise<boolean>} ผลการตรวจสอบ
 */
export const testVideoPlayability = async (blob) => {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(blob)
      const video = document.createElement('video')

      video.onloadedmetadata = () => {
        console.log('✅ Video metadata loaded successfully')
        URL.revokeObjectURL(url)
        resolve(true)
      }

      video.onerror = (error) => {
        console.error('❌ Video loading error:', error)
        URL.revokeObjectURL(url)
        resolve(false)
      }

      // ตั้งเวลา timeout
      setTimeout(() => {
        console.warn('⚠️ Video loading timeout')
        URL.revokeObjectURL(url)
        resolve(false)
      }, 5000)

      video.src = url
      video.load()
    } catch (error) {
      console.error('❌ Error testing video playability:', error)
      resolve(false)
    }
  })
}

/**
 * แปลงวิดีโอเป็นรูปแบบที่เหมาะสมสำหรับการดาวน์โหลด
 * @param {Blob} originalBlob - Blob เดิม
 * @param {string} mimeType - MIME type ที่ต้องการ
 * @returns {Promise<Blob>} Blob ที่แปลงแล้ว
 */
export const convertVideoForDownload = async (originalBlob, mimeType) => {
  const { isIOS, isSafari, isChrome, isAndroid } = detectBrowserAndPlatform()

  // ถ้า mimeType เป็น mp4 แล้ว (เช่น จาก muxer) ไม่ต้องแปลง
  if (mimeType && mimeType.includes('mp4')) {
    console.log(`Video is already MP4, keeping original: ${mimeType}`)
    return new Blob([originalBlob], { type: 'video/mp4' })
  }

  // สำหรับ iOS/Safari ใช้ mp4 เสมอ
  if (isIOS || isSafari) {
    const correctedMimeType = 'video/mp4'
    console.log(`Converting video for iOS/Safari: ${correctedMimeType}`)
    return new Blob([originalBlob], { type: correctedMimeType })
  }

  // สำหรับ Android/Chrome ที่ใช้ MediaRecorder (ไม่ใช่ muxer) ใช้ WebM
  // แต่ถ้าเป็น mp4 จาก muxer แล้วก็ไม่ต้องแปลง (ตรวจสอบแล้วข้างบน)
  if (isAndroid || isChrome) {
    // ถ้าเป็น webm อยู่แล้วก็ไม่ต้องแปลง
    if (mimeType && mimeType.includes('webm')) {
      console.log(`Video is already WebM, keeping original: ${mimeType}`)
      return new Blob([originalBlob], { type: 'video/webm' })
    }
    // ถ้าไม่ใช่ webm และไม่ใช่ mp4 (เช่นจาก MediaRecorder ที่ไม่ได้ระบุ type) ให้ใช้ mp4
    const correctedMimeType = 'video/mp4'
    console.log(`Converting video for Android/Chrome: ${correctedMimeType}`)
    return new Blob([originalBlob], { type: correctedMimeType })
  }

  // สำหรับ browser อื่นๆ ใช้ MIME type ที่ได้รับ
  const correctedMimeType = fixMimeType(mimeType)
  console.log(`Converting video for other browsers: ${correctedMimeType}`)
  return new Blob([originalBlob], { type: correctedMimeType })
}

/**
 * ตรวจสอบ MIME type ที่ MediaRecorder รองรับ
 * @returns {string} MIME type ที่เหมาะสม
 */
export const getSupportedMimeType = () => {
  const { isIOS, isSafari } = detectBrowserAndPlatform()

  // สำหรับ iOS/Safari ใช้ mp4
  if (isIOS || isSafari) {
    if (MediaRecorder.isTypeSupported('video/mp4')) {
      return 'video/mp4'
    }
  }

  // ลอง WebM ก่อน
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
    return 'video/webm;codecs=vp9'
  }
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
    return 'video/webm;codecs=vp8'
  }
  if (MediaRecorder.isTypeSupported('video/webm')) {
    return 'video/webm'
  }

  // Fallback
  return 'video/mp4'
}

