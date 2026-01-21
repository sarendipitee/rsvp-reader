<script>
  import { createEventDispatcher } from 'svelte';

  export let wordsLength = 0;

  const dispatch = createEventDispatcher();

  let jumpToValue = "";

  function jumpToWord(value) {
    if (!value || wordsLength === 0) return;

    let targetIndex;
    const trimmed = value.trim();

    if (trimmed.endsWith("%")) {
      const percent = parseFloat(trimmed.slice(0, -1));
      if (!isNaN(percent)) {
        targetIndex = Math.floor(
          (Math.max(0, Math.min(100, percent)) / 100) * wordsLength,
        );
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num)) {
        targetIndex = Math.max(0, Math.min(wordsLength, num));
      }
    }

    if (targetIndex !== undefined) {
      dispatch('jump', { index: targetIndex });
    }

    jumpToValue = "";
  }

  function close() {
    jumpToValue = "";
    dispatch('close');
  }
</script>

<div class="panel-overlay" on:click|self={close} role="presentation">
  <div class="jump-to-panel">
    <h3>Jump to position</h3>
    <p class="jump-hint">Enter word number (e.g., 150) or percentage (e.g., 50%)</p>
    <form on:submit|preventDefault={() => jumpToWord(jumpToValue)}>
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="text"
        bind:value={jumpToValue}
        placeholder="Word # or %"
        autofocus
      />
      <div class="jump-actions">
        <button type="button" class="secondary" on:click={close}>Cancel</button>
        <button type="submit" class="primary">Go</button>
      </div>
    </form>
    <div class="quick-jumps">
      <button on:click={() => jumpToWord('0')}>Start</button>
      <button on:click={() => jumpToWord('25%')}>25%</button>
      <button on:click={() => jumpToWord('50%')}>50%</button>
      <button on:click={() => jumpToWord('75%')}>75%</button>
    </div>
  </div>
</div>

<style>
  .panel-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 2rem;
  }

  .jump-to-panel {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 320px;
    width: 100%;
  }

  .jump-to-panel h3 {
    margin: 0 0 0.5rem 0;
    color: #fff;
    font-size: 1.1rem;
  }

  .jump-hint {
    color: #666;
    font-size: 0.85rem;
    margin: 0 0 1rem 0;
  }

  .jump-to-panel input {
    width: 100%;
    padding: 0.75rem;
    background: #111;
    border: 1px solid #333;
    border-radius: 6px;
    color: #fff;
    font-size: 1rem;
    margin-bottom: 1rem;
    box-sizing: border-box;
  }

  .jump-to-panel input:focus {
    outline: none;
    border-color: #ff4444;
  }

  .jump-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .jump-actions button {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .jump-actions button.primary {
    background: #ff4444;
    color: #fff;
  }

  .jump-actions button.primary:hover {
    background: #ff6666;
  }

  .jump-actions button.secondary {
    background: #333;
    color: #fff;
  }

  .jump-actions button.secondary:hover {
    background: #444;
  }

  .quick-jumps {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #333;
  }

  .quick-jumps button {
    flex: 1;
    padding: 0.5rem;
    background: #222;
    border: 1px solid #333;
    border-radius: 4px;
    color: #888;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s;
  }

  .quick-jumps button:hover {
    background: #333;
    color: #fff;
  }

  @media (max-width: 600px) {
    .panel-overlay {
      padding: 1rem;
    }
  }
</style>
