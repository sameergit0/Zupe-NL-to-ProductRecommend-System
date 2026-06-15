(function () {
  // 1. Resolve the widget host origin from the script URL dynamically
  var scriptUrl = document.currentScript ? document.currentScript.src : '';
  var widgetOrigin = "http://localhost:5174"; // Default fallback for local testing
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
      z-index: 9999;
      border: none;
      border-radius: 16px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
      visibility: hidden;
      pointer-events: none;
      transition: all 0.3s ease;
      opacity: 0;
      width: 470px;
      height: 610px;
    }
    #zupe-chat-trigger {
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
      transition: all 0.2s ease;
    }
    #zupe-chat-trigger:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 6px 20px rgba(30, 25, 25, 0.45);
    }
    #zupe-chat-trigger:active {
      transform: scale(0.95);
    }
    @media (max-width: 520px) {
      #zupe-chat-iframe {
        width: calc(100% - 48px);
        height: calc(100% - 132px);
        right: 24px;
        bottom: 96px;
        border-radius: 12px;
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
  trigger.innerText = '💬';
  document.body.appendChild(trigger);

  // 5. Toggle behavior
  trigger.onclick = function () {
    var open = iframe.style.visibility === 'visible';
    if (open) {
      closeWidget();
    } else {
      openWidget();
    }
  };

  function openWidget() {
    iframe.style.visibility = 'visible';
    iframe.style.opacity = '1';
    iframe.style.pointerEvents = 'auto';
    trigger.innerText = '✕';
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage('widget-opened', '*');
    }
  }

  function closeWidget() {
    iframe.style.visibility = 'hidden';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    trigger.innerText = '💬';
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
    }
  });
})();
