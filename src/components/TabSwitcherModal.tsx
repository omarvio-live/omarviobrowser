/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Tab } from '../types/browser';
import {
  X,
  Plus,
  Globe,
  MoreVertical,
  Search,
  LayoutGrid,
  Ghost,
  FolderPlus,
  FolderMinus,
  ChevronDown,
  ChevronRight,
  Edit3,
  Copy,
  Check,
  Layers,
} from 'lucide-react';

export interface TabGroupMeta {
  groupId: string;
  groupName: string;
  groupColor: string;
  tabs: Tab[];
}

const GROUP_COLOR_MAP: Record<
  string,
  { border: string; headerBg: string; dot: string; badge: string; ring: string }
> = {
  cyan: {
    border: 'border-cyan-500/45',
    headerBg: 'bg-cyan-950/55',
    dot: 'bg-cyan-400',
    badge: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30',
    ring: 'ring-cyan-400',
  },
  emerald: {
    border: 'border-emerald-500/45',
    headerBg: 'bg-emerald-950/55',
    dot: 'bg-emerald-400',
    badge: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
    ring: 'ring-emerald-400',
  },
  amber: {
    border: 'border-amber-500/45',
    headerBg: 'bg-amber-950/50',
    dot: 'bg-amber-400',
    badge: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
    ring: 'ring-amber-400',
  },
  violet: {
    border: 'border-violet-500/45',
    headerBg: 'bg-violet-950/55',
    dot: 'bg-violet-400',
    badge: 'text-violet-300 bg-violet-500/15 border-violet-500/30',
    ring: 'ring-violet-400',
  },
  rose: {
    border: 'border-rose-500/45',
    headerBg: 'bg-rose-950/50',
    dot: 'bg-rose-400',
    badge: 'text-rose-300 bg-rose-500/15 border-rose-500/30',
    ring: 'ring-rose-400',
  },
};

const getGroupPalette = (color?: string) =>
  GROUP_COLOR_MAP[color || 'cyan'] || GROUP_COLOR_MAP.cyan;

interface TabSwitcherModalProps {
  isOpen: boolean;
  tabs: Tab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
  onCloseModal: () => void;
  onCloseAllTabs?: () => void;
  onNewIncognitoTab?: () => void;
  onGroupTabs?: (sourceTabId: string, targetTabId: string) => void;
  onAddTabToNewGroup?: (tabId: string, groupName?: string) => void;
  onAssignTabToGroup?: (tabId: string, groupId: string, groupName: string, groupColor?: string) => void;
  onRemoveTabFromGroup?: (tabId: string) => void;
  onRenameGroup?: (groupId: string, newName: string) => void;
  onCloseGroup?: (groupId: string) => void;
  onNewTabInGroup?: (groupId: string, groupName: string, groupColor?: string) => void;
  onDuplicateTab?: (tabId: string) => void;
}

export const TabSwitcherModal: React.FC<TabSwitcherModalProps> = ({
  isOpen,
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onCloseModal,
  onCloseAllTabs,
  onNewIncognitoTab,
  onGroupTabs,
  onAddTabToNewGroup,
  onAssignTabToGroup,
  onRemoveTabFromGroup,
  onRenameGroup,
  onCloseGroup,
  onNewTabInGroup,
  onDuplicateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  // Drag-and-drop state
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [dragOverUngrouped, setDragOverUngrouped] = useState(false);

  // Group expand/collapse & rename state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  // Per-tab context menu state
  const [contextMenuTabId, setContextMenuTabId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredTabs = searchQuery.trim()
    ? tabs.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.groupName && t.groupName.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : tabs;

  // Build ordered groups and ungrouped tabs
  const groupMap = new Map<string, TabGroupMeta>();
  const ungroupedTabs: Tab[] = [];

  filteredTabs.forEach((tab) => {
    if (tab.groupId) {
      const existing = groupMap.get(tab.groupId);
      if (existing) {
        existing.tabs.push(tab);
      } else {
        groupMap.set(tab.groupId, {
          groupId: tab.groupId,
          groupName: tab.groupName || 'Tab Group',
          groupColor: tab.groupColor || 'cyan',
          tabs: [tab],
        });
      }
    } else {
      ungroupedTabs.push(tab);
    }
  });

  const groups = Array.from(groupMap.values());
  const allGroupsForMenu = (() => {
    const m = new Map<string, { groupId: string; groupName: string; groupColor: string }>();
    tabs.forEach((t) => {
      if (t.groupId && !m.has(t.groupId)) {
        m.set(t.groupId, {
          groupId: t.groupId,
          groupName: t.groupName || 'Tab Group',
          groupColor: t.groupColor || 'cyan',
        });
      }
    });
    return Array.from(m.values());
  })();

  const clearDragState = () => {
    setDraggingTabId(null);
    setDragOverTabId(null);
    setDragOverGroupId(null);
    setDragOverUngrouped(false);
  };

  const handleDropOnTab = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggingTabId || e.dataTransfer.getData('text/plain');
    clearDragState();
    if (!sourceId || sourceId === targetTabId) return;
    onGroupTabs?.(sourceId, targetTabId);
  };

  const handleDropOnGroup = (e: React.DragEvent, group: TabGroupMeta) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggingTabId || e.dataTransfer.getData('text/plain');
    clearDragState();
    if (!sourceId) return;
    onAssignTabToGroup?.(sourceId, group.groupId, group.groupName, group.groupColor);
  };

  const handleDropOnUngrouped = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggingTabId || e.dataTransfer.getData('text/plain');
    clearDragState();
    if (!sourceId) return;
    onRemoveTabFromGroup?.(sourceId);
  };

  const contextTab = contextMenuTabId ? tabs.find((t) => t.id === contextMenuTabId) || null : null;

  const renderTabCard = (tab: Tab) => {
    const isActive = tab.id === activeTabId;
    const isHomeTab = !tab.url;
    const isDragging = draggingTabId === tab.id;
    const isDropTarget = dragOverTabId === tab.id && draggingTabId !== tab.id;
    const palette = tab.groupId ? getGroupPalette(tab.groupColor) : null;

    return (
      <div
        key={tab.id}
        draggable
        onDragStart={(e) => {
          setDraggingTabId(tab.id);
          e.dataTransfer.effectAllowed = 'move';
          try {
            e.dataTransfer.setData('text/plain', tab.id);
          } catch {}
        }}
        onDragEnd={clearDragState}
        onDragOver={(e) => {
          if (draggingTabId && draggingTabId !== tab.id) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDragOverTabId(tab.id);
          }
        }}
        onDragLeave={() => {
          if (dragOverTabId === tab.id) setDragOverTabId(null);
        }}
        onDrop={(e) => handleDropOnTab(e, tab.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenuTabId(tab.id);
        }}
        onClick={() => {
          onSelectTab(tab.id);
          onCloseModal();
        }}
        className={`relative flex flex-col h-52 sm:h-56 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all group ${
          isDropTarget
            ? 'ring-2 ring-cyan-400 scale-[1.02] shadow-2xl shadow-cyan-500/30'
            : isActive
            ? 'ring-2 ring-[#a8c7fa] shadow-xl shadow-blue-950/40'
            : palette
            ? `border ${palette.border} shadow-md`
            : 'border border-[#3c4043] hover:border-[#5f6368] shadow-md'
        } ${isDragging ? 'opacity-45 scale-95' : 'opacity-100'} ${
          tab.isIncognito ? 'bg-[#18191c]' : 'bg-[#202124]'
        }`}
      >
        {/* Drop-to-Group Overlay Hint */}
        {isDropTarget && (
          <div className="absolute inset-0 z-20 bg-cyan-950/80 backdrop-blur-[1px] flex flex-col items-center justify-center p-3 text-center pointer-events-none">
            <FolderPlus className="w-7 h-7 text-cyan-300 mb-1.5" />
            <span className="text-xs font-bold text-cyan-100">
              {tab.groupId ? `Move to "${tab.groupName}"` : 'Drop to Group Tabs'}
            </span>
          </div>
        )}

        {/* Card Header Bar */}
        <div
          className={`w-full flex items-center justify-between px-2.5 py-2 z-10 ${
            isActive
              ? 'bg-[#2b3140] text-white'
              : tab.isIncognito
              ? 'bg-[#121316] text-[#c4c7c5]'
              : 'bg-[#2d2f34] text-[#c4c7c5]'
          }`}
        >
          {/* Favicon + Title */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
            {tab.isIncognito ? (
              <Ghost className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            ) : isHomeTab ? (
              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center text-[9px] font-black text-slate-950 shrink-0">
                O
              </div>
            ) : (
              <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            )}

            <span className="text-xs font-medium truncate text-white">
              {isHomeTab ? 'OMARVIO Browser' : tab.title || 'Webpage'}
            </span>
          </div>

          {/* Per-Tab Context Menu Trigger & Close Button */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setContextMenuTabId(tab.id);
              }}
              title="Tab options (Add to New Group)"
              className="p-1.5 rounded-full text-[#9aa0a6] hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              title="Close Tab"
              className="p-1.5 rounded-full text-[#9aa0a6] hover:text-rose-300 hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card Body: Live Preview Thumbnail */}
        <div className="flex-1 w-full relative bg-[#18191c] overflow-hidden flex flex-col justify-center items-center p-2">
          {isHomeTab ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center pointer-events-none select-none opacity-85">
              <span className="text-sm font-black tracking-tight text-cyan-400 mb-1">
                OMARVIO
              </span>
              <div className="w-full h-5 rounded-full bg-white/90 mb-2 flex items-center px-2">
                <span className="text-[7px] text-slate-600">Search Omarvio</span>
              </div>
              <div className="grid grid-cols-4 gap-1 w-full px-1">
                <div className="w-4 h-4 rounded-full bg-blue-600 mx-auto" />
                <div className="w-4 h-4 rounded-full bg-red-600 mx-auto" />
                <div className="w-4 h-4 rounded-full bg-green-600 mx-auto" />
                <div className="w-4 h-4 rounded-full bg-slate-700 mx-auto" />
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col justify-start p-2 pointer-events-none opacity-80">
              <div className="w-full h-2.5 rounded bg-[#2d2f34] mb-1.5" />
              <div className="w-3/4 h-2 rounded bg-[#3c4043] mb-1" />
              <div className="w-1/2 h-2 rounded bg-[#3c4043] mb-2" />
              <div className="w-full flex-1 rounded bg-[#202124] border border-[#2d2f34] flex items-center justify-center">
                <span className="text-[9px] text-[#9aa0a6] truncate max-w-[120px] px-1.5 font-mono">
                  {tab.url}
                </span>
              </div>
            </div>
          )}

          {/* Incognito Badge */}
          {tab.isIncognito && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 border border-slate-700 text-[9px] text-indigo-300 flex items-center gap-1">
              <Ghost className="w-2.5 h-2.5" /> Incognito
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#121316] text-[#e3e3e3] flex flex-col select-none animate-fadeIn"
      onClick={() => {
        if (contextMenuTabId) setContextMenuTabId(null);
      }}
    >
      {/* TOP TOOLBAR */}
      <div className="w-full flex items-center justify-between px-3.5 py-3 border-b border-[#28292c]">
        <button
          type="button"
          onClick={() => {
            onNewTab();
            onCloseModal();
          }}
          title="New Tab"
          className="w-11 h-11 rounded-2xl bg-[#a8c7fa] hover:bg-[#8ab4f8] text-[#041e49] flex items-center justify-center font-bold shadow-md active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e1f23] border border-[#3c4043] shadow-inner">
          <div className="w-6 h-6 rounded-md bg-[#28292c] border border-[#3c4043] text-white flex items-center justify-center text-xs font-mono font-bold">
            {tabs.length}
          </div>
          <button
            type="button"
            className="p-1 rounded text-[#c4c7c5] hover:text-white transition-colors"
            title="Tab Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          {groups.length > 0 && (
            <span className="text-[11px] font-semibold text-cyan-300 pl-1 border-l border-[#3c4043]">
              {groups.length} {groups.length === 1 ? 'group' : 'groups'}
            </span>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowHeaderMenu(!showHeaderMenu);
            }}
            title="Tabs Options"
            className="w-11 h-11 rounded-full hover:bg-[#28292c] text-[#e3e3e3] flex items-center justify-center active:scale-95 transition-colors cursor-pointer"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showHeaderMenu && (
            <div className="absolute top-full right-0 mt-2 w-52 rounded-2xl bg-[#28292c] border border-[#3c4043] shadow-2xl py-1.5 z-50 animate-fadeIn">
              <button
                type="button"
                onClick={() => {
                  onNewTab();
                  setShowHeaderMenu(false);
                  onCloseModal();
                }}
                className="w-full px-4 py-2.5 text-left text-xs text-white hover:bg-[#35363a] transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#c4c7c5]" /> New tab
              </button>
              {onNewIncognitoTab && (
                <button
                  type="button"
                  onClick={() => {
                    onNewIncognitoTab();
                    setShowHeaderMenu(false);
                    onCloseModal();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs text-white hover:bg-[#35363a] transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <Ghost className="w-4 h-4 text-[#c4c7c5]" /> New Incognito tab
                </button>
              )}
              {onAddTabToNewGroup && activeTabId && (
                <button
                  type="button"
                  onClick={() => {
                    onAddTabToNewGroup(activeTabId);
                    setShowHeaderMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs text-cyan-300 hover:bg-[#35363a] transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4 text-cyan-400" /> Group active tab
                </button>
              )}
              {onCloseAllTabs && (
                <button
                  type="button"
                  onClick={() => {
                    onCloseAllTabs();
                    setShowHeaderMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs text-rose-400 hover:bg-rose-950/40 transition-colors flex items-center gap-2.5 border-t border-[#3c4043] cursor-pointer"
                >
                  <X className="w-4 h-4 text-rose-400" /> Close all tabs
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SEARCH INPUT & DRAG HINT */}
      <div className="px-3.5 pt-2.5 pb-1.5 space-y-1.5">
        <div className="w-full h-11 rounded-full bg-[#28292c] border border-[#3c4043] flex items-center px-4 gap-2.5 shadow-sm">
          <Search className="w-4 h-4 text-[#9aa0a6] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your tabs or groups"
            className="w-full bg-transparent text-sm text-white placeholder-[#9aa0a6] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full text-[#9aa0a6] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-[#9aa0a6] px-2 flex items-center justify-between">
          <span>Drag & drop any tab onto another to group, or tap ⋮ for options</span>
          {draggingTabId && <span className="text-cyan-400 font-semibold">Drop to group</span>}
        </p>
      </div>

      {/* TAB GROUPS & CARDS GRID */}
      <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-4 scrollbar-thin scrollbar-thumb-neutral-700">
        {/* Visual Group Containers */}
        {groups.map((group) => {
          const palette = getGroupPalette(group.groupColor);
          const isCollapsed = !!collapsedGroups[group.groupId];
          const isGroupDropActive = dragOverGroupId === group.groupId;

          return (
            <div
              key={group.groupId}
              onDragOver={(e) => {
                if (draggingTabId) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDragOverGroupId(group.groupId);
                }
              }}
              onDragLeave={() => {
                if (dragOverGroupId === group.groupId) setDragOverGroupId(null);
              }}
              onDrop={(e) => handleDropOnGroup(e, group)}
              className={`rounded-2xl border overflow-hidden transition-all ${
                isGroupDropActive
                  ? `ring-2 ${palette.ring} border-transparent bg-[#1a2232]`
                  : `${palette.border} bg-[#181a1f]`
              }`}
            >
              {/* Group Header */}
              <div
                className={`flex items-center justify-between px-3 py-2.5 ${palette.headerBg} border-b border-white/5`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedGroups((prev) => ({
                        ...prev,
                        [group.groupId]: !prev[group.groupId],
                      }))
                    }
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-200 cursor-pointer shrink-0"
                    title={isCollapsed ? 'Expand group' : 'Collapse group'}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${palette.dot}`} />

                  {editingGroupId === group.groupId ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (editingGroupName.trim()) {
                          onRenameGroup?.(group.groupId, editingGroupName.trim());
                        }
                        setEditingGroupId(null);
                      }}
                      className="flex items-center gap-1 flex-1 min-w-0"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                        onBlur={() => {
                          if (editingGroupName.trim()) {
                            onRenameGroup?.(group.groupId, editingGroupName.trim());
                          }
                          setEditingGroupId(null);
                        }}
                        className="bg-black/40 border border-white/20 rounded-md px-2 py-0.5 text-xs text-white focus:outline-none w-full max-w-[160px]"
                      />
                      <button
                        type="submit"
                        className="p-1 text-emerald-300 hover:text-emerald-200 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGroupId(group.groupId);
                        setEditingGroupName(group.groupName);
                      }}
                      className="flex items-center gap-1.5 min-w-0 text-left cursor-pointer group/name"
                      title="Rename group"
                    >
                      <span className="text-xs font-bold text-white truncate">
                        {group.groupName}
                      </span>
                      <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
                    </button>
                  )}

                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${palette.badge}`}
                  >
                    {group.tabs.length}
                  </span>
                </div>

                {/* Group Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {onNewTabInGroup && (
                    <button
                      type="button"
                      onClick={() => {
                        onNewTabInGroup(group.groupId, group.groupName, group.groupColor);
                        onCloseModal();
                      }}
                      title="New tab in this group"
                      className="p-1.5 rounded-lg text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                  {onCloseGroup && (
                    <button
                      type="button"
                      onClick={() => onCloseGroup(group.groupId)}
                      title="Close entire group"
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Group Tabs Grid */}
              {!isCollapsed && (
                <div className="p-2.5 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {group.tabs.map((tab) => renderTabCard(tab))}
                </div>
              )}
            </div>
          );
        })}

        {/* Ungrouped Drop Zone & Grid */}
        <div
          onDragOver={(e) => {
            if (draggingTabId) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDragOverUngrouped(true);
            }
          }}
          onDragLeave={() => setDragOverUngrouped(false)}
          onDrop={handleDropOnUngrouped}
          className={`rounded-2xl transition-all ${
            dragOverUngrouped ? 'ring-2 ring-slate-400/70 bg-white/5 p-2' : ''
          }`}
        >
          {groups.length > 0 && ungroupedTabs.length > 0 && (
            <div className="flex items-center gap-1.5 px-1 pb-2 text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              <span>Ungrouped tabs ({ungroupedTabs.length})</span>
            </div>
          )}

          {ungroupedTabs.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ungroupedTabs.map((tab) => renderTabCard(tab))}
            </div>
          ) : (
            filteredTabs.length === 0 && (
              <div className="py-16 text-center text-sm text-[#9aa0a6]">
                No matching tabs found.
              </div>
            )
          )}
        </div>
      </div>

      {/* Per-Tab Context Menu Sheet */}
      {contextTab && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-3 animate-fadeIn"
          onClick={() => setContextMenuTabId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#25262b] border border-[#3c4043] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[#3c4043] flex items-center justify-between gap-2 bg-[#1e1f23]">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {contextTab.url ? contextTab.title || 'Webpage' : 'OMARVIO Browser'}
                </p>
                <p className="text-[11px] text-[#9aa0a6] truncate">
                  {contextTab.url || 'Home Page'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setContextMenuTabId(null)}
                className="p-1.5 rounded-full text-[#9aa0a6] hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-1.5">
              {/* Explicit 'Add to New Group' option */}
              <button
                type="button"
                onClick={() => {
                  onAddTabToNewGroup?.(contextTab.id);
                  setContextMenuTabId(null);
                }}
                className="w-full px-4 py-3 text-left text-sm text-cyan-300 hover:bg-[#32343a] flex items-center gap-3 cursor-pointer font-medium"
              >
                <FolderPlus className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Add to New Group</span>
              </button>

              {/* Move to existing groups */}
              {allGroupsForMenu
                .filter((g) => g.groupId !== contextTab.groupId)
                .map((g) => {
                  const p = getGroupPalette(g.groupColor);
                  return (
                    <button
                      key={g.groupId}
                      type="button"
                      onClick={() => {
                        onAssignTabToGroup?.(contextTab.id, g.groupId, g.groupName, g.groupColor);
                        setContextMenuTabId(null);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-[#32343a] flex items-center gap-3 cursor-pointer"
                    >
                      <span className={`w-3 h-3 rounded-full shrink-0 ml-0.5 ${p.dot}`} />
                      <span className="truncate">Move to &ldquo;{g.groupName}&rdquo;</span>
                    </button>
                  );
                })}

              {/* Remove from current group */}
              {contextTab.groupId && (
                <button
                  type="button"
                  onClick={() => {
                    onRemoveTabFromGroup?.(contextTab.id);
                    setContextMenuTabId(null);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-amber-300 hover:bg-[#32343a] flex items-center gap-3 cursor-pointer"
                >
                  <FolderMinus className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Remove from &ldquo;{contextTab.groupName}&rdquo;</span>
                </button>
              )}

              {onDuplicateTab && (
                <button
                  type="button"
                  onClick={() => {
                    onDuplicateTab(contextTab.id);
                    setContextMenuTabId(null);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-[#32343a] flex items-center gap-3 cursor-pointer border-t border-[#3c4043]/60"
                >
                  <Copy className="w-4 h-4 text-[#9aa0a6] shrink-0" />
                  <span>Duplicate Tab</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onCloseTab(contextTab.id);
                  setContextMenuTabId(null);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-rose-400 hover:bg-rose-950/40 flex items-center gap-3 cursor-pointer"
              >
                <X className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Close Tab</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Done / Return bar */}
      <div className="w-full p-2.5 bg-[#1e1f23] border-t border-[#28292c] flex items-center justify-between">
        <span className="text-xs text-[#9aa0a6] pl-2">
          {tabs.length} {tabs.length === 1 ? 'tab' : 'tabs'} open
        </span>
        <button
          type="button"
          onClick={onCloseModal}
          className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};
