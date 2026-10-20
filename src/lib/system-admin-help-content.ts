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
}
