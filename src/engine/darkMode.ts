/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const OLED_DARK_MODE_CSS = `
  /* Omarvio Force OLED True Black Engine */
  html, body {
    background-color: #000000 !important;
    color: #e5e7eb !important;
  }
  div, section, article, nav, header, footer, main {
    background-color: inherit !important;
    color: inherit !important;
    border-color: #262626 !important;
  }
  p, span, h1, h2, h3, h4, h5, h6, li, a {
    color: #e5e7eb !important;
  }
  img, video, canvas, svg {
    filter: brightness(0.92) contrast(1.05) !important;
  }
`;

let isOledDarkActive = false;

export const toggleOledDarkMode = (enable?: boolean): boolean => {
  if (typeof enable !== 'undefined') {
    isOledDarkActive = enable;
  } else {
    isOledDarkActive = !isOledDarkActive;
  }
  return isOledDarkActive;
};

export const getOledDarkStatus = (): boolean => isOledDarkActive;
