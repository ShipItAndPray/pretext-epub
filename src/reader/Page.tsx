import React from "react";
import type { RenderedBlock } from "../types.js";

export interface PageProps {
  blocks: RenderedBlock[];
  pageWidth: number;
  pageHeight: number;
}

/**
 * Renders a single page of content. Each block's lines are positioned
 * using the pre-computed layout data from the pagination engine.
 */
export const Page: React.FC<PageProps> = ({ blocks, pageWidth, pageHeight }) => {
  return (
    <div
      className="pretext-epub-page"
      style={{
        width: pageWidth,
        height: pageHeight,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {blocks.map((block, blockIdx) => (
        <div
          key={blockIdx}
          className={`pretext-epub-block pretext-epub-block--${block.type}`}
          style={{
            fontFamily: block.style.fontFamily,
            fontSize: block.style.fontSize,
            fontWeight: block.style.fontWeight,
            fontStyle: block.style.fontStyle,
            lineHeight: block.style.lineHeight,
            textAlign: block.style.textAlign,
            marginTop: block.style.marginTop,
            marginBottom: block.style.marginBottom,
          }}
        >
          {block.lines.map((line, lineIdx) => (
            <div
              key={lineIdx}
              className="pretext-epub-line"
              style={{
                paddingLeft: line.x,
              }}
            >
              {line.text}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
