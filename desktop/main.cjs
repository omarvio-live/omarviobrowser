/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OMARVIO BROWSER — Desktop Main Process (Windows & Linux)
 * Architecture: Direct Chromium WebContentsView Tabs + Native Zero-Proxy Ad/Tracker Shields.
 */

const path = require('path');
const { app, BaseWindow, WebContentsView, ipcMain, session } = require('electron');

const TOOLBAR_HEIGHT = 92;
const MAX_ACTIVE_VIEWS = 6;

const AD_AND_TRACKER_DOMAINS = new Set([
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'google-analytics.com',
  'googletagmanager.com',
  'adservice.google.com',
  'facebook.net',
  'connect.facebook.net',
  'ads.twitter.com',
  'analytics.twitter.com',
  'ads-api.twitter.com',
  'scorecardresearch.com',
  'taboola.com',
  'outbrain.com',
  'criteo.com',
  'pubmatic.com',
  'rubiconproject.com',
  'openx.net',
  'adnxs.com',
  'moatads.com',
  'quantserve.com',
  'hotjar.com',
  'mixpanel.com',
  'segment.io',
  'amplitude.com',
  'sentry.io',
]);

const TRACKING_QUERY_PARAMS = [
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
];

let mainWindow = null;
let chromeShellView = null;
let adBlockEnabled = true;
let httpsOnlyEnabled = true;
let energySaverEnabled = false;
let blockedCount = 0;

/** @type {Array<{id:string, title:string, url:string, isSleeping:boolean, isIncognito:boolean, view:WebContentsView|null}>} */
const tabs = [];
let activeTabId = null;

function hostMatchesSet(hostname, set) {
  let current = (hostname || '').toLowerCase();
  while (current) {
    if (set.has(current)) return true;
    const dot = current.indexOf('.');
    if (dot === -1) break;
    current = current.slice(dot + 1);
  }
  return false;
}

function normalizeNavigationInput(rawInput, engineBase = 'https://search.brave.com/search?q=') {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return `https://${trimmed}`;
  }
  return `${engineBase}${encodeURIComponent(trimmed)}`;
}

function broadcastState() {
  if (!chromeShellView || chromeShellView.webContents.isDestroyed()) return;
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const wc = activeTab?.view && !activeTab.view.webContents.isDestroyed() ? activeTab.view.webContents : null;

  chromeShellView.webContents.send('desktop:state', {
    tabs: tabs.map((t) => ({
      id: t.id,
      title: t.title || 'New Tab',
      url: t.url || '',
      isSleeping: t.isSleeping,
      isIncognito: t.isIncognito,
    })),
    activeTabId,
    activeUrl: activeTab?.url || '',
    canGoBack: wc ? wc.navigationHistory.canGoBack() : false,
    canGoForward: wc ? wc.navigationHistory.canGoForward() : false,
    adBlockEnabled,
    httpsOnlyEnabled,
    energySaverEnabled,
    blockedCount,
  });
}

function layoutViews() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const [width, height] = mainWindow.getContentSize();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const showWeb = Boolean(activeTab && activeTab.url);

  if (chromeShellView) {
    chromeShellView.setBounds({
      x: 0,
      y: 0,
      width,
      height: showWeb ? TOOLBAR_HEIGHT : height,
    });
  }

  for (const t of tabs) {
    if (!t.view) continue;
    const isVisible = showWeb && t.id === activeTabId;
    t.view.setVisible(isVisible);
    if (isVisible) {
      t.view.setBounds({
        x: 0,
        y: TOOLBAR_HEIGHT,
        width,
        height: Math.max(0, height - TOOLBAR_HEIGHT),
      });
    }
  }
}

function destroyViewForTab(tab) {
  if (tab.view && mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.contentView.removeChildView(tab.view);
      tab.view.webContents.close({ waitForBeforeUnload: false });
    } catch (_) {}
  }
  tab.view = null;
}

function enforcePoolBudget() {
  const limit = energySaverEnabled ? 1 : MAX_ACTIVE_VIEWS;
  const liveTabs = tabs.filter((t) => t.view && t.id !== activeTabId);
  while (liveTabs.length + (tabs.find((t) => t.id === activeTabId)?.view ? 1 : 0) > limit) {
    const victim = liveTabs.shift();
    if (!victim) break;
    destroyViewForTab(victim);
    if (energySaverEnabled && victim.url) {
      victim.isSleeping = true;
    }
  }
}

function ensureViewForTab(tab) {
  if (tab.view && !tab.view.webContents.isDestroyed()) return tab.view;
  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: tab.isIncognito ? `incognito-${tab.id}` : 'persist:omarvio-default',
    },
  });

  mainWindow.contentView.addChildView(view);
  tab.view = view;
  tab.isSleeping = false;

  const wc = view.webContents;
  wc.on('page-title-updated', (_e, title) => {
    tab.title = title || tab.url || 'Webpage';
    broadcastState();
  });
  wc.on('did-navigate', (_e, navUrl) => {
    tab.url = navUrl;
    broadcastState();
  });
  wc.on('did-navigate-in-page', (_e, navUrl) => {
    tab.url = navUrl;
    broadcastState();
  });
  wc.setWindowOpenHandler(({ url }) => {
    if (url) openNewTab(url, tab.isIncognito);
    return { action: 'deny' };
  });

  enforcePoolBudget();
  return view;
}

function openNewTab(initialUrl = '', isIncognito = false) {
  const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newTab = {
    id,
    title: isIncognito ? 'Incognito Tab' : 'New Tab',
    url: initialUrl,
    isSleeping: false,
    isIncognito,
    view: null,
  };
  tabs.push(newTab);
  activeTabId = id;
  if (initialUrl) {
    const view = ensureViewForTab(newTab);
    view.webContents.loadURL(initialUrl);
  }
  layoutViews();
  broadcastState();
}

function setupNetworkShields() {
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    if (!adBlockEnabled || !details.url.startsWith('http')) {
      return callback({ cancel: false });
    }
    try {
      const u = new URL(details.url);
      if (details.resourceType !== 'mainFrame' && hostMatchesSet(u.hostname, AD_AND_TRACKER_DOMAINS)) {
        blockedCount += 1;
        return callback({ cancel: true });
      }
      let stripped = false;
      for (const param of TRACKING_QUERY_PARAMS) {
        if (u.searchParams.has(param)) {
          u.searchParams.delete(param);
          stripped = true;
        }
      }
      if (details.resourceType === 'mainFrame' && httpsOnlyEnabled && u.protocol === 'http:') {
        u.protocol = 'https:';
        stripped = true;
      }
      if (stripped) {
        return callback({ redirectURL: u.toString() });
      }
    } catch (_) {}
    callback({ cancel: false });
  });
}

function createWindow() {
  mainWindow = new BaseWindow({
    width: 1280,
    height: 820,
    minWidth: 720,
    minHeight: 540,
    title: 'OMARVIO BROWSER Desktop',
    backgroundColor: '#070913',
  });

  chromeShellView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.contentView.addChildView(chromeShellView);
  chromeShellView.webContents.loadFile(path.join(__dirname, 'shell.html'));

  mainWindow.on('resize', layoutViews);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  openNewTab('', false);
}

ipcMain.handle('desktop:get-state', () => {
  broadcastState();
  return true;
});

ipcMain.handle('desktop:navigate', (_e, { input, engineBase }) => {
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  if (!activeTab) return;
  const target = normalizeNavigationInput(input, engineBase);
  if (!target) return;
  activeTab.url = target;
  activeTab.title = target;
  const view = ensureViewForTab(activeTab);
  view.webContents.loadURL(target);
  layoutViews();
  broadcastState();
});

ipcMain.handle('desktop:new-tab', (_e, { isIncognito = false } = {}) => {
  openNewTab('', Boolean(isIncognito));
});

ipcMain.handle('desktop:switch-tab', (_e, tabId) => {
  const target = tabs.find((t) => t.id === tabId);
  if (!target) return;
  activeTabId = tabId;
  if (target.url) {
    const wasSleeping = target.isSleeping || !target.view;
    const view = ensureViewForTab(target);
    if (wasSleeping) view.webContents.loadURL(target.url);
  }
  layoutViews();
  broadcastState();
});

ipcMain.handle('desktop:close-tab', (_e, tabId) => {
  const idx = tabs.findIndex((t) => t.id === tabId);
  if (idx === -1) return;
  const removed = tabs[idx];
  destroyViewForTab(removed);
  tabs.splice(idx, 1);
  if (tabs.length === 0) {
    openNewTab('', false);
    return;
  }
  if (activeTabId === tabId) {
    const next = tabs[Math.min(idx, tabs.length - 1)];
    activeTabId = next.id;
    if (next.url && !next.view) {
      const v = ensureViewForTab(next);
      v.webContents.loadURL(next.url);
    }
  }
  layoutViews();
  broadcastState();
});

ipcMain.handle('desktop:go-home', () => {
  const activeTab = tabs.find((t) => t.id === activeTabId);
  if (!activeTab) return;
  destroyViewForTab(activeTab);
  activeTab.url = '';
  activeTab.title = activeTab.isIncognito ? 'Incognito Tab' : 'New Tab';
  layoutViews();
  broadcastState();
});

ipcMain.handle('desktop:nav-action', (_e, action) => {
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const wc = activeTab?.view?.webContents;
  if (!wc) return;
  if (action === 'back' && wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack();
  if (action === 'forward' && wc.navigationHistory.canGoForward()) wc.navigationHistory.goForward();
  if (action === 'reload') wc.reload();
  broadcastState();
});

ipcMain.handle('desktop:toggle-shields', () => {
  adBlockEnabled = !adBlockEnabled;
  broadcastState();
});

ipcMain.handle('desktop:toggle-energy', () => {
  energySaverEnabled = !energySaverEnabled;
  if (energySaverEnabled) enforcePoolBudget();
  broadcastState();
});

app.whenReady().then(() => {
  setupNetworkShields();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
