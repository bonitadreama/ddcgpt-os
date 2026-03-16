'use client';

import { MouseEvent, ReactNode } from 'react';

export type DesktopWindowModel = {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

type WindowProps = {
  window: DesktopWindowModel;
  children: ReactNode;
  onFocus: (id: string) => void;
  onDragStart: (id: string, event: MouseEvent<HTMLDivElement>) => void;
  onResizeStart: (id: string, event: MouseEvent<HTMLDivElement>) => void;
};

export function Window({ window, children, onFocus, onDragStart, onResizeStart }: WindowProps) {
  return (
    <article
      className="absolute overflow-hidden rounded-xl border border-white/25 bg-slate-950/70 shadow-2xl backdrop-blur-md"
      style={{
        left: `${window.x}px`,
        top: `${window.y}px`,
        width: `${window.width}px`,
        height: `${window.height}px`,
        zIndex: window.zIndex,
      }}
      onMouseDown={() => onFocus(window.id)}
    >
      <header
        className="flex cursor-move items-center justify-between border-b border-white/20 px-4 py-2"
        onMouseDown={(event) => onDragStart(window.id, event)}
      >
        <div className="text-sm font-medium">{window.title}</div>
        <div className="flex gap-2">
          <span className="h-3 w-3 rounded-full bg-yellow-300/80" />
          <span className="h-3 w-3 rounded-full bg-green-300/80" />
          <span className="h-3 w-3 rounded-full bg-red-300/80" />
        </div>
      </header>
      <div className="h-[calc(100%-40px)] overflow-auto p-4">{children}</div>
      <div
        aria-label={`Resize ${window.title}`}
        className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize border-r-2 border-b-2 border-white/50"
        onMouseDown={(event) => onResizeStart(window.id, event)}
      />
    </article>
  );
}
