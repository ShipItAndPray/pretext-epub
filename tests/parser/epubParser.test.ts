import { describe, it, expect } from "vitest";
import { parseContent } from "../../src/parser/contentParser.js";
import type { EpubStyles } from "../../src/types.js";

// Note: Full epubParser tests require a real EPUB file.
// These tests focus on the content parsing pipeline which is the core logic.

const styles: EpubStyles = {
  baseFontSize: 16,
  baseFontFamily: "serif",
  baseLineHeight: 1.5,
  stylesheets: [],
};

describe("epubParser - content pipeline", () => {
  it("extracts text from complex nested HTML", () => {
    const html = `<?xml version="1.0" encoding="UTF-8"?>
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head><title>Test</title></head>
    <body>
      <div class="chapter">
        <h1>Chapter One</h1>
        <p>It was a dark and stormy night.</p>
        <p>The <em>wind</em> howled through the trees.</p>
      </div>
    </body>
    </html>`;

    const blocks = parseContent(html, styles);
    expect(blocks.length).toBeGreaterThanOrEqual(2);

    const heading = blocks.find((b) => b.type === "heading");
    expect(heading?.text).toBe("Chapter One");

    const paragraphs = blocks.filter((b) => b.type === "paragraph");
    expect(paragraphs.length).toBeGreaterThanOrEqual(1);
  });

  it("preserves heading levels", () => {
    const html = `<html><body>
      <h1>Level 1</h1>
      <h3>Level 3</h3>
      <h6>Level 6</h6>
    </body></html>`;

    const blocks = parseContent(html, styles);
    const headings = blocks.filter((b) => b.type === "heading");

    expect(headings[0].level).toBe(1);
    expect(headings[0].style.fontSize).toBe(32);
    expect(headings[1].level).toBe(3);
    expect(headings[1].style.fontSize).toBe(24);
    expect(headings[2].level).toBe(6);
    expect(headings[2].style.fontSize).toBe(16);
  });

  it("handles images as image blocks", () => {
    const html = `<html><body><img src="cover.jpg" /><p>Caption</p></body></html>`;
    const blocks = parseContent(html, styles);

    expect(blocks.some((b) => b.type === "image")).toBe(true);
  });

  it("assigns correct style defaults", () => {
    const html = `<html><body><p>Test</p></body></html>`;
    const blocks = parseContent(html, styles);

    expect(blocks[0].style.fontFamily).toBe("serif");
    expect(blocks[0].style.fontSize).toBe(16);
    expect(blocks[0].style.lineHeight).toBe(1.5);
    expect(blocks[0].style.textIndent).toBe(24);
  });
});
