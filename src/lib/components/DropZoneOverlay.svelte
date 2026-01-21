<script>
  export let visible = false;
</script>

{#if visible}
  <div class="drop-zone-overlay">
    <div class="drop-zone-content">
      <svg viewBox="0 0 24 24" fill="currentColor" class="drop-icon">
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11 8 15.01z"/>
      </svg>
      <p>Drop PDF or EPUB file here</p>
    </div>
  </div>
{/if}

<style>
  .drop-zone-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    pointer-events: none;
  }

  .drop-zone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 3rem;
    border: 3px dashed #ff4444;
    border-radius: 16px;
    color: #fff;
  }

  .drop-icon {
    width: 64px;
    height: 64px;
    color: #ff4444;
  }

  .drop-zone-content p {
    margin: 0;
    font-size: 1.25rem;
    color: #ccc;
  }
</style>
