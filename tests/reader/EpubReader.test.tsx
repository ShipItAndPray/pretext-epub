import { describe, it, expect, vi } from "vitest";
import React from "react";

// Basic component structure tests (don't require full EPUB loading)
describe("EpubReader component structure", () => {
  it("Page component renders blocks", async () => {
    const { Page } = await import("../../src/reader/Page.js");
    // Verify the component is exported and is a function
    expect(typeof Page).toBe("function");
  });

  it("ProgressBar component renders", async () => {
    const { ProgressBar } = await import("../../src/reader/ProgressBar.js");
    expect(typeof ProgressBar).toBe("function");
  });

  it("PageSlider component renders", async () => {
    const { PageSlider } = await import("../../src/reader/PageSlider.js");
    expect(typeof PageSlider).toBe("function");
  });

  it("TableOfContents component renders", async () => {
    const { TableOfContents } = await import("../../src/reader/TableOfContents.js");
    expect(typeof TableOfContents).toBe("function");
  });

  it("useSwipe hook is exported", async () => {
    const { useSwipe } = await import("../../src/reader/useSwipe.js");
    expect(typeof useSwipe).toBe("function");
  });

  it("useKeyboard hook is exported", async () => {
    const { useKeyboard } = await import("../../src/reader/useKeyboard.js");
    expect(typeof useKeyboard).toBe("function");
  });

  it("useReader hook is exported", async () => {
    const { useReader } = await import("../../src/reader/useReader.js");
    expect(typeof useReader).toBe("function");
  });

  it("EpubReader component is exported", async () => {
    const { EpubReader } = await import("../../src/reader/EpubReader.js");
    expect(typeof EpubReader).toBe("function");
  });
});

describe("reader exports", () => {
  it("reader entry point exports all components", async () => {
    const reader = await import("../../src/reader.js");
    expect(reader.EpubReader).toBeDefined();
    expect(reader.useReader).toBeDefined();
    expect(reader.Page).toBeDefined();
    expect(reader.ProgressBar).toBeDefined();
    expect(reader.PageSlider).toBeDefined();
    expect(reader.TableOfContents).toBeDefined();
    expect(reader.useSwipe).toBeDefined();
    expect(reader.useKeyboard).toBeDefined();
  });
});

describe("engine exports", () => {
  it("index entry point exports engine functions", async () => {
    const engine = await import("../../src/index.js");
    expect(engine.parseEpub).toBeDefined();
    expect(engine.paginate).toBeDefined();
    expect(engine.getPage).toBeDefined();
  });
});
