'use client';

import { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatBrowser } from '@/components/chat-browser';
import { PhotoGallery } from '@/components/photo-gallery';
import { SessionHistory } from '@/components/session-history';
import { SettingsPanel } from '@/components/settings-panel';
import { DesktopWindowModel, Window } from '@/components/window';

type InteractionState =
  | { mode: 'idle' }
  | { mode: 'drag'; id: string; offsetX: number; offsetY: number }
  | { mode: 'resize'; id: string; startX: number; startY: number; startWidth: number; startHeight: number };

const MIN_WIDTH = 280;
const MIN_HEIGHT = 200;

const initialWindows: DesktopWindowModel[] = [
  { id: 'chat', title: 'Chat Browser', x: 24, y: 24, width: 760, height: 360, zIndex: 4 },
  { id: 'sessions', title: 'Session History', x: 804, y: 24, width: 340, height: 260, zIndex: 3 },
  { id: 'gallery', title: 'Photo Gallery', x: 24, y: 404, width: 760, height: 300, zIndex: 2 },
  { id: 'system', title: 'System Controls', x: 804, y: 304, width: 340, height: 220, zIndex: 1 },
];

export function DesktopShell() {
  const desktopRef = useRef<HTMLDivElement | null>(null);
  const [windows, setWindows] = useState(initialWindows);
  const [interaction, setInteraction] = useState<InteractionState>({ mode: 'idle' });

  const focusWindow = useCallback((id: string) => {
    setWindows((current) => {
      const maxZ = Math.max(...current.map((item) => item.zIndex));
      return current.map((item) => (item.id === id ? { ...item, zIndex: maxZ + 1 } : item));
    });
  }, []);

  const beginDrag = useCallback((id: string, event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    focusWindow(id);

    const target = windows.find((item) => item.id === id);
    if (!target) return;

    setInteraction({
      mode: 'drag',
      id,
      offsetX: event.clientX - target.x,
      offsetY: event.clientY - target.y,
    });
  }, [focusWindow, windows]);

  const beginResize = useCallback((id: string, event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    focusWindow(id);

    const target = windows.find((item) => item.id === id);
    if (!target) return;

    setInteraction({
      mode: 'resize',
      id,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: target.width,
      startHeight: target.height,
    });
  }, [focusWindow, windows]);

  useEffect(() => {
    function onMouseMove(event: globalThis.MouseEvent) {
      if (!desktopRef.current || interaction.mode === 'idle') return;
      const bounds = desktopRef.current.getBoundingClientRect();

      if (interaction.mode === 'drag') {
        setWindows((current) =>
          current.map((item) => {
            if (item.id !== interaction.id) return item;

            const nextX = Math.min(
              Math.max(event.clientX - interaction.offsetX, 0),
              Math.max(bounds.width - item.width, 0),
            );
            const nextY = Math.min(
              Math.max(event.clientY - interaction.offsetY, 0),
              Math.max(bounds.height - item.height - 48, 0),
            );

            return { ...item, x: nextX, y: nextY };
          }),
        );
      }

      if (interaction.mode === 'resize') {
        setWindows((current) =>
          current.map((item) => {
            if (item.id !== interaction.id) return item;

            const proposedWidth = interaction.startWidth + (event.clientX - interaction.startX);
            const proposedHeight = interaction.startHeight + (event.clientY - interaction.startY);

            const maxWidth = bounds.width - item.x;
            const maxHeight = bounds.height - item.y - 48;

            return {
              ...item,
              width: Math.max(MIN_WIDTH, Math.min(proposedWidth, maxWidth)),
              height: Math.max(MIN_HEIGHT, Math.min(proposedHeight, maxHeight)),
            };
          }),
        );
      }
    }

    function onMouseUp() {
      setInteraction({ mode: 'idle' });
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [interaction]);

  const windowMap = useMemo(() => {
    return Object.fromEntries(windows.map((window) => [window.id, window])) as Record<string, DesktopWindowModel>;
  }, [windows]);

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <div ref={desktopRef} className="relative mb-4 flex-1 overflow-hidden rounded-2xl border border-white/15 bg-black/20">
        <Window window={windowMap.chat} onFocus={focusWindow} onDragStart={beginDrag} onResizeStart={beginResize}>
          <ChatBrowser />
        </Window>

        <Window window={windowMap.sessions} onFocus={focusWindow} onDragStart={beginDrag} onResizeStart={beginResize}>
          <SessionHistory />
        </Window>

        <Window window={windowMap.gallery} onFocus={focusWindow} onDragStart={beginDrag} onResizeStart={beginResize}>
          <PhotoGallery />
        </Window>

        <Window window={windowMap.system} onFocus={focusWindow} onDragStart={beginDrag} onResizeStart={beginResize}>
          <SettingsPanel />
        </Window>
      </div>

      <footer className="flex items-center justify-between rounded-xl border border-white/20 bg-black/35 px-4 py-2 backdrop-blur">
        <button className="rounded bg-white/10 px-3 py-1 text-sm">Start</button>
        <div className="text-xs text-slate-300">DDCGPT OS • MVP shell</div>
      </footer>
    </main>
  );
}
