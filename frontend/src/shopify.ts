import { SHOPIFY_ENDPOINT, SHOPIFY_STOREFRONT_ACCESS_TOKEN } from "./config";

export interface ShopifyImage {
  url: string;
  altText: string | null;
}

export interface MoneyV2 {
  amount: string;
  currencyCode: string;
}

export interface SelectedOption {
  name: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  price: MoneyV2;
  compareAtPrice: MoneyV2 | null;
  selectedOptions: SelectedOption[];
  image: ShopifyImage | null;
  availableForSale: boolean;
}

export interface ProductOption {
  name: string;
  values: string[];
}

export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  descriptionHtml: string;
  handle: string;
  productType: string;
  vendor: string;
  availableForSale: boolean;
  onlineStoreUrl: string | null;
  priceRange: {
    minVariantPrice: MoneyV2;
    maxVariantPrice: MoneyV2;
  };
  images: {
    nodes: ShopifyImage[];
  };
  variants: {
    nodes: ProductVariant[];
  };
  options: ProductOption[];
}

const GET_ALL_PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes {
        id
        title
        description
        descriptionHtml
        handle
        productType
        vendor
        availableForSale
        onlineStoreUrl
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 10) {
          nodes {
            url
            altText
          }
        }
        variants(first: 20) {
          nodes {
            id
            title
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
            selectedOptions {
              name
              value
            }
            image {
              url
              altText
            }
            availableForSale
          }
        }
        options {
          name
          values
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export interface FetchProductsResponse {
  products: {
    nodes: ShopifyProduct[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

export class ShopifyStorefrontClient {
  private endpoint: string;
  private token: string;

  constructor(endpoint = SHOPIFY_ENDPOINT, token = SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
    this.endpoint = endpoint;
    this.token = token;
  }

  async executeQuery<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": this.token,
      "Authorization": "Basic Og==",
    };

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    if (json.errors) {
      throw new Error(JSON.stringify(json.errors, null, 2));
    }

    return json.data as T;
  }

  async fetchAllProducts(pageSize = 50): Promise<ShopifyProduct[]> {
    const allProducts: ShopifyProduct[] = [];
    let cursor: string | null = null;

    while (true) {
      const result: FetchProductsResponse = await this.executeQuery<FetchProductsResponse>(GET_ALL_PRODUCTS_QUERY, {
        first: pageSize,
        after: cursor,
      });

      const pageProducts: FetchProductsResponse['products'] = result.products;
      allProducts.push(...pageProducts.nodes);

      if (!pageProducts.pageInfo.hasNextPage) {
        break;
      }

      cursor = pageProducts.pageInfo.endCursor;
      // Small delay to respect rate limit
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    return allProducts;
  }
}
