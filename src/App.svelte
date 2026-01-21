<script>
import { onDestroy, onMount } from "svelte";
import BottomBar from "./lib/components/BottomBar.svelte";
import DropZoneOverlay from "./lib/components/DropZoneOverlay.svelte";
import Header from "./lib/components/Header.svelte";
import JumpToPanel from "./lib/components/JumpToPanel.svelte";
import RSVPDisplay from "./lib/components/RSVPDisplay.svelte";
import SavedSessionPrompt from "./lib/components/SavedSessionPrompt.svelte";
import Settings from "./lib/components/Settings.svelte";
import SidePanel from "./lib/components/SidePanel.svelte";
import TextInput from "./lib/components/TextInput.svelte";
import { getSupportedExtensions, parseFile } from "./lib/file-parsers.js";
import {
	clearSession,
	getSessionSummary,
	hasSession,
	loadSession,
	saveSession,
} from "./lib/progress-storage.js";
import {
	extractWordFrame,
	formatTimeRemaining,
	getWordDelay as getWordDelayUtil,
	parseText as parseTextUtil,
	shouldPauseAtWord,
} from "./lib/rsvp-utils.js";

// State
let frameWordCount = 1;
let text = `Rapid serial visual presentation (RSVP) is a scientific method for studying the timing of vision. In RSVP, a sequence of stimuli is shown to an observer at one location in their visual field. This technique has been adapted for speed reading applications, where words are displayed one at a time at a fixed point, eliminating the need for eye movements and potentially increasing reading speed significantly.`;
let words = [];
let currentWordIndex = 0;
let isPlaying = false;
let isPaused = false;
let showSettings = false;
let showTextInput = false;
let progress = 0;
let isLoadingFile = false;
let loadingMessage = "";
let showJumpTo = false;
let savedSessionInfo = null;
let showSavedSessionPrompt = false;

// Drag and drop state
let isDraggingOver = false;
let dragCounter = 0;

// Side panel state
let showSidePanel = false;
/** @type {import('./lib/file-parsers.js').Chapter[]} */
let chapters = [];
let hasToC = false;
/** @type {number[]} */
let paragraphBreaks = [];
/** @type {SidePanel | null} */
let sidePanelRef = null;

// Settings
let wordsPerMinute = 300;
let fadeEnabled = true;
let fadeDuration = 150;
let pauseAfterWords = 0;
let pauseDuration = 500;
let pauseOnPunctuation = true;
let punctuationPauseMultiplier = 2;
let wordLengthWPMMultiplier = 5;

// Animation
let wordOpacity = 1;
let intervalId = null;
let fadeTimeoutId = null;

// Derived state
$: currentWord =
	words[currentWordIndex - 1] || (words.length > 0 ? words[0] : "");
$: wordFrame = extractWordFrame(
	words,
	Math.max(0, currentWordIndex - 1),
	frameWordCount,
);
$: timeRemaining = formatTimeRemaining(
	words.length - currentWordIndex,
	wordsPerMinute,
);
$: isFocusMode = isPlaying || isPaused;

function parseText() {
	words = parseTextUtil(text);
	currentWordIndex = 0;
	progress = 0;
}

function getWordDelay(word) {
	return getWordDelayUtil(
		word,
		wordsPerMinute,
		pauseOnPunctuation,
		punctuationPauseMultiplier,
		wordLengthWPMMultiplier,
	);
}

function showNextWord() {
	if (currentWordIndex >= words.length) {
		stop();
		return;
	}

	if (shouldPauseAtWord(currentWordIndex, pauseAfterWords)) {
		isPaused = true;
		setTimeout(() => {
			if (isPlaying) {
				isPaused = false;
				scheduleNextWord();
			}
		}, pauseDuration);
		return;
	}

	if (fadeEnabled) {
		wordOpacity = 0;
		fadeTimeoutId = setTimeout(() => {
			wordOpacity = 1;
		}, 10);
	}

	progress = ((currentWordIndex + 1) / words.length) * 100;
	currentWordIndex++;
	scheduleNextWord();
}

function scheduleNextWord() {
	if (!isPlaying || currentWordIndex >= words.length) return;
	const word = words[currentWordIndex - 1] || "";
	intervalId = setTimeout(showNextWord, getWordDelay(word));
}

function start() {
	if (words.length === 0) parseText();
	if (words.length === 0) return;
	isPlaying = true;
	isPaused = false;
	showSettings = false;
	showTextInput = false;
	showSidePanel = false;
	showNextWord();
}

function pause() {
	isPlaying = false;
	isPaused = true;
	if (intervalId) {
		clearTimeout(intervalId);
		intervalId = null;
	}
}

function resume() {
	if (currentWordIndex < words.length) {
		isPlaying = true;
		isPaused = false;
		scheduleNextWord();
	}
}

function stop() {
	isPlaying = false;
	isPaused = false;
	currentWordIndex = 0;
	progress = 0;
	wordOpacity = 1;
	if (intervalId) {
		clearTimeout(intervalId);
		intervalId = null;
	}
}

function restart() {
	stop();
	start();
}

function handleTextApply(event) {
	text = event.detail.text;
	stop();
	parseText();
	showTextInput = false;
}

async function handleFileSelect(event) {
	const file = event.detail.file;
	if (!file) return;

	isLoadingFile = true;
	loadingMessage = `Loading ${file.name}...`;

	try {
		const result = await parseFile(file);
		text = result.text;
		chapters = result.chapters;
		hasToC = result.hasToC;
		paragraphBreaks = result.paragraphBreaks || [];
		stop();
		parseText();
		showTextInput = false;
		loadingMessage = "";
	} catch (error) {
		console.error("Error parsing file:", error);
		loadingMessage = `Error: ${error.message}`;
		setTimeout(() => {
			loadingMessage = "";
		}, 3000);
	} finally {
		isLoadingFile = false;
	}
}

function isValidFileType(file) {
	const extensions = getSupportedExtensions().split(",");
	const fileName = file.name.toLowerCase();
	return extensions.some((ext) => fileName.endsWith(ext));
}

function handleDragEnter(event) {
	event.preventDefault();
	dragCounter++;
	if (event.dataTransfer?.types.includes("Files")) {
		isDraggingOver = true;
	}
}

function handleDragLeave(event) {
	event.preventDefault();
	dragCounter--;
	if (dragCounter === 0) {
		isDraggingOver = false;
	}
}

function handleDragOver(event) {
	event.preventDefault();
	if (event.dataTransfer) {
		event.dataTransfer.dropEffect = "copy";
	}
}

async function handleDrop(event) {
	event.preventDefault();
	dragCounter = 0;
	isDraggingOver = false;

	const files = event.dataTransfer?.files;
	if (!files || files.length === 0) return;

	const file = files[0];
	if (!isValidFileType(file)) {
		loadingMessage = `Unsupported file type. Please use ${getSupportedExtensions()}`;
		setTimeout(() => {
			loadingMessage = "";
		}, 3000);
		return;
	}

	await handleFileSelect({ detail: { file } });
}

function saveCurrentSession() {
	if (words.length === 0) return false;
	return saveSession({
		text,
		currentWordIndex,
		totalWords: words.length,
		settings: {
			wordsPerMinute,
			fadeEnabled,
			fadeDuration,
			pauseOnPunctuation,
			punctuationPauseMultiplier,
			wordLengthWPMMultiplier,
			pauseAfterWords,
			pauseDuration,
			frameWordCount,
		},
	});
}

function loadSavedSession() {
	const session = loadSession();
	if (!session) return false;

	text = session.text;
	parseText();
	currentWordIndex = session.currentWordIndex;
	progress = (currentWordIndex / words.length) * 100;

	if (session.settings) {
		wordsPerMinute = session.settings.wordsPerMinute ?? wordsPerMinute;
		fadeEnabled = session.settings.fadeEnabled ?? fadeEnabled;
		fadeDuration = session.settings.fadeDuration ?? fadeDuration;
		pauseOnPunctuation =
			session.settings.pauseOnPunctuation ?? pauseOnPunctuation;
		punctuationPauseMultiplier =
			session.settings.punctuationPauseMultiplier ?? punctuationPauseMultiplier;
		wordLengthWPMMultiplier =
			session.settings.wordLengthWPMMultiplier ?? wordLengthWPMMultiplier;
		pauseAfterWords = session.settings.pauseAfterWords ?? pauseAfterWords;
		pauseDuration = session.settings.pauseDuration ?? pauseDuration;
		frameWordCount = session.settings.frameWordCount ?? frameWordCount;
	}

	showSavedSessionPrompt = false;
	return true;
}

function clearSavedSession() {
	clearSession();
	showSavedSessionPrompt = false;
	savedSessionInfo = null;
}

function handleJump(event) {
	const targetIndex = event.detail.index;
	currentWordIndex = targetIndex;
	progress = (currentWordIndex / words.length) * 100;
	showJumpTo = false;
}

function handleProgressClick(event) {
	const percentage = event.detail.percentage;
	const targetIndex = Math.floor((percentage / 100) * words.length);
	currentWordIndex = Math.max(0, Math.min(words.length, targetIndex));
	progress = (currentWordIndex / words.length) * 100;
}

function handleSidePanelWordClick(wordIndex) {
	currentWordIndex = wordIndex + 1;
	progress = (currentWordIndex / words.length) * 100;
}

function handleChapterClick(wordIndex) {
	currentWordIndex = wordIndex;
	progress = (currentWordIndex / words.length) * 100;
}

function toggleSidePanel() {
	showSidePanel = !showSidePanel;
	showSettings = false;
	showTextInput = false;
	showJumpTo = false;
}

function handleWpmChange(event) {
	wordsPerMinute = event.detail.wpm;
}

function handleSkip(event) {
	currentWordIndex = event.detail.index;
	progress = (currentWordIndex / words.length) * 100;
}

function handleKeydown(e) {
	if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;

	switch (e.code) {
		case "Space":
			e.preventDefault();
			if (isPlaying) pause();
			else if (isPaused) resume();
			else start();
			break;
		case "Escape":
			if (showJumpTo) {
				showJumpTo = false;
			} else if (showSidePanel) {
				showSidePanel = false;
			} else if (showSettings || showTextInput) {
				showSettings = false;
				showTextInput = false;
			} else if (showSavedSessionPrompt) {
				showSavedSessionPrompt = false;
			} else if (isPlaying || isPaused) {
				isPlaying = false;
				isPaused = false;
				if (intervalId) {
					clearTimeout(intervalId);
					intervalId = null;
				}
			}
			break;
		case "KeyG":
			if (!isPlaying && !showSettings && !showTextInput) {
				e.preventDefault();
				showJumpTo = !showJumpTo;
			}
			break;
		case "KeyT":
			if (!isPlaying && !showSettings && !showTextInput && !showJumpTo) {
				e.preventDefault();
				toggleSidePanel();
			}
			break;
		case "KeyS":
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();
				saveCurrentSession();
			}
			break;
		case "ArrowUp":
			e.preventDefault();
			wordsPerMinute = Math.min(1000, wordsPerMinute + 25);
			break;
		case "ArrowDown":
			e.preventDefault();
			wordsPerMinute = Math.max(50, wordsPerMinute - 25);
			break;
		case "ArrowLeft":
			e.preventDefault();
			if (currentWordIndex > 1) {
				currentWordIndex = Math.max(0, currentWordIndex - 2);
				progress = (currentWordIndex / words.length) * 100;
			}
			break;
		case "ArrowRight":
			e.preventDefault();
			if (currentWordIndex < words.length) {
				progress = ((currentWordIndex + 1) / words.length) * 100;
				currentWordIndex++;
			}
			break;
	}
}

onMount(() => {
	parseText();
	window.addEventListener("keydown", handleKeydown);

	if (hasSession()) {
		savedSessionInfo = getSessionSummary();
		if (savedSessionInfo) {
			showSavedSessionPrompt = true;
		}
	}
});

onDestroy(() => {
	if (intervalId) clearTimeout(intervalId);
	if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
	window.removeEventListener("keydown", handleKeydown);
});
</script>

<main
  class:focus-mode={isFocusMode}
  on:dragenter={handleDragEnter}
  on:dragleave={handleDragLeave}
  on:dragover={handleDragOver}
  on:drop={handleDrop}
>
  <DropZoneOverlay visible={isDraggingOver} />

  {#if !isFocusMode}
    <Header
      {showSidePanel}
      {showJumpTo}
      {showSettings}
      {showTextInput}
      wordsLength={words.length}
      on:toggleSidePanel={toggleSidePanel}
      on:toggleJumpTo={() => { showJumpTo = !showJumpTo; showSettings = false; showTextInput = false; showSidePanel = false; }}
      on:toggleSettings={() => { showSettings = !showSettings; showTextInput = false; showJumpTo = false; showSidePanel = false; }}
      on:toggleTextInput={() => { showTextInput = !showTextInput; showSettings = false; showJumpTo = false; showSidePanel = false; }}
      on:save={saveCurrentSession}
    />
  {/if}

  {#if showTextInput && !isFocusMode}
    <div class="panel-overlay">
      <TextInput
        {text}
        isLoading={isLoadingFile}
        {loadingMessage}
        on:apply={handleTextApply}
        on:fileselect={handleFileSelect}
        on:close={() => showTextInput = false}
      />
    </div>
  {/if}

  {#if showSettings && !isFocusMode}
    <div class="panel-overlay">
      <Settings
        bind:wordsPerMinute
        bind:fadeEnabled
        bind:fadeDuration
        bind:pauseOnPunctuation
        bind:punctuationPauseMultiplier
        bind:wordLengthWPMMultiplier
        bind:pauseAfterWords
        bind:pauseDuration
        bind:frameWordCount
        on:close={() => showSettings = false}
      />
    </div>
  {/if}

  {#if showJumpTo && !isFocusMode}
    <JumpToPanel
      wordsLength={words.length}
      on:jump={handleJump}
      on:close={() => showJumpTo = false}
    />
  {/if}

  {#if showSavedSessionPrompt && savedSessionInfo}
    <SavedSessionPrompt
      sessionInfo={savedSessionInfo}
      on:resume={loadSavedSession}
      on:clear={clearSavedSession}
    />
  {/if}

  <div class="content-area">
    {#if showSidePanel && !isFocusMode}
      <div class="side-panel-container">
        <SidePanel
          {words}
          {chapters}
          {hasToC}
          {paragraphBreaks}
          currentWordIndex={currentWordIndex - 1}
          onWordClick={handleSidePanelWordClick}
          onChapterClick={handleChapterClick}
          onClose={() => showSidePanel = false}
          bind:this={sidePanelRef}
        />
      </div>
    {/if}

    <div class="display-area">
      <RSVPDisplay
        word={currentWord}
        wordGroup={wordFrame.subset}
        highlightIndex={wordFrame.centerOffset}
        opacity={wordOpacity}
        {fadeDuration}
        {fadeEnabled}
        multiWordEnabled={frameWordCount > 1}
      />
    </div>

    {#if showSidePanel && !isFocusMode}
      <div class="mobile-bottom-sheet">
        <div class="bottom-sheet-handle"></div>
        <SidePanel
          {words}
          {chapters}
          {hasToC}
          {paragraphBreaks}
          currentWordIndex={currentWordIndex - 1}
          onWordClick={handleSidePanelWordClick}
          onChapterClick={handleChapterClick}
          onClose={() => showSidePanel = false}
        />
      </div>
    {/if}
  </div>

  <BottomBar
    {isFocusMode}
    {progress}
    {currentWordIndex}
    wordsLength={words.length}
    {wordsPerMinute}
    {timeRemaining}
    {isPlaying}
    {isPaused}
    on:seek={handleProgressClick}
    on:play={start}
    on:pause={pause}
    on:resume={resume}
    on:stop={stop}
    on:restart={restart}
    on:wpmChange={handleWpmChange}
    on:skip={handleSkip}
  />
</main>

<style>
  :global(body) {
    background-color: #000 !important;
    margin: 0;
    padding: 0;
    overflow: hidden;
    position: fixed;
    width: 100%;
    height: 100%;
  }

  main {
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    background-color: #000;
    color: #fff;
    font-family: 'Segoe UI', system-ui, sans-serif;
    padding: 2rem;
    box-sizing: border-box;
    transition: padding 0.3s ease;
    overflow: hidden;
  }

  main.focus-mode {
    padding: 1rem;
  }

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

  .content-area {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  .display-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    overflow: hidden;
  }

  .side-panel-container {
    width: 300px;
    min-width: 200px;
    max-width: 50%;
    height: 100%;
    resize: horizontal;
    overflow: hidden;
    flex-shrink: 0;
  }

  .mobile-bottom-sheet {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60%;
    background: #0a0a0a;
    border-top: 1px solid #333;
    border-radius: 16px 16px 0 0;
    z-index: 50;
    flex-direction: column;
  }

  .bottom-sheet-handle {
    width: 40px;
    height: 4px;
    background: #444;
    border-radius: 2px;
    margin: 8px auto;
    flex-shrink: 0;
  }

  @media (max-width: 600px) {
    main {
      padding: 1rem;
    }

    main.focus-mode {
      padding: 0.5rem;
    }

    .panel-overlay {
      padding: 1rem;
    }

    .side-panel-container {
      display: none;
    }

    .mobile-bottom-sheet {
      display: flex;
    }
  }
</style>
