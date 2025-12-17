/**
 * ตรวจสอบ browser และ platform
 * @returns {Object} ข้อมูล browser และ platform
 */
export const detectBrowserAndPlatform = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera

  // ตรวจสอบ iOS
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream

  // ตรวจสอบ Android
  const isAndroid = /android/i.test(userAgent)

  // ตรวจสอบ Safari
  const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent)

  // ตรวจสอบ Chrome
  const isChrome = /chrome/i.test(userAgent) && !/edge/i.test(userAgent)

  // ตรวจสอบ Firefox
  const isFirefox = /firefox/i.test(userAgent)

  // ตรวจสอบ Edge
  const isEdge = /edge/i.test(userAgent)

  return {
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isFirefox,
    isEdge,
  }
}

/**
 * ตรวจสอบว่าเป็น Android หรือไม่
 * @returns {boolean}
 */
export const isAndroid = () => {
  return /android/i.test(navigator.userAgent)
}

/**
 * ตรวจสอบว่าเป็น Chrome หรือไม่
 * @returns {boolean}
 */
export const isChrome = () => {
  return /chrome/i.test(navigator.userAgent) && !/edge/i.test(navigator.userAgent)
}

/**
 * ตรวจสอบว่าเป็น iOS หรือไม่
 * @returns {boolean}
 */
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

/**
 * ตรวจสอบว่าเป็น Safari หรือไม่
 * @returns {boolean}
 */
export const isSafari = () => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

/**
 * รับรายการ MIME types ที่ควรลองใช้ (เรียงตามลำดับความเหมาะสม)
 * @returns {string[]}
 */
export const getVideoMimeTypes = () => {
  const { isIOS, isSafari, isChrome } = detectBrowserAndPlatform()
  
  if (isIOS || isSafari) {
    return [
      'video/mp4',
      'video/x-m4v',
      'video/quicktime',
    ]
  }
  
  if (isChrome) {
    return [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ]
  }
  
  return [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
    'video/ogg',
  ]
}

