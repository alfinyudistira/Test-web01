/* ═══════════════════════════════════════════════════════════════════════════
   PULSE GLOBALIZATION ENGINE — ENTERPRISE i18n v3.0
   Type-safe | Lazy-loading | RTL-aware | Multi-tenant | Reactive
   ═══════════════════════════════════════════════════════════════════════════ */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import type { Locale } from '@/types';

// ============================================================================
// 1. TRANSLATION SCHEMA (Single Source of Truth — Bahasa Inggris)
// ============================================================================
const enTranslation = {
  app: {
    name: 'Pulse Hiring Intelligence',
    tagline: 'Enterprise Talent Acquisition Platform',
    back: '← Back',
    home: 'Home',
    settings: 'Settings',
  },
  nav: {
    calculator: 'Fit Calculator',
    funnel: 'Hiring Funnel',
    salary: 'Salary Bench',
    scorecard: 'Scorecard',
    di: 'D&I Dashboard',
    onboarding: 'Onboarding',
    questions: 'Question Bank',
    bi: 'Executive BI',
    settings: 'Settings',
  },
  hero: {
    badge: 'Enterprise HR Intelligence',
    headline: 'Hire with Precision.',
    subline: 'Science-backed decisions, zero bias.',
    cta: 'Launch Platform',
    stats_total: 'Evaluations',
    stats_strong: 'Strong Hires',
    stats_avg: 'Avg Score',
  },
  calculator: {
    title: 'Candidate Fit Calculator',
    subtitle: 'Module 01 — Predictive Scoring',
    candidateName: 'Candidate Name',
    expectedSalary: 'Expected Salary',
    save: 'Save & Compare Next Candidate',
    reset: 'Reset Without Saving',
    export_csv: 'Download as CSV',
    compare: 'Compare Head-to-Head',
    decision_strong: 'STRONG HIRE',
    decision_hire: 'HIRE',
    decision_maybe: 'MAYBE — Team Discussion',
    decision_no: 'NO HIRE',
    decision_critical: 'NO HIRE — Critical Hurdle Failed',
  },
  common: {
    score: 'Score',
    save: 'Save',
    cancel: 'Cancel',
    reset: 'Reset',
    export: 'Export',
    loading: 'Loading…',
    error: 'Something went wrong.',
    empty: 'No data yet.',
    days: 'days',
    months: 'months',
    within_budget: '✅ Within budget',
    over_budget: '⚠️ Exceeds budget — negotiation required',
    fill_all: 'Fill all fields to unlock this feature.',
  },
  toast: {
    strong_hire: '🏆 STRONG HIRE saved to shortlist!',
    hire: '✓ Candidate saved to comparison pool',
    maybe: '⚠️ Candidate saved — review recommended',
    reset: 'Data history successfully reset!',
    exported: 'Data exported successfully',
    error_export: 'No data to export yet!',
    copied: 'Copied to clipboard!',
  },
  ai: {
    analyzing: 'AI is analyzing candidate data...',
    risk_detected: 'Risk analysis: {{level}} detected',
    summary_gen: 'Generating executive summary...',
  },
} as const;

// Type untuk autocomplete
export type TranslationKey = keyof typeof enTranslation;
export type NestedKey<T> = T extends object
  ? { [K in keyof T]: K extends string ? (T[K] extends object ? `${K}.${NestedKey<T[K]>}` : K) : never }[keyof T]
  : never;
export type I18nKey = NestedKey<typeof enTranslation>;

// ============================================================================
// 2. LANGUAGE METADATA
// ============================================================================
export type LanguageCode = 'en' | 'id' | 'de' | 'fr' | 'ja' | 'zh-CN' | 'ar';

export interface LanguageMeta {
  code: LanguageCode;
  label: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  locale: Locale;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', label: 'English', flag: '🇺🇸', dir: 'ltr', locale: 'en-US' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr', locale: 'id-ID' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', dir: 'ltr', locale: 'de-DE' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', dir: 'ltr', locale: 'fr-FR' },
  { code: 'ja', label: '日本語', flag: '🇯🇵', dir: 'ltr', locale: 'ja-JP' },
  { code: 'zh-CN', label: '中文（简体）', flag: '🇨🇳', dir: 'ltr', locale: 'zh-CN' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', dir: 'rtl', locale: 'ar-SA' },
];

// ============================================================================
// 3. BASE RESOURCES (inline untuk bahasa yang sudah lengkap)
// ============================================================================
const idTranslation: typeof enTranslation = {
  app: { ...enTranslation.app, tagline: 'Platform Rekrutmen Kelas Enterprise' },
  nav: {
    calculator: 'Kalkulator Kecocokan',
    funnel: 'Corong Rekrutmen',
    salary: 'Benchmark Gaji',
    scorecard: 'Scorecard',
    di: 'Dashboard D&I',
    onboarding: 'Onboarding',
    questions: 'Bank Pertanyaan',
    bi: 'BI Eksekutif',
    settings: 'Pengaturan',
  },
  hero: {
    badge: 'Kecerdasan HR Enterprise',
    headline: 'Rekrut dengan Presisi.',
    subline: 'Keputusan berbasis sains, tanpa bias.',
    cta: 'Buka Platform',
    stats_total: 'Evaluasi',
    stats_strong: 'Strong Hire',
    stats_avg: 'Skor Rata-rata',
  },
  calculator: {
    title: 'Kalkulator Kecocokan Kandidat',
    subtitle: 'Modul 01 — Penilaian Prediktif',
    candidateName: 'Nama Kandidat',
    expectedSalary: 'Gaji yang Diharapkan',
    save: 'Simpan & Bandingkan Kandidat Berikutnya',
    reset: 'Reset Tanpa Menyimpan',
    export_csv: 'Unduh sebagai CSV',
    compare: 'Bandingkan Head-to-Head',
    decision_strong: 'STRONG HIRE',
    decision_hire: 'HIRE',
    decision_maybe: 'MUNGKIN — Diskusi Tim',
    decision_no: 'NO HIRE',
    decision_critical: 'NO HIRE — Gagal Hurdle Kritis',
  },
  common: {
    score: 'Skor',
    save: 'Simpan',
    cancel: 'Batal',
    reset: 'Reset',
    export: 'Ekspor',
    loading: 'Memuat…',
    error: 'Terjadi kesalahan.',
    empty: 'Belum ada data.',
    days: 'hari',
    months: 'bulan',
    within_budget: '✅ Dalam anggaran',
    over_budget: '⚠️ Melebihi anggaran — negosiasi diperlukan',
    fill_all: 'Isi semua kolom untuk membuka fitur ini.',
  },
  toast: {
    strong_hire: '🏆 STRONG HIRE tersimpan ke shortlist!',
    hire: '✓ Kandidat tersimpan ke pool perbandingan',
    maybe: '⚠️ Kandidat tersimpan — perlu review',
    reset: 'Riwayat data berhasil direset!',
    exported: 'Data berhasil diekspor',
    error_export: 'Belum ada data untuk diekspor!',
    copied: 'Disalin ke clipboard!',
  },
  ai: {
    analyzing: 'AI sedang menganalisis data kandidat...',
    risk_detected: 'Analisis risiko: {{level}} terdeteksi',
    summary_gen: 'Membuat ringkasan eksekutif...',
  },
};

// Inline resources (bisa ditambah untuk bahasa lain, tapi untuk demo cukup en & id)
const resources: Partial<Record<LanguageCode, { translation: typeof enTranslation }>> = {
  en: { translation: enTranslation },
  id: { translation: idTranslation },
};

// ============================================================================
// 4. LAZY LOADER (untuk namespace tambahan atau bahasa yang tidak di-inline)
// ============================================================================
const loadedNamespaces = new Map<string, number>(); // key = "lang:ns", value = timestamp
const NAMESPACE_TTL = 5 * 60 * 1000; // 5 menit

export async function loadNamespace(lang: LanguageCode, ns: string): Promise<void> {
  const key = `${lang}:${ns}`;
  const lastLoaded = loadedNamespaces.get(key);
  if (lastLoaded && Date.now() - lastLoaded < NAMESPACE_TTL) return;

  try {
    // Dynamic import dari folder locales (sesuaikan path dengan struktur proyek)
    const module = await import(`./locales/${lang}/${ns}.json`);
    i18n.addResourceBundle(lang, ns, module.default, true, true);
    loadedNamespaces.set(key, Date.now());
  } catch (err) {
    console.warn(`[i18n] Failed to load namespace ${ns} for ${lang}`, err);
  }
}

export async function loadLanguage(lang: LanguageCode): Promise<void> {
  const namespaces = ['common', 'app', 'nav', 'calculator', 'toast', 'ai'];
  await Promise.all(namespaces.map((ns) => loadNamespace(lang, ns)));
  await i18n.changeLanguage(lang);
  applyDirection(lang);
}

// ============================================================================
// 5. RTL HANDLER & DIRECTION
// ============================================================================
export function applyDirection(lang: LanguageCode): void {
  const meta = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
  if (meta) {
    document.documentElement.dir = meta.dir;
    document.documentElement.lang = meta.locale;
  }
}

// ============================================================================
// 6. LANGUAGE SWITCH & HELPERS
// ============================================================================
export async function setLanguage(lang: LanguageCode): Promise<void> {
  localStorage.setItem('pulse_lang', lang);
  await loadLanguage(lang);
  emitLanguageChange(lang);
}

export function getCurrentLanguage(): LanguageCode {
  return (i18n.language as LanguageCode) || 'en';
}

export function getCurrentLanguageMeta(): LanguageMeta {
  return SUPPORTED_LANGUAGES.find((l) => l.code === getCurrentLanguage()) || SUPPORTED_LANGUAGES[0];
}

export function tSafe(key: string, fallback?: string): string {
  const result = i18n.t(key);
  if (result === key || !result) return fallback ?? key;
  return result;
}

// ============================================================================
// 7. EVENT EMITTER (reactive)
// ============================================================================
type LanguageChangeListener = (lang: LanguageCode) => void;
const langListeners = new Set<LanguageChangeListener>();

export function onLanguageChange(listener: LanguageChangeListener): () => void {
  langListeners.add(listener);
  return () => langListeners.delete(listener);
}

function emitLanguageChange(lang: LanguageCode): void {
  langListeners.forEach((fn) => fn(lang));
}

// ============================================================================
// 8. MULTI-TENANT OVERRIDE
// ============================================================================
export function injectTenantTranslations(
  lang: LanguageCode,
  namespace: string,
  data: Record<string, unknown>
): void {
  i18n.addResourceBundle(lang, namespace, data, true, true);
}

// ============================================================================
// 9. FORMATTERS (integrasi dengan i18n locale)
// ============================================================================
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  locale?: string
): string {
  const l = locale || getCurrentLanguageMeta().locale;
  return new Intl.NumberFormat(l, {
    style: 'currency',
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatDate(date: Date | string, locale?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const l = locale || getCurrentLanguageMeta().locale;
  return new Intl.DateTimeFormat(l, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

export function formatNumber(value: number, locale?: string): string {
  const l = locale || getCurrentLanguageMeta().locale;
  return new Intl.NumberFormat(l).format(value);
}

// ============================================================================
// 10. INITIALIZATION
// ============================================================================
let initialized = false;

export async function initI18n(options?: { fallbackLng?: LanguageCode; debug?: boolean }): Promise<void> {
  if (initialized) return;

  const fallback = options?.fallbackLng || 'en';

  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: resources as any, // typecast karena kita hanya punya en & id inline
      fallbackLng: [fallback],
      supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
      ns: ['common', 'app', 'nav', 'calculator', 'toast', 'ai'],
      defaultNS: 'common',
      interpolation: { escapeValue: false },
      detection: {
        order: ['localStorage', 'querystring', 'navigator'],
        caches: ['localStorage'],
      },
      react: { useSuspense: true },
      debug: options?.debug ?? import.meta.env.DEV,
    });

  // Pastikan RTL diterapkan
  const currentLang = getCurrentLanguage();
  applyDirection(currentLang);
  emitLanguageChange(currentLang);

  // Jika bahasa saat ini bukan en atau id (tidak ada inline), coba lazy load
  if (currentLang !== 'en' && currentLang !== 'id') {
    await loadLanguage(currentLang).catch(console.warn);
  }

  initialized = true;
}

// ============================================================================
// 11. EXPORT INSTANCE & TYPES
// ============================================================================
export default i18n;
export type { LanguageCode, Locale };قييمات', stats_strong: 'توظيف قوي', stats_avg: 'متوسط الدرجات' },
      common: { score: 'الدرجة', save: 'حفظ', cancel: 'إلغاء', reset: 'إعادة تعيين', export: 'تصدير', loading: 'جاري التحميل…', error: 'حدث خطأ.', empty: 'لا توجد بيانات.', days: 'أيام', months: 'أشهر', within_budget: '✅ ضمن الميزانية', over_budget: '⚠️ تجاوز الميزانية', fill_all: 'يرجى ملء جميع الحقول.' },
      calculator: { title: 'حاسبة ملاءمة المرشح', subtitle: 'الوحدة 01 — التقييم التنبؤي', candidateName: 'اسم المرشح', expectedSalary: 'الراتب المتوقع', save: 'حفظ ومقارنة المرشح التالي', reset: 'إعادة تعيين دون حفظ', export_csv: 'تنزيل CSV', compare: 'مقارنة مباشرة', decision_strong: 'توظيف قوي', decision_hire: 'توظيف', decision_maybe: 'ربما', decision_no: 'لا توظيف', decision_critical: 'لا توظيف — فشل في المعيار الحاسم' },
      toast: { strong_hire: '🏆 تم حفظ التوظيف القوي في القائمة المختصرة!', hire: '✓ تم حفظ المرشح في مجموعة المقارنة', maybe: '⚠️ تم حفظ المرشح — يُنصح بالمراجعة', reset: 'تم إعادة تعيين سجل البيانات!', exported: 'تم تصدير البيانات بنجاح', error_export: 'لا توجد بيانات للتصدير!', copied: 'تم النسخ إلى الحافظة!' },
    }
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'id', 'de', 'fr', 'ja', 'zh-CN', 'ar'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['querystring', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;

// Language metadata for the Settings UI
export const SUPPORTED_LANGUAGES = [
  { code: 'en',    label: 'English',    flag: '🇺🇸', dir: 'ltr', locale: 'en-US' },
  { code: 'id',    label: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr', locale: 'id-ID' },
  { code: 'de',    label: 'Deutsch',    flag: '🇩🇪', dir: 'ltr', locale: 'de-DE' },
  { code: 'fr',    label: 'Français',   flag: '🇫🇷', dir: 'ltr', locale: 'fr-FR' },
  { code: 'ja',    label: '日本語',      flag: '🇯🇵', dir: 'ltr', locale: 'ja-JP' },
  { code: 'zh-CN', label: '中文（简体）', flag: '🇨🇳', dir: 'ltr', locale: 'zh-CN' },
  { code: 'ar',    label: 'العربية',    flag: '🇸🇦', dir: 'rtl', locale: 'ar-SA' },
] as const;
