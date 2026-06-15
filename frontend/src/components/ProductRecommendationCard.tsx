import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';

export interface ProductVariant {
  title: string;
  url?: string;
}

export interface Product {
  name: string;
  url?: string;
  brand?: string;
  category?: string;
  price?: string;
  about?: string;
  imageUrl?: string;
  variants?: ProductVariant[];
  originalMarkdown?: string;
}

interface ProductRecommendationCardProps {
  product: Product;
}

const getHealthBenefitTags = (name: string, category?: string): string[] => {
  const title = name.toLowerCase();
  const cat = (category || "").toLowerCase();
  const tags: string[] = [];

  if (title.includes("creatine") || title.includes("amino") || title.includes("collagen powder")) {
    tags.push("Muscle & Strength");
  }
  if (title.includes("electrolyte") || title.includes("lmnt") || title.includes("salty")) {
    tags.push("Hydration");
  }
  if (title.includes("david") || title.includes("chocolate") || title.includes("bar") || title.includes("biltong")) {
    tags.push("Clean Protein");
  }
  if (title.includes("resveratrol") || title.includes("ubiquinol") || title.includes("niacel") || title.includes("glutathione")) {
    tags.push("Cellular Longevity");
  }
  if (title.includes("adr formula") || title.includes("phosphatidylserine") || title.includes("b-complex") || title.includes("women's nutrients")) {
    tags.push("Cognitive & Stress");
  }
  if (title.includes("duvet") || title.includes("sheet") || title.includes("bamboo")) {
    tags.push("Sleep Hygiene");
  }
  if (title.includes("butyrate") || title.includes("dgl plus") || title.includes("omega") || title.includes("coriolus")) {
    tags.push("Gut & Immune");
  }

  if (tags.length === 0) {
    if (cat.includes("food") || cat.includes("drink")) {
      tags.push("Functional Food");
    } else {
      tags.push("Clinical Grade");
    }
  }

  return tags.slice(0, 1);
};

export const ProductRecommendationCard: React.FC<ProductRecommendationCardProps> = ({ product }) => {
  const { name, url, brand, category, price, about, imageUrl, variants } = product;
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Set first variant as default if available
  useEffect(() => {
    if (variants && variants.length > 0 && !selectedVariant) {
      setSelectedVariant(variants[0]);
    }
  }, [variants, selectedVariant]);

  // Determine the best available store URL (prefer product-level URL, fallback to variant URL)
  const bestUrl = url || selectedVariant?.url;

  // Handle clean price display
  const formattedPrice = price ? price.replace(/^(INR|Rs\.?)\s*/i, '₹') : '';

  // Trigger search on google or typical redirect url for the product view button
  const handleViewProduct = () => {
    // 1. Check if selected variant has a direct URL, and it is NOT a default title variant
    if (selectedVariant?.url && !selectedVariant.title.toLowerCase().includes('default title')) {
      window.open(selectedVariant.url, '_blank', 'noopener,noreferrer');
      return;
    }
    // 2. Check if product itself has a direct URL
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    // 3. Fallback to the variant URL as a last-resort direct link (even if it is Default Title)
    if (selectedVariant?.url) {
      window.open(selectedVariant.url, '_blank', 'noopener,noreferrer');
      return;
    }
    // 4. Fallback to Google Shopping
    const searchQuery = encodeURIComponent(`${brand || ''} ${name} ${selectedVariant?.title || ''}`);
    const fallbackUrl = `https://www.google.com/search?q=${searchQuery}&tbm=shop`;
    window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="product-card animate-slide-up">
      {/* Product Image Section */}
      <div className="product-image-container">
        {!imageLoaded && !imageError && <div className="skeleton" />}
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
            className={`product-image ${imageLoaded ? 'loaded' : ''}`}
          />
        ) : (
          // Fallback illustration/placeholder
          <div className="skeleton" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--text-muted) / 0.05)' }}>
            <Package size={48} className="text-muted" style={{ opacity: 0.3, color: 'hsl(var(--text-muted))' }} />
          </div>
        )}
      </div>

      {/* Product Details Section */}
      <div className="product-card-body">
        <div className="product-badge-row">
          {brand && <span className="product-badge brand">{brand}</span>}
          {category && <span className="product-badge category">{category}</span>}
          {getHealthBenefitTags(name, category).map(tag => (
            <span key={tag} className="product-badge benefit">{tag}</span>
          ))}
        </div>

        <h3 className="product-title">
          {bestUrl ? (
            <a 
              href={bestUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: 'inherit', textDecoration: 'none' }}
              title={`View ${name}`}
            >
              {name}
            </a>
          ) : (
            name
          )}
        </h3>

        {formattedPrice && (
          <div className="product-price-tag">
            {formattedPrice}
          </div>
        )}

        {about && <p className="product-description">{about}</p>}

        {/* Variants Section */}
        {variants && variants.length > 0 && !(variants.length === 1 && (variants[0].title.toLowerCase() === 'default title' || variants[0].title.toLowerCase().includes('default title'))) && (
          <div className="product-variants-section">
            <span className="variants-title">Available Options</span>
            <div className="variants-list">
              {variants.map((variant) => (
                <button
                  key={variant.title}
                  className={`variant-chip ${selectedVariant?.title === variant.title ? 'active' : ''}`}
                  onClick={() => setSelectedVariant(variant)}
                >
                  {variant.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="product-actions-row">
          <button className="product-action-btn" onClick={handleViewProduct}>
            View
          </button>
        </div>
      </div>
    </div>
  );
};

