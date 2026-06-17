import React, { useState, useEffect, useRef } from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from './MessageBubble';
import { SuggestedPrompts } from './SuggestedPrompts';
import { TypingIndicator } from './TypingIndicator';
import { streamChat } from '../services/chatService';
import { CHATBOT_MODE } from '../config';
import { ArrowDown } from 'lucide-react';

export const ChatWidget: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [animTheme, setAnimTheme] = useState<'chat' | 'search'>('chat');
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 520);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 520);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveMode = (CHATBOT_MODE === 'full' || isMobileView) ? 'full' : 'half';

  // Start with a new session state on every page load
  const [sessionId, setSessionId] = useState<string | null>(null);

  const lastUserMessageRef = useRef<string | null>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const tokensReceivedRef = useRef<number>(0);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const handleScroll = () => {
    if (chatAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatAreaRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      setShowScrollButton(!isNearBottom);
    }
  };

  const scrollToBottom = () => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTo({
        top: chatAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // Sync the configured chatbot mode with the host page
  useEffect(() => {
    console.log(`[ChatWidget] Syncing chatbot mode: ${CHATBOT_MODE}`);
    window.parent.postMessage({ type: 'set-chatbot-mode', mode: CHATBOT_MODE }, '*');
  }, [CHATBOT_MODE]);

  // Reset state on component mount (page load/refresh) to ensure a fresh session
  useEffect(() => {
    console.log("[ChatWidget] Component mounted. Resetting session and messages.");
    setMessages([]);
    setSessionId(null);
  }, []);

  // Auto-scroll chat area:
  // - If the current conversation turn (user message + AI response) fits completely within the viewport,
  //   we scroll to the bottom of the message content (keeping previous messages visible above).
  // - If the response is too long and overflows, we scroll the user message to the top of the viewport.
  useEffect(() => {
    if (messages.length > 0) {
      const lastUserMessage = [...messages].reverse().find(m => m.sender === 'user');
      if (lastUserMessage) {
        const scrollFunc = () => {
          const el = document.getElementById(`msg-${lastUserMessage.id}`);
          if (el && chatAreaRef.current) {
            const containerTop = chatAreaRef.current.getBoundingClientRect().top;
            const elementTop = el.getBoundingClientRect().top;
            const elementScrollPosition = elementTop - containerTop + chatAreaRef.current.scrollTop;

            const clientHeight = chatAreaRef.current.clientHeight;
            const contentHeight = chatAreaRef.current.scrollHeight;
            const turnHeight = contentHeight - elementScrollPosition;

            if (turnHeight <= clientHeight) {
              // The current turn fits completely. Scroll to the bottom of the actual content.
              chatAreaRef.current.scrollTop = Math.max(0, contentHeight - clientHeight);
            } else {
              // The response is too long. Scroll the user's message to the top.
              chatAreaRef.current.scrollTop = elementScrollPosition - 12;
            }
          }
        };
        scrollFunc();
        const timer = setTimeout(scrollFunc, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [messages]);

  // Manage conversation history in state
  const saveChatHistory = (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    tokensReceivedRef.current = 0;
    setLoading(true);
    setAnimTheme('chat');
    lastUserMessageRef.current = text;

    // Create unique ID for the user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMsg];
    saveChatHistory(updatedMessages);

    // Create placeholder ID for assistant response
    const botMsgId = `bot-${Date.now()}`;
    let botResponseText = '';

    // Set up AbortController for request cancellation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    await streamChat(
      {
        message: text,
        session_id: sessionId,
      },
      {
        onStart: (newSessionId) => {
          setSessionId(newSessionId);
        },
        onStatus: (status) => {
          if (status === 'searching') {
            setAnimTheme('search');
          } else if (status === 'thinking') {
            setAnimTheme('chat');
          }
        },
        onNode: (nodeName) => {
          // search theme: product retrieval path
          if (['extract_intent', 'vector_search', 'recommend_products'].includes(nodeName)) {
            setAnimTheme('search');
          } else if (['general_qa', 'ask_followup'].includes(nodeName)) {
            // chat theme: general_qa, ask_followup paths
            setAnimTheme('chat');
          }
        },
        onToken: (token) => {
          tokensReceivedRef.current += 1;
          botResponseText += token;
          // Dynamically append or update the last bot message
          const currentBotMsg: ChatMessage = {
            id: botMsgId,
            sender: 'assistant',
            text: botResponseText,
            timestamp: new Date(),
          };

          // Check if we already have the bot message in the array
          const index = updatedMessages.findIndex((m) => m.id === botMsgId);
          if (index !== -1) {
            const temp = [...updatedMessages];
            temp[index] = currentBotMsg;
            setMessages(temp);
          } else {
            setMessages([...updatedMessages, currentBotMsg]);
          }
        },
        onDone: () => {
          // Finalize state
          setLoading(false);
          setAnimTheme('chat');

          // Save the completed conversation
          const finalMessages = [...updatedMessages];
          const botIndex = finalMessages.findIndex((m) => m.id === botMsgId);
          if (botIndex !== -1) {
            finalMessages[botIndex].text = botResponseText;
          } else if (botResponseText) {
            finalMessages.push({
              id: botMsgId,
              sender: 'assistant',
              text: botResponseText,
              timestamp: new Date(),
            });
          }
          saveChatHistory(finalMessages);
        },
        onError: (errMessage) => {
          setLoading(false);
          setAnimTheme('chat');
          console.error('[ChatWidget] streamChat error:', errMessage);

          const errorBotMsg: ChatMessage = {
            id: `bot-error-${Date.now()}`,
            sender: 'assistant',
            text: 'I am sorry, but I am having trouble connecting to my services right now. Please check your internet connection and try again.',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorBotMsg]);
        },
      },
      abortControllerRef.current.signal
    );
  };

  const handleStopResponse = () => {
    console.log("[ChatWidget] Stop response requested by user.");
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (tokensReceivedRef.current === 0) {
      const stoppedMsg: ChatMessage = {
        id: `bot-stopped-${Date.now()}`,
        sender: 'assistant',
        text: 'Response stopped by user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, stoppedMsg]);
    }

    setLoading(false);
    setAnimTheme('chat');
  };

  const handleClearHistory = () => {
    console.log("[ChatWidget] handleClearHistory called. Clearing messages and sessionId.");
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setSessionId(null);

    setLoading(false);
    // State is reset locally
  };

  useEffect(() => {
    const handleMessageEvent = (event: MessageEvent) => {
      if (event.data) {
        if (typeof event.data === 'object') {
          if (event.data.type === 'SEND_MESSAGE') {
            console.log("[ChatWidget] Received SEND_MESSAGE signal:", event.data.text);
            handleSendMessage(event.data.text);
            window.parent.postMessage('open-zupe-chatbot', '*');
          } else if (event.data.type === 'new-chat-session') {
            console.log("[ChatWidget] Received new-chat-session signal.");
            handleClearHistory();
          }
        } else if (event.data === 'new-chat-session') {
          console.log("[ChatWidget] Received new-chat-session signal.");
          handleClearHistory();
        } else if (event.data === 'widget-opened') {
          console.log("[ChatWidget] Received widget-opened signal.");
          const textarea = document.querySelector('.chat-textarea') as HTMLTextAreaElement | null;
          if (textarea) {
            textarea.focus();
          }
        }
      }
    };
    window.addEventListener('message', handleMessageEvent);
    return () => window.removeEventListener('message', handleMessageEvent);
  }, [messages, sessionId]);

  const handleWidgetClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If user is actively selecting text, do not move focus to the input (which clears selection)
    const selection = window.getSelection()?.toString();
    if (selection && selection.trim().length > 0) {
      return;
    }

    const target = e.target as HTMLElement;
    const isInteractive = target.closest('button, a, input, textarea, [role="button"]');
    if (!isInteractive) {
      const textarea = document.querySelector('.chat-textarea') as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.focus();
      }
    }
  };

  return (
    <>
      {effectiveMode === 'full' && (
        <div className="chat-backdrop-overlay" />
      )}
      <div className={`chat-container ${effectiveMode === 'full' ? 'mode-full' : 'mode-half'}`} onClick={handleWidgetClick}>
        {/* 1. Header */}
        <ChatHeader onClearHistory={handleClearHistory} onClose={() => { }} />

        {/* 2. Chat Area */}
        <div className="chat-area" ref={chatAreaRef} onScroll={handleScroll}>
          {messages.length === 0 ? (
            /* 3. Welcome Screen */
            <div className="welcome-screen">
              <h2 className="welcome-title">
                What would you like to improve today?
              </h2>
              <p className="welcome-subtitle">
                Discover personalised wellness strategies, premium supplements, and expert guidance designed around your unique needs.
              </p>
              <SuggestedPrompts onPromptClick={handleSendMessage} />

              {effectiveMode === 'full' && (
                <div className="welcome-input-wrapper">
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    onStopResponse={handleStopResponse}
                    isLoading={loading}
                    disabled={loading}
                    isWelcome={true}
                  />
                  <p className="welcome-disclaimer">
                    Zupe Sage is AI-generated and may contain mistakes.
                  </p>
                </div>
              )}
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}

          {/* 9. Loading Experience */}
          {loading && messages[messages.length - 1]?.sender !== 'assistant' && (
            <TypingIndicator theme={animTheme} />
          )}
        </div>

        {showScrollButton && (
          <div className="scroll-to-bottom-btn-wrapper">
            <button
              type="button"
              className="scroll-to-bottom-btn"
              onClick={scrollToBottom}
              aria-label="Scroll to bottom"
            >
              <ArrowDown size={18} />
            </button>
          </div>
        )}

        {/* 4. Message Input - Hide bottom input bar on full-screen welcome view */}
        {!(effectiveMode === 'full' && messages.length === 0) && (
          <ChatInput
            onSendMessage={handleSendMessage}
            onStopResponse={handleStopResponse}
            isLoading={loading}
            disabled={loading}
          />
        )}
      </div>
    </>
  );
};
