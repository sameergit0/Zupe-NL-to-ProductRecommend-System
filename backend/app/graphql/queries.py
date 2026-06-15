GET_ALL_PRODUCTS_QUERY = """
query GetAllProducts($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    pageInfo {
      hasNextPage
      endCursor
    }

    nodes {
      id
      title
      handle
      vendor
      productType

      availableForSale
      isGiftCard

      createdAt
      updatedAt
      publishedAt

      onlineStoreUrl

      description
      descriptionHtml

      tags

      category {
        id
        name
      }

      seo {
        title
        description
      }

      featuredImage {
        id
        url
        altText
        width
        height
      }

      images(first: 250) {
        nodes {
          id
          url
          altText
          width
          height
        }
      }

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

      compareAtPriceRange {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }

      options {
        id
        name

        optionValues {
          name
        }
      }

      variants(first: 250) {
        nodes {
          id
          title

          sku
          barcode

          availableForSale
          currentlyNotInStock

          requiresShipping
          taxable

          weight
          weightUnit

          price {
            amount
            currencyCode
          }

          compareAtPrice {
            amount
            currencyCode
          }

          image {
            id
            url
            altText
          }

          selectedOptions {
            name
            value
          }
        }
      }

      collections(first: 250) {
        nodes {
          id
          title
          handle
          description
          onlineStoreUrl
        }
      }
    }
  }
}
"""
