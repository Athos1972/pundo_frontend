// src/lib/i18n/community.ts — Community / Favorites / Recently Viewed / Activity Feed namespace
const communityTranslations = {
  en: {
    community_section_title: 'Community',
    community_join: 'Join',
    community_members: 'members',
    community_name_naidivse: 'Russian-speaking Community',
    favorites_tab: 'My Favorites',
    favorites_add: 'Add to favorites',
    favorites_remove: 'Remove from favorites',
    favorites_added: 'Added to favorites',
    favorites_removed: 'Removed from favorites',
    favorites_login_required: 'Sign in to save favorites',
    favorites_empty: 'No favorites yet',
    favorites_empty_hint: 'Tap the heart on a product to get started',
    favorites_delete_confirm: 'Remove favorite?',
    favorites_delete_yes: 'Remove',
    favorites_interval_label: 'Notifications',
    favorites_interval_sofort: 'Immediately',
    favorites_interval_täglich: 'Daily',
    favorites_interval_wöchentlich: 'Weekly',
    favorites_interval_nie: 'Never',
    favorites_global_label: 'Default notification',
    favorites_global_hint: 'Used as default for all favorites',
    favorites_save_settings: 'Save settings',
    favorites_settings_saved: 'Settings saved',
    favorites_interval_error: 'Favorite interval cannot be more frequent than default',
    community_votes_title: 'Community Info',
    community_votes_login_cta: 'Sign in to add your feedback',
    community_vote_parking: 'Parking',
    community_vote_price_level: 'Price level',
    community_vote_delivery: 'Delivery',
    community_vote_click_collect: 'Click & Collect',
    community_vote_reservation_required: 'Reservation required',
    community_vote_terrace: 'Terrace',
    community_vote_language_label: 'Languages spoken',
    community_vote_n_votes: (n: number) => `${n} vote${n === 1 ? '' : 's'}`,
    community_vote_submit_success: (credits: number) => `Thank you! +${credits} credits`,
    community_vote_error: 'Could not save. Please try again.',
    community_vote_delete_error: 'Could not remove vote. Please try again.',
    community_vote_language_en: 'English',
    community_vote_language_de: 'German',
    community_vote_language_el: 'Greek',
    community_vote_language_ru: 'Russian',
    community_vote_language_ar: 'Arabic',
    community_vote_language_he: 'Hebrew',
    vote_yes_tooltip: 'Yes, I confirm',
    vote_no_tooltip: 'No',
    // Charity Vote Control (F3800 Phase 2)
    charity_vote_question: 'Does this shop support a charitable cause?',
    charity_vote_confirm: 'Confirm',
    charity_vote_confirmed: 'Confirmed',
    charity_vote_count: (n: number) => `${n} confirmation${n === 1 ? '' : 's'}`,
    recently_viewed_heading: 'Recently viewed',
    recently_viewed_tab_products: 'Products',
    recently_viewed_tab_shops: 'Shops',
    recently_viewed_empty: 'Nothing viewed yet.',
    recently_viewed_clear: 'Clear list',
    recently_viewed_clear_confirm: 'Clear the entire list?',
    tab_recently_viewed: 'Recent',
    activity_feed_heading_naidivse: 'Fresh finds',
    activity_feed_empty_soon: 'Activity coming soon...',
    activity_feed_expand: 'Show more',
    activity_feed_collapse: 'Show less',
    activity_event_search_performed: (args: { term?: string; city?: string; _v?: number }) => {
      const t = args.term ?? '...'; const c = args.city
      if (args._v === 1) return c ? `Searched: ${t} in ${c}` : `Searched: ${t}`
      if (args._v === 2) return c ? `Looking for ${t} near ${c}` : `Looking for ${t}`
      return c ? `A fellow expat searched for ${t} in ${c}` : `A fellow expat searched for ${t}`
    },
    activity_event_price_comparison_viewed: (args: { product_name?: string; city?: string; _v?: number }) => {
      const p = args.product_name ?? '...'; const c = args.city
      if (args._v === 1) return `Price check: ${p}`
      if (args._v === 2) return c ? `${p} — prices compared in ${c}` : `${p} — prices compared`
      return c ? `A fellow expat compared prices for ${p} in ${c}` : `A fellow expat compared prices for ${p}`
    },
    activity_event_product_spotted: (args: { product_name?: string; shop_name?: string; city?: string; _v?: number }) => {
      const p = args.product_name ?? '...'; const s = args.shop_name
      if (args._v === 1) return s ? `Found: ${p} at ${s}` : `Spotted: ${p}`
      if (args._v === 2) return s ? `${p} — at ${s}` : `${p} — just spotted`
      return s ? `A fellow expat spotted ${p} at ${s}` : `A fellow expat spotted ${p}`
    },
    activity_event_homesick_activated: (args: { city?: string; _v?: number }) => {
      const c = args.city
      if (args._v === 1) return c ? `Homesick search in ${c}` : 'Homesick search'
      if (args._v === 2) return c ? `Searching for home in ${c}` : 'Searching for home'
      return c ? `A fellow expat activated Homesick mode in ${c}` : 'A fellow expat activated Homesick mode'
    },
    activity_event_category_browsed: (args: { category_name?: string; city?: string; _v?: number }) => {
      const cat = args.category_name ?? '...'; const c = args.city
      if (args._v === 1) return c ? `Trending: ${cat} in ${c}` : `Trending: ${cat}`
      if (args._v === 2) return `Browsing ${cat} nearby`
      return c ? `A fellow expat is browsing ${cat} in ${c}` : `A fellow expat is browsing ${cat}`
    },
    activity_event_shop_language_noted: (args: { shop_name?: string; _v?: number }) => {
      const s = args.shop_name ?? '...'
      if (args._v === 1) return `Language tip: ${s}`
      if (args._v === 2) return `Speaks your language: ${s}`
      return `A fellow expat noted a language at ${s}`
    },
    activity_event_price_alert_set: (args: { product_name?: string; _v?: number }) => {
      const p = args.product_name ?? '...'
      if (args._v === 1) return `Price alert: ${p}`
      if (args._v === 2) return `Watching price of ${p}`
      return `A fellow expat set a price alert for ${p}`
    },
    activity_event_shop_discovered: (args: { shop_name?: string; city?: string; _v?: number }) => {
      const s = args.shop_name ?? '...'; const c = args.city
      if (args._v === 1) return c ? `New: ${s} in ${c}` : `New shop found`
      if (args._v === 2) return `Just discovered: ${s}`
      return c ? `A fellow expat discovered ${s} in ${c}` : `A fellow expat discovered ${s}`
    },
  },
  de: {
    community_section_title: 'Community',
    community_join: 'Beitreten',
    community_members: 'Mitglieder',
    community_name_naidivse: 'Russischsprachige Community',
    favorites_tab: 'Meine Favoriten',
    favorites_add: 'Zu Favoriten hinzufügen',
    favorites_remove: 'Aus Favoriten entfernen',
    favorites_added: 'Zu Favoriten hinzugefügt',
    favorites_removed: 'Aus Favoriten entfernt',
    favorites_login_required: 'Anmelden um Favoriten zu speichern',
    favorites_empty: 'Noch keine Favoriten',
    favorites_empty_hint: 'Klick auf das Herz bei einem Produkt um anzufangen',
    favorites_delete_confirm: 'Favorit entfernen?',
    favorites_delete_yes: 'Entfernen',
    favorites_interval_label: 'Benachrichtigungen',
    favorites_interval_sofort: 'Sofort',
    favorites_interval_täglich: 'Täglich',
    favorites_interval_wöchentlich: 'Wöchentlich',
    favorites_interval_nie: 'Nie',
    favorites_global_label: 'Standard-Benachrichtigung',
    favorites_global_hint: 'Gilt für alle Favoriten als Basis',
    favorites_save_settings: 'Einstellungen speichern',
    favorites_settings_saved: 'Einstellungen gespeichert',
    favorites_interval_error: 'Favorit-Intervall kann nicht häufiger sein als Standard',
    community_votes_title: 'Community-Info',
    community_votes_login_cta: 'Anmelden um Feedback hinzuzufügen',
    community_vote_parking: 'Parkplatz',
    community_vote_price_level: 'Preisniveau',
    community_vote_delivery: 'Lieferung',
    community_vote_click_collect: 'Click & Collect',
    community_vote_reservation_required: 'Reservierung nötig',
    community_vote_terrace: 'Terrasse',
    community_vote_language_label: 'Gesprochene Sprachen',
    community_vote_n_votes: (n: number) => `${n} Bewertung${n === 1 ? '' : 'en'}`,
    community_vote_submit_success: (credits: number) => `Danke! +${credits} Credits`,
    community_vote_error: 'Speichern fehlgeschlagen. Bitte erneut versuchen.',
    community_vote_delete_error: 'Löschen fehlgeschlagen. Bitte erneut versuchen.',
    community_vote_language_en: 'Englisch',
    community_vote_language_de: 'Deutsch',
    community_vote_language_el: 'Griechisch',
    community_vote_language_ru: 'Russisch',
    community_vote_language_ar: 'Arabisch',
    community_vote_language_he: 'Hebräisch',
    vote_yes_tooltip: 'Ja, ich bestätige',
    vote_no_tooltip: 'Nein',
    // Charity Vote Control (F3800 Phase 2)
    charity_vote_question: 'Unterstützt dieser Shop einen guten Zweck?',
    charity_vote_confirm: 'Bestätigen',
    charity_vote_confirmed: 'Bestätigt',
    charity_vote_count: (n: number) => `${n} Bestätigung${n === 1 ? '' : 'en'}`,
    recently_viewed_heading: 'Zuletzt gesehen',
    recently_viewed_tab_products: 'Produkte',
    recently_viewed_tab_shops: 'Shops',
    recently_viewed_empty: 'Noch nichts angesehen.',
    recently_viewed_clear: 'Liste leeren',
    recently_viewed_clear_confirm: 'Gesamte Liste leeren?',
    tab_recently_viewed: 'Verlauf',
    activity_feed_heading_naidivse: 'Frische Funde',
    activity_feed_empty_soon: 'Aktivität folgt bald...',
    activity_feed_expand: 'Mehr anzeigen',
    activity_feed_collapse: 'Weniger anzeigen',
    activity_event_search_performed: (args: { term?: string; city?: string; _v?: number }) => {
      const t = args.term ?? '...'; const c = args.city
      if (args._v === 1) return c ? `Gesucht: ${t} in ${c}` : `Gesucht: ${t}`
      if (args._v === 2) return c ? `Auf der Suche nach ${t} in ${c}` : `Auf der Suche nach ${t}`
      return c ? `Ein Expat sucht ${t} in ${c}` : `Ein Expat sucht ${t}`
    },
    activity_event_price_comparison_viewed: (args: { product_name?: string; city?: string; _v?: number }) => {
      const p = args.product_name ?? '...'; const c = args.city
      if (args._v === 1) return `Preischeck: ${p}`
      if (args._v === 2) return c ? `${p} — Preise verglichen in ${c}` : `${p} — Preise verglichen`
      return c ? `Ein Expat vergleicht Preise für ${p} in ${c}` : `Ein Expat vergleicht Preise für ${p}`
    },
    activity_event_product_spotted: (args: { product_name?: string; shop_name?: string; city?: string; _v?: number }) => {
      const p = args.product_name ?? '...'; const s = args.shop_name
      if (args._v === 1) return s ? `Gefunden: ${p} bei ${s}` : `Gespottet: ${p}`
      if (args._v === 2) return s ? `${p} — entdeckt bei ${s}` : `${p} — gerade gespottet`
      return s ? `Ein Expat hat ${p} bei ${s} gespottet` : `Ein Expat hat ${p} gespottet`
    },
    activity_event_homesick_activated: (args: { city?: string; _v?: number }) => {
      const c = args.city
      if (args._v === 1) return c ? `Heimweh-Suche in ${c}` : 'Heimweh-Suche gestartet'
      if (args._v === 2) return c ? `Sucht Heimisches in ${c}` : 'Sucht Heimisches'
      return c ? `Ein Expat hat Heimweh-Modus in ${c} aktiviert` : 'Ein Expat hat Heimweh-Modus aktiviert'
    },
    activity_event_category_browsed: (args: { category_name?: string; city?: string; _v?: number }) => {
      const cat = args.category_name ?? '...'; const c = args.city
      if (args._v === 1) return c ? `Beliebt: ${cat} in ${c}` : `Beliebt: ${cat}`
      if (args._v === 2) return c ? `${cat} — gefragt in ${c}` : `${cat} — gerade gesucht`
      return c ? `Ein Expat sucht nach ${cat} in ${c}` : `Ein Expat sucht nach ${cat}`
    },
    activity_event_shop_language_noted: (args: { shop_name?: string; _v?: number }) => {
      const s = args.shop_name ?? '...'
      if (args._v === 1) return `Sprach-Tipp: ${s}`
      if (args._v === 2) return `Spricht deine Sprache: ${s}`
      return `Ein Expat hat eine Sprache bei ${s} vermerkt`
    },
    activity_event_price_alert_set: (args: { product_name?: string; _v?: number }) => {
      const p = args.product_name ?? '...'
      if (args._v === 1) return `Preisalarm: ${p}`
      if (args._v === 2) return `Preis im Auge: ${p}`
      return `Ein Expat hat Preisalarm für ${p} gesetzt`
    },
    activity_event_shop_discovered: (args: { shop_name?: string; city?: string; _v?: number }) => {
      const s = args.shop_name ?? '...'; const c = args.city
      if (args._v === 1) return c ? `Neu: ${s} in ${c}` : 'Neuer Shop entdeckt'
      if (args._v === 2) return `Gerade entdeckt: ${s}`
      return c ? `Ein Expat hat ${s} in ${c} entdeckt` : `Ein Expat hat ${s} entdeckt`
    },
  },
  ru: {
    community_section_title: 'Сообщество',
    community_join: 'Вступить',
    community_members: 'участников',
    community_name_naidivse: 'Русская Ларнака',
    favorites_tab: 'Мои избранные',
    favorites_add: 'Добавить в избранное',
    favorites_remove: 'Удалить из избранного',
    favorites_added: 'Добавлено в избранное',
    favorites_removed: 'Удалено из избранного',
    favorites_login_required: 'Войдите чтобы сохранить в избранное',
    favorites_empty: 'Нет избранных товаров',
    favorites_empty_hint: 'Нажмите на сердечко у товара чтобы начать',
    favorites_delete_confirm: 'Удалить из избранного?',
    favorites_delete_yes: 'Удалить',
    favorites_interval_label: 'Уведомления',
    favorites_interval_sofort: 'Немедленно',
    favorites_interval_täglich: 'Ежедневно',
    favorites_interval_wöchentlich: 'Еженедельно',
    favorites_interval_nie: 'Никогда',
    favorites_global_label: 'Уведомления по умолчанию',
    favorites_global_hint: 'Используется как базовая настройка для всех избранных',
    favorites_save_settings: 'Сохранить настройки',
    favorites_settings_saved: 'Настройки сохранены',
    favorites_interval_error: 'Интервал для избранного не может быть чаще чем по умолчанию',
    community_votes_title: 'Инфо от сообщества',
    community_votes_login_cta: 'Войди чтобы добавить отзыв',
    community_vote_parking: 'Парковка',
    community_vote_price_level: 'Уровень цен',
    community_vote_delivery: 'Доставка',
    community_vote_click_collect: 'Самовывоз',
    community_vote_reservation_required: 'Нужна бронь',
    community_vote_terrace: 'Терраса',
    community_vote_language_label: 'Языки',
    community_vote_n_votes: (n: number) => `${n} голос${n === 1 ? '' : n < 5 ? 'а' : 'ов'}`,
    community_vote_submit_success: (credits: number) => `Спасибо! +${credits} кредитов`,
    community_vote_error: 'Не удалось сохранить. Попробуй ещё раз.',
    community_vote_delete_error: 'Не удалось удалить. Попробуй ещё раз.',
    community_vote_language_en: 'Английский',
    community_vote_language_de: 'Немецкий',
    community_vote_language_el: 'Греческий',
    community_vote_language_ru: 'Русский',
    community_vote_language_ar: 'Арабский',
    community_vote_language_he: 'Иврит',
    vote_yes_tooltip: 'Да, подтверждаю',
    vote_no_tooltip: 'Нет',
    // Charity Vote Control (F3800 Phase 2)
    charity_vote_question: 'Поддерживает ли этот магазин благотворительность?',
    charity_vote_confirm: 'Подтвердить',
    charity_vote_confirmed: 'Подтверждено',
    charity_vote_count: (n: number) => `${n} подтверждени${n === 1 ? 'е' : n < 5 ? 'я' : 'й'}`,
    recently_viewed_heading: 'Недавно просмотренные',
    recently_viewed_tab_products: 'Продукты',
    recently_viewed_tab_shops: 'Магазины',
    recently_viewed_empty: 'Вы ещё ничего не просматривали.',
    recently_viewed_clear: 'Очистить список',
    recently_viewed_clear_confirm: 'Очистить весь список?',
    tab_recently_viewed: 'История',
    activity_feed_heading_naidivse: 'Свежие находки',
    activity_feed_empty_soon: 'Активность скоро появится...',
    activity_feed_expand: 'Показать больше',
    activity_feed_collapse: 'Свернуть',
    activity_event_search_performed: (args: { term?: string; city?: string; _v?: number }) => {
      const t = args.term ?? '...'; const c = args.city
      if (args._v === 1) return c ? `Ищут: ${t} в ${c}` : `Ищут: ${t}`
      if (args._v === 2) return c ? `В поиске: ${t} в ${c}` : `В поиске: ${t}`
      return c ? `Кто-то из наших ищет ${t} в ${c}` : `Кто-то из наших ищет ${t}`
    },
    activity_event_price_comparison_viewed: (args: { product_name?: string; city?: string; _v?: number }) => {
      const p = args.product_name ?? '...'; const c = args.city
      if (args._v === 1) return `Проверка цен: ${p}`
      if (args._v === 2) return c ? `${p} — цены сравниваются в ${c}` : `${p} — цены сравниваются`
      return c ? `Кто-то из наших сравнивает цены на ${p} в ${c}` : `Кто-то из наших сравнивает цены на ${p}`
    },
    activity_event_product_spotted: (args: { product_name?: string; shop_name?: string; city?: string; _v?: number }) => {
      const p = args.product_name ?? '...'; const s = args.shop_name
      if (args._v === 1) return s ? `Найдено: ${p} в ${s}` : `Нашли: ${p}`
      if (args._v === 2) return s ? `${p} — есть в ${s}` : `${p} — только что нашли`
      return s ? `Кто-то из наших нашёл ${p} в ${s}` : `Кто-то из наших нашёл ${p}`
    },
    activity_event_homesick_activated: (args: { city?: string; _v?: number }) => {
      const c = args.city
      if (args._v === 1) return c ? `Ностальгия в ${c}` : 'Поиск родного…'
      if (args._v === 2) return c ? `Скучает по родному в ${c}` : 'Скучает по родному'
      return c ? `Кто-то из наших включил «Ностальгию» в ${c}` : 'Кто-то из наших включил «Ностальгию»'
    },
    activity_event_category_browsed: (args: { category_name?: string; city?: string; _v?: number }) => {
      const cat = args.category_name ?? '...'; const c = args.city
      if (args._v === 1) return c ? `В тренде: ${cat} в ${c}` : `Ищут: ${cat}`
      if (args._v === 2) return c ? `${cat} — популярно в ${c}` : `${cat} — сейчас ищут`
      return c ? `Кто-то из наших ищет ${cat} в ${c}` : `Кто-то из наших ищет ${cat}`
    },
    activity_event_shop_language_noted: (args: { shop_name?: string; _v?: number }) => {
      const s = args.shop_name ?? '...'
      if (args._v === 1) return `Подсказка: говорят по-вашему в ${s}`
      if (args._v === 2) return `Говорят по-нашему: ${s}`
      return `Кто-то из наших отметил язык в ${s}`
    },
    activity_event_price_alert_set: (args: { product_name?: string; _v?: number }) => {
      const p = args.product_name ?? '...'
      if (args._v === 1) return `Следят за ценой: ${p}`
      if (args._v === 2) return `Оповещение о цене: ${p}`
      return `Кто-то из наших следит за ценой на ${p}`
    },
    activity_event_shop_discovered: (args: { shop_name?: string; city?: string; _v?: number }) => {
      const s = args.shop_name ?? '...'; const c = args.city
      if (args._v === 1) return c ? `Новый магазин: ${s} в ${c}` : 'Новинка!'
      if (args._v === 2) return `Только что нашли: ${s}`
      return c ? `Кто-то из наших открыл ${s} в ${c}` : `Кто-то из наших открыл ${s}`
    },
  },
  el: {
    community_section_title: 'Κοινότητα',
    community_join: 'Εγγραφή',
    community_members: 'μέλη',
    community_name_naidivse: 'Ρωσόφωνη κοινότητα',
    favorites_tab: 'Τα αγαπημένα μου',
    favorites_add: 'Προσθήκη στα αγαπημένα',
    favorites_remove: 'Αφαίρεση από αγαπημένα',
    favorites_added: 'Προστέθηκε στα αγαπημένα',
    favorites_removed: 'Αφαιρέθηκε από τα αγαπημένα',
    favorites_login_required: 'Συνδεθείτε για να αποθηκεύσετε αγαπημένα',
    favorites_empty: 'Δεν υπάρχουν αγαπημένα ακόμα',
    favorites_empty_hint: 'Πατήστε την καρδιά σε ένα προϊόν για να ξεκινήσετε',
    favorites_delete_confirm: 'Αφαίρεση αγαπημένου;',
    favorites_delete_yes: 'Αφαίρεση',
    favorites_interval_label: 'Ειδοποιήσεις',
    favorites_interval_sofort: 'Άμεσα',
    favorites_interval_täglich: 'Καθημερινά',
    favorites_interval_wöchentlich: 'Εβδομαδιαία',
    favorites_interval_nie: 'Ποτέ',
    favorites_global_label: 'Προεπιλεγμένη ειδοποίηση',
    favorites_global_hint: 'Χρησιμοποιείται ως βάση για όλα τα αγαπημένα',
    favorites_save_settings: 'Αποθήκευση ρυθμίσεων',
    favorites_settings_saved: 'Οι ρυθμίσεις αποθηκεύτηκαν',
    favorites_interval_error: 'Το διάστημα αγαπημένου δεν μπορεί να είναι συχνότερο από το προεπιλεγμένο',
    community_votes_title: 'Πληροφορίες κοινότητας',
    community_votes_login_cta: 'Συνδεθείτε για να προσθέσετε αξιολόγηση',
    community_vote_parking: 'Πάρκινγκ',
    community_vote_price_level: 'Επίπεδο τιμών',
    community_vote_delivery: 'Παράδοση',
    community_vote_click_collect: 'Click & Collect',
    community_vote_reservation_required: 'Απαιτείται κράτηση',
    community_vote_terrace: 'Βεράντα',
    community_vote_language_label: 'Γλώσσες',
    community_vote_n_votes: (n: number) => `${n} αξιολόγηση${n === 1 ? '' : 'εις'}`,
    community_vote_submit_success: (credits: number) => `Ευχαριστούμε! +${credits} πόντοι`,
    community_vote_error: 'Αποτυχία αποθήκευσης. Προσπαθήστε ξανά.',
    community_vote_delete_error: 'Αποτυχία διαγραφής. Προσπαθήστε ξανά.',
    community_vote_language_en: 'Αγγλικά',
    community_vote_language_de: 'Γερμανικά',
    community_vote_language_el: 'Ελληνικά',
    community_vote_language_ru: 'Ρωσικά',
    community_vote_language_ar: 'Αραβικά',
    community_vote_language_he: 'Εβραϊκά',
    vote_yes_tooltip: 'Ναι, επιβεβαιώνω',
    vote_no_tooltip: 'Όχι',
    // Charity Vote Control (F3800 Phase 2)
    charity_vote_question: 'Υποστηρίζει αυτό το κατάστημα φιλανθρωπικό σκοπό;',
    charity_vote_confirm: 'Επιβεβαίωση',
    charity_vote_confirmed: 'Επιβεβαιωμένο',
    charity_vote_count: (n: number) => `${n} επιβεβαίωση${n === 1 ? '' : 'εις'}`,
    recently_viewed_heading: 'Προβλήθηκαν πρόσφατα',
    recently_viewed_tab_products: 'Προϊόντα',
    recently_viewed_tab_shops: 'Καταστήματα',
    recently_viewed_empty: 'Δεν έχετε δει τίποτα ακόμα.',
    recently_viewed_clear: 'Εκκαθάριση λίστας',
    recently_viewed_clear_confirm: 'Εκκαθάριση ολόκληρης της λίστας;',
    tab_recently_viewed: 'Πρόσφατα',
    activity_feed_heading_naidivse: 'Φρέσκες ανακαλύψεις',
    activity_feed_empty_soon: 'Δραστηριότητα σύντομα...',
    activity_feed_expand: 'Περισσότερα',
    activity_feed_collapse: 'Λιγότερα',
    activity_event_search_performed: (args: { term?: string; city?: string; _v?: number }) => {
      const t = args.term ?? '...'; const c = args.city
      if (args._v === 1) return c ? `Αναζήτηση: ${t} στη ${c}` : `Αναζητείται: ${t}`
      if (args._v === 2) return c ? `Σε αναζήτηση: ${t} κοντά στη ${c}` : `Σε αναζήτηση: ${t}`
      return c ? `Ένας expat ψάχνει ${t} στη ${c}` : `Ένας expat ψάχνει ${t}`
    },
    activity_event_price_comparison_viewed: (args: { product_name?: string; city?: string; _v?: number }) => {
      const p = args.product_name ?? '...'; const c = args.city
      if (args._v === 1) return `Σύγκριση τιμών: ${p}`
      if (args._v === 2) return c ? `${p} — τιμές συγκρίνονται στη ${c}` : `${p} — τιμές συγκρίνονται`
      return c ? `Ένας expat συγκρίνει τιμές για ${p} στη ${c}` : `Ένας expat συγκρίνει τιμές για ${p}`
    },
    activity_event_product_spotted: (args: { product_name?: string; shop_name?: string; city?: string; _v?: number }) => {
      const p = args.product_name ?? '...'; const s = args.shop_name
      if (args._v === 1) return s ? `Βρέθηκε: ${p} στο ${s}` : `Εντοπίστηκε: ${p}`
      if (args._v === 2) return s ? `${p} — υπάρχει στο ${s}` : `${p} — μόλις εντοπίστηκε`
      return s ? `Ένας expat εντόπισε ${p} στο ${s}` : `Ένας expat εντόπισε ${p}`
    },
    activity_event_homesick_activated: (args: { city?: string; _v?: number }) => {
      const c = args.city
      if (args._v === 1) return c ? `Νοσταλγία στη ${c}` : 'Αναζήτηση πατρίδας…'
      if (args._v === 2) return c ? `Ψάχνει το σπίτι στη ${c}` : 'Ψάχνει το σπίτι'
      return c ? `Ένας expat ενεργοποίησε τη Νοσταλγία στη ${c}` : 'Ένας expat ενεργοποίησε τη Νοσταλγία'
    },
    activity_event_category_browsed: (args: { category_name?: string; city?: string; _v?: number }) => {
      const cat = args.category_name ?? '...'; const c = args.city
      if (args._v === 1) return c ? `Τάση: ${cat} στη ${c}` : `Περιήγηση: ${cat}`
      if (args._v === 2) return c ? `${cat} — δημοφιλές στη ${c}` : `${cat} — δημοφιλές`
      return c ? `Ένας expat αναζητά ${cat} στη ${c}` : `Ένας expat αναζητά ${cat}`
    },
    activity_event_shop_language_noted: (args: { shop_name?: string; _v?: number }) => {
      const s = args.shop_name ?? '...'
      if (args._v === 1) return `Tip γλώσσας: ${s}`
      if (args._v === 2) return `Μιλούν τη γλώσσα σου: ${s}`
      return `Ένας expat σημείωσε γλώσσα στο ${s}`
    },
    activity_event_price_alert_set: (args: { product_name?: string; _v?: number }) => {
      const p = args.product_name ?? '...'
      if (args._v === 1) return `Ειδοποίηση τιμής: ${p}`
      if (args._v === 2) return `Παρακολουθεί τιμή: ${p}`
      return `Ένας expat έθεσε ειδοποίηση τιμής για ${p}`
    },
    activity_event_shop_discovered: (args: { shop_name?: string; city?: string; _v?: number }) => {
      const s = args.shop_name ?? '...'; const c = args.city
      if (args._v === 1) return c ? `Νέο: ${s} στη ${c}` : 'Νέα ανακάλυψη!'
      if (args._v === 2) return `Μόλις βρέθηκε: ${s}`
      return c ? `Ένας expat ανακάλυψε ${s} στη ${c}` : `Ένας expat ανακάλυψε ${s}`
    },
  },
  ar: {
    community_section_title: 'مجتمع',
    community_join: 'انضم',
    community_members: 'عضو',
    community_name_naidivse: 'مجتمع الناطقين بالروسية',
    favorites_tab: 'المفضلة',
    favorites_add: 'إضافة إلى المفضلة',
    favorites_remove: 'إزالة من المفضلة',
    favorites_added: 'تمت الإضافة إلى المفضلة',
    favorites_removed: 'تمت الإزالة من المفضلة',
    favorites_login_required: 'سجّل دخولك لحفظ المفضلة',
    favorites_empty: 'لا توجد مفضلات بعد',
    favorites_empty_hint: 'اضغط على القلب في أي منتج للبدء',
    favorites_delete_confirm: 'هل تريد إزالة المفضلة؟',
    favorites_delete_yes: 'إزالة',
    favorites_interval_label: 'الإشعارات',
    favorites_interval_sofort: 'فورًا',
    favorites_interval_täglich: 'يوميًا',
    favorites_interval_wöchentlich: 'أسبوعيًا',
    favorites_interval_nie: 'أبدًا',
    favorites_global_label: 'الإشعار الافتراضي',
    favorites_global_hint: 'يُستخدم كأساس لجميع المفضلات',
    favorites_save_settings: 'حفظ الإعدادات',
    favorites_settings_saved: 'تم حفظ الإعدادات',
    favorites_interval_error: 'لا يمكن أن يكون تكرار المفضلة أكثر من الافتراضي',
    community_votes_title: 'معلومات المجتمع',
    community_votes_login_cta: 'سجّل دخولك لإضافة تقييمك',
    community_vote_parking: 'موقف سيارات',
    community_vote_price_level: 'مستوى الأسعار',
    community_vote_delivery: 'توصيل',
    community_vote_click_collect: 'اطلب واستلم',
    community_vote_reservation_required: 'حجز مطلوب',
    community_vote_terrace: 'تراس',
    community_vote_language_label: 'اللغات المتاحة',
    community_vote_n_votes: (n: number) => `${n} تقييم`,
    community_vote_submit_success: (credits: number) => `شكراً! +${credits} نقطة`,
    community_vote_error: 'فشل الحفظ. يرجى المحاولة مرة أخرى.',
    community_vote_delete_error: 'فشل الحذف. يرجى المحاولة مرة أخرى.',
    community_vote_language_en: 'الإنجليزية',
    community_vote_language_de: 'الألمانية',
    community_vote_language_el: 'اليونانية',
    community_vote_language_ru: 'الروسية',
    community_vote_language_ar: 'العربية',
    community_vote_language_he: 'العبرية',
    vote_yes_tooltip: 'نعم، أؤكد',
    vote_no_tooltip: 'لا',
    // Charity Vote Control (F3800 Phase 2)
    charity_vote_question: 'هل يدعم هذا المتجر قضية خيرية؟',
    charity_vote_confirm: 'تأكيد',
    charity_vote_confirmed: 'تم التأكيد',
    charity_vote_count: (n: number) => `${n} تأكيد`,
    recently_viewed_heading: 'شوهد مؤخراً',
    recently_viewed_tab_products: 'المنتجات',
    recently_viewed_tab_shops: 'المتاجر',
    recently_viewed_empty: 'لم تشاهد أي شيء بعد.',
    recently_viewed_clear: 'مسح القائمة',
    recently_viewed_clear_confirm: 'مسح القائمة بالكامل؟',
    tab_recently_viewed: 'سجل',
    activity_feed_heading_naidivse: 'اكتشافات جديدة',
    activity_feed_empty_soon: 'النشاط قادم قريباً...',
    activity_feed_expand: 'عرض المزيد',
    activity_feed_collapse: 'عرض أقل',
    activity_event_search_performed: (args: { term?: string; city?: string; _v?: number }) => {
      const t = args.term ?? '...'; const c = args.city
      if (args._v === 1) return c ? `بحث: ${t} في ${c}` : `بحث: ${t}`
      if (args._v === 2) return c ? `${t} — مطلوب في ${c}` : `${t} — مطلوب`
      return c ? `أحد المغتربين يبحث عن ${t} في ${c}` : `أحد المغتربين يبحث عن ${t}`
    },
    activity_event_price_comparison_viewed: (args: { product_name?: string; city?: string; _v?: number }) => {
      const p = args.product_name ?? '...'; const c = args.city
      if (args._v === 1) return c ? `مقارنة أسعار: ${p} في ${c}` : `مقارنة أسعار: ${p}`
      if (args._v === 2) return c ? `${p} — مقارنة في ${c}` : `${p} — تمت مقارنة الأسعار`
      return c ? `أحد المغتربين يقارن أسعار ${p} في ${c}` : `أحد المغتربين يقارن أسعار ${p}`
    },
    activity_event_product_spotted: (args: { product_name?: string; shop_name?: string; city?: string; _v?: number }) => {
      const p = args.product_name ?? '...'; const s = args.shop_name
      if (args._v === 1) return s ? `وُجد: ${p} ← ${s}` : `وُجد: ${p}`
      if (args._v === 2) return s ? `${p} متاح في ${s}` : `${p} — تم رصده`
      return s ? `أحد المغتربين وجد ${p} في ${s}` : `أحد المغتربين وجد ${p}`
    },
    activity_event_homesick_activated: (args: { city?: string; _v?: number }) => {
      const c = args.city
      if (args._v === 1) return c ? `حنين للوطن في ${c}` : 'وضع الحنين مُفعَّل'
      if (args._v === 2) return c ? `يبحث عن طعم البيت في ${c}` : 'يبحث عن طعم البيت'
      return c ? `أحد المغتربين فعّل وضع الحنين في ${c}` : 'أحد المغتربين فعّل وضع الحنين'
    },
    activity_event_category_browsed: (args: { category_name?: string; city?: string; _v?: number }) => {
      const cat = args.category_name ?? '...'; const c = args.city
      if (args._v === 1) return c ? `يتصفح: ${cat} في ${c}` : `يتصفح: ${cat}`
      if (args._v === 2) return c ? `${cat} — في ${c}` : `${cat} — جارٍ التصفح`
      return c ? `أحد المغتربين يتصفح ${cat} في ${c}` : `أحد المغتربين يتصفح ${cat}`
    },
    activity_event_shop_language_noted: (args: { shop_name?: string; language_code?: string; _v?: number }) => {
      const s = args.shop_name ?? '...'
      if (args._v === 1) return `لغة مسجّلة: ${s}`
      if (args._v === 2) return `${s} — يتحدثون لغتك`
      return `أحد المغتربين سجّل لغة في ${s}`
    },
    activity_event_price_alert_set: (args: { product_name?: string; _v?: number }) => {
      const p = args.product_name ?? '...'
      if (args._v === 1) return `تنبيه سعر: ${p}`
      if (args._v === 2) return `${p} — جارٍ مراقبة السعر`
      return `أحد المغتربين ضبط تنبيه سعر لـ ${p}`
    },
    activity_event_shop_discovered: (args: { shop_name?: string; city?: string; _v?: number }) => {
      const s = args.shop_name ?? '...'; const c = args.city
      if (args._v === 1) return c ? `اكتشاف: ${s} في ${c}` : `اكتشاف: ${s}`
      if (args._v === 2) return c ? `${s} — وجهة جديدة في ${c}` : `${s} — وجهة جديدة`
      return c ? `أحد المغتربين اكتشف ${s} في ${c}` : `أحد المغتربين اكتشف ${s}`
    },
  },
  he: {
    community_section_title: 'קהילה',
    community_join: 'הצטרף',
    community_members: 'חברים',
    community_name_naidivse: 'קהילה דוברת רוסית',
    favorites_tab: 'המועדפים שלי',
    favorites_add: 'הוסף למועדפים',
    favorites_remove: 'הסר מהמועדפים',
    favorites_added: 'נוסף למועדפים',
    favorites_removed: 'הוסר מהמועדפים',
    favorites_login_required: 'התחבר כדי לשמור מועדפים',
    favorites_empty: 'אין מועדפים עדיין',
    favorites_empty_hint: 'לחץ על הלב ליד מוצר כדי להתחיל',
    favorites_delete_confirm: 'להסיר מועדף?',
    favorites_delete_yes: 'הסר',
    favorites_interval_label: 'התראות',
    favorites_interval_sofort: 'מיידי',
    favorites_interval_täglich: 'יומי',
    favorites_interval_wöchentlich: 'שבועי',
    favorites_interval_nie: 'אף פעם',
    favorites_global_label: 'התראה ברירת מחדל',
    favorites_global_hint: 'משמש כבסיס לכל המועדפים',
    favorites_save_settings: 'שמור הגדרות',
    favorites_settings_saved: 'ההגדרות נשמרו',
    favorites_interval_error: 'תדירות המועדף לא יכולה להיות גבוהה מברירת המחדל',
    community_votes_title: 'מידע מהקהילה',
    community_votes_login_cta: 'התחבר להוספת משוב',
    community_vote_parking: 'חנייה',
    community_vote_price_level: 'רמת מחירים',
    community_vote_delivery: 'משלוח',
    community_vote_click_collect: 'הזמן ואסוף',
    community_vote_reservation_required: 'נדרשת הזמנה',
    community_vote_terrace: 'מרפסת',
    community_vote_language_label: 'שפות מדוברות',
    community_vote_n_votes: (n: number) => `${n} הצבעה${n === 1 ? '' : 'ות'}`,
    community_vote_submit_success: (credits: number) => `תודה! +${credits} נקודות`,
    community_vote_error: 'שמירה נכשלה. נסה שוב.',
    community_vote_delete_error: 'מחיקה נכשלה. נסה שוב.',
    community_vote_language_en: 'אנגלית',
    community_vote_language_de: 'גרמנית',
    community_vote_language_el: 'יוונית',
    community_vote_language_ru: 'רוסית',
    community_vote_language_ar: 'ערבית',
    community_vote_language_he: 'עברית',
    vote_yes_tooltip: 'כן, אני מאשר',
    vote_no_tooltip: 'לא',
    // Charity Vote Control (F3800 Phase 2)
    charity_vote_question: 'האם חנות זו תומכת במטרה צדקותית?',
    charity_vote_confirm: 'אשר',
    charity_vote_confirmed: 'אושר',
    charity_vote_count: (n: number) => `${n} אישור${n === 1 ? '' : 'ים'}`,
    recently_viewed_heading: 'נצפה לאחרונה',
    recently_viewed_tab_products: 'מוצרים',
    recently_viewed_tab_shops: 'חנויות',
    recently_viewed_empty: 'עדיין לא צפית בשום דבר.',
    recently_viewed_clear: 'נקה רשימה',
    recently_viewed_clear_confirm: 'לנקות את כל הרשימה?',
    tab_recently_viewed: 'היסטוריה',
    activity_feed_heading_naidivse: 'ממצאים טריים',
    activity_feed_empty_soon: 'פעילות בקרוב...',
    activity_feed_expand: 'הצג עוד',
    activity_feed_collapse: 'הצג פחות',
    activity_event_search_performed: (args: { term?: string; city?: string; _v?: number }) => {
      const t = args.term ?? '...'; const c = args.city
      if (args._v === 1) return c ? `חיפש: ${t} ב${c}` : `חיפש: ${t}`
      if (args._v === 2) return c ? `${t} — מחפשים ב${c}` : `${t} — בחיפוש`
      return c ? `גולה כמוך מחפש ${t} ב${c}` : `גולה כמוך מחפש ${t}`
    },
    activity_event_price_comparison_viewed: (args: { product_name?: string; city?: string; _v?: number }) => {
      const p = args.product_name ?? '...'; const c = args.city
      if (args._v === 1) return c ? `השוואת מחירים: ${p} ב${c}` : `השוואת מחירים: ${p}`
      if (args._v === 2) return c ? `${p} — השוואה ב${c}` : `${p} — מחירים בבדיקה`
      return c ? `גולה כמוך משווה מחירים של ${p} ב${c}` : `גולה כמוך משווה מחירים של ${p}`
    },
    activity_event_product_spotted: (args: { product_name?: string; shop_name?: string; city?: string; _v?: number }) => {
      const p = args.product_name ?? '...'; const s = args.shop_name
      if (args._v === 1) return s ? `נמצא: ${p} ← ${s}` : `נמצא: ${p}`
      if (args._v === 2) return s ? `${p} זמין ב${s}` : `${p} — זוהה`
      return s ? `גולה כמוך מצא ${p} ב${s}` : `גולה כמוך מצא ${p}`
    },
    activity_event_homesick_activated: (args: { city?: string; _v?: number }) => {
      const c = args.city
      if (args._v === 1) return c ? `געגועים ב${c}` : 'מצב געגועים פעיל'
      if (args._v === 2) return c ? `מחפש טעם של בית ב${c}` : 'מחפש טעם של בית'
      return c ? `גולה כמוך הפעיל מצב געגועים ב${c}` : 'גולה כמוך הפעיל מצב געגועים'
    },
    activity_event_category_browsed: (args: { category_name?: string; city?: string; _v?: number }) => {
      const cat = args.category_name ?? '...'; const c = args.city
      if (args._v === 1) return c ? `מחפש: ${cat} ב${c}` : `מחפש: ${cat}`
      if (args._v === 2) return c ? `${cat} — ב${c}` : `${cat} — בגלישה`
      return c ? `גולה כמוך מחפש ${cat} ב${c}` : `גולה כמוך מחפש ${cat}`
    },
    activity_event_shop_language_noted: (args: { shop_name?: string; language_code?: string; _v?: number }) => {
      const s = args.shop_name ?? '...'
      if (args._v === 1) return `שפה נרשמה: ${s}`
      if (args._v === 2) return `${s} — מדברים את שפתך`
      return `גולה כמוך ציין שפה ב${s}`
    },
    activity_event_price_alert_set: (args: { product_name?: string; _v?: number }) => {
      const p = args.product_name ?? '...'
      if (args._v === 1) return `התראת מחיר: ${p}`
      if (args._v === 2) return `${p} — מחיר במעקב`
      return `גולה כמוך הגדיר התראת מחיר עבור ${p}`
    },
    activity_event_shop_discovered: (args: { shop_name?: string; city?: string; _v?: number }) => {
      const s = args.shop_name ?? '...'; const c = args.city
      if (args._v === 1) return c ? `התגלה: ${s} ב${c}` : `התגלה: ${s}`
      if (args._v === 2) return c ? `${s} — יעד חדש ב${c}` : `${s} — יעד חדש`
      return c ? `גולה כמוך גילה את ${s} ב${c}` : `גולה כמוך גילה את ${s}`
    },
  },
} as const

export type CommunityTranslations = typeof communityTranslations.en
export function tCommunity(lang: string): CommunityTranslations {
  return (communityTranslations[lang as keyof typeof communityTranslations] ?? communityTranslations.en) as unknown as CommunityTranslations
}
export { communityTranslations }
