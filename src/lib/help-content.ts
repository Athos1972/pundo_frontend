import type { Lang } from './lang'

export interface FaqItem { q: string; a: string }
export interface FaqCategory { title: string; items: FaqItem[] }

export const helpContent: Record<Lang, FaqCategory[]> = {
  en: [
    {
      title: 'Search & Products',
      items: [
        {
          q: 'How do I find a product near me?',
          a: 'Type the product name or shop name into the search bar at the top. Results show shops in your area that carry that product. You can also browse by category.',
        },
        {
          q: 'Are the prices always up to date?',
          a: 'Prices are updated by shop owners through the pundo portal. We display the date of the last update next to each price so you always know how recent the information is.',
        },
        {
          q: 'What does "In stock" mean?',
          a: '"In stock" means the shop has confirmed the product is currently available. Availability is also updated by the shop; if in doubt, we recommend calling the shop directly.',
        },
        {
          q: 'Can I filter by distance or price?',
          a: 'Yes. On the search results page you can filter by distance radius and by whether a price is listed. Use the map view to get a visual overview of nearby shops.',
        },
      ],
    },
    {
      title: 'Reviews & Ratings',
      items: [
        {
          q: 'How do I write a review?',
          a: 'Open any product or shop page and scroll to the Reviews section. You need a free pundo account to submit a review. Select a star rating, optionally add a comment and photos, then tap "Submit".',
        },
        {
          q: 'Can I edit or delete my review?',
          a: 'Yes. Go to My Account → My Reviews to edit or delete any review you have written.',
        },
        {
          q: 'Why are my photos not visible yet?',
          a: 'All photos go through a brief moderation check before they appear publicly. This usually takes less than 24 hours.',
        },
        {
          q: 'What should I do if I see an inappropriate review?',
          a: 'Tap the "Report" flag on the review. Our team will review the report and take appropriate action.',
        },
      ],
    },
    {
      title: 'Account & Privacy',
      items: [
        {
          q: 'Do I need an account to use pundo?',
          a: 'No. You can search and browse freely without an account. An account is only required to write reviews.',
        },
        {
          q: 'How do I delete my account?',
          a: 'Go to My Account → Privacy & Account → Delete account. All your data, reviews and photos will be permanently deleted in accordance with GDPR.',
        },
        {
          q: 'Is my data shared with shops?',
          a: 'No. Your personal data (email, name) is never shared with shop owners. Reviews are published with your display name only.',
        },
      ],
    },
  ],
  de: [
    {
      title: 'Suche & Produkte',
      items: [
        {
          q: 'Wie finde ich ein Produkt in meiner Nähe?',
          a: 'Gib den Produktnamen oder Shop-Namen in die Suchleiste oben ein. Die Ergebnisse zeigen Shops in deiner Umgebung, die dieses Produkt führen. Du kannst auch nach Kategorien stöbern.',
        },
        {
          q: 'Sind die Preise immer aktuell?',
          a: 'Preise werden von den Shop-Inhabern über das pundo-Portal aktualisiert. Neben jedem Preis wird das Datum der letzten Aktualisierung angezeigt, damit du immer weißt, wie aktuell die Information ist.',
        },
        {
          q: 'Was bedeutet „Auf Lager"?',
          a: '„Auf Lager" bedeutet, dass der Shop bestätigt hat, dass das Produkt gerade verfügbar ist. Verfügbarkeit wird ebenfalls vom Shop aktualisiert; im Zweifelsfall empfehlen wir, direkt beim Shop nachzufragen.',
        },
        {
          q: 'Kann ich nach Entfernung oder Preis filtern?',
          a: 'Ja. Auf der Suchergebnisseite kannst du nach Entfernungsradius und nach dem Vorhandensein eines Preises filtern. Nutze die Kartenansicht für eine visuelle Übersicht der nahegelegenen Shops.',
        },
      ],
    },
    {
      title: 'Bewertungen & Ratings',
      items: [
        {
          q: 'Wie schreibe ich eine Bewertung?',
          a: 'Öffne eine Produkt- oder Shop-Seite und scrolle zum Abschnitt „Bewertungen". Du benötigst ein kostenloses pundo-Konto. Wähle eine Stern-Bewertung, füge optional einen Kommentar und Fotos hinzu und tippe auf „Absenden".',
        },
        {
          q: 'Kann ich meine Bewertung bearbeiten oder löschen?',
          a: 'Ja. Gehe zu Mein Konto → Meine Bewertungen, um eine Bewertung zu bearbeiten oder zu löschen.',
        },
        {
          q: 'Warum sind meine Fotos noch nicht sichtbar?',
          a: 'Alle Fotos werden vor der Veröffentlichung einer kurzen Prüfung unterzogen. Das dauert in der Regel weniger als 24 Stunden.',
        },
        {
          q: 'Was soll ich tun, wenn ich eine unangemessene Bewertung sehe?',
          a: 'Tippe auf das „Melden"-Symbol bei der Bewertung. Unser Team wird den Bericht prüfen und entsprechende Maßnahmen ergreifen.',
        },
      ],
    },
    {
      title: 'Konto & Datenschutz',
      items: [
        {
          q: 'Brauche ich ein Konto, um pundo zu nutzen?',
          a: 'Nein. Du kannst ohne Konto suchen und stöbern. Ein Konto ist nur zum Schreiben von Bewertungen erforderlich.',
        },
        {
          q: 'Wie lösche ich mein Konto?',
          a: 'Gehe zu Mein Konto → Datenschutz & Konto → Konto löschen. Alle deine Daten, Bewertungen und Fotos werden gemäß DSGVO dauerhaft gelöscht.',
        },
        {
          q: 'Werden meine Daten an Shops weitergegeben?',
          a: 'Nein. Deine persönlichen Daten (E-Mail, Name) werden niemals an Shop-Inhaber weitergegeben. Bewertungen werden nur mit deinem Anzeigenamen veröffentlicht.',
        },
      ],
    },
  ],
  el: [
    {
      title: 'Αναζήτηση & Προϊόντα',
      items: [
        {
          q: 'Πώς βρίσκω ένα προϊόν κοντά μου;',
          a: 'Πληκτρολόγησε το όνομα του προϊόντος ή του καταστήματος στη γραμμή αναζήτησης επάνω. Τα αποτελέσματα δείχνουν καταστήματα στην περιοχή σου που έχουν αυτό το προϊόν.',
        },
        {
          q: 'Οι τιμές ενημερώνονται τακτικά;',
          a: 'Οι τιμές ενημερώνονται από τους ιδιοκτήτες καταστημάτων μέσω του pundo portal. Δίπλα σε κάθε τιμή εμφανίζεται η ημερομηνία τελευταίας ενημέρωσης.',
        },
        {
          q: 'Τι σημαίνει «Διαθέσιμο»;',
          a: '«Διαθέσιμο» σημαίνει ότι το κατάστημα έχει επιβεβαιώσει ότι το προϊόν υπάρχει αυτή τη στιγμή. Σε περίπτωση αμφιβολίας, συνιστούμε να τηλεφωνήσεις στο κατάστημα.',
        },
        {
          q: 'Μπορώ να φιλτράρω ανά απόσταση ή τιμή;',
          a: 'Ναι. Στη σελίδα αποτελεσμάτων μπορείς να φιλτράρεις ανά ακτίνα απόστασης και ανά ύπαρξη τιμής. Χρησιμοποίησε την προβολή χάρτη για οπτική επισκόπηση.',
        },
      ],
    },
    {
      title: 'Αξιολογήσεις & Βαθμολογίες',
      items: [
        {
          q: 'Πώς γράφω μια αξιολόγηση;',
          a: 'Άνοιξε οποιαδήποτε σελίδα προϊόντος ή καταστήματος και κύλισε στην ενότητα «Αξιολογήσεις». Χρειάζεσαι δωρεάν λογαριασμό pundo.',
        },
        {
          q: 'Μπορώ να επεξεργαστώ ή να διαγράψω την αξιολόγησή μου;',
          a: 'Ναι. Πήγαινε στον Λογαριασμό μου → Οι αξιολογήσεις μου.',
        },
        {
          q: 'Γιατί οι φωτογραφίες μου δεν εμφανίζονται ακόμη;',
          a: 'Όλες οι φωτογραφίες υποβάλλονται σε σύντομο έλεγχο πριν δημοσιευθούν. Συνήθως διαρκεί λιγότερο από 24 ώρες.',
        },
        {
          q: 'Τι κάνω αν δω ακατάλληλη αξιολόγηση;',
          a: 'Πάτησε το εικονίδιο «Αναφορά» στην αξιολόγηση. Η ομάδα μας θα εξετάσει την αναφορά.',
        },
      ],
    },
    {
      title: 'Λογαριασμός & Απόρρητο',
      items: [
        {
          q: 'Χρειάζομαι λογαριασμό για να χρησιμοποιήσω το pundo;',
          a: 'Όχι. Μπορείς να αναζητάς και να περιηγείσαι ελεύθερα. Λογαριασμός χρειάζεται μόνο για γράψεις αξιολογήσεις.',
        },
        {
          q: 'Πώς διαγράφω τον λογαριασμό μου;',
          a: 'Πήγαινε στον Λογαριασμό μου → Απόρρητο & Λογαριασμός → Διαγραφή λογαριασμού. Τα δεδομένα σου διαγράφονται σύμφωνα με τον GDPR.',
        },
        {
          q: 'Μοιράζονται τα δεδομένα μου με καταστήματα;',
          a: 'Όχι. Τα προσωπικά σου δεδομένα δεν κοινοποιούνται ποτέ σε ιδιοκτήτες καταστημάτων.',
        },
      ],
    },
  ],
  ru: [
    {
      title: 'Поиск и продукты',
      items: [
        {
          q: 'Как найти товар рядом со мной?',
          a: 'Введите название товара или магазина в строку поиска вверху. Результаты покажут магазины в вашем районе, где есть этот товар.',
        },
        {
          q: 'Цены всегда актуальны?',
          a: 'Цены обновляются владельцами магазинов через портал pundo. Рядом с каждой ценой отображается дата последнего обновления.',
        },
        {
          q: 'Что означает «В наличии»?',
          a: '«В наличии» означает, что магазин подтвердил наличие товара. В случае сомнений рекомендуем позвонить в магазин напрямую.',
        },
        {
          q: 'Можно ли фильтровать по расстоянию или цене?',
          a: 'Да. На странице результатов поиска можно фильтровать по радиусу расстояния и наличию цены. Используйте вид карты для визуального обзора.',
        },
      ],
    },
    {
      title: 'Отзывы и рейтинги',
      items: [
        {
          q: 'Как написать отзыв?',
          a: 'Откройте страницу товара или магазина и прокрутите до раздела «Отзывы». Вам нужен бесплатный аккаунт pundo.',
        },
        {
          q: 'Могу ли я редактировать или удалять свой отзыв?',
          a: 'Да. Перейдите в Мой аккаунт → Мои отзывы.',
        },
        {
          q: 'Почему мои фотографии ещё не видны?',
          a: 'Все фотографии проходят краткую проверку перед публикацией. Обычно это занимает менее 24 часов.',
        },
        {
          q: 'Что делать, если я вижу неприемлемый отзыв?',
          a: 'Нажмите на значок «Пожаловаться» у отзыва. Наша команда рассмотрит жалобу.',
        },
      ],
    },
    {
      title: 'Аккаунт и конфиденциальность',
      items: [
        {
          q: 'Нужен ли аккаунт для использования pundo?',
          a: 'Нет. Вы можете искать и просматривать без аккаунта. Аккаунт нужен только для написания отзывов.',
        },
        {
          q: 'Как удалить аккаунт?',
          a: 'Перейдите в Мой аккаунт → Конфиденциальность → Удалить аккаунт. Все ваши данные удаляются в соответствии с GDPR.',
        },
        {
          q: 'Передаются ли мои данные магазинам?',
          a: 'Нет. Ваши личные данные никогда не передаются владельцам магазинов.',
        },
      ],
    },
  ],
  ar: [
    {
      title: 'البحث والمنتجات',
      items: [
        {
          q: 'كيف أجد منتجًا بالقرب مني؟',
          a: 'اكتب اسم المنتج أو اسم المتجر في شريط البحث أعلاه. ستظهر النتائج المتاجر في منطقتك التي تحتوي على هذا المنتج.',
        },
        {
          q: 'هل الأسعار محدّثة دائمًا؟',
          a: 'يتم تحديث الأسعار من قِبَل أصحاب المتاجر عبر بوابة pundo. يُعرض تاريخ آخر تحديث بجانب كل سعر.',
        },
        {
          q: 'ماذا يعني «متوفر»؟',
          a: 'يعني «متوفر» أن المتجر أكّد توفر المنتج حاليًا. في حال الشك، ننصح بالاتصال بالمتجر مباشرةً.',
        },
        {
          q: 'هل يمكنني التصفية حسب المسافة أو السعر؟',
          a: 'نعم. في صفحة نتائج البحث يمكنك التصفية حسب نطاق المسافة وحسب وجود سعر مدرج.',
        },
      ],
    },
    {
      title: 'التقييمات والمراجعات',
      items: [
        {
          q: 'كيف أكتب تقييمًا؟',
          a: 'افتح أي صفحة منتج أو متجر وانتقل إلى قسم «التقييمات». تحتاج إلى حساب pundo مجاني.',
        },
        {
          q: 'هل يمكنني تعديل أو حذف تقييمي؟',
          a: 'نعم. انتقل إلى حسابي ← تقييماتي.',
        },
        {
          q: 'لماذا صوري غير مرئية بعد؟',
          a: 'تخضع جميع الصور لمراجعة موجزة قبل النشر. يستغرق ذلك عادةً أقل من 24 ساعة.',
        },
        {
          q: 'ماذا أفعل إذا رأيت تقييمًا غير لائق؟',
          a: 'اضغط على زر «إبلاغ» في التقييم. سيراجع فريقنا البلاغ.',
        },
      ],
    },
    {
      title: 'الحساب والخصوصية',
      items: [
        {
          q: 'هل أحتاج إلى حساب لاستخدام pundo؟',
          a: 'لا. يمكنك البحث والتصفح بحرية. الحساب مطلوب فقط لكتابة التقييمات.',
        },
        {
          q: 'كيف أحذف حسابي؟',
          a: 'انتقل إلى حسابي ← الخصوصية والحساب ← حذف الحساب. سيتم حذف جميع بياناتك وفق GDPR.',
        },
        {
          q: 'هل تتم مشاركة بياناتي مع المتاجر؟',
          a: 'لا. لا تُشارَك بياناتك الشخصية مطلقًا مع أصحاب المتاجر.',
        },
      ],
    },
  ],
  he: [
    {
      title: 'חיפוש ומוצרים',
      items: [
        {
          q: 'איך אני מוצא מוצר בקרבתי?',
          a: 'הקלד את שם המוצר או שם החנות בשורת החיפוש למעלה. התוצאות יציגו חנויות באזורך שמוכרות מוצר זה.',
        },
        {
          q: 'האם המחירים תמיד מעודכנים?',
          a: 'המחירים מתעדכנים על ידי בעלי החנויות דרך פורטל pundo. לצד כל מחיר מוצגת תאריך העדכון האחרון.',
        },
        {
          q: 'מה המשמעות של «במלאי»?',
          a: '«במלאי» פירושו שהחנות אישרה כי המוצר זמין כעת. במקרה של ספק, מומלץ להתקשר לחנות ישירות.',
        },
        {
          q: 'אפשר לסנן לפי מרחק או מחיר?',
          a: 'כן. בדף תוצאות החיפוש אפשר לסנן לפי רדיוס מרחק ולפי קיום מחיר.',
        },
      ],
    },
    {
      title: 'ביקורות ודירוגים',
      items: [
        {
          q: 'איך אני כותב ביקורת?',
          a: 'פתח כל דף מוצר או חנות וגלול לחלק «ביקורות». נדרש חשבון pundo חינמי.',
        },
        {
          q: 'האם אפשר לערוך או למחוק ביקורת שכתבתי?',
          a: 'כן. עבור אל החשבון שלי ← הביקורות שלי.',
        },
        {
          q: 'מדוע התמונות שלי עדיין אינן גלויות?',
          a: 'כל התמונות עוברות בדיקה קצרה לפני פרסום. הדבר לוקח בדרך כלל פחות מ-24 שעות.',
        },
        {
          q: 'מה לעשות אם אני רואה ביקורת לא הולמת?',
          a: 'לחץ על כפתור «דווח» בביקורת. הצוות שלנו יסקור את הדיווח.',
        },
      ],
    },
    {
      title: 'חשבון ופרטיות',
      items: [
        {
          q: 'האם אני צריך חשבון כדי להשתמש ב-pundo?',
          a: 'לא. אפשר לחפש ולגלוש בחופשיות. חשבון נדרש רק לכתיבת ביקורות.',
        },
        {
          q: 'איך אני מוחק את החשבון שלי?',
          a: 'עבור אל החשבון שלי ← פרטיות וחשבון ← מחיקת חשבון. כל הנתונים שלך יימחקו לצמיתות בהתאם ל-GDPR.',
        },
        {
          q: 'האם הנתונים שלי משותפים עם חנויות?',
          a: 'לא. הנתונים האישיים שלך לעולם אינם נמסרים לבעלי חנויות.',
        },
      ],
    },
  ],
}
