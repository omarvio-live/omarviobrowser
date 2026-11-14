/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

interface FindInPageBarProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const FindInPageBar: React.FC<FindInPageBarProps> = ({ isOpen, onClose, onToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchTerm('');
      setMatchCount(0);
      setCurrentIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (val.trim()) {
      // Simulate found occurrences
      const matches = Math.floor(Math.random() * 5) + 1;
      setMatchCount(matches);
      setCurrentIndex(1);
    } else {
      setMatchCount(0);
      setCurrentIndex(0);
    }
  };

  const handleNext = () => {
    if (matchCount > 0) {
      setCurrentIndex((prev) => (prev >= matchCount ? 1 : prev + 1));
    }
  };

  const handlePrev = () => {
    if (matchCount > 0) {
      setCurrentIndex((prev) => (prev <= 1 ? matchCount : prev - 1));
    }
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-40 bg-[#28292c] text-[#e3e3e3] border-b border-[#3c4043] px-3 py-2 flex items-center gap-2 shadow-xl animate-fadeIn">
      <div className="flex-1 flex items-center bg-[#1f1f23] rounded-full px-3 py-1.5 border border-[#3c4043]">
        <Search className="w-4 h-4 text-[#9aa0a6] mr-2 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleChange}
          placeholder="Find in page..."
          className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-[#9aa0a6] focus:outline-none"
        />
        {searchTerm && (
          <span className="text-[11px] text-[#9aa0a6] shrink-0 font-mono pl-2">
            {matchCount > 0 ? `${currentIndex}/${matchCount}` : '0/0'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={handlePrev}
          disabled={matchCount === 0}
          className="p-1.5 rounded-full hover:bg-[#3c4043] text-[#e3e3e3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Previous match"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={matchCount === 0}
          className="p-1.5 rounded-full hover:bg-[#3c4043] text-[#e3e3e3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Next match"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-[#3c4043] text-[#e3e3e3] transition-colors ml-1"
          title="Close find in page"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
