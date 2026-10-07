# Orbit

A complete browser desktop built with React, TypeScript, and Vite. Original sage-toned design, bundled landscape wallpapers and fonts, twelve built-in applications, and persistent local files. No backend required.

## Develop

```sh
npm ci
npm run dev
```

The development server listens on port 5173. `npm run build` type-checks and produces `dist`; `npm run preview` serves the production build.

## Architecture

- `src/core/windowManager.ts`: window lifecycle, focus, geometry, and remembered positions.
- `src/core/filesystem.ts`: IndexedDB file storage, initialization, recursive copy/delete, safe moves, and path resolution.
- `src/core/registry.ts`: typed application metadata and wallpaper catalog.
- `src/core/preferences.ts`, `notifications.ts`, `persistence.ts`: independent persistent services.
- `src/core/store.tsx`: shared desktop context that composes the services.
- `src/components`: desktop shell and reusable managed windows.
- `src/apps`: functional application views.
- `public/wallpapers`: original, offline-ready SVG landscapes.

To add an app, extend `AppId` in `types.ts`, add registry metadata, implement its component, and register it in `AppContent.tsx`.

## Interactions

Double-click desktop icons and files to open them. Use the dock or launcher to open apps. Drag title bars to move windows, drag edges/corners to resize, or use the title-bar snap menu. Drag to a screen edge to snap. Double-click title bars to maximize/restore. Search apps and files with Ctrl/Command + Space. Escape closes desktop panels.

Files supports folders, uploads, rename, delete, copy/cut/paste, favorites, list/grid views, and drag-and-drop moves. Imported text opens in Text Editor; images, audio, and video open in their respective players. File drops from your device import into the current directory. Notes saves as you type; Text Editor has an explicit Save button and Ctrl/Command + S.

Terminal commands: `ls`, `cd`, `pwd`, `mkdir`, `touch`, `cat`, `echo` (including `>` redirection), `clear`, `rm`, `cp`, `mv`, `help`, `date`, `whoami`, `neofetch`. Paths may be absolute or relative. Quote filenames with spaces. Terminal and Files share the same filesystem.

## Tests

```sh
npm exec playwright install chromium
npm exec playwright test
```

The test configuration uses `/usr/bin/chromium` in this cloud environment. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to another installed executable, or omit it on machines using Playwright's downloaded browser. Tests cover file lifecycle, terminal commands, editor saves, persistence, all twelve apps, calculator precedence, drag/resize/snap, window controls, notifications, context menus, notes, and mobile layout.

## Browser limits

Data stays in this browser's IndexedDB/localStorage and is not synced or encrypted. Clearing site data removes it. Browser websites may forbid iframe embedding; the shell offers opening them in an external tab. Network/Bluetooth indicators are desktop preferences, battery is illustrative, and real hardware connectivity is managed by the host. Memory metrics are used only where the browser exposes them; the monitor does not invent CPU usage. The App Store is an explicitly labeled preview catalog. Music and Video play your local files using browser codecs.
