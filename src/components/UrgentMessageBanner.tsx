/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Urgent Emergency Broadcast Banner (জরুরী বার্তা)
 * Controlled directly by Master Admin.
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info, Bell, X } from 'lucide-react';
import { getAppCustomization, AppCustomization, subscribeAdminStore } from '../engine/adminStore';

export const UrgentMessageBanner: React.FC = () => {
  const [customization, setCustomization] = useState<AppCustomization>(getAppCustomization);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const unsub = subscribeAdminStore(() => {
      setCustomization(getAppCustomization());
      setIsDismissed(false);
    });
    return unsub;
  }, []);

  if (!customization.urgentMessageActive || !customization.urgentMessage || isDismissed) {
    return null;
  }

  const typeStyles = {
    info: 'bg-cyan-950/90 border-cyan-500/40 text-cyan-200',
    warning: 'bg-amber-950/90 border-amber-500/40 text-amber-200',
    alert: 'bg-rose-950/90 border-rose-500/50 text-rose-200',
  };

  return (
    <aside
      aria-label="জরুরি নোটিশ"
      className={`w-full px-3 py-1.5 border-b text-xs flex items-center justify-between gap-2 z-40 backdrop-blur-md animate-fadeIn select-none shadow-md ${
        typeStyles[customization.urgentMessageType] || typeStyles.info
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="p-1 rounded-full bg-white/10 shrink-0">
          <Bell className="w-3.5 h-3.5 animate-bounce" />
        </span>
        <span className="font-bold text-[11px] truncate leading-tight">
          {customization.urgentMessage}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        className="p-1 rounded-md hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
        title="বাতিল করুন"
        aria-label="জরুরি নোটিশ বন্ধ করুন"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </aside>
  );
};
