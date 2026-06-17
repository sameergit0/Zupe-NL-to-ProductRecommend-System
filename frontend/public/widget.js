(function () {
  // 1. Resolve the widget host origin from the script URL dynamically
  var scriptUrl = document.currentScript ? document.currentScript.src : '';
  var widgetOrigin = "http://localhost:5174"; // Default fallback for local testing
  var chatbotMode = "half"; // Default display format mode
  try {
    if (scriptUrl) {
      var parsedUrl = new URL(scriptUrl);
      widgetOrigin = parsedUrl.origin;
    }
  } catch (e) {
    console.error("[Zupe Widget] Failed to parse script source origin:", e);
  }

  // 2. Inject standard styling for the widget components
  var style = document.createElement('style');
  style.innerHTML = `
    #zupe-chat-iframe {
      position: fixed;
      bottom: 96px;
      right: 24px;
      z-index: 2147483647; /* Ensure it is above all page contents */
      border: none;
      border-radius: 24px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
      visibility: hidden;
      pointer-events: none;
      opacity: 0;
      width: 470px;
      height: 610px;
      overflow: hidden !important;
      transform: translateY(16px) scale(0.96);
      transform-origin: bottom right;
      transition: opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                  transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                  visibility 0s linear 0.28s;
    }
    #zupe-chat-iframe.widget-open {
      visibility: visible;
      pointer-events: auto;
      opacity: 1;
      transform: translateY(0) scale(1);
      transition: opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                  transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                  visibility 0s linear 0s;
    }
    #zupe-chat-trigger {
      display: none !important;
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 10000;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #1e1919; /* Matched to Zupe premium black theme */
      border: none;
      color: #fff;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(30, 25, 25, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
                  box-shadow 0.25s ease,
                  background-color 0.2s ease;
    }
    #zupe-chat-trigger:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 6px 24px rgba(30, 25, 25, 0.45);
    }
    #zupe-chat-trigger:active {
      transform: scale(0.92);
      transition: transform 0.1s ease;
    }
    #zupe-chat-trigger .trigger-icon {
      display: inline-flex;
      transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
                  opacity 0.2s ease;
    }
    @media (max-width: 520px) {
      #zupe-chat-iframe {
        width: 100% !important;
        height: 100% !important;
        right: 0 !important;
        bottom: 0 !important;
        border-radius: 20px !important;
        transform-origin: bottom center;
      }
    }
  `;
  document.head.appendChild(style);

  // 3. Create Iframe dynamically
  var iframe = document.createElement('iframe');
  iframe.id = 'zupe-chat-iframe';
  iframe.src = widgetOrigin;
  iframe.setAttribute('allow', 'clipboard-write');
  document.body.appendChild(iframe);

  // 4. Create Launcher Button dynamically
  var trigger = document.createElement('button');
  trigger.id = 'zupe-chat-trigger';
  var iconSpan = document.createElement('span');
  iconSpan.className = 'trigger-icon';
  iconSpan.innerText = '💬';
  trigger.appendChild(iconSpan);
  document.body.appendChild(trigger);

  // 5. Toggle behavior
  trigger.onclick = function () {
    var isOpen = iframe.classList.contains('widget-open');
    if (isOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  };

  var originalOverflowBody = '';
  var originalOverflowHtml = '';

  function openWidget() {
    // Apply size/position before triggering animation
    if (chatbotMode === 'full' || window.innerWidth <= 520) {
      // Prevent background page scrolling
      if (!originalOverflowBody) originalOverflowBody = document.body.style.overflow || 'auto';
      if (!originalOverflowHtml) originalOverflowHtml = document.documentElement.style.overflow || 'auto';
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      iframe.style.width = '100vw';
      iframe.style.height = '100vh';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.borderRadius = window.innerWidth <= 520 ? '20px' : '24px';
      iframe.style.transformOrigin = 'center center';
      trigger.style.display = 'none';
    } else {
      // Restore page scrolling
      if (originalOverflowBody) {
        document.body.style.overflow = originalOverflowBody;
        originalOverflowBody = '';
      }
      if (originalOverflowHtml) {
        document.documentElement.style.overflow = originalOverflowHtml;
        originalOverflowHtml = '';
      }

      iframe.style.width = '470px';
      iframe.style.height = '610px';
      iframe.style.top = 'auto';
      iframe.style.left = 'auto';
      iframe.style.right = '24px';
      iframe.style.bottom = '96px';
      iframe.style.borderRadius = '24px';
      iframe.style.transformOrigin = 'bottom right';
      trigger.style.display = 'flex';
    }

    // Trigger open animation via CSS class
    // Use rAF to ensure layout is applied before adding the class
    requestAnimationFrame(function () {
      iframe.classList.add('widget-open');
    });

    // Morph trigger icon to close
    iconSpan.style.transform = 'rotate(90deg)';
    iconSpan.style.opacity = '0';
    setTimeout(function () {
      iconSpan.innerText = '✕';
      iconSpan.style.transform = 'rotate(0deg)';
      iconSpan.style.opacity = '1';
    }, 150);

    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage('widget-opened', '*');
    }
  }

  function closeWidget() {
    // Restore page scrolling
    if (originalOverflowBody) {
      document.body.style.overflow = originalOverflowBody;
      originalOverflowBody = '';
    }
    if (originalOverflowHtml) {
      document.documentElement.style.overflow = originalOverflowHtml;
      originalOverflowHtml = '';
    }

    // Trigger close animation via removing CSS class
    iframe.classList.remove('widget-open');

    // Morph trigger icon back to chat
    iconSpan.style.transform = 'rotate(-90deg)';
    iconSpan.style.opacity = '0';
    setTimeout(function () {
      iconSpan.innerText = '💬';
      iconSpan.style.transform = 'rotate(0deg)';
      iconSpan.style.opacity = '1';
    }, 150);

    trigger.style.display = 'flex';
  }

  // 6. Listen for events from iframe
  window.addEventListener('message', function (event) {
    // Verify source is indeed from our widget iframe origin or local test origins
    if (event.origin !== widgetOrigin && !event.origin.includes('localhost') && !event.origin.includes('127.0.0.1')) {
      return;
    }

    if (event.data === 'close-zupe-chatbot') {
      closeWidget();
    } else if (event.data === 'open-zupe-chatbot') {
      openWidget();
    } else if (event.data && typeof event.data === 'object' && event.data.type === 'set-chatbot-mode') {
      chatbotMode = event.data.mode;
      if (iframe.classList.contains('widget-open')) {
        openWidget();
      }
    }
  });
})();
