export type Locale = 'zh' | 'en'

const translations = {
  zh: {
    /* Auth */
    loginSubtitle:       'AI 书籍创作工具',
    tabLogin:            '登录',
    tabRegister:         '注册',
    loginEmail:          '邮箱',
    loginPassword:       '密码',
    loginLoading:        '登录中…',
    registerLoading:     '注册中…',
    errorEmailRequired:  '请输入邮箱',
    errorPasswordRequired: '请输入密码',
    registerNote:        '注册即代表你同意我们仅在设备本地处理你的书籍数据，AI 请求直接发送至你配置的模型服务商。',
    privacyNote:         '你的书籍数据加密存储，仅你本人可见',

    /* Library */
    libraryTitle:        '我的书架',
    libraryAll:          '全部书籍',
    newBook:             '新建书籍',
    searchBooks:         '搜索书籍…',
    noBooksYet:          '书架还是空的',
    noBooksHint:         '点击「新建书籍」开始创作你的第一本书',
    noBooksSearch:       '没有找到相关书籍',
    noBooksSearchHint:   '换个关键词试试',
    logout:              '退出登录',
    syncIdle:            '云端已同步',
    syncSyncing:         '同步中…',
    syncSynced:          '已同步',
    syncError:           '同步失败',
    deleteConfirmTitle:  '删除书籍',
    deleteConfirmBody:   '删除后无法恢复，云端数据也会同步删除。确定继续吗？',
    deleteConfirmOk:     '删除',
    cancel:              '取消',
    backToLibrary:       '书架',

    /* Shell */
    untitledBook:        '未命名书籍',
    confirmNew:          '当前书籍未保存，确定新建？',
    tooltipCollapse:     '收起侧栏',
    tooltipExpand:       '展开侧栏',
    tooltipNew:          '新建',
    tooltipOpen:         '打开',
    tooltipSave:         '保存',
    tooltipSettings:     '设置',

    /* Sidebar */
    overview:            '总览',
    noChaptersYet:       '暂无章节',
    askAIOutline:        '让 AI 生成大纲',
    chapterCount:        (w: number, t: number) => `${w} / ${t} 章`,
    wordCount:           (n: number) => `${n.toLocaleString()} 字`,
    wordCountDash:       '—',

    /* Canvas — empty */
    startWriting:        '开始创作你的书',
    startWritingDesc:    '在下方描述你的书籍创意，\nAI Agent 会自动完成大纲、章节、封面。',
    examplePrompts: [
      '写一部关于 AI 意识的科幻小说',
      '创作一本关于极简主义的商业书籍',
      '写一本关于深度工作的自我提升书',
    ],

    /* Canvas — overview */
    noCoverYet:          '暂无封面',
    contents:            '目录',
    wordCountInline:     (n: number) => `${n.toLocaleString()} 字`,

    /* Canvas — chapter */
    chapterPrefix:       (n: number) => `第 ${String(n).padStart(2, '0')} 章`,
    writing:             '写作中',
    chapterPlaceholder:  (n: number, title: string) =>
      `第 ${n} 章 — ${title}\n\n告诉 AI 写这章，或直接在此开始创作…`,

    /* Status labels */
    statusPending:       '待写',
    statusWriting:       '写作中',
    statusDraft:         '草稿',
    statusRevised:       '已完善',

    /* Agent panel */
    agentLabel:          'Agent',
    thinking:            '思考中…',
    thinkingProcess:     '思考过程',
    interrupted:         '已中断',
    stop:                '停止',
    send:                '发送',
    agentPlaceholder:    '输入任意指令——写作、编辑、大纲、导出…（Enter 发送）',
    quickPrompts: [
      { label: '展开创意',   prompt: '把这个想法扩展成完整的书籍设定' },
      { label: '生成大纲',   prompt: '根据当前书籍信息生成完整章节大纲' },
      { label: '写当前章节', prompt: '帮我写当前激活的章节' },
      { label: '写全部章节', prompt: '按顺序把所有章节都写完' },
      { label: '润色章节',   prompt: '润色当前章节，提升语言质量' },
      { label: '生成封面',   prompt: '为这本书生成封面图片' },
      { label: '导出 Word',  prompt: '把书籍导出为 Word 文档' },
      { label: '导出 PDF',   prompt: '把书籍导出为 PDF 文件' },
    ],

    /* Settings panel */
    settingsTitle:       '设置',
    sectionAI:           'AI 提供商',
    sectionEditor:       '编辑器',
    sectionLanguage:     '语言',
    fieldProvider:       '提供商',
    fieldModel:          '模型',
    fieldOllamaModel:    'Ollama 模型名',
    fieldApiKey:         (p: string) =>
      p === 'anthropic' ? 'Anthropic API Key'
      : p === 'openai'  ? 'OpenAI API Key'
      : 'Ollama 地址',
    fieldImageGen:       '图片生成',
    fieldImageApiKey:    '图片 API Key（OpenAI）',
    fieldTemperature:    (v: number) => `温度  ${v.toFixed(2)}`,
    fieldMaxTokens:      '最大 Token',
    fieldProviderCustom: '自定义（OpenAI 兼容）',
    fieldPresets:        '快速选择',
    fieldBaseUrl:        'Base URL',
    fieldBaseUrlToggle:  '自定义 Base URL',
    fieldFont:           '字体',
    fieldFontSize:       (v: number) => `字号  ${v}px`,
    fontSerif:           '衬线',
    fontSans:            '无衬线',
    fontMono:            '等宽',
    langZh:              '中文',
    langEn:              'English',
  },

  en: {
    /* Auth */
    loginSubtitle:       'AI Book Creation Studio',
    tabLogin:            'Sign in',
    tabRegister:         'Sign up',
    loginEmail:          'Email',
    loginPassword:       'Password',
    loginLoading:        'Signing in…',
    registerLoading:     'Creating account…',
    errorEmailRequired:  'Please enter your email',
    errorPasswordRequired: 'Please enter your password',
    registerNote:        'By signing up you agree that your book data is processed locally on your device. AI requests go directly to your configured model provider.',
    privacyNote:         'Your books are encrypted and only visible to you',

    /* Library */
    libraryTitle:        'My Library',
    libraryAll:          'All Books',
    newBook:             'New Book',
    searchBooks:         'Search books…',
    noBooksYet:          'Your library is empty',
    noBooksHint:         'Click "New Book" to start writing your first book',
    noBooksSearch:       'No books found',
    noBooksSearchHint:   'Try a different search term',
    logout:              'Sign out',
    syncIdle:            'Synced',
    syncSyncing:         'Syncing…',
    syncSynced:          'Synced',
    syncError:           'Sync failed',
    deleteConfirmTitle:  'Delete Book',
    deleteConfirmBody:   'This cannot be undone. The book will also be deleted from the cloud.',
    deleteConfirmOk:     'Delete',
    cancel:              'Cancel',
    backToLibrary:       'Library',

    /* Shell */
    untitledBook:        'Untitled',
    confirmNew:          'This book has unsaved changes. Start a new one?',
    tooltipCollapse:     'Collapse sidebar',
    tooltipExpand:       'Expand sidebar',
    tooltipNew:          'New',
    tooltipOpen:         'Open',
    tooltipSave:         'Save',
    tooltipSettings:     'Settings',

    /* Sidebar */
    overview:            'Overview',
    noChaptersYet:       'No chapters yet.',
    askAIOutline:        'Ask AI to generate an outline.',
    chapterCount:        (w: number, t: number) => `${w} / ${t} chapters`,
    wordCount:           (n: number) => `${n.toLocaleString()} words`,
    wordCountDash:       '—',

    /* Canvas — empty */
    startWriting:        'Start writing your book',
    startWritingDesc:    'Describe your idea below.\nThe AI agent will handle outline, chapters, and cover.',
    examplePrompts: [
      'Write a sci-fi novel about AI consciousness',
      'Create a business book about minimalism',
      'Write a self-help book about deep work',
    ],

    /* Canvas — overview */
    noCoverYet:          'No cover yet',
    contents:            'Contents',
    wordCountInline:     (n: number) => `${n.toLocaleString()} words`,

    /* Canvas — chapter */
    chapterPrefix:       (n: number) => `Ch. ${String(n).padStart(2, '0')}`,
    writing:             'Writing',
    chapterPlaceholder:  (n: number, title: string) =>
      `Chapter ${n} — ${title}\n\nTell the AI to write this chapter, or start writing here...`,

    /* Status labels */
    statusPending:       'Pending',
    statusWriting:       'Writing',
    statusDraft:         'Draft',
    statusRevised:       'Revised',

    /* Agent panel */
    agentLabel:          'Agent',
    thinking:            'Thinking...',
    thinkingProcess:     'Thinking process',
    interrupted:         'Interrupted',
    stop:                'Stop',
    send:                'Send',
    agentPlaceholder:    'Ask the AI agent anything — write, edit, outline, export...  (Enter to send)',
    quickPrompts: [
      { label: 'Expand idea',      prompt: 'Expand this idea into a full book concept' },
      { label: 'Generate outline', prompt: 'Generate a complete chapter outline for this book' },
      { label: 'Write chapter',    prompt: 'Write the currently active chapter' },
      { label: 'Write all',        prompt: 'Write all chapters in order' },
      { label: 'Polish',           prompt: 'Polish the current chapter to improve language quality' },
      { label: 'Generate cover',   prompt: 'Generate a cover image for this book' },
      { label: 'Export Word',      prompt: 'Export the book as a Word document' },
      { label: 'Export PDF',       prompt: 'Export the book as a PDF file' },
    ],

    /* Settings panel */
    settingsTitle:       'Settings',
    sectionAI:           'AI Provider',
    sectionEditor:       'Editor',
    sectionLanguage:     'Language',
    fieldProvider:       'Provider',
    fieldModel:          'Model',
    fieldOllamaModel:    'Ollama model name',
    fieldApiKey:         (p: string) =>
      p === 'anthropic' ? 'Anthropic API Key'
      : p === 'openai'  ? 'OpenAI API Key'
      : 'Ollama Host',
    fieldImageGen:       'Image generation',
    fieldImageApiKey:    'Image API Key (OpenAI)',
    fieldTemperature:    (v: number) => `Temperature  ${v.toFixed(2)}`,
    fieldMaxTokens:      'Max tokens',
    fieldProviderCustom: 'Custom (OpenAI-compatible)',
    fieldPresets:        'Quick presets',
    fieldBaseUrl:        'Base URL',
    fieldBaseUrlToggle:  'Use custom Base URL',
    fieldFont:           'Font',
    fieldFontSize:       (v: number) => `Font size  ${v}px`,
    fontSerif:           'Serif',
    fontSans:            'Sans',
    fontMono:            'Mono',
    langZh:              '中文',
    langEn:              'English',
  },
} as const

export type TranslationKey = keyof typeof translations.zh

export function getT(locale: Locale) {
  return translations[locale]
}
