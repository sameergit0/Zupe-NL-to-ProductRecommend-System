import React, { useState, useEffect } from 'react';
import { Sparkles, Search } from 'lucide-react';

interface TypingIndicatorProps {
  theme?: 'chat' | 'search';
}

const SEARCH_STATUSES = [
  'Searching products...',
  'Finding best matches...',
  'Almost there...',
];

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ theme = 'chat' }) => {
  const [currentText, setCurrentText] = useState(SEARCH_STATUSES[0]);

  useEffect(() => {
    if (theme !== 'search') return;
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % SEARCH_STATUSES.length;
      setCurrentText(SEARCH_STATUSES[index]);
    }, 2000);
    return () => clearInterval(interval);
  }, [theme]);

  return (
    <div className="typing-row">
      <div className="message-avatar">
        {theme === 'search' ? <Search size={14} /> : <Sparkles size={14} />}
      </div>
      <div className="typing-bubble">
        <div className="typing-dots">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
        {theme === 'search' && (
          <span className="typing-text">{currentText}</span>
        )}
      </div>
    </div>
  );
};
