/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LanguageCode = 'en' | 'bn' | 'hi' | 'ar' | 'es';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English (Default)', flag: '🇺🇸' },
  { code: 'bn', label: 'বাংলা (Bengali)', flag: '🇧🇩' },
  { code: 'hi', label: 'हिन्दी (Hindi)', flag: '🇮🇳' },
  { code: 'ar', label: 'العربية (Arabic)', flag: '🇸🇦' },
  { code: 'es', label: 'Español (Spanish)', flag: '🇪🇸' },
];

const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    slogan: '“My Phone, My Data – Why Surrender It To Others!”',
    searchPlaceholder: 'Search privately or enter web address...',
    newTab: 'New Tab',
    tabsOverview: 'Open Tabs',
    panicButton: 'PANIC',
    panicConfirm: 'CONFIRM EMERGENCY WIPE',
    panicDescription: 'Wipe all open tabs, active sessions, cache, and navigation memory instantly.',
    settingsTitle: 'Settings & Privacy Hub',
    tabGeneral: 'General',
    tabAI: 'AI Models',
    tabPrivacy: 'Privacy & Shield',
    tabVault: 'Vault',
    tabFeedback: 'Feedback & Support',
    tabDisplay: 'Display & Theme',
    tabAbout: 'About',
    feedbackTitle: 'Feedback & Official Support',
    feedbackEmail: 'Official Email',
    feedbackTelegram: 'Telegram Support Channel',
    aiModelsTitle: 'AI Models & Intelligence Engine',
    language: 'Language / ভাষা',
    linkClinic: 'Omarvio Link Clinic',
    linkClinicDesc: 'Pre-flight scam & phishing radar check',
    oledDarkMode: 'Force OLED True Black',
    oledDarkDesc: 'Energy-saving dark mode for all sites',
    cookieRejecter: 'Cookie Pop-up Auto-Rejecter',
    cookieRejecterDesc: 'Silently reject tracking consent banners',
    setDefaultBrowser: 'Set as Default Browser',
    downloads: 'Downloads & Offline Files',
    clearCache: 'Clear Cache & Free Memory',
    audioOnly: 'Audio Only',
    saveMedia: 'Save',
    translatePage: 'Translate Page',
    lensScan: 'Privacy Lens Scanner',
    trackersBlocked: 'Trackers Blocked',
    dataSaved: 'MB Saved',
    zeroServerLoad: '0% Server Load',
    back: 'Back',
    searchEngine: 'Search Engine',
    vault: 'Encrypted Vault',
    advancedPrivacy: 'Advanced Threat Shield',
    shareQr: 'Share via QR Code',
    aboutBrowser: 'About OMARVIO',
  },
  bn: {
    slogan: '“আমার ফোন, আমার ডেটা – কেন দেব অন্যের হাতে!”',
    searchPlaceholder: 'গোপনে সার্চ করুন বা ওয়েবসাইটের ঠিকানা লিখুন...',
    newTab: 'নতুন ট্যাব',
    tabsOverview: 'খোলা ট্যাবসমূহ',
    panicButton: 'প্যানিক',
    panicConfirm: 'জরুরি মেমোরি ধ্বংস নিশ্চিত করুন',
    panicDescription: 'এক ক্লিকে সমস্ত খোলা ট্যাব, সেশন, ক্যাশ এবং মেমোরি স্থায়ীভাবে মুছে ফেলুন।',
    settingsTitle: 'সেটিংস ও প্রাইভেসি হাব',
    tabGeneral: 'সাধারণ',
    tabAI: 'AI মডেল',
    tabPrivacy: 'প্রাইভেসি',
    tabVault: 'ভল্ট',
    tabFeedback: 'মতামত ও সহায়তা',
    tabDisplay: 'থিম ও ডিসপ্লে',
    tabAbout: 'পরিচিতি',
    feedbackTitle: 'মতামত ও অফিসিয়াল সহায়তা',
    feedbackEmail: 'অফিসিয়াল ইমেইল',
    feedbackTelegram: 'টেলিগ্রাম সাপোর্ট চ্যানেল',
    aiModelsTitle: 'AI মডেল ও ইন্টেলিজেন্স ইঞ্জিন',
    language: 'ভাষা পরিবর্তন (Language)',
    linkClinic: 'ওমারভিও লিঙ্ক ক্লিনিক',
    linkClinicDesc: 'লিংকে প্রবেশের পূর্বে স্ক্যাম ও ফিশিং পরীক্ষা',
    oledDarkMode: 'OLED ট্রু ব্ল্যাক ডার্ক মোড',
    oledDarkDesc: 'সব সাইটের জন্য ব্যাটারি সাশ্রয়ী ডার্ক থিম',
    cookieRejecter: 'কুকি ব্যানার অটো-রিজেক্টর',
    cookieRejecterDesc: 'বিরক্তিকর ট্র্যাকিং কুকি পপ-আপ স্বয়ংক্রিয় বাতিল',
    setDefaultBrowser: 'ডিফল্ট ব্রাউজার হিসেবে সেট করুন',
    downloads: 'ডাউনলোড ও অফলাইন ফাইল',
    clearCache: 'ক্যাশ মুছে ফোন খালি করুন',
    audioOnly: 'শুধু অডিও',
    saveMedia: 'সংরক্ষণ',
    translatePage: 'পেজ অনুবাদ করুন',
    lensScan: 'প্রাইভেসি লেন্স স্ক্যানার',
    trackersBlocked: 'ট্র্যাকার ব্লক হয়েছে',
    dataSaved: 'MB সাশ্রয় হয়েছে',
    zeroServerLoad: '০% সার্ভার লোড',
    back: 'পেছনে',
    searchEngine: 'সার্চ ইঞ্জিন',
    vault: 'এনক্রিপ্টেড ভল্ট',
    advancedPrivacy: 'উন্নত থ্রেট শিল্ড',
    shareQr: 'QR কোডে শেয়ার করুন',
    aboutBrowser: 'ওমারভিও সম্পর্কে',
  },
  hi: {
    slogan: '“मेरा फ़ोन, मेरा डेटा – दूसरों को क्यों सौंपें!”',
    searchPlaceholder: 'निजी तौर पर खोजें या वेब पता दर्ज करें...',
    newTab: 'नया टैब',
    tabsOverview: 'खुले टैब',
    panicButton: 'पैनिक',
    panicConfirm: 'आपातकालीन वाइप की पुष्टि करें',
    panicDescription: 'सभी खुले टैब, सत्र, कैश और मेमोरी को तुरंत मिटाएं।',
    settingsTitle: 'सेटिंग्स और गोपनीयता केंद्र',
    language: 'भाषा बदलें (Language)',
    linkClinic: 'ओमारवियो लिंक क्लीनिक',
    linkClinicDesc: 'फ़िशिंग और घोटाले की पूर्व जांच',
    oledDarkMode: 'OLED ट्रू ब्लैक डार्क मोड',
    oledDarkDesc: 'सभी वेबसाइटों के लिए डार्क थीम',
    cookieRejecter: 'कुकी बैनर ऑटो-रिजेक्टर',
    cookieRejecterDesc: 'ट्रैकिंग कुकीज़ को स्वतः अस्वीकार करें',
    setDefaultBrowser: 'डिफ़ॉल्ट ब्राउज़र बनाएं',
    downloads: 'डाउनलोड और ऑफ़लाइन फाइलें',
    clearCache: 'कैश साफ़ करें और मेमोरी खाली करें',
    audioOnly: 'केवल ऑडियो',
    saveMedia: 'सहेजें',
    translatePage: 'पेज अनुवाद करें',
    lensScan: 'गोपनीयता लेंस स्कैनर',
    trackersBlocked: 'ट्रैकर्स अवरुद्ध',
    dataSaved: 'MB बचत',
    zeroServerLoad: '0% सर्वर लोड',
    back: 'पीछे',
    searchEngine: 'सर्च इंजन',
    vault: 'एन्क्रिप्टेड वॉल्ट',
    advancedPrivacy: 'उन्नत सुरक्षा कवच',
    shareQr: 'QR कोड से साझा करें',
    aboutBrowser: 'ओमारवियो के बारे में',
  },
  ar: {
    slogan: '“هاتفي، بياناتي – لماذا أسلّمها للآخرين!”',
    searchPlaceholder: 'ابحث بخصوصية أو اكتب عنوان الموقع...',
    newTab: 'علامة تبويب جديدة',
    tabsOverview: 'علامات التبويب المفتوحة',
    panicButton: 'طوارئ',
    panicConfirm: 'تأكيد المسح الفوري',
    panicDescription: 'امسح جميع علامات التبويب المفتوحة والجلسات والذاكرة فوراً.',
    settingsTitle: 'الإعدادات والخصوصية',
    language: 'تغيير اللغة (Language)',
    linkClinic: 'عيادة الروابط الآمنة',
    linkClinicDesc: 'فحص مسبق للاحتيال والتصيد',
    oledDarkMode: 'الوضع الداكن الفائق',
    oledDarkDesc: 'وضع داكن موفر للطاقة لكل المواقع',
    cookieRejecter: 'رفض ملفات تعريف الارتباط تلقائياً',
    cookieRejecterDesc: 'حظر نوافذ التتبع المزعجة',
    setDefaultBrowser: 'تعيين كمتصفح افتراضي',
    downloads: 'التنزيلات والملفات غير المتصلة',
    clearCache: 'مسح التخزين المؤقت وتفريغ الذاكرة',
    audioOnly: 'صوت فقط',
    saveMedia: 'حفظ',
    translatePage: 'ترجمة الصفحة',
    lensScan: 'ماسح العدسة للخصوصية',
    trackersBlocked: 'متعقب محظور',
    dataSaved: 'ميجابايت تم توفيرها',
    zeroServerLoad: '0% حمولة خادم',
    back: 'رجوع',
    searchEngine: 'محرك البحث',
    vault: 'الخزنة المشفرة',
    advancedPrivacy: 'درع التهديدات المتقدم',
    shareQr: 'مشاركة برمز QR',
    aboutBrowser: 'حول أومارفيو',
  },
  es: {
    slogan: '“¡Mi teléfono, mis datos: ¿por qué entregárselos a otros?!”',
    searchPlaceholder: 'Busca con privacidad o escribe una dirección...',
    newTab: 'Nueva pestaña',
    tabsOverview: 'Pestañas abiertas',
    panicButton: 'PÁNICO',
    panicConfirm: 'CONFIRMAR BORRADO DE EMERGENCIA',
    panicDescription: 'Borre todas las pestañas, sesiones y memoria caché al instante.',
    settingsTitle: 'Ajustes y Privacidad',
    language: 'Idioma (Language)',
    linkClinic: 'Omarvio Link Clinic',
    linkClinicDesc: 'Detección previa de fraudes y phishing',
    oledDarkMode: 'Modo OLED Negro Puro',
    oledDarkDesc: 'Modo oscuro para ahorrar batería en todas las páginas',
    cookieRejecter: 'Rechazador automático de cookies',
    cookieRejecterDesc: 'Rechaza ventanas de cookies de rastreo en silencio',
    setDefaultBrowser: 'Establecer como navegador predeterminado',
    downloads: 'Descargas y Archivos sin conexión',
    clearCache: 'Limpiar caché y liberar memoria',
    audioOnly: 'Solo audio',
    saveMedia: 'Guardar',
    translatePage: 'Traducir página',
    lensScan: 'Escáner de Privacidad Lens',
    trackersBlocked: 'Rastreadores bloqueados',
    dataSaved: 'MB ahorrados',
    zeroServerLoad: '0% Carga en Servidor',
    back: 'Atrás',
    searchEngine: 'Motor de búsqueda',
    vault: 'Bóveda Cifrada',
    advancedPrivacy: 'Escudo de Seguridad Avanzada',
    shareQr: 'Compartir con código QR',
    aboutBrowser: 'Acerca de OMARVIO',
  },
};

let currentLang: LanguageCode = 'en';
let langListeners: ((lang: LanguageCode) => void)[] = [];

export const getLanguage = (): LanguageCode => currentLang;

export const setLanguage = (lang: LanguageCode) => {
  currentLang = lang;
  try {
    localStorage.setItem('omarvio_lang', lang);
  } catch {}
  langListeners.forEach((fn) => fn(lang));
};

export const t = (key: string): string => {
  return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS.en[key] || key;
};

export const subscribeLanguage = (fn: (lang: LanguageCode) => void) => {
  langListeners.push(fn);
  return () => {
    langListeners = langListeners.filter((l) => l !== fn);
  };
};
