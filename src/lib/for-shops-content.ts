import type { Lang } from './lang'

export interface ForShopsFeature { icon: string; title: string; body: string }
export interface ForShopsStep { num: string; title: string; body: string; time: string }

export interface ForShopsTestimonial {
  quote: string
  name: string
  role: string        // e.g. "Electronics shop, Nicosia"
  initials: string
  color?: string      // optional avatar bg (CSS-var-name or Tailwind class); default: accent-light
}

export interface ForShopsFaqItem { q: string; a: string }

export interface ForShopsContent {
  // --- existing ---
  hero_headline: string
  hero_headline_accent: string         // accent-coloured tail of h1
  hero_sub: string
  hero_eyebrow: string                 // "For local businesses in Cyprus"
  cta_label: string
  cta_secondary_label: string          // "See how it works"
  social_proof: string                 // "Joined by 340+ businesses across Cyprus"

  business_type_chips: string[]        // 3 items incl. emoji prefix

  stats: {
    businesses: string                 // "340+" — [TODO: real number]
    searches: string                   // "12k" — [TODO: real number]
    cities: string                     // "30+" — [TODO: real number]
    fee_note: string                   // full asterisk footnote sentence
  }

  pain_gain_title: string
  pain_items: string[]                 // 5 — "Without pundo"
  gain_items: string[]                 // 5 — "With pundo"

  features_title: string
  features: ForShopsFeature[]

  translation_usp: {
    eyebrow: string                    // "Our #1 differentiator"
    headline: string                   // prefix before accent word
    headline_accent: string            // accent-coloured word (e.g. "automatically")
    body: string
    mock_label: string                 // footnote in mock
    mock_footnote: string
  }

  steps_title: string
  steps: ForShopsStep[]               // 3 steps, each with time pill

  testimonials_title: string
  testimonials: ForShopsTestimonial[] // 3 items

  faq_title: string
  faq: ForShopsFaqItem[]              // 6 items

  final_cta_title: string
  final_cta_body: string
  final_cta_primary: string           // "Register my business free"
  final_cta_secondary: string         // "Contact us first"
  final_cta_fineprint: string         // "Takes 5 minutes · No credit card · Free to start"

  meta_description: string            // 150–160 chars for SEO
}

export const forShopsContent: Record<Lang, ForShopsContent> = {
  en: {
    hero_headline: 'More customers find your business —',
    hero_headline_accent: 'on the map',
    hero_sub: 'pundo connects shops, service providers and tradespeople with customers actively searching nearby. No website needed, no monthly fee.',
    hero_eyebrow: 'For local businesses in Cyprus',
    cta_label: 'Register free — takes 5 min →',
    cta_secondary_label: '▶ See how it works',
    social_proof: 'Joined by 340+ businesses across Cyprus',

    business_type_chips: ['🏪 Shops & retailers', '🔧 Tradespeople', '🛎️ Service providers'],

    stats: {
      businesses: '340+',   // [TODO: real number]
      searches: '12k',      // [TODO: real number]
      cities: '30+',        // [TODO: real number]
      fee_note: 'Your business listing is free forever. Services such as product/service listings, mass-upload and others will depend on your future plan.',
    },

    pain_gain_title: 'Invisible online vs. found on the map',
    pain_items: [
      'Customers can\'t find you in search',
      'No way to show your current prices',
      'Missing out on tourists & expats nearby',
      'No reviews — no trust',
      'Manual updates in multiple places',
    ],
    gain_items: [
      'Appear when customers search nearby',
      'Display live prices, stock & offers',
      'Reach Russian, German & Arabic speakers',
      'Collect real reviews and build trust',
      'Update once — sync everywhere',
    ],

    features_title: 'All you need to get discovered',
    features: [
      { icon: '📦', title: 'Services & product listings', body: 'Retailers: import your catalogue from Excel or CSV. Tradespeople: list your trades and service area. Service providers: add services with pricing — all in one place.' },
      { icon: '🗺️', title: 'Map visibility', body: 'Your business appears on the map when customers search for what you offer — no extra effort needed.' },
      { icon: '🏷️', title: 'Offers & promotions', body: 'Create time-limited offers that are highlighted in search results and on your business page.' },
      { icon: '★', title: 'Reviews & reputation', body: 'Collect authentic reviews from real customers. Respond, moderate and build trust in your brand.' },
      { icon: '🔑', title: 'API sync', body: 'Connect your own inventory or booking system via REST API to keep your data in sync automatically.' },
      { icon: '📊', title: 'Insights dashboard', body: 'See how customers find you — searches, product views and offer clicks at a glance.' },
    ],

    translation_usp: {
      eyebrow: 'Our #1 differentiator',
      headline: 'Your listings, in every language —',
      headline_accent: 'automatically',
      body: 'You add your products, services or trades once — in any language. pundo automatically translates everything into all 6 supported languages. A Russian tourist finds your shop in Russian. A German expat finds your electrician in German. Without you doing a thing.',
      mock_label: 'Automatically translated from Greek — you only listed it once',
      mock_footnote: 'Available in 6 languages · No extra work',
    },

    steps_title: 'Up and running in minutes',
    steps: [
      { num: '1', title: 'Register your business', body: 'Enter your business name, type of shop/service, address and email. No credit card needed.', time: '~3 min' },
      { num: '2', title: 'Confirm your offerings', body: 'pundo suggests products or services based on your business type. Review, adjust and confirm.', time: '~2 min' },
      { num: '3', title: 'Go live', body: 'Confirm your email and your listing immediately appears on the map — visible to customers searching nearby.', time: 'After email' },
    ],

    testimonials_title: 'They found more customers. So will you.',
    testimonials: [
      {
        quote: 'Within a week of listing on pundo, customers started calling to check if a specific TV model was in stock. I didn\'t change anything — they just found me.',  // [TODO: real testimonial — BB]
        name: 'Maria Konstantinou',
        role: 'Electronics retailer, Nicosia',
        initials: 'MK',
      },
      {
        quote: 'I was sceptical — I\'m an electrician, not a shop. But within days I was getting calls from people who found me on pundo searching for an electrician nearby.',  // [TODO: real testimonial — BB]
        name: 'Nikos Papadopoulos',
        role: 'Electrician, Limassol',
        initials: 'NP',
      },
      {
        quote: 'My pool maintenance service is now found by tourists who don\'t speak Greek. pundo translates everything — I just listed my services once.',  // [TODO: real testimonial — BB]
        name: 'Andreas Themistocleous',
        role: 'Pool maintenance, Paphos',
        initials: 'AT',
      },
    ],

    faq_title: 'Everything you need to know',
    faq: [
      { q: 'Does pundo handle the sale or take a cut?', a: 'No. pundo connects customers directly with your shop and your own channels — we never process orders or payments, and we never take a commission on your sales. Every deal stays between you and your customer.' },
      { q: 'Is it really free? What\'s the catch?', a: 'Your business listing is free forever — no credit card, no trial period. Listing stays free. In the future, paid plans will unlock more capacity, such as offering a larger number of products or services. The core visibility feature always stays free.' },
      { q: 'Is there a paid plan — and what would I get?', a: 'Paid plans are planned for 2027. Your listing will always remain free. Plans will differ in how many products and services you can offer, and will be tailored to your local market. On any plan you\'ll also be able to spotlight individual products, promote special deals by email, and get featured in pundo\'s Homesick recommendations.' },
      { q: 'Will my shop appear on Google?', a: 'Very likely. The more detail you provide and the more attractive your listing, the higher the chance your business surfaces on Google and other search engines. pundo\'s structured data is optimised to help search engines find and index your listing.' },
      { q: 'How soon will my shop appear in searches?', a: 'On pundo itself, your shop goes live immediately after you confirm your email — no manual review, no waiting. Getting indexed by search engines and AI assistants like ChatGPT, Gemini, Grok or DeepSeek depends on their own crawl cycles; a complete, detailed listing will be picked up faster.' },
      { q: 'What information do I need to list my shop?', a: 'Onboarding takes 6 simple steps: your type of product or service, categories, specific product/service groups, address, contact channels — and then you\'re at the sign-up details. That\'s it.' },
      { q: 'Can I update my shop details myself?', a: 'Absolutely. In the Shop-Owner dashboard you can edit everything yourself, any time — shop details, products and services, images, prices, and time-limited offers.' },
      { q: 'Can customers contact me through pundo?', a: 'Yes — on your terms. Add every channel you like: WhatsApp, Telegram, phone, website, social media accounts. Customers reach out in the way they prefer, directly to you.' },
      { q: 'Can I list specific products or brands I carry?', a: 'You can list your products and services in many ways — manually, by CSV/Excel import, or via API sync. Listing by specific brand is a planned feature.' },
      { q: 'I have 500+ products. Can I import them?', a: 'Yes. Retailers can import a product catalogue via CSV or Excel spreadsheet. If you have a POS or inventory system with a REST API, we can sync automatically. Service providers and tradespeople typically add their services manually — it only takes a few minutes.' },
      { q: 'I\'m a tradesperson — does pundo work for me too?', a: 'Absolutely. pundo works for electricians, tilers, cleaners, pool maintenance, painters and any other trade or service. You list your trade and area, and customers searching nearby find you.' },
      { q: 'Do I need a website or technical skills?', a: 'No. Registration takes about 5 minutes in a browser — no developer, no app, no technical knowledge needed. If you can write an email, you can list your business on pundo.' },
      { q: 'Are my listings translated automatically?', a: 'Yes — this is our #1 differentiator. You list your products, services or trades once in any language. pundo automatically translates your listings into all 6 supported languages: English, German, Greek, Russian, Arabic and Hebrew. A tourist searching in Russian finds your shop in Russian. You do nothing extra.' },
    ],

    final_cta_title: 'Your business is invisible online. Fix it today — for free.',
    final_cta_body: 'Join 340+ Cyprus businesses already being found on pundo — shops, tradespeople and service providers.',
    final_cta_primary: 'Register my business free →',
    final_cta_secondary: 'Contact us first',
    final_cta_fineprint: 'Takes 5 minutes · No credit card · Free to start',

    meta_description: 'List your shop, trade or service on pundo — free forever. Reach customers searching nearby in 6 languages. No website needed. Sign up free in 5 minutes.',
  },

  de: {
    hero_headline: 'Mehr Kunden finden dein Unternehmen —',
    hero_headline_accent: 'auf der Karte',
    hero_sub: 'pundo verbindet Shops, Dienstleister und Handwerker mit Kunden, die aktiv in der Nähe suchen. Keine eigene Website nötig, keine monatlichen Gebühren.',
    hero_eyebrow: 'Für lokale Unternehmen auf Zypern',
    cta_label: 'Kostenlos registrieren — dauert 5 Min →',
    cta_secondary_label: '▶ So funktioniert es',
    social_proof: 'Bereits 340+ Unternehmen auf ganz Zypern dabei',

    business_type_chips: ['🏪 Shops & Händler', '🔧 Handwerker', '🛎️ Dienstleister'],

    stats: {
      businesses: '340+',   // [TODO: real number]
      searches: '12k',      // [TODO: real number]
      cities: '30+',        // [TODO: real number]
      fee_note: 'Dein Unternehmenseintrag ist für immer kostenlos. Erweiterte Dienste wie Produktlisten, Massenimport u.a. hängen von deinem zukünftigen Plan ab.',
    },

    pain_gain_title: 'Online unsichtbar vs. auf der Karte gefunden',
    pain_items: [
      'Kunden finden dich nicht in der Suche',
      'Keine Möglichkeit, aktuelle Preise zu zeigen',
      'Touristen und Expats in der Nähe verpassen dich',
      'Keine Bewertungen — kein Vertrauen',
      'Manuelle Updates an mehreren Stellen',
    ],
    gain_items: [
      'Erscheinst, wenn Kunden in der Nähe suchen',
      'Zeige aktuelle Preise, Bestand und Angebote',
      'Erreichst russisch-, deutsch- und arabischsprachige Kunden',
      'Sammle echte Bewertungen und baue Vertrauen auf',
      'Einmal aktualisieren — überall synchron',
    ],

    features_title: 'Alles was du brauchst, um gefunden zu werden',
    features: [
      { icon: '📦', title: 'Produkt- & Dienstleistungslisten', body: 'Händler: Katalog aus Excel oder CSV importieren. Handwerker: Gewerke und Einzugsgebiet eintragen. Dienstleister: Leistungen mit Preisen hinzufügen — alles an einem Ort.' },
      { icon: '🗺️', title: 'Sichtbarkeit auf der Karte', body: 'Dein Unternehmen erscheint auf der Karte, wenn Kunden nach deinem Angebot suchen — ganz ohne zusätzlichen Aufwand.' },
      { icon: '🏷️', title: 'Angebote & Aktionen', body: 'Erstelle zeitlich begrenzte Angebote, die in Suchergebnissen und auf deiner Unternehmensseite hervorgehoben werden.' },
      { icon: '★', title: 'Bewertungen & Reputation', body: 'Sammle echte Bewertungen von echten Kunden. Reagiere, moderiere und stärke das Vertrauen in deine Marke.' },
      { icon: '🔑', title: 'API-Synchronisation', body: 'Verbinde dein Warenwirtschaftssystem über REST API für automatische Datensynchronisation.' },
      { icon: '📊', title: 'Insights-Dashboard', body: 'Sieh auf einen Blick, wie Kunden dich finden — Suchanfragen, Produktaufrufe und Klicks auf Angebote.' },
    ],

    translation_usp: {
      eyebrow: 'Unser #1-Unterschied',
      headline: 'Deine Einträge, in jeder Sprache —',
      headline_accent: 'automatisch',
      body: 'Du trägst deine Produkte, Dienstleistungen oder Gewerke einmal ein — in beliebiger Sprache. pundo übersetzt alles automatisch in alle 6 unterstützten Sprachen. Ein russischer Tourist findet deinen Shop auf Russisch. Ein deutsch­sprachiger Expat findet deinen Elektriker auf Deutsch. Ohne dass du etwas tun musst.',
      mock_label: 'Automatisch aus dem Griechischen übersetzt — du hast es nur einmal eingetragen',
      mock_footnote: 'Verfügbar in 6 Sprachen · Kein Mehraufwand',
    },

    steps_title: 'In Minuten startklar',
    steps: [
      { num: '1', title: 'Unternehmen registrieren', body: 'Trage Unternehmensname, Art des Shops/Dienstes, Adresse und E-Mail ein. Keine Kreditkarte nötig.', time: '~3 Min' },
      { num: '2', title: 'Angebot bestätigen', body: 'pundo schlägt Produkte oder Dienstleistungen basierend auf deinem Unternehmenstyp vor. Prüfen, anpassen, bestätigen.', time: '~2 Min' },
      { num: '3', title: 'Live gehen', body: 'E-Mail bestätigen und dein Eintrag erscheint sofort auf der Karte — sichtbar für Kunden in der Nähe.', time: 'Nach E-Mail' },
    ],

    testimonials_title: 'Sie fanden mehr Kunden. Du auch.',
    testimonials: [
      {
        quote: 'Innerhalb einer Woche nach der Registrierung auf pundo riefen Kunden an, um zu fragen, ob ein bestimmtes TV-Modell vorrätig ist. Ich hatte nichts geändert — sie haben mich einfach gefunden.',  // [TODO: real testimonial — BB]
        name: 'Maria Konstantinou',
        role: 'Elektronikhändlerin, Nikosia',
        initials: 'MK',
      },
      {
        quote: 'Ich war skeptisch — ich bin Elektriker, kein Laden. Aber schon nach wenigen Tagen kamen Anrufe von Leuten, die mich auf pundo gefunden hatten.',  // [TODO: real testimonial — BB]
        name: 'Nikos Papadopoulos',
        role: 'Elektriker, Limassol',
        initials: 'NP',
      },
      {
        quote: 'Mein Pool-Wartungsservice wird jetzt von Touristen gefunden, die kein Griechisch sprechen. pundo übersetzt alles — ich habe meine Dienstleistungen nur einmal eingetragen.',  // [TODO: real testimonial — BB]
        name: 'Andreas Themistocleous',
        role: 'Pool-Wartung, Paphos',
        initials: 'AT',
      },
    ],

    faq_title: 'Alles was du wissen musst',
    faq: [
      { q: 'Wickelt pundo den Verkauf ab oder erhält eine Provision?', a: 'Nein. pundo verbindet Kunden direkt mit deinem Shop und deinen eigenen Kanälen — wir wickeln weder Bestellungen noch Zahlungen ab und nehmen niemals eine Provision auf deinen Umsatz. Jedes Geschäft bleibt zwischen dir und deinem Kunden.' },
      { q: 'Wirklich kostenlos? Was ist der Haken?', a: 'Dein Unternehmenseintrag ist für immer kostenlos — keine Kreditkarte, keine Probezeit. Das Listing bleibt gratis. Zukünftige kostenpflichtige Plans werden mehr Kapazität freischalten, z.B. eine größere Anzahl an Produkten oder Dienstleistungen. Die Grundsichtbarkeit bleibt immer kostenlos.' },
      { q: 'Gibt es kostenpflichtige Plans — und was bekomme ich dafür?', a: 'Kostenpflichtige Plans sind für 2027 geplant. Dein Eintrag bleibt immer kostenlos. Plans unterscheiden sich in der Anzahl der Produkte und Dienstleistungen, die du anbieten kannst, und werden auf deinen lokalen Markt zugeschnitten. Mit jedem Plan kannst du außerdem einzelne Produkte hervorheben, besondere Angebote per E-Mail bewerben und in pundos Homesick-Empfehlungen erscheinen.' },
      { q: 'Wird mein Shop auf Google erscheinen?', a: 'Mit hoher Wahrscheinlichkeit. Je mehr Details du bereitstellst und je attraktiver dein Eintrag ist, desto größer die Chance, dass dein Unternehmen auf Google und anderen Suchmaschinen sichtbar wird. pundos strukturierte Daten sind darauf ausgelegt, Suchmaschinen das Auffinden und Indexieren deines Eintrags zu erleichtern.' },
      { q: 'Wie schnell erscheine ich in den Suchergebnissen?', a: 'Auf pundo selbst geht dein Shop sofort nach der E-Mail-Bestätigung live — keine manuelle Prüfung, kein Warten. Die Indexierung durch Suchmaschinen und KI-Assistenten wie ChatGPT, Gemini, Grok oder DeepSeek hängt von deren eigenen Crawl-Zyklen ab; ein vollständiger, detaillierter Eintrag wird schneller aufgenommen.' },
      { q: 'Welche Informationen brauche ich, um meinen Shop einzutragen?', a: 'Das Onboarding läuft in 6 einfachen Schritten ab: Produkt-/Dienstleistungstyp, Kategorien, konkrete Produkt-/Dienstleistungsgruppen, Adresse, Kontaktkanäle — und schon bist du bei den Anmeldedaten. Das war\'s.' },
      { q: 'Kann ich meine Shop-Daten nach der Registrierung selbst ändern?', a: 'Natürlich. Im Shop-Owner-Dashboard kannst du jederzeit alles selbst bearbeiten — Shop-Details, Produkte und Dienstleistungen, Bilder, Preise und zeitlich begrenzte Angebote.' },
      { q: 'Können Kunden mich über pundo kontaktieren?', a: 'Ja — auf deine Art. Hinterlege alle Kanäle, die du möchtest: WhatsApp, Telegram, Telefon, Webseite, Social-Media-Accounts. Kunden kontaktieren dich direkt auf dem Weg, den sie bevorzugen.' },
      { q: 'Kann ich bestimmte Produkte oder Marken eintragen?', a: 'Du kannst deine Produkte und Dienstleistungen auf viele Arten eintragen — manuell, per CSV/Excel-Import oder via API-Synchronisation. Die direkte Markenlistung ist ein geplantes Feature.' },
      { q: 'Ich habe 500+ Produkte. Kann ich sie importieren?', a: 'Ja. Händler können einen Produktkatalog per CSV oder Excel importieren. Bei einem Kassensystem mit REST API können wir automatisch synchronisieren. Dienstleister und Handwerker fügen ihre Leistungen meist manuell hinzu — das dauert nur wenige Minuten.' },
      { q: 'Ich bin Handwerker — funktioniert pundo auch für mich?', a: 'Absolut. pundo eignet sich für Elektriker, Fliesenleger, Reinigungskräfte, Pool-Wartung, Maler und jedes andere Gewerk oder jeden Dienst. Du trägst dein Gewerk und Einzugsgebiet ein und Kunden finden dich.' },
      { q: 'Brauche ich eine Website oder technische Kenntnisse?', a: 'Nein. Die Registrierung dauert etwa 5 Minuten im Browser — kein Entwickler, keine App, kein technisches Wissen nötig. Wenn du eine E-Mail schreiben kannst, kannst du dein Unternehmen auf pundo eintragen.' },
      { q: 'Werden meine Einträge automatisch übersetzt?', a: 'Ja — das ist unser #1-Unterschied. Du trägst deine Produkte, Dienstleistungen oder Gewerke einmal in einer beliebigen Sprache ein. pundo übersetzt sie automatisch in alle 6 unterstützten Sprachen: Englisch, Deutsch, Griechisch, Russisch, Arabisch und Hebräisch. Du machst nichts Weiteres.' },
    ],

    final_cta_title: 'Dein Unternehmen ist online unsichtbar. Ändere das heute — kostenlos.',
    final_cta_body: 'Schließ dich 340+ zyprischen Unternehmen an, die bereits auf pundo gefunden werden — Shops, Handwerker und Dienstleister.',
    final_cta_primary: 'Unternehmen kostenlos registrieren →',
    final_cta_secondary: 'Erst Kontakt aufnehmen',
    final_cta_fineprint: 'Dauert 5 Minuten · Keine Kreditkarte · Kostenlos starten',

    meta_description: 'Trage deinen Shop, dein Gewerk oder Dienst auf pundo ein — für immer kostenlos. Erreiche Kunden in 6 Sprachen. Keine Website nötig. Anmeldung in 5 Minuten.',
  },

  el: {
    hero_headline: 'Περισσότεροι πελάτες βρίσκουν την επιχείρησή σου —',
    hero_headline_accent: 'στον χάρτη',
    hero_sub: 'Το pundo συνδέει καταστήματα, παρόχους υπηρεσιών και τεχνίτες με πελάτες που αναζητούν ενεργά σε κοντινή απόσταση. Δεν χρειάζεται ιστοσελίδα, χωρίς μηνιαία συνδρομή.',
    hero_eyebrow: 'Για τοπικές επιχειρήσεις στην Κύπρο',
    cta_label: 'Δωρεάν εγγραφή — διαρκεί 5 λεπτά →',
    cta_secondary_label: '▶ Δες πώς λειτουργεί',
    social_proof: 'Ήδη 340+ επιχειρήσεις σε όλη την Κύπρο',

    business_type_chips: ['🏪 Καταστήματα & έμποροι', '🔧 Τεχνίτες', '🛎️ Πάροχοι υπηρεσιών'],

    stats: {
      businesses: '340+',   // [TODO: real number]
      searches: '12k',      // [TODO: real number]
      cities: '30+',        // [TODO: real number]
      fee_note: 'Η καταχώρηση της επιχείρησής σου είναι δωρεάν για πάντα. Πρόσθετες υπηρεσίες όπως λίστες προϊόντων/υπηρεσιών, μαζική εισαγωγή κ.ά. θα εξαρτώνται από το μελλοντικό σου πλάνο.',
    },

    pain_gain_title: 'Αόρατος online ή ορατός στον χάρτη',
    pain_items: [
      'Οι πελάτες δεν σε βρίσκουν στην αναζήτηση',
      'Δεν μπορείς να δείξεις τις τρέχουσες τιμές σου',
      'Χάνεις τουρίστες και εκπατριστές στην περιοχή',
      'Χωρίς αξιολογήσεις — χωρίς εμπιστοσύνη',
      'Χειροκίνητες ενημερώσεις σε πολλά μέρη',
    ],
    gain_items: [
      'Εμφανίζεσαι όταν οι πελάτες αναζητούν κοντά',
      'Εμφάνιση τρεχουσών τιμών, αποθεμάτων και προσφορών',
      'Προσεγγίζεις Ρωσόφωνους, Γερμανόφωνους και Αραβόφωνους',
      'Συγκέντρωσε αληθινές αξιολογήσεις και κέρδισε εμπιστοσύνη',
      'Ενημέρωσε μία φορά — συγχρονισμός παντού',
    ],

    features_title: 'Όλα όσα χρειάζεσαι για να σε ανακαλύψουν',
    features: [
      { icon: '📦', title: 'Λίστες υπηρεσιών & προϊόντων', body: 'Έμποροι: εισαγωγή καταλόγου από Excel ή CSV. Τεχνίτες: καταχώρηση ειδικοτήτων και περιοχής. Πάροχοι: προσθήκη υπηρεσιών με τιμές — όλα σε ένα μέρος.' },
      { icon: '🗺️', title: 'Εμφάνιση στον χάρτη', body: 'Η επιχείρησή σου εμφανίζεται στον χάρτη όταν οι πελάτες ψάχνουν αυτό που προσφέρεις.' },
      { icon: '🏷️', title: 'Προσφορές & ακτιβισμός', body: 'Δημιούργησε χρονικά περιορισμένες προσφορές που επισημαίνονται στα αποτελέσματα αναζήτησης.' },
      { icon: '★', title: 'Αξιολογήσεις & φήμη', body: 'Συγκέντρωσε αυθεντικές αξιολογήσεις από πραγματικούς πελάτες. Απάντα και διαχειρίσου τη φήμη σου.' },
      { icon: '🔑', title: 'Συγχρονισμός API', body: 'Σύνδεσε το σύστημα αποθήκης σου μέσω REST API για αυτόματη συγχρονισμό δεδομένων.' },
      { icon: '📊', title: 'Dashboard αναλύσεων', body: 'Δες πώς σε βρίσκουν οι πελάτες — αναζητήσεις, προβολές προϊόντων και κλικ σε προσφορές.' },
    ],

    translation_usp: {
      eyebrow: 'Το #1 μας πλεονέκτημα',
      headline: 'Οι καταχωρήσεις σου, σε κάθε γλώσσα —',
      headline_accent: 'αυτόματα',
      body: 'Καταχωρείς τα προϊόντα, τις υπηρεσίες ή τις ειδικότητές σου μία φορά — σε οποιαδήποτε γλώσσα. Το pundo μεταφράζει αυτόματα τα πάντα σε 6 υποστηριζόμενες γλώσσες. Ένας Ρώσος τουρίστας βρίσκει το κατάστημά σου στα Ρωσικά. Ένας Γερμανός expat βρίσκει τον ηλεκτρολόγο σου στα Γερμανικά. Χωρίς να κάνεις τίποτα.',
      mock_label: 'Αυτόματα μεταφρασμένο από τα Ελληνικά — το καταχώρησες μόνο μία φορά',
      mock_footnote: 'Διαθέσιμο σε 6 γλώσσες · Χωρίς επιπλέον δουλειά',
    },

    steps_title: 'Έτοιμος σε λίγα λεπτά',
    steps: [
      { num: '1', title: 'Εγγραφή επιχείρησης', body: 'Εισάγαγε το όνομα, τον τύπο καταστήματος/υπηρεσίας, τη διεύθυνση και το email σου. Δεν χρειάζεται κάρτα.', time: '~3 λεπτά' },
      { num: '2', title: 'Επιβεβαίωση προσφοράς', body: 'Το pundo προτείνει προϊόντα ή υπηρεσίες βάσει του τύπου επιχείρησής σου. Έλεγξε, προσάρμοσε και επιβεβαίωσε.', time: '~2 λεπτά' },
      { num: '3', title: 'Ζωντανά!', body: 'Επιβεβαίωσε το email σου και η καταχώρησή σου εμφανίζεται αμέσως στον χάρτη.', time: 'Μετά το email' },
    ],

    testimonials_title: 'Βρήκαν περισσότερους πελάτες. Το ίδιο θα κάνεις κι εσύ.',
    testimonials: [
      {
        quote: 'Μέσα σε μια εβδομάδα από την εγγραφή στο pundo, πελάτες άρχισαν να τηλεφωνούν για να ρωτήσουν αν κάποιο μοντέλο τηλεόρασης ήταν διαθέσιμο. Δεν άλλαξα τίποτα — με βρήκαν μόνοι τους.',  // [TODO: real testimonial — BB]
        name: 'Μαρία Κωνσταντίνου',
        role: 'Κατάστημα ηλεκτρονικών, Λευκωσία',
        initials: 'ΜΚ',
      },
      {
        quote: 'Ήμουν δύσπιστος — είμαι ηλεκτρολόγος, όχι κατάστημα. Αλλά μέσα σε λίγες μέρες έπαιρνα κλήσεις από ανθρώπους που με βρήκαν στο pundo.',  // [TODO: real testimonial — BB]
        name: 'Νίκος Παπαδόπουλος',
        role: 'Ηλεκτρολόγος, Λεμεσός',
        initials: 'ΝΠ',
      },
      {
        quote: 'Η υπηρεσία συντήρησης πισίνας μου βρίσκεται τώρα από τουρίστες που δεν μιλούν Ελληνικά. Το pundo μεταφράζει τα πάντα — καταχώρησα τις υπηρεσίες μου μόνο μία φορά.',  // [TODO: real testimonial — BB]
        name: 'Ανδρέας Θεμιστοκλέους',
        role: 'Συντήρηση πισίνας, Πάφος',
        initials: 'ΑΘ',
      },
    ],

    faq_title: 'Όλα όσα χρειάζεσαι να ξέρεις',
    faq: [
      { q: 'Χειρίζεται το pundo τις πωλήσεις ή παίρνει προμήθεια;', a: 'Όχι. Το pundo συνδέει άμεσα τους πελάτες με το κατάστημά σου και τα δικά σου κανάλια — δεν επεξεργαζόμαστε παραγγελίες ή πληρωμές και δεν παίρνουμε ποτέ προμήθεια από τις πωλήσεις σου. Κάθε συμφωνία παραμένει μεταξύ σου και του πελάτη σου.' },
      { q: 'Είναι πραγματικά δωρεάν; Τι πρέπει να γνωρίζω;', a: 'Η καταχώρησή σου είναι δωρεάν για πάντα — χωρίς κάρτα, χωρίς δοκιμαστική περίοδο. Η βασική καταχώρηση παραμένει δωρεάν. Στο μέλλον, επί πληρωμή πλάνα θα ξεκλειδώνουν μεγαλύτερη χωρητικότητα, π.χ. περισσότερα προϊόντα ή υπηρεσίες. Η βασική ορατότητα παραμένει πάντα δωρεάν.' },
      { q: 'Υπάρχει επί πληρωμή πλάνο — και τι περιλαμβάνει;', a: 'Τα επί πληρωμή πλάνα είναι προγραμματισμένα για το 2027. Η καταχώρησή σου θα παραμένει πάντα δωρεάν. Τα πλάνα θα διαφέρουν στον αριθμό προϊόντων και υπηρεσιών που μπορείς να προσφέρεις και θα προσαρμόζονται στην τοπική σου αγορά. Με οποιοδήποτε πλάνο θα μπορείς επίσης να αναδεικνύεις μεμονωμένα προϊόντα, να διαφημίζεις ειδικές προσφορές μέσω email και να εμφανίζεσαι στις Homesick προτάσεις του pundo.' },
      { q: 'Θα εμφανιστεί το κατάστημά μου στο Google;', a: 'Πολύ πιθανόν. Όσο περισσότερες λεπτομέρειες παρέχεις και όσο πιο ελκυστική είναι η καταχώρησή σου, τόσο μεγαλύτερη η πιθανότητα να εμφανιστεί η επιχείρησή σου στο Google και σε άλλες μηχανές αναζήτησης. Τα δομημένα δεδομένα του pundo είναι βελτιστοποιημένα ώστε να βοηθούν τις μηχανές αναζήτησης να βρουν και να ευρετηριάσουν την καταχώρησή σου.' },
      { q: 'Πόσο γρήγορα θα εμφανιστώ στα αποτελέσματα αναζήτησης;', a: 'Στο ίδιο το pundo, η καταχώρησή σου ενεργοποιείται αμέσως μετά την επιβεβαίωση του email σου — χωρίς χειροκίνητη ανασκόπηση, χωρίς αναμονή. Η ευρετηρίαση από μηχανές αναζήτησης και βοηθούς AI όπως ChatGPT, Gemini, Grok ή DeepSeek εξαρτάται από τους δικούς τους κύκλους ανίχνευσης· μια πλήρης, λεπτομερής καταχώρηση θα αναληφθεί γρηγορότερα.' },
      { q: 'Ποιες πληροφορίες χρειάζομαι για να καταχωρήσω το κατάστημά μου;', a: 'Η εισαγωγή γίνεται σε 6 απλά βήματα: τύπος προϊόντος ή υπηρεσίας, κατηγορίες, συγκεκριμένες ομάδες προϊόντων/υπηρεσιών, διεύθυνση, κανάλια επικοινωνίας — και φτάνεις στα στοιχεία εγγραφής. Αυτό ήταν.' },
      { q: 'Μπορώ να ενημερώσω τα στοιχεία του καταστήματός μου μόνος μου;', a: 'Απολύτως. Στον πίνακα ελέγχου του Shop-Owner μπορείς να επεξεργαστείς τα πάντα μόνος σου, οποτεδήποτε — στοιχεία καταστήματος, προϊόντα και υπηρεσίες, εικόνες, τιμές και χρονικά περιορισμένες προσφορές.' },
      { q: 'Μπορούν οι πελάτες να επικοινωνήσουν μαζί μου μέσω του pundo;', a: 'Ναι — με τους δικούς σου όρους. Πρόσθεσε κάθε κανάλι που θέλεις: WhatsApp, Telegram, τηλέφωνο, ιστοσελίδα, λογαριασμοί social media. Οι πελάτες επικοινωνούν απευθείας μαζί σου με τον τρόπο που προτιμούν.' },
      { q: 'Μπορώ να καταχωρήσω συγκεκριμένα προϊόντα ή μάρκες;', a: 'Μπορείς να καταχωρείς τα προϊόντα και τις υπηρεσίες σου με πολλούς τρόπους — χειροκίνητα, μέσω εισαγωγής CSV/Excel ή μέσω συγχρονισμού API. Η άμεση καταχώρηση κατά μάρκα είναι ένα προγραμματισμένο χαρακτηριστικό.' },
      { q: 'Έχω 500+ προϊόντα. Μπορώ να τα εισαγάγω;', a: 'Ναι. Οι έμποροι μπορούν να εισαγάγουν κατάλογο προϊόντων μέσω CSV ή Excel. Αν διαθέτεις σύστημα ταμείου με REST API, μπορούμε να συγχρονιστούμε αυτόματα. Οι πάροχοι υπηρεσιών προσθέτουν συνήθως τις υπηρεσίες τους χειροκίνητα — χρειάζονται μόνο λίγα λεπτά.' },
      { q: 'Είμαι τεχνίτης — το pundo λειτουργεί και για μένα;', a: 'Απολύτως. Το pundo λειτουργεί για ηλεκτρολόγους, πλακάδες, καθαριστές, συντήρηση πισίνας, ελαιοχρωματιστές και κάθε είδος εργασίας. Καταχωρείς την ειδικότητα και την περιοχή σου και οι πελάτες σε βρίσκουν.' },
      { q: 'Χρειάζομαι ιστοσελίδα ή τεχνικές γνώσεις;', a: 'Όχι. Η εγγραφή διαρκεί περίπου 5 λεπτά στο πρόγραμμα περιήγησης — χωρίς προγραμματιστή, χωρίς εφαρμογή, χωρίς τεχνικές γνώσεις. Αν μπορείς να γράψεις ένα email, μπορείς να καταχωρήσεις την επιχείρησή σου στο pundo.' },
      { q: 'Μεταφράζονται αυτόματα οι καταχωρήσεις μου;', a: 'Ναι — αυτό είναι το #1 πλεονέκτημά μας. Καταχωρείς μία φορά σε οποιαδήποτε γλώσσα. Το pundo μεταφράζει αυτόματα σε 6 γλώσσες: Αγγλικά, Γερμανικά, Ελληνικά, Ρωσικά, Αραβικά και Εβραϊκά. Ένας τουρίστας που ψάχνει στα Ρωσικά βρίσκει το κατάστημά σου στα Ρωσικά. Δεν χρειάζεται να κάνεις τίποτα επιπλέον.' },
    ],

    final_cta_title: 'Η επιχείρησή σου είναι αόρατη online. Φτιάξ\'το σήμερα — δωρεάν.',
    final_cta_body: 'Γίνε μέλος των 340+ κυπριακών επιχειρήσεων που βρίσκονται ήδη στο pundo — καταστήματα, τεχνίτες και πάροχοι υπηρεσιών.',
    final_cta_primary: 'Εγγραφή επιχείρησης δωρεάν →',
    final_cta_secondary: 'Επικοινώνησε μαζί μας πρώτα',
    final_cta_fineprint: 'Διαρκεί 5 λεπτά · Χωρίς κάρτα · Δωρεάν εκκίνηση',

    meta_description: 'Καταχώρησε το κατάστημα, το εργαστήριο ή την υπηρεσία σου στο pundo — δωρεάν για πάντα. Φτάσε πελάτες σε 6 γλώσσες. Χωρίς ιστοσελίδα. Εγγραφή σε 5 λεπτά.',
  },

  // T1 bug fix: was [{ … }][0] array literal — now plain object
  ru: {
    hero_headline: 'Больше клиентов найдут ваш бизнес —',
    hero_headline_accent: 'на карте',
    hero_sub: 'pundo соединяет магазины, поставщиков услуг и мастеров с клиентами, которые активно ищут поблизости. Без сайта, без ежемесячной платы.',
    hero_eyebrow: 'Для местного бизнеса на Кипре',
    cta_label: 'Зарегистрироваться бесплатно — 5 минут →',
    cta_secondary_label: '▶ Посмотреть как это работает',
    social_proof: 'Уже 340+ предприятий по всему Кипру',

    business_type_chips: ['🏪 Магазины и ритейл', '🔧 Мастера и ремонтники', '🛎️ Поставщики услуг'],

    stats: {
      businesses: '340+',   // [TODO: real number]
      searches: '12k',      // [TODO: real number]
      cities: '30+',        // [TODO: real number]
      fee_note: 'Размещение вашего бизнеса бесплатно навсегда. Расширенные услуги, такие как списки товаров/услуг, массовый импорт и другие, будут зависеть от вашего будущего тарифного плана.',
    },

    pain_gain_title: 'Невидим онлайн — или найден на карте',
    pain_items: [
      'Клиенты не находят вас в поиске',
      'Нет способа показать актуальные цены',
      'Туристы и экспаты рядом вас не замечают',
      'Нет отзывов — нет доверия',
      'Ручные обновления в нескольких местах',
    ],
    gain_items: [
      'Появляетесь, когда клиенты ищут поблизости',
      'Показывайте актуальные цены, наличие и акции',
      'Охватывайте русско-, немецко- и арабоязычных клиентов',
      'Собирайте настоящие отзывы и укрепляйте доверие',
      'Обновите один раз — синхронизация везде',
    ],

    features_title: 'Всё необходимое, чтобы вас нашли',
    features: [
      { icon: '📦', title: 'Списки услуг и товаров', body: 'Ритейлеры: импорт каталога из Excel или CSV. Мастера: укажите виды работ и зону обслуживания. Поставщики услуг: добавьте услуги с ценами — всё в одном месте.' },
      { icon: '🗺️', title: 'Отображение на карте', body: 'Ваш бизнес появляется на карте, когда клиенты ищут то, что вы предлагаете — без дополнительных усилий.' },
      { icon: '🏷️', title: 'Акции и предложения', body: 'Создавайте ограниченные по времени акции, которые выделяются в результатах поиска.' },
      { icon: '★', title: 'Отзывы и репутация', body: 'Собирайте настоящие отзывы от реальных клиентов. Отвечайте, управляйте и укрепляйте доверие.' },
      { icon: '🔑', title: 'Синхронизация через API', body: 'Подключите свою систему склада или бронирования через REST API для автоматической синхронизации данных.' },
      { icon: '📊', title: 'Аналитика', body: 'Смотрите, как клиенты находят вас — поиски, просмотры товаров и клики по акциям.' },
    ],

    translation_usp: {
      eyebrow: 'Наше главное преимущество',
      headline: 'Ваши объявления на каждом языке —',
      headline_accent: 'автоматически',
      body: 'Вы добавляете товары, услуги или виды работ один раз — на любом языке. pundo автоматически переводит всё на 6 поддерживаемых языков. Русский турист находит ваш магазин на русском. Немецкий экспат находит вашего электрика на немецком. Без каких-либо усилий с вашей стороны.',
      mock_label: 'Автоматически переведено с греческого — вы добавили объявление только один раз',
      mock_footnote: 'Доступно на 6 языках · Без дополнительной работы',
    },

    steps_title: 'Готово за несколько минут',
    steps: [
      { num: '1', title: 'Зарегистрируйте бизнес', body: 'Введите название, тип магазина/услуги, адрес и email. Кредитная карта не нужна.', time: '~3 мин' },
      { num: '2', title: 'Подтвердите предложения', body: 'pundo предложит товары или услуги на основе типа вашего бизнеса. Проверьте, скорректируйте и подтвердите.', time: '~2 мин' },
      { num: '3', title: 'Выходите в эфир', body: 'Подтвердите email — и ваша страница сразу появится на карте, видимая для клиентов поблизости.', time: 'После email' },
    ],

    testimonials_title: 'Они нашли больше клиентов. И вы найдёте.',
    testimonials: [
      {
        quote: 'Через неделю после регистрации на pundo клиенты начали звонить, чтобы узнать, есть ли в наличии конкретная модель телевизора. Я ничего не менял — они просто нашли меня.',  // [TODO: real testimonial — BB]
        name: 'Мария Константину',
        role: 'Магазин электроники, Никосия',
        initials: 'МК',
      },
      {
        quote: 'Я был настроен скептически — я электрик, а не магазин. Но через несколько дней уже получал звонки от людей, которые нашли меня на pundo.',  // [TODO: real testimonial — BB]
        name: 'Никос Пападопулос',
        role: 'Электрик, Лимасол',
        initials: 'НП',
      },
      {
        quote: 'Мою службу обслуживания бассейнов теперь находят туристы, которые не говорят по-гречески. pundo переводит всё — я добавил услуги только один раз.',  // [TODO: real testimonial — BB]
        name: 'Андреас Фемистоклеус',
        role: 'Обслуживание бассейнов, Пафос',
        initials: 'АФ',
      },
    ],

    faq_title: 'Всё что нужно знать',
    faq: [
      { q: 'Обрабатывает ли pundo продажи или берёт комиссию?', a: 'Нет. pundo связывает клиентов напрямую с вашим магазином и вашими каналами — мы никогда не обрабатываем заказы или платежи и никогда не берём комиссию с ваших продаж. Каждая сделка остаётся между вами и вашим клиентом.' },
      { q: 'Это действительно бесплатно? В чём подвох?', a: 'Размещение вашего бизнеса бесплатно навсегда — без кредитной карты, без пробного периода. Листинг остаётся бесплатным. В будущем платные планы откроют больше возможностей, например большее количество продуктов или услуг. Базовая видимость всегда остаётся бесплатной.' },
      { q: 'Есть ли платные планы — и что они дают?', a: 'Платные планы запланированы на 2027 год. Ваш листинг всегда будет бесплатным. Планы будут отличаться количеством продуктов и услуг, которые вы сможете предлагать, и будут адаптированы к вашему местному рынку. С любым планом вы также сможете выделять отдельные продукты, продвигать специальные предложения по email и появляться в Homesick-рекомендациях pundo.' },
      { q: 'Появится ли мой магазин в Google?', a: 'Очень вероятно. Чем больше деталей вы предоставляете и чем привлекательнее ваш листинг, тем выше шанс, что ваш бизнес появится в Google и других поисковых системах. Структурированные данные pundo оптимизированы, чтобы помочь поисковым системам найти и проиндексировать ваш листинг.' },
      { q: 'Как быстро я появлюсь в результатах поиска?', a: 'На самом pundo ваш магазин становится активным сразу после подтверждения email — без ручной проверки, без ожидания. Индексация поисковыми системами и ИИ-ассистентами, такими как ChatGPT, Gemini, Grok или DeepSeek, зависит от их собственных циклов сканирования; полный, подробный листинг будет подхвачен быстрее.' },
      { q: 'Какую информацию нужно предоставить для регистрации?', a: 'Регистрация проходит в 6 простых шагов: тип продукта или услуги, категории, конкретные группы продуктов/услуг, адрес, каналы связи — и вы уже на этапе регистрационных данных. Всё.' },
      { q: 'Могу ли я сам обновлять данные своего магазина?', a: 'Конечно. В панели управления Shop-Owner вы можете редактировать всё самостоятельно в любое время — данные магазина, продукты и услуги, изображения, цены и временные акции.' },
      { q: 'Могут ли клиенты связаться со мной через pundo?', a: 'Да — на ваших условиях. Добавьте любые каналы: WhatsApp, Telegram, телефон, сайт, аккаунты в социальных сетях. Клиенты обращаются к вам напрямую удобным для них способом.' },
      { q: 'Могу ли я указать конкретные товары или бренды?', a: 'Вы можете добавлять продукты и услуги разными способами — вручную, через импорт CSV/Excel или синхронизацию по API. Прямой листинг по брендам — запланированная функция.' },
      { q: 'У меня 500+ товаров. Могу я их импортировать?', a: 'Да. Ритейлеры могут импортировать каталог через CSV или Excel. Если у вас есть кассовая система с REST API, мы можем синхронизироваться автоматически. Поставщики услуг обычно добавляют свои услуги вручную — это займёт всего несколько минут.' },
      { q: 'Я мастер — pundo подходит и для меня?', a: 'Абсолютно. pundo подходит для электриков, плиточников, уборщиков, обслуживания бассейнов, маляров и любых других мастеров и услуг. Вы указываете вид работ и зону обслуживания, и клиенты находят вас.' },
      { q: 'Нужен ли сайт или технические знания?', a: 'Нет. Регистрация занимает около 5 минут в браузере — без разработчика, без приложения, без технических знаний. Если вы умеете писать email, вы можете разместить бизнес на pundo.' },
      { q: 'Мои объявления переводятся автоматически?', a: 'Да — это наше главное преимущество. Вы добавляете товары, услуги или виды работ один раз на любом языке. pundo автоматически переводит всё на 6 поддерживаемых языков: английский, немецкий, греческий, русский, арабский и иврит. Турист, ищущий на русском, находит ваш магазин на русском. Вы ничего дополнительно не делаете.' },
    ],

    final_cta_title: 'Ваш бизнес невидим онлайн. Исправьте это сегодня — бесплатно.',
    final_cta_body: 'Присоединитесь к 340+ кипрским предприятиям, которых уже находят на pundo — магазины, мастера и поставщики услуг.',
    final_cta_primary: 'Зарегистрировать бизнес бесплатно →',
    final_cta_secondary: 'Сначала связаться с нами',
    final_cta_fineprint: 'Занимает 5 минут · Без кредитной карты · Бесплатный старт',

    meta_description: 'Разместите магазин, мастерскую или услугу на pundo — бесплатно навсегда. Охватывайте клиентов на 6 языках. Без сайта. Регистрация за 5 минут. Без карты.',
  },

  ar: {
    hero_headline: 'المزيد من العملاء يجدون عملك —',
    hero_headline_accent: 'على الخريطة',
    hero_sub: 'يربط pundo المتاجر ومزودي الخدمات والحرفيين بالعملاء الذين يبحثون بنشاط في المنطقة المجاورة. لا تحتاج إلى موقع إلكتروني ولا رسوم شهرية.',
    hero_eyebrow: 'للشركات المحلية في قبرص',
    cta_label: 'سجّل مجانًا — يستغرق 5 دقائق →',
    cta_secondary_label: '▶ شاهد كيف يعمل',
    social_proof: 'انضمّ إليه 340+ شركة في جميع أنحاء قبرص',

    business_type_chips: ['🏪 المتاجر والبائعون', '🔧 الحرفيون', '🛎️ مزودو الخدمات'],

    stats: {
      businesses: '340+',   // [TODO: real number]
      searches: '12k',      // [TODO: real number]
      cities: '30+',        // [TODO: real number]
      fee_note: 'إدراج عملك مجاني للأبد. الخدمات مثل قوائم المنتجات/الخدمات والاستيراد الجماعي وغيرها ستعتمد على خطتك المستقبلية.',
    },

    pain_gain_title: 'غير مرئي عبر الإنترنت مقابل اكتشافك على الخريطة',
    pain_items: [
      'لا يجدك العملاء في البحث',
      'لا طريقة لعرض أسعارك الحالية',
      'تفوّت السياح والمغتربين القريبين منك',
      'لا تقييمات — لا ثقة',
      'تحديثات يدوية في أماكن متعددة',
    ],
    gain_items: [
      'تظهر عندما يبحث العملاء في المنطقة',
      'اعرض الأسعار الحالية والمخزون والعروض',
      'تصل إلى الناطقين بالروسية والألمانية والعربية',
      'اجمع تقييمات حقيقية وابنِ الثقة',
      'حدّث مرة واحدة — مزامنة في كل مكان',
    ],

    features_title: 'كل ما تحتاجه لتُكتشف',
    features: [
      { icon: '📦', title: 'قوائم الخدمات والمنتجات', body: 'للبائعين: استيراد الكتالوج من Excel أو CSV. للحرفيين: أدرج مهاراتك ومنطقة خدمتك. لمزودي الخدمات: أضف خدماتك مع الأسعار — كل شيء في مكان واحد.' },
      { icon: '🗺️', title: 'الظهور على الخريطة', body: 'تظهر شركتك على الخريطة عندما يبحث العملاء عما تقدمه — دون أي جهد إضافي.' },
      { icon: '🏷️', title: 'العروض والترويج', body: 'أنشئ عروضًا محدودة الوقت يتم تمييزها في نتائج البحث وعلى صفحة عملك.' },
      { icon: '★', title: 'التقييمات والسمعة', body: 'اجمع تقييمات حقيقية من عملاء حقيقيين. استجب وأدِر سمعة عملك.' },
      { icon: '🔑', title: 'مزامنة API', body: 'اربط نظام المخزون أو الحجز الخاص بك عبر REST API لمزامنة البيانات تلقائيًا.' },
      { icon: '📊', title: 'لوحة التحليلات', body: 'اطلع على كيفية اكتشاف العملاء لك — عمليات البحث ومشاهدات المنتج والنقرات على العروض.' },
    ],

    translation_usp: {
      eyebrow: 'ميزتنا الأولى',
      headline: 'قوائمك، بكل لغة —',
      headline_accent: 'تلقائيًا',
      body: 'تضيف منتجاتك أو خدماتك أو مهاراتك مرة واحدة — بأي لغة. يترجم pundo تلقائيًا كل شيء إلى 6 لغات مدعومة. السائح الروسي يجد متجرك بالروسية. المغترب الألماني يجد كهربائيك بالألمانية. دون أن تفعل شيئًا.',
      mock_label: 'مترجم تلقائيًا من اليونانية — أدرجته مرة واحدة فقط',
      mock_footnote: 'متاح بـ 6 لغات · بلا جهد إضافي',
    },

    steps_title: 'جاهز في دقائق',
    steps: [
      { num: '1', title: 'سجّل عملك', body: 'أدخل اسم عملك ونوع المتجر/الخدمة والعنوان والبريد الإلكتروني. لا حاجة لبطاقة ائتمان.', time: '~3 دقائق' },
      { num: '2', title: 'أكّد عروضك', body: 'يقترح pundo منتجات أو خدمات بناءً على نوع عملك. راجع وعدّل وأكّد.', time: '~دقيقتان' },
      { num: '3', title: 'ابدأ النشر', body: 'أكّد بريدك الإلكتروني ويظهر إدراجك فورًا على الخريطة — مرئيًا للعملاء القريبين منك.', time: 'بعد البريد' },
    ],

    testimonials_title: 'وجدوا عملاء أكثر. وستجد أنت أيضًا.',
    testimonials: [
      {
        quote: 'في غضون أسبوع من الإدراج على pundo، بدأ العملاء بالاتصال للاستفسار عن توفر موديل تلفزيون معين. لم أغيّر شيئًا — وجدوني ببساطة.',  // [TODO: real testimonial — BB]
        name: 'ماريا قسطنطينو',
        role: 'بائع إلكترونيات، نيقوسيا',
        initials: 'MK',
      },
      {
        quote: 'كنت متشككًا — أنا كهربائي لا متجر. لكن في غضون أيام بدأت أتلقى مكالمات من أشخاص وجدوني على pundo.',  // [TODO: real testimonial — BB]
        name: 'نيكوس باباذوبولوس',
        role: 'كهربائي، ليماسول',
        initials: 'NP',
      },
      {
        quote: 'خدمة صيانة المسابح الخاصة بي تجدها الآن سياح لا يتحدثون اليونانية. يترجم pundo كل شيء — أدرجت خدماتي مرة واحدة فقط.',  // [TODO: real testimonial — BB]
        name: 'أندرياس ثيميستوكليوس',
        role: 'صيانة مسابح، بافوس',
        initials: 'AT',
      },
    ],

    faq_title: 'كل ما تحتاج معرفته',
    faq: [
      { q: 'هل يتولى pundo إتمام الصفقات أو يأخذ عمولة؟', a: 'لا. يربط pundo العملاء مباشرةً بمتجرك وقنواتك الخاصة — نحن لا نعالج الطلبات أو المدفوعات ولا نأخذ عمولةً على مبيعاتك أبداً. كل صفقة تبقى بينك وبين عميلك.' },
      { q: 'هل هو مجاني حقًا؟ ما الذي يجب أن أعرفه؟', a: 'إدراج عملك مجاني للأبد — لا بطاقة ائتمان ولا فترة تجريبية. يبقى الإدراج مجانياً. مستقبلاً، ستتيح الخطط المدفوعة سعةً أكبر، كعدد أكبر من المنتجات أو الخدمات. تبقى الرؤية الأساسية مجانية دائماً.' },
      { q: 'هل هناك خطة مدفوعة — وماذا سأحصل؟', a: 'الخطط المدفوعة مخططة للعام 2027. إدراجك سيبقى مجانياً دائماً. ستختلف الخطط في عدد المنتجات والخدمات التي يمكنك تقديمها، وستُصمَّم لتناسب سوقك المحلي. مع أي خطة، ستتمكن أيضاً من إبراز منتجات بعينها، والترويج لعروض خاصة عبر البريد الإلكتروني، والظهور في توصيات Homesick على pundo.' },
      { q: 'هل سيظهر متجري على Google؟', a: 'على الأرجح. كلما زادت التفاصيل التي تقدمها وكان إدراجك أكثر جاذبية، ارتفعت احتمالية ظهور عملك على Google ومحركات البحث الأخرى. تم تحسين البيانات المنظمة في pundo لمساعدة محركات البحث على العثور على إدراجك وفهرسته.' },
      { q: 'كم من الوقت سيستغرق ظهوري في نتائج البحث؟', a: 'على pundo نفسه، يصبح متجرك نشطاً فور تأكيد بريدك الإلكتروني — دون مراجعة يدوية أو انتظار. يعتمد ظهورك في محركات البحث والمساعدين الذكيين كـ ChatGPT وGemini وGrok وDeepSeek على دورات الزحف الخاصة بهم؛ إدراج مكتمل ومفصّل سيُؤخذ بعين الاعتبار بشكل أسرع.' },
      { q: 'ما المعلومات التي أحتاجها لإدراج متجري؟', a: 'يتكون التسجيل من 6 خطوات بسيطة: نوع المنتج أو الخدمة، الفئات، مجموعات المنتجات/الخدمات المحددة، العنوان، قنوات التواصل — ثم تصل إلى بيانات التسجيل. هذا كل شيء.' },
      { q: 'هل أستطيع تحديث بيانات متجري بنفسي؟', a: 'بالتأكيد. في لوحة تحكم Shop-Owner يمكنك تعديل كل شيء بنفسك في أي وقت — تفاصيل المتجر والمنتجات والخدمات والصور والأسعار والعروض المحدودة بوقت.' },
      { q: 'هل يمكن للعملاء التواصل معي عبر pundo؟', a: 'نعم — بشروطك. أضف أي قناة تريدها: واتساب، تيليغرام، هاتف، موقع إلكتروني، حسابات التواصل الاجتماعي. يتواصل العملاء معك مباشرةً بالطريقة التي يفضلونها.' },
      { q: 'هل يمكنني إدراج منتجات أو علامات تجارية محددة؟', a: 'يمكنك إدراج منتجاتك وخدماتك بأساليب متعددة — يدوياً أو عبر استيراد CSV/Excel أو مزامنة API. إدراج العلامات التجارية بشكل مباشر ميزة مخططة قادمة.' },
      { q: 'لدي 500+ منتج. هل يمكنني استيرادها؟', a: 'نعم. يمكن للبائعين استيراد كتالوج المنتجات عبر CSV أو Excel. إذا كان لديك نظام نقاط بيع مع REST API، يمكننا المزامنة تلقائيًا. يضيف مزودو الخدمات عادةً خدماتهم يدويًا — يستغرق ذلك بضع دقائق فقط.' },
      { q: 'أنا حرفي — هل يناسبني pundo؟', a: 'بالتأكيد. pundo مناسب للكهربائيين والبلاطين وعمال النظافة وصيانة المسابح والدهانين وأي حرفة أو خدمة أخرى. تدرج حرفتك ومنطقتك ويجدك العملاء.' },
      { q: 'هل أحتاج إلى موقع إلكتروني أو مهارات تقنية؟', a: 'لا. يستغرق التسجيل حوالي 5 دقائق في المتصفح — دون مطوّر أو تطبيق أو معرفة تقنية. إذا كنت تستطيع كتابة بريد إلكتروني، يمكنك إدراج عملك على pundo.' },
      { q: 'هل تُترجم قوائمي تلقائيًا؟', a: 'نعم — هذه ميزتنا الأولى. تدرج منتجاتك أو خدماتك أو مهاراتك مرة واحدة بأي لغة. يترجم pundo تلقائيًا إلى 6 لغات مدعومة: الإنجليزية والألمانية واليونانية والروسية والعربية والعبرية. السائح الباحث بالروسية يجد متجرك بالروسية. لا تفعل شيئًا إضافيًا.' },
    ],

    final_cta_title: 'عملك غير مرئي عبر الإنترنت. أصلح ذلك اليوم — مجانًا.',
    final_cta_body: 'انضم إلى 340+ شركة قبرصية تُكتشف بالفعل على pundo — متاجر وحرفيون ومزودو خدمات.',
    final_cta_primary: 'سجّل عملي مجانًا →',
    final_cta_secondary: 'تواصل معنا أولًا',
    final_cta_fineprint: 'يستغرق 5 دقائق · بلا بطاقة ائتمان · مجاني للبدء',

    meta_description: 'أدرج متجرك أو حرفتك أو خدمتك على منصة pundo مجانًا للأبد. يصل إليك العملاء بـ 6 لغات مختلفة بدون موقع إلكتروني أو مهارات تقنية مطلوبة. سجّل في 5 دقائق.',
  },

  he: {
    hero_headline: 'עוד לקוחות ימצאו את העסק שלך —',
    hero_headline_accent: 'במפה',
    hero_sub: 'pundo מחבר חנויות, ספקי שירות ובעלי מקצוע עם לקוחות שמחפשים באזור הסמוך. ללא צורך באתר, ללא תשלום חודשי.',
    hero_eyebrow: 'לעסקים מקומיים בקפריסין',
    cta_label: 'הירשם בחינם — לוקח 5 דקות →',
    cta_secondary_label: '▶ ראה איך זה עובד',
    social_proof: '340+ עסקים ברחבי קפריסין כבר הצטרפו',

    business_type_chips: ['🏪 חנויות וקמעונאים', '🔧 בעלי מקצוע', '🛎️ ספקי שירות'],

    stats: {
      businesses: '340+',   // [TODO: real number]
      searches: '12k',      // [TODO: real number]
      cities: '30+',        // [TODO: real number]
      fee_note: 'הרישום לעסק שלך חינמי לנצח. שירותים כמו רשימות מוצרים/שירותים, ייבוא מאסיבי ואחרים יהיו תלויים בתוכנית העתידית שלך.',
    },

    pain_gain_title: 'בלתי נראה באינטרנט מול נמצא במפה',
    pain_items: [
      'לקוחות לא מוצאים אותך בחיפוש',
      'אין דרך להציג את המחירים הנוכחיים שלך',
      'מפספס תיירים ועולים חדשים בקרבתך',
      'ללא ביקורות — ללא אמון',
      'עדכונים ידניים במקומות מרובים',
    ],
    gain_items: [
      'מופיע כשלקוחות מחפשים בקרבתך',
      'הצג מחירים עדכניים, מלאי והצעות',
      'הגע לדוברי רוסית, גרמנית וערבית',
      'אסוף ביקורות אמיתיות ובנה אמון',
      'עדכן פעם אחת — סנכרון בכל מקום',
    ],

    features_title: 'כל מה שצריך כדי שימצאו אותך',
    features: [
      { icon: '📦', title: 'רשימות שירותים ומוצרים', body: 'קמעונאים: ייבא קטלוג מ-Excel או CSV. בעלי מקצוע: ציין את תחומי עיסוקך ואזור השירות. ספקי שירות: הוסף שירותים עם מחירים — הכל במקום אחד.' },
      { icon: '🗺️', title: 'נראות במפה', body: 'העסק שלך מופיע במפה כשלקוחות מחפשים את מה שאתה מציע — ללא מאמץ נוסף.' },
      { icon: '🏷️', title: 'מבצעים וקידום', body: 'צור מבצעים מוגבלים בזמן שמודגשים בתוצאות החיפוש ובדף העסק שלך.' },
      { icon: '★', title: 'ביקורות ומוניטין', body: 'אסוף ביקורות אמיתיות מלקוחות אמיתיים. הגב ונהל את המוניטין שלך.' },
      { icon: '🔑', title: 'סנכרון API', body: 'חבר את מערכת המלאי או ההזמנות שלך דרך REST API לסנכרון אוטומטי של הנתונים.' },
      { icon: '📊', title: 'לוח ניתוחים', body: 'ראה כיצד לקוחות מוצאים אותך — חיפושים, צפיות במוצרים ולחיצות על מבצעים.' },
    ],

    translation_usp: {
      eyebrow: 'היתרון #1 שלנו',
      headline: 'הרישומים שלך, בכל שפה —',
      headline_accent: 'אוטומטית',
      body: 'אתה מוסיף את המוצרים, השירותים או התחומים שלך פעם אחת — בכל שפה שתרצה. pundo מתרגם הכל אוטומטית ל-6 שפות נתמכות. תייר רוסי מוצא את החנות שלך ברוסית. עולה גרמני מוצא את החשמלאי שלך בגרמנית. בלי שתעשה דבר.',
      mock_label: 'תורגם אוטומטית מיוונית — רשמת את זה רק פעם אחת',
      mock_footnote: 'זמין ב-6 שפות · ללא עבודה נוספת',
    },

    steps_title: 'מוכן תוך דקות',
    steps: [
      { num: '1', title: 'רשום את העסק שלך', body: 'הזן שם עסק, סוג חנות/שירות, כתובת ואימייל. לא צריך כרטיס אשראי.', time: '~3 דקות' },
      { num: '2', title: 'אשר את ההיצע שלך', body: 'pundo מציע מוצרים או שירותים על פי סוג העסק שלך. בדוק, התאם ואשר.', time: '~2 דקות' },
      { num: '3', title: 'עלה לאוויר', body: 'אשר את האימייל שלך ורישומך יופיע מיד במפה — גלוי ללקוחות הסמוכים אליך.', time: 'אחרי אימייל' },
    ],

    testimonials_title: 'הם מצאו יותר לקוחות. גם אתה תמצא.',
    testimonials: [
      {
        quote: 'תוך שבוע מהרישום ב-pundo, לקוחות התחילו להתקשר לשאול אם דגם טלוויזיה מסוים זמין. לא שיניתי דבר — הם פשוט מצאו אותי.',  // [TODO: real testimonial — BB]
        name: 'מריה קונסטנטינו',
        role: 'חנות אלקטרוניקה, ניקוסיה',
        initials: 'MK',
      },
      {
        quote: 'הייתי סקפטי — אני חשמלאי, לא חנות. אבל תוך ימים ספורים קיבלתי שיחות מאנשים שמצאו אותי ב-pundo.',  // [TODO: real testimonial — BB]
        name: 'ניקוס פאפאדופולוס',
        role: 'חשמלאי, לימסול',
        initials: 'NP',
      },
      {
        quote: 'שירות תחזוקת הבריכות שלי נמצא עכשיו על ידי תיירים שלא מדברים יוונית. pundo מתרגם הכל — רשמתי את השירותים שלי רק פעם אחת.',  // [TODO: real testimonial — BB]
        name: 'אנדריאס תמיסטוקלאוס',
        role: 'תחזוקת בריכות, פאפוס',
        initials: 'AT',
      },
    ],

    faq_title: 'כל מה שצריך לדעת',
    faq: [
      { q: 'האם pundo מנהל את המכירה או לוקח עמלה?', a: 'לא. pundo מחבר לקוחות ישירות לחנות שלך ולערוצים שלך — אנחנו לא מעבדים הזמנות או תשלומים ולעולם לא גובים עמלה על המכירות שלך. כל עסקה נשארת בינך לבין הלקוח שלך.' },
      { q: 'זה באמת בחינם? מה הסיפור?', a: 'הרישום לעסק שלך חינמי לנצח — ללא כרטיס אשראי, ללא תקופת ניסיון. הרישום נשאר חינמי. בעתיד, תוכניות בתשלום יפתחו קיבולת גדולה יותר, כגון מספר גדול יותר של מוצרים או שירותים. הנראות הבסיסית תמיד נשארת חינמית.' },
      { q: 'האם יש תוכנית בתשלום — ומה אקבל?', a: 'תוכניות בתשלום מתוכננות לשנת 2027. הרישום שלך תמיד יישאר חינמי. התוכניות יתרבדו לפי מספר המוצרים והשירותים שתוכל להציע, ויותאמו לשוק המקומי שלך. עם כל תוכנית תוכל גם להדגיש מוצרים בודדים, לקדם עסקאות מיוחדות בדוא"ל ולהופיע בהמלצות Homesick של pundo.' },
      { q: 'האם החנות שלי תופיע ב-Google?', a: 'סביר מאוד. ככל שתספק פרטים רבים יותר ורישומך יהיה אטרקטיבי יותר, כך יגדל הסיכוי שהעסק שלך יופיע ב-Google ובמנועי חיפוש אחרים. הנתונים המובנים של pundo מותאמים לעזור למנועי חיפוש למצוא ולאנדקס את הרישום שלך.' },
      { q: 'כמה מהר אופיע בתוצאות החיפוש?', a: 'ב-pundo עצמו, החנות שלך עולה לאוויר מיד לאחר אישור האימייל — ללא בדיקה ידנית, ללא המתנה. האינדוקס על ידי מנועי חיפוש ועוזרי AI כמו ChatGPT, Gemini, Grok או DeepSeek תלוי במחזורי הסריקה שלהם; רישום מלא ומפורט ייקלט מהר יותר.' },
      { q: 'אילו פרטים אני צריך כדי לרשום את החנות שלי?', a: 'ההצטרפות מתבצעת ב-6 שלבים פשוטים: סוג המוצר או השירות, קטגוריות, קבוצות מוצרים/שירותים ספציפיות, כתובת, ערוצי יצירת קשר — ואז מגיעים לפרטי ההרשמה. זהו.' },
      { q: 'האם אוכל לעדכן את פרטי החנות שלי בעצמי?', a: 'בהחלט. בלוח הבקרה של בעל החנות תוכל לערוך הכל בעצמך בכל עת — פרטי חנות, מוצרים ושירותים, תמונות, מחירים והצעות מוגבלות בזמן.' },
      { q: 'האם לקוחות יכולים ליצור איתי קשר דרך pundo?', a: 'כן — בתנאים שלך. הוסף כל ערוץ שתרצה: WhatsApp, Telegram, טלפון, אתר אינטרנט, חשבונות רשתות חברתיות. לקוחות פונים אליך ישירות בדרך שמועדפת עליהם.' },
      { q: 'האם אוכל לרשום מוצרים או מותגים ספציפיים?', a: 'אתה יכול לרשום את המוצרים והשירותים שלך בדרכים רבות — ידנית, על ידי ייבוא CSV/Excel, או דרך סנכרון API. רישום לפי מותג ספציפי הוא פיצ\'ר מתוכנן.' },
      { q: 'יש לי 500+ מוצרים. האם אוכל לייבא אותם?', a: 'כן. קמעונאים יכולים לייבא קטלוג מוצרים דרך CSV או Excel. אם יש לך מערכת קופה עם REST API, נוכל לסנכרן אוטומטית. ספקי שירות בדרך כלל מוסיפים את שירותיהם ידנית — זה לוקח רק כמה דקות.' },
      { q: 'אני בעל מקצוע — האם pundo מתאים גם לי?', a: 'בהחלט. pundo מתאים לחשמלאים, רצפים, מנקים, תחזוקת בריכות, צבעים וכל מקצוע או שירות אחר. אתה מציין את תחום עיסוקך ואת האזור שלך, ולקוחות מוצאים אותך.' },
      { q: 'האם אני צריך אתר או כישורים טכניים?', a: 'לא. הרישום לוקח כ-5 דקות בדפדפן — ללא מפתח, ללא אפליקציה, ללא ידע טכני. אם אתה יכול לכתוב אימייל, אתה יכול לרשום את העסק שלך ב-pundo.' },
      { q: 'הרישומים שלי מתורגמים אוטומטית?', a: 'כן — זה היתרון #1 שלנו. אתה מוסיף מוצרים, שירותים או תחומים פעם אחת בכל שפה. pundo מתרגם הכל אוטומטית ל-6 שפות נתמכות: אנגלית, גרמנית, יוונית, רוסית, ערבית ועברית. תייר שמחפש ברוסית מוצא את החנות שלך ברוסית. אתה לא עושה דבר נוסף.' },
    ],

    final_cta_title: 'העסק שלך בלתי נראה באינטרנט. תקן את זה היום — בחינם.',
    final_cta_body: 'הצטרף ל-340+ עסקים קפריסאים שכבר נמצאים ב-pundo — חנויות, בעלי מקצוע וספקי שירות.',
    final_cta_primary: 'רשום את העסק שלי בחינם →',
    final_cta_secondary: 'צור קשר קודם',
    final_cta_fineprint: 'לוקח 5 דקות · ללא כרטיס אשראי · חינמי להתחלה',

    meta_description: 'רשום את החנות, המקצוע או השירות שלך ב-pundo — חינמי לנצח לגמרי. הגע ללקוחות ב-6 שפות שונות ללא צורך באתר אינטרנט או ידע טכני. הרשמה מהירה שלוקחת 5 דקות.',
  },
}
