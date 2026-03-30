import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { parseContent } from "./contentParser.js";
import { extractStyles } from "./styleExtractor.js";
import type { EpubBook, EpubChapter, TocEntry, EpubStyles } from "../types.js";

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

/**
 * Parse an EPUB file from an ArrayBuffer into a structured EpubBook.
 *
 * Steps:
 * 1. Unzip with JSZip
 * 2. Read META-INF/container.xml to find the OPF file
 * 3. Parse OPF for metadata, manifest, and spine
 * 4. Parse NCX/Nav for table of contents
 * 5. Parse each spine item (XHTML) into TextBlock arrays
 */
export async function parseEpub(data: ArrayBuffer): Promise<EpubBook> {
  const zip = await JSZip.loadAsync(data);

  // 1. Find OPF path from container.xml
  const containerXml = await readZipText(zip, "META-INF/container.xml");
  const container = xml.parse(containerXml);
  const rootfile =
    container?.container?.rootfiles?.rootfile ||
    container?.container?.rootfiles;
  const opfPath = Array.isArray(rootfile)
    ? rootfile[0]["@_full-path"]
    : rootfile["@_full-path"];

  const opfDir = opfPath.includes("/")
    ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1)
    : "";

  // 2. Parse OPF
  const opfXml = await readZipText(zip, opfPath);
  const opf = xml.parse(opfXml);
  const pkg = opf["package"] || opf["opf:package"];
  const metadata = pkg.metadata || pkg["opf:metadata"];
  const manifest = pkg.manifest || pkg["opf:manifest"];
  const spine = pkg.spine || pkg["opf:spine"];

  // 3. Extract metadata
  const title = extractText(metadata, ["dc:title", "title"]) || "Untitled";
  const author = extractText(metadata, ["dc:creator", "creator"]) || "Unknown";
  const language = extractText(metadata, ["dc:language", "language"]) || "en";
  const publisher = extractText(metadata, ["dc:publisher", "publisher"]);
  const date = extractText(metadata, ["dc:date", "date"]);

  // 4. Build manifest map (id -> href)
  const manifestItems = ensureArray(manifest.item || manifest["opf:item"]);
  const manifestMap = new Map<string, { href: string; mediaType: string }>();
  for (const item of manifestItems) {
    manifestMap.set(item["@_id"], {
      href: item["@_href"],
      mediaType: item["@_media-type"],
    });
  }

  // 5. Get spine order
  const spineItems = ensureArray(spine.itemref || spine["opf:itemref"]);
  const spineIds: string[] = spineItems.map(
    (ref: Record<string, string>) => ref["@_idref"]
  );

  // 6. Extract stylesheets
  const styles = await extractStyles(zip, opfDir, manifestMap);

  // 7. Parse NCX/Nav TOC
  const tocId =
    spine["@_toc"] ||
    manifestItems.find(
      (i: Record<string, string>) =>
        i["@_properties"]?.includes("nav") ||
        i["@_media-type"] === "application/x-dtbncx+xml"
    )?.["@_id"];

  let toc: TocEntry[] = [];
  if (tocId && manifestMap.has(tocId)) {
    const tocHref = manifestMap.get(tocId)!.href;
    const tocXml = await readZipText(zip, opfDir + tocHref);
    toc = parseToc(tocXml, spineIds, manifestMap);
  }

  // 8. Parse chapters from spine
  const chapters: EpubChapter[] = [];
  for (let i = 0; i < spineIds.length; i++) {
    const id = spineIds[i];
    const item = manifestMap.get(id);
    if (!item) continue;

    const rawHtml = await readZipText(zip, opfDir + item.href);
    const content = parseContent(rawHtml, styles);

    // Try to find title from TOC, otherwise use "Chapter N"
    const tocMatch = toc.find((t) => t.chapterId === id);
    const chapterTitle = tocMatch?.title || `Chapter ${i + 1}`;

    chapters.push({
      id,
      title: chapterTitle,
      content,
      rawHtml,
    });
  }

  // 9. Extract cover image if present
  let cover: ArrayBuffer | undefined;
  const coverItem = manifestItems.find(
    (i: Record<string, string>) =>
      i["@_properties"]?.includes("cover-image") ||
      i["@_id"] === "cover-image" ||
      i["@_id"] === "cover"
  );
  if (coverItem && coverItem["@_media-type"]?.startsWith("image/")) {
    const coverFile = zip.file(opfDir + coverItem["@_href"]);
    if (coverFile) {
      cover = await coverFile.async("arraybuffer");
    }
  }

  return {
    metadata: { title, author, language, publisher, date, cover },
    chapters,
    toc,
    styles,
  };
}

function parseToc(
  tocXml: string,
  spineIds: string[],
  manifestMap: Map<string, { href: string; mediaType: string }>
): TocEntry[] {
  const parsed = xml.parse(tocXml);

  // EPUB 2 NCX
  if (parsed.ncx) {
    const navMap = parsed.ncx.navMap;
    if (!navMap) return [];
    return parseNcxNavPoints(
      ensureArray(navMap.navPoint),
      spineIds,
      manifestMap
    );
  }

  // EPUB 3 Nav — simplified parse
  // Just return empty for now, chapters will use fallback titles
  return [];
}

function parseNcxNavPoints(
  points: any[],
  spineIds: string[],
  manifestMap: Map<string, { href: string; mediaType: string }>
): TocEntry[] {
  if (!points) return [];
  return points.map((p) => {
    const label =
      p.navLabel?.text || p.navLabel?.["#text"] || p["@_id"] || "Untitled";
    const src = p.content?.["@_src"] || "";
    // Strip fragment
    const href = src.split("#")[0];

    // Find matching spine item
    let chapterId = "";
    for (const [id, item] of manifestMap.entries()) {
      if (item.href === href || item.href.endsWith(href)) {
        chapterId = id;
        break;
      }
    }

    const children = p.navPoint
      ? parseNcxNavPoints(ensureArray(p.navPoint), spineIds, manifestMap)
      : undefined;

    return {
      title: typeof label === "string" ? label : String(label),
      chapterId,
      pageNumber: 0, // Filled in after pagination
      children,
    };
  });
}

async function readZipText(zip: JSZip, path: string): Promise<string> {
  const file = zip.file(path);
  if (!file) {
    // Try case-insensitive
    const lowerPath = path.toLowerCase();
    const found = zip.file(new RegExp(escapeRegex(lowerPath), "i"));
    if (found.length > 0) {
      return found[0].async("string");
    }
    throw new Error(`File not found in EPUB: ${path}`);
  }
  return file.async("string");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractText(
  metadata: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const val = metadata?.[key];
    if (val === undefined) continue;
    if (typeof val === "string") return val;
    if (typeof val === "object" && val !== null && "#text" in val)
      return String((val as Record<string, unknown>)["#text"]);
    return String(val);
  }
  return undefined;
}

function ensureArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}
