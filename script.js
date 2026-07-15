const titleElement = document.getElementById("title");
const subtitleElement = document.getElementById("subtitle");
const hoursElement = document.getElementById("hours");
const minutesElement = document.getElementById("minutes");
const secondsElement = document.getElementById("seconds");
const statusTextElement = document.getElementById("statusText");
const progressBarElement = document.getElementById("progressBar");
const timerShellElement = document.querySelector(".timer-shell");
const timerElement = document.getElementById("timer");
const setupForm = document.getElementById("setupForm");
const durationMinutesInput = document.getElementById("durationMinutesInput");
const durationSecondsInput = document.getElementById("durationSecondsInput");
const presetButtons = document.querySelectorAll(".preset-button");
const titleInput = document.getElementById("titleInput");
const subtitleInput = document.getElementById("subtitleInput");
const pauseButton = document.getElementById("pauseButton");
const restartButton = document.getElementById("restartButton");
const testBeepButton = document.getElementById("testBeepButton");
const finishedMessageTemplate = document.getElementById("finishedMessageTemplate");
const defaultConfiguration = {
  durationSeconds: 45 * 60,
  title: "Finish Your Assignment",
  subtitle: "Use the remaining time to complete and submit your work.",
};

let totalDurationMs = 45 * 60 * 1000;
let endTime = Date.now() + totalDurationMs;
let intervalId = null;
let isPaused = false;
let pausedRemainingMs = 0;
let finishedMessageMounted = false;
let audioContext = null;
let audioUnlocked = false;
let finishBeepIntervalId = null;
let finishBeepTimeoutId = null;

function formatUnit(value) {
  return String(value).padStart(2, "0");
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    audioContext = new AudioContextClass();
  }

  return audioContext;
}

function unlockAudio() {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    context.resume();
  }

  audioUnlocked = context.state === "running";
}

function playFinishBeeps() {
  const context = ensureAudioContext();
  if (!context || !audioUnlocked) {
    return;
  }

  const startAt = context.currentTime + 0.05;
  const beepDuration = 0.18;
  const gapDuration = 0.12;

  for (let index = 0; index < 3; index += 1) {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const beepStart = startAt + index * (beepDuration + gapDuration);
    const beepEnd = beepStart + beepDuration;

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(880, beepStart);

    gainNode.gain.setValueAtTime(0.0001, beepStart);
    gainNode.gain.exponentialRampToValueAtTime(0.18, beepStart + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, beepEnd);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(beepStart);
    oscillator.stop(beepEnd);
  }
}

function stopFinishBeeps() {
  clearInterval(finishBeepIntervalId);
  clearTimeout(finishBeepTimeoutId);
  finishBeepIntervalId = null;
  finishBeepTimeoutId = null;
}

function startFinishBeeps() {
  stopFinishBeeps();
  playFinishBeeps();
  finishBeepIntervalId = window.setInterval(playFinishBeeps, 10000);
  finishBeepTimeoutId = window.setTimeout(stopFinishBeeps, 2 * 60 * 1000);
}

function getCookie(name) {
  const cookiePrefix = `${name}=`;
  const cookies = document.cookie ? document.cookie.split("; ") : [];

  for (const cookie of cookies) {
    if (cookie.startsWith(cookiePrefix)) {
      return decodeURIComponent(cookie.slice(cookiePrefix.length));
    }
  }

  return null;
}

function setCookie(name, value, maxAgeSeconds) {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAgeSeconds}; path=/; samesite=lax`;
}

function saveConfiguration(durationSeconds, title, subtitle) {
  const oneYearInSeconds = 60 * 60 * 24 * 365;
  setCookie("countdown_duration_seconds", String(durationSeconds), oneYearInSeconds);
  setCookie("countdown_title", title, oneYearInSeconds);
  setCookie("countdown_subtitle", subtitle, oneYearInSeconds);
}

function readConfiguration() {
  const savedDurationSeconds = Number(getCookie("countdown_duration_seconds"));
  const savedMinutes = Number(getCookie("countdown_minutes"));
  const durationSeconds = Number.isFinite(savedDurationSeconds) && savedDurationSeconds > 0
    ? Math.round(savedDurationSeconds)
    : Number.isFinite(savedMinutes) && savedMinutes > 0
      ? Math.round(savedMinutes * 60)
      : defaultConfiguration.durationSeconds;
  const title = getCookie("countdown_title") || defaultConfiguration.title;
  const subtitle = getCookie("countdown_subtitle") || defaultConfiguration.subtitle;

  setDurationInputs(durationSeconds);
  titleInput.value = title;
  subtitleInput.value = subtitle;

  applyCopy(title, subtitle);
  startTimer(durationSeconds);
}

function setDurationInputs(durationSeconds) {
  durationMinutesInput.value = String(Math.floor(durationSeconds / 60));
  durationSecondsInput.value = String(durationSeconds % 60);
  validateDuration();
  updateActivePreset(durationSeconds);
}

function getDurationSeconds() {
  const minutes = Number(durationMinutesInput.value);
  const seconds = Number(durationSecondsInput.value);

  if (!Number.isInteger(minutes) || !Number.isInteger(seconds)) {
    return 0;
  }

  return minutes * 60 + seconds;
}

function validateDuration() {
  const durationSeconds = getDurationSeconds();
  durationSecondsInput.setCustomValidity(
    durationSeconds > 0 ? "" : "Enter a duration of at least 1 second.",
  );
  return durationSeconds > 0;
}

function updateActivePreset(durationSeconds = getDurationSeconds()) {
  presetButtons.forEach((button) => {
    const isActive = Number(button.dataset.durationSeconds) === durationSeconds;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function applyCopy(title, subtitle) {
  titleElement.textContent = title;
  subtitleElement.textContent = subtitle;
}

function startTimer(durationSeconds) {
  totalDurationMs = durationSeconds * 1000;
  endTime = Date.now() + totalDurationMs;
  isPaused = false;
  pausedRemainingMs = 0;
  pauseButton.textContent = "Pause";
  pauseButton.disabled = false;
  finishedMessageMounted = false;
  stopFinishBeeps();
  timerShellElement.classList.remove("is-warning", "is-finished");
  const existingMessage = document.querySelector(".finished-state");
  if (existingMessage) {
    existingMessage.remove();
  }

  clearInterval(intervalId);
  updateTimer();
  intervalId = window.setInterval(updateTimer, 250);
}

function togglePause() {
  unlockAudio();

  if (timerShellElement.classList.contains("is-finished")) {
    return;
  }

  if (isPaused) {
    endTime = Date.now() + pausedRemainingMs;
    isPaused = false;
    pauseButton.textContent = "Pause";
    statusTextElement.textContent = "Timer is running";
    updateTimer();
    intervalId = window.setInterval(updateTimer, 250);
    return;
  }

  pausedRemainingMs = Math.max(0, endTime - Date.now());
  isPaused = true;
  clearInterval(intervalId);
  pauseButton.textContent = "Resume";
  statusTextElement.textContent = "Timer is paused";
}

function restartTimer() {
  unlockAudio();

  if (!setupForm.reportValidity() || !validateDuration()) {
    return;
  }

  const durationSeconds = getDurationSeconds();
  const title = titleInput.value.trim() || defaultConfiguration.title;
  const subtitle = subtitleInput.value.trim() || defaultConfiguration.subtitle;

  applyCopy(title, subtitle);
  saveConfiguration(durationSeconds, title, subtitle);
  startTimer(durationSeconds);
}

function updateTimer() {
  const remainingMs = Math.max(0, endTime - Date.now());
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  hoursElement.textContent = formatUnit(hours);
  minutesElement.textContent = formatUnit(minutes);
  secondsElement.textContent = formatUnit(seconds);

  const progress = totalDurationMs === 0 ? 0 : (remainingMs / totalDurationMs) * 100;
  progressBarElement.style.width = `${Math.max(0, Math.min(100, progress))}%`;

  if (progress <= 20 && remainingMs > 0) {
    timerShellElement.classList.add("is-warning");
    statusTextElement.textContent = "Final stretch";
  } else if (remainingMs > 0) {
    timerShellElement.classList.remove("is-warning");
    statusTextElement.textContent = "Timer is running";
  }

  if (remainingMs === 0) {
    clearInterval(intervalId);
    isPaused = false;
    pauseButton.textContent = "Pause";
    pauseButton.disabled = true;
    timerShellElement.classList.remove("is-warning");
    timerShellElement.classList.add("is-finished");
    statusTextElement.textContent = "Time is up";
    startFinishBeeps();

    if (!finishedMessageMounted) {
      const finishedMessage = finishedMessageTemplate.content.firstElementChild.cloneNode(true);
      finishedMessage.querySelector(".quiet-button").addEventListener("click", () => {
        stopFinishBeeps();
        finishedMessage.remove();
      });
      timerElement.insertAdjacentElement("afterend", finishedMessage);
      finishedMessageMounted = true;
    }
  }
}

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  unlockAudio();

  if (!validateDuration()) {
    setupForm.reportValidity();
    return;
  }

  const durationSeconds = getDurationSeconds();
  const title = titleInput.value.trim() || defaultConfiguration.title;
  const subtitle = subtitleInput.value.trim() || defaultConfiguration.subtitle;

  applyCopy(title, subtitle);
  saveConfiguration(durationSeconds, title, subtitle);
  startTimer(durationSeconds);
});

[durationMinutesInput, durationSecondsInput].forEach((input) => {
  input.addEventListener("input", () => {
    validateDuration();
    updateActivePreset();
  });
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDurationInputs(Number(button.dataset.durationSeconds));
  });
});

pauseButton.addEventListener("click", togglePause);

restartButton.addEventListener("click", restartTimer);

testBeepButton.addEventListener("click", () => {
  unlockAudio();
  playFinishBeeps();
});

document.addEventListener("pointerdown", unlockAudio, { once: true });

document.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }

  const target = event.target;
  const isEditing = target instanceof HTMLElement
    && (target.isContentEditable || target.matches("input, textarea, select"));

  if (isEditing) {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    togglePause();
  } else if (event.key === "Enter") {
    event.preventDefault();
    restartTimer();
  }
});

readConfiguration();
