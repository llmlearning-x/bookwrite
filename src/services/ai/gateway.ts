import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { AIConfig, AIStreamChunk } from '@/types/ai'

export type StreamCallback = (chunk: AIStreamChunk) => void

async function* streamAnthropic(
  config: AIConfig,
  system: string,
  prompt: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const client = new Anthropic({
    apiKey: config.apiKey,
    dangerouslyAllowBrowser: true,
    ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
  })
  const stream = client.messages.stream({
    model: config.model,
    max_tokens: config.maxTokens ?? 8096,
    system,
    messages: [{ role: 'user', content: prompt }],
  })
  for await (const event of stream) {
    if (signal?.aborted) break
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text
    }
  }
}

async function* streamOpenAI(
  config: AIConfig,
  system: string,
  prompt: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const baseURL = config.baseUrl
    ?? (config.ollamaHost ? config.ollamaHost + '/v1' : undefined)
  const client = new OpenAI({
    apiKey: config.apiKey || 'none',
    dangerouslyAllowBrowser: true,
    ...(baseURL ? { baseURL } : {}),
  })
  const stream = await client.chat.completions.create({
    model: config.model,
    max_tokens: config.maxTokens ?? 8096,
    stream: true,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
  }, { signal })
  for await (const chunk of stream) {
    if (signal?.aborted) break
    const text = chunk.choices[0]?.delta?.content ?? ''
    if (text) yield text
  }
}

async function* streamOllama(
  config: AIConfig,
  system: string,
  prompt: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const host = config.ollamaHost ?? 'http://localhost:11434'
  const resp = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      stream: true,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
    signal,
  })
  if (!resp.ok) throw new Error(`Ollama error: ${resp.status}`)
  const reader = resp.body!.getReader()
  const decoder = new TextDecoder()
  while (true) {
    if (signal?.aborted) break
    const { done, value } = await reader.read()
    if (done) break
    const lines = decoder.decode(value).split('\n').filter(Boolean)
    for (const line of lines) {
      try {
        const data = JSON.parse(line)
        if (data.message?.content) yield data.message.content
      } catch {
        // ignore parse errors for partial chunks
      }
    }
  }
}

export async function streamCompletion(
  config: AIConfig,
  system: string,
  prompt: string,
  onChunk: StreamCallback,
  signal?: AbortSignal
): Promise<string> {
  let fullText = ''
  let generator: AsyncGenerator<string>

  if (config.provider === 'anthropic') {
    generator = streamAnthropic(config, system, prompt, signal)
  } else if (config.provider === 'ollama') {
    generator = streamOllama(config, system, prompt, signal)
  } else {
    // openai + custom both use the OpenAI-compatible client
    generator = streamOpenAI(config, system, prompt, signal)
  }

  for await (const chunk of generator) {
    if (signal?.aborted) break
    fullText += chunk
    onChunk({ text: chunk, done: false })
  }
  onChunk({ text: '', done: true })
  return fullText
}

export async function generateImage(
  config: AIConfig,
  prompt: string
): Promise<string> {
  if (config.imageProvider === 'openai') {
    const client = new OpenAI({
      apiKey: config.imageApiKey ?? config.apiKey,
      dangerouslyAllowBrowser: true,
    })
    const res = await client.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    })
    return `data:image/png;base64,${res.data?.[0]?.b64_json ?? ''}`
  }
  // stability/replicate can be added here
  throw new Error('No image provider configured')
}
