const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const OPENAI_IMAGE_MODEL = import.meta.env.VITE_IMAGE_MODEL || 'dall-e-3'
const OPENAI_IMAGE_SIZE = import.meta.env.VITE_IMAGE_SIZE || '1024x1792' // 9:16
const OPENAI_IMAGE_QUALITY = import.meta.env.VITE_IMAGE_QUALITY || 'standard'
const OPENAI_IMAGE_STYLE = import.meta.env.VITE_IMAGE_STYLE || 'natural'

export async function generateImageFromPrompt(prompt) {
  if (!OPENAI_API_KEY) {
    return {
      success: false,
      error: 'OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in .env',
    }
  }
  if (!prompt) {
    return { success: false, error: 'Missing prompt' }
  }

  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_IMAGE_MODEL,
        prompt,
        size: OPENAI_IMAGE_SIZE,
        quality: OPENAI_IMAGE_QUALITY,
        style: OPENAI_IMAGE_STYLE,
        response_format: 'b64_json',
        n: 1,
      }),
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(json?.error?.message || `OpenAI request failed: ${res.status}`)
    }

    const item = json?.data?.[0]
    const b64 = item?.b64_json
    if (!b64) {
      throw new Error('OpenAI response missing b64_json')
    }

    return {
      success: true,
      base64: `data:image/png;base64,${b64}`,
      revisedPrompt: item?.revised_prompt || null,
    }
  } catch (e) {
    return { success: false, error: e?.message || 'Failed to generate image' }
  }
}


