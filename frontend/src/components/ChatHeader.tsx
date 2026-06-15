import React from 'react';
import { X } from 'lucide-react';

interface ChatHeaderProps {
  onClearHistory: () => void;
  onClose: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onClose }) => {
  const handleClose = () => {
    console.log("[ChatHeader] Close button clicked, posting 'close-zupe-chatbot' string message to parent.");
    window.parent.postMessage('close-zupe-chatbot', '*');
    onClose();
  };

  return (
    <div className="chat-header-top">
      <div className="chat-header-top-left">
        <span className="pulse-dot green" />
        <span className="advisor-title">Zupe Sage</span>
      </div>
      <button className="close-widget-btn" onClick={handleClose} aria-label="Close Assistant">
        <X size={16} />
      </button>
    </div>
  );
};
