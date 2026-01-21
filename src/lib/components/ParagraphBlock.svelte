<script>
/**
 * Renders a paragraph of words with clickable words and current word highlight.
 * Used within VirtualTextList for efficient rendering.
 * Supports chapter headings when a paragraph starts a new chapter.
 */

/**
 * @typedef {Object} ParagraphData
 * @property {string[]} words - Words in this paragraph
 * @property {number} startIndex - Starting word index
 * @property {number} endIndex - Ending word index
 * @property {string | null} [chapterTitle] - Chapter title if this starts a chapter
 * @property {number} [chapterLevel] - Chapter nesting level (0 = top level)
 */

/** @type {ParagraphData} */
export let paragraph = { words: [], startIndex: 0, endIndex: 0 };

/** @type {number} Current word index being read */
export let currentWordIndex = 0;

/** @type {boolean} Whether this paragraph contains the current word */
export let isActive = false;

/** @type {((wordIndex: number) => void) | null} Callback when a word is clicked */
export let onWordClick = null;

/**
 * Handle word click
 * @param {number} wordIndex
 */
function handleWordClick(wordIndex) {
	if (onWordClick) {
		onWordClick(wordIndex);
	}
}
</script>

{#if paragraph.chapterTitle}
  <h3 class="chapter-heading" class:level-1={paragraph.chapterLevel === 1} class:level-2={paragraph.chapterLevel >= 2}>
    {paragraph.chapterTitle}
  </h3>
{/if}
<div class="paragraph" class:active={isActive}>
  {#each paragraph.words as word, i}
    {@const wordIndex = paragraph.startIndex + i}
    <button
      class="word"
      class:current={wordIndex === currentWordIndex}
      on:click={() => handleWordClick(wordIndex)}
      type="button"
    >{word}</button>{' '}
  {/each}
</div>

<style>
  .chapter-heading {
    margin: 0 0 0.5rem 0;
    padding: 0.5rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #ff4444;
    border-bottom: 1px solid #333;
  }

  .chapter-heading.level-1 {
    font-size: 0.95rem;
    color: #cc6666;
  }

  .chapter-heading.level-2 {
    font-size: 0.9rem;
    color: #aa7777;
    font-weight: 500;
  }

  .paragraph {
    padding: 0.5rem;
    line-height: 1.6;
    border-bottom: 1px solid #1a1a1a;
  }

  .paragraph.active {
    background: rgba(255, 68, 68, 0.05);
  }

  .word {
    background: none;
    border: none;
    color: #888;
    font-size: 0.85rem;
    font-family: inherit;
    padding: 0.1rem 0.15rem;
    margin: 0;
    border-radius: 2px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline;
  }

  .word:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .word:focus {
    outline: none;
    background: rgba(255, 68, 68, 0.2);
  }

  .word.current {
    background: #ff4444;
    color: #fff;
    font-weight: 500;
  }
</style>
