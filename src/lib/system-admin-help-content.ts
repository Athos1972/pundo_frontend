// F8960 — SOP texts for the admin help (en + el). Server-side only (see tests/unit/guards).
// UI terms are taken verbatim from system-admin-translations.ts so the SOP matches the screen.
// EL texts are a draft ("EL ungeprueft") until a native speaker has reviewed them.
import type { HelpTopicId } from '@/lib/system-admin-help'

export type HelpLang = 'en' | 'el'

export interface HelpNote {
  kind: 'warning' | 'tip'
  text: string
}

export interface HelpTopicContent {
  title: string
  /** One-liner shown on the card. */
  summary: string
  intro?: string
  steps: readonly string[]
  notes?: readonly HelpNote[]
}

export const helpLang = (lang: string): HelpLang => (lang === 'el' ? 'el' : 'en')

export const HELP_CONTENT: Record<HelpTopicId, Record<HelpLang, HelpTopicContent>> = {
  'admin-tour': {
    en: {
      title: 'Admin tour',
      summary: 'Where to find what: sign-in, navigation and the dashboard.',
      intro: 'A short walk through the admin area so you know where each task lives.',
      steps: [
        'Sign in at /admin/login with your admin account. Use "Sign out" in the sidebar when you are done.',
        'Open "Dashboard": it shows the main counters and the tile for open shop claims.',
        'Use the sidebar to switch areas: Shops, Shop Types, Shop Owners, Claims, Products, Categories, Brands, CRM and more.',
        'Look at the address bar before you change anything: the test instance runs on port 3500, the live system does not. Practise on the test instance.',
        'Open "Help" in the sidebar whenever you need a step-by-step guide for a task.',
      ],
      notes: [
        { kind: 'tip', text: 'The sidebar entry of the current area is highlighted, so you always see where you are.' },
      ],
    },
    el: {
      title: 'Ξενάγηση στο admin',
      summary: 'Πού βρίσκεται το καθετί: σύνδεση, πλοήγηση και πίνακας ελέγχου.',
      intro: 'Μια σύντομη ξενάγηση στο admin, ώστε να ξέρετε πού βρίσκεται κάθε εργασία.',
      steps: [
        'Συνδεθείτε στο /admin/login με τον λογαριασμό διαχειριστή σας. Όταν τελειώσετε, πατήστε «Αποσύνδεση» στην πλευρική στήλη.',
        'Ανοίξτε τον «Πίνακα ελέγχου»: δείχνει τους βασικούς μετρητές και το πλακίδιο για τις ανοιχτές αιτήσεις ιδιοκτησίας.',
        'Χρησιμοποιήστε την πλευρική στήλη για να αλλάξετε ενότητα: Καταστήματα, Τύποι καταστημάτων, Ιδιοκτήτες καταστημάτων, Αιτήσεις ιδιοκτησίας, Προϊόντα, Κατηγορίες, Μάρκες, CRM κ.ά.',
        'Κοιτάξτε τη γραμμή διεύθυνσης πριν αλλάξετε οτιδήποτε: η δοκιμαστική εγκατάσταση τρέχει στη θύρα 3500, το πραγματικό σύστημα όχι. Εξασκηθείτε στη δοκιμαστική.',
        'Ανοίξτε τη «Βοήθεια» στην πλευρική στήλη όποτε χρειάζεστε οδηγό βήμα προς βήμα για μια εργασία.',
      ],
      notes: [
        { kind: 'tip', text: 'Η καταχώριση της τρέχουσας ενότητας τονίζεται στην πλευρική στήλη, ώστε να βλέπετε πάντα πού βρίσκεστε.' },
      ],
    },
  },

  'claims-owners': {
    en: {
      title: 'Claims and shop owners',
      summary: 'Check applications for a shop, accept or reject them and manage owners.',
      intro: 'A shop claim is an application of someone who says a shop belongs to them. Nobody gets control of a shop before you have checked the proof.',
      steps: [
        'Open "Claims" and stay on the tab "Applications". Filter by status to see the open ones.',
        'Open an application and compare the proof (e.g. e-mail domain, website, phone) with the shop. Use the tab "Matching checks" for the automatic hints.',
        'If the proof is convincing, click "Mark as verified" first; this documents that a person has checked it.',
        'Click "Accept" to make the applicant the owner of the shop. If the shop already has an owner, use "Accept and change owner" only after you are sure.',
        'If the proof is missing or the person cannot be reached, click "Reject" and pick a reason class (Insufficient proof, Not reachable, Other).',
        'Open "Shop Owners" to look at accounts, approve or suspend them and see which shops they manage.',
      ],
      notes: [
        { kind: 'warning', text: 'Use "Manage shop operations" (acting as the owner) for support purposes only, for example when the owner asks you to help. Never change an owner\'s data without a reason.' },
        { kind: 'tip', text: 'Write down why you rejected an application; the owner may ask.' },
      ],
    },
    el: {
      title: 'Αιτήσεις ιδιοκτησίας και ιδιοκτήτες',
      summary: 'Ελέγξτε αιτήσεις για ένα κατάστημα, εγκρίνετέ τες ή απορρίψτε τες και διαχειριστείτε ιδιοκτήτες.',
      intro: 'Μια αίτηση ιδιοκτησίας είναι αίτημα κάποιου που δηλώνει ότι ένα κατάστημα του ανήκει. Κανείς δεν αποκτά έλεγχο ενός καταστήματος πριν ελέγξετε τα αποδεικτικά.',
      steps: [
        'Ανοίξτε τις «Αιτήσεις ιδιοκτησίας» και μείνετε στην καρτέλα «Αιτήσεις». Φιλτράρετε ανά κατάσταση για να δείτε τις ανοιχτές.',
        'Ανοίξτε μια αίτηση και συγκρίνετε τα αποδεικτικά (π.χ. τομέας email, ιστότοπος, τηλέφωνο) με το κατάστημα. Η καρτέλα «Έλεγχοι αντιστοίχισης» δίνει αυτόματες ενδείξεις.',
        'Αν τα αποδεικτικά πείθουν, πατήστε πρώτα «Σήμανση ως ελεγμένη»· έτσι καταγράφεται ότι κάποιος την έλεγξε.',
        'Πατήστε «Έγκριση» για να γίνει ο αιτών ιδιοκτήτης του καταστήματος. Αν το κατάστημα έχει ήδη ιδιοκτήτη, χρησιμοποιήστε το «Έγκριση και αλλαγή ιδιοκτήτη» μόνο όταν είστε βέβαιοι.',
        'Αν λείπουν αποδεικτικά ή δεν μπορείτε να επικοινωνήσετε με το άτομο, πατήστε «Απόρριψη» και επιλέξτε κατηγορία λόγου (Ανεπαρκής απόδειξη, Δεν επικοινωνήσαμε, Άλλο).',
        'Ανοίξτε τους «Ιδιοκτήτες καταστημάτων» για να δείτε τους λογαριασμούς, να τους εγκρίνετε ή να τους αναστείλετε και να δείτε ποια καταστήματα διαχειρίζονται.',
      ],
      notes: [
        { kind: 'warning', text: 'Χρησιμοποιήστε τη «Διαχείριση λειτουργιών καταστήματος» (ενεργώντας ως ιδιοκτήτης) μόνο για λόγους υποστήριξης, π.χ. όταν ο ιδιοκτήτης ζητά βοήθεια. Μην αλλάζετε στοιχεία ιδιοκτήτη χωρίς λόγο.' },
        { kind: 'tip', text: 'Σημειώστε γιατί απορρίψατε μια αίτηση· ο ιδιοκτήτης μπορεί να ρωτήσει.' },
      ],
    },
  },

  shops: {
    en: {
      title: 'Maintaining shops',
      summary: 'Create and edit shops, set the shop type, location and opening hours.',
      intro: 'Shops are what customers see on the map and in search results. Keep the data correct and complete.',
      steps: [
        'Open "Shops" and search for the shop first, so you do not create a duplicate.',
        'To add a shop, create a new one and fill in the name, the address and the shop type.',
        'Set the location by moving the pin on the map; check that it matches the address.',
        'Fill in the opening hours for each day. Mark days as closed instead of leaving them empty.',
        'Save and open the public page of the shop to check that it looks right.',
        'Open "Shop Types" only to maintain the list of types itself (names in the supported languages).',
      ],
      notes: [
        { kind: 'warning', text: '"Delete shop…" removes the shop permanently, together with its offers, exclusive products and reviews, and also deletes the owner account. This cannot be undone. Check the preview counts and type the shop name only when you are sure.' },
        { kind: 'tip', text: 'If a shop is only wrong or outdated, edit it. Deleting is almost never the right answer.' },
      ],
    },
    el: {
      title: 'Συντήρηση καταστημάτων',
      summary: 'Δημιουργία και επεξεργασία καταστημάτων, ορισμός τύπου, τοποθεσίας και ωραρίου.',
      intro: 'Τα καταστήματα είναι αυτά που βλέπουν οι πελάτες στον χάρτη και στα αποτελέσματα αναζήτησης. Κρατήστε τα στοιχεία σωστά και πλήρη.',
      steps: [
        'Ανοίξτε τα «Καταστήματα» και αναζητήστε πρώτα το κατάστημα, ώστε να μη δημιουργήσετε διπλότυπο.',
        'Για να προσθέσετε κατάστημα, δημιουργήστε νέο και συμπληρώστε το όνομα, τη διεύθυνση και τον τύπο καταστήματος.',
        'Ορίστε την τοποθεσία μετακινώντας την καρφίτσα στον χάρτη· ελέγξτε ότι ταιριάζει με τη διεύθυνση.',
        'Συμπληρώστε το ωράριο για κάθε ημέρα. Σημειώστε τις ημέρες ως κλειστές αντί να τις αφήνετε κενές.',
        'Αποθηκεύστε και ανοίξτε τη δημόσια σελίδα του καταστήματος για να ελέγξετε ότι φαίνεται σωστά.',
        'Ανοίξτε τους «Τύπους καταστημάτων» μόνο για να συντηρήσετε τη λίστα των τύπων (ονόματα στις υποστηριζόμενες γλώσσες).',
      ],
      notes: [
        { kind: 'warning', text: 'Η «Διαγραφή καταστήματος…» αφαιρεί το κατάστημα οριστικά, μαζί με τις προσφορές, τα αποκλειστικά προϊόντα και τις κριτικές του, και διαγράφει επίσης τον λογαριασμό του ιδιοκτήτη. Δεν αναιρείται. Ελέγξτε τους αριθμούς της προεπισκόπησης και πληκτρολογήστε το όνομα μόνο όταν είστε βέβαιοι.' },
        { kind: 'tip', text: 'Αν ένα κατάστημα είναι απλώς λάθος ή παλιό, επεξεργαστείτε το. Η διαγραφή σχεδόν ποτέ δεν είναι η σωστή λύση.' },
      ],
    },
  },

  'catalog-basics': {
    en: {
      title: 'Categories and brands',
      summary: 'Rename categories per language and create or edit brands without duplicates.',
      intro: 'Every product needs a category and a brand, so maintain these two first. Categories are rarely created from scratch, most of the time you rename one. Brands are created when a brand is really missing.',
      steps: [
        'Open "Categories". Categories form a tree: every category sits below a broader one. Search for part of the name instead of walking through all branches.',
        'Open the category with "Edit". It has one name per language. Type the new name into the row of that language and save. The name is stored directly, and no automatic job overwrites it.',
        'Open "Brands" and search by name first. Try a part of the name and other spellings, because the brand may already exist.',
        'Only if the brand is really missing, create a new one with "Add new". Enter the name. The slug (the short web-address name of the brand) is filled in from the name and you can still change it before you save. Check it, because the form does not offer it again on an existing brand.',
        'To change an existing brand, open it with "Edit". Changes apply to every product of this brand.',
        'Products come next: they use the category and the brand. See topic 4.',
      ],
      notes: [
        { kind: 'warning', text: 'Never create a second brand for a name that already exists. Duplicate brands split the products of one brand. If you find duplicates, tell the team lead and do not delete on your own.' },
        { kind: 'warning', text: 'Renaming categories by hand is safe in daily work. Only a deliberately re-run taxonomy seed (seed_taxonomy.py) with the overwrite option would reset the names of seeded categories. Whether production already has this safer behavior is still being checked, so never run a seed without asking.' },
      ],
    },
    el: {
      title: 'Κατηγορίες και μάρκες',
      summary: 'Μετονομάστε κατηγορίες ανά γλώσσα και δημιουργήστε ή επεξεργαστείτε μάρκες χωρίς διπλότυπα.',
      intro: 'Κάθε προϊόν χρειάζεται κατηγορία και μάρκα, γι\' αυτό συντηρήστε πρώτα αυτά τα δύο. Οι κατηγορίες σπάνια δημιουργούνται από την αρχή, τις περισσότερες φορές μετονομάζετε μία. Οι μάρκες δημιουργούνται όταν μια μάρκα λείπει πραγματικά.',
      steps: [
        'Ανοίξτε τις «Κατηγορίες». Οι κατηγορίες σχηματίζουν δέντρο: κάθε κατηγορία βρίσκεται κάτω από μια ευρύτερη. Αναζητήστε μέρος του ονόματος αντί να διατρέχετε όλους τους κλάδους.',
        'Ανοίξτε την κατηγορία με «Επεξεργασία». Έχει ένα όνομα ανά γλώσσα. Πληκτρολογήστε το νέο όνομα στη γραμμή της γλώσσας και αποθηκεύστε. Το όνομα αποθηκεύεται απευθείας και καμία αυτόματη εργασία δεν το αντικαθιστά.',
        'Ανοίξτε τις «Μάρκες» και αναζητήστε πρώτα με το όνομα. Δοκιμάστε μέρος του ονόματος και άλλες γραφές, γιατί η μάρκα μπορεί να υπάρχει ήδη.',
        'Μόνο αν η μάρκα λείπει πραγματικά, δημιουργήστε νέα με «Προσθήκη νέου». Πληκτρολογήστε το όνομα. Το slug (το σύντομο όνομα διεύθυνσης της μάρκας) συμπληρώνεται από το όνομα και μπορείτε να το αλλάξετε πριν αποθηκεύσετε. Ελέγξτε το, γιατί η φόρμα δεν το προσφέρει ξανά σε υπάρχουσα μάρκα.',
        'Για να αλλάξετε μια υπάρχουσα μάρκα, ανοίξτε την με «Επεξεργασία». Οι αλλαγές ισχύουν για κάθε προϊόν αυτής της μάρκας.',
        'Ακολουθούν τα προϊόντα: χρησιμοποιούν την κατηγορία και τη μάρκα. Δείτε το θέμα 4.',
      ],
      notes: [
        { kind: 'warning', text: 'Μη δημιουργείτε ποτέ δεύτερη μάρκα για ένα όνομα που υπάρχει ήδη. Οι διπλές μάρκες χωρίζουν τα προϊόντα μιας μάρκας. Αν βρείτε διπλότυπα, ενημερώστε τον υπεύθυνο της ομάδας και μη διαγράφετε μόνοι σας.' },
        { kind: 'warning', text: 'Η χειροκίνητη μετονομασία κατηγοριών είναι ασφαλής στην καθημερινή δουλειά. Μόνο μια σκόπιμη επανεκτέλεση του seed ταξινομίας (seed_taxonomy.py) με την επιλογή αντικατάστασης θα επανέφερε τα ονόματα των κατηγοριών του seed. Αν το production έχει ήδη αυτή την ασφαλέστερη συμπεριφορά, ελέγχεται ακόμη, γι\' αυτό μην εκτελείτε ποτέ seed χωρίς να ρωτήσετε.' },
      ],
    },
  },

  products: {
    en: {
      title: 'Products',
      summary: 'Create and edit products with brand, category and names, and avoid duplicates.',
      intro: 'Products are shared by all shops. A clean product record means correct search results and price comparison.',
      steps: [
        'Open "Products" and search by name, brand or barcode first. If the product already exists, edit it instead of creating a new one.',
        'To add a product, create a new one. There is one name field per language (English, German, Russian, Greek, Arabic, Hebrew). Fill in at least one, normally in the language of your source, and add a description per language if you have one. The slug is required: a short, lowercase, unique web name with hyphens, for example brand-product-size.',
        'Pick the brand from "Brands" (create the brand first if it is missing) and the right entry in "Categories". All brands and categories can be selected, not only the first few. Categories and brands are explained in topic 3b.',
        'Enter the barcode (EAN / GTIN, 8 to 14 digits) if you have it, and fill in the attributes that the category asks for.',
        'Save. Languages you left empty are not created at once; a separate translation run adds them later.',
        'If two records describe the same product, keep the better one and tell the team lead; do not delete on your own.',
      ],
      notes: [
        { kind: 'tip', text: 'Write names plainly and in the same style as the existing ones (brand, product, size). This helps both people and the automatic translation.' },
        { kind: 'warning', text: 'When you edit a product, the other language versions are kept. Emptying a language field removes that language (the last name always stays). The other languages are not updated automatically: if the meaning of the text changes, tell the team lead.' },
      ],
    },
    el: {
      title: 'Προϊόντα',
      summary: 'Δημιουργία και επεξεργασία προϊόντων με μάρκα, κατηγορία και ονόματα, και αποφυγή διπλοτύπων.',
      intro: 'Τα προϊόντα είναι κοινά για όλα τα καταστήματα. Μια καθαρή εγγραφή προϊόντος σημαίνει σωστά αποτελέσματα αναζήτησης και σύγκρισης τιμών.',
      steps: [
        'Ανοίξτε τα «Προϊόντα» και αναζητήστε πρώτα με όνομα, μάρκα ή barcode. Αν το προϊόν υπάρχει ήδη, επεξεργαστείτε το αντί να δημιουργήσετε νέο.',
        'Για να προσθέσετε προϊόν, δημιουργήστε νέο. Υπάρχει ένα πεδίο ονόματος ανά γλώσσα (αγγλικά, γερμανικά, ρωσικά, ελληνικά, αραβικά, εβραϊκά). Συμπληρώστε τουλάχιστον ένα, κανονικά στη γλώσσα της πηγής σας, και προσθέστε περιγραφή ανά γλώσσα αν έχετε. Το slug είναι υποχρεωτικό: ένα σύντομο, μοναδικό όνομα για τη διεύθυνση, με πεζά γράμματα και παύλες, π.χ. brand-product-size.',
        'Επιλέξτε τη μάρκα από τις «Μάρκες» (δημιουργήστε πρώτα τη μάρκα αν λείπει) και τη σωστή καταχώριση στις «Κατηγορίες». Μπορείτε να επιλέξετε όλες τις μάρκες και κατηγορίες, όχι μόνο τις πρώτες. Οι κατηγορίες και οι μάρκες εξηγούνται στο θέμα 3b.',
        'Καταχωρίστε το barcode (EAN / GTIN, 8 έως 14 ψηφία) αν το έχετε, και συμπληρώστε τα χαρακτηριστικά που ζητά η κατηγορία.',
        'Αποθηκεύστε. Οι γλώσσες που αφήσατε κενές δεν δημιουργούνται αμέσως· μια ξεχωριστή εκτέλεση μετάφρασης τις προσθέτει αργότερα.',
        'Αν δύο εγγραφές περιγράφουν το ίδιο προϊόν, κρατήστε την καλύτερη και ενημερώστε τον υπεύθυνο της ομάδας· μη διαγράφετε μόνοι σας.',
      ],
      notes: [
        { kind: 'tip', text: 'Γράφετε τα ονόματα απλά και με το ίδιο στυλ με τα υπάρχοντα (μάρκα, προϊόν, μέγεθος). Βοηθά τους ανθρώπους και την αυτόματη μετάφραση.' },
        { kind: 'warning', text: 'Όταν επεξεργάζεστε ένα προϊόν, οι άλλες γλωσσικές εκδοχές διατηρούνται. Αν αδειάσετε ένα πεδίο γλώσσας, η γλώσσα αυτή αφαιρείται (το τελευταίο όνομα μένει πάντα). Οι άλλες γλώσσες δεν ενημερώνονται αυτόματα: αν αλλάξει το νόημα του κειμένου, ενημερώστε τον υπεύθυνο της ομάδας.' },
      ],
    },
  },

  translations: {
    en: {
      title: 'How translations are created',
      summary: 'Where product and category translations come from and what you can influence.',
      intro: 'There is no separate translation page in the admin. This topic explains the process so you know what to expect.',
      steps: [
        'You save a product with names and descriptions in one or more languages.',
        'Saving does not start a translation. A separate translation run (started by the team, and automatically after a shop catalog import) asks the language model service to translate the product. The result is written back as the name and description in 6 languages: English, German, Greek, Russian, Arabic and Hebrew. It only adds languages that are still missing.',
        'You can edit every language version of a product directly in the product form (one name and one description field per language). The translation job never overwrites a language version that already exists, so your manual edits stay.',
        'Category names can be renamed by hand: open the category and use its translations (one name per language). Save each language you changed.',
        'Check the result on the public page in the language concerned.',
      ],
      notes: [
        { kind: 'warning', text: 'There is no marker that tells which language version was generated by the model and which was written by hand. A later rework of generated translations could overwrite manual edits.' },
        { kind: 'warning', text: 'Renaming categories is safe in daily work. Only a deliberately re-run taxonomy seed (seed_taxonomy.py) would reset the names of seeded categories. Never run it without asking.' },
      ],
    },
    el: {
      title: 'Πώς δημιουργούνται οι μεταφράσεις',
      summary: 'Από πού προέρχονται οι μεταφράσεις προϊόντων και κατηγοριών και τι μπορείτε να επηρεάσετε.',
      intro: 'Δεν υπάρχει ξεχωριστή σελίδα μεταφράσεων στο admin. Αυτό το θέμα εξηγεί τη διαδικασία, ώστε να ξέρετε τι να περιμένετε.',
      steps: [
        'Αποθηκεύετε ένα προϊόν με ονόματα και περιγραφές σε μία ή περισσότερες γλώσσες.',
        'Η αποθήκευση δεν ξεκινά μετάφραση. Μια ξεχωριστή εκτέλεση μετάφρασης (ξεκινά από την ομάδα και αυτόματα μετά από εισαγωγή καταλόγου καταστήματος) ζητά από την υπηρεσία γλωσσικού μοντέλου να μεταφράσει το προϊόν. Το αποτέλεσμα γράφεται ως όνομα και περιγραφή σε 6 γλώσσες: αγγλικά, γερμανικά, ελληνικά, ρωσικά, αραβικά και εβραϊκά. Προσθέτει μόνο γλώσσες που λείπουν ακόμη.',
        'Μπορείτε να επεξεργαστείτε κάθε γλωσσική εκδοχή ενός προϊόντος απευθείας στη φόρμα προϊόντος (ένα πεδίο ονόματος και ένα πεδίο περιγραφής ανά γλώσσα). Η εργασία μετάφρασης δεν αντικαθιστά ποτέ μια γλωσσική εκδοχή που υπάρχει ήδη, οπότε οι χειροκίνητες αλλαγές σας μένουν.',
        'Τα ονόματα κατηγοριών μπορούν να μετονομαστούν με το χέρι: ανοίξτε την κατηγορία και χρησιμοποιήστε τις μεταφράσεις της (ένα όνομα ανά γλώσσα). Αποθηκεύστε κάθε γλώσσα που αλλάξατε.',
        'Ελέγξτε το αποτέλεσμα στη δημόσια σελίδα, στη γλώσσα που αφορά.',
      ],
      notes: [
        { kind: 'warning', text: 'Δεν υπάρχει ένδειξη που να δείχνει ποια γλωσσική εκδοχή δημιουργήθηκε από το μοντέλο και ποια γράφτηκε χειροκίνητα. Μια μελλοντική επανεπεξεργασία των παραγόμενων μεταφράσεων θα μπορούσε να αντικαταστήσει χειροκίνητες αλλαγές.' },
        { kind: 'warning', text: 'Η μετονομασία κατηγοριών είναι ασφαλής στην καθημερινή δουλειά. Μόνο μια σκόπιμη επανεκτέλεση του seed ταξινομίας (seed_taxonomy.py) θα επανέφερε τα ονόματα των κατηγοριών του seed. Μην την εκτελείτε χωρίς να ρωτήσετε.' },
      ],
    },
  },

  crm: {
    en: {
      title: 'CRM',
      summary: 'Create contacts, check their channels and respect the safety settings.',
      intro: 'The CRM holds contacts and every message we send them. Sending is limited by global safety settings.',
      steps: [
        'Open "CRM" and search for the person or company first, so you do not create a second record.',
        'Click "Add contact" and fill in the name and at least one channel (e-mail or phone). Record how you got the contact.',
        'Check the channel flags on the contact: consent, reachable and preferred.',
        'Contacts in the state "Needs review" wait for a human decision. Look at the details and set the next state yourself; do not leave them.',
        'If someone does not want to be contacted, use "Suppress / Opt-out" with the matching reason straight away.',
        'Open "Safety settings" to see the kill switch and the daily send limits. Change them only after agreement with the team lead.',
      ],
      notes: [
        { kind: 'warning', text: 'A suppressed contact must never be contacted again. If the kill switch is on, no message leaves the system at all.' },
        { kind: 'warning', text: 'Do not enter private data you are not allowed to keep. Only record what is needed for the business contact.' },
      ],
    },
    el: {
      title: 'CRM',
      summary: 'Δημιουργία επαφών, έλεγχος των καναλιών τους και τήρηση των ρυθμίσεων ασφαλείας.',
      intro: 'Το CRM περιέχει τις επαφές και κάθε μήνυμα που τους στέλνουμε. Η αποστολή περιορίζεται από καθολικές ρυθμίσεις ασφαλείας.',
      steps: [
        'Ανοίξτε το «CRM» και αναζητήστε πρώτα το άτομο ή την εταιρεία, ώστε να μη δημιουργήσετε δεύτερη εγγραφή.',
        'Πατήστε «Προσθήκη επαφής» και συμπληρώστε το όνομα και τουλάχιστον ένα κανάλι (email ή τηλέφωνο). Καταγράψτε πώς αποκτήσατε την επαφή.',
        'Ελέγξτε τις ενδείξεις του καναλιού στην επαφή: συναίνεση, προσβάσιμο και προτιμώμενο.',
        'Οι επαφές στην κατάσταση «Χρειάζεται έλεγχο» περιμένουν ανθρώπινη απόφαση. Δείτε τις λεπτομέρειες και ορίστε μόνοι σας την επόμενη κατάσταση· μην τις αφήνετε.',
        'Αν κάποιος δεν θέλει να επικοινωνούμε μαζί του, χρησιμοποιήστε αμέσως το «Αποκλεισμός / Opt-out» με τον σωστό λόγο.',
        'Ανοίξτε τις «Ρυθμίσεις ασφαλείας» για να δείτε τον διακόπτη έκτακτης ανάγκης και τα ημερήσια όρια αποστολής. Αλλάξτε τα μόνο μετά από συμφωνία με τον υπεύθυνο της ομάδας.',
      ],
      notes: [
        { kind: 'warning', text: 'Μια επαφή που έχει αποκλειστεί δεν πρέπει ποτέ να ξαναδεχτεί μήνυμα. Αν ο διακόπτης έκτακτης ανάγκης είναι ενεργός, κανένα μήνυμα δεν φεύγει από το σύστημα.' },
        { kind: 'warning', text: 'Μην καταχωρείτε ιδιωτικά δεδομένα που δεν επιτρέπεται να κρατάτε. Καταγράφετε μόνο ό,τι χρειάζεται για την επαγγελματική επαφή.' },
      ],
    },
  },

  moderation: {
    en: {
      title: 'Moderation: reviews and social links',
      summary: 'Decide which reviews stay public and which web domains shops may not link on their profile.',
      intro: 'Moderation means deciding what stays public. No review is deleted here: reviews are hidden and can be restored, and every review action is logged. Social-link rules block whole domains, so they need more care.',
      steps: [
        'Open "Reviews". The tab "Reported" is your queue: it lists every review that at least one customer or one shop owner reported. "Reported by shop owner" shows only the reports that came from shops, "Hidden" the reviews that are hidden now, and "All" every review. A report asks you to look. It is not a verdict.',
        'Read the review, the reports (each one names its source: customer or shop owner) and, if there is one, the reply of the shop. Decide with the guideline in the notes below. If you are unsure, do not hide the review and ask the team lead.',
        'To hide a review, choose the reason (Spam, Offensive, Legal or Other), click "Hide review" and confirm. The review disappears from the public pages and from the rating figures of the shop or product. It stays in this list with the badge "Hidden", and the reason is written to the audit log.',
        'To bring a review back, open the tab "Hidden", click "Restore review" and confirm. It is public again.',
        'If only the reply of the shop is the problem, hide just the reply with "Hide reply". The shop can then neither edit nor delete it. "Restore reply" makes it public again.',
        'Click "Audit log" on a review to see who did what and when (created, reported, hidden, restored) and the reason. Look at it before you reverse the decision of a colleague.',
        'Open "Social-Link Rules". When a shop owner saves social-media links, every link is checked against these rules, and a link to a listed domain is refused. Most rows come from public block lists that an automatic import refreshes (source "External list", marked read-only). The rows you add yourself have the source "Admin".',
        'Search for the domain first, so you do not add a rule twice. To block a domain, click "Add rule". Enter only the domain (for example example.com, without https:// and without a path), choose the category (Adult, Gambling, Hate speech, Illegal or Malware) and write a short note on why. Click "Add rule" again to save. The form also offers the category "Custom", but the server currently refuses it, so pick another one.',
        'The rule works at once and covers the main domain with every subdomain: a rule for blog.example.com is stored as example.com and blocks all of example.com. Short links are followed and the final domain is checked as well. The check runs when a shop owner saves links, and the save is then refused.',
        'Only rules with the source "Admin" can be deleted ("Delete", then confirm). Imported rows are read-only. A deleted rule can be added again.',
      ],
      notes: [
        { kind: 'warning', text: 'Review texts, author names and report texts are personal data. Do not copy them into chats, tickets or screenshots outside the team. Hide, never delete: this page has no delete function, and nobody should work around that.' },
        { kind: 'warning', text: 'A social-link rule blocks the whole main domain, also big platforms (a rule for sites.google.com would block google.com). Never block a domain just because you dislike it. For anything that looks like a normal website or platform, ask the team lead before you add the rule.' },
        { kind: 'tip', text: 'Guideline (a proposal that the team lead still has to confirm, the system enforces none of it): hide spam and advertising, clearly offensive or abusive texts, and legal problems such as personal data or a false accusation. A harsh but honest opinion about an experience stays public. A review about the wrong shop or product can be hidden with the reason "Other".' },
        { kind: 'tip', text: 'Hiding or restoring only changes the review and writes the log. It sends no e-mail. Shop owners see in their portal that pundo hid a review.' },
        { kind: 'tip', text: 'Two related things are not managed on these pages. A separate allow list protects well-known platforms against the automatic import (ask the developers, it has no page and it does not lift your own rules). The link health check only reports dead links and never blocks anything.' },
      ],
    },
    el: {
      title: 'Έλεγχος περιεχομένου: αξιολογήσεις και κοινωνικοί σύνδεσμοι',
      summary: 'Αποφασίστε ποιες αξιολογήσεις μένουν δημόσιες και ποιους τομείς ιστού δεν επιτρέπεται να συνδέουν τα καταστήματα στο προφίλ τους.',
      intro: 'Έλεγχος περιεχομένου σημαίνει να αποφασίζετε τι μένει δημόσιο. Εδώ δεν διαγράφεται καμία αξιολόγηση: οι αξιολογήσεις κρύβονται και μπορούν να επαναφερθούν, και κάθε ενέργεια καταγράφεται. Οι κανόνες κοινωνικών συνδέσμων μπλοκάρουν ολόκληρους τομείς, γι\' αυτό χρειάζονται περισσότερη προσοχή.',
      steps: [
        'Ανοίξτε τις «Αξιολογήσεις». Η καρτέλα «Αναφερθείσες» είναι η ουρά σας: εμφανίζει κάθε αξιολόγηση που ανέφερε τουλάχιστον ένας πελάτης ή ένας ιδιοκτήτης καταστήματος. Η «Αναφορά από ιδιοκτήτη» δείχνει μόνο τις αναφορές που ήρθαν από καταστήματα, οι «Κρυμμένες» τις αξιολογήσεις που είναι τώρα κρυμμένες και οι «Όλες» κάθε αξιολόγηση. Μια αναφορά σας ζητά να κοιτάξετε. Δεν είναι απόφαση.',
        'Διαβάστε την αξιολόγηση, τις αναφορές (κάθε μία δείχνει την πηγή της: πελάτης ή ιδιοκτήτης καταστήματος) και, αν υπάρχει, την απάντηση του καταστήματος. Αποφασίστε με την κατευθυντήρια γραμμή στις σημειώσεις παρακάτω. Αν διστάζετε, μην κρύψετε την αξιολόγηση και ρωτήστε τον υπεύθυνο της ομάδας.',
        'Για να κρύψετε μια αξιολόγηση, επιλέξτε τον λόγο (Spam, Προσβλητικό, Νομικό ή Άλλο), πατήστε «Απόκρυψη αξιολόγησης» και επιβεβαιώστε. Η αξιολόγηση εξαφανίζεται από τις δημόσιες σελίδες και από τα στοιχεία βαθμολογίας του καταστήματος ή του προϊόντος. Μένει σε αυτή τη λίστα με την ένδειξη «Κρυμμένη» και ο λόγος γράφεται στο αρχείο ελέγχου.',
        'Για να επαναφέρετε μια αξιολόγηση, ανοίξτε την καρτέλα «Κρυμμένες», πατήστε «Επαναφορά αξιολόγησης» και επιβεβαιώστε. Γίνεται ξανά δημόσια.',
        'Αν το πρόβλημα είναι μόνο η απάντηση του καταστήματος, κρύψτε μόνο την απάντηση με «Απόκρυψη απάντησης». Το κατάστημα δεν μπορεί τότε ούτε να την επεξεργαστεί ούτε να τη διαγράψει. Η «Επαναφορά απάντησης» την κάνει ξανά δημόσια.',
        'Πατήστε «Αρχείο ελέγχου» σε μια αξιολόγηση για να δείτε ποιος έκανε τι και πότε (δημιουργήθηκε, αναφέρθηκε, κρύφτηκε, επαναφέρθηκε) και τον λόγο. Δείτε το πριν αναιρέσετε την απόφαση ενός συναδέλφου.',
        'Ανοίξτε τους «Κανόνες κοινωνικών συνδέσμων». Όταν ένας ιδιοκτήτης καταστήματος αποθηκεύει συνδέσμους κοινωνικών δικτύων, κάθε σύνδεσμος ελέγχεται με αυτούς τους κανόνες και ένας σύνδεσμος προς τομέα της λίστας απορρίπτεται. Οι περισσότερες γραμμές προέρχονται από δημόσιες λίστες αποκλεισμού που ανανεώνονται με αυτόματη εισαγωγή (πηγή «Εξωτερική λίστα», μόνο ανάγνωση). Οι γραμμές που προσθέτετε εσείς έχουν πηγή «Admin».',
        'Αναζητήστε πρώτα τον τομέα, ώστε να μην προσθέσετε κανόνα δύο φορές. Για να μπλοκάρετε έναν τομέα, πατήστε «Προσθήκη κανόνα». Γράψτε μόνο τον τομέα (π.χ. example.com, χωρίς https:// και χωρίς διαδρομή), επιλέξτε την κατηγορία (Περιεχόμενο για ενήλικες, Τυχερά παιχνίδια, Ρητορική μίσους, Παράνομο ή Κακόβουλο λογισμικό) και γράψτε μια σύντομη σημείωση για τον λόγο. Πατήστε ξανά «Προσθήκη κανόνα» για να αποθηκεύσετε. Η φόρμα προσφέρει και την κατηγορία «Προσαρμοσμένο», αλλά ο διακομιστής προς το παρόν την απορρίπτει, οπότε επιλέξτε άλλη.',
        'Ο κανόνας ισχύει αμέσως και καλύπτει τον κύριο τομέα με όλους τους υποτομείς: ένας κανόνας για blog.example.com αποθηκεύεται ως example.com και μπλοκάρει ολόκληρο το example.com. Οι σύντομοι σύνδεσμοι ακολουθούνται και ελέγχεται και ο τελικός τομέας. Ο έλεγχος γίνεται όταν ένας ιδιοκτήτης καταστήματος αποθηκεύει συνδέσμους και η αποθήκευση τότε απορρίπτεται.',
        'Μόνο οι κανόνες με πηγή «Admin» μπορούν να διαγραφούν («Διαγραφή» και επιβεβαίωση). Οι εισαγόμενες γραμμές είναι μόνο για ανάγνωση. Ένας κανόνας που διαγράφηκε μπορεί να προστεθεί ξανά.',
      ],
      notes: [
        { kind: 'warning', text: 'Τα κείμενα των αξιολογήσεων, τα ονόματα των συντακτών και τα κείμενα των αναφορών είναι προσωπικά δεδομένα. Μην τα αντιγράφετε σε συνομιλίες, αιτήματα ή στιγμιότυπα εκτός ομάδας. Κρύβετε, ποτέ μη διαγράφετε: αυτή η σελίδα δεν έχει λειτουργία διαγραφής και κανείς δεν πρέπει να την παρακάμπτει.' },
        { kind: 'warning', text: 'Ένας κανόνας κοινωνικού συνδέσμου μπλοκάρει ολόκληρο τον κύριο τομέα, ακόμη και μεγάλες πλατφόρμες (ένας κανόνας για sites.google.com θα μπλοκάριζε το google.com). Μη μπλοκάρετε ποτέ έναν τομέα απλώς επειδή δεν σας αρέσει. Για οτιδήποτε μοιάζει με κανονική ιστοσελίδα ή πλατφόρμα, ρωτήστε τον υπεύθυνο της ομάδας πριν προσθέσετε τον κανόνα.' },
        { kind: 'tip', text: 'Κατευθυντήρια γραμμή (πρόταση που πρέπει ακόμη να επιβεβαιώσει ο υπεύθυνος της ομάδας, το σύστημα δεν επιβάλλει τίποτα από αυτά): κρύψτε spam και διαφημίσεις, σαφώς προσβλητικά ή υβριστικά κείμενα και νομικά προβλήματα, όπως προσωπικά δεδομένα ή ψευδή κατηγορία. Μια σκληρή αλλά τίμια γνώμη για μια εμπειρία μένει δημόσια. Μια αξιολόγηση για λάθος κατάστημα ή προϊόν μπορεί να κρυφτεί με τον λόγο «Άλλο».' },
        { kind: 'tip', text: 'Η απόκρυψη ή η επαναφορά αλλάζει μόνο την αξιολόγηση και γράφει το αρχείο ελέγχου. Δεν στέλνει email. Οι ιδιοκτήτες καταστημάτων βλέπουν στην πύλη τους ότι το pundo έκρυψε μια αξιολόγηση.' },
        { kind: 'tip', text: 'Δύο συγγενικά πράγματα δεν διαχειρίζονται σε αυτές τις σελίδες. Μια ξεχωριστή λίστα επιτρεπόμενων προστατεύει γνωστές πλατφόρμες από την αυτόματη εισαγωγή (ρωτήστε τους προγραμματιστές, δεν έχει σελίδα και δεν άρει τους δικούς σας κανόνες). Ο έλεγχος υγείας συνδέσμων αναφέρει μόνο νεκρούς συνδέσμους και δεν μπλοκάρει ποτέ τίποτα.' },
      ],
    },
  },

  'catalog-quality': {
    en: {
      title: 'Catalog quality: attributes and service mappings',
      summary: 'Decide which facts a category collects about its products and which services new shops of a profession get pre-filled.',
      intro: 'Two small tools decide how complete the catalog is. An attribute definition says which fact the system collects about every product of a category. A service mapping says which ready-made service a new shop of a profession receives. Both act on many records at once, so decide first and change second.',
      steps: [
        'Open the Dashboard and click the tile "Attribute Defs" (this page has no sidebar entry; the section "Attribute Definitions" at the bottom of a category leads to the same definitions). Search for the category and click "Manage defs" in its row. The page then lists the definitions of this one category.',
        'Before you add a definition, ask: does nearly every product of this category have this fact (for example a size)? Can it be read from a product name, description or package? Will anybody use it? If one answer is no, do not add it. Choose the category on which the fact is true for all products below it: sub-categories inherit the definitions of their parent, so a definition placed too high is also collected for products it does not fit.',
        'Click "Add new" and fill "Key" (a short technical name in lower case, for example pack_size; the products store their values under this name), "Label" (the English name people read) and "Type" (text, number, bool or select). For the type select, write the allowed values into "Options (comma-separated)". Click "Save". A key can exist only once per category; a second try shows the generic error message. The forms cannot change how a definition is combined with the one of its parent (replace or extend); ask the developers if you need that.',
        'Saving does not fill anything at once. It does not create empty values for products that are already in the category. When a product goes through the catalog processing after its category is set, it gets an empty value for each fact its category defines, and the automatic reading fills it only if it is confident enough (the threshold is 0.7 unless the developers changed it); otherwise the value stays empty.',
        'To change a definition click "Edit" in its row, change it and click "Save". To remove one click "Delete" and confirm. Read the first warning below before you do either on a definition that is already in use.',
        'Open "Service Catalog" in the sidebar (the page is titled "Item-Domain Mappings"). A mapping connects one item, a ready-made service, to one profession (domain) and/or one specialty. When a new shop owner submits the onboarding, the shop gets hidden draft listings with the price "on request" for every item mapped to its professions with "Auto-assign" switched on; they go live when the shop is approved. A service that the owner deleted or changed earlier is not added again.',
        'Before you add a mapping, click "Mapping Gaps →" at the top of the list. It lists every active profession and specialty that has no mapping with "Auto-assign" switched on: new shops of these professions get nothing pre-filled. The count column always shows 0, because only uncovered entries appear.',
        'Click "Add mapping" and enter the numeric "Item ID" (the ID column of the list under "Products", which lists services too) and at least one of "Domain ID" or "Specialty ID". The IDs of professions are shown as #number in the columns "Domain" and "Specialty" of existing mappings; the gap list shows names only, so ask a developer for the ID of a profession that has no mapping yet. Leave "Priority" at 0: no code that I could find changes what a shop receives by it. Choose whether "Auto-assign" is on, then click "Save". The list is sorted by ID, so the new mapping is at the end, on the last page.',
        'For a safe start save a new mapping with "Auto-assign" switched off: it stays in the list and does nothing. Switch it on with "Edit" when the item is right. "Edit" can only change "Priority" and "Auto-assign"; the item and the profession cannot be changed there. To move a mapping, add a new one and delete the old one.',
        'Changes act on future onboardings. Deleting a mapping, or switching "Auto-assign" off, removes nothing from shops that already received the service. Shops that are already approved receive a new mapping only if the developers run the backfill script.',
      ],
      notes: [
        { kind: 'warning', text: 'Deleting or renaming ("Key") an attribute definition cleans up nothing: the values already stored on products stay in the database under the old key, but nobody collects them any more. A definition on a high-level category reaches every product below it, and "Delete" cannot be undone. Ask the team lead before you delete or rename a definition that is in use. In the section "Attribute Definitions" on the category page "Delete" removes a definition at once without asking; prefer the page "Attribute Defs", which asks you to confirm.' },
        { kind: 'warning', text: 'A mapping with "Auto-assign" switched on puts the service onto every new shop of that profession. A wrong mapping therefore puts a wrong service onto many shops, and removing the mapping later does not take it back from shops that already have it. Add it with "Auto-assign" switched off first, check the item, then switch it on. For a profession that already has many shops, ask the team lead.' },
        { kind: 'tip', text: 'Guideline (a proposal that the team lead still has to confirm, the system enforces none of it): a fact deserves a definition only if most products of the category have it and it can be read reliably. Prefer few precise definitions to many empty ones. Prefer "select" with a short list for facts with fixed answers.' },
        { kind: 'tip', text: 'Changing "Options" of a select definition does not change values that are already stored, and old values are not checked against the new list. The labels can be edited in English only.' },
        { kind: 'tip', text: 'At the time of writing the two filter fields above the list of mappings do not filter anything (the list shows all rows either way). Use the pages of the list instead.' },
        { kind: 'tip', text: 'The product form does not show the definitions of the category. Do not use its attribute table to compensate for a missing definition.' },
      ],
    },
    el: {
      title: 'Ποιότητα καταλόγου: χαρακτηριστικά και αντιστοιχίσεις υπηρεσιών',
      summary: 'Αποφασίστε ποια στοιχεία συλλέγει μια κατηγορία για τα προϊόντα της και ποιες υπηρεσίες προσυμπληρώνονται στα νέα καταστήματα ενός επαγγέλματος.',
      intro: 'Δύο μικρά εργαλεία καθορίζουν πόσο πλήρης είναι ο κατάλογος. Ένας ορισμός χαρακτηριστικού λέει ποιο στοιχείο συλλέγει το σύστημα για κάθε προϊόν μιας κατηγορίας. Μια αντιστοίχιση υπηρεσίας λέει ποια έτοιμη υπηρεσία παίρνει ένα νέο κατάστημα ενός επαγγέλματος. Και τα δύο επηρεάζουν πολλές εγγραφές ταυτόχρονα, για αυτό πρώτα αποφασίστε και μετά αλλάξτε.',
      steps: [
        'Ανοίξτε τον Πίνακα ελέγχου και πατήστε το πλακίδιο «Ορισμοί χαρακτηριστικών» (η σελίδα δεν έχει καταχώριση στην πλευρική στήλη· η ενότητα «Ορισμοί χαρακτηριστικών» στο κάτω μέρος μιας κατηγορίας οδηγεί στους ίδιους ορισμούς). Αναζητήστε την κατηγορία και πατήστε «Manage defs» στη γραμμή της (η ετικέτα εμφανίζεται πάντα στα αγγλικά). Η σελίδα εμφανίζει τους ορισμούς αυτής της κατηγορίας μόνο.',
        'Πριν προσθέσετε έναν ορισμό, ρωτήστε: έχει σχεδόν κάθε προϊόν της κατηγορίας αυτό το στοιχείο (π.χ. ένα μέγεθος); Μπορεί να διαβαστεί από το όνομα, την περιγραφή ή τη συσκευασία; Θα το χρησιμοποιήσει κάποιος; Αν μία απάντηση είναι όχι, μην τον προσθέσετε. Επιλέξτε την κατηγορία όπου το στοιχείο ισχύει για όλα τα προϊόντα από κάτω: οι υποκατηγορίες κληρονομούν τους ορισμούς του γονέα τους, άρα ένας ορισμός που μπαίνει πολύ ψηλά συλλέγεται και για προϊόντα που δεν ταιριάζουν.',
        'Πατήστε «Προσθήκη νέου» και συμπληρώστε «Κλειδί» (ένα σύντομο τεχνικό όνομα με πεζά, π.χ. pack_size· τα προϊόντα αποθηκεύουν τις τιμές τους με αυτό το όνομα), «Ετικέτα» (το αγγλικό όνομα που διαβάζουν οι άνθρωποι) και «Τύπος» (text, number, bool ή select). Για τον τύπο select γράψτε τις επιτρεπτές τιμές στις «Επιλογές (διαχωρισμένες με κόμμα)». Πατήστε «Αποθήκευση». Ένα κλειδί υπάρχει μόνο μία φορά ανά κατηγορία· μια δεύτερη προσπάθεια δείχνει το γενικό μήνυμα σφάλματος. Οι φόρμες δεν μπορούν να αλλάξουν πώς συνδυάζεται ένας ορισμός με αυτόν του γονέα (αντικατάσταση ή επέκταση)· ρωτήστε τους προγραμματιστές αν το χρειάζεστε.',
        'Η αποθήκευση δεν συμπληρώνει τίποτα αμέσως. Δεν δημιουργεί κενές τιμές για προϊόντα που ανήκουν ήδη στην κατηγορία. Όταν ένα προϊόν περνά από την επεξεργασία καταλόγου αφού οριστεί η κατηγορία του, παίρνει μια κενή τιμή για κάθε στοιχείο που ορίζει η κατηγορία του και η αυτόματη ανάγνωση τη συμπληρώνει μόνο αν είναι αρκετά σίγουρη (το όριο είναι 0,7, εκτός αν το άλλαξαν οι προγραμματιστές)· αλλιώς η τιμή μένει κενή.',
        'Για να αλλάξετε έναν ορισμό πατήστε «Επεξεργασία» στη γραμμή του, αλλάξτε τον και πατήστε «Αποθήκευση». Για να τον αφαιρέσετε πατήστε «Διαγραφή» και επιβεβαιώστε. Διαβάστε την πρώτη προειδοποίηση παρακάτω πριν κάνετε το ένα ή το άλλο σε ορισμό που χρησιμοποιείται ήδη.',
        'Ανοίξτε τον «Κατάλογο υπηρεσιών» στην πλευρική στήλη (η σελίδα έχει τίτλο «Αντιστοιχίσεις στοιχείων-τομέων»). Μια αντιστοίχιση συνδέει ένα στοιχείο, δηλαδή μια έτοιμη υπηρεσία, με ένα επάγγελμα (τομέα) ή/και μια ειδικότητα. Όταν ένας νέος ιδιοκτήτης καταστήματος υποβάλλει την ένταξη, το κατάστημα παίρνει κρυφές προσχέδιες καταχωρίσεις με τιμή «κατόπιν αιτήματος» για κάθε στοιχείο που έχει αντιστοιχιστεί στα επαγγέλματά του με ενεργή την «Αυτόματη ανάθεση»· γίνονται ορατές όταν εγκριθεί το κατάστημα. Μια υπηρεσία που ο ιδιοκτήτης έχει διαγράψει ή αλλάξει νωρίτερα δεν προστίθεται ξανά.',
        'Πριν προσθέσετε μια αντιστοίχιση, πατήστε «Κενά αντιστοίχισης →» πάνω από τη λίστα. Εμφανίζει κάθε ενεργό επάγγελμα και κάθε ειδικότητα που δεν έχει αντιστοίχιση με ενεργή την «Αυτόματη ανάθεση»: τα νέα καταστήματα αυτών των επαγγελμάτων δεν παίρνουν τίποτα προσυμπληρωμένο. Η στήλη του πλήθους δείχνει πάντα 0, επειδή εμφανίζονται μόνο τα ακάλυπτα.',
        'Πατήστε «Προσθήκη αντιστοίχισης» και γράψτε τον αριθμητικό «ID στοιχείου» (η στήλη ID της λίστας στα «Προϊόντα», που εμφανίζει και υπηρεσίες) και τουλάχιστον ένα από «ID τομέα» ή «ID ειδικότητας». Τα ID των επαγγελμάτων φαίνονται ως #αριθμός στις στήλες «Τομέας» και «Ειδικότητα» των υπαρχουσών αντιστοιχίσεων· η λίστα κενών δείχνει μόνο ονόματα, οπότε ζητήστε από έναν προγραμματιστή το ID ενός επαγγέλματος που δεν έχει ακόμη αντιστοίχιση. Αφήστε την «Προτεραιότητα» στο 0: δεν βρήκα κώδικα που να αλλάζει με αυτήν τι παίρνει ένα κατάστημα. Επιλέξτε αν η «Αυτόματη ανάθεση» είναι ενεργή και πατήστε «Αποθήκευση». Η λίστα είναι ταξινομημένη κατά ID, οπότε η νέα αντιστοίχιση βρίσκεται στο τέλος, στην τελευταία σελίδα.',
        'Για ασφαλή αρχή αποθηκεύστε τη νέα αντιστοίχιση με την «Αυτόματη ανάθεση» απενεργοποιημένη: μένει στη λίστα και δεν κάνει τίποτα. Ενεργοποιήστε την με «Επεξεργασία» όταν το στοιχείο είναι σωστό. Η «Επεξεργασία» αλλάζει μόνο την «Προτεραιότητα» και την «Αυτόματη ανάθεση»· το στοιχείο και το επάγγελμα δεν αλλάζουν εκεί. Για να μετακινήσετε μια αντιστοίχιση, προσθέστε νέα και διαγράψτε την παλιά.',
        'Οι αλλαγές επηρεάζουν μελλοντικές εντάξεις. Η διαγραφή μιας αντιστοίχισης ή η απενεργοποίηση της «Αυτόματης ανάθεσης» δεν αφαιρεί τίποτα από καταστήματα που έχουν ήδη πάρει την υπηρεσία. Καταστήματα που έχουν ήδη εγκριθεί παίρνουν μια νέα αντιστοίχιση μόνο αν οι προγραμματιστές τρέξουν το script backfill.',
      ],
      notes: [
        { kind: 'warning', text: 'Η διαγραφή ή η μετονομασία («Κλειδί») ενός ορισμού χαρακτηριστικού δεν καθαρίζει τίποτα: οι τιμές που έχουν ήδη αποθηκευτεί στα προϊόντα μένουν στη βάση με το παλιό κλειδί, αλλά κανείς δεν τις συλλέγει πια. Ένας ορισμός σε κατηγορία ψηλά στο δέντρο φτάνει σε κάθε προϊόν από κάτω και η «Διαγραφή» δεν αναιρείται. Ρωτήστε τον υπεύθυνο της ομάδας πριν διαγράψετε ή μετονομάσετε έναν ορισμό που χρησιμοποιείται. Στην ενότητα «Ορισμοί χαρακτηριστικών» της σελίδας κατηγορίας η «Διαγραφή» αφαιρεί έναν ορισμό αμέσως χωρίς ερώτηση· προτιμήστε τη σελίδα «Ορισμοί χαρακτηριστικών», που ζητά επιβεβαίωση.' },
        { kind: 'warning', text: 'Μια αντιστοίχιση με ενεργή την «Αυτόματη ανάθεση» βάζει την υπηρεσία σε κάθε νέο κατάστημα αυτού του επαγγέλματος. Μια λάθος αντιστοίχιση βάζει επομένως λάθος υπηρεσία σε πολλά καταστήματα και η μεταγενέστερη αφαίρεσή της δεν την παίρνει πίσω από καταστήματα που την έχουν ήδη. Προσθέστε την πρώτα με απενεργοποιημένη την «Αυτόματη ανάθεση», ελέγξτε το στοιχείο και μετά ενεργοποιήστε την. Για επάγγελμα που έχει ήδη πολλά καταστήματα, ρωτήστε τον υπεύθυνο της ομάδας.' },
        { kind: 'tip', text: 'Κατευθυντήρια γραμμή (πρόταση που πρέπει ακόμη να επιβεβαιώσει ο υπεύθυνος της ομάδας, το σύστημα δεν επιβάλλει τίποτα από αυτά): ένα στοιχείο αξίζει ορισμό μόνο αν το έχουν τα περισσότερα προϊόντα της κατηγορίας και διαβάζεται αξιόπιστα. Προτιμήστε λίγους ακριβείς ορισμούς από πολλούς κενούς. Προτιμήστε «select» με σύντομη λίστα για στοιχεία με σταθερές απαντήσεις.' },
        { kind: 'tip', text: 'Η αλλαγή των «Επιλογών» ενός ορισμού select δεν αλλάζει τις τιμές που έχουν ήδη αποθηκευτεί και οι παλιές τιμές δεν ελέγχονται με τη νέα λίστα. Οι ετικέτες επεξεργάζονται μόνο στα αγγλικά.' },
        { kind: 'tip', text: 'Τη στιγμή της συγγραφής τα δύο πεδία φίλτρου πάνω από τη λίστα αντιστοιχίσεων δεν φιλτράρουν τίποτα (η λίστα δείχνει όλες τις γραμμές ούτως ή άλλως). Χρησιμοποιήστε τις σελίδες της λίστας.' },
        { kind: 'tip', text: 'Η φόρμα προϊόντος δεν δείχνει τους ορισμούς της κατηγορίας. Μη χρησιμοποιείτε τον πίνακα χαρακτηριστικών της για να αναπληρώσετε έναν ορισμό που λείπει.' },
      ],
    },
  },

  'api-keys': {
    en: {
      title: 'API keys',
      summary: 'What API keys are, who creates them and how to switch one off safely.',
      intro: 'An API key lets a program talk to pundo without a person signing in. Treat it like a password: whoever holds the key can do whatever the key allows.',
      steps: [
        'Open "API Keys" in the sidebar. The list shows every key, those of shop owners and system keys, with ID, name, scope, owner ID, creation date and last use. It never shows the secret itself. Keys that were switched off earlier stay in the list and are not marked.',
        'Who creates keys: shop owners create their own keys in their portal and see the secret exactly once. Developers create system keys (for example for the scraper) with a script on the server. There is no way to create a key in the admin area: admins can only look and revoke. A row without an owner ID is a system key.',
        'The column "Scope" says what the key may do. Keys of shop owners carry shop:read and/or shop:write. System keys carry scopes such as internal:write (programs that deliver data), scrape:work, or admin:* (all admin operations: a key with admin:* passes every scope check, so treat it with the most care).',
        'Expiry: keys that shop owners create never expire. A system key expires only if the developer set an end date when creating it; after that date it is refused automatically. The page does not show the end date.',
        'Use "Last used" to find keys nobody uses: "Never" means the key has not been used yet. An unused key is a risk without a benefit, so ask its owner whether it is still needed.',
        'To switch a key off click "Revoke" and confirm. The key is deactivated at once: every request with it is refused with the message "API key revoked". The row stays in the list, nothing is deleted, and the admin area has no function to switch a key on again.',
        'There is no "rotate" button. To replace a key, the owner (or the developer) creates a new key, the program is switched to the new one, and only then do you revoke the old one. A program with a revoked key stops at once, so never revoke first.',
        'When you suspend a shop owner account, all keys of that owner are switched off together with it. You do not have to revoke them one by one.',
      ],
      notes: [
        { kind: 'warning', text: 'Never put an API key into a chat, a ticket, an e-mail or a screenshot, and never read one out. This page never shows a secret, so you never need one. If a key has been shared anywhere, treat it as leaked: find its row by name or owner, revoke it and tell the team lead.' },
        { kind: 'warning', text: 'Revoking a system key (no owner ID) stops that program at once, for example the scraper, and the admin area cannot undo it: a developer has to create a new key. Ask the developers before you revoke a system key.' },
        { kind: 'tip', text: 'Revoke instead of delete is the only way here: there is no delete function, which keeps the history (name, owner, last use) for later questions.' },
      ],
    },
    el: {
      title: 'Κλειδιά API',
      summary: 'Τι είναι τα κλειδιά API, ποιος τα δημιουργεί και πώς απενεργοποιείται ένα με ασφάλεια.',
      intro: 'Ένα κλειδί API επιτρέπει σε ένα πρόγραμμα να μιλά με το pundo χωρίς να συνδέεται κάποιος άνθρωπος. Αντιμετωπίστε το σαν κωδικό: όποιος έχει το κλειδί μπορεί να κάνει ό,τι επιτρέπει το κλειδί.',
      steps: [
        'Ανοίξτε τα «Κλειδιά API» στην πλευρική στήλη. Η λίστα δείχνει κάθε κλειδί, των ιδιοκτητών καταστημάτων και τα κλειδιά συστήματος, με ID, όνομα, εύρος, ID ιδιοκτήτη, ημερομηνία δημιουργίας και τελευταία χρήση. Δεν δείχνει ποτέ το ίδιο το μυστικό. Κλειδιά που απενεργοποιήθηκαν νωρίτερα μένουν στη λίστα και δεν σημειώνονται.',
        'Ποιος δημιουργεί κλειδιά: οι ιδιοκτήτες καταστημάτων δημιουργούν τα δικά τους κλειδιά στην πύλη τους και βλέπουν το μυστικό μόνο μία φορά. Οι προγραμματιστές δημιουργούν κλειδιά συστήματος (π.χ. για το scraper) με ένα script στον διακομιστή. Στο admin δεν υπάρχει τρόπος δημιουργίας κλειδιού: οι διαχειριστές μπορούν μόνο να κοιτάξουν και να ανακαλέσουν. Μια γραμμή χωρίς ID ιδιοκτήτη είναι κλειδί συστήματος.',
        'Η στήλη «Εύρος» λέει τι επιτρέπεται στο κλειδί. Τα κλειδιά των ιδιοκτητών έχουν shop:read ή/και shop:write. Τα κλειδιά συστήματος έχουν εύρη όπως internal:write (προγράμματα που παραδίδουν δεδομένα), scrape:work ή admin:* (όλες οι ενέργειες διαχείρισης: ένα κλειδί με admin:* περνά κάθε έλεγχο εύρους, για αυτό χρειάζεται τη μεγαλύτερη προσοχή).',
        'Λήξη: τα κλειδιά που δημιουργούν οι ιδιοκτήτες δεν λήγουν ποτέ. Ένα κλειδί συστήματος λήγει μόνο αν ο προγραμματιστής όρισε ημερομηνία λήξης κατά τη δημιουργία· μετά από αυτή απορρίπτεται αυτόματα. Η σελίδα δεν δείχνει την ημερομηνία λήξης.',
        'Χρησιμοποιήστε την «Τελευταία χρήση» για να βρείτε κλειδιά που κανείς δεν χρησιμοποιεί: το «Ποτέ» σημαίνει ότι το κλειδί δεν έχει χρησιμοποιηθεί ακόμη. Ένα αχρησιμοποίητο κλειδί είναι κίνδυνος χωρίς όφελος, για αυτό ρωτήστε τον κάτοχό του αν χρειάζεται ακόμη.',
        'Για να απενεργοποιήσετε ένα κλειδί πατήστε «Ανάκληση» και επιβεβαιώστε. Το κλειδί απενεργοποιείται αμέσως: κάθε αίτημα με αυτό απορρίπτεται με το μήνυμα «API key revoked». Η γραμμή μένει στη λίστα, τίποτα δεν διαγράφεται και το admin δεν έχει λειτουργία για να ενεργοποιήσετε ξανά ένα κλειδί.',
        'Δεν υπάρχει κουμπί «εναλλαγής». Για να αντικαταστήσετε ένα κλειδί, ο ιδιοκτήτης (ή ο προγραμματιστής) δημιουργεί νέο κλειδί, το πρόγραμμα περνά στο νέο και μόνο τότε ανακαλείτε το παλιό. Ένα πρόγραμμα με ανακληθέν κλειδί σταματά αμέσως, για αυτό μην ανακαλείτε ποτέ πρώτα.',
        'Όταν αναστέλλετε τον λογαριασμό ενός ιδιοκτήτη καταστήματος, όλα τα κλειδιά του απενεργοποιούνται μαζί. Δεν χρειάζεται να τα ανακαλέσετε ένα προς ένα.',
      ],
      notes: [
        { kind: 'warning', text: 'Ποτέ μη βάζετε ένα κλειδί API σε συνομιλία, αίτημα, email ή στιγμιότυπο οθόνης και ποτέ μην το εκφωνείτε. Αυτή η σελίδα δεν δείχνει ποτέ μυστικό, άρα δεν χρειάζεστε ποτέ κάποιο. Αν ένα κλειδί έχει κοινοποιηθεί οπουδήποτε, θεωρήστε το διαρρεύσαν: βρείτε τη γραμμή του με βάση το όνομα ή τον ιδιοκτήτη, ανακαλέστε το και ενημερώστε τον υπεύθυνο της ομάδας.' },
        { kind: 'warning', text: 'Η ανάκληση ενός κλειδιού συστήματος (χωρίς ID ιδιοκτήτη) σταματά αμέσως το πρόγραμμα, π.χ. το scraper, και το admin δεν μπορεί να την αναιρέσει: ένας προγραμματιστής πρέπει να δημιουργήσει νέο κλειδί. Ρωτήστε τους προγραμματιστές πριν ανακαλέσετε κλειδί συστήματος.' },
        { kind: 'tip', text: 'Ανάκληση αντί για διαγραφή είναι ο μοναδικός τρόπος εδώ: δεν υπάρχει λειτουργία διαγραφής, ώστε να μένει το ιστορικό (όνομα, ιδιοκτήτης, τελευταία χρήση) για μεταγενέστερες ερωτήσεις.' },
      ],
    },
  },
}
