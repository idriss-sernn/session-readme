# Session README — Ableton Live Extension

A simple note attached to each session. Never forget what you were working on.

![Session README screenshot](screenshot.png)

## What it does

Right-click on any track, clip slot, or scene → **"Session Note"**

A text editor opens. Write anything — concept, next steps, what's not working yet. Hit **⌘S** or click **Save**.

The note is automatically linked to your session. Next time you open it and right-click → **"Session Note"**, your note is there.

## Install

1. Download `session-readme.ablx` from the [Releases](../../releases) page
2. Open Ableton Live 12.4.5+
3. Go to **Preferences → Extensions**
4. Drag `session-readme.ablx` into the window
5. Restart Live

## Requirements

- Ableton Live 12 Suite (12.4.5 or later)

## Build from source

```bash
git clone https://github.com/your-username/session-readme
cd session-readme
npm install
# Add your Live path to .env:
echo "EXTENSION_HOST_PATH=/Applications/Ableton Live 12 Beta.app" > .env
npm start
```

## License

MIT — free to use, modify, and distribute.

---

Built with the [Ableton Extensions SDK](https://www.ableton.com/live/extensions)
