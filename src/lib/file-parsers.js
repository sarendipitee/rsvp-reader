/**
 * File parsing utilities for PDF and EPUB files
 */

/**
 * @typedef {Object} Chapter
 * @property {string} id - Unique identifier
 * @property {string} title - Chapter title from ToC
 * @property {number} level - Nesting depth (0 = top level)
 * @property {number} wordStartIndex - Starting word index in the global words array
 * @property {number} wordEndIndex - Ending word index
 */

/**
 * @typedef {Object} ParsedContent
 * @property {string} text - Full text content
 * @property {Chapter[]} chapters - Chapter metadata (empty for non-ePub)
 * @property {boolean} hasToC - Whether ToC data was available
 * @property {number[]} paragraphBreaks - Word indices where new paragraphs start
 */

/**
 * Parse a PDF file and extract its text content
 * @param {File} file - The PDF file to parse
 * @returns {Promise<string>} The extracted text
 */
export async function parsePDF(file) {
  const pdfjsLib = await import('pdfjs-dist')

  // Set up the worker - use unpkg which mirrors npm directly
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let fullText = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .filter(item => 'str' in item)
      .map(item => /** @type {{ str: string }} */ (item).str)
      .join(' ')
    fullText += pageText + ' '
  }

  // Clean up the text
  return cleanText(fullText)
}

/**
 * Parse an EPUB file and extract its text content with chapter metadata
 * @param {File} file - The EPUB file to parse
 * @returns {Promise<ParsedContent>} The extracted text and chapter metadata
 */
export async function parseEPUB(file) {
  const ePub = (await import('epubjs')).default

  const arrayBuffer = await file.arrayBuffer()
  const book = ePub(arrayBuffer)

  await book.ready
  await book.loaded.spine

  let fullText = ''
  /** @type {Chapter[]} */
  const chapters = []
  /** @type {number[]} */
  const paragraphBreaks = [0] // First word always starts a paragraph
  let currentWordIndex = 0

  // Get spine items - the API varies between versions
  const spineItems = book.spine?.spineItems || book.spine?.items || []

  // Load ToC for chapter titles
  let toc = []
  try {
    await book.loaded.navigation
    toc = book.navigation?.toc || []
  } catch (e) {
    console.warn('Could not load ToC:', e)
  }

  for (const item of spineItems) {
    try {
      // Load the section content using the book's load method
      const href = item.href || item.url
      if (!href) continue

      const contents = await book.load(href)
      if (contents) {
        // Extract text with paragraph structure
        const { text: sectionText, paragraphStarts } = extractTextWithParagraphs(contents)

        // Clean and count words in this section
        const cleanedSectionText = cleanTextPreserveParagraphs(sectionText)
        const sectionWords = cleanedSectionText.split(/\s+/).filter(w => w.length > 0)
        const wordStartIndex = currentWordIndex
        const wordEndIndex = currentWordIndex + sectionWords.length - 1

        // Add paragraph breaks relative to global word index
        for (const localStart of paragraphStarts) {
          if (localStart > 0) { // Skip first one, it's implicit
            paragraphBreaks.push(currentWordIndex + localStart)
          }
        }

        // Find matching ToC entry for this spine item
        const tocEntry = findTocEntry(toc, href)
        if (tocEntry) {
          chapters.push({
            id: item.idref || href,
            title: tocEntry.label?.trim() || `Chapter ${chapters.length + 1}`,
            level: tocEntry.level || 0,
            wordStartIndex,
            wordEndIndex
          })
        }

        currentWordIndex += sectionWords.length
        fullText += cleanedSectionText + ' '
      }
    } catch (e) {
      console.warn('Could not load section:', e)
    }
  }

  return {
    text: fullText.trim(),
    chapters,
    hasToC: chapters.length > 0,
    paragraphBreaks
  }
}

/**
 * Extract text from HTML content while tracking paragraph boundaries
 * @param {Document | string} contents - HTML content
 * @returns {{ text: string, paragraphStarts: number[] }}
 */
function extractTextWithParagraphs(contents) {
  let doc
  if (typeof contents === 'string') {
    doc = new DOMParser().parseFromString(contents, 'text/html')
  } else if (contents.body) {
    doc = contents
  } else if (contents.documentElement) {
    doc = contents
  } else {
    return { text: '', paragraphStarts: [] }
  }

  const body = doc.body || doc.documentElement
  if (!body) return { text: '', paragraphStarts: [] }

  const paragraphStarts = []
  let currentWordCount = 0
  let textParts = []

  // Find all paragraph-like elements
  const blockElements = body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, li, blockquote')

  if (blockElements.length === 0) {
    // Fallback: treat entire content as one paragraph
    return { text: body.textContent || '', paragraphStarts: [0] }
  }

  for (const el of blockElements) {
    // Skip nested block elements (avoid double-counting)
    if (el.querySelector('p, div')) continue

    const text = (el.textContent || '').trim()
    if (!text) continue

    // Mark this as a paragraph start
    paragraphStarts.push(currentWordCount)

    const words = text.split(/\s+/).filter(w => w.length > 0)
    currentWordCount += words.length
    textParts.push(text)
  }

  // If no block elements produced text, fall back to body content
  if (textParts.length === 0) {
    return { text: body.textContent || '', paragraphStarts: [0] }
  }

  return { text: textParts.join(' '), paragraphStarts }
}

/**
 * Clean text while preserving structure (used for paragraph-aware extraction)
 * @param {string} text - Text to clean
 * @returns {string}
 */
function cleanTextPreserveParagraphs(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\1+/g, '$1')
    .trim()
}

/**
 * Find a ToC entry matching a spine item href
 * @param {any[]} toc - Table of contents entries
 * @param {string} href - Spine item href to match
 * @param {number} level - Current nesting level
 * @returns {{ label: string, level: number } | null}
 */
function findTocEntry(toc, href, level = 0) {
  if (!toc || !Array.isArray(toc)) return null

  // Normalize href for comparison (remove anchors)
  const normalizedHref = href.split('#')[0]

  for (const entry of toc) {
    const entryHref = (entry.href || '').split('#')[0]
    if (entryHref === normalizedHref || entryHref.endsWith(normalizedHref) || normalizedHref.endsWith(entryHref)) {
      return { label: entry.label, level }
    }
    // Check nested entries
    if (entry.subitems && entry.subitems.length > 0) {
      const nested = findTocEntry(entry.subitems, href, level + 1)
      if (nested) return nested
    }
  }
  return null
}

/**
 * Clean and normalize extracted text
 * @param {string} text - The raw text to clean
 * @returns {string} Cleaned text
 */
function cleanText(text) {
  return text
    // Replace multiple spaces/newlines with single space
    .replace(/\s+/g, ' ')
    // Remove excessive punctuation
    .replace(/([.!?])\1+/g, '$1')
    // Trim
    .trim()
}

/**
 * Detect file type and parse accordingly
 * @param {File} file - The file to parse
 * @returns {Promise<ParsedContent>} The extracted text and metadata
 */
export async function parseFile(file) {
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith('.pdf')) {
    const text = await parsePDF(file)
    // For PDFs, we don't have paragraph info, so create synthetic breaks every ~100 words
    const words = text.split(/\s+/).filter(w => w.length > 0)
    const paragraphBreaks = []
    for (let i = 0; i < words.length; i += 100) {
      paragraphBreaks.push(i)
    }
    return { text, chapters: [], hasToC: false, paragraphBreaks }
  } else if (fileName.endsWith('.epub')) {
    return parseEPUB(file)
  } else {
    throw new Error(`Unsupported file type: ${fileName}`)
  }
}

/**
 * Get supported file extensions
 * @returns {string} Comma-separated list of supported extensions
 */
export function getSupportedExtensions() {
  return '.pdf,.epub'
}
