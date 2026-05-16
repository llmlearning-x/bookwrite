import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { AIConfig } from '@/types/ai'
import type { Book, Chapter } from '@/types/book'
import { useBookStore } from '@/stores/bookStore'
import { useAgentStore } from '@/stores/agentStore'
import { streamCompletion, generateImage } from './gateway'
import {
  SYSTEM_BOOK_AUTHOR,
  SYSTEM_BOOK_EDITOR,
  promptExpandIdea,
  promptGenerateOutline,
  promptWriteChapter,
  promptEditContent,
  promptGenerateCoverPrompt,
  buildBookContext,
} from './prompts'
import { exportToMarkdown, exportToDocx, exportToHTML } from '@/services/export/exportService'

// ─── Tool definitions (provider-agnostic) ──────────────────────────────────

interface AgentTool {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: 'expand_idea',
    description: '将用户的书籍想法扩展为完整的书籍元数据（标题、简介、类型、受众、主题、风格）。当用户有一个粗略想法需要发展时使用。',
    parameters: {
      type: 'object',
      properties: {
        raw_idea: { type: 'string', description: '用户的原始书籍想法' },
      },
      required: ['raw_idea'],
    },
  },
  {
    name: 'generate_outline',
    description: '根据书籍元数据生成完整的章节大纲（8-15章，含各章摘要和章节）。必须在书籍有标题和简介后才能使用。',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'write_chapter',
    description: '为指定章节生成完整内容，流式写入画布。',
    parameters: {
      type: 'object',
      properties: {
        chapter_id: { type: 'string', description: '章节 ID' },
      },
      required: ['chapter_id'],
    },
  },
  {
    name: 'write_all_chapters',
    description: '按顺序为所有尚未写作的章节生成内容。',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'edit_chapter',
    description: '对当前激活章节的内容进行 AI 编辑。',
    parameters: {
      type: 'object',
      properties: {
        chapter_id: { type: 'string', description: '章节 ID' },
        mode: {
          type: 'string',
          enum: ['polish', 'expand', 'condense', 'rewrite', 'tone-formal', 'tone-casual', 'proofread'],
          description: '编辑模式',
        },
        instruction: { type: 'string', description: '具体编辑指令（可选）' },
      },
      required: ['chapter_id', 'mode'],
    },
  },
  {
    name: 'generate_cover',
    description: '为书籍生成 AI 封面图片。',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'export_book',
    description: '将书籍导出为指定格式。',
    parameters: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['docx', 'markdown', 'html'], description: '导出格式' },
      },
      required: ['format'],
    },
  },
  {
    name: 'navigate_chapter',
    description: '切换画布显示到指定章节。',
    parameters: {
      type: 'object',
      properties: {
        chapter_id: { type: 'string', description: '目标章节 ID' },
      },
      required: ['chapter_id'],
    },
  },
  {
    name: 'update_book_info',
    description: '更新书籍基本信息（标题、作者、类型等）。',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        author: { type: 'string' },
        genre: { type: 'string' },
        synopsis: { type: 'string' },
        toneStyle: { type: 'string' },
      },
    },
  },
]

function toAnthropicTools(tools: AgentTool[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Tool['input_schema'],
  }))
}

function toOpenAITools(tools: AgentTool[]): OpenAI.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))
}

const MAX_LOOPS = 10

const AGENT_SYSTEM = `你是 BookWrite 的 AI 创作助手，帮助用户端到端完成书籍创作。

你拥有一组强大的技能工具（skills），可以自动化完成创意扩展、大纲生成、章节写作、内容编辑、封面设计、书籍导出等任务。

工作原则：
- 主动使用工具完成任务，不要只给建议
- 每完成一个关键步骤后，停下来向用户汇报结果并等待用户确认，再进行下一步
- 使用中文回复，简洁清晰
- 在工具执行前简要告知用户正在做什么
- 完成后总结结果

当用户说"帮我写一本书关于X"时，应该：
1. 先调用 expand_idea 扩展创意
2. 完成后向用户展示结果，等待用户确认或修改意见
3. 用户确认后，调用 generate_outline 生成大纲
4. 完成后向用户展示大纲概览，等待用户确认
5. 用户确认后，调用 write_all_chapters 批量写作
6. 不要跳过中间步骤，不要在用户未确认时自动执行下一步`

// ─── Skill labels ──────────────────────────────────────────────────────────

const SKILL_LABELS: Record<string, string> = {
  expand_idea: '扩展创意',
  generate_outline: '生成大纲',
  write_chapter: '写作章节',
  write_all_chapters: '批量写作',
  edit_chapter: 'AI 编辑',
  generate_cover: '生成封面',
  export_book: '导出书籍',
  navigate_chapter: '切换章节',
  update_book_info: '更新信息',
}

// ─── Skill executor ────────────────────────────────────────────────────────

type OnChapterStream = (chapterId: string, text: string, done: boolean) => void

async function executeSkill(
  name: string,
  input: Record<string, unknown>,
  config: AIConfig,
  onStream: OnChapterStream,
  signal?: AbortSignal
): Promise<string> {
  const { book, updateIdea, updateMetadata, setOutline, updateChapter, setActiveChapter, updateVisuals } = useBookStore.getState()

  switch (name) {
    case 'expand_idea': {
      let full = ''
      await streamCompletion(config, SYSTEM_BOOK_AUTHOR, promptExpandIdea(input.raw_idea as string), ({ text, done }) => {
        if (!done) full += text
      }, signal)
      const cleaned = full.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const idea = JSON.parse(cleaned)
      updateIdea(idea)
      return `书籍创意已扩展：《${idea.title}》，${idea.genre} 类型，约 ${idea.estimatedLength} 页`
    }

    case 'generate_outline': {
      let full = ''
      await streamCompletion(config, SYSTEM_BOOK_AUTHOR, promptGenerateOutline(book.idea), ({ text, done }) => {
        if (!done) full += text
      }, signal)
      const cleaned = full.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const rawChapters = JSON.parse(cleaned)
      const chapters: Chapter[] = rawChapters.map((c: Chapter & { sections?: Array<{ title: string; summary: string }> }) => ({
        id: crypto.randomUUID(),
        number: c.number,
        title: c.title,
        summary: c.summary,
        sections: (c.sections ?? []).map((s) => ({
          id: crypto.randomUUID(),
          title: s.title,
          summary: s.summary,
          content: '',
          wordCount: 0,
          status: 'pending' as const,
        })),
        content: '',
        wordCount: 0,
        status: 'pending' as const,
      }))
      setOutline(chapters)
      setActiveChapter(chapters[0].id)
      return `大纲已生成：共 ${chapters.length} 章`
    }

    case 'write_chapter': {
      const chapterId = input.chapter_id as string
      const chapter = useBookStore.getState().book.outline.find((c) => c.id === chapterId)
      if (!chapter) return '章节不存在'
      updateChapter(chapterId, { status: 'writing' })
      setActiveChapter(chapterId)
      const chapterIndex = useBookStore.getState().book.outline.findIndex((c) => c.id === chapterId)
      const prev = chapterIndex > 0 ? useBookStore.getState().book.outline[chapterIndex - 1] : undefined
      let full = ''
      await streamCompletion(
        config,
        SYSTEM_BOOK_AUTHOR,
        promptWriteChapter(useBookStore.getState().book, chapter, prev?.summary),
        ({ text, done }) => {
          if (!done) {
            full += text
            onStream(chapterId, full, false)
          } else {
            onStream(chapterId, full, true)
          }
        },
        signal
      )
      // 后处理：去除 markdown 标记并规范段落
      full = full
        .replace(/\*\*([^*]+)\*\*/g, '$1')   // **粗体**
        .replace(/\*([^*]+)\*/g, '$1')       // *斜体*
        .replace(/^#{1,6}\s+/gm, '')         // # 标题
        .replace(/^[-*+]\s+/gm, '')          // - 列表
        .replace(/\n{3,}/g, '\n\n')          // 多余空行

      // 如果没有段落分隔，按句号智能分段
      if (!full.includes('\n\n')) {
        full = full.replace(/([。！？；\.\!\?])([^\n\s])/g, '$1\n\n$2')
      }

      const wc = full.replace(/\s/g, '').length
      updateChapter(chapterId, { content: full, wordCount: wc, status: 'draft' })
      return `第 ${chapter.number} 章《${chapter.title}》写作完成，共 ${wc} 字`
    }

    case 'write_all_chapters': {
      const chapters = useBookStore.getState().book.outline.filter((c) => !c.content)
      let total = 0
      for (const chapter of chapters) {
        await executeSkill('write_chapter', { chapter_id: chapter.id }, config, onStream, signal)
        total += useBookStore.getState().book.outline.find((c) => c.id === chapter.id)?.wordCount ?? 0
      }
      return `全部 ${chapters.length} 章写作完成，累计 ${total} 字`
    }

    case 'edit_chapter': {
      const chapterId = input.chapter_id as string
      const chapter = useBookStore.getState().book.outline.find((c) => c.id === chapterId)
      if (!chapter?.content) return '章节内容为空，无法编辑'
      setActiveChapter(chapterId)
      let full = ''
      await streamCompletion(
        config,
        SYSTEM_BOOK_EDITOR,
        promptEditContent(chapter.content, input.mode as string, buildBookContext(useBookStore.getState().book)),
        ({ text, done }) => {
          if (!done) {
            full += text
            onStream(chapterId, full, false)
          } else {
            onStream(chapterId, full, true)
          }
        },
        signal
      )
      const wc = full.replace(/\s/g, '').length
      updateChapter(chapterId, { content: full, wordCount: wc, status: 'revised' })
      return `第 ${chapter.number} 章编辑完成（${input.mode}），共 ${wc} 字`
    }

    case 'generate_cover': {
      let full = ''
      await streamCompletion(config, SYSTEM_BOOK_AUTHOR, promptGenerateCoverPrompt(book.idea), ({ text, done }) => {
        if (!done) full += text
      }, signal)
      const cleaned = full.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const data = JSON.parse(cleaned)
      updateVisuals({ coverPrompt: data.imagePrompt })
      if (config.imageApiKey || (config.provider === 'openai' && config.apiKey)) {
        const image = await generateImage(config, data.imagePrompt)
        updateVisuals({ coverImage: image })
        return '封面图已生成'
      }
      return `封面提示词已生成（需要配置图片 API Key 才能渲染图片）：${data.imagePrompt.slice(0, 60)}...`
    }

    case 'export_book': {
      const format = input.format as string
      const bookData = useBookStore.getState().book
      const base = bookData.idea.title || 'untitled'
      if (format === 'markdown') {
        const text = await exportToMarkdown(bookData)
        triggerDownload(text, `${base}.md`, 'text/markdown')
        return 'Markdown 文件已导出'
      }
      if (format === 'docx') {
        const buf = await exportToDocx(bookData)
        triggerDownload(buf as unknown as string, `${base}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        return 'Word 文档已导出'
      }
      if (format === 'html') {
        const html = await exportToHTML(bookData)
        triggerDownload(html, `${base}.html`, 'text/html')
        return 'HTML 文件已导出'
      }
      return '未知格式'
    }

    case 'navigate_chapter': {
      const { setActiveChapter } = useBookStore.getState()
      setActiveChapter(input.chapter_id as string)
      const ch = useBookStore.getState().book.outline.find((c) => c.id === input.chapter_id)
      return `已跳转到第 ${ch?.number} 章《${ch?.title}》`
    }

    case 'update_book_info': {
      const fields = input as Record<string, string>
      if (fields.title || fields.genre || fields.synopsis || fields.toneStyle) {
        updateIdea({
          ...(fields.title && { title: fields.title }),
          ...(fields.genre && { genre: fields.genre as never }),
          ...(fields.synopsis && { synopsis: fields.synopsis }),
          ...(fields.toneStyle && { toneStyle: fields.toneStyle }),
        })
      }
      if (fields.author) updateMetadata({ author: fields.author })
      return '书籍信息已更新'
    }

    default:
      return `未知技能: ${name}`
  }
}

function triggerDownload(content: string | ArrayBuffer, filename: string, mime: string) {
  const blob = new Blob([content as BlobPart], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Anthropic agent runner ────────────────────────────────────────────────

async function runAgentAnthropic(
  userMessage: string,
  config: AIConfig,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  onStream: OnChapterStream,
  assistantMsgId: string,
  signal?: AbortSignal
) {
  const { setThinking, startSkill, finishSkill, failSkill, updateAssistantMessage, updateAssistantReasoning } = useAgentStore.getState()

  const book = useBookStore.getState().book
  const bookSummary = book.idea.title
    ? `当前书籍：《${book.idea.title}》，${book.idea.genre}，${book.outline.length} 章，已写 ${book.outline.filter((c) => c.content).length} 章`
    : '当前没有书籍项目'

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-10).map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: `[书籍状态：${bookSummary}]\n\n${userMessage}` },
  ]

  const client = new Anthropic({ apiKey: config.apiKey, dangerouslyAllowBrowser: true })

  let assistantText = ''
  let loopCount = 0

  while (loopCount < MAX_LOOPS) {
    if (signal?.aborted) break
    loopCount++
    setThinking(true)

    let response: Anthropic.Message
    try {
      response = await client.messages.create({
        model: config.model.startsWith('claude') ? config.model : 'claude-sonnet-4-6',
        max_tokens: config.maxTokens ?? 8096,
        system: AGENT_SYSTEM,
        tools: toAnthropicTools(AGENT_TOOLS),
        messages,
      })
    } catch (e) {
      updateAssistantMessage(assistantMsgId, assistantText + `\n\n❌ API 错误: ${String(e)}`)
      setThinking(false)
      return
    }

    // Extract text blocks
    for (const block of response.content) {
      if (block.type === 'text') {
        assistantText += block.text
        updateAssistantMessage(assistantMsgId, assistantText)
      }
    }

    // If no tool calls, we're done
    const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (toolUseBlocks.length === 0) break

    // Execute all tool calls
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const toolBlock of toolUseBlocks) {
      const skillId = crypto.randomUUID()
      startSkill({
        id: skillId,
        name: toolBlock.name,
        label: SKILL_LABELS[toolBlock.name] ?? toolBlock.name,
        status: 'running',
        input: toolBlock.input as Record<string, unknown>,
      })
      setThinking(false)

      let result: string
      try {
        result = await executeSkill(
          toolBlock.name,
          toolBlock.input as Record<string, unknown>,
          config,
          onStream,
          signal
        )
        finishSkill(skillId, result)
      } catch (e) {
        result = `技能执行失败: ${String(e)}`
        failSkill(skillId)
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: result,
      })
    }

    // Continue the loop with tool results
    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults })

    if (response.stop_reason === 'end_turn') break
  }

  setThinking(false)
}

// ─── OpenAI-compatible agent runner ────────────────────────────────────────

async function runAgentOpenAI(
  userMessage: string,
  config: AIConfig,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  onStream: OnChapterStream,
  assistantMsgId: string,
  signal?: AbortSignal
) {
  const { setThinking, startSkill, finishSkill, failSkill, updateAssistantMessage } = useAgentStore.getState()

  const book = useBookStore.getState().book
  const bookSummary = book.idea.title
    ? `当前书籍：《${book.idea.title}》，${book.idea.genre}，${book.outline.length} 章，已写 ${book.outline.filter((c) => c.content).length} 章`
    : '当前没有书籍项目'

  const baseURL = config.baseUrl ?? (config.ollamaHost ? config.ollamaHost + '/v1' : undefined)

  const client = new OpenAI({
    apiKey: config.apiKey || 'none',
    dangerouslyAllowBrowser: true,
    fetch: fetch.bind(globalThis),
    ...(baseURL ? { baseURL } : {}),
  })

  const openaiTools = toOpenAITools(AGENT_TOOLS)

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: AGENT_SYSTEM },
    ...history.slice(-10).map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user', content: `[书籍状态：${bookSummary}]\n\n${userMessage}` },
  ]

  let assistantText = ''
  let loopCount = 0

  while (loopCount < MAX_LOOPS) {
    if (signal?.aborted) break
    loopCount++
    setThinking(true)

    let response: OpenAI.ChatCompletion
    try {
      console.log('[Agent] Sending request to', baseURL || 'default', 'model:', config.model)
      response = await client.chat.completions.create({
        model: config.model,
        max_tokens: config.maxTokens ?? 8096,
        messages,
        tools: openaiTools,
        tool_choice: 'auto',
      }, { signal })
      console.log('[Agent] Response received')
    } catch (e) {
      console.error('[Agent] API request failed:', e)
      const errMsg = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
      updateAssistantMessage(assistantMsgId, assistantText + `\n\n❌ API 错误: ${errMsg}`)
      setThinking(false)
      return
    }

    const message = response.choices[0].message
    const msgWithReasoning = message as typeof message & { reasoning_content?: string }

    // Extract reasoning content (Kimi K2.5/K2.6)
    if (msgWithReasoning.reasoning_content) {
      updateAssistantReasoning(assistantMsgId, msgWithReasoning.reasoning_content)
    }

    // Extract text content
    if (message.content) {
      assistantText += message.content
      updateAssistantMessage(assistantMsgId, assistantText)
    }

    // If no tool calls, we're done
    if (!message.tool_calls || message.tool_calls.length === 0) break

    // Execute all tool calls
    const toolResults: OpenAI.ChatCompletionToolMessageParam[] = []

    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== 'function') continue

      let parsedInput: Record<string, unknown>
      try {
        parsedInput = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
      } catch {
        parsedInput = { raw: toolCall.function.arguments }
      }

      const skillId = crypto.randomUUID()
      startSkill({
        id: skillId,
        name: toolCall.function.name,
        label: SKILL_LABELS[toolCall.function.name] ?? toolCall.function.name,
        status: 'running',
        input: parsedInput,
      })
      setThinking(false)

      let result: string
      try {
        result = await executeSkill(toolCall.function.name, parsedInput, config, onStream, signal)
        finishSkill(skillId, result)
      } catch (e) {
        result = `技能执行失败: ${String(e)}`
        failSkill(skillId)
      }

      toolResults.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      })
    }

    // Continue the loop with tool results
    messages.push({
      role: 'assistant',
      content: message.content ?? '',
      tool_calls: message.tool_calls,
    } as OpenAI.ChatCompletionAssistantMessageParam)
    messages.push(...toolResults)
  }

  setThinking(false)
}

// ─── Public entry point ────────────────────────────────────────────────────

export async function runAgent(
  userMessage: string,
  config: AIConfig,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  onStream: OnChapterStream,
  assistantMsgId: string,
  signal?: AbortSignal
) {
  if (!config.apiKey && config.provider !== 'ollama') {
    useAgentStore.getState().updateAssistantMessage(assistantMsgId, '请先在设置中配置 AI API Key。')
    return
  }

  if (config.provider === 'anthropic') {
    await runAgentAnthropic(userMessage, config, history, onStream, assistantMsgId, signal)
  } else {
    // openai, custom (Kimi, DeepSeek, etc.), ollama
    await runAgentOpenAI(userMessage, config, history, onStream, assistantMsgId, signal)
  }
}
