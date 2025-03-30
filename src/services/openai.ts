import { useOpenAIStore } from '../stores/openai'

export interface ChatCompletionRequest {
  model?: string
  messages: Array<{
    role: string
    content: string
  }>
  temperature?: number
  max_tokens?: number
}

export interface ChatCompletionChunk {
  chunk: {
    content: string
  }
}

export async function* streamChatCompletion(req: ChatCompletionRequest, opts?: {
  signal?: AbortSignal
}): AsyncGenerator<ChatCompletionChunk> {
  const store = useOpenAIStore()

  const response = await fetch(store.chatCompletionAPI, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${store.apiKey}`,
    },
    body: JSON.stringify({
      model: store.model,
      temperature: 0.5,
      ...req,
      stream: true,
    }),
    signal: opts?.signal,
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  if (!response.body) {
    throw new Error('Response body is null')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(line => line.trim() !== '')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') break

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            yield { chunk: { content } }
          }
        } catch (e) {
          console.error('Error parsing SSE message:', e)
        }
      }
    }
  }
}
