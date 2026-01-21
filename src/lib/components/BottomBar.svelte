<script>
  import { createEventDispatcher } from 'svelte';
  import Controls from './Controls.svelte';
  import ProgressBar from './ProgressBar.svelte';

  export let isFocusMode = false;
  export let progress = 0;
  export let currentWordIndex = 0;
  export let wordsLength = 0;
  export let wordsPerMinute = 300;
  export let timeRemaining = "";
  export let isPlaying = false;
  export let isPaused = false;

  const dispatch = createEventDispatcher();

  function handleSeek(event) {
    dispatch('seek', event.detail);
  }

  function adjustWpm(delta) {
    const newWpm = Math.max(50, Math.min(1000, wordsPerMinute + delta));
    dispatch('wpmChange', { wpm: newWpm });
  }

  function skip(delta) {
    const newIndex = Math.max(0, Math.min(wordsLength, currentWordIndex + delta));
    dispatch('skip', { index: newIndex });
  }
</script>

<div class="bottom-bar" class:minimal={isFocusMode}>
  <ProgressBar
    {progress}
    currentWord={currentWordIndex}
    totalWords={wordsLength}
    wpm={wordsPerMinute}
    {timeRemaining}
    minimal={isFocusMode}
    clickable={!isPlaying}
    on:seek={handleSeek}
  />

  <div class="controls-area">
    <Controls
      {isPlaying}
      {isPaused}
      canPlay={wordsLength > 0}
      minimal={isFocusMode}
      on:play
      on:pause
      on:resume
      on:stop
      on:restart
    />
  </div>

  {#if !isFocusMode}
    <div class="shortcuts desktop-only">
      <kbd>Space</kbd> Play
      <kbd>Esc</kbd> Exit
      <kbd>↑↓</kbd> Speed
      <kbd>←→</kbd> Skip
      <kbd>G</kbd> Jump
      <kbd>T</kbd> Panel
      <kbd>Ctrl+S</kbd> Save
    </div>
    <div class="touch-controls mobile-only">
      <button class="touch-btn" on:click={() => skip(-5)} title="Back 5 words">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>
      <button class="touch-btn" on:click={() => adjustWpm(-50)} title="Slower">
        <span>−WPM</span>
      </button>
      <span class="wpm-display">{wordsPerMinute}</span>
      <button class="touch-btn" on:click={() => adjustWpm(50)} title="Faster">
        <span>+WPM</span>
      </button>
      <button class="touch-btn" on:click={() => skip(5)} title="Forward 5 words">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
      </button>
    </div>
  {/if}
</div>

<style>
  .bottom-bar {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-top: 1rem;
    transition: all 0.3s ease;
  }

  .bottom-bar.minimal {
    gap: 0.5rem;
    padding-top: 0.5rem;
  }

  .controls-area {
    display: flex;
    justify-content: center;
  }

  .shortcuts {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    color: #444;
    font-size: 0.8rem;
  }

  kbd {
    background: #1a1a1a;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    font-family: monospace;
    color: #666;
    margin-right: 0.25rem;
  }

  .touch-controls {
    display: none;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
  }

  .touch-btn {
    background: #1a1a1a;
    border: 1px solid #333;
    color: #888;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    cursor: pointer;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .touch-btn:active {
    background: #333;
    color: #fff;
  }

  .touch-btn svg {
    width: 20px;
    height: 20px;
  }

  .wpm-display {
    color: #ff4444;
    font-family: monospace;
    font-size: 0.85rem;
    min-width: 3rem;
    text-align: center;
  }

  .mobile-only {
    display: none;
  }

  .desktop-only {
    display: flex;
  }

  @media (max-width: 600px) {
    .desktop-only {
      display: none;
    }

    .mobile-only {
      display: flex;
    }
  }
</style>
