export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  if (!config.cloudflareAccountId || !config.cloudflareApiToken) {
    throw createError({
      statusCode: 500,
      message: 'Cloudflare AI configuration is missing.'
    })
  }

  const body = await readBody(event)
  const { name_th, description_th } = body

  if (!name_th) {
    throw createError({
      statusCode: 400,
      message: 'Thai name is required'
    })
  }

  const model = '@cf/meta/llama-3.1-8b-instruct'
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.cloudflareAccountId}/ai/run/${model}`

  // Prompt kept short to avoid truncated responses from the model
  const systemPrompt = `You are a Thai-to-English/Chinese food translator.
Translate the Thai menu item name and description into English and Simplified Chinese.
If description is empty, write a short appetizing one-line explanation for tourists.
Reply ONLY with valid JSON, no markdown, no extra text.
Format: {"name_en":"","description_en":"","name_zh":"","description_zh":""}`

  const userPrompt = `Name: ${name_th}
Desc: ${description_th || ''}`

  // Retry up to 2 times if AI returns invalid JSON
  const MAX_RETRIES = 2
  let lastError = ''

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.cloudflareApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 300
        })
      })

      if (!response.ok) {
        const err = await response.text()
        console.error('Cloudflare AI Error:', err)
        throw new Error(`Failed to contact Cloudflare AI: ${response.statusText}`)
      }

      const jsonResponse = await response.json()
      
      if (!jsonResponse.success) {
        console.error('AI API returned success: false', jsonResponse)
        throw new Error(jsonResponse.errors?.[0]?.message || 'Cloudflare API error')
      }

      // Cloudflare sometimes auto-parses the JSON response into an object
      if (typeof jsonResponse.result?.response === 'object' && jsonResponse.result.response !== null) {
        const r = jsonResponse.result.response
        // Validate required fields exist
        if (r.name_en !== undefined && r.name_zh !== undefined) {
          return {
            name_en: r.name_en || '',
            description_en: r.description_en || '',
            name_zh: r.name_zh || '',
            description_zh: r.description_zh || ''
          }
        }
      }

      // Get the raw string response
      let resultText = ''
      if (typeof jsonResponse.result?.response === 'string') {
        resultText = jsonResponse.result.response
      } else if (typeof jsonResponse.result?.choices?.[0]?.message?.content === 'string') {
        resultText = jsonResponse.result.choices[0].message.content
      } else {
        console.error('Unexpected AI response format', JSON.stringify(jsonResponse).slice(0, 500))
        throw new Error('Unexpected AI response format')
      }

      resultText = resultText.trim()

      // Clean up potential markdown blocks
      const cleanedText = resultText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim()
      
      const parsed = JSON.parse(cleanedText)

      // Validate and return with defaults
      return {
        name_en: parsed.name_en || '',
        description_en: parsed.description_en || '',
        name_zh: parsed.name_zh || '',
        description_zh: parsed.description_zh || ''
      }
    } catch (error: any) {
      lastError = error.message || 'Translation failed'
      console.error(`Translation attempt ${attempt + 1} failed:`, lastError)
      
      // Don't retry on non-recoverable errors
      if (lastError.includes('configuration is missing') || lastError.includes('Failed to contact')) {
        break
      }
    }
  }

  throw createError({
    statusCode: 500,
    message: lastError || 'Translation failed after retries'
  })
})
