import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'
import type { Book } from '@/types/book'

// CJK-compatible serif font from jsDelivr CDN (fontsource pinned version)
Font.register({
  family: 'NotoSerifSC',
  fonts: [
    {
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-sc@5.1.1/files/noto-serif-sc-chinese-simplified-400-normal.woff2',
      fontWeight: 400,
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-sc@5.1.1/files/noto-serif-sc-chinese-simplified-700-normal.woff2',
      fontWeight: 700,
    },
  ],
})

// Disable hyphenation so CJK text isn't broken mid-character
Font.registerHyphenationCallback((word) => [word])

const F = 'NotoSerifSC'

const s = StyleSheet.create({
  page: {
    fontFamily: F,
    fontSize: 10.5,
    lineHeight: 1.85,
    color: '#1a1a1a',
    paddingTop: 72,
    paddingBottom: 72,
    paddingLeft: 85,
    paddingRight: 68,
  },

  // ── Cover page ──
  coverPage: {
    fontFamily: F,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafaf8',
  },
  coverImage: {
    width: 220,
    height: 280,
    objectFit: 'cover',
    marginBottom: 36,
  },
  coverTitle: {
    fontFamily: F,
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 1.4,
  },
  coverAuthor: {
    fontFamily: F,
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 20,
  },
  coverGenre: {
    fontFamily: F,
    fontSize: 8,
    color: '#aaa',
    textAlign: 'center',
    letterSpacing: 3,
    textTransform: 'uppercase',
    borderWidth: 0.5,
    borderColor: '#ccc',
    borderStyle: 'solid',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  coverDedication: {
    fontFamily: F,
    fontSize: 10,
    color: '#777',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 28,
  },

  // ── Section heading ──
  sectionHeading: {
    fontFamily: F,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 2,
    borderBottomWidth: 0.75,
    borderBottomColor: '#1a1a1a',
    borderBottomStyle: 'solid',
    paddingBottom: 6,
    marginBottom: 20,
  },

  // ── Synopsis ──
  synopsisText: {
    fontFamily: F,
    fontSize: 10.5,
    lineHeight: 1.9,
    color: '#333',
    textIndent: 21,
  },

  // ── TOC ──
  tocRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: 6,
    borderBottomWidth: 0.4,
    borderBottomColor: '#ddd',
    borderBottomStyle: 'solid',
  },
  tocNum: {
    fontFamily: F,
    fontSize: 9,
    color: '#888',
    width: 56,
  },
  tocTitle: {
    fontFamily: F,
    fontSize: 10,
    color: '#1a1a1a',
    flex: 1,
  },

  // ── Chapter ──
  chapterNum: {
    fontFamily: F,
    fontSize: 8.5,
    color: '#888',
    letterSpacing: 2,
    marginBottom: 4,
  },
  chapterTitle: {
    fontFamily: F,
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1.4,
    marginBottom: 28,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#1a1a1a',
    borderBottomStyle: 'solid',
  },
  bodyPara: {
    fontFamily: F,
    fontSize: 10.5,
    lineHeight: 1.9,
    textIndent: 21,
    marginBottom: 4,
  },
  emptyChapter: {
    fontFamily: F,
    fontSize: 10,
    color: '#bbb',
    fontStyle: 'italic',
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  footerText: {
    fontFamily: F,
    fontSize: 8.5,
    color: '#aaa',
  },
})

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text
        style={s.footerText}
        render={({ pageNumber, totalPages }) =>
          pageNumber > 1 ? String(pageNumber) : ''
        }
      />
    </View>
  )
}

export function BookPDFDocument({ book }: { book: Book }) {
  const hasCover = Boolean(book.visuals?.coverImage)
  const hasSynopsis = Boolean(book.idea.synopsis)
  const hasChapters = book.outline.length > 0

  return (
    <Document title={book.idea.title} author={book.metadata?.author}>

      {/* Cover page */}
      <Page size="A4" style={[s.page, s.coverPage]}>
        {hasCover && (
          <Image src={book.visuals.coverImage!} style={s.coverImage} />
        )}
        <Text style={s.coverTitle}>{book.idea.title || '未命名书籍'}</Text>
        <Text style={s.coverAuthor}>{book.metadata?.author || '作者'}</Text>
        {book.idea.genre ? (
          <Text style={s.coverGenre}>{book.idea.genre}</Text>
        ) : null}
        {book.metadata?.dedication ? (
          <Text style={s.coverDedication}>{book.metadata.dedication}</Text>
        ) : null}
      </Page>

      {/* Synopsis page */}
      {hasSynopsis && (
        <Page size="A4" style={s.page}>
          <Text style={s.sectionHeading}>内容简介</Text>
          <Text style={s.synopsisText}>{book.idea.synopsis}</Text>
          <Footer />
        </Page>
      )}

      {/* Table of contents */}
      {hasChapters && (
        <Page size="A4" style={s.page}>
          <Text style={s.sectionHeading}>目　录</Text>
          {book.outline.map((c) => (
            <View key={c.id} style={s.tocRow}>
              <Text style={s.tocNum}>第 {String(c.number).padStart(2, '0')} 章</Text>
              <Text style={s.tocTitle}>{c.title}</Text>
            </View>
          ))}
          <Footer />
        </Page>
      )}

      {/* Chapter pages */}
      {book.outline.map((chapter) => {
        const paragraphs = chapter.content
          ? chapter.content.split(/\n{2,}/).filter(Boolean)
          : []

        return (
          <Page key={chapter.id} size="A4" style={s.page}>
            <Text style={s.chapterNum}>
              第 {String(chapter.number).padStart(2, '0')} 章
            </Text>
            <Text style={s.chapterTitle}>{chapter.title}</Text>

            {paragraphs.length > 0 ? (
              paragraphs.map((para, i) => (
                <Text key={i} style={s.bodyPara}>
                  {para.replace(/\n/g, ' ')}
                </Text>
              ))
            ) : (
              <Text style={s.emptyChapter}>（本章尚未写作）</Text>
            )}

            <Footer />
          </Page>
        )
      })}
    </Document>
  )
}
