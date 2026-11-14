/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Visibility API Spoofing Script
// Injected into iframe so YouTube/Facebook never pauses when the user locks their phone screen
export const VISIBILITY_SPOOF_SCRIPT = `
  (function() {
    try {
      Object.defineProperty(document, 'hidden', {
        get: function() { return false; },
        configurable: true
      });
      Object.defineProperty(document, 'visibilityState', {
        get: function() { return 'visible'; },
        configurable: true
      });
      document.addEventListener('visibilitychange', function(e) {
        e.stopImmediatePropagation();
      }, true);
    } catch(err) {}
  })();
`;

// AudioContext keep-alive engine
let sharedAudioContext: AudioContext | null = null;

export const initBackgroundAudioContext = () => {
  if (!sharedAudioContext && typeof window !== 'undefined') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioContext = new AudioCtx();
    }
  }

  if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
};

// Setup W3C Media Session API on Android & iOS lock screen
export const updateLockScreenMediaSession = (meta: {
  title: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  onPlay?: () => void;
  onPause?: () => void;
}) => {
  if ('mediaSession' in navigator) {
    initBackgroundAudioContext();

    navigator.mediaSession.metadata = new MediaMetadata({
      title: meta.title || 'Omarvio Ad-Free Audio',
      artist: meta.artist || 'OMARVIO BROWSER',
      album: meta.album || 'My Phone, My Data',
      artwork: [
        {
          src: meta.artworkUrl || '/assets/aistudio/file_0000000038508211a96b8fbe27d5ca68_9009abdf.png',
          sizes: '1254x1254',
          type: 'image/png',
        },
      ],
    });

    if (meta.onPlay) {
      navigator.mediaSession.setActionHandler('play', meta.onPlay);
    }
    if (meta.onPause) {
      navigator.mediaSession.setActionHandler('pause', meta.onPause);
    }
  }
};
