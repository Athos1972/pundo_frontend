import type { Lang } from './lang'

export interface ForShopsFeature { icon: string; title: string; body: string }
export interface ForShopsStep { num: string; title: string; body: string }

export interface ForShopsContent {
  hero_headline: string
  hero_sub: string
  cta_label: string
  features_title: string
  features: ForShopsFeature[]
  steps_title: string
  steps: ForShopsStep[]
}

export const forShopsContent: Record<Lang, ForShopsContent> = {
  en: {
    hero_headline: 'Put your shop on the map — for free',
    hero_sub: 'pundo connects local shops with customers who are actively searching for products nearby. No website required.',
    cta_label: 'Register your shop',
    features_title: 'Everything you need',
    features: [
      { icon: '📦', title: 'Product catalogue', body: 'List your products and services with prices, availability and photos. Import via Excel, CSV or Google Sheets.' },
      { icon: '🗺️', title: 'Map visibility', body: 'Your shop appears on the map when customers search for products you carry — no extra effort needed.' },
      { icon: '🏷️', title: 'Offers & promotions', body: 'Create time-limited offers that are highlighted in search results and on your shop page.' },
      { icon: '★', title: 'Reviews & ratings', body: 'Collect authentic reviews from real customers. Respond, moderate and build trust in your brand.' },
      { icon: '🔑', title: 'API access', body: 'Connect your own inventory system via REST API to keep your product data in sync automatically.' },
      { icon: '📊', title: 'Dashboard', body: 'See how customers find you — searches, product views and offer clicks at a glance.' },
    ],
    steps_title: 'Up and running in minutes',
    steps: [
      { num: '1', title: 'Register', body: 'Create a free account with your shop name, address and email. No credit card needed.' },
      { num: '2', title: 'Add your products', body: 'Upload your product list manually or import it from a spreadsheet. Set prices and availability.' },
      { num: '3', title: 'Get discovered', body: 'Your shop is immediately searchable. Customers near you can find your products on the map.' },
    ],
  },
  de: {
    hero_headline: 'Bring deinen Shop auf die Karte — kostenlos',
    hero_sub: 'pundo verbindet lokale Shops mit Kunden, die aktiv nach Produkten in ihrer Nähe suchen. Keine eigene Website erforderlich.',
    cta_label: 'Shop registrieren',
    features_title: 'Alles was du brauchst',
    features: [
      { icon: '📦', title: 'Produktkatalog', body: 'Liste deine Produkte und Dienstleistungen mit Preisen, Verfügbarkeit und Fotos. Import via Excel, CSV oder Google Sheets.' },
      { icon: '🗺️', title: 'Sichtbarkeit auf der Karte', body: 'Dein Shop erscheint auf der Karte, wenn Kunden nach Produkten suchen, die du führst — ganz ohne zusätzlichen Aufwand.' },
      { icon: '🏷️', title: 'Angebote & Aktionen', body: 'Erstelle zeitlich begrenzte Angebote, die in den Suchergebnissen und auf deiner Shop-Seite hervorgehoben werden.' },
      { icon: '★', title: 'Bewertungen & Ratings', body: 'Sammle echte Bewertungen von echten Kunden. Reagiere, moderiere und stärke das Vertrauen in deinen Shop.' },
      { icon: '🔑', title: 'API-Zugang', body: 'Verbinde dein eigenes Warenwirtschaftssystem über die REST-API, damit deine Produktdaten automatisch aktuell bleiben.' },
      { icon: '📊', title: 'Dashboard', body: 'Sieh auf einen Blick, wie Kunden dich finden — Suchanfragen, Produktaufrufe und Klicks auf Angebote.' },
    ],
    steps_title: 'In wenigen Minuten startklar',
    steps: [
      { num: '1', title: 'Registrieren', body: 'Erstelle ein kostenloses Konto mit deinem Shop-Namen, deiner Adresse und E-Mail. Keine Kreditkarte erforderlich.' },
      { num: '2', title: 'Produkte hinzufügen', body: 'Lade deine Produktliste manuell hoch oder importiere sie aus einer Tabellenkalkulation. Preise und Verfügbarkeit einstellen.' },
      { num: '3', title: 'Gefunden werden', body: 'Dein Shop ist sofort suchbar. Kunden in deiner Nähe können deine Produkte auf der Karte finden.' },
    ],
  },
  el: {
    hero_headline: 'Βάλε το κατάστημά σου στον χάρτη — δωρεάν',
    hero_sub: 'Το pundo συνδέει τοπικά καταστήματα με πελάτες που αναζητούν ενεργά προϊόντα κοντά τους. Δεν χρειάζεται δική σου ιστοσελίδα.',
    cta_label: 'Καταχώρηση καταστήματος',
    features_title: 'Όλα όσα χρειάζεσαι',
    features: [
      { icon: '📦', title: 'Κατάλογος προϊόντων', body: 'Κατέγραψε τα προϊόντα και τις υπηρεσίες σου με τιμές, διαθεσιμότητα και φωτογραφίες. Εισαγωγή μέσω Excel, CSV ή Google Sheets.' },
      { icon: '🗺️', title: 'Εμφάνιση στον χάρτη', body: 'Το κατάστημά σου εμφανίζεται στον χάρτη όταν πελάτες ψάχνουν προϊόντα που διαθέτεις.' },
      { icon: '🏷️', title: 'Προσφορές & ακτόλιες', body: 'Δημιούργησε χρονικά περιορισμένες προσφορές που επισημαίνονται στα αποτελέσματα αναζήτησης.' },
      { icon: '★', title: 'Αξιολογήσεις & βαθμολογίες', body: 'Συγκέντρωσε αυθεντικές αξιολογήσεις από πραγματικούς πελάτες. Απάντησε και διαχειρίσου τις.' },
      { icon: '🔑', title: 'Πρόσβαση API', body: 'Σύνδεσε το σύστημα αποθήκης σου μέσω REST API για αυτόματη συγχρονισμό δεδομένων.' },
      { icon: '📊', title: 'Πίνακας ελέγχου', body: 'Δες πώς σε βρίσκουν οι πελάτες — αναζητήσεις, προβολές προϊόντων και κλικ σε προσφορές.' },
    ],
    steps_title: 'Έτοιμος σε λίγα λεπτά',
    steps: [
      { num: '1', title: 'Εγγραφή', body: 'Δημιούργησε δωρεάν λογαριασμό με το όνομα, τη διεύθυνση και το email του καταστήματός σου.' },
      { num: '2', title: 'Προσθήκη προϊόντων', body: 'Ανέβασε τη λίστα προϊόντων χειροκίνητα ή εισήγαγέ την από υπολογιστικό φύλλο.' },
      { num: '3', title: 'Γίνε ανακαλύψιμος', body: 'Το κατάστημά σου είναι άμεσα αναζητήσιμο. Πελάτες κοντά σου μπορούν να βρουν τα προϊόντα σου.' },
    ],
  },
  ru: [
    {
      hero_headline: 'Поставьте свой магазин на карту — бесплатно',
      hero_sub: 'pundo соединяет местные магазины с покупателями, которые активно ищут товары поблизости. Собственный сайт не нужен.',
      cta_label: 'Зарегистрировать магазин',
      features_title: 'Всё необходимое',
      features: [
        { icon: '📦', title: 'Каталог товаров', body: 'Разместите свои товары и услуги с ценами, наличием и фотографиями. Импорт через Excel, CSV или Google Sheets.' },
        { icon: '🗺️', title: 'Отображение на карте', body: 'Ваш магазин появляется на карте, когда покупатели ищут товары, которые вы продаёте.' },
        { icon: '🏷️', title: 'Акции и предложения', body: 'Создавайте ограниченные по времени предложения, которые выделяются в результатах поиска.' },
        { icon: '★', title: 'Отзывы и рейтинги', body: 'Собирайте настоящие отзывы от реальных покупателей. Отвечайте и управляйте репутацией.' },
        { icon: '🔑', title: 'Доступ через API', body: 'Подключите собственную систему учёта товаров через REST API для автоматической синхронизации.' },
        { icon: '📊', title: 'Панель управления', body: 'Смотрите, как покупатели находят вас — поиски, просмотры товаров и клики по акциям.' },
      ],
      steps_title: 'Готово за несколько минут',
      steps: [
        { num: '1', title: 'Регистрация', body: 'Создайте бесплатный аккаунт с названием магазина, адресом и email.' },
        { num: '2', title: 'Добавьте товары', body: 'Загрузите список товаров вручную или импортируйте из таблицы. Установите цены и наличие.' },
        { num: '3', title: 'Вас найдут', body: 'Ваш магазин сразу доступен для поиска. Покупатели рядом с вами могут найти ваши товары на карте.' },
      ],
    }
  ][0],
  ar: {
    hero_headline: 'ضع متجرك على الخريطة — مجانًا',
    hero_sub: 'يربط pundo المتاجر المحلية بالعملاء الذين يبحثون بنشاط عن منتجات بالقرب منهم. لا تحتاج إلى موقع ويب خاص.',
    cta_label: 'سجّل متجرك',
    features_title: 'كل ما تحتاجه',
    features: [
      { icon: '📦', title: 'كتالوج المنتجات', body: 'أدرج منتجاتك وخدماتك مع الأسعار والتوفر والصور. استيراد عبر Excel أو CSV أو Google Sheets.' },
      { icon: '🗺️', title: 'الظهور على الخريطة', body: 'يظهر متجرك على الخريطة عندما يبحث العملاء عن المنتجات التي تبيعها.' },
      { icon: '🏷️', title: 'العروض والترويج', body: 'أنشئ عروضًا محدودة الوقت يتم تمييزها في نتائج البحث.' },
      { icon: '★', title: 'التقييمات والمراجعات', body: 'اجمع تقييمات حقيقية من عملاء فعليين. استجب وأدِر سمعة متجرك.' },
      { icon: '🔑', title: 'الوصول عبر API', body: 'اربط نظام المخزون الخاص بك عبر REST API لمزامنة بيانات المنتج تلقائيًا.' },
      { icon: '📊', title: 'لوحة التحكم', body: 'اطلع على كيفية اكتشاف العملاء لك — عمليات البحث ومشاهدات المنتج والنقرات على العروض.' },
    ],
    steps_title: 'جاهز في دقائق',
    steps: [
      { num: '1', title: 'التسجيل', body: 'أنشئ حسابًا مجانيًا باسم متجرك وعنوانه وبريدك الإلكتروني.' },
      { num: '2', title: 'أضف منتجاتك', body: 'ارفع قائمة منتجاتك يدويًا أو استوردها من جدول بيانات. حدد الأسعار والتوفر.' },
      { num: '3', title: 'اكتشفك العملاء', body: 'متجرك قابل للبحث فورًا. يمكن للعملاء القريبين منك إيجاد منتجاتك على الخريطة.' },
    ],
  },
  he: {
    hero_headline: 'שים את החנות שלך על המפה — בחינם',
    hero_sub: 'pundo מחבר חנויות מקומיות עם לקוחות שמחפשים באופן פעיל מוצרים בקרבתם. לא נדרש אתר אינטרנט.',
    cta_label: 'רשום את החנות שלך',
    features_title: 'כל מה שאתה צריך',
    features: [
      { icon: '📦', title: 'קטלוג מוצרים', body: 'רשום את המוצרים והשירותים שלך עם מחירים, זמינות ותמונות. ייבוא דרך Excel, CSV או Google Sheets.' },
      { icon: '🗺️', title: 'נראות במפה', body: 'החנות שלך מופיעה במפה כשלקוחות מחפשים מוצרים שאתה מוכר.' },
      { icon: '🏷️', title: 'מבצעים וקידום', body: 'צור מבצעים מוגבלים בזמן המודגשים בתוצאות חיפוש.' },
      { icon: '★', title: 'ביקורות ודירוגים', body: 'אסוף ביקורות אמיתיות מלקוחות אמיתיים. הגב ונהל את המוניטין של החנות.' },
      { icon: '🔑', title: 'גישת API', body: 'חבר את מערכת המלאי שלך דרך REST API לסנכרון אוטומטי של נתוני המוצרים.' },
      { icon: '📊', title: 'לוח בקרה', body: 'ראה כיצד לקוחות מוצאים אותך — חיפושים, צפיות במוצרים ולחיצות על מבצעים.' },
    ],
    steps_title: 'מוכן תוך דקות',
    steps: [
      { num: '1', title: 'הרשמה', body: 'צור חשבון חינמי עם שם החנות, הכתובת והאימייל שלך.' },
      { num: '2', title: 'הוסף מוצרים', body: 'העלה את רשימת המוצרים שלך ידנית או ייבא אותה מגיליון אלקטרוני.' },
      { num: '3', title: 'היה גלוי', body: 'החנות שלך ניתנת לחיפוש מיידית. לקוחות בקרבתך יכולים למצוא את המוצרים שלך במפה.' },
    ],
  },
}
