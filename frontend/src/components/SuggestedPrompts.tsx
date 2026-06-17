import React from 'react';

interface SuggestedPromptsProps {
  onPromptClick: (prompt: string) => void;
}

const PROMPTS = [
  'Better Sleep',
  'More Energy',
  'Healthy Aging',
  'Brain Health',
  'Strength & Recovery',
  'Weight Management',
];

export const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({ onPromptClick }) => {
  return (
    <div className="suggestions-grid">
      {PROMPTS.map((prompt) => (
        <button
          key={prompt}
          className="suggestion-chip animate-slide-up"
          onClick={() => onPromptClick(prompt)}
        >
          <span>{prompt}</span>
        </button>
      ))}
    </div>
  );
};



