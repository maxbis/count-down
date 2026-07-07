# Classroom Countdown Timer

A clear, fullscreen-friendly countdown timer for classroom digi boards. It is designed for assignments, tests, workshops, and other timed activities where students need to see the remaining time from a distance.

## Features

- Large `HH:MM:SS` countdown display with a digital seven-segment font.
- Editable title, subtitle, and duration.
- Settings are stored in browser cookies and reused as defaults.
- Pause/resume, restart, and test-beep controls.
- Progress bar with a warning style during the final part of the countdown.
- Finish alarm: three beeps, repeated every 10 seconds for up to 2 minutes.
- Quiet alarm button to stop and hide the finish alarm.
- No build step or server-side dependency required.

## Files

- `index.html` contains the page structure and setup form.
- `styles.css` contains the visual design and responsive layout.
- `script.js` contains timer behavior, cookie storage, pause/resume, and audio.
- `fonts/` contains the local digital display font.

## Run Locally

Open `index.html` directly in a browser, or serve the folder with a simple local web server:

```bash
php -S localhost:8000
```

Then open:

```text
http://localhost:8000
```

## Usage

1. Scroll to the setup panel.
2. Set the duration in minutes.
3. Optionally change the title and subtitle.
4. Press `Start Timer`.
5. Use `Pause`, `Restart`, or `Test Beeps` as needed.
6. When the timer finishes, press `Quiet Alarm` to stop the repeating beeps.

## Browser Audio Note

Modern browsers block audio until the user interacts with the page. Pressing `Start Timer`, `Restart`, `Pause`, `Test Beeps`, or clicking the page unlocks the beep sound for that session.

## Deployment

This is a static site. It can be hosted on any static web server, GitHub Pages, or a local classroom machine.
