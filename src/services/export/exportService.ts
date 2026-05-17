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
      lines.push(chapter.content.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
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
    const text = chapter.content
      ? chapter.content.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
      : '（本章尚未写作）'
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

export async function exportToPDF(book: Book): Promise<Uint8Array> {
  type ElectronPDF = { print: (html: string) => Promise<Buffer> }
  const api = (window as Window & { electronAPI?: { pdf?: ElectronPDF } }).electronAPI
  if (!api?.pdf?.print) {
    throw new Error('PDF 导出仅支持桌面版应用')
  }
  const html = buildPDFHtml(book)
  const data = await api.pdf.print(html)
  return new Uint8Array(data)
}

// kept for legacy callers — remove once fully migrated
export function buildPDFHtml(book: Book): string {
  const coverImg = book.visuals.coverImage
    ? `<img src="${book.visuals.coverImage}" class="cover-img" alt="cover" />`
    : ''

  const toc = book.outline.map((c) =>
    `<li><span class="toc-num">第 ${String(c.number).padStart(2, '0')} 章</span><span class="toc-title">${c.title}</span></li>`
  ).join('\n')

  const chapters = book.outline.map((c) => {
    const paragraphs = c.content
      ? c.content.split(/\n{2,}/).filter(Boolean).map((p) =>
          `<p>${p.replace(/\n/g, '<br/>')}</p>`
        ).join('\n')
      : '<p class="empty">（本章尚未写作）</p>'
    return `
<section class="chapter">
  <h2><span class="ch-num">第 ${String(c.number).padStart(2, '0')} 章</span>${c.title}</h2>
  ${paragraphs}
</section>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="${book.metadata.language ?? 'zh'}">
<head>
<meta charset="UTF-8"/>
<title>${book.idea.title}</title>
<style>
  @page {
    size: A4;
    margin: 25mm 20mm 25mm 25mm;
  }
  @page :first { margin-top: 0; margin-bottom: 0; }

  * { box-sizing: border-box; }

  body {
    font-family: "STSong", "SimSun", "Source Han Serif SC", Georgia, serif;
    font-size: 11pt;
    line-height: 1.85;
    color: #1a1a1a;
    margin: 0;
    padding: 0;
  }

  /* ── Title page ── */
  .title-page {
    page-break-after: always;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    text-align: center;
    padding: 60px 40px;
  }
  .cover-img {
    max-width: 280px;
    max-height: 360px;
    object-fit: cover;
    margin-bottom: 48px;
    box-shadow: 0 12px 40px rgba(0,0,0,.2);
  }
  .book-title {
    font-size: 28pt;
    font-weight: 700;
    letter-spacing: 0.06em;
    margin: 0 0 16px;
    line-height: 1.3;
  }
  .book-author {
    font-size: 14pt;
    color: #555;
    margin: 0 0 32px;
    letter-spacing: 0.12em;
  }
  .book-genre {
    font-size: 9pt;
    color: #999;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    border: 1px solid #ccc;
    padding: 4px 14px;
  }
  .dedication {
    margin-top: 40px;
    font-style: italic;
    color: #666;
    font-size: 10.5pt;
  }

  /* ── Synopsis page ── */
  .synopsis-page {
    page-break-after: always;
    padding: 60px 0;
  }
  .synopsis-page h2 {
    font-size: 13pt;
    font-weight: 700;
    letter-spacing: 0.1em;
    border-bottom: 1px solid #222;
    padding-bottom: 8px;
    margin-bottom: 24px;
  }
  .synopsis-page p {
    font-size: 11pt;
    line-height: 1.9;
    text-indent: 2em;
    color: #333;
  }

  /* ── Table of contents ── */
  .toc-page {
    page-break-after: always;
    padding: 60px 0;
  }
  .toc-page h2 {
    font-size: 13pt;
    font-weight: 700;
    letter-spacing: 0.1em;
    border-bottom: 1px solid #222;
    padding-bottom: 8px;
    margin-bottom: 24px;
  }
  .toc-page ul { list-style: none; margin: 0; padding: 0; }
  .toc-page li {
    display: flex;
    gap: 12px;
    padding: 7px 0;
    border-bottom: 1px dotted #ddd;
    font-size: 10.5pt;
  }
  .toc-num { color: #888; flex-shrink: 0; width: 60px; }
  .toc-title { color: #1a1a1a; }

  /* ── Chapter ── */
  .chapter { page-break-before: always; padding-top: 60px; }
  .chapter:first-of-type { page-break-before: always; }

  .chapter h2 {
    font-size: 16pt;
    font-weight: 700;
    margin: 0 0 32px;
    padding-bottom: 12px;
    border-bottom: 2px solid #1a1a1a;
    line-height: 1.4;
  }
  .ch-num {
    display: block;
    font-size: 9pt;
    font-weight: 400;
    color: #888;
    letter-spacing: 0.15em;
    margin-bottom: 4px;
  }

  .chapter p {
    text-indent: 2em;
    margin: 0 0 0.6em;
    font-size: 11pt;
    line-height: 1.9;
  }
  .chapter p.empty {
    color: #bbb;
    font-style: italic;
    text-indent: 0;
  }

  /* ── Running footer ── */
  @page { @bottom-center { content: counter(page); font-size: 9pt; color: #aaa; } }
</style>
</head>
<body>

<!-- Title page -->
<div class="title-page">
  ${coverImg}
  <h1 class="book-title">${book.idea.title || '未命名书籍'}</h1>
  <p class="book-author">${book.metadata.author || '作者'}</p>
  ${book.idea.genre ? `<span class="book-genre">${book.idea.genre}</span>` : ''}
  ${book.metadata.dedication ? `<p class="dedication">${book.metadata.dedication}</p>` : ''}
</div>

<!-- Synopsis -->
${book.idea.synopsis ? `
<div class="synopsis-page">
  <h2>内容简介</h2>
  <p>${book.idea.synopsis}</p>
</div>` : ''}

<!-- Table of contents -->
${book.outline.length > 0 ? `
<div class="toc-page">
  <h2>目　录</h2>
  <ul>${toc}</ul>
</div>` : ''}

<!-- Chapters -->
${chapters}

</body>
</html>`
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
