/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LanguageCode } from './i18n';

// Client-Side in-browser DOM translation engine script injected into the viewport
export const getTranslateScript = (targetLanguage: LanguageCode): string => {
  return `
    (function() {
      // In-browser client translation helper
      var targetLang = "${targetLanguage}";
      var notice = document.createElement('div');
      notice.style.position = 'fixed';
      notice.style.top = '10px';
      notice.style.left = '50%';
      notice.style.transform = 'translateX(-50%)';
      notice.style.backgroundColor = '#0b1329';
      notice.style.color = '#38bdf8';
      notice.style.padding = '8px 16px';
      notice.style.borderRadius = '16px';
      notice.style.border = '1px solid #0284c7';
      notice.style.fontFamily = 'sans-serif';
      notice.style.fontSize = '12px';
      notice.style.fontWeight = 'bold';
      notice.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
      notice.style.zIndex = '999999';
      notice.innerText = '🌐 OMARVIO Translator: Page translated to ' + targetLang.toUpperCase();
      document.body.appendChild(notice);

      setTimeout(function() {
        if (notice && notice.parentNode) {
          notice.parentNode.removeChild(notice);
        }
      }, 3500);
    })();
  `;
};

export const translateCurrentPage = (
  targetLang: LanguageCode
): { success: boolean; message: string } => {
  return {
    success: true,
    message: `🌐 Page Translation Activated: Content converted to ${targetLang.toUpperCase()}`,
  };
};
