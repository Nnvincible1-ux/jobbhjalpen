import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * CMS draft/publish isolation: editing must NOT change what the public sees
 * until publish is triggered. We model the DB helpers in memory and assert the
 * isolation property directly.
 */

type Row = { textKey: string; content: string; draftContent: string | null; hasDraft: boolean };

const store: { rows: Row[] } = { rows: [] };

function getPublic() {
  // public read = published columns only
  return store.rows.map((r) => ({ textKey: r.textKey, content: r.content }));
}
function getPreview() {
  return store.rows.map((r) => ({
    textKey: r.textKey,
    content: r.hasDraft && r.draftContent !== null ? r.draftContent : r.content,
  }));
}
function edit(textKey: string, content: string) {
  const r = store.rows.find((x) => x.textKey === textKey)!;
  r.draftContent = content;
  r.hasDraft = true;
}
function publish() {
  for (const r of store.rows) {
    if (r.hasDraft && r.draftContent !== null) {
      r.content = r.draftContent;
      r.draftContent = null;
      r.hasDraft = false;
    }
  }
}

describe("CMS draft/publish isolation", () => {
  beforeEach(() => {
    store.rows = [{ textKey: "hero.title", content: "Publicerad titel", draftContent: null, hasDraft: false }];
  });

  it("keeps published content visible to the public while editing", () => {
    edit("hero.title", "Ny utkaststitel");
    expect(getPublic()[0].content).toBe("Publicerad titel"); // public unchanged
    expect(getPreview()[0].content).toBe("Ny utkaststitel"); // preview shows draft
  });

  it("applies the draft to public only after publish", () => {
    edit("hero.title", "Ny utkaststitel");
    publish();
    expect(getPublic()[0].content).toBe("Ny utkaststitel");
    expect(store.rows[0].hasDraft).toBe(false);
    expect(store.rows[0].draftContent).toBeNull();
  });
});
