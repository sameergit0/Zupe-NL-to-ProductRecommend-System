import React, { useState, useEffect, useRef } from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from './MessageBubble';
import { SuggestedPrompts } from './SuggestedPrompts';
import { TypingIndicator } from './TypingIndicator';
import { streamChat } from '../services/chatService';

export const ChatWidget: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [animTheme, setAnimTheme] = useState<'chat' | 'search'>('chat');


  // Start with a new session state on every page load
  const [sessionId, setSessionId] = useState<string | null>(null);

  const lastUserMessageRef = useRef<string | null>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset state on component mount (page load/refresh) to ensure a fresh session
  useEffect(() => {
    console.log("[ChatWidget] Component mounted. Resetting session and messages.");
    setMessages([]);
    setSessionId(null);
  }, []);

  // Auto-scroll chat area to bottom when messages or status changes
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Manage conversation history in state
  const saveChatHistory = (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;


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
    <div className="chat-container" onClick={handleWidgetClick}>
      {/* 1. Header */}
      <ChatHeader onClearHistory={handleClearHistory} onClose={() => {}} />

      {/* 2. Chat Area */}
      <div className="chat-area" ref={chatAreaRef}>
        {messages.length === 0 ? (
          /* 3. Welcome Screen */
          <div className="welcome-screen">
            <h2 className="welcome-title">✨ Meet Zupe Sage</h2>
            <p className="welcome-subtitle">
              Wisdom for living well. What are you looking to improve today?
            </p>
            <SuggestedPrompts onPromptClick={handleSendMessage} />
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

      {/* 4. Message Input */}
      <ChatInput onSendMessage={handleSendMessage} disabled={loading} />
    </div>
  );
};
