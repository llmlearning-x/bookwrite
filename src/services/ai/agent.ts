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
  buildKnowledgeContext,
} from './prompts'
import { exportToMarkdown, exportToDocx, exportToHTML, exportToPDF } from '@/services/export/exportService'

function plainToHtml(text: string): string {
  return text
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function stripHtml(html: string): string {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
}

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
        format: { type: 'string', enum: ['docx', 'markdown', 'html', 'pdf'], description: '导出格式' },
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
  {
    name: 'manage_character',
    description: '添加或更新书籍人物卡。用于记录角色信息，写作时保持人物一致性。',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '人物 ID（更新时传入，新增时留空）' },
        name: { type: 'string', description: '人物姓名' },
        role: { type: 'string', enum: ['protagonist', 'antagonist', 'supporting', 'minor'], description: '角色定位' },
        description: { type: 'string', description: '外貌描述' },
        personality: { type: 'string', description: '性格特点' },
        arc: { type: 'string', description: '人物成长弧线' },
        firstChapter: { type: 'number', description: '首次出场章节编号' },
      },
      required: ['name', 'role', 'description', 'personality'],
    },
  },
  {
    name: 'update_world_note',
    description: '添加或更新世界观笔记（地点、规则、历史、技术等设定）。',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '笔记 ID（更新时传入，新增时留空）' },
        category: { type: 'string', enum: ['setting', 'rule', 'history', 'technology', 'culture', 'other'] },
        title: { type: 'string', description: '设定名称' },
        content: { type: 'string', description: '设定内容详情' },
      },
      required: ['category', 'title', 'content'],
    },
  },
  {
    name: 'write_next_chapter',
    description: '写作下一个未完成的章节。写完后自动暂停等待用户确认，再继续下一章。',
    parameters: { type: 'object', properties: {} },
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
const CHECKPOINT_SKILLS = ['expand_idea', 'generate_outline', 'write_next_chapter']

const AGENT_SYSTEM = `你是 BookBuddy 的 AI 书籍创作助手，帮助用户从创意到成稿完成整本书的创作。

你拥有强大的技能工具集，可以完成：创意扩展、大纲生成、章节写作、人物管理、世界观设定、封面生成、书籍导出等全流程任务。

【核心原则：人在环中】
- 每完成一个关键步骤，必须停下来向用户展示结果、等待确认，再继续下一步
- 不要连续执行多个重大步骤，把选择权交给用户
- 章节写作使用 write_next_chapter（每次写一章，写完暂停等待用户确认继续）
- 使用中文回复，简洁清晰；在执行前简要说明将要做什么

【完整书籍创作流程】
1. expand_idea → 展示结果 → 等待用户确认/修改
2. manage_character（提炼主要人物卡）+ update_world_note（关键设定）
3. generate_outline → 展示大纲 → 等待确认
4. 逐章写作：反复调用 write_next_chapter，每章写完向用户汇报并等待确认继续
5. 可随时 edit_chapter 润色、generate_cover 生成封面、export_book 导出

【人物与世界观】
- 在生成大纲后，主动提取并创建主要人物卡（manage_character）和关键世界观设定（update_world_note）
- 写作时系统会自动将人物卡注入上下文，确保人物一致性
- 如用户提到新角色或新设定，立即调用工具记录`

// ─── Skill labels ──────────────────────────────────────────────────────────

const SKILL_LABELS: Record<string, string> = {
  expand_idea: '扩展创意',
  generate_outline: '生成大纲',
  write_chapter: '写作章节',
  write_all_chapters: '批量写作',
  write_next_chapter: '写作下一章',
  edit_chapter: 'AI 编辑',
  generate_cover: '生成封面',
  export_book: '导出书籍',
  navigate_chapter: '切换章节',
  update_book_info: '更新信息',
  manage_character: '更新人物卡',
  update_world_note: '更新世界观',
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
  const { book, updateIdea, updateMetadata, setOutline, updateChapter, setActiveChapter, updateVisuals, upsertCharacter, upsertWorldNote } = useBookStore.getState()

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
      // 传入所有已写完章节的摘要，供一致性参考
      const previousSummaries = useBookStore.getState().book.outline
        .slice(0, chapterIndex)
        .filter(c => c.content)
        .map(c => ({ number: c.number, title: c.title, summary: c.summary }))
      let full = ''
      await streamCompletion(
        config,
        SYSTEM_BOOK_AUTHOR,
        promptWriteChapter(useBookStore.getState().book, chapter, previousSummaries),
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
      updateChapter(chapterId, { content: plainToHtml(full), wordCount: wc, status: 'draft' })
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
        promptEditContent(stripHtml(chapter.content), input.mode as string, buildBookContext(useBookStore.getState().book)),
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
      updateChapter(chapterId, { content: plainToHtml(full), wordCount: wc, status: 'revised' })
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
      if (format === 'pdf') {
        type ElectronAPI = {
          fs?: { showSaveDialog?: (opts: unknown) => Promise<string | null> }
          pdf?: { export: (buffer: ArrayBuffer, path: string) => Promise<{ ok: boolean }> }
          shell?: { openPath: (p: string) => void }
        }
        // Generate PDF first so user doesn't wait after picking a path
        const pdfBytes = await exportToPDF(bookData)
        const api = (window as Window & { electronAPI?: ElectronAPI }).electronAPI
        if (api?.fs?.showSaveDialog) {
          const savePath = await api.fs.showSaveDialog({
            title: '保存 PDF',
            defaultPath: `${base}.pdf`,
            filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
          })
          if (savePath && api.pdf?.export) {
            await api.pdf.export(pdfBytes.buffer as ArrayBuffer, savePath)
            api.shell?.openPath(savePath)
            return `PDF 已导出至：${savePath}`
          }
          if (!savePath) {
            // User cancelled native dialog — fall back to browser download
            triggerDownload(pdfBytes.buffer as ArrayBuffer, `${base}.pdf`, 'application/pdf')
            return 'PDF 已通过浏览器下载'
          }
        }
        triggerDownload(pdfBytes.buffer as ArrayBuffer, `${base}.pdf`, 'application/pdf')
        return 'PDF 已导出'
      }
      return '未知格式'
    }

    case 'write_next_chapter': {
      const next = useBookStore.getState().book.outline.find(c => !c.content)
      if (!next) return '所有章节已写作完成！'
      const result = await executeSkill('write_chapter', { chapter_id: next.id }, config, onStream, signal)
      const remaining = useBookStore.getState().book.outline.filter(c => !c.content).length
      return result + (remaining > 0 ? `\n\n还剩 ${remaining} 章未写，点击「继续」写下一章。` : '\n\n全部章节已写作完成！')
    }

    case 'manage_character': {
      const char = {
        id: (input.id as string) || crypto.randomUUID(),
        name: input.name as string,
        role: input.role as 'protagonist' | 'antagonist' | 'supporting' | 'minor',
        description: input.description as string,
        personality: input.personality as string,
        arc: (input.arc as string) || '',
        firstChapter: input.firstChapter as number | undefined,
      }
      upsertCharacter(char)
      return `人物卡已更新：${char.name}（${char.role}）`
    }

    case 'update_world_note': {
      const note = {
        id: (input.id as string) || crypto.randomUUID(),
        category: input.category as 'setting' | 'rule' | 'history' | 'technology' | 'culture' | 'other',
        title: input.title as string,
        content: input.content as string,
      }
      upsertWorldNote(note)
      return `世界观笔记已更新：${note.title}`
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
  signal?: AbortSignal,
  resumeState?: { messages: Anthropic.MessageParam[]; loopCount: number; assistantText: string }
) {
  const { setThinking, startSkill, finishSkill, failSkill, updateAssistantMessage } = useAgentStore.getState()

  const book = useBookStore.getState().book
  const bookSummary = book.idea.title
    ? `当前书籍：《${book.idea.title}》，${book.idea.genre}，${book.outline.length} 章，已写 ${book.outline.filter((c) => c.content).length} 章`
    : '当前没有书籍项目'

  const messages: Anthropic.MessageParam[] = resumeState?.messages ?? [
    ...history.slice(-10).map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: `[书籍状态：${bookSummary}]\n\n${userMessage}` },
  ]

  const client = new Anthropic({ apiKey: config.apiKey, dangerouslyAllowBrowser: true })

  let assistantText = resumeState?.assistantText ?? ''
  let loopCount = resumeState?.loopCount ?? 0

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
    let hitCheckpoint: string | false = false

    for (const toolBlock of toolUseBlocks) {
      if (hitCheckpoint) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: '已暂停：需要用户确认后才能继续执行此步骤',
        })
        continue
      }

      const skillId = crypto.randomUUID()
      startSkill({
        id: skillId,
        name: toolBlock.name,
        label: SKILL_LABELS[toolBlock.name] ?? toolBlock.name,
        status: 'running',
        input: toolBlock.input as Record<string, unknown>,
      })

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

      if (CHECKPOINT_SKILLS.includes(toolBlock.name)) {
        hitCheckpoint = toolBlock.name
      }
    }

    // Continue the loop with tool results
    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults })

    if (hitCheckpoint) {
      const hasMoreChapters = hitCheckpoint === 'write_next_chapter' &&
        useBookStore.getState().book.outline.some(c => !c.content)
      useAgentStore.getState().setCheckpoint({
        autoResend: hasMoreChapters ? '继续写下一章' : undefined,
        resume: () => runAgentAnthropic(
          '', config, history, onStream, assistantMsgId, signal,
          { messages: [...messages], loopCount: loopCount + 1, assistantText }
        )
      })
      setThinking(false)
      return
    }

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
  signal?: AbortSignal,
  resumeState?: { messages: OpenAI.ChatCompletionMessageParam[]; loopCount: number; assistantText: string }
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

  const messages: OpenAI.ChatCompletionMessageParam[] = resumeState?.messages ?? [
    { role: 'system', content: AGENT_SYSTEM },
    ...history.slice(-10).map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user', content: `[书籍状态：${bookSummary}]\n\n${userMessage}` },
  ]

  let assistantText = resumeState?.assistantText ?? ''
  let loopCount = resumeState?.loopCount ?? 0

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
    let hitCheckpoint: string | false = false

    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== 'function') continue

      if (hitCheckpoint) {
        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: '已暂停：需要用户确认后才能继续执行此步骤',
        })
        continue
      }

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

      if (CHECKPOINT_SKILLS.includes(toolCall.function.name)) {
        hitCheckpoint = toolCall.function.name
      }
    }

    // Continue the loop with tool results
    messages.push({
      role: 'assistant',
      content: message.content ?? '',
      tool_calls: message.tool_calls,
    } as OpenAI.ChatCompletionAssistantMessageParam)
    messages.push(...toolResults)

    if (hitCheckpoint) {
      const hasMoreChapters = hitCheckpoint === 'write_next_chapter' &&
        useBookStore.getState().book.outline.some(c => !c.content)
      useAgentStore.getState().setCheckpoint({
        autoResend: hasMoreChapters ? '继续写下一章' : undefined,
        resume: () => runAgentOpenAI(
          '', config, history, onStream, assistantMsgId, signal,
          { messages: [...messages], loopCount: loopCount + 1, assistantText }
        )
      })
      setThinking(false)
      return
    }
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
