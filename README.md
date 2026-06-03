# DDCGPT OS

DDCGPT OS is a work-in-progress browser-based desktop prototype.

It currently includes:

- A desktop shell with a top bar and dock
- Draggable app windows
- A ChatGPT assistant window placeholder
- A local virtual file system powered by IndexedDB
- A Files app with file creation and listing
- Placeholder windows for future Search, Photos, Browser, Memories, and Settings apps

## Status

This project is public while still actively evolving. Some features are intentionally unfinished, and several dock apps are placeholders for planned functionality.

## Run Locally

Open `index.html` in a browser, or serve the folder locally:

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Then visit:

```text
http://127.0.0.1:8765/index.html
```

## Next Features

- Expand the Files app with edit, delete, rename, and folder support
- Add persistent user profile settings
- Build a Memories app backed by the local file system
- Improve window controls with minimize and maximize
- Connect the assistant placeholder to real AI functionality
