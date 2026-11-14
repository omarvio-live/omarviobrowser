/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SecurityAuditResult {
  isSafe: boolean;
  riskLevel: 'safe' | 'suspicious' | 'dangerous';
  threatTitle?: string;
  threatDescription?: string;
  url: string;
}

// Known phishing, scam patterns, and dangerous financial fraud keywords
const SCAM_PATTERNS = [
  /bkash.*(?:login|verify|free|money|gift|offer)/i,
  /nagad.*(?:login|verify|bonus|claim)/i,
  /paypal.*(?:account-security|re-verify|unusual)/i,
  /free-giftcard/i,
  /claim-reward/i,
  /crypto-double/i,
  /binary-invest/i,
  /login-secure-auth.*\.top/i,
  /\.xyz.*login/i,
  /banking.*update-info/i,
  /lottery-winner/i,
];

const SUSPICIOUS_TLDS = ['.xyz', '.top', '.buzz', '.work', '.click', '.loan', '.gq', '.cf'];

// Omarvio Link Clinic: Pre-flight security scanner
export const auditUrlSecurity = (targetUrl: string): SecurityAuditResult => {
  if (!targetUrl || targetUrl === 'about:blank') {
    return { isSafe: true, riskLevel: 'safe', url: targetUrl };
  }

  try {
    const urlObj = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
    const host = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    const search = urlObj.search.toLowerCase();
    const full = `${host}${pathname}${search}`;

    // 1. Direct Scam & Phishing pattern match
    for (const pattern of SCAM_PATTERNS) {
      if (pattern.test(full)) {
        return {
          isSafe: false,
          riskLevel: 'dangerous',
          threatTitle: 'Financial Phishing & Scam Detected',
          threatDescription:
            'This link attempts to impersonate a financial institution or money service to steal credentials or wallet data. Do not enter passwords or PINs.',
          url: targetUrl,
        };
      }
    }

    // 2. Suspicious TLD combined with login/security words
    const hasSuspiciousTld = SUSPICIOUS_TLDS.some((tld) => host.endsWith(tld));
    if (hasSuspiciousTld && (full.includes('login') || full.includes('bank') || full.includes('verify'))) {
      return {
        isSafe: false,
        riskLevel: 'dangerous',
        threatTitle: 'Suspicious High-Risk Domain',
        threatDescription:
          'This domain uses a high-risk registry often associated with disposable malware campaigns and credential harvesting.',
        url: targetUrl,
      };
    }

    // 3. IP-based direct access (e.g. http://192.168... or http://45.33...)
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
      return {
        isSafe: false,
        riskLevel: 'suspicious',
        threatTitle: 'Raw IP Host Access',
        threatDescription:
          'This site is hosted directly on a numeric IP without an SSL certificate or registered domain identity.',
        url: targetUrl,
      };
    }

    return { isSafe: true, riskLevel: 'safe', url: targetUrl };
  } catch {
    return { isSafe: true, riskLevel: 'safe', url: targetUrl };
  }
};
