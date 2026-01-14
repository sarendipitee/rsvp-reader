<script>
  import { getActualORPIndex } from '../rsvp-utils.js';

  export let word = '';
  export let wordGroup = []; 
  export let highlightIndex = 0; 
  export let opacity = 1;
  export let fadeDuration = 150;
  export let fadeEnabled = true;
  export let multiWordEnabled = false;

  $: useMultiMode = multiWordEnabled && wordGroup.length > 0;
  $: orpIdx = !useMultiMode && word ? getActualORPIndex(word) : -1;
  $: wordPrefix = !useMultiMode && word ? word.slice(0, orpIdx) : '';
  $: focusChar = !useMultiMode && word ? (word[orpIdx] || '') : '';
  $: wordSuffix = !useMultiMode && word ? word.slice(orpIdx + 1) : '';
</script>

<div class="rsvp-display">
  {#if !useMultiMode}
    <div class="focus-marker">
      <div class="marker-line top"></div>
      <div class="marker-line bottom"></div>
    </div>
  {/if}

  <div
    class="word-container"
    class:multi-mode={useMultiMode}
    style="opacity: {opacity}; transition: opacity {fadeEnabled ? fadeDuration : 0}ms ease-in-out;"
  >
    {#if useMultiMode}
      <div class="word-group">
        {#each wordGroup as w, idx}
          <span class="group-word" class:highlight={idx === highlightIndex}>
            {w}
          </span>
        {/each}
      </div>
    {:else if word}
      <span class="orp">{focusChar}</span>
      <span class="before-orp">{wordPrefix}</span>
      <span class="after-orp">{wordSuffix}</span>
    {:else}
      <span class="placeholder">Ready</span>
    {/if}
  </div>
</div>

<style>
  .rsvp-display {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    overflow: hidden;
  }

  .focus-marker {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    height: 100%;
    width: 3px;
    pointer-events: none;
    z-index: 10;
  }

  .marker-line {
    position: absolute;
    left: 0;
    width: 100%;
    height: 50px;
  }

  .marker-line.top {
    top: 0;
    background: linear-gradient(to bottom, #ff4444, transparent);
  }

  .marker-line.bottom {
    bottom: 0;
    background: linear-gradient(to top, #ff4444, transparent);
  }

  .word-container {
    position: relative;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', 'Menlo', 'Consolas', monospace;
    font-size: clamp(3rem, 8vw, 6rem);
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    text-rendering: geometricPrecision;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    /* Container needs width for absolute children to position against */
    width: 100%;
    height: 1.2em;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .word-container.multi-mode {
    font-size: clamp(2rem, 6vw, 4rem);
  }

  .word-group {
    display: flex;
    gap: 0.6em;
    align-items: center;
    justify-content: center;
  }

  .group-word {
    color: #777;
    transition: color 0.15s, transform 0.15s;
  }

  .group-word.highlight {
    color: #ff4444;
    font-weight: 700;
    transform: scale(1.05);
    text-shadow: 0 0 25px rgba(255, 68, 68, 0.5);
  }

  .orp {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    color: #ff4444;
    font-weight: 700;
    text-shadow: 0 0 30px rgba(255, 68, 68, 0.6);
    z-index: 2;
  }

  .before-orp {
    position: absolute;
    left: 50%;
    transform: translateX(calc(-100% - 0.5ch));
    color: #fff;
    direction: ltr;
  }

  .after-orp {
    position: absolute;
    left: calc(50% + 0.5ch);
    color: #fff;
    text-align: left;
  }

  .placeholder {
    color: #333;
    font-size: 2rem;
    font-weight: 300;
    font-family: system-ui, sans-serif;
    line-height: 1;
  }

  @media (max-width: 600px) {
    .rsvp-display {
      min-height: 200px;
    }

    .marker-line {
      height: 30px;
    }

    .word-container.multi-mode {
      font-size: clamp(1.5rem, 5vw, 3rem);
    }

    .word-group {
      gap: 0.4em;
    }
  }
</style>
