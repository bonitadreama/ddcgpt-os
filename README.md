# DDCGPT OS

DDCGPT OS is a public work-in-progress browser-based desktop prototype.

It currently includes:

- A desktop shell with a top bar and dock
- Draggable app windows
- A local virtual file system powered by IndexedDB
- A Files app with IndexedDB-backed file and folder CRUD
- A Memories app that saves searchable local memory notes into the IndexedDB file system
- Import/export controls for moving local Files and Memories data between browsers or sessions
- A command palette and terminal for opening apps and running local prototype commands
- A ChatGPT assistant window shell
- Early shells for future Photos, Browser, and Settings work

## Status

This project is public while still actively evolving. The current WIP is usable as a local browser desktop: Files can create, edit, rename, delete, export, and import IndexedDB-backed files and folders, and Memories can create, search, tag, save, delete, export, and import local memory notes. Some dock apps are still early shells while the OS layer grows around the working local data tools.

## Local Data Import/Export

Use the Export button in Files or Memories to download a dated `ddcgpt-os-export-*.json` package. Use Import in another browser or session to replace the current local IndexedDB Files and Memories data with that package.

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

- Add drag-and-drop file organization inside the Files app
- Add persistent user profile settings
- Improve window controls with minimize and maximize
- Connect the assistant shell to real AI functionality
