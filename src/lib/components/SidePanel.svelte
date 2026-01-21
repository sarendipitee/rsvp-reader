<script>
/**
 * Side panel showing full text content with clickable words for navigation.
 * For ePub files, also shows Table of Contents.
 */
import TocList from "./TocList.svelte";
import VirtualTextList from "./VirtualTextList.svelte";

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

/** @type {Chapter[]} Chapter metadata (ePub only) */
export let chapters = [];

/** @type {boolean} Whether ToC is available */
export let hasToC = false;

/** @type {number[]} Word indices where paragraphs start */
export let paragraphBreaks = [];

/** @type {number} Currently active word index */
export let currentWordIndex = 0;

/** @type {((wordIndex: number) => void) | null} Callback when word is clicked */
export let onWordClick = null;

/** @type {((wordIndex: number) => void) | null} Callback when chapter is clicked */
export let onChapterClick = null;

/** @type {(() => void) | null} Close panel callback */
export let onClose = null;

/** @type {VirtualTextList | null} Reference to virtual list for scrolling */
let virtualListRef = null;

/**
 * Scroll to show a specific word in the text list
 * @param {number} wordIndex
 */
export function scrollToWord(wordIndex) {
	if (virtualListRef) {
		virtualListRef.scrollToWord(wordIndex);
	}
}

/**
 * Handle chapter click - scroll to chapter and notify parent
 * @param {number} wordIndex
 */
function handleChapterClick(wordIndex) {
	if (onChapterClick) {
		onChapterClick(wordIndex);
	}
	// Also scroll the text list to that position
	scrollToWord(wordIndex);
}
</script>

<div class="side-panel">
  <div class="panel-header">
    <h3>Contents</h3>
    <button class="close-btn" on:click={onClose} type="button" title="Close panel (T or Esc)">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>
  </div>

  {#if hasToC && chapters.length > 0}
    <TocList
      {chapters}
      {currentWordIndex}
      onChapterClick={handleChapterClick}
    />
    <div class="divider"></div>
  {/if}

  <VirtualTextList
    {words}
    {chapters}
    {paragraphBreaks}
    {currentWordIndex}
    {onWordClick}
    bind:this={virtualListRef}
  />
</div>

<style>
  .side-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #0a0a0a;
    border-radius: 8px;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    flex-shrink: 0;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 500;
    color: #fff;
  }

  .close-btn {
    background: none;
    border: none;
    color: #555;
    padding: 0.25rem;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .close-btn:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }

  .close-btn svg {
    width: 18px;
    height: 18px;
  }

  .divider {
    height: 2px;
    background: #461c1c;
    flex-shrink: 0;
  }
</style>
