<script>
  import { createEventDispatcher } from 'svelte';

  /** @type {{ currentWordIndex: number, totalWords: number, savedAt: string } | null} */
  export let sessionInfo = null;

  const dispatch = createEventDispatcher();
</script>

{#if sessionInfo}
  <div class="panel-overlay">
    <div class="saved-session-panel">
      <h3>Resume reading?</h3>
      <p>You have a saved session at word {sessionInfo.currentWordIndex} of {sessionInfo.totalWords}</p>
      <p class="saved-time">Saved {new Date(sessionInfo.savedAt).toLocaleString()}</p>
      <div class="session-actions">
        <button class="secondary" on:click={() => dispatch('clear')}>Start Fresh</button>
        <button class="primary" on:click={() => dispatch('resume')}>Resume</button>
      </div>
    </div>
  </div>
{/if}

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

  .saved-session-panel {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 320px;
    width: 100%;
  }

  .saved-session-panel h3 {
    margin: 0 0 0.5rem 0;
    color: #fff;
    font-size: 1.1rem;
  }

  .saved-session-panel p {
    margin: 0.5rem 0;
    color: #ccc;
  }

  .saved-session-panel .saved-time {
    color: #666;
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }

  .session-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .session-actions button {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .session-actions button.primary {
    background: #ff4444;
    color: #fff;
  }

  .session-actions button.primary:hover {
    background: #ff6666;
  }

  .session-actions button.secondary {
    background: #333;
    color: #fff;
  }

  .session-actions button.secondary:hover {
    background: #444;
  }

  @media (max-width: 600px) {
    .panel-overlay {
      padding: 1rem;
    }
  }
</style>
