export const SHOPIFY_BASE_URL = import.meta.env.VITE_SHOPIFY_BASE_URL || "https://zupe-stage.myshopify.com";
export const SHOPIFY_STOREFRONT_ACCESS_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN || "a7e86996b2bc04ca1867f4dde09151e7";
export const SHOPIFY_API_VERSION = import.meta.env.VITE_SHOPIFY_API_VERSION || "2026-01";

export const SHOPIFY_ENDPOINT = `${SHOPIFY_BASE_URL.replace(/\/$/, "")}/api/${SHOPIFY_API_VERSION}/graphql.json`;

export const CHATBOT_MODE: "full" | "half" = "half"; // Change to "full" for full-screen desktop web view

