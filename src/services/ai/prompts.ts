import type { Book, BookIdea, Chapter, BookKnowledge } from '@/types/book'

export const SYSTEM_BOOK_AUTHOR = `你是一位经验丰富的中文书籍作者和编辑，擅长各类题材。
你创作引人入胜、结构严谨、打动读者的内容。
你能够在整部作品中保持声音、风格和人物的一致性。
请直接用中文回复所要求的内容，除非被问及，否则不要添加元评论或解释。
所有输出必须使用中文。`

export const SYSTEM_BOOK_EDITOR = `你是一位专业的中文书籍编辑，擅长提升文笔质量、节奏和清晰度。
你在保留作者独特风格的同时帮助其完善作品。
请精确执行所要求的修改，并只返回编辑后的内容。
所有输出必须使用中文。`

export function buildBookContext(book: Book): string {
  const { idea } = book
  return `书名："${idea.title}"
类型：${idea.genre}
目标读者：${idea.targetAudience}
简介：${idea.synopsis}
核心主题：${idea.keyThemes.join('、')}
文风/语调：${idea.toneStyle}
作者：${book.metadata.author}`
}

export function promptExpandIdea(raw: string): string {
  return `用户有以下书籍创意：
"${raw}"

请分析这个创意，并返回一个详细的 JSON 对象，结构如下：
{
  "title": "引人入胜的书名",
  "synopsis": "2-3段内容简介",
  "genre": "以下之一：fiction|non-fiction|sci-fi|fantasy|mystery|romance|thriller|biography|self-help|technical|children|poetry|history|business|other",
  "targetAudience": "理想读者的描述",
  "keyThemes": ["主题1", "主题2", "主题3"],
  "toneStyle": "写作语调和风格的描述",
  "estimatedLength": <预估页数，数字>
}

请只返回有效的 JSON，不要加 markdown 代码块。`
}

export function promptGenerateOutline(idea: BookIdea): string {
  return `请为以下书籍创建详细的逐章大纲：

书名："${idea.title}"
类型：${idea.genre}
简介：${idea.synopsis}
目标读者：${idea.targetAudience}
核心主题：${idea.keyThemes.join('、')}
文风/语调：${idea.toneStyle}
目标长度：约 ${idea.estimatedLength} 页

请返回章节 JSON 数组：
[
  {
    "number": 1,
    "title": "章节标题",
    "summary": "2-3句话概括本章内容",
    "sections": [
      { "title": "小节标题", "summary": "简要描述" }
    ]
  }
]

请根据类型和长度创建 8-15 章。只返回有效的 JSON。`
}

export function buildKnowledgeContext(knowledge: BookKnowledge): string {
  const parts: string[] = []

  if (knowledge.characters.length > 0) {
    const charLines = knowledge.characters.map(c =>
      `  - ${c.name}（${c.role}）：${c.description}；性格：${c.personality}${c.arc ? `；弧线：${c.arc}` : ''}`
    ).join('\n')
    parts.push(`人物表：\n${charLines}`)
  }

  if (knowledge.worldNotes.length > 0) {
    const noteLines = knowledge.worldNotes.map(n =>
      `  - [${n.category}] ${n.title}：${n.content}`
    ).join('\n')
    parts.push(`世界观设定：\n${noteLines}`)
  }

  return parts.length > 0 ? parts.join('\n\n') : ''
}

export function promptWriteChapter(
  book: Book,
  chapter: Chapter,
  previousSummaries?: Array<{ number: number; title: string; summary: string }>
): string {
  const bookCtx = buildBookContext(book)
  const sections = chapter.sections.map(s => `- ${s.title}：${s.summary}`).join('\n')
  const knowledgeCtx = buildKnowledgeContext(book.knowledge)

  const prevCtx = previousSummaries && previousSummaries.length > 0
    ? `\n已写章节概要（保持情节连贯）：\n${previousSummaries.map(c =>
        `  第${c.number}章《${c.title}》：${c.summary}`
      ).join('\n')}`
    : ''

  return `${bookCtx}
${knowledgeCtx ? '\n' + knowledgeCtx : ''}${prevCtx}

现在请撰写第 ${chapter.number} 章："${chapter.title}"
本章概要：${chapter.summary}

需要涵盖的小节：
${sections}

请以引人入胜、流畅的叙事风格撰写完整的章节正文，适合该类型和目标读者。
目标长度：约 ${Math.round(book.idea.estimatedLength / book.outline.length)} 页。

格式要求（必须遵守）：
1. 用空行分隔段落，每段之间必须有一个空行
2. 禁止使用 markdown 格式（如 **粗体**、*斜体*、# 标题、- 列表等）
3. 确保人物行为、外貌、关系与人物表保持一致
4. 每章内容必须有清晰的起承转合，严禁重复同样的句子或段落
5. 直接从正文开始（不需要"第X章"标题）
6. 所有内容必须使用中文`
}

export function promptEditContent(
  content: string,
  mode: string,
  context: string
): string {
  const instructions: Record<string, string> = {
    rewrite: '在保留核心含义的前提下，彻底重写这段内容，提升清晰度、流畅度和感染力。',
    expand: '扩展这段内容，增加更多细节、生动的描写和更深入的思想探索。篇幅增加 50-100%。',
    condense: '将这段内容精简到核心要点。去除冗余，篇幅缩减 30-50%，同时保留关键信息。',
    polish: '润色这段内容：修正别扭的表达，改善用词，增强句式变化，使其更具文学性。',
    'tone-formal': '用正式、专业的语调重写，适合学术或商业读者。',
    'tone-casual': '用温暖、 conversational、平易近人的语调重写。',
    proofread: '校对并修正所有语法、拼写、标点和文风错误。返回修正后的版本。',
  }

  return `书籍背景：${context}

${instructions[mode] || '改进这段内容。'}

需要编辑的内容：
---
${content}
---

请只返回编辑后的内容，不要解释。所有输出必须使用中文。`
}

export function promptGenerateCoverPrompt(idea: BookIdea): string {
  return `请为以下书籍生成详细的 AI 图片生成提示词：

书名："${idea.title}"
类型：${idea.genre}
简介：${idea.synopsis}
主题：${idea.keyThemes.join('、')}

请生成一个引人注目的、视觉冲击力强的封面概念。返回 JSON 对象：
{
  "imagePrompt": "详细的图片生成提示词（描述风格、色彩、构图、氛围、关键视觉元素）",
  "coverLayout": "书名/作者文字位置的简要描述"
}

请只返回有效的 JSON。`
}
