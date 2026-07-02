import { readFile, writeFile } from "node:fs/promises";

export type CursorStore = {
  loadCursor: () => Promise<number | null>;
  saveCursor: (cursor: number) => Promise<void>;
};

export class MemoryCursorStore implements CursorStore {
  public constructor(private cursor: number | null = null) {}

  public async loadCursor(): Promise<number | null> {
    return this.cursor;
  }

  public async saveCursor(cursor: number): Promise<void> {
    this.cursor = cursor;
  }
}

export class FileCursorStore implements CursorStore {
  public constructor(private readonly path: string) {}

  public async loadCursor(): Promise<number | null> {
    try {
      const raw = await readFile(this.path, "utf8");
      const parsed = JSON.parse(raw) as { cursor?: unknown };
      return typeof parsed.cursor === "number" ? parsed.cursor : null;
    } catch {
      return null;
    }
  }

  public async saveCursor(cursor: number): Promise<void> {
    await writeFile(this.path, `${JSON.stringify({ cursor }, null, 2)}\n`);
  }
}
