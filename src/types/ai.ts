export type AIProvider = 'anthropic' | 'openai' | 'ollama' | 'custom'

export type AIModel = {
  id: string
  name: string
  provider: AIProvider
  maxTokens: number
  supportsVision: boolean
}

export const AI_MODELS: AIModel[] = [
  { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', provider: 'anthropic', maxTokens: 200000, supportsVision: true },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'anthropic', maxTokens: 200000, supportsVision: true },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', provider: 'anthropic', maxTokens: 200000, supportsVision: true },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', maxTokens: 128000, supportsVision: true },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', maxTokens: 128000, supportsVision: true },
  { id: 'o3', name: 'O3', provider: 'openai', maxTokens: 100000, supportsVision: false },
  { id: 'kimi-k2.5', name: 'Kimi K2.5', provider: 'custom', maxTokens: 256000, supportsVision: true },
  { id: 'kimi-k2.6', name: 'Kimi K2.6', provider: 'custom', maxTokens: 256000, supportsVision: true },
  { id: 'moonshot-v1-128k', name: 'Moonshot v1-128k', provider: 'custom', maxTokens: 131072, supportsVision: false },
  { id: 'moonshot-v1-32k', name: 'Moonshot v1-32k', provider: 'custom', maxTokens: 32768, supportsVision: true },
  { id: 'moonshot-v1-8k', name: 'Moonshot v1-8k', provider: 'custom', maxTokens: 8192, supportsVision: false },
]

export interface AIConfig {
  provider: AIProvider
  model: string
  apiKey: string
  baseUrl?: string        // custom base URL for OpenAI-compatible APIs
  ollamaHost?: string
  imageProvider?: 'openai' | 'stability' | 'replicate'
  imageApiKey?: string
  temperature?: number
  maxTokens?: number
}

export const PROVIDER_PRESETS: { label: string; baseUrl: string; models: string[] }[] = [
  { label: 'DeepSeek',  baseUrl: 'https://api.deepseek.com/v1',                              models: ['deepseek-chat', 'deepseek-reasoner'] },
  { label: 'Moonshot',  baseUrl: 'https://api.moonshot.cn/v1',                               models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'] },
  { label: 'Qwen',      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',        models: ['qwen-plus', 'qwen-turbo', 'qwen-max'] },
  { label: 'Groq',      baseUrl: 'https://api.groq.com/openai/v1',                           models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'] },
  { label: 'SiliconFlow',baseUrl: 'https://api.siliconflow.cn/v1',                           models: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-72B-Instruct'] },
  { label: 'Azure',     baseUrl: 'https://{resource}.openai.azure.com/openai/deployments/{deployment}', models: [] },
]

export interface AIStreamChunk {
  text: string
  done: boolean
  reasoningContent?: string
}

export type EditMode = 'rewrite' | 'expand' | 'condense' | 'polish' | 'tone-formal' | 'tone-casual' | 'proofread'

export interface AIWriteTask {
  type: 'idea-expand' | 'outline-generate' | 'chapter-write' | 'section-write' | 'edit' | 'cover-prompt'
  bookContext: string
  chapterContext?: string
  existingContent?: string
  instruction?: string
  editMode?: EditMode
  targetWordCount?: number
}
