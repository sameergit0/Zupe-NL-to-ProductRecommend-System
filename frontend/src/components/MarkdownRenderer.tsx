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
 * Checks if a block of markdown text starting with `### ` is structured as a product recommendation card.
 * Uses a heuristics match for product fields like Brand, Price, About, Category, or Images.
 */
function isProductBlock(blockText: string): boolean {
  const trimmed = blockText.trim();

  const hasBrand = /\*\*Brand\*\*?\s*:?/i.test(trimmed);
  const hasPrice = /\*\*Price\*\*?\s*:?/i.test(trimmed);
  const hasAbout = /\*\*(?:About|Why this suits you)\*\*?\s*:?/i.test(trimmed);
  const hasCategory = /\*\*Category\*\*?\s*:?/i.test(trimmed);
  const hasImage = /!\[.*?\]\((.*?)\)/.test(trimmed);

  let matches = 0;
  if (hasBrand) matches++;
  if (hasPrice) matches++;
  if (hasAbout) matches++;
  if (hasCategory) matches++;
  if (hasImage) matches++;

  return matches >= 2;
}

/**
 * Parses a single product block string into a structured Product object.
 */
function parseProductBlock(blockText: string): Product | null {
  const trimmed = blockText.trim();

  const lines = trimmed.split('\n');
  const titleLine = lines[0];
  
  let name = '';
  let url: string | undefined;

  // Try standard markdown link anywhere in the line: [Product Name](url)
  const cleanTitle = titleLine.replace(/^###\s+/, '').trim();
  const stdMatch = cleanTitle.match(/\[(.*?)\]\(\s*\{?\s*(https?:\/\/[^\s\)\}]+)\s*\}?\s*\)/);
  // Pattern: Name (URL) — parens-style
  const parenMatch = cleanTitle.match(/(.*?)\s*\(\s*\{?\s*(https?:\/\/[^\s\)\}]+)\s*\}?\s*\)/);
  // Pattern: Name URL — plain space-separated URL appended (LLM sometimes does this)
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

  // Strip any bare URL that may have leaked into the name (safety net)
  name = name.replace(/\s*https?:\/\/\S+/g, '').trim();
  // Clean trailing default-title syntax if any
  name = name.replace(/\s*\[Default.*$/i, '').trim();

  let brand: string | undefined;
  let category: string | undefined;
  let price: string | undefined;
  let about: string | undefined;
  let imageUrl: string | undefined;
  const variants: ProductVariant[] = [];

  let inVariantsList = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const brandMatch = line.match(/\*\*Brand\*\*?\s*:?\s*(.*)/i);
    if (brandMatch) {
      brand = brandMatch[1].trim();
      continue;
    }

    const categoryMatch = line.match(/\*\*Category\*\*?\s*:?\s*(.*)/i);
    if (categoryMatch) {
      category = categoryMatch[1].trim();
      continue;
    }

    const priceMatch = line.match(/\*\*Price\*\*?\s*:?\s*(.*)/i);
    if (priceMatch) {
      price = priceMatch[1].trim();
      continue;
    }

    const aboutMatch = line.match(/\*\*(?:About|Why this suits you)\*\*?\s*:?\s*(.*)/i);
    if (aboutMatch) {
      about = aboutMatch[1].trim();
      continue;
    }

    const imgMatch = line.match(/!\[.*?\]\((.*?)\)/);
    if (imgMatch) {
      imageUrl = imgMatch[1].trim();
      continue;
    }

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
      // 1. Try standard markdown link: - [variant_title](url)
      const cleanLine = line.replace(/^[\*\-]\s+/, '').trim();
      const variantStdMatch = cleanLine.match(/\[(.*?)\]\(\s*\{?\s*(https?:\/\/[^\s\)\}]+)\s*\}?\s*\)/);
      
      // 2. Try parenthesis link without brackets: - variant_title (url)
      const variantParenMatch = cleanLine.match(/(.*?)\s*\(\s*\{?\s*(https?:\/\/[^\s\)\}]+)\s*\}?\s*\)/);

      if (variantStdMatch) {
        const vTitle = variantStdMatch[1].trim();
        const vUrl = variantStdMatch[2].trim();
        variants.push({
          title: vTitle,
          url: vUrl
        });
      } else if (variantParenMatch) {
        const vTitle = variantParenMatch[1].trim();
        const vUrl = variantParenMatch[2].trim();
        variants.push({
          title: vTitle,
          url: vUrl
        });
      } else {
        const variantValue = line.replace(/^[\*\-]\s*/, '').trim();
        if (variantValue) {
          variants.push({
            title: variantValue
          });
        }
      }
      continue;
    }

    if (inVariantsList && line.startsWith('**')) {
      inVariantsList = false;
    }

    // Fallback: extract URL from the [View Product →](url) line if url not yet found
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
  console.log("[MarkdownRenderer] Raw text received:", text);

  // Split response by headings matching "### " or lines followed by "**Brand**:"
  // Using lookahead split keeps the separator/title in each resulting segment
  const segments = text.split(/(?=###\s+)|(?=^[^\n]+\r?\n\*\*Brand\*\*)/gmi);

  // If we have product blocks, check if the last segment contains trailing non-product text (like a followup question)
  if (segments.length > 1) {
    const lastIdx = segments.length - 1;
    const lastSegment = segments[lastIdx];
    
    if (isProductBlock(lastSegment)) {
      const lines = lastSegment.split('\n');
      let lastProductLineIndex = -1;
      for (let j = 0; j < lines.length; j++) {
        const line = lines[j].trim();
        if (
          line.startsWith('###') ||
          /Brand/i.test(line) ||
          /Category/i.test(line) ||
          /Price/i.test(line) ||
          /Why this suits you/i.test(line) ||
          /About/i.test(line) ||
          line.includes('![') ||
          /View Product/i.test(line) ||
          /Available Options/i.test(line) ||
          /Variants/i.test(line) ||
          line.startsWith('-') ||
          line.startsWith('*')
        ) {
          lastProductLineIndex = j;
        }
      }
      
      if (lastProductLineIndex !== -1 && lastProductLineIndex < lines.length - 1) {
        const productPart = lines.slice(0, lastProductLineIndex + 1).join('\n');
        const trailingPart = lines.slice(lastProductLineIndex + 1).join('\n');
        
        segments[lastIdx] = productPart;
        if (trailingPart.trim()) {
          segments.push(trailingPart);
        }
      }
    }
  }

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
      console.log(`[MarkdownRenderer] Segment ${i} parsed as product:`, parsed);
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

  // Final flush to catch any remaining product recommendations
  flushProductGroup();

  return <div className="markdown-renderer">{renderedElements}</div>;
};
