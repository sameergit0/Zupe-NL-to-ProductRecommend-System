import React from 'react';
import { ProductRecommendationCard, type Product, type ProductVariant } from './ProductRecommendationCard';

interface MarkdownRendererProps {
  text: string;
}

/**
 * Tokenizes line text to parse inline bold tags **text** and link tags [text](url).
 * Ensures links open in a new tab securely.
 */
export function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let index = 0;

  while (index < text.length) {
    const boldStart = text.indexOf('**', index);
    const linkStart = text.indexOf('[', index);

    let type: 'none' | 'bold' | 'link' = 'none';
    let markerIndex = -1;

    if (boldStart !== -1 && (linkStart === -1 || boldStart < linkStart)) {
      type = 'bold';
      markerIndex = boldStart;
    } else if (linkStart !== -1) {
      type = 'link';
      markerIndex = linkStart;
    }

    if (type === 'none') {
      parts.push(text.slice(index));
      break;
    }

    if (markerIndex > index) {
      parts.push(text.slice(index, markerIndex));
    }

    if (type === 'bold') {
      const boldEnd = text.indexOf('**', markerIndex + 2);
      if (boldEnd !== -1) {
        const content = text.slice(markerIndex + 2, boldEnd);
        parts.push(<strong key={markerIndex}>{content}</strong>);
        index = boldEnd + 2;
      } else {
        parts.push('**');
        index = markerIndex + 2;
      }
    } else if (type === 'link') {
      const linkEnd = text.indexOf(']', markerIndex + 1);
      const urlStart = text.indexOf('(', linkEnd + 1);
      const urlEnd = text.indexOf(')', urlStart + 1);

      if (linkEnd !== -1 && urlStart === linkEnd + 1 && urlEnd !== -1) {
        const linkText = text.slice(markerIndex + 1, linkEnd);
        const url = text.slice(urlStart + 1, urlEnd);
        parts.push(
          <a
            key={markerIndex}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {linkText}
          </a>
        );
        index = urlEnd + 1;
      } else {
        parts.push('[');
        index = markerIndex + 1;
      }
    }
  }

  return parts;
}

/**
 * Parses block level markdown: paragraphs, headings, and bullet points.
 */
export function renderMarkdownBlock(text: string, keyPrefix: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let currentListItems: React.ReactNode[] = [];
  let listKey = 0;

  const flushList = () => {
    if (currentListItems.length > 0) {
      elements.push(<ul key={`${keyPrefix}-list-${listKey++}`}>{...currentListItems}</ul>);
      currentListItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={`${keyPrefix}-h3-${i}`}>{parseInline(trimmed.slice(4))}</h3>);
    } else if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={`${keyPrefix}-h2-${i}`}>{parseInline(trimmed.slice(3))}</h2>);
    } else if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(<h1 key={`${keyPrefix}-h1-${i}`}>{parseInline(trimmed.slice(2))}</h1>);
    } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      currentListItems.push(<li key={`${keyPrefix}-li-${i}`}>{parseInline(trimmed.slice(2))}</li>);
    } else if (trimmed.startsWith('![') && trimmed.endsWith(')')) {
      flushList();
      const match = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
      if (match) {
        const alt = match[1];
        const src = match[2];
        elements.push(
          <div key={`${keyPrefix}-img-${i}`} style={{ margin: '8px 0', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <img src={src} alt={alt} loading="lazy" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }} />
          </div>
        );
      } else {
        elements.push(<p key={`${keyPrefix}-p-${i}`}>{parseInline(line)}</p>);
      }
    } else {
      flushList();
      elements.push(<p key={`${keyPrefix}-p-${i}`}>{parseInline(line)}</p>);
    }
  }

  flushList();
  return <div key={keyPrefix} className="markdown-content">{elements}</div>;
}

/**
 * Checks if a block of markdown text is structured as a product recommendation card.
 * Uses heuristics matching product fields like Brand, Price, About, Category.
 */
function isProductBlock(blockText: string): boolean {
  const trimmed = blockText.trim();
  const hasBrand = /\*\*Brand\*\*?\s*:?/i.test(trimmed);
  const hasPrice = /\*\*Price\*\*?\s*:?/i.test(trimmed);
  const hasAbout = /\*\*(?:About|Why this suits you)\*\*?\s*:?/i.test(trimmed);
  const hasCategory = /\*\*Category\*\*?\s*:?/i.test(trimmed);

  let matches = 0;
  if (hasBrand) matches++;
  if (hasPrice) matches++;
  if (hasAbout) matches++;
  if (hasCategory) matches++;

  return matches >= 2;
}

// Regexes used by the splitter
const PRODUCT_FIELD_RE = /^\s*\*\*(?:Brand|Category|Price|About|Why this suits you|Available Options(?:\/Variants)?|Variants)\*\*\s*:?/i;
const VARIANT_LINE_RE = /^\s*[-*]\s+/;
const IMG_RE = /^\s*!\[/;
const H3_RE = /^\s*###\s+/;

/**
 * Splits a full LLM response into segments — one per product block plus any surrounding prose.
 * Handles BOTH ### heading style and heading-less product blocks.
 */
function splitIntoSegments(text: string): string[] {
  const lines = text.split('\n');
  const segments: string[] = [];
  let currentLines: string[] = [];
  let inProduct = false;

  /**
   * Returns true if the line at `idx` is the start of a product block.
   * A product block starts at a ### heading followed by product fields,
   * OR at a plain title line immediately followed by a **Brand**: field.
   */
  const isProductStartLine = (idx: number): boolean => {
    const line = lines[idx];
    if (!line.trim()) return false;

    if (H3_RE.test(line)) {
      // ### heading — confirm it leads to product fields
      for (let j = idx + 1; j < Math.min(idx + 7, lines.length); j++) {
        if (!lines[j].trim()) continue;
        if (PRODUCT_FIELD_RE.test(lines[j]) || IMG_RE.test(lines[j])) return true;
        break;
      }
    }

    // Non-heading, non-field, non-variant line — check if Brand field follows quickly
    if (!PRODUCT_FIELD_RE.test(line) && !VARIANT_LINE_RE.test(line) && !IMG_RE.test(line)) {
      for (let j = idx + 1; j < Math.min(idx + 4, lines.length); j++) {
        if (!lines[j].trim()) continue;
        if (PRODUCT_FIELD_RE.test(lines[j]) || IMG_RE.test(lines[j])) return true;
        break; // first non-blank line must be a product field
      }
    }

    return false;
  };

  for (let i = 0; i < lines.length; i++) {
    if (isProductStartLine(i)) {
      // Flush any accumulated text before starting a new product block
      if (currentLines.length > 0) {
        const pending = currentLines.join('\n');
        if (pending.trim()) segments.push(pending);
        currentLines = [];
      }
      inProduct = true;
      currentLines.push(lines[i]);
    } else if (inProduct) {
      const trimmed = lines[i].trim();
      const isProductLine =
        PRODUCT_FIELD_RE.test(lines[i]) ||
        VARIANT_LINE_RE.test(lines[i]) ||
        IMG_RE.test(lines[i]) ||
        /\[View Product/i.test(lines[i]) ||
        !trimmed; // blank lines within a product block are fine

      if (isProductLine) {
        currentLines.push(lines[i]);
      } else if (isProductStartLine(i)) {
        // Next product block starts immediately
        const pending = currentLines.join('\n');
        if (pending.trim()) segments.push(pending);
        currentLines = [lines[i]];
      } else {
        // Prose after a product block — flush and continue as prose
        const pending = currentLines.join('\n');
        if (pending.trim()) segments.push(pending);
        currentLines = [lines[i]];
        inProduct = false;
      }
    } else {
      currentLines.push(lines[i]);
    }
  }

  // Flush remaining
  if (currentLines.length > 0) {
    const pending = currentLines.join('\n');
    if (pending.trim()) segments.push(pending);
  }

  return segments;
}

/**
 * Parses a single product block string into a structured Product object.
 */
function parseProductBlock(blockText: string): Product | null {
  const lines = blockText.trim().split('\n');

  // Find the title line: first non-empty, non-field, non-variant, non-image line
  let titleLine = '';
  let titleLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    if (PRODUCT_FIELD_RE.test(l) || VARIANT_LINE_RE.test(l) || IMG_RE.test(l)) continue;
    titleLine = l;
    titleLineIdx = i;
    break;
  }

  let name = '';
  let url: string | undefined;

  const cleanTitle = titleLine.replace(/^###\s+/, '').trim();
  // Try standard markdown link: [Product Name](url)
  const stdMatch = cleanTitle.match(/\[(.*?)\]\(\s*\{?\s*(https?:\/\/[^\s\)\}]+)\s*\}?\s*\)/);
  // Pattern: Name (URL) — parens-style
  const parenMatch = cleanTitle.match(/(.*?)\s*\(\s*\{?\s*(https?:\/\/[^\s\)\}]+)\s*\}?\s*\)/);
  // Pattern: Name URL — plain space-separated URL appended
  const spaceMatch = cleanTitle.match(/^(.*?)\s+(https?:\/\/\S+)$/);

  if (stdMatch) {
    name = stdMatch[1].trim();
    url = stdMatch[2].trim();
  } else if (parenMatch) {
    name = parenMatch[1].trim();
    url = parenMatch[2].trim();
  } else if (spaceMatch) {
    name = spaceMatch[1].trim();
    url = spaceMatch[2].trim();
  } else {
    name = cleanTitle;
  }

  // Strip bare URLs that leaked into name
  name = name.replace(/\s*https?:\/\/\S+/g, '').trim();
  // Clean trailing default-title syntax
  name = name.replace(/\s*\[Default.*$/i, '').trim();

  let brand: string | undefined;
  let category: string | undefined;
  let price: string | undefined;
  let about: string | undefined;
  let imageUrl: string | undefined;
  const variants: ProductVariant[] = [];
  let inVariantsList = false;

  for (let i = 0; i < lines.length; i++) {
    if (i === titleLineIdx) continue; // skip title line
    const line = lines[i].trim();
    if (!line) continue;

    const brandMatch = line.match(/\*\*Brand\*\*?\s*:?\s*(.*)/i);
    if (brandMatch) { brand = brandMatch[1].trim(); inVariantsList = false; continue; }

    const categoryMatch = line.match(/\*\*Category\*\*?\s*:?\s*(.*)/i);
    if (categoryMatch) { category = categoryMatch[1].trim(); inVariantsList = false; continue; }

    const priceMatch = line.match(/\*\*Price\*\*?\s*:?\s*(.*)/i);
    if (priceMatch) { price = priceMatch[1].trim(); inVariantsList = false; continue; }

    const aboutMatch = line.match(/\*\*(?:About|Why this suits you)\*\*?\s*:?\s*(.*)/i);
    if (aboutMatch) { about = aboutMatch[1].trim(); inVariantsList = false; continue; }

    const imgMatch = line.match(/!\[.*?\]\((.*?)\)/);
    if (imgMatch) { imageUrl = imgMatch[1].trim(); continue; }

    if (
      line.match(/\*\*Available Options\/Variants\*\*?\s*:/i) ||
      line.match(/\*\*Available Options\*\*?\s*:/i) ||
      line.match(/\*\*Variants\*\*?\s*:/i) ||
      line.match(/Available Options\/Variants\s*:/i) ||
      line.match(/Available Options\s*:/i) ||
      line.match(/Variants\s*:/i)
    ) {
      inVariantsList = true;
      continue;
    }

    if (inVariantsList && (line.startsWith('*') || line.startsWith('-'))) {
      const cleanLine = line.replace(/^[\*\-]\s+/, '').trim();

      // Strip price info like "(Price: HKD 395.0)" or "(Price: INR 500)" from variant label
      const cleanVariantTitle = (t: string) =>
        t.replace(/\s*\(Price:\s*[A-Z]{0,3}\s*[\d.,]+\)/gi, '')
         .replace(/\s*Price:\s*[A-Z]{0,3}\s*[\d.,]+/gi, '')
         .trim();

      // Try standard markdown link: - [variant_title](url)
      const variantStdMatch = cleanLine.match(/\[(.*?)\]\(\s*\{?\s*(https?:\/\/[^\s\)\}]+)\s*\}?\s*\)/);
      // Try parenthesis link without brackets: - variant_title (url)
      const variantParenMatch = cleanLine.match(/(.*?)\s*\(\s*\{?\s*(https?:\/\/[^\s\)\}]+)\s*\}?\s*\)/);

      if (variantStdMatch) {
        variants.push({ title: cleanVariantTitle(variantStdMatch[1]), url: variantStdMatch[2].trim() });
      } else if (variantParenMatch) {
        variants.push({ title: cleanVariantTitle(variantParenMatch[1]), url: variantParenMatch[2].trim() });
      } else {
        const variantValue = cleanVariantTitle(cleanLine);
        if (variantValue) variants.push({ title: variantValue });
      }
      continue;
    }

    if (inVariantsList && line.startsWith('**')) {
      inVariantsList = false;
    }

    // Fallback: extract URL from [View Product →](url) if url not yet found
    if (!url) {
      const viewProductMatch = line.match(/\[View Product[^\]]*\]\(\s*(https?:\/\/[^\s\)]+)\s*\)/i);
      if (viewProductMatch) {
        url = viewProductMatch[1].trim();
      }
    }
  }

  if (name) {
    return {
      name,
      url,
      brand,
      category,
      price,
      about,
      imageUrl,
      variants: variants.length > 0 ? variants : undefined,
      originalMarkdown: blockText,
    };
  }

  return null;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text }) => {
  if (!text) return null;
  console.log('[MarkdownRenderer] Raw text received:', text);

  const segments = splitIntoSegments(text);
  console.log('[MarkdownRenderer] Segments:', segments.length, segments.map(s => s.slice(0, 60)));

  const renderedElements: React.ReactNode[] = [];
  let currentProductGroup: Product[] = [];
  let groupKey = 0;

  const flushProductGroup = () => {
    if (currentProductGroup.length > 0) {
      const productsToRender = [...currentProductGroup];
      const currentGroupKey = `product-group-${groupKey++}`;
      renderedElements.push(
        <div key={currentGroupKey} className="products-container">
          {productsToRender.map((prod, idx) => (
            <ProductRecommendationCard
              key={`${currentGroupKey}-${idx}`}
              product={prod}
            />
          ))}
        </div>
      );
      currentProductGroup = [];
    }
  };

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment.trim()) continue;

    if (isProductBlock(segment)) {
      const parsed = parseProductBlock(segment);
      console.log(`[MarkdownRenderer] Segment ${i} parsed as product:`, parsed?.name);
      if (parsed) {
        currentProductGroup.push(parsed);
      } else {
        flushProductGroup();
        renderedElements.push(renderMarkdownBlock(segment, `block-${i}`));
      }
    } else {
      flushProductGroup();
      renderedElements.push(renderMarkdownBlock(segment, `block-${i}`));
    }
  }

  // Final flush
  flushProductGroup();

  return <div className="markdown-renderer">{renderedElements}</div>;
};
