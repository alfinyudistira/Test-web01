import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Inline translations for zero-network-dependency bootstrap
const resources = {
  en: {
    translation: {
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
    }
  },
  id: {
    translation: {
      app: {
        name: 'Pulse Hiring Intelligence',
        tagline: 'Platform Rekrutmen Kelas Enterprise',
        back: '← Kembali',
        home: 'Beranda',
        settings: 'Pengaturan',
      },
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
    }
  },
  de: {
    translation: {
      app: { name: 'Pulse Hiring Intelligence', tagline: 'Enterprise-Personalvermittlungsplattform', back: '← Zurück', home: 'Startseite', settings: 'Einstellungen' },
      nav: { calculator: 'Eignungsrechner', funnel: 'Einstellungstrichter', salary: 'Gehaltsvergleich', scorecard: 'Bewertungsbogen', di: 'D&I Dashboard', onboarding: 'Onboarding', questions: 'Fragenkatalog', bi: 'Executive BI', settings: 'Einstellungen' },
      hero: { badge: 'Enterprise HR Intelligence', headline: 'Präzise Einstellungen.', subline: 'Wissenschaftlich fundiert, vorurteilsfrei.', cta: 'Plattform starten', stats_total: 'Auswertungen', stats_strong: 'Starke Einstellungen', stats_avg: 'Ø Punktzahl' },
      common: { score: 'Punkte', save: 'Speichern', cancel: 'Abbrechen', reset: 'Zurücksetzen', export: 'Exportieren', loading: 'Laden…', error: 'Etwas ist schiefgelaufen.', empty: 'Noch keine Daten.', days: 'Tage', months: 'Monate', within_budget: '✅ Im Budget', over_budget: '⚠️ Budget überschritten', fill_all: 'Alle Felder ausfüllen.' },
      calculator: { title: 'Kandidateneignungsrechner', subtitle: 'Modul 01 — Vorhersagebewertung', candidateName: 'Name des Kandidaten', expectedSalary: 'Erwartetes Gehalt', save: 'Speichern & Nächsten vergleichen', reset: 'Zurücksetzen ohne Speichern', export_csv: 'Als CSV herunterladen', compare: 'Direkt vergleichen', decision_strong: 'STARKE EINSTELLUNG', decision_hire: 'EINSTELLUNG', decision_maybe: 'VIELLEICHT', decision_no: 'KEINE EINSTELLUNG', decision_critical: 'KEINE EINSTELLUNG — Kritisch' },
      toast: { strong_hire: '🏆 Starke Einstellung gespeichert!', hire: '✓ Kandidat gespeichert', maybe: '⚠️ Überprüfung empfohlen', reset: 'Verlauf zurückgesetzt!', exported: 'Daten erfolgreich exportiert', error_export: 'Keine Daten zum Exportieren!', copied: 'In Zwischenablage kopiert!' },
    }
  },
  fr: {
    translation: {
      app: { name: 'Pulse Hiring Intelligence', tagline: 'Plateforme RH Enterprise', back: '← Retour', home: 'Accueil', settings: 'Paramètres' },
      nav: { calculator: 'Calculateur', funnel: 'Entonnoir', salary: 'Salaires', scorecard: 'Scorecard', di: 'Tableau D&I', onboarding: 'Intégration', questions: 'Banque Q&A', bi: 'BI Exécutif', settings: 'Paramètres' },
      hero: { badge: 'Intelligence RH Enterprise', headline: 'Recrutez avec précision.', subline: 'Décisions scientifiques, zéro biais.', cta: 'Lancer la plateforme', stats_total: 'Évaluations', stats_strong: 'Recrutements forts', stats_avg: 'Score moyen' },
      common: { score: 'Score', save: 'Enregistrer', cancel: 'Annuler', reset: 'Réinitialiser', export: 'Exporter', loading: 'Chargement…', error: 'Une erreur s\'est produite.', empty: 'Aucune donnée.', days: 'jours', months: 'mois', within_budget: '✅ Dans le budget', over_budget: '⚠️ Dépasse le budget', fill_all: 'Remplissez tous les champs.' },
      calculator: { title: 'Calculateur d\'adéquation', subtitle: 'Module 01 — Évaluation prédictive', candidateName: 'Nom du candidat', expectedSalary: 'Salaire souhaité', save: 'Sauvegarder & Comparer', reset: 'Réinitialiser sans sauvegarder', export_csv: 'Télécharger en CSV', compare: 'Comparer', decision_strong: 'FORT RECRUTEMENT', decision_hire: 'RECRUTEMENT', decision_maybe: 'PEUT-ÊTRE', decision_no: 'PAS DE RECRUTEMENT', decision_critical: 'PAS DE RECRUTEMENT — Critique' },
      toast: { strong_hire: '🏆 Fort recrutement enregistré!', hire: '✓ Candidat enregistré', maybe: '⚠️ Révision recommandée', reset: 'Historique réinitialisé!', exported: 'Données exportées', error_export: 'Pas de données à exporter!', copied: 'Copié dans le presse-papiers!' },
    }
  },
  ja: {
    translation: {
      app: { name: 'Pulse採用インテリジェンス', tagline: 'エンタープライズ採用プラットフォーム', back: '← 戻る', home: 'ホーム', settings: '設定' },
      nav: { calculator: '適合度計算', funnel: '採用ファネル', salary: '給与ベンチマーク', scorecard: 'スコアカード', di: 'D&Iダッシュボード', onboarding: 'オンボーディング', questions: '質問バンク', bi: 'エグゼクティブBI', settings: '設定' },
      hero: { badge: 'エンタープライズHRインテリジェンス', headline: '精度の高い採用を。', subline: '科学的根拠に基づく、バイアスゼロの意思決定。', cta: 'プラットフォームを起動', stats_total: '評価数', stats_strong: '強力採用', stats_avg: '平均スコア' },
      common: { score: 'スコア', save: '保存', cancel: 'キャンセル', reset: 'リセット', export: 'エクスポート', loading: '読み込み中…', error: 'エラーが発生しました。', empty: 'データがありません。', days: '日', months: 'ヶ月', within_budget: '✅ 予算内', over_budget: '⚠️ 予算超過', fill_all: '全項目を入力してください。' },
      calculator: { title: '候補者適合度計算', subtitle: 'モジュール01 — 予測スコアリング', candidateName: '候補者名', expectedSalary: '希望給与', save: '保存して次の候補者を比較', reset: '保存せずリセット', export_csv: 'CSVでダウンロード', compare: 'ヘッドトゥヘッド比較', decision_strong: '強力採用', decision_hire: '採用', decision_maybe: '検討中', decision_no: '不採用', decision_critical: '不採用 — 重要基準未達' },
      toast: { strong_hire: '🏆 強力採用をショートリストに追加！', hire: '✓ 候補者を比較プールに追加', maybe: '⚠️ 候補者を保存 — レビュー推奨', reset: 'データ履歴をリセットしました！', exported: 'データをエクスポートしました', error_export: 'エクスポートするデータがありません！', copied: 'クリップボードにコピーしました！' },
    }
  },
  'zh-CN': {
    translation: {
      app: { name: 'Pulse招聘智能平台', tagline: '企业级人才获取平台', back: '← 返回', home: '首页', settings: '设置' },
      nav: { calculator: '匹配计算器', funnel: '招聘漏斗', salary: '薪资基准', scorecard: '评分卡', di: 'D&I仪表板', onboarding: '入职培训', questions: '题库', bi: '高管BI', settings: '设置' },
      hero: { badge: '企业HR智能', headline: '精准招聘。', subline: '基于科学的决策，零偏见。', cta: '启动平台', stats_total: '评估', stats_strong: '强力录用', stats_avg: '平均分' },
      common: { score: '分数', save: '保存', cancel: '取消', reset: '重置', export: '导出', loading: '加载中…', error: '出现错误。', empty: '暂无数据。', days: '天', months: '月', within_budget: '✅ 在预算内', over_budget: '⚠️ 超出预算', fill_all: '请填写所有字段。' },
      calculator: { title: '候选人匹配计算器', subtitle: '模块01 — 预测评分', candidateName: '候选人姓名', expectedSalary: '期望薪资', save: '保存并比较下一位候选人', reset: '不保存重置', export_csv: '下载CSV', compare: '头对头比较', decision_strong: '强力录用', decision_hire: '录用', decision_maybe: '待定', decision_no: '不录用', decision_critical: '不录用 — 关键项失败' },
      toast: { strong_hire: '🏆 强力录用已加入候选名单！', hire: '✓ 候选人已加入比较池', maybe: '⚠️ 候选人已保存 — 建议审查', reset: '历史数据已重置！', exported: '数据导出成功', error_export: '暂无数据可导出！', copied: '已复制到剪贴板！' },
    }
  },
  ar: {
    translation: {
      app: { name: 'Pulse للتوظيف الذكي', tagline: 'منصة اكتساب المواهب المؤسسية', back: '→ رجوع', home: 'الرئيسية', settings: 'الإعدادات' },
      nav: { calculator: 'حاسبة الملاءمة', funnel: 'قمع التوظيف', salary: 'معيار الرواتب', scorecard: 'بطاقة النقاط', di: 'لوحة التنوع', onboarding: 'الإعداد', questions: 'بنك الأسئلة', bi: 'ذكاء الأعمال', settings: 'الإعدادات' },
      hero: { badge: 'ذكاء الموارد البشرية المؤسسية', headline: 'وظّف بدقة.', subline: 'قرارات علمية، صفر تحيز.', cta: 'إطلاق المنصة', stats_total: 'تقييمات', stats_strong: 'توظيف قوي', stats_avg: 'متوسط الدرجات' },
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
