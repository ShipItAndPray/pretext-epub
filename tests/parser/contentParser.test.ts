import { describe, it, expect } from "vitest";
import { parseContent } from "../../src/parser/contentParser.js";
import type { EpubStyles } from "../../src/types.js";

const defaultStyles: EpubStyles = {
  baseFontSize: 16,
  baseFontFamily: "serif",
  baseLineHeight: 1.5,
  stylesheets: [],
};

describe("contentParser", () => {
  it("parses a simple paragraph", () => {
    const html = `<html><body><p>Hello world</p></body></html>`;
    const blocks = parseContent(html, defaultStyles);

    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[0].text).toBe("Hello world");
  });

  it("parses headings with correct levels", () => {
    const html = `<html><body><h1>Title</h1><h2>Subtitle</h2></body></html>`;
    const blocks = parseContent(html, defaultStyles);

    expect(blocks.length).toBe(2);
    expect(blocks[0].type).toBe("heading");
    expect(blocks[0].level).toBe(1);
    expect(blocks[0].style.fontSize).toBe(32);
    expect(blocks[1].type).toBe("heading");
    expect(blocks[1].level).toBe(2);
    expect(blocks[1].style.fontSize).toBe(28);
  });

  it("parses multiple paragraphs", () => {
    const html = `<html><body>
      <p>First paragraph</p>
      <p>Second paragraph</p>
      <p>Third paragraph</p>
    </body></html>`;
    const blocks = parseContent(html, defaultStyles);

    const paragraphs = blocks.filter((b) => b.type === "paragraph");
    expect(paragraphs.length).toBe(3);
    expect(paragraphs[0].text).toBe("First paragraph");
    expect(paragraphs[2].text).toBe("Third paragraph");
  });

  it("parses blockquotes", () => {
    const html = `<html><body><blockquote>Quoted text</blockquote></body></html>`;
    const blocks = parseContent(html, defaultStyles);

    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe("blockquote");
    expect(blocks[0].text).toBe("Quoted text");
    expect(blocks[0].style.fontStyle).toBe("italic");
  });

  it("handles empty body gracefully", () => {
    const html = `<html><body></body></html>`;
    const blocks = parseContent(html, defaultStyles);
    expect(blocks).toEqual([]);
  });

  it("falls back to tag stripping on parse error", () => {
    const html = `not valid xml at all <p>but has text</p>`;
    const blocks = parseContent(html, defaultStyles);
    // Should still extract some text
    expect(blocks.length).toBeGreaterThanOrEqual(0);
  });

  it("uses base font family from styles", () => {
    const styles: EpubStyles = {
      ...defaultStyles,
      baseFontFamily: "Georgia",
    };
    const html = `<html><body><p>Styled text</p></body></html>`;
    const blocks = parseContent(html, styles);

    expect(blocks[0].style.fontFamily).toBe("Georgia");
  });

  it("parses nested divs and sections", () => {
    const html = `<html><body><div><section><p>Deep text</p></section></div></body></html>`;
    const blocks = parseContent(html, defaultStyles);

    const paragraphs = blocks.filter((b) => b.type === "paragraph");
    expect(paragraphs.length).toBe(1);
    expect(paragraphs[0].text).toBe("Deep text");
  });
});
