/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('OmarvioDesktop', {
  getState: () => ipcRenderer.invoke('desktop:get-state'),
  navigate: (input, engineBase) => ipcRenderer.invoke('desktop:navigate', { input, engineBase }),
  newTab: (isIncognito = false) => ipcRenderer.invoke('desktop:new-tab', { isIncognito }),
  switchTab: (tabId) => ipcRenderer.invoke('desktop:switch-tab', tabId),
  closeTab: (tabId) => ipcRenderer.invoke('desktop:close-tab', tabId),
  goHome: () => ipcRenderer.invoke('desktop:go-home'),
  navAction: (action) => ipcRenderer.invoke('desktop:nav-action', action),
  toggleShields: () => ipcRenderer.invoke('desktop:toggle-shields'),
  toggleEnergySaver: () => ipcRenderer.invoke('desktop:toggle-energy'),
  onState: (handler) => {
    const listener = (_event, state) => handler(state);
    ipcRenderer.on('desktop:state', listener);
    return () => ipcRenderer.removeListener('desktop:state', listener);
  },
});
