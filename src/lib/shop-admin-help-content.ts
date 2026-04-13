// Clean Boundary: this file belongs to the shop-admin domain only.
// No imports from customer-facing code.

export interface ShopAdminFaqItem { q: string; a: string }
export interface ShopAdminFaqCategory { title: string; items: ShopAdminFaqItem[] }

type Lang = 'en' | 'de' | 'el' | 'ru' | 'ar' | 'he'

export const shopAdminHelpContent: Record<Lang, ShopAdminFaqCategory[]> = {
  en: [
    {
      title: 'Getting started',
      items: [
        {
          q: 'How do I register my shop?',
          a: 'Click "Register your shop" on the pundo for-shops page, fill in your name, shop name, address and email, then verify your email address. Our team will review your account and activate it within 24 hours.',
        },
        {
          q: 'My account is still "under review" — what happens next?',
          a: 'After email verification we manually check each new shop to prevent spam. Once approved you receive a confirmation email and gain full access to the portal.',
        },
      ],
    },
    {
      title: 'Products & Catalogue',
      items: [
        {
          q: 'How do I add products?',
          a: 'Go to Products → Add product. Fill in name, category, price, currency, unit and availability, then save. Your product is immediately searchable by customers.',
        },
        {
          q: 'Can I import products in bulk?',
          a: 'Yes. Go to Import and upload an Excel or CSV file. Download the template to see the required column format. You can also link a Google Sheets document for automatic syncing.',
        },
        {
          q: 'How do I update prices?',
          a: 'Open the product in Products → click Edit → change the price → Save. The updated price appears immediately in search results.',
        },
        {
          q: 'What does "Available" mean?',
          a: '"Available" means the product is currently in stock. Toggle this to keep customers informed. Products marked unavailable still appear in search but are labelled accordingly.',
        },
      ],
    },
    {
      title: 'Offers',
      items: [
        {
          q: 'How do I create an offer?',
          a: 'Go to Offers → Add offer. Fill in a title, description, validity period and optionally link it to a specific product. Active offers are highlighted in search results.',
        },
        {
          q: 'Can I archive old offers?',
          a: 'Yes. Expired offers can be archived so your list stays clean. Archived offers are no longer shown to customers.',
        },
      ],
    },
    {
      title: 'Reviews',
      items: [
        {
          q: 'How do I respond to reviews?',
          a: 'Currently reviews are read-only for shop owners. You can invalidate reviews that violate our guidelines via Reviews → Invalidate (with a reason).',
        },
        {
          q: 'Can I remove a fake or abusive review?',
          a: 'You can invalidate a review with a reason (spam, offensive, legal, other). Invalidated reviews are hidden from customers. The audit log records all moderation actions.',
        },
      ],
    },
    {
      title: 'API & Integrations',
      items: [
        {
          q: 'How do I create an API key?',
          a: 'Go to API Keys → New API key. Choose a name and scope (read, write or read & write). Copy the key immediately — it is shown only once.',
        },
        {
          q: 'What can I do with the API?',
          a: 'The write-scoped API key lets you create, update and delete products and offers programmatically. Useful for keeping pundo in sync with your POS or inventory system.',
        },
      ],
    },
  ],
  de: [
    {
      title: 'Erste Schritte',
      items: [
        {
          q: 'Wie registriere ich meinen Shop?',
          a: 'Klicke auf „Shop registrieren" auf der pundo-For-Shops-Seite, gib deinen Namen, Shop-Namen, die Adresse und E-Mail ein und bestätige dann deine E-Mail-Adresse. Unser Team prüft dein Konto und schaltet es innerhalb von 24 Stunden frei.',
        },
        {
          q: 'Mein Konto ist noch „in Prüfung" — was passiert als Nächstes?',
          a: 'Nach der E-Mail-Bestätigung prüfen wir jeden neuen Shop manuell, um Spam zu verhindern. Nach der Freischaltung erhältst du eine Bestätigungs-E-Mail und vollen Zugriff auf das Portal.',
        },
      ],
    },
    {
      title: 'Produkte & Katalog',
      items: [
        {
          q: 'Wie füge ich Produkte hinzu?',
          a: 'Gehe zu Produkte → Produkt hinzufügen. Fülle Name, Kategorie, Preis, Währung, Einheit und Verfügbarkeit aus, dann speichern. Dein Produkt ist sofort für Kunden auffindbar.',
        },
        {
          q: 'Kann ich Produkte in großen Mengen importieren?',
          a: 'Ja. Gehe zu Import und lade eine Excel- oder CSV-Datei hoch. Lade die Vorlage herunter um das erforderliche Spaltenformat zu sehen. Du kannst auch ein Google-Sheets-Dokument verknüpfen.',
        },
        {
          q: 'Wie aktualisiere ich Preise?',
          a: 'Öffne das Produkt unter Produkte → Bearbeiten → Preis ändern → Speichern. Der aktualisierte Preis erscheint sofort in den Suchergebnissen.',
        },
        {
          q: 'Was bedeutet „Verfügbar"?',
          a: '„Verfügbar" bedeutet, dass das Produkt derzeit auf Lager ist. Nicht verfügbare Produkte erscheinen weiterhin in der Suche, werden aber entsprechend gekennzeichnet.',
        },
      ],
    },
    {
      title: 'Angebote',
      items: [
        {
          q: 'Wie erstelle ich ein Angebot?',
          a: 'Gehe zu Angebote → Angebot hinzufügen. Fülle Titel, Beschreibung, Gültigkeitszeitraum aus und verknüpfe es optional mit einem Produkt. Aktive Angebote werden in den Suchergebnissen hervorgehoben.',
        },
        {
          q: 'Kann ich alte Angebote archivieren?',
          a: 'Ja. Abgelaufene Angebote können archiviert werden, damit deine Liste übersichtlich bleibt.',
        },
      ],
    },
    {
      title: 'Bewertungen',
      items: [
        {
          q: 'Wie reagiere ich auf Bewertungen?',
          a: 'Derzeit sind Bewertungen für Shop-Inhaber schreibgeschützt. Du kannst Bewertungen, die gegen unsere Richtlinien verstoßen, unter Bewertungen → Deaktivieren (mit Angabe eines Grundes) deaktivieren.',
        },
        {
          q: 'Kann ich eine gefälschte oder missbräuchliche Bewertung entfernen?',
          a: 'Du kannst eine Bewertung mit einem Grund (Spam, beleidigend, rechtlich, sonstiges) deaktivieren. Deaktivierte Bewertungen werden für Kunden ausgeblendet. Das Audit-Log zeichnet alle Moderationsmaßnahmen auf.',
        },
      ],
    },
    {
      title: 'API & Integrationen',
      items: [
        {
          q: 'Wie erstelle ich einen API-Schlüssel?',
          a: 'Gehe zu API-Keys → Neuer API-Key. Wähle einen Namen und Berechtigungsumfang (Lesen, Schreiben oder Lesen & Schreiben). Kopiere den Key sofort — er wird nur einmal angezeigt.',
        },
        {
          q: 'Was kann ich mit der API machen?',
          a: 'Mit einem Schreib-API-Key kannst du Produkte und Angebote programmgesteuert erstellen, aktualisieren und löschen. Nützlich zur Synchronisierung von pundo mit deinem Kassensystem.',
        },
      ],
    },
  ],
  el: [
    {
      title: 'Ξεκινώντας',
      items: [
        {
          q: 'Πώς καταχωρώ το κατάστημά μου;',
          a: 'Κάνε κλικ στο «Καταχώρηση καταστήματος», συμπλήρωσε τα στοιχεία σου και επαλήθευσε το email. Η ομάδα μας θα ελέγξει και θα ενεργοποιήσει τον λογαριασμό σου εντός 24 ωρών.',
        },
        {
          q: 'Ο λογαριασμός μου είναι «υπό έλεγχο» — τι γίνεται μετά;',
          a: 'Μετά την επαλήθευση email ελέγχουμε χειροκίνητα κάθε νέο κατάστημα. Μόλις εγκριθεί λαμβάνεις email επιβεβαίωσης.',
        },
      ],
    },
    {
      title: 'Προϊόντα & Κατάλογος',
      items: [
        {
          q: 'Πώς προσθέτω προϊόντα;',
          a: 'Πήγαινε στα Προϊόντα → Προσθήκη προϊόντος. Συμπλήρωσε τα πεδία και αποθήκευσε. Το προϊόν σου είναι άμεσα αναζητήσιμο.',
        },
        {
          q: 'Μπορώ να εισάγω προϊόντα χύμα;',
          a: 'Ναι. Πήγαινε στην Εισαγωγή και ανέβασε Excel ή CSV. Κατέβασε το πρότυπο για τη σωστή μορφή. Μπορείς επίσης να συνδέσεις Google Sheets.',
        },
        {
          q: 'Πώς ενημερώνω τιμές;',
          a: 'Άνοιξε το προϊόν → Επεξεργασία → Άλλαξε τιμή → Αποθήκευσε. Εμφανίζεται αμέσως στα αποτελέσματα.',
        },
        {
          q: 'Τι σημαίνει «Διαθέσιμο»;',
          a: '«Διαθέσιμο» σημαίνει ότι το προϊόν βρίσκεται σε απόθεμα. Μη διαθέσιμα προϊόντα εμφανίζονται στην αναζήτηση αλλά επισημαίνονται.',
        },
      ],
    },
    {
      title: 'Αξιολογήσεις',
      items: [
        {
          q: 'Πώς διαχειρίζομαι αξιολογήσεις;',
          a: 'Μπορείς να απενεργοποιήσεις αξιολογήσεις που παραβιάζουν τις οδηγίες μας μέσα από Αξιολογήσεις → Απενεργοποίηση.',
        },
      ],
    },
    {
      title: 'API & Ενσωματώσεις',
      items: [
        {
          q: 'Πώς δημιουργώ κλειδί API;',
          a: 'Πήγαινε στα API Keys → Νέο κλειδί API. Επέλεξε όνομα και δικαιώματα. Αντίγραψε το κλειδί αμέσως — εμφανίζεται μόνο μία φορά.',
        },
      ],
    },
  ],
  ru: [
    {
      title: 'Начало работы',
      items: [
        {
          q: 'Как зарегистрировать магазин?',
          a: 'Нажмите «Зарегистрировать магазин», заполните данные и подтвердите email. Наша команда проверит и активирует аккаунт в течение 24 часов.',
        },
        {
          q: 'Аккаунт всё ещё на проверке — что дальше?',
          a: 'После подтверждения email мы вручную проверяем каждый новый магазин. После одобрения вы получите письмо с подтверждением.',
        },
      ],
    },
    {
      title: 'Товары и каталог',
      items: [
        {
          q: 'Как добавить товары?',
          a: 'Перейдите в Товары → Добавить товар. Заполните поля и сохраните. Товар сразу доступен для поиска покупателями.',
        },
        {
          q: 'Можно ли импортировать товары оптом?',
          a: 'Да. Перейдите в Импорт и загрузите Excel или CSV файл. Скачайте шаблон для нужного формата. Также можно подключить Google Sheets.',
        },
        {
          q: 'Как обновить цены?',
          a: 'Откройте товар → Изменить → Измените цену → Сохранить. Обновлённая цена сразу появляется в результатах поиска.',
        },
        {
          q: 'Что означает «В наличии»?',
          a: '«В наличии» означает, что товар есть в наличии. Недоступные товары всё равно отображаются в поиске, но с соответствующей пометкой.',
        },
      ],
    },
    {
      title: 'Отзывы',
      items: [
        {
          q: 'Как управлять отзывами?',
          a: 'Вы можете деактивировать отзывы, нарушающие наши правила, через Отзывы → Деактивировать (с указанием причины).',
        },
      ],
    },
    {
      title: 'API и интеграции',
      items: [
        {
          q: 'Как создать ключ API?',
          a: 'Перейдите в API-ключи → Новый API-ключ. Выберите имя и область доступа. Скопируйте ключ сразу — он отображается только один раз.',
        },
      ],
    },
  ],
  ar: [
    {
      title: 'البدء',
      items: [
        {
          q: 'كيف أسجّل متجري؟',
          a: 'انقر على «سجّل متجرك»، أدخل بياناتك وتحقق من بريدك الإلكتروني. سيراجع فريقنا ويفعّل حسابك خلال 24 ساعة.',
        },
        {
          q: 'حسابي لا يزال «قيد المراجعة» — ماذا يحدث بعد ذلك؟',
          a: 'بعد التحقق من البريد الإلكتروني، نراجع كل متجر جديد يدويًا. بعد الموافقة ستتلقى رسالة تأكيد.',
        },
      ],
    },
    {
      title: 'المنتجات والكتالوج',
      items: [
        {
          q: 'كيف أضيف منتجات؟',
          a: 'انتقل إلى المنتجات ← إضافة منتج. أكمل الحقول واحفظ. منتجك قابل للبحث فورًا.',
        },
        {
          q: 'هل يمكنني استيراد منتجات بكميات كبيرة؟',
          a: 'نعم. انتقل إلى الاستيراد وارفع ملف Excel أو CSV. نزّل القالب لمعرفة تنسيق الأعمدة المطلوب.',
        },
        {
          q: 'كيف أحدّث الأسعار؟',
          a: 'افتح المنتج ← تعديل ← غيّر السعر ← احفظ. يظهر السعر المحدّث فورًا في نتائج البحث.',
        },
        {
          q: 'ماذا يعني «متاح»؟',
          a: '«متاح» يعني أن المنتج موجود في المخزون حاليًا. المنتجات غير المتاحة تظهر في البحث لكنها مُصنَّفة بذلك.',
        },
      ],
    },
    {
      title: 'التقييمات',
      items: [
        {
          q: 'كيف أدير التقييمات؟',
          a: 'يمكنك تعطيل التقييمات التي تنتهك إرشاداتنا عبر التقييمات ← تعطيل (مع ذكر السبب).',
        },
      ],
    },
    {
      title: 'API والتكاملات',
      items: [
        {
          q: 'كيف أنشئ مفتاح API؟',
          a: 'انتقل إلى مفاتيح API ← مفتاح API جديد. اختر اسمًا ونطاقًا. انسخ المفتاح فورًا — يُعرض مرة واحدة فقط.',
        },
      ],
    },
  ],
  he: [
    {
      title: 'תחילת העבודה',
      items: [
        {
          q: 'איך אני רושם את החנות שלי?',
          a: 'לחץ על «רשום את החנות שלך», מלא את הפרטים ואמת את האימייל. הצוות שלנו יבדוק ויפעיל את החשבון תוך 24 שעות.',
        },
        {
          q: 'החשבון שלי עדיין «בבדיקה» — מה קורה הלאה?',
          a: 'לאחר אימות האימייל אנו בודקים כל חנות חדשה ידנית. לאחר האישור תקבל אימייל אישור.',
        },
      ],
    },
    {
      title: 'מוצרים וקטלוג',
      items: [
        {
          q: 'איך אני מוסיף מוצרים?',
          a: 'עבור אל מוצרים ← הוסף מוצר. מלא את השדות ושמור. המוצר שלך ניתן לחיפוש מיידית.',
        },
        {
          q: 'האם אני יכול לייבא מוצרים בכמות?',
          a: 'כן. עבור אל ייבוא והעלה קובץ Excel או CSV. הורד את התבנית לפורמט הנדרש.',
        },
        {
          q: 'איך אני מעדכן מחירים?',
          a: 'פתח את המוצר ← עריכה ← שנה מחיר ← שמור. המחיר המעודכן מופיע מיד בתוצאות.',
        },
        {
          q: 'מה המשמעות של «זמין»?',
          a: '«זמין» פירושו שהמוצר נמצא במלאי כעת. מוצרים לא זמינים עדיין מופיעים בחיפוש אך מסומנים בהתאם.',
        },
      ],
    },
    {
      title: 'ביקורות',
      items: [
        {
          q: 'איך אני מנהל ביקורות?',
          a: 'אפשר להשבית ביקורות שמפרות את ההנחיות שלנו דרך ביקורות ← השבת (עם ציון סיבה).',
        },
      ],
    },
    {
      title: 'API ואינטגרציות',
      items: [
        {
          q: 'איך אני יוצר מפתח API?',
          a: 'עבור אל מפתחות API ← מפתח API חדש. בחר שם והרשאות. העתק את המפתח מיד — הוא מוצג פעם אחת בלבד.',
        },
      ],
    },
  ],
}
