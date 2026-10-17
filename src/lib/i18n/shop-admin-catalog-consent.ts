// Shop-Admin Catalog Consent namespace (F5980 AC1) — consent to the catalogue onboarding,
// shown in the onboarding wizard (StepContact) and in the portal card (catalog-review page).
// Part of Shop-Admin Clean Boundary: no imports from customer-facing code.
//
// ═══ VERSION RULE (legal proof) ═══════════════════════════════════════════════════════════
// The consent TEXT of a published version is NEVER edited. The wording of
// `catalog_consent_checkbox_label`, `catalog_consent_text`, `catalog_consent_details_prefix`,
// `catalog_consent_link_privacy` and `catalog_consent_link_terms` below is version
// '2026-10-16.v1' (src/lib/onboarding/catalogConsent.ts). Every wording change needs a NEW
// version constant there + a new entry in the backend allowlist
// (pundo_main_backend: ingestor/schemas/catalog_consent.py::CATALOG_CONSENT_TEXT_VERSIONS);
// the old wording stays reproducible through Git history. Pure UI strings (card title, buttons,
// errors) are not part of the proof and may be changed freely.
//
// ⚠️ DRAFT: the wording of v1 is an architect draft (02-architecture §8) and must be approved by
// Bernhard (open decision E1) BEFORE the first push. Until then no consent text is "published".
// ═════════════════════════════════════════════════════════════════════════════════════════

const shopAdminCatalogConsentTranslations = {
  en: {
    catalog_consent_checkbox_label: 'Yes, Pundo may import and prepare my product catalogue from my website.',
    catalog_consent_text: 'With your consent, Pundo imports the products (names, descriptions, images, prices) from the website you entered, and automatically describes, translates into 6 languages and categorises them. Nothing goes live until you approve the result in your shop portal. You confirm that you hold the rights to these texts and images and allow Pundo to use them for your listings on Pundo. We store only the time of your consent, the version of this text and your account. You can withdraw your consent at any time by contacting us.',
    catalog_consent_details_prefix: 'Details:',
    catalog_consent_link_privacy: 'Privacy policy',
    catalog_consent_link_terms: 'Terms',
    catalog_consent_show_details: 'Show details',
    catalog_consent_hide_details: 'Hide details',
    catalog_consent_card_title: 'Catalogue onboarding',
    catalog_consent_submit: 'Agree and start catalogue onboarding',
    catalog_consent_saving: 'Saving…',
    catalog_consent_no_source: 'To import your catalogue, Pundo needs the address of your website or online shop.',
    catalog_consent_no_source_link: 'Add website in profile',
    catalog_consent_given: 'Agreed on {date} (version {version})',
    catalog_consent_error: 'Your consent could not be saved. Please try again.',
    catalog_consent_retry: 'Try again',
    catalog_consent_version_error: 'The consent text has changed. Please reload the page and confirm again.',
  },
  de: {
    catalog_consent_checkbox_label: 'Ja, Pundo darf meinen Produktkatalog von meiner Website übernehmen und aufbereiten.',
    catalog_consent_text: 'Mit deiner Zustimmung übernimmt Pundo die Produkte (Namen, Beschreibungen, Bilder, Preise) von der angegebenen Website, beschreibt sie automatisch, übersetzt sie in 6 Sprachen und ordnet sie Kategorien zu. Nichts geht live, bevor du das Ergebnis in deinem Shop-Portal freigibst. Du bestätigst, dass du die Rechte an diesen Texten und Bildern hast, und erlaubst Pundo, sie für deine Einträge auf Pundo zu verwenden. Wir speichern nur den Zeitpunkt deiner Zustimmung, die Version dieses Texts und dein Konto. Du kannst deine Zustimmung jederzeit widerrufen, indem du uns kontaktierst.',
    catalog_consent_details_prefix: 'Details:',
    catalog_consent_link_privacy: 'Datenschutz',
    catalog_consent_link_terms: 'AGB',
    catalog_consent_show_details: 'Details anzeigen',
    catalog_consent_hide_details: 'Details ausblenden',
    catalog_consent_card_title: 'Katalog-Onboarding',
    catalog_consent_submit: 'Zustimmen und Katalog-Onboarding starten',
    catalog_consent_saving: 'Speichern…',
    catalog_consent_no_source: 'Für die Katalog-Übernahme braucht Pundo die Adresse deiner Website oder deines Webshops.',
    catalog_consent_no_source_link: 'Website im Profil eintragen',
    catalog_consent_given: 'Zugestimmt am {date} (Version {version})',
    catalog_consent_error: 'Deine Zustimmung konnte nicht gespeichert werden. Bitte versuche es erneut.',
    catalog_consent_retry: 'Erneut versuchen',
    catalog_consent_version_error: 'Der Zustimmungstext hat sich geändert. Bitte lade die Seite neu und bestätige erneut.',
  },
  el: {
    catalog_consent_checkbox_label: 'Ναι, το Pundo μπορεί να εισάγει και να προετοιμάσει τον κατάλογο προϊόντων μου από την ιστοσελίδα μου.',
    catalog_consent_text: 'Με τη συγκατάθεσή σου, το Pundo εισάγει τα προϊόντα (ονόματα, περιγραφές, εικόνες, τιμές) από την ιστοσελίδα που δήλωσες και τα περιγράφει αυτόματα, τα μεταφράζει σε 6 γλώσσες και τα κατατάσσει σε κατηγορίες. Τίποτα δεν δημοσιεύεται πριν εγκρίνεις το αποτέλεσμα στην πύλη του καταστήματός σου. Επιβεβαιώνεις ότι έχεις τα δικαιώματα σε αυτά τα κείμενα και τις εικόνες και επιτρέπεις στο Pundo να τα χρησιμοποιεί για τις καταχωρίσεις σου στο Pundo. Αποθηκεύουμε μόνο τη στιγμή της συγκατάθεσής σου, την έκδοση αυτού του κειμένου και τον λογαριασμό σου. Μπορείς να ανακαλέσεις τη συγκατάθεσή σου ανά πάσα στιγμή επικοινωνώντας μαζί μας.',
    catalog_consent_details_prefix: 'Λεπτομέρειες:',
    catalog_consent_link_privacy: 'Πολιτική απορρήτου',
    catalog_consent_link_terms: 'Όροι',
    catalog_consent_show_details: 'Εμφάνιση λεπτομερειών',
    catalog_consent_hide_details: 'Απόκρυψη λεπτομερειών',
    catalog_consent_card_title: 'Ενσωμάτωση καταλόγου',
    catalog_consent_submit: 'Συμφωνώ και ξεκινώ την ενσωμάτωση του καταλόγου',
    catalog_consent_saving: 'Αποθήκευση…',
    catalog_consent_no_source: 'Για την εισαγωγή του καταλόγου, το Pundo χρειάζεται τη διεύθυνση της ιστοσελίδας ή του ηλεκτρονικού καταστήματός σου.',
    catalog_consent_no_source_link: 'Πρόσθεσε ιστοσελίδα στο προφίλ',
    catalog_consent_given: 'Συγκατάθεση στις {date} (έκδοση {version})',
    catalog_consent_error: 'Δεν ήταν δυνατή η αποθήκευση της συγκατάθεσής σου. Δοκίμασε ξανά.',
    catalog_consent_retry: 'Δοκίμασε ξανά',
    catalog_consent_version_error: 'Το κείμενο συγκατάθεσης άλλαξε. Φόρτωσε ξανά τη σελίδα και επιβεβαίωσε εκ νέου.',
  },
  ru: {
    catalog_consent_checkbox_label: 'Да, Pundo может импортировать и подготовить каталог товаров с моего сайта.',
    catalog_consent_text: 'С вашего согласия Pundo импортирует товары (названия, описания, изображения, цены) с указанного вами сайта, автоматически описывает их, переводит на 6 языков и распределяет по категориям. Ничего не будет опубликовано, пока вы не одобрите результат в портале магазина. Вы подтверждаете, что обладаете правами на эти тексты и изображения, и разрешаете Pundo использовать их для карточек ваших товаров на Pundo. Мы сохраняем только время вашего согласия, версию этого текста и вашу учётную запись. Вы можете в любой момент отозвать согласие, связавшись с нами.',
    catalog_consent_details_prefix: 'Подробнее:',
    catalog_consent_link_privacy: 'Политика конфиденциальности',
    catalog_consent_link_terms: 'Условия',
    catalog_consent_show_details: 'Показать подробности',
    catalog_consent_hide_details: 'Скрыть подробности',
    catalog_consent_card_title: 'Подключение каталога',
    catalog_consent_submit: 'Согласиться и начать подключение каталога',
    catalog_consent_saving: 'Сохранение…',
    catalog_consent_no_source: 'Чтобы импортировать каталог, Pundo нужен адрес вашего сайта или интернет-магазина.',
    catalog_consent_no_source_link: 'Указать сайт в профиле',
    catalog_consent_given: 'Согласие дано {date} (версия {version})',
    catalog_consent_error: 'Не удалось сохранить согласие. Попробуйте ещё раз.',
    catalog_consent_retry: 'Повторить',
    catalog_consent_version_error: 'Текст согласия изменился. Обновите страницу и подтвердите ещё раз.',
  },
  ar: {
    catalog_consent_checkbox_label: 'نعم، يجوز لـ Pundo استيراد كتالوج منتجاتي من موقعي الإلكتروني وإعداده.',
    catalog_consent_text: 'بموافقتك، تستورد Pundo المنتجات (الأسماء والأوصاف والصور والأسعار) من الموقع الإلكتروني الذي أدخلته، وتصفها تلقائيًا وتترجمها إلى 6 لغات وتصنّفها ضمن فئات. لن يُنشر أي شيء قبل أن توافق على النتيجة في بوابة متجرك. وأنت تؤكد أنك تملك حقوق هذه النصوص والصور، وتسمح لـ Pundo باستخدامها لعرض منتجاتك على Pundo. لا نخزّن سوى وقت موافقتك وإصدار هذا النص وحسابك. يمكنك سحب موافقتك في أي وقت عبر التواصل معنا.',
    catalog_consent_details_prefix: 'التفاصيل:',
    catalog_consent_link_privacy: 'سياسة الخصوصية',
    catalog_consent_link_terms: 'الشروط',
    catalog_consent_show_details: 'عرض التفاصيل',
    catalog_consent_hide_details: 'إخفاء التفاصيل',
    catalog_consent_card_title: 'إعداد الكتالوج',
    catalog_consent_submit: 'الموافقة وبدء إعداد الكتالوج',
    catalog_consent_saving: 'جارٍ الحفظ…',
    catalog_consent_no_source: 'لاستيراد الكتالوج، تحتاج Pundo إلى عنوان موقعك الإلكتروني أو متجرك الإلكتروني.',
    catalog_consent_no_source_link: 'أضف الموقع في الملف الشخصي',
    catalog_consent_given: 'تمت الموافقة في {date} (الإصدار {version})',
    catalog_consent_error: 'تعذّر حفظ موافقتك. يرجى المحاولة مرة أخرى.',
    catalog_consent_retry: 'حاول مرة أخرى',
    catalog_consent_version_error: 'تغيّر نص الموافقة. يرجى إعادة تحميل الصفحة والتأكيد مجددًا.',
  },
  he: {
    catalog_consent_checkbox_label: 'כן, Pundo רשאית לייבא ולהכין את קטלוג המוצרים שלי מהאתר שלי.',
    catalog_consent_text: 'בהסכמתך, Pundo מייבאת את המוצרים (שמות, תיאורים, תמונות, מחירים) מהאתר שהזנת, מתארת אותם אוטומטית, מתרגמת אותם ל-6 שפות ומשייכת אותם לקטגוריות. שום דבר לא יעלה לאוויר לפני שתאשר את התוצאה בפורטל החנות שלך. אתה מאשר שיש לך זכויות על הטקסטים והתמונות האלה, ומתיר ל-Pundo להשתמש בהם לצורך הצגת המוצרים שלך ב-Pundo. אנו שומרים רק את מועד הסכמתך, את גרסת הטקסט הזה ואת החשבון שלך. אפשר לבטל את ההסכמה בכל עת על ידי פנייה אלינו.',
    catalog_consent_details_prefix: 'פרטים:',
    catalog_consent_link_privacy: 'מדיניות פרטיות',
    catalog_consent_link_terms: 'תנאי שימוש',
    catalog_consent_show_details: 'הצג פרטים',
    catalog_consent_hide_details: 'הסתר פרטים',
    catalog_consent_card_title: 'הטמעת קטלוג',
    catalog_consent_submit: 'הסכמה והתחלת הטמעת הקטלוג',
    catalog_consent_saving: 'שומר…',
    catalog_consent_no_source: 'כדי לייבא את הקטלוג, Pundo זקוקה לכתובת האתר או החנות המקוונת שלך.',
    catalog_consent_no_source_link: 'הוסף אתר בפרופיל',
    catalog_consent_given: 'ההסכמה ניתנה ב-{date} (גרסה {version})',
    catalog_consent_error: 'לא ניתן היה לשמור את הסכמתך. נסה שוב.',
    catalog_consent_retry: 'נסה שוב',
    catalog_consent_version_error: 'נוסח ההסכמה השתנה. רענן את הדף ואשר שוב.',
  },
} as const

type LangKey = keyof typeof shopAdminCatalogConsentTranslations
export type ShopAdminCatalogConsentTranslations = typeof shopAdminCatalogConsentTranslations.en

export const shopAdminCatalogConsentTranslationsMap = shopAdminCatalogConsentTranslations

export function tShopAdminCatalogConsent(lang: string): ShopAdminCatalogConsentTranslations {
  const key = lang as LangKey
  return (shopAdminCatalogConsentTranslations[key] ?? shopAdminCatalogConsentTranslations.en) as unknown as ShopAdminCatalogConsentTranslations
}
