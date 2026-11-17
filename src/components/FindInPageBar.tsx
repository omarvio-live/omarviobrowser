/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

interface FindInPageBarProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

const FIND_MARK_ATTR = 'data-omarvio-find-mark';

function clearDomHighlights(doc: Document) {
  try {
    const marks = doc.querySelectorAll(`mark[${FIND_MARK_ATTR}]`);
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      parent.replaceChild(doc.createTextNode(mark.textContent || ''), mark);
      parent.normalize();
    });
  } catch {}
}

function getSearchableRoots(): Array<{ doc: Document; root: HTMLElement }> {
  const roots: Array<{ doc: Document; root: HTMLElement }> = [];
  const mainEl = document.querySelector('main');
  if (mainEl) {
    // Include visible same-origin iframes (e.g., proxied pages) if accessible
    const iframes = Array.from(mainEl.querySelectorAll('iframe'));
    let accessibleIframeFound = false;
    for (const frame of iframes) {
      const wrapper = frame.closest('[aria-hidden="false"]');
      if (!wrapper && frame.offsetParent === null) continue;
      try {
        const frameDoc = frame.contentDocument;
        if (frameDoc && frameDoc.body) {
          roots.push({ doc: frameDoc, root: frameDoc.body });
          accessibleIframeFound = true;
        }
      } catch {}
    }
    if (!accessibleIframeFound) {
      roots.push({ doc: document, root: mainEl as HTMLElement });
    }
  }
  return roots;
}

function highlightMatchesInDocument(doc: Document, root: HTMLElement, query: string): HTMLElement[] {
  const createdMarks: HTMLElement[] = [];
  const qLower = query.toLowerCase();
  if (!qLower) return createdMarks;

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'INPUT' || tag === 'TEXTAREA') {
        return NodeFilter.FILTER_REJECT;
      }
      if (parent.closest('[aria-hidden="true"]')) {
        return NodeFilter.FILTER_REJECT;
      }
      if (!node.nodeValue || !node.nodeValue.toLowerCase().includes(qLower)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const matchingTextNodes: Text[] = [];
  let currentNode = walker.nextNode();
  while (currentNode) {
    matchingTextNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  for (const textNode of matchingTextNodes) {
    const text = textNode.nodeValue || '';
    const lowerText = text.toLowerCase();
    let idx = 0;
    let foundIdx = lowerText.indexOf(qLower, idx);
    if (foundIdx === -1) continue;

    const frag = doc.createDocumentFragment();
    while (foundIdx !== -1) {
      if (foundIdx > idx) {
        frag.appendChild(doc.createTextNode(text.slice(idx, foundIdx)));
      }
      const mark = doc.createElement('mark');
      mark.setAttribute(FIND_MARK_ATTR, '1');
      mark.style.backgroundColor = '#fde047';
      mark.style.color = '#0f172a';
      mark.style.borderRadius = '3px';
      mark.style.padding = '0 2px';
      mark.textContent = text.slice(foundIdx, foundIdx + query.length);
      frag.appendChild(mark);
      createdMarks.push(mark);

      idx = foundIdx + query.length;
      foundIdx = lowerText.indexOf(qLower, idx);
      if (createdMarks.length >= 200) break;
    }
    if (idx < text.length) {
      frag.appendChild(doc.createTextNode(text.slice(idx)));
    }
    textNode.parentNode?.replaceChild(frag, textNode);
    if (createdMarks.length >= 200) break;
  }

  return createdMarks;
}

export const FindInPageBar: React.FC<FindInPageBarProps> = ({ isOpen, onClose, onToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const marksRef = useRef<HTMLElement[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const cleanupAllHighlights = useCallback(() => {
    clearDomHighlights(document);
    try {
      document.querySelectorAll('iframe').forEach((f) => {
        try {
          if (f.contentDocument) clearDomHighlights(f.contentDocument);
        } catch {}
      });
    } catch {}
    marksRef.current = [];
  }, []);

  const focusMatchAt = useCallback((idxOneBased: number) => {
    const marks = marksRef.current;
    marks.forEach((m, i) => {
      if (i === idxOneBased - 1) {
        m.style.backgroundColor = '#06b6d4';
        m.style.color = '#04101e';
        m.style.fontWeight = '700';
        try {
          m.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        } catch {}
      } else {
        m.style.backgroundColor = '#fde047';
        m.style.color = '#0f172a';
        m.style.fontWeight = 'normal';
      }
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      cleanupAllHighlights();
      setSearchTerm('');
      setMatchCount(0);
      setCurrentIndex(0);
    }
    return () => {
      cleanupAllHighlights();
    };
  }, [isOpen, cleanupAllHighlights]);

  if (!isOpen) return null;

  const runDomSearch = (val: string) => {
    cleanupAllHighlights();
    const trimmed = val.trim();
    if (!trimmed) {
      setMatchCount(0);
      setCurrentIndex(0);
      return;
    }

    const roots = getSearchableRoots();
    let collected: HTMLElement[] = [];
    for (const entry of roots) {
      collected = collected.concat(highlightMatchesInDocument(entry.doc, entry.root, trimmed));
    }
    marksRef.current = collected;

    if (collected.length > 0) {
      setMatchCount(collected.length);
      setCurrentIndex(1);
      focusMatchAt(1);
    } else {
      setMatchCount(0);
      setCurrentIndex(0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    runDomSearch(val);
  };

  const handleNext = () => {
    if (matchCount > 0) {
      const next = currentIndex >= matchCount ? 1 : currentIndex + 1;
      setCurrentIndex(next);
      focusMatchAt(next);
    }
  };

  const handlePrev = () => {
    if (matchCount > 0) {
      const prev = currentIndex <= 1 ? matchCount : currentIndex - 1;
      setCurrentIndex(prev);
      focusMatchAt(prev);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (matchCount === 0 && searchTerm.trim()) {
        runDomSearch(searchTerm);
        if (marksRef.current.length === 0) {
          onToast('🔍 বর্তমান দৃশ্যমান কনটেন্টে কোনো মিল পাওয়া যায়নি (ক্রস-অরিজিন পেজের জন্য রিডার মোড চালু করুন)');
        }
      } else if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    } else if (e.key === 'Escape') {
      onClose();
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
          onKeyDown={handleKeyDown}
          placeholder="Find in page..."
          className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-[#9aa0a6] focus:outline-none"
        />
        {searchTerm && (
          <span className="text-[11px] text-[#9aa0a6] shrink-0 font-mono pl-2 tabular-nums">
            {matchCount > 0 ? `${currentIndex}/${matchCount}` : '0/0'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={handlePrev}
          disabled={matchCount === 0}
          className="p-1.5 rounded-full hover:bg-[#3c4043] text-[#e3e3e3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Previous match"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={matchCount === 0}
          className="p-1.5 rounded-full hover:bg-[#3c4043] text-[#e3e3e3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Next match"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-[#3c4043] text-[#e3e3e3] transition-colors ml-1 cursor-pointer"
          title="Close find in page"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
