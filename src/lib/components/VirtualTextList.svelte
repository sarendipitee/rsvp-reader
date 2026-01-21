<script>
  /**
   * Virtualized display of all text content with clickable words.
   * Uses dynamic height measurement to avoid scroll jumping.
   * Supports real paragraph breaks and chapter headings.
   */
  import ParagraphBlock from './ParagraphBlock.svelte';
  import { groupWordsIntoRealParagraphs, findParagraphForWordIndex } from '../rsvp-utils.js';
  import { onMount, tick, afterUpdate } from 'svelte';

  /**
   * @typedef {Object} Chapter
   * @property {string} id
   * @property {string} title
   * @property {number} level
   * @property {number} wordStartIndex
   * @property {number} wordEndIndex
   */

  /** @type {string[]} Full words array */
  export let words = [];

  /** @type {Chapter[]} Chapter metadata */
  export let chapters = [];

  /** @type {number[]} Word indices where paragraphs start */
  export let paragraphBreaks = [];

  /** @type {number} Currently active word index */
  export let currentWordIndex = 0;

  /** @type {((wordIndex: number) => void) | null} Callback when word is clicked */
  export let onWordClick = null;

  /** @type {HTMLDivElement | null} */
  let containerRef = null;

  /** @type {HTMLDivElement | null} */
  let itemsRef = null;

  /** @type {number} Estimated height per word (refined over time) */
  const HEIGHT_PER_WORD = 2.5;

  /** @type {number} Base minimum height */
  const MIN_ITEM_HEIGHT = 40;

  /** @type {number} Extra height for chapter headers */
  const CHAPTER_HEADER_HEIGHT = 45;

  /** @type {number} Extra items to render above/below viewport */
  const BUFFER_SIZE = 10;

  /** @type {number} Current scroll position */
  let scrollTop = 0;

  /** @type {number} Container height */
  let containerHeight = 400;

  /** @type {Map<number, number>} Cache of measured heights by paragraph index */
  let measuredHeights = new Map();

  /**
   * @typedef {Object} IndexedParagraph
   * @property {string[]} words - Words in this paragraph
   * @property {number} startIndex - Starting word index
   * @property {number} endIndex - Ending word index
   * @property {number} paragraphIndex - Index of this paragraph in the list
   * @property {string | null} chapterTitle - Chapter title if this starts a chapter
   * @property {number} chapterLevel - Chapter nesting level
   */

  /** @type {IndexedParagraph[]} */
  $: paragraphs = groupWordsIntoRealParagraphs(words, paragraphBreaks, chapters).map((p, i) => ({
    ...p,
    paragraphIndex: i
  }));

  // Reset measured heights when paragraphs change
  $: if (paragraphs) {
    measuredHeights = new Map();
  }

  $: currentParagraphIndex = findParagraphForWordIndex(paragraphs, currentWordIndex);

  /**
   * Estimate height for a paragraph based on word count
   * @param {IndexedParagraph} p
   * @returns {number}
   */
  function estimateHeight(p) {
    // Check cache first
    const cached = measuredHeights.get(p.paragraphIndex);
    if (cached !== undefined) {
      return cached;
    }

    // Estimate based on word count
    const wordBasedHeight = Math.max(MIN_ITEM_HEIGHT, p.words.length * HEIGHT_PER_WORD);
    const chapterExtra = p.chapterTitle ? CHAPTER_HEADER_HEIGHT : 0;
    return wordBasedHeight + chapterExtra;
  }

  /**
   * Get cumulative height up to (but not including) index
   * @param {number} index
   * @returns {number}
   */
  function getCumulativeHeight(index) {
    let total = 0;
    for (let i = 0; i < index && i < paragraphs.length; i++) {
      total += estimateHeight(paragraphs[i]);
    }
    return total;
  }

  $: totalHeight = paragraphs.reduce((sum, p) => sum + estimateHeight(p), 0);

  /**
   * Find the paragraph index at a given scroll position
   * @param {number} scrollPos
   * @returns {number}
   */
  function findIndexAtScroll(scrollPos) {
    let cumulative = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      cumulative += estimateHeight(paragraphs[i]);
      if (cumulative > scrollPos) {
        return i;
      }
    }
    return paragraphs.length - 1;
  }

  // Calculate visible range
  $: startIndex = Math.max(0, findIndexAtScroll(scrollTop) - BUFFER_SIZE);
  $: endIndex = Math.min(paragraphs.length, findIndexAtScroll(scrollTop + containerHeight) + BUFFER_SIZE + 1);

  $: visibleParagraphs = paragraphs.slice(startIndex, endIndex);
  $: offsetY = getCumulativeHeight(startIndex);

  /**
   * Handle scroll event
   * @param {Event} event
   */
  function handleScroll(event) {
    const target = /** @type {HTMLDivElement} */ (event.target);
    scrollTop = target.scrollTop;
  }

  /**
   * Measure rendered items and update cache
   */
  function measureRenderedItems() {
    if (!itemsRef) return;

    const wrappers = itemsRef.querySelectorAll('.paragraph-wrapper');
    wrappers.forEach((wrapper, i) => {
      const paragraphIndex = startIndex + i;
      if (paragraphIndex < paragraphs.length) {
        const height = wrapper.getBoundingClientRect().height;
        if (height > 0) {
          measuredHeights.set(paragraphIndex, height);
        }
      }
    });
  }

  // Measure items after each render
  afterUpdate(() => {
    measureRenderedItems();
  });

  /**
   * Scroll to show a specific word
   * @param {number} wordIndex - Word index to scroll to
   */
  export async function scrollToWord(wordIndex) {
    const paragraphIndex = findParagraphForWordIndex(paragraphs, wordIndex);
    if (paragraphIndex >= 0 && containerRef) {
      const targetScrollTop = getCumulativeHeight(paragraphIndex) - containerHeight / 3;
      containerRef.scrollTop = Math.max(0, targetScrollTop);
      await tick();
    }
  }

  onMount(() => {
    if (containerRef) {
      containerHeight = containerRef.clientHeight;

      // Use ResizeObserver to track container size changes
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          containerHeight = entry.contentRect.height;
        }
      });
      resizeObserver.observe(containerRef);

      return () => resizeObserver.disconnect();
    }
  });
</script>

<div class="virtual-text-list" bind:this={containerRef} on:scroll={handleScroll}>
  {#if paragraphs.length > 0}
    <div class="virtual-content" style="height: {totalHeight}px;">
      <div class="visible-items" style="transform: translateY({offsetY}px);" bind:this={itemsRef}>
        {#each visibleParagraphs as paragraph (paragraph.paragraphIndex)}
          <div class="paragraph-wrapper">
            <ParagraphBlock
              {paragraph}
              {currentWordIndex}
              isActive={paragraph.paragraphIndex === currentParagraphIndex}
              {onWordClick}
            />
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="empty-state">
      <p>No text loaded</p>
    </div>
  {/if}
</div>

<style>
  .virtual-text-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .virtual-content {
    width: 100%;
    position: relative;
  }

  .visible-items {
    width: 100%;
  }

  .paragraph-wrapper {
    padding: 0 0.5rem;
    box-sizing: border-box;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #555;
    font-size: 0.9rem;
  }
</style>
