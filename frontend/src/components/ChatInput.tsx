import React, { useRef, useEffect, useState } from 'react';
import { SendHorizonal } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onStopResponse?: () => void;
  isLoading?: boolean;
  disabled: boolean;
  isWelcome?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopResponse,
  isLoading = false,
  disabled,
  isWelcome = false,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea height based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [text]);

  // Focus textarea when it becomes enabled
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (text.trim() && !disabled) {
      onSendMessage(text.trim());
      setText('');
      // Reset textarea height and refocus
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form className={`chat-input-container ${isWelcome ? 'welcome-style' : ''}`} onSubmit={handleSubmit}>
      <div className="chat-input-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          placeholder="Tell us about your goals..."
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        {isLoading && onStopResponse ? (
          <button
            type="button"
            className="send-btn stop-btn"
            onClick={onStopResponse}
            aria-label="Stop generating response"
          >
            <span className="stop-icon-inner" />
          </button>
        ) : (
          <button
            type="submit"
            className="send-btn"
            disabled={disabled || !text.trim()}
            aria-label="Send message"
          >
            <SendHorizonal size={18} />
          </button>
        )}
      </div>
      {!isWelcome && (
        <p className="chat-disclaimer">
          Zupe Sage is AI-generated and may contain mistakes.
        </p>
      )}
    </form>
  );
};
