import { useCallback, useRef, useState } from 'react';

interface UseDropZoneOptions {
  onFiles: (files: File[]) => void;
}

// Recursively collect files from a FileSystemEntry
async function collectFiles(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise<File[]>((resolve) => {
      (entry as FileSystemFileEntry).file(
        (f) => resolve([f]),
        () => resolve([])
      );
    });
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    return new Promise<File[]>((resolve) => {
      const all: File[] = [];
      function read() {
        reader.readEntries(async (entries) => {
          if (entries.length === 0) {
            resolve(all);
            return;
          }
          for (const e of entries) {
            const files = await collectFiles(e);
            all.push(...files);
          }
          read();
        });
      }
      read();
    });
  }
  return [];
}

export function useDropZone({ onFiles }: UseDropZoneOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);

      const collected: File[] = [];

      const items = Array.from(e.dataTransfer.items);
      // Use File System Access API when available for folder support
      for (const item of items) {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            const files = await collectFiles(entry);
            collected.push(...files);
          } else {
            const f = item.getAsFile();
            if (f) collected.push(f);
          }
        }
      }

      if (collected.length > 0) {
        onFiles(collected);
      }
    },
    [onFiles]
  );

  return { isDragging, onDragEnter, onDragOver, onDragLeave, onDrop };
}
