import type { Book } from '@/types/book'
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx'

export async function exportToMarkdown(book: Book): Promise<string> {
  const lines: string[] = []
  lines.push(`# ${book.idea.title}`)
  lines.push(``)
  lines.push(`**作者：** ${book.metadata.author}`)
  lines.push(`**类型：** ${book.idea.genre}`)
  lines.push(``)
  lines.push(`## 简介`)
  lines.push(book.idea.synopsis)
  lines.push(``)

  if (book.metadata.dedication) {
    lines.push(`---`)
    lines.push(`*${book.metadata.dedication}*`)
    lines.push(``)
  }

  for (const chapter of book.outline) {
    lines.push(`---`)
    lines.push(`## 第${chapter.number}章 ${chapter.title}`)
    lines.push(``)
    if (chapter.content) {
      lines.push(chapter.content)
    } else {
      lines.push(`*（本章尚未写作）*`)
    }
    lines.push(``)
  }

  return lines.join('\n')
}

export async function exportToDocx(book: Book): Promise<Uint8Array> {
  const children: Paragraph[] = []

  // Title page
  children.push(
    new Paragraph({
      text: book.idea.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: book.metadata.author, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  )

  if (book.metadata.dedication) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: book.metadata.dedication, italics: true, size: 22 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      })
    )
  }

  // Synopsis
  children.push(new Paragraph({ text: '简介', heading: HeadingLevel.HEADING_1 }))
  children.push(new Paragraph({ text: book.idea.synopsis, spacing: { after: 400 } }))

  // Chapters
  for (const chapter of book.outline) {
    children.push(
      new Paragraph({
        text: `第${chapter.number}章 ${chapter.title}`,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { after: 200 },
      })
    )
    const text = chapter.content || '（本章尚未写作）'
    const paragraphs = text.split(/\n{2,}/).filter(Boolean)
    for (const para of paragraphs) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: para, size: 24 })],
          spacing: { after: 200, line: 360 },
          indent: { firstLine: 480 },
        })
      )
    }
  }

  const doc = new Document({
    sections: [{ children }],
    styles: {
      default: {
        document: {
          run: { font: { name: 'SimSun' }, size: 24 },
        },
      },
    },
  })

  const blob = await Packer.toBlob(doc)
  const arrayBuffer = await blob.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

export async function exportToHTML(book: Book): Promise<string> {
  const chapters = book.outline.map((c) => `
  <section class="chapter" id="chapter-${c.number}">
    <h2>${c.number}. ${c.title}</h2>
    ${c.content
      ? c.content.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('\n    ')
      : '<p class="empty">（本章尚未写作）</p>'}
  </section>`).join('\n')

  const coverImg = book.visuals.coverImage
    ? `<img src="${book.visuals.coverImage}" alt="cover" class="cover-image" />`
    : ''

  return `<!DOCTYPE html>
<html lang="${book.metadata.language}">
<head>
<meta charset="UTF-8"/>
<title>${book.idea.title}</title>
<style>
  body { font-family: "SimSun", Georgia, serif; max-width: 700px; margin: 0 auto; padding: 40px 20px; line-height: 1.9; color: #1a1a1a; }
  .cover-image { width: 100%; max-width: 400px; display: block; margin: 0 auto 40px; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,.2); }
  .title-page { text-align: center; padding: 60px 0; border-bottom: 2px solid #eee; margin-bottom: 60px; }
  h1 { font-size: 2.5em; margin-bottom: 0.3em; }
  .author { font-size: 1.2em; color: #666; }
  .synopsis { font-style: italic; color: #444; border-left: 3px solid #ccc; padding-left: 20px; margin: 40px 0; }
  .chapter { margin-top: 80px; }
  h2 { font-size: 1.6em; border-bottom: 1px solid #eee; padding-bottom: 10px; }
  p { text-indent: 2em; margin: 0.8em 0; }
  .empty { color: #999; font-style: italic; text-indent: 0; }
  @media print { .chapter { page-break-before: always; } }
</style>
</head>
<body>
<div class="title-page">
  ${coverImg}
  <h1>${book.idea.title}</h1>
  <p class="author">${book.metadata.author}</p>
  ${book.metadata.dedication ? `<p style="margin-top:2em;font-style:italic">${book.metadata.dedication}</p>` : ''}
</div>
<blockquote class="synopsis">${book.idea.synopsis}</blockquote>
${chapters}
</body>
</html>`
}
