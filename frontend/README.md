# Zupe Standalone Chatbot Widget

This directory houses the standalone **Zupe Sage** Chatbot Widget built with **React**, **TypeScript**, and **Vite**. It is designed as a lightweight, embeddable widget that can be injected into any custom storefront or standard Shopify themes.

---

## ✨ Features

- **Conversational Wellness Guide**: Custom AI assistant powered by SSE token streaming from the FastAPI backend.
- **Vibrant & Glassmorphic UI**: Beautiful gradients, premium dark accents, micro-animations, and custom skeleton loaders.
- **Direct Storefront Navigation**: Renders rich product cards with a primary, full-width **View** button that links the customer directly to the product page or selected variant URL.
- **Decoupled Controller**: The floating launcher button (`#zupe-chat-trigger`) has been hidden (`display: none !important`) because widget visibility is managed externally by the storefront's header button (`Ask Zupe`).
- **PostMessage Event Loop**:
  - Listens for `'open-zupe-chatbot'` to slide out the iframe overlay.
  - Listens for `'close-zupe-chatbot'` to slide the iframe back.
  - Notifies the parent page of chatbot configuration and status changes.
- **Zero-Friction Focus UX**: 
  - Submitting a message automatically keeps/refocuses the text cursor back in the input area once the assistant transitions from a thinking/loading state.
  - Clicking anywhere on the chat widget container (outside buttons or links) instantly focuses the typing cursor in the textarea.
  - Opening the chat widget from the launcher button sends a message event to auto-focus the textarea.
- **Centered Header (Half-Screen Mode)**: Centers the advisor title ("Zupe Sage") and places the Close/Dismiss button (`X`) on the far-right to match standard premium mobile/desktop chat drawers.

---

## 🌳 Directory Structure

```
frontend/
├── public/
│   └── widget.js             # Embeddable script to load the chatbot widget on external sites
├── src/
│   ├── components/           # Chat Widget UI components
│   │   ├── ChatHeader.tsx    # Header with title and clear-history controls
│   │   ├── ChatInput.tsx     # Message input box with auto-resizing and auto-focus
│   │   ├── ChatWidget.tsx    # Core chat container, message loop, and click-to-focus handler
│   │   ├── MarkdownRenderer.tsx # Renders streaming markdown content and maps recommended products
│   │   ├── MessageBubble.tsx # Renders user vs assistant message nodes
│   │   ├── ProductRecommendationCard.tsx # Renders rich product suggestions with a primary "View" button
│   │   ├── SuggestedPrompts.tsx # Prompts shown in empty chat state
│   │   └── TypingIndicator.tsx # Custom loading and thinking animations
│   ├── services/
│   │   └── chatService.ts    # Service to handle SSE connection and chunk-by-chunk token streams
│   ├── shopify.ts            # Client to communicate with Shopify Storefront API (catalog details)
│   ├── App.tsx               # Main widget mounting component
│   ├── index.css             # Main styling system, variables, and typography definitions
│   └── main.tsx              # DOM bootstrapper
├── index.html                # Standalone HTML container page
├── vite.config.ts            # Vite configuration
└── tsconfig.json             # TypeScript compiler settings
```

---

## 🚀 Running the Widget Locally

Ensure you have Node.js installed, then execute:

```bash
# 1. Install dependencies
npm install

# 2. Run the Vite development server (runs on port 5174)
npm run dev
```

---

## 🔌 Integrating the Widget on Storefronts

To embed this chat widget on the `zupe_store` production storefront, load the following snippet in its HTML:

```html
<script src="http://localhost:5174/widget.js" defer></script>
```

This script handles creating the overlay iframe, injecting the stylesheet, and setting up postMessage triggers between the main store page and the chatbot app.
