/**
 * RSVP utility functions for text processing and display calculations
 */

/**
 * Parse text into an array of words
 * @param {string} text - The input text to parse
 * @returns {string[]} Array of words
 */
export function parseText(text) {
  if (!text || typeof text !== "string") return [];
  return text.trim().split(/\s+/).filter((w) => w.length > 0);
}

/**
 * Calculate the Optimal Recognition Point (ORP) index for a word.
 * The ORP is the character position where the eye naturally focuses when reading.
 * Based on word length, this determines which letter should be highlighted.
 * Supports all Unicode letters (Latin, Cyrillic, CJK, Arabic, etc.)
 *
 * @param {string} word - The word to calculate ORP for
 * @returns {number} The index of the letter that should be highlighted
 */
export function getORPIndex(word) {
  if (!word || typeof word !== "string") return 0;
  const len = word.replace(/[^\p{L}]/gu, "").length;
  if (len <= 1) return 0;
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 12) return 3;
  return Math.floor(Math.log2(len - 1)) + 1;
}

/**
 * Get the actual character index for ORP, accounting for leading punctuation.
 * This adjusts the ORP index to skip over non-letter characters.
 * Supports all Unicode letters.
 *
 * @param {string} word - The word to calculate actual ORP for
 * @returns {number} The actual character index in the word
 */
// Pre-compiled regex for performance
const unicodeLetterRegex = /\p{L}/u

export function getActualORPIndex(word) {
  if (!word || typeof word !== "string") return 0;

  const orpIndex = getORPIndex(word);
  let letterCount = 0;

  for (let i = 0; i < word.length; i++) {
    if (unicodeLetterRegex.test(word[i])) {
      if (letterCount === orpIndex) return i
      letterCount++
    }
  }

  return Math.min(orpIndex, word.length - 1);
}

/**
 * Calculate the display delay for a word based on WPM and punctuation.
 * Words ending with sentence punctuation get a longer pause.
 *
 * @param {string} word - The word to calculate delay for
 * @param {number} wordsPerMinute - Reading speed in WPM
 * @param {boolean} pauseOnPunctuation - Whether to add extra pause on punctuation
 * @param {number} punctuationMultiplier - Multiplier for sentence-ending punctuation
 * @returns {number} Delay in milliseconds
 */
export function getWordDelay(
  word,
  wordsPerMinute,
  pauseOnPunctuation = true,
  punctuationMultiplier = 2,
  wordLengthWPMMultiplier = 0,
) {
  if (!word || typeof word !== "string") return 60000 / wordsPerMinute;
  if (!wordsPerMinute || wordsPerMinute <= 0) return 200; // Default fallback

  var baseDelay = 60000 / wordsPerMinute;

  // Longer pause for long words (12+ characters is roughly 2 standard deviations above average English word length)
  if (wordLengthWPMMultiplier > 0 && word.length >= 12) {
    // For every character above 12, add wordLengthWPMMultiplier percentage points to delay
    baseDelay *= 1 + ((wordLengthWPMMultiplier / 100) * (word.length - 12));
  }

  if (pauseOnPunctuation) {
    // Longer pause for sentence-ending punctuation
    if (/[.!?;:]$/.test(word)) {
      return baseDelay * punctuationMultiplier;
    }
    // Shorter pause for commas
    if (/[,]$/.test(word)) {
      return baseDelay * 1.5;
    }
  }

  return baseDelay;
}

/**
 * Format remaining reading time as MM:SS
 *
 * @param {number} remainingWords - Number of words remaining
 * @param {number} wordsPerMinute - Reading speed in WPM
 * @returns {string} Formatted time string (e.g., "2:30")
 */
export function formatTimeRemaining(remainingWords, wordsPerMinute) {
  if (remainingWords <= 0 || !wordsPerMinute || wordsPerMinute <= 0) {
    return "0:00";
  }

  const seconds = Math.ceil((remainingWords / wordsPerMinute) * 60);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Split a word into parts for ORP display (before, ORP letter, after)
 *
 * @param {string} word - The word to split
 * @returns {{ before: string, orp: string, after: string }} Word parts
 */
export function splitWordForDisplay(word) {
  if (!word || typeof word !== "string") {
    return { before: "", orp: "", after: "" };
  }

  const orpIndex = getActualORPIndex(word);

  return {
    before: word.slice(0, orpIndex),
    orp: word[orpIndex] || "",
    after: word.slice(orpIndex + 1),
  };
}

/**
 * Check if a word should trigger a pause based on pause-every-N-words setting
 *
 * @param {number} wordIndex - Current word index (0-based)
 * @param {number} pauseAfterWords - Pause after every N words (0 = disabled)
 * @returns {boolean} Whether to pause
 */
export function shouldPauseAtWord(wordIndex, pauseAfterWords) {
  if (pauseAfterWords <= 0) return false;
  if (wordIndex <= 0) return false;
  return wordIndex % pauseAfterWords === 0;
}

/**
 * Extract a subset of words centered on current position
 * @param {string[]} allWords - Complete word array
 * @param {number} centerIdx - Index to center on
 * @param {number} frameSize - Total words to display (odd numbers recommended)
 * @returns {{ subset: string[], centerOffset: number }}
 */
export function extractWordFrame(allWords, centerIdx, frameSize) {
  if (frameSize <= 1 || centerIdx >= allWords.length) {
    return { subset: [allWords[centerIdx] || ""], centerOffset: 0 };
  }

  const radius = Math.floor(frameSize / 2);
  const leftBound = Math.max(0, centerIdx - radius);
  const rightBound = Math.min(allWords.length, centerIdx + radius + 1);

  const subset = allWords.slice(leftBound, rightBound);
  const centerOffset = centerIdx - leftBound;

  return { subset, centerOffset };
}

/**
 * @typedef {Object} WordParagraph
 * @property {string[]} words - Words in this paragraph
 * @property {number} startIndex - Starting word index in the global array
 * @property {number} endIndex - Ending word index in the global array
 * @property {string | null} chapterTitle - Chapter title if this paragraph starts a chapter
 * @property {number} chapterLevel - Chapter nesting level (0 = top level)
 */

/**
 * @typedef {Object} Chapter
 * @property {string} id
 * @property {string} title
 * @property {number} level
 * @property {number} wordStartIndex
 * @property {number} wordEndIndex
 */

/**
 * Group words into paragraphs for virtual list display.
 * This reduces the number of virtual list items from N words to N/size paragraphs.
 *
 * @param {string[]} words - Array of all words
 * @param {number} wordsPerParagraph - Target words per paragraph (default: 50)
 * @returns {WordParagraph[]} Array of paragraph objects
 */
export function groupWordsIntoParagraphs(words, wordsPerParagraph = 50) {
  if (!words || words.length === 0) return [];

  /** @type {WordParagraph[]} */
  const paragraphs = [];

  for (let i = 0; i < words.length; i += wordsPerParagraph) {
    const endIndex = Math.min(i + wordsPerParagraph - 1, words.length - 1);
    paragraphs.push({
      words: words.slice(i, endIndex + 1),
      startIndex: i,
      endIndex,
      chapterTitle: null,
      chapterLevel: 0
    });
  }

  return paragraphs;
}

/**
 * Group words into paragraphs using actual paragraph break positions.
 * Also adds chapter heading information.
 *
 * @param {string[]} words - Array of all words
 * @param {number[]} paragraphBreaks - Word indices where paragraphs start
 * @param {Chapter[]} chapters - Chapter metadata
 * @returns {WordParagraph[]} Array of paragraph objects
 */
export function groupWordsIntoRealParagraphs(words, paragraphBreaks, chapters = []) {
  if (!words || words.length === 0) return [];

  // Default to synthetic paragraphs if no breaks provided
  if (!paragraphBreaks || paragraphBreaks.length === 0) {
    return groupWordsIntoParagraphs(words, 50);
  }

  // Sort chapters by start index for efficient lookup
  const sortedChapters = [...chapters].sort((a, b) => a.wordStartIndex - b.wordStartIndex);

  // Track which chapters have been assigned to avoid duplicates
  const assignedChapters = new Set();

  /** @type {WordParagraph[]} */
  const paragraphs = [];

  // Sort breaks to ensure order
  const sortedBreaks = [...paragraphBreaks].sort((a, b) => a - b);

  for (let i = 0; i < sortedBreaks.length; i++) {
    const startIndex = sortedBreaks[i];
    const endIndex = (i < sortedBreaks.length - 1)
      ? sortedBreaks[i + 1] - 1
      : words.length - 1;

    if (startIndex > endIndex || startIndex >= words.length) continue;

    // Find chapter whose wordStartIndex falls within this paragraph's range
    // This handles cases where chapter start doesn't exactly match paragraph start
    let matchedChapter = null;
    for (const chapter of sortedChapters) {
      if (assignedChapters.has(chapter.id)) continue;

      // Chapter starts within this paragraph's range
      if (chapter.wordStartIndex >= startIndex && chapter.wordStartIndex <= endIndex) {
        matchedChapter = chapter;
        assignedChapters.add(chapter.id);
        break;
      }
    }

    paragraphs.push({
      words: words.slice(startIndex, endIndex + 1),
      startIndex,
      endIndex,
      chapterTitle: matchedChapter?.title || null,
      chapterLevel: matchedChapter?.level || 0
    });
  }

  return paragraphs;
}

/**
 * Find the paragraph index that contains a given word index
 *
 * @param {WordParagraph[]} paragraphs - Array of paragraphs
 * @param {number} wordIndex - Word index to find
 * @returns {number} Paragraph index, or -1 if not found
 */
export function findParagraphForWordIndex(paragraphs, wordIndex) {
  if (!paragraphs || paragraphs.length === 0) return -1;

  for (let i = 0; i < paragraphs.length; i++) {
    if (wordIndex >= paragraphs[i].startIndex && wordIndex <= paragraphs[i].endIndex) {
      return i;
    }
  }

  return -1;
}
