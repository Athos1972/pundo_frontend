import type { Lang } from './lang'

export type LegalPage = 'imprint' | 'privacy' | 'terms' | 'about' | 'contact'

export type LegalSection = {
  heading?: string
  body: string
}

export type LegalContent = {
  title: string
  sections: LegalSection[]
}

// ⚠️ PLACEHOLDER: Replace all section bodies with actual legal text before launch.
// All content below is placeholder text only.
export const legalContent: Record<LegalPage, Record<Lang, LegalContent>> = {
  imprint: {
    en: {
      title: 'Imprint',
      sections: [
        {
          heading: 'Company Information',
          body: '⚠️ PLACEHOLDER — Company name, registration number, registered address (Cyprus), VAT number.',
        },
        {
          heading: 'Contact',
          body: '⚠️ PLACEHOLDER — Email: contact@pundo.cy\nPhone: ⚠️ PLACEHOLDER',
        },
        {
          heading: 'Responsible for content',
          body: '⚠️ PLACEHOLDER — Name and address of responsible person.',
        },
      ],
    },
    de: {
      title: 'Impressum',
      sections: [
        {
          heading: 'Unternehmensangaben',
          body: '⚠️ PLACEHOLDER — Firmenname, Registernummer, Geschäftsadresse (Zypern), USt-ID.',
        },
        {
          heading: 'Kontakt',
          body: '⚠️ PLACEHOLDER — E-Mail: contact@pundo.cy\nTelefon: ⚠️ PLACEHOLDER',
        },
        {
          heading: 'Verantwortlich für den Inhalt',
          body: '⚠️ PLACEHOLDER — Name und Adresse der verantwortlichen Person.',
        },
      ],
    },
    ru: {
      title: 'Выходные данные',
      sections: [
        {
          heading: 'Сведения о компании',
          body: '⚠️ PLACEHOLDER — Название компании, регистрационный номер, адрес (Кипр), НДС.',
        },
        {
          heading: 'Контакты',
          body: '⚠️ PLACEHOLDER — Email: contact@pundo.cy\nТелефон: ⚠️ PLACEHOLDER',
        },
        {
          heading: 'Ответственный за содержание',
          body: '⚠️ PLACEHOLDER — Имя и адрес ответственного лица.',
        },
      ],
    },
    el: {
      title: 'Στοιχεία εταιρείας',
      sections: [
        {
          heading: 'Στοιχεία επιχείρησης',
          body: '⚠️ PLACEHOLDER — Επωνυμία εταιρείας, αριθμός εγγραφής, διεύθυνση (Κύπρος), ΑΦΜ.',
        },
        {
          heading: 'Επικοινωνία',
          body: '⚠️ PLACEHOLDER — Email: contact@pundo.cy\nΤηλέφωνο: ⚠️ PLACEHOLDER',
        },
        {
          heading: 'Υπεύθυνος περιεχομένου',
          body: '⚠️ PLACEHOLDER — Όνομα και διεύθυνση υπεύθυνου προσώπου.',
        },
      ],
    },
    ar: {
      title: 'بيانات الشركة',
      sections: [
        {
          heading: 'معلومات الشركة',
          body: '⚠️ PLACEHOLDER — اسم الشركة، رقم التسجيل، العنوان المسجل (قبرص)، رقم ضريبة القيمة المضافة.',
        },
        {
          heading: 'التواصل',
          body: '⚠️ PLACEHOLDER — البريد الإلكتروني: contact@pundo.cy\nالهاتف: ⚠️ PLACEHOLDER',
        },
        {
          heading: 'المسؤول عن المحتوى',
          body: '⚠️ PLACEHOLDER — الاسم والعنوان للشخص المسؤول.',
        },
      ],
    },
    he: {
      title: 'פרטי החברה',
      sections: [
        {
          heading: 'פרטי עסק',
          body: '⚠️ PLACEHOLDER — שם החברה, מספר הרישום, כתובת רשומה (קפריסין), מספר מע"מ.',
        },
        {
          heading: 'יצירת קשר',
          body: '⚠️ PLACEHOLDER — דוא"ל: contact@pundo.cy\nטלפון: ⚠️ PLACEHOLDER',
        },
        {
          heading: 'אחראי על התוכן',
          body: '⚠️ PLACEHOLDER — שם וכתובת האחראי.',
        },
      ],
    },
  },

  privacy: {
    en: {
      title: 'Privacy Policy',
      sections: [
        {
          heading: 'Overview',
          body: 'We take the protection of your personal data seriously. This privacy policy explains what data we collect, why, and how.',
        },
        {
          heading: 'Analytics',
          body: 'We use Plausible Analytics, a self-hosted and privacy-friendly web analytics tool, to understand how our site is used. Our Plausible instance runs on our own servers (plausible.pundo.cy) — your analytics data never leaves our infrastructure and is not shared with any third party. Plausible is cookieless and does not track individual users. No cookie consent is required.',
        },
        {
          heading: 'Data we collect',
          body: '⚠️ PLACEHOLDER — List all data collected: account email, location (if granted), review content, etc.',
        },
        {
          heading: 'Your rights (GDPR)',
          body: '⚠️ PLACEHOLDER — Right to access, rectification, erasure, portability, objection. Contact: contact@pundo.cy',
        },
        {
          heading: 'Contact',
          body: '⚠️ PLACEHOLDER — Data controller: [Company name], [Address]. Email: contact@pundo.cy',
        },
      ],
    },
    de: {
      title: 'Datenschutzerklärung',
      sections: [
        {
          heading: 'Übersicht',
          body: 'Der Schutz Ihrer persönlichen Daten ist uns wichtig. Diese Datenschutzerklärung erläutert, welche Daten wir erheben, warum und wie.',
        },
        {
          heading: 'Analytics',
          body: 'Wir verwenden Plausible Analytics, ein selbst gehostetes und datenschutzfreundliches Web-Analyse-Tool, um zu verstehen, wie unsere Seite genutzt wird. Unsere Plausible-Instanz läuft auf unseren eigenen Servern (plausible.pundo.cy) — deine Analysedaten verlassen unsere Infrastruktur niemals und werden an keinen Dritten weitergegeben. Plausible ist cookielos und trackt keine Einzelnutzer. Eine Cookie-Einwilligung ist nicht erforderlich.',
        },
        {
          heading: 'Erhobene Daten',
          body: '⚠️ PLACEHOLDER — Alle erhobenen Daten auflisten: E-Mail-Adresse, Standort (falls freigegeben), Bewertungsinhalt, etc.',
        },
        {
          heading: 'Ihre Rechte (DSGVO)',
          body: '⚠️ PLACEHOLDER — Recht auf Auskunft, Berichtigung, Löschung, Portabilität, Widerspruch. Kontakt: contact@pundo.cy',
        },
        {
          heading: 'Kontakt',
          body: '⚠️ PLACEHOLDER — Verantwortlicher: [Firmenname], [Adresse]. E-Mail: contact@pundo.cy',
        },
      ],
    },
    ru: {
      title: 'Политика конфиденциальности',
      sections: [
        {
          heading: 'Обзор',
          body: 'Мы серьёзно относимся к защите ваших персональных данных. В этой политике объясняется, какие данные мы собираем, зачем и как.',
        },
        {
          heading: 'Аналитика',
          body: 'Мы используем Plausible Analytics — самостоятельно размещённый, дружественный к приватности инструмент веб-аналитики — чтобы понять, как используется наш сайт. Наш экземпляр Plausible работает на наших собственных серверах (plausible.pundo.cy) — ваши данные аналитики никогда не покидают нашу инфраструктуру и не передаются третьим сторонам. Plausible не использует cookies и не отслеживает отдельных пользователей. Согласие на cookies не требуется.',
        },
        {
          heading: 'Собираемые данные',
          body: '⚠️ PLACEHOLDER — Перечислить все собираемые данные: email, местоположение (если разрешено), содержимое отзывов и т.д.',
        },
        {
          heading: 'Ваши права (GDPR)',
          body: '⚠️ PLACEHOLDER — Право на доступ, исправление, удаление, портабельность, возражение. Контакт: contact@pundo.cy',
        },
        {
          heading: 'Контакты',
          body: '⚠️ PLACEHOLDER — Оператор данных: [Название компании], [Адрес]. Email: contact@pundo.cy',
        },
      ],
    },
    el: {
      title: 'Πολιτική Απορρήτου',
      sections: [
        {
          heading: 'Επισκόπηση',
          body: 'Λαμβάνουμε σοβαρά την προστασία των προσωπικών σας δεδομένων. Αυτή η πολιτική εξηγεί ποια δεδομένα συλλέγουμε, γιατί και πώς.',
        },
        {
          heading: 'Analytics',
          body: 'Χρησιμοποιούμε το Plausible Analytics, ένα αυτο-φιλοξενούμενο εργαλείο ανάλυσης ιστού φιλικό προς την ιδιωτικότητα, για να κατανοήσουμε πώς χρησιμοποιείται ο ιστότοπός μας. Το Plausible τρέχει στους δικούς μας διακομιστές (plausible.pundo.cy) — τα δεδομένα αναλυτικών σας δεν εγκαταλείπουν ποτέ την υποδομή μας και δεν κοινοποιούνται σε τρίτους. Το Plausible δεν χρησιμοποιεί cookies και δεν παρακολουθεί μεμονωμένους χρήστες.',
        },
        {
          heading: 'Δεδομένα που συλλέγουμε',
          body: '⚠️ PLACEHOLDER — Καταγραφή όλων των δεδομένων: email, τοποθεσία (αν επιτραπεί), περιεχόμενο αξιολογήσεων κ.λπ.',
        },
        {
          heading: 'Τα δικαιώματά σας (GDPR)',
          body: '⚠️ PLACEHOLDER — Δικαίωμα πρόσβασης, διόρθωσης, διαγραφής, φορητότητας, εναντίωσης. Επικοινωνία: contact@pundo.cy',
        },
        {
          heading: 'Επικοινωνία',
          body: '⚠️ PLACEHOLDER — Υπεύθυνος επεξεργασίας: [Επωνυμία], [Διεύθυνση]. Email: contact@pundo.cy',
        },
      ],
    },
    ar: {
      title: 'سياسة الخصوصية',
      sections: [
        {
          heading: 'نظرة عامة',
          body: 'نأخذ حماية بياناتك الشخصية بجدية. توضح سياسة الخصوصية هذه البيانات التي نجمعها ولماذا وكيف.',
        },
        {
          heading: 'التحليلات',
          body: 'نستخدم Plausible Analytics، وهو أداة تحليل ويب ذاتية الاستضافة وصديقة للخصوصية، لفهم كيفية استخدام موقعنا. تعمل نسخة Plausible الخاصة بنا على خوادمنا الخاصة (plausible.pundo.cy) — بيانات التحليلات الخاصة بك لا تغادر بنيتنا التحتية أبداً ولا تتم مشاركتها مع أي طرف ثالث. لا يستخدم Plausible ملفات تعريف الارتباط ولا يتتبع مستخدمين بعينهم.',
        },
        {
          heading: 'البيانات التي نجمعها',
          body: '⚠️ PLACEHOLDER — سرد جميع البيانات المجمعة: البريد الإلكتروني، الموقع (إن أُذن)، محتوى التقييمات، إلخ.',
        },
        {
          heading: 'حقوقك (GDPR)',
          body: '⚠️ PLACEHOLDER — حق الوصول والتصحيح والحذف والنقل والاعتراض. التواصل: contact@pundo.cy',
        },
        {
          heading: 'التواصل',
          body: '⚠️ PLACEHOLDER — المتحكم في البيانات: [اسم الشركة]، [العنوان]. البريد الإلكتروني: contact@pundo.cy',
        },
      ],
    },
    he: {
      title: 'מדיניות פרטיות',
      sections: [
        {
          heading: 'סקירה כללית',
          body: 'אנו מייחסים חשיבות רבה להגנה על הנתונים האישיים שלך. מדיניות פרטיות זו מסבירה אילו נתונים אנו אוספים, מדוע וכיצד.',
        },
        {
          heading: 'ניתוח נתונים',
          body: 'אנו משתמשים ב-Plausible Analytics, כלי אנליטיקה לאינטרנט מבוזר-עצמית וידידותי לפרטיות, להבנת אופן השימוש באתר שלנו. מופע ה-Plausible שלנו רץ על השרתים שלנו (plausible.pundo.cy) — נתוני האנליטיקה שלך לעולם לא עוזבים את התשתית שלנו ואינם משותפים עם צדדים שלישיים. Plausible אינו משתמש בעוגיות ואינו עוקב אחרי משתמשים בודדים.',
        },
        {
          heading: 'הנתונים שאנו אוספים',
          body: '⚠️ PLACEHOLDER — פירוט כל הנתונים הנאספים: כתובת אימייל, מיקום (אם הותר), תוכן ביקורות וכו\'.',
        },
        {
          heading: 'הזכויות שלך (GDPR)',
          body: '⚠️ PLACEHOLDER — זכות גישה, תיקון, מחיקה, ניידות, התנגדות. צור קשר: contact@pundo.cy',
        },
        {
          heading: 'יצירת קשר',
          body: '⚠️ PLACEHOLDER — אחראי על הנתונים: [שם החברה], [כתובת]. דוא"ל: contact@pundo.cy',
        },
      ],
    },
  },

  terms: {
    en: {
      title: 'Terms of Service',
      sections: [
        {
          heading: 'Acceptance of Terms',
          body: '⚠️ PLACEHOLDER — By using pundo.cy, you agree to these terms. If you do not agree, please do not use the service.',
        },
        {
          heading: 'Description of Service',
          body: '⚠️ PLACEHOLDER — pundo is a product and price locator app for local shops in Cyprus. We display product availability and pricing information as provided by shop owners.',
        },
        {
          heading: 'User Accounts',
          body: '⚠️ PLACEHOLDER — Account registration, responsibilities, prohibited conduct.',
        },
        {
          heading: 'Accuracy of Information',
          body: '⚠️ PLACEHOLDER — Disclaimer: product availability and prices are provided by shops and may not always be current.',
        },
        {
          heading: 'Limitation of Liability',
          body: '⚠️ PLACEHOLDER — Standard liability limitation clause.',
        },
        {
          heading: 'Governing Law',
          body: '⚠️ PLACEHOLDER — These terms are governed by the laws of the Republic of Cyprus.',
        },
      ],
    },
    de: {
      title: 'Nutzungsbedingungen',
      sections: [
        {
          heading: 'Zustimmung zu den Bedingungen',
          body: '⚠️ PLACEHOLDER — Durch die Nutzung von pundo.cy stimmen Sie diesen Bedingungen zu.',
        },
        {
          heading: 'Beschreibung des Dienstes',
          body: '⚠️ PLACEHOLDER — pundo ist eine Produkt- und Preislocator-App für lokale Shops auf Zypern.',
        },
        {
          heading: 'Nutzerkonten',
          body: '⚠️ PLACEHOLDER — Kontoregistrierung, Pflichten, verbotenes Verhalten.',
        },
        {
          heading: 'Richtigkeit der Informationen',
          body: '⚠️ PLACEHOLDER — Haftungsausschluss: Produktverfügbarkeit und Preise werden von Shops bereitgestellt.',
        },
        {
          heading: 'Haftungsbeschränkung',
          body: '⚠️ PLACEHOLDER — Standardklausel zur Haftungsbeschränkung.',
        },
        {
          heading: 'Anwendbares Recht',
          body: '⚠️ PLACEHOLDER — Diese Bedingungen unterliegen dem Recht der Republik Zypern.',
        },
      ],
    },
    ru: {
      title: 'Условия использования',
      sections: [
        {
          heading: 'Принятие условий',
          body: '⚠️ PLACEHOLDER — Используя pundo.cy, вы соглашаетесь с настоящими условиями.',
        },
        {
          heading: 'Описание сервиса',
          body: '⚠️ PLACEHOLDER — pundo — приложение для поиска товаров и цен в местных магазинах Кипра.',
        },
        {
          heading: 'Учётные записи',
          body: '⚠️ PLACEHOLDER — Регистрация, обязанности пользователя, запрещённые действия.',
        },
        {
          heading: 'Точность информации',
          body: '⚠️ PLACEHOLDER — Отказ от ответственности: наличие товаров и цены предоставляются магазинами.',
        },
        {
          heading: 'Ограничение ответственности',
          body: '⚠️ PLACEHOLDER — Стандартное положение об ограничении ответственности.',
        },
        {
          heading: 'Применимое право',
          body: '⚠️ PLACEHOLDER — Настоящие условия регулируются законодательством Республики Кипр.',
        },
      ],
    },
    el: {
      title: 'Όροι Χρήσης',
      sections: [
        {
          heading: 'Αποδοχή Όρων',
          body: '⚠️ PLACEHOLDER — Χρησιμοποιώντας το pundo.cy, αποδέχεστε τους παρόντες όρους.',
        },
        {
          heading: 'Περιγραφή Υπηρεσίας',
          body: '⚠️ PLACEHOLDER — Το pundo είναι εφαρμογή εύρεσης προϊόντων και τιμών σε τοπικά καταστήματα της Κύπρου.',
        },
        {
          heading: 'Λογαριασμοί Χρηστών',
          body: '⚠️ PLACEHOLDER — Εγγραφή λογαριασμού, υποχρεώσεις, απαγορευμένες ενέργειες.',
        },
        {
          heading: 'Ακρίβεια Πληροφοριών',
          body: '⚠️ PLACEHOLDER — Αποποίηση ευθύνης: διαθεσιμότητα και τιμές παρέχονται από τα καταστήματα.',
        },
        {
          heading: 'Περιορισμός Ευθύνης',
          body: '⚠️ PLACEHOLDER — Τυπική ρήτρα περιορισμού ευθύνης.',
        },
        {
          heading: 'Εφαρμοστέο Δίκαιο',
          body: '⚠️ PLACEHOLDER — Οι παρόντες όροι διέπονται από το δίκαιο της Κυπριακής Δημοκρατίας.',
        },
      ],
    },
    ar: {
      title: 'شروط الاستخدام',
      sections: [
        {
          heading: 'قبول الشروط',
          body: '⚠️ PLACEHOLDER — باستخدامك لـ pundo.cy، فإنك توافق على هذه الشروط.',
        },
        {
          heading: 'وصف الخدمة',
          body: '⚠️ PLACEHOLDER — pundo هو تطبيق لتحديد المنتجات والأسعار في المحلات المحلية في قبرص.',
        },
        {
          heading: 'حسابات المستخدمين',
          body: '⚠️ PLACEHOLDER — تسجيل الحساب، المسؤوليات، السلوك المحظور.',
        },
        {
          heading: 'دقة المعلومات',
          body: '⚠️ PLACEHOLDER — إخلاء مسؤولية: توافر المنتجات والأسعار مقدَّمة من المحلات وقد لا تكون محدَّثة دائمًا.',
        },
        {
          heading: 'تحديد المسؤولية',
          body: '⚠️ PLACEHOLDER — بند تحديد المسؤولية القياسي.',
        },
        {
          heading: 'القانون الحاكم',
          body: '⚠️ PLACEHOLDER — تخضع هذه الشروط لقوانين جمهورية قبرص.',
        },
      ],
    },
    he: {
      title: 'תנאי שימוש',
      sections: [
        {
          heading: 'קבלת התנאים',
          body: '⚠️ PLACEHOLDER — על ידי שימוש ב-pundo.cy, אתה מסכים לתנאים אלה.',
        },
        {
          heading: 'תיאור השירות',
          body: '⚠️ PLACEHOLDER — pundo הוא אפליקציית איתור מוצרים ומחירים בחנויות מקומיות בקפריסין.',
        },
        {
          heading: 'חשבונות משתמשים',
          body: '⚠️ PLACEHOLDER — רישום חשבון, אחריות, התנהגות אסורה.',
        },
        {
          heading: 'דיוק המידע',
          body: '⚠️ PLACEHOLDER — הגבלת אחריות: זמינות מוצרים ומחירים מסופקים על ידי חנויות ועשויים שלא להיות עדכניים תמיד.',
        },
        {
          heading: 'הגבלת אחריות',
          body: '⚠️ PLACEHOLDER — סעיף הגבלת אחריות סטנדרטי.',
        },
        {
          heading: 'דין חל',
          body: '⚠️ PLACEHOLDER — תנאים אלה כפופים לחוקי רפובליקת קפריסין.',
        },
      ],
    },
  },

  about: {
    en: {
      title: 'About Us',
      sections: [
        {
          heading: 'Our Mission',
          body: 'pundo helps people in Cyprus find products and compare prices at local shops — making local commerce more visible and accessible.',
        },
        {
          heading: 'Our Story',
          body: '⚠️ PLACEHOLDER — How pundo started, who is behind it, when it was founded.',
        },
        {
          heading: 'For Shop Owners',
          body: 'Are you a shop owner in Larnaca? Join pundo and make your products discoverable to thousands of local customers. Contact us at contact@pundo.cy.',
        },
      ],
    },
    de: {
      title: 'Über uns',
      sections: [
        {
          heading: 'Unsere Mission',
          body: 'pundo hilft Menschen auf Zypern dabei, Produkte zu finden und Preise in lokalen Shops zu vergleichen — und macht lokalen Handel sichtbarer und zugänglicher.',
        },
        {
          heading: 'Unsere Geschichte',
          body: '⚠️ PLACEHOLDER — Wie pundo entstanden ist, wer dahintersteckt, wann es gegründet wurde.',
        },
        {
          heading: 'Für Shop-Inhaber',
          body: 'Sind Sie Shop-Inhaber in Larnaca? Treten Sie pundo bei und machen Sie Ihre Produkte für tausende lokale Kunden auffindbar. Kontakt: contact@pundo.cy',
        },
      ],
    },
    ru: {
      title: 'О нас',
      sections: [
        {
          heading: 'Наша миссия',
          body: 'pundo помогает жителям Кипра находить товары и сравнивать цены в местных магазинах, делая местную торговлю более заметной и доступной.',
        },
        {
          heading: 'Наша история',
          body: '⚠️ PLACEHOLDER — Как появился pundo, кто стоит за проектом, когда он был основан.',
        },
        {
          heading: 'Для владельцев магазинов',
          body: 'Вы владелец магазина в Ларнаке? Присоединяйтесь к pundo и сделайте ваши товары доступными тысячам местных покупателей. Контакт: contact@pundo.cy',
        },
      ],
    },
    el: {
      title: 'Σχετικά με εμάς',
      sections: [
        {
          heading: 'Η αποστολή μας',
          body: 'Το pundo βοηθά τους ανθρώπους στην Κύπρο να βρίσκουν προϊόντα και να συγκρίνουν τιμές σε τοπικά καταστήματα.',
        },
        {
          heading: 'Η ιστορία μας',
          body: '⚠️ PLACEHOLDER — Πώς ξεκίνησε το pundo, ποιοι βρίσκονται πίσω από αυτό, πότε ιδρύθηκε.',
        },
        {
          heading: 'Για ιδιοκτήτες καταστημάτων',
          body: 'Είστε ιδιοκτήτης καταστήματος στη Λάρνακα; Εγγραφείτε στο pundo. Επικοινωνία: contact@pundo.cy',
        },
      ],
    },
    ar: {
      title: 'من نحن',
      sections: [
        {
          heading: 'مهمتنا',
          body: 'يساعد pundo الناس في قبرص على إيجاد المنتجات ومقارنة الأسعار في المحلات المحلية، مما يجعل التجارة المحلية أكثر ظهوراً وإمكانية وصول.',
        },
        {
          heading: 'قصتنا',
          body: '⚠️ PLACEHOLDER — كيف بدأ pundo، من وراءه، متى تأسس.',
        },
        {
          heading: 'لأصحاب المحلات',
          body: 'هل أنت صاحب محل في لارنكا؟ انضم إلى pundo واجعل منتجاتك قابلة للاكتشاف. تواصل معنا: contact@pundo.cy',
        },
      ],
    },
    he: {
      title: 'אודותינו',
      sections: [
        {
          heading: 'המשימה שלנו',
          body: 'pundo עוזר לאנשים בקפריסין למצוא מוצרים ולהשוות מחירים בחנויות מקומיות, ומאפשר לסחר המקומי להיות נגיש ונראה יותר.',
        },
        {
          heading: 'הסיפור שלנו',
          body: '⚠️ PLACEHOLDER — כיצד החל pundo, מי עומד מאחוריו, מתי נוסד.',
        },
        {
          heading: 'לבעלי חנויות',
          body: 'אתה בעל חנות בלרנקה? הצטרף ל-pundo ועשה את המוצרים שלך נגישים ללקוחות מקומיים. צור קשר: contact@pundo.cy',
        },
      ],
    },
  },

  contact: {
    en: {
      title: 'Contact',
      sections: [
        {
          heading: 'Get in Touch',
          body: 'We\'d love to hear from you — whether you\'re a customer with feedback or a shop owner interested in joining pundo.',
        },
        {
          heading: 'Email',
          body: 'contact@pundo.cy',
        },
        {
          heading: 'Address',
          body: '⚠️ PLACEHOLDER — Company address, Larnaca, Cyprus.',
        },
        {
          heading: 'For Shop Owners',
          body: 'Interested in listing your shop on pundo? Email us at contact@pundo.cy and we\'ll get you set up.',
        },
      ],
    },
    de: {
      title: 'Kontakt',
      sections: [
        {
          heading: 'Schreiben Sie uns',
          body: 'Wir freuen uns über Ihre Nachricht — egal ob Sie Kunde mit Feedback sind oder Shop-Inhaber, der pundo beitreten möchte.',
        },
        {
          heading: 'E-Mail',
          body: 'contact@pundo.cy',
        },
        {
          heading: 'Adresse',
          body: '⚠️ PLACEHOLDER — Firmenadresse, Larnaca, Zypern.',
        },
        {
          heading: 'Für Shop-Inhaber',
          body: 'Möchten Sie Ihren Shop auf pundo listen? Schreiben Sie uns an contact@pundo.cy.',
        },
      ],
    },
    ru: {
      title: 'Контакты',
      sections: [
        {
          heading: 'Свяжитесь с нами',
          body: 'Мы рады вашим сообщениям — будь то отзыв клиента или запрос владельца магазина.',
        },
        {
          heading: 'Email',
          body: 'contact@pundo.cy',
        },
        {
          heading: 'Адрес',
          body: '⚠️ PLACEHOLDER — Адрес компании, Ларнака, Кипр.',
        },
        {
          heading: 'Для владельцев магазинов',
          body: 'Хотите разместить свой магазин на pundo? Напишите нам на contact@pundo.cy.',
        },
      ],
    },
    el: {
      title: 'Επικοινωνία',
      sections: [
        {
          heading: 'Επικοινωνήστε μαζί μας',
          body: 'Χαιρόμαστε να ακούσουμε από εσάς — είτε είστε πελάτης με σχόλια είτε ιδιοκτήτης καταστήματος.',
        },
        {
          heading: 'Email',
          body: 'contact@pundo.cy',
        },
        {
          heading: 'Διεύθυνση',
          body: '⚠️ PLACEHOLDER — Διεύθυνση εταιρείας, Λάρνακα, Κύπρος.',
        },
        {
          heading: 'Για ιδιοκτήτες καταστημάτων',
          body: 'Ενδιαφέρεστε να καταχωρίσετε το κατάστημά σας; Επικοινωνήστε στο contact@pundo.cy.',
        },
      ],
    },
    ar: {
      title: 'اتصل بنا',
      sections: [
        {
          heading: 'تواصل معنا',
          body: 'يسعدنا الاستماع إليك — سواء كنت عميلاً لديه ملاحظات أو صاحب محل مهتم بالانضمام إلى pundo.',
        },
        {
          heading: 'البريد الإلكتروني',
          body: 'contact@pundo.cy',
        },
        {
          heading: 'العنوان',
          body: '⚠️ PLACEHOLDER — عنوان الشركة، لارنكا، قبرص.',
        },
        {
          heading: 'لأصحاب المحلات',
          body: 'مهتم بإدراج محلك في pundo؟ راسلنا على contact@pundo.cy.',
        },
      ],
    },
    he: {
      title: 'צור קשר',
      sections: [
        {
          heading: 'דבר איתנו',
          body: 'נשמח לשמוע ממך — בין אם אתה לקוח עם משוב או בעל חנות המעוניין להצטרף ל-pundo.',
        },
        {
          heading: 'דוא"ל',
          body: 'contact@pundo.cy',
        },
        {
          heading: 'כתובת',
          body: '⚠️ PLACEHOLDER — כתובת החברה, לרנקה, קפריסין.',
        },
        {
          heading: 'לבעלי חנויות',
          body: 'מעוניין לרשום את החנות שלך ב-pundo? שלח לנו אימייל ל-contact@pundo.cy.',
        },
      ],
    },
  },
}
