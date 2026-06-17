import React from 'react';
import { Sparkles, User } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.sender === 'user';

  return (
    <div id={`msg-${message.id}`} className={`message-row ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <div className="message-avatar" title="AI Assistant">
          <Sparkles size={14} />
        </div>
      )}
      <div className="message-bubble">
        {isUser ? (
          <div className="markdown-content">
            <p>{message.text}</p>
          </div>
        ) : (
          <MarkdownRenderer text={message.text} />
        )}
      </div>
      {isUser && (
        <div className="message-avatar" style={{ background: 'hsl(var(--text-muted) / 0.15)', color: 'hsl(var(--text-muted))' }} title="You">
          <User size={14} />
        </div>
      )}
    </div>
  );
};
