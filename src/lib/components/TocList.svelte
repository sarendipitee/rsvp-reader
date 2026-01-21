<script>
  /**
   * Displays the Table of Contents for ePub files.
   * Highlights the current chapter and supports nested chapters.
   */

  /**
   * @typedef {Object} Chapter
   * @property {string} id
   * @property {string} title
   * @property {number} level
   * @property {number} wordStartIndex
   * @property {number} wordEndIndex
   */

  /** @type {Chapter[]} */
  export let chapters = [];

  /** @type {number} Currently active word index */
  export let currentWordIndex = 0;

  /** @type {((wordIndex: number) => void) | null} Callback when chapter is clicked */
  export let onChapterClick = null;

  /**
   * Determine if a chapter is currently active
   * @param {Chapter} chapter
   * @returns {boolean}
   */
  function isChapterActive(chapter) {
    return currentWordIndex >= chapter.wordStartIndex && currentWordIndex <= chapter.wordEndIndex;
  }

  /**
   * Handle chapter click
   * @param {Chapter} chapter
   */
  function handleChapterClick(chapter) {
    if (onChapterClick) {
      onChapterClick(chapter.wordStartIndex);
    }
  }
</script>

<div class="toc-list">
  <h4 class="toc-header">Table of Contents</h4>
  <nav class="toc-nav">
    {#each chapters as chapter (chapter.id)}
      <button
        class="toc-item"
        class:active={isChapterActive(chapter)}
        style="padding-left: {0.75 + chapter.level * 0.75}rem"
        on:click={() => handleChapterClick(chapter)}
        type="button"
      >
        <span class="chapter-title">{chapter.title}</span>
      </button>
    {/each}
  </nav>
</div>

<style>
  .toc-list {
    display: flex;
    flex-direction: column;
    max-height: 200px;
    overflow: hidden;
  }

  .toc-header {
    margin: 0;
    padding: 0.5rem 0.75rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #555;
    border-bottom: 1px solid #222;
    flex-shrink: 0;
  }

  .toc-nav {
    overflow-y: auto;
    flex: 1;
  }

  .toc-item {
    display: block;
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: none;
    border: none;
    border-bottom: 1px solid #1a1a1a;
    color: #888;
    font-size: 0.8rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }

  .toc-item:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }

  .toc-item:focus {
    outline: none;
    background: rgba(255, 68, 68, 0.1);
  }

  .toc-item.active {
    background: rgba(255, 68, 68, 0.15);
    color: #ff4444;
    border-left: 2px solid #ff4444;
  }

  .chapter-title {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
