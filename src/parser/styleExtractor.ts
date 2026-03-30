import type JSZip from "jszip";
import type { EpubStyles } from "../types.js";

/**
 * Extract CSS styles from an EPUB's stylesheets and resolve to base values.
 */
export async function extractStyles(
  zip: JSZip,
  opfDir: string,
  manifestMap: Map<string, { href: string; mediaType: string }>
): Promise<EpubStyles> {
  const stylesheets: string[] = [];

  for (const [, item] of manifestMap.entries()) {
    if (item.mediaType === "text/css") {
      try {
        const file = zip.file(opfDir + item.href);
        if (file) {
          const css = await file.async("string");
          stylesheets.push(css);
        }
      } catch {
        // Skip unreadable stylesheets
      }
    }
  }

  // Extract base font info from body rules
  let baseFontSize = 16;
  let baseFontFamily = "serif";
  let baseLineHeight = 1.5;

  for (const css of stylesheets) {
    const bodyMatch = css.match(/body\s*\{([^}]*)\}/i);
    if (bodyMatch) {
      const bodyRules = bodyMatch[1];

      const fontSizeMatch = bodyRules.match(/font-size\s*:\s*(\d+(?:\.\d+)?)(px|pt|em|rem)/i);
      if (fontSizeMatch) {
        const val = parseFloat(fontSizeMatch[1]);
        const unit = fontSizeMatch[2].toLowerCase();
        if (unit === "px") baseFontSize = val;
        else if (unit === "pt") baseFontSize = val * (4 / 3);
        else if (unit === "em" || unit === "rem") baseFontSize = val * 16;
      }

      const fontFamilyMatch = bodyRules.match(/font-family\s*:\s*([^;]+)/i);
      if (fontFamilyMatch) {
        baseFontFamily = fontFamilyMatch[1].trim().replace(/['"]/g, "").split(",")[0].trim();
      }

      const lineHeightMatch = bodyRules.match(/line-height\s*:\s*(\d+(?:\.\d+)?)/i);
      if (lineHeightMatch) {
        baseLineHeight = parseFloat(lineHeightMatch[1]);
      }
    }
  }

  return {
    baseFontSize,
    baseFontFamily,
    baseLineHeight,
    stylesheets,
  };
}
