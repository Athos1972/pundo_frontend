// F8960 — SOP texts for the admin help (en + el). Server-side only (see tests/unit/guards).
// UI terms are taken verbatim from system-admin-translations.ts so the SOP matches the screen.
// EL texts are a draft ("EL ungeprueft") until a native speaker has reviewed them.
import type { HelpTopicId } from '@/lib/system-admin-help'

export type HelpLang = 'en' | 'el'

export interface HelpNote {
  kind: 'warning' | 'tip'
  text: string
}

/** A group of steps with its own heading, shown after the first steps (long SOPs, e.g. CRM). */
export interface HelpSection {
  heading: string
  steps: readonly string[]
}

export interface HelpTopicContent {
  title: string
  /** One-liner shown on the card. */
  summary: string
  intro?: string
  /** Highlighted box "Rules that are easy to forget", shown above the steps. */
  rules?: readonly string[]
  steps: readonly string[]
  sections?: readonly HelpSection[]
  notes?: readonly HelpNote[]
}

export const helpLang = (lang: string): HelpLang => (lang === 'el' ? 'el' : 'en')

/** Every numbered step of a topic: the first steps plus the steps of all sections, in display order. */
export const allHelpSteps = (c: HelpTopicContent): string[] => [...c.steps, ...(c.sections ?? []).flatMap((s) => s.steps)]

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

  // F7600 CRM-Backbone (org cut): organisations with a lead status, channels with exactly one owner, relations
  // person x organisation, send gate. UI words are the labels of system-admin-translations.ts (EN and EL).
  crm: {
    en: {
      title: 'CRM: organisations and outreach',
      summary: 'Work with organisations and their lead status, channels with one owner, outreach with the send gate, opt-out and the review list.',
      intro: 'The CRM holds organisations (companies, shops, offices) with their lead status, the people who work there and every message we send. A channel, such as an e-mail address or a phone number, belongs to exactly one owner. Sending is limited by global safety settings. People, relations and personal channels are explained in topic 5b "CRM: people and relations".',
      rules: [
        'A channel belongs to exactly one owner: the organisation (info@, the official number), a relation (the company e-mail of a person at this organisation) or a person (private number or e-mail). A value is stored only once in the CRM, never twice.',
        'Reference, not copy: if the company address (for example info@) is the best way to reach a person, choose it as the "Preferred channel" of the relation. Do not enter it again at the person.',
        'The name of a person is built from first and last name as soon as one of them is filled; the field "Name" is then locked. Filling in the parts later replaces a free name. Details in topic 5b.',
        'Nothing is inherited between a head office and its branches: no channels, no responsible admin, no opt-out. Each one is an organisation of its own.',
        'An opt-out works by owner: through a channel of the organisation it blocks the organisation; through a channel of a person it blocks the person and not the company, unless the person has the role "Owner".',
        'One approval allows exactly one send to one recipient. A second send needs a new approval.',
        'Business cards: a mobile number becomes a channel of the person only if the card also shows a landline.',
      ],
      steps: [
        'Open "CRM": the list "Organisations" (/admin/crm/orgs) opens. Search first, so you do not create a second record: type at least 2 characters of the name or the legal name, or an exact e-mail address or phone number.',
        'Filter the list by "Lead status" or click "Only acquisition targets". At the top you also find "People", "Review list" and "Safety settings".',
      ],
      sections: [
        {
          heading: 'Organisations and lead status',
          steps: [
            'Click "Add organisation" and fill in "Organisation name", "City" and "Category / Industry". "Acquisition target (lead status Sourced)" is ticked by default: keep it only if we want to win the organisation as a customer; then an e-mail address or a phone number is required. Untick it for an organisation that is only the employer of a contact person. Pick the "Source" and click "Create organisation".',
            'You do not type contact persons in here. Add them on the organisation page under "Contact persons" (topic 5b).',
            'The organisation page is one page per company, in this order: "Lead status and actions", "Master data", "Head office and branches", "Channels of the organisation", "Contact persons", "Sources and proofs", "Outreach", "Document an interaction" and the "Interaction timeline".',
            'The lead status shows where we stand with the organisation. Empty means "No acquisition target": the organisation exists only as an employer or as the other side of a relation, does not count in the acquisition figures and gets no outreach, but you can still find it. "Make acquisition target" sets the lead status to "Sourced".',
            'An organisation in "Needs review" waits for a human decision: look at the details and set the next status yourself with "Set lead status". Click "Confirm business" only for a real business; it puts the organisation in "Queued", and from then on it can receive e-mails. A final lead status (for example "Hard opt-out" or "Registered") cannot be changed any more.',
            'If a conversation took place outside the system (WhatsApp chat, phone call, personal note), record it in "Document an interaction": what happened, the channel, when, who on our side, who on their side (or the contact person) and the content.',
          ],
        },
        {
          heading: 'Head office and branches',
          steps: [
            'A chain has one level only. Open the branch, click "Edit" under "Master data" (the form "Edit organisation" opens) and pick the head office in "Belongs to (head office)". Only organisations without a head office of their own are offered. The branch then shows "Branch of …" with a link, and the head office lists its branches.',
            'The head office is an organisation of its own with its own address, channels and lead status. Nothing is inherited: an opt-out of the head office does not block a branch, and a branch without channels is not reachable even if the head office has some. An organisation with branches cannot become a branch itself.',
            'An area manager is a person with the role "Manager" and one relation to each branch they look after; write the area into the "Note" of the relation (for example "Region West"). A change of area manager across many branches is done by the tech team with a script, not in the admin: ask the team lead.',
          ],
        },
        {
          heading: 'Channels',
          steps: [
            'Keep the company channels under "Channels of the organisation": info@, the official number, the WhatsApp number of the shop. Channels of a person are kept at the relation or at the person (topic 5b).',
            'Each channel shows "Type", "Value", "Legal tier", "Origin", "Consent", "Reachable" and "Preferred". "Check owner" marks a channel whose owner is unclear: decide, and if needed click "Move" and pick the "New owner".',
            'When you add a value, the CRM checks who already owns it. If it belongs to the organisation, choose it as the preferred channel of the relation instead. If it belongs to another person, it is a shared channel and stays at the organisation. If it already belongs to the same person in another relation, confirm "Keep as personal channel".',
            'An acquisition target must stay reachable. If you remove the last reachable channel, the CRM asks whether to remove it anyway and set the lead status to UNREACHABLE ("Remove and set UNREACHABLE").',
          ],
        },
        {
          heading: 'Outreach and the send gate',
          steps: [
            'In "Outreach" pick the "Recipient": a channel of the organisation, a relation channel or a personal channel of a contact person with an active relation. The default recipient is marked. Blocked channels, ended relations and people without an active relation are not offered. The message always belongs to the organisation.',
            'Click "Load preview", check "Subject" and "Body" and click "Send email". An organisation in "Queued" moves to "Contacted".',
            'Send gate: every send has a "Legal tier" (Green, Amber or Red), the stricter one of the organisation and the channel. "Legal tiers that need an admin approval before sending" in the safety settings decides which tiers need an approval (default: only Red). For such a recipient a warning box appears ("Legal tier Red: sending only after admin approval.") and "Send email" stays disabled.',
            'An admin with the permission crm:send_approve clicks "Approve", writes a reason in "Reason (10 to 500 characters)" (required) and confirms. One approval allows exactly one send to this recipient and expires after 7 days; then "Send email" is active. You may approve your own send if you have the permission. Without it, the box says that an admin with this permission has to approve first.',
            'The tier of the organisation is changed with "Change legal tier", the tier of a single channel in the channel list. Change a tier only with a reason and after agreement with the team lead.',
          ],
        },
        {
          heading: 'Opt-out',
          steps: [
            'The effect of an opt-out depends on the owner of the channel. An unsubscribe through a channel of the organisation, or "Suppress / Opt-out" on the organisation page, sets the organisation to "Hard opt-out" and blocks all its channels: no more outreach in the name of this company, also not to its contact persons.',
            'An unsubscribe through a relation channel or a personal channel blocks the person: all their personal and relation channels are blocked, the person shows "Opted out" and appears in no recipient list. The organisations keep their lead status and their own channels.',
            'Owner rule: if the person has an active relation with the role "Owner", the objection also blocks that organisation ("Hard opt-out" and its channels). The switch "Owner rule on objection" in the safety settings is on by default; it protects sole traders.',
            'If someone asks by phone or in person not to be contacted any more, act at once: for the company use "Suppress / Opt-out" with the matching reason. The admin has no button yet for the objection of a single person; tell the team lead straight away.',
          ],
        },
        {
          heading: 'Review list and business cards',
          steps: [
            'Open "Review list" (/admin/crm/review). It has four categories: "Legacy cases" (records from before the switch to organisations), "Check channel assignment" (channels with an unclear owner or a value that already belongs to someone else), "Relations without role" and "People without first or last name". Each entry links to the organisation or the person; close it with "Done" or "Dismiss". Computed entries disappear by themselves once fixed.',
            'A business card sent through Telegram creates or updates an organisation with the lead status "Needs review". The card photo is under "Sources and proofs". Check the details and the channels, then click "Confirm card", or "Reject (private)" for a private person.',
            'Card rule: if the card shows a landline and a mobile number, the landline stays with the organisation and the mobile becomes a channel of the person (relation). Mobile numbers alone stay with the organisation, even with a name on the card. Service numbers starting with 7 or 8 count as a landline. info@ and other function mailboxes go to the organisation, an e-mail that contains the name of the person goes to the relation.',
            'Anything unclear stays at the organisation, is marked "Check owner" and is listed under "Check channel assignment"; the organisation page shows the hint until you have decided. A card without the name of a person creates only channels of the organisation. A role is set only if the card names a clear function; otherwise the relation shows "Role missing".',
          ],
        },
        {
          heading: 'Safety settings',
          steps: [
            'Open "Safety settings": the kill switch stops all outbound sending, the send limits cap the e-mails per 24 hours, "Owner rule on objection" and "Legal tiers that need an admin approval before sending" control the opt-out and the send gate. Change them only after agreement with the team lead.',
          ],
        },
      ],
      notes: [
        { kind: 'warning', text: 'An organisation in "Hard opt-out" and a person marked "Opted out" must never be written to again. If the kill switch is on, no message leaves the system at all.' },
        { kind: 'warning', text: 'Do not enter private data you are not allowed to keep. Record only what is needed for the business relationship.' },
        { kind: 'tip', text: 'Old bookmarks from before the switch to organisations lead to an error page. Start from "CRM" in the sidebar.' },
      ],
    },
    el: {
      title: 'CRM: οργανισμοί και προσέγγιση',
      summary: 'Εργασία με οργανισμούς και την κατάσταση lead τους, κανάλια με έναν κάτοχο, προσέγγιση με έγκριση πριν από την αποστολή, opt-out και λίστα ελέγχου.',
      intro: 'Το CRM περιέχει οργανισμούς (εταιρείες, καταστήματα, γραφεία) με την κατάσταση lead τους, τα πρόσωπα που εργάζονται εκεί και κάθε μήνυμα που στέλνουμε. Ένα κανάλι, όπως μια διεύθυνση email ή ένας αριθμός τηλεφώνου, ανήκει σε ακριβώς έναν κάτοχο. Η αποστολή περιορίζεται από καθολικές ρυθμίσεις ασφαλείας. Τα πρόσωπα, οι σχέσεις και τα προσωπικά κανάλια εξηγούνται στο θέμα 5b «CRM: πρόσωπα και σχέσεις».',
      rules: [
        'Ένα κανάλι ανήκει σε ακριβώς έναν κάτοχο: στον οργανισμό (info@, ο επίσημος αριθμός), σε μια σχέση (το εταιρικό email ενός προσώπου σε αυτόν τον οργανισμό) ή σε ένα πρόσωπο (ιδιωτικός αριθμός ή email). Μια τιμή καταχωρίζεται μόνο μία φορά στο CRM, ποτέ δύο.',
        'Παραπομπή, όχι αντίγραφο: αν η διεύθυνση της εταιρείας (π.χ. info@) είναι ο καλύτερος τρόπος να φτάσετε σε ένα πρόσωπο, επιλέξτε την ως «Προτιμώμενο κανάλι» της σχέσης. Μην την καταχωρίσετε ξανά στο πρόσωπο.',
        'Το ονοματεπώνυμο ενός προσώπου σχηματίζεται από όνομα και επώνυμο μόλις συμπληρωθεί ένα από τα δύο· τότε το πεδίο «Ονοματεπώνυμο» κλειδώνει. Αν συμπληρώσετε τα μέρη αργότερα, αντικαθιστούν ένα ελεύθερο ονοματεπώνυμο. Λεπτομέρειες στο θέμα 5b.',
        'Μεταξύ κεντρικού και υποκαταστημάτων δεν κληρονομείται τίποτα: ούτε κανάλια ούτε υπεύθυνος διαχειριστής ούτε opt-out. Το καθένα είναι ξεχωριστός οργανισμός.',
        'Το opt-out λειτουργεί ανάλογα με τον κάτοχο: μέσω καναλιού του οργανισμού μπλοκάρει τον οργανισμό· μέσω καναλιού προσώπου μπλοκάρει το πρόσωπο και όχι την εταιρεία, εκτός αν το πρόσωπο έχει τον ρόλο «Ιδιοκτήτης/τρια».',
        'Μία έγκριση επιτρέπει ακριβώς μία αποστολή σε έναν παραλήπτη. Μια δεύτερη αποστολή χρειάζεται νέα έγκριση.',
        'Επαγγελματικές κάρτες: ένας αριθμός κινητού γίνεται κανάλι του προσώπου μόνο αν η κάρτα δείχνει και σταθερό τηλέφωνο.',
      ],
      steps: [
        'Ανοίξτε το «CRM»: ανοίγει η λίστα «Οργανισμοί» (/admin/crm/orgs). Αναζητήστε πρώτα, ώστε να μη δημιουργήσετε δεύτερη εγγραφή: πληκτρολογήστε τουλάχιστον 2 χαρακτήρες από το όνομα ή την επίσημη επωνυμία, ή ένα ακριβές email ή τηλέφωνο.',
        'Φιλτράρετε τη λίστα κατά «Κατάσταση lead» ή πατήστε «Μόνο στόχοι προσέγγισης». Στο πάνω μέρος βρίσκετε επίσης τα «Πρόσωπα», τη «Λίστα ελέγχου» και τις «Ρυθμίσεις ασφαλείας».',
      ],
      sections: [
        {
          heading: 'Οργανισμοί και κατάσταση lead',
          steps: [
            'Πατήστε «Νέος οργανισμός» και συμπληρώστε «Όνομα οργανισμού», «Πόλη» και «Κατηγορία / Κλάδος». Το «Στόχος προσέγγισης (κατάσταση lead «Εντοπίστηκε»)» είναι επιλεγμένο από προεπιλογή: κρατήστε το μόνο αν θέλουμε να κερδίσουμε τον οργανισμό ως πελάτη· τότε χρειάζεται διεύθυνση email ή αριθμός τηλεφώνου. Αφαιρέστε την επιλογή για οργανισμό που είναι μόνο ο εργοδότης ενός υπευθύνου επικοινωνίας. Επιλέξτε την «Πηγή» και πατήστε «Δημιουργία οργανισμού».',
            'Εδώ δεν πληκτρολογείτε υπευθύνους επικοινωνίας. Τους προσθέτετε στη σελίδα του οργανισμού, στην ενότητα «Υπεύθυνοι επικοινωνίας» (θέμα 5b).',
            'Η σελίδα του οργανισμού είναι μία σελίδα ανά εταιρεία, με αυτή τη σειρά: «Κατάσταση lead και ενέργειες», «Βασικά στοιχεία», «Κεντρικό και υποκαταστήματα», «Κανάλια του οργανισμού», «Υπεύθυνοι επικοινωνίας», «Πηγές και αποδεικτικά», «Προσέγγιση», «Καταγραφή αλληλεπίδρασης» και το «Χρονολόγιο αλληλεπιδράσεων».',
            'Η κατάσταση lead δείχνει πού βρισκόμαστε με τον οργανισμό. Κενή σημαίνει «Δεν είναι στόχος προσέγγισης»: ο οργανισμός υπάρχει μόνο ως εργοδότης ή ως η άλλη πλευρά μιας σχέσης, δεν μετρά στα στοιχεία προσέγγισης και δεν λαμβάνει μηνύματα, αλλά μπορείτε να τον βρείτε. Το «Ορισμός ως στόχου προσέγγισης» ορίζει την κατάσταση lead σε «Εντοπίστηκε».',
            'Ένας οργανισμός σε «Χρειάζεται έλεγχο» περιμένει ανθρώπινη απόφαση: δείτε τις λεπτομέρειες και ορίστε μόνοι σας την επόμενη κατάσταση με «Ορισμός κατάστασης lead». Πατήστε «Επιβεβαίωση επιχείρησης» μόνο για πραγματική επιχείρηση· βάζει τον οργανισμό σε «Σε ουρά» και από εκείνη τη στιγμή μπορεί να λαμβάνει email. Μια τελική κατάσταση lead (π.χ. «Οριστικό opt-out» ή «Εγγράφηκε») δεν αλλάζει πια.',
            'Αν μια συζήτηση έγινε εκτός συστήματος (συνομιλία WhatsApp, τηλεφώνημα, προσωπική σημείωση), καταγράψτε την στην «Καταγραφή αλληλεπίδρασης»: τι συνέβη, το κανάλι, πότε, ποιος από εμάς, ποιος από την άλλη πλευρά (ή ο υπεύθυνος επικοινωνίας) και το περιεχόμενο.',
          ],
        },
        {
          heading: 'Κεντρικό και υποκαταστήματα',
          steps: [
            'Μια αλυσίδα έχει μόνο ένα επίπεδο. Ανοίξτε το υποκατάστημα, πατήστε «Επεξεργασία» στα «Βασικά στοιχεία» (ανοίγει η φόρμα «Επεξεργασία οργανισμού») και επιλέξτε το κεντρικό στο «Ανήκει στο (κεντρικό)». Προτείνονται μόνο οργανισμοί χωρίς δικό τους κεντρικό. Το υποκατάστημα δείχνει τότε «Υποκατάστημα του …» με σύνδεσμο και το κεντρικό δείχνει τα υποκαταστήματά του.',
            'Το κεντρικό είναι ξεχωριστός οργανισμός με δική του διεύθυνση, κανάλια και κατάσταση lead. Δεν κληρονομείται τίποτα: ένα opt-out του κεντρικού δεν μπλοκάρει κανένα υποκατάστημα, και ένα υποκατάστημα χωρίς κανάλια δεν είναι προσβάσιμο, ακόμη κι αν το κεντρικό έχει. Ένας οργανισμός με υποκαταστήματα δεν μπορεί να γίνει ο ίδιος υποκατάστημα.',
            'Ένας υπεύθυνος περιοχής είναι πρόσωπο με τον ρόλο «Διευθυντής/τρια» και μία σχέση με κάθε υποκατάστημα που παρακολουθεί· γράψτε την περιοχή στη «Σημείωση» της σχέσης (π.χ. «Περιοχή Δύσης»). Η αλλαγή υπευθύνου περιοχής για πολλά υποκαταστήματα γίνεται από την τεχνική ομάδα με σενάριο (script), όχι στο admin: ρωτήστε τον υπεύθυνο της ομάδας.',
          ],
        },
        {
          heading: 'Κανάλια',
          steps: [
            'Κρατήστε τα εταιρικά κανάλια στα «Κανάλια του οργανισμού»: info@, ο επίσημος αριθμός, ο αριθμός WhatsApp του καταστήματος. Τα κανάλια ενός προσώπου καταχωρίζονται στη σχέση ή στο πρόσωπο (θέμα 5b).',
            'Κάθε κανάλι δείχνει «Τύπος», «Τιμή», «Νομική βαθμίδα», «Προέλευση», «Συγκατάθεση», «Προσβάσιμο» και «Προτιμώμενο». Το «Έλεγχος κατόχου» σημαίνει κανάλι με ασαφή κάτοχο: αποφασίστε και, αν χρειάζεται, πατήστε «Μεταφορά» και επιλέξτε τον «Νέος κάτοχος».',
            'Όταν προσθέτετε μια τιμή, το CRM ελέγχει σε ποιον ανήκει ήδη. Αν ανήκει στον οργανισμό, επιλέξτε την αντί γι\' αυτό ως προτιμώμενο κανάλι της σχέσης. Αν ανήκει σε άλλο πρόσωπο, είναι κοινό κανάλι και μένει στον οργανισμό. Αν ανήκει ήδη στο ίδιο πρόσωπο σε άλλη σχέση, επιβεβαιώστε «Διατήρηση ως προσωπικό κανάλι».',
            'Ένας στόχος προσέγγισης πρέπει να μένει προσβάσιμος. Αν αφαιρέσετε το τελευταίο προσβάσιμο κανάλι, το CRM ρωτά αν θέλετε να το αφαιρέσετε παρ\' όλα αυτά και να ορίσετε την κατάσταση lead σε UNREACHABLE («Αφαίρεση και ορισμός UNREACHABLE»).',
          ],
        },
        {
          heading: 'Προσέγγιση και έγκριση πριν από την αποστολή',
          steps: [
            'Στην «Προσέγγιση» επιλέξτε τον «Παραλήπτης»: κανάλι του οργανισμού, κανάλι σχέσης ή προσωπικό κανάλι ενός υπευθύνου επικοινωνίας με ενεργή σχέση. Ο προεπιλεγμένος παραλήπτης είναι σημειωμένος. Αποκλεισμένα κανάλια, σχέσεις που έληξαν και πρόσωπα χωρίς ενεργή σχέση δεν προτείνονται. Το μήνυμα ανήκει πάντα στον οργανισμό.',
            'Πατήστε «Φόρτωση προεπισκόπησης», ελέγξτε «Θέμα» και «Κείμενο» και πατήστε «Αποστολή email». Ένας οργανισμός σε «Σε ουρά» περνά σε «Έγινε επικοινωνία».',
            'Έγκριση πριν από την αποστολή: κάθε αποστολή έχει «Νομική βαθμίδα» (Πράσινη, Πορτοκαλί ή Κόκκινη), την αυστηρότερη μεταξύ οργανισμού και καναλιού. Οι «Νομικές βαθμίδες που χρειάζονται έγκριση διαχειριστή πριν από την αποστολή» στις ρυθμίσεις ασφαλείας ορίζουν ποιες βαθμίδες χρειάζονται έγκριση (προεπιλογή: μόνο Κόκκινη). Για τέτοιον παραλήπτη εμφανίζεται πλαίσιο προειδοποίησης («Νομική βαθμίδα Κόκκινη: αποστολή μόνο μετά από έγκριση διαχειριστή.») και η «Αποστολή email» μένει ανενεργή.',
            'Ένας διαχειριστής με το δικαίωμα crm:send_approve πατά «Έγκριση», γράφει αιτιολόγηση στο «Αιτιολόγηση (10 έως 500 χαρακτήρες)» (υποχρεωτικό) και επιβεβαιώνει. Μία έγκριση επιτρέπει ακριβώς μία αποστολή σε αυτόν τον παραλήπτη και λήγει μετά από 7 ημέρες· τότε η «Αποστολή email» ενεργοποιείται. Μπορείτε να εγκρίνετε τη δική σας αποστολή αν έχετε το δικαίωμα. Χωρίς αυτό, το πλαίσιο λέει ότι πρέπει πρώτα να την εγκρίνει διαχειριστής με αυτό το δικαίωμα.',
            'Η βαθμίδα του οργανισμού αλλάζει με «Αλλαγή νομικής βαθμίδας», η βαθμίδα ενός μεμονωμένου καναλιού στη λίστα καναλιών. Αλλάξτε μια βαθμίδα μόνο με αιτιολόγηση και μετά από συμφωνία με τον υπεύθυνο της ομάδας.',
          ],
        },
        {
          heading: 'Αποκλεισμός / Opt-out',
          steps: [
            'Το αποτέλεσμα ενός opt-out εξαρτάται από τον κάτοχο του καναλιού. Μια διαγραφή από τη λίστα μέσω καναλιού του οργανισμού, ή το «Αποκλεισμός / Opt-out» στη σελίδα του οργανισμού, ορίζει τον οργανισμό σε «Οριστικό opt-out» και μπλοκάρει όλα τα κανάλια του: καμία προσέγγιση πια στο όνομα αυτής της εταιρείας, ούτε προς τους υπευθύνους επικοινωνίας της.',
            'Μια διαγραφή από τη λίστα μέσω καναλιού σχέσης ή προσωπικού καναλιού μπλοκάρει το πρόσωπο: όλα τα προσωπικά κανάλια και τα κανάλια σχέσεών του μπλοκάρονται, το πρόσωπο δείχνει «Έχει προβάλει αντίρρηση» και δεν εμφανίζεται σε καμία λίστα παραληπτών. Οι οργανισμοί κρατούν την κατάσταση lead και τα δικά τους κανάλια.',
            'Κανόνας ιδιοκτήτη: αν το πρόσωπο έχει ενεργή σχέση με τον ρόλο «Ιδιοκτήτης/τρια», η αντίρρηση μπλοκάρει και αυτόν τον οργανισμό («Οριστικό opt-out» και τα κανάλια του). Ο διακόπτης «Κανόνας ιδιοκτήτη σε αντίρρηση» στις ρυθμίσεις ασφαλείας είναι ενεργός από προεπιλογή· προστατεύει τις ατομικές επιχειρήσεις.',
            'Αν κάποιος ζητήσει τηλεφωνικά ή αυτοπροσώπως να μην επικοινωνούμε πια μαζί του, ενεργήστε αμέσως: για την εταιρεία χρησιμοποιήστε το «Αποκλεισμός / Opt-out» με τον σωστό λόγο. Το admin δεν έχει ακόμη κουμπί για την αντίρρηση ενός μεμονωμένου προσώπου· ενημερώστε αμέσως τον υπεύθυνο της ομάδας.',
          ],
        },
        {
          heading: 'Λίστα ελέγχου και επαγγελματικές κάρτες',
          steps: [
            'Ανοίξτε τη «Λίστα ελέγχου» (/admin/crm/review). Έχει τέσσερις κατηγορίες: «Παλαιές περιπτώσεις» (εγγραφές από πριν από τη μετάβαση σε οργανισμούς), «Έλεγχος αντιστοίχισης καναλιών» (κανάλια με ασαφή κάτοχο ή τιμή που ανήκει ήδη σε κάποιον άλλο), «Σχέσεις χωρίς ρόλο» και «Πρόσωπα χωρίς όνομα ή επώνυμο». Κάθε καταχώριση συνδέεται με τον οργανισμό ή το πρόσωπο· κλείστε την με «Ολοκληρώθηκε» ή «Παράβλεψη». Οι υπολογιζόμενες καταχωρίσεις εξαφανίζονται μόνες τους μόλις διορθωθούν.',
            'Μια επαγγελματική κάρτα που στέλνεται μέσω Telegram δημιουργεί ή ενημερώνει έναν οργανισμό με κατάσταση lead «Χρειάζεται έλεγχο». Η φωτογραφία της κάρτας βρίσκεται στις «Πηγές και αποδεικτικά». Ελέγξτε τα στοιχεία και τα κανάλια και πατήστε «Επιβεβαίωση κάρτας», ή «Απόρριψη (ιδιώτης)» για ιδιώτη.',
            'Κανόνας κάρτας: αν η κάρτα δείχνει σταθερό τηλέφωνο και κινητό, το σταθερό μένει στον οργανισμό και το κινητό γίνεται κανάλι του προσώπου (σχέση). Κινητά χωρίς σταθερό μένουν στον οργανισμό, ακόμη κι αν η κάρτα έχει όνομα. Οι αριθμοί υπηρεσιών που αρχίζουν από 7 ή 8 μετρούν ως σταθερό. Το info@ και άλλες γραμματοθυρίδες λειτουργιών πηγαίνουν στον οργανισμό, ένα email που περιέχει το όνομα του προσώπου πηγαίνει στη σχέση.',
            'Ό,τι είναι ασαφές μένει στον οργανισμό, σημειώνεται με «Έλεγχος κατόχου» και εμφανίζεται στον «Έλεγχος αντιστοίχισης καναλιών»· η σελίδα του οργανισμού δείχνει την ένδειξη μέχρι να αποφασίσετε. Μια κάρτα χωρίς όνομα προσώπου δημιουργεί μόνο κανάλια του οργανισμού. Ρόλος ορίζεται μόνο αν η κάρτα αναφέρει σαφή θέση· διαφορετικά η σχέση δείχνει «Λείπει ρόλος».',
          ],
        },
        {
          heading: 'Ρυθμίσεις ασφαλείας',
          steps: [
            'Ανοίξτε τις «Ρυθμίσεις ασφαλείας»: ο διακόπτης έκτακτης ανάγκης (kill switch) σταματά κάθε εξερχόμενη αποστολή, τα όρια αποστολής περιορίζουν τα email ανά 24 ώρες, ο «Κανόνας ιδιοκτήτη σε αντίρρηση» και οι «Νομικές βαθμίδες που χρειάζονται έγκριση διαχειριστή πριν από την αποστολή» ρυθμίζουν το opt-out και την έγκριση πριν από την αποστολή. Αλλάξτε τα μόνο μετά από συμφωνία με τον υπεύθυνο της ομάδας.',
          ],
        },
      ],
      notes: [
        { kind: 'warning', text: 'Σε έναν οργανισμό με «Οριστικό opt-out» και σε ένα πρόσωπο με «Έχει προβάλει αντίρρηση» δεν στέλνουμε ποτέ ξανά μήνυμα. Αν ο διακόπτης έκτακτης ανάγκης είναι ενεργός, κανένα μήνυμα δεν φεύγει από το σύστημα.' },
        { kind: 'warning', text: 'Μην καταχωρείτε ιδιωτικά δεδομένα που δεν επιτρέπεται να κρατάτε. Καταγράφετε μόνο ό,τι χρειάζεται για την επαγγελματική σχέση.' },
        { kind: 'tip', text: 'Παλιοί σελιδοδείκτες από πριν από τη μετάβαση σε οργανισμούς οδηγούν σε σελίδα σφάλματος. Ξεκινήστε από το «CRM» στην πλευρική στήλη.' },
      ],
    },
  },

  'crm-persons': {
    en: {
      title: 'CRM: people and relations',
      summary: 'Keep a person once with name, salutation and birthday, link them to organisations through relations and keep their channels with the right owner.',
      intro: 'A person is one natural human, stored once. A relation connects a person with an organisation: it has a period, a note, a set of roles and its own channels. Channels that belong to the person and not to one company are personal channels. Organisations, their lead status and outreach are explained in topic 5 "CRM: organisations and outreach".',
      rules: [
        'A channel belongs to exactly one owner: the organisation (info@, the official number), the relation (the company e-mail of the person at this organisation) or the person (private number or e-mail). Never enter the same value twice.',
        'Reference, not copy: info@ of the company stays with the company. If it is the best way to reach the person, choose it as the "Preferred channel" of the relation instead of entering it again.',
        'The name is built from first and last name: as soon as "First name" or "Last name" is filled, the system builds "Name" itself (first name, then last name) and the field is locked. Filling in the parts later replaces a free name; the CRM shows the old and the new name and asks you to confirm with "Replace name".',
        'Roles have no dates. Only the relation has a period ("From", "Until"). Write the role history or an area into the "Note" of the relation.',
        'Personal channels without a relation are allowed, but a person can only be written to through an active relation to an organisation.',
        'Set a salutation only when it is known or confirmed, never guess it from the name.',
      ],
      steps: [
        'Open "CRM" and click "People" at the top of the list "Organisations" (/admin/crm/persons). The list shows the name, the badge "Opted out" and the number of "Active relations".',
        'Search first, so you do not create a person twice: type at least 3 characters of the name, or an exact e-mail address or phone number, and click "Search".',
      ],
      sections: [
        {
          heading: 'Add a person',
          steps: [
            'Click "Add person". Fill in "First name" and "Last name" when you can tell them apart safely. "Name" is then built from them and locked (hint "Built from first and last name.").',
            'If the parts cannot be told apart safely, for example on a business card in a foreign language, leave first and last name empty and type the full name into "Name" (free name).',
            '"Salutation": choose Mr, Ms, Mx, Dr or "No salutation" only when it is known or confirmed; otherwise leave it at "— not set —".',
            '"Birthday" is voluntary and personal. If you know only day and month, tick "Year unknown": the year field disappears, and only day and month are stored and shown. The birthday is shown only on the person page and never with an age.',
            'A personal e-mail address, a phone number and an address are optional. Click "Add person". If a value already belongs to another person, the CRM says so and offers "Open that person".',
          ],
        },
        {
          heading: 'Change name and master data',
          steps: [
            'On the person page change the same fields under "Master data" and click "Save". If the person has a free name and you fill in first or last name, the CRM shows that the current name will be replaced by the new one; confirm with "Replace name". If you empty both parts again, "Name" becomes editable again and keeps the last built name.',
            '"Remove address" detaches the address from the person.',
          ],
        },
        {
          heading: 'Relations to organisations',
          steps: [
            'Under "Relations to organisations" click the field "Organisation", type at least 2 characters of its name and pick the right one (city and category tell organisations with the same name apart). Tick the roles (none is allowed), set "From" if you know it, add a "Note" and click "Add relation".',
            'You can also start on the organisation page: under "Contact persons" search the person (at least 3 characters), choose roles and a note and click "Add contact person". If the person does not exist yet, create them first under "People".',
            'Each relation shows its "Period", its "Roles" and its "Note". Add a role with "Add role" and remove one with "Remove role …". A relation without a role is valid and shows "Role missing"; the review list also lists it under "Relations without role".',
            'Use the "Note" for anything without a field: the role history ("until 2025 also IT") or an area ("Region West"). "Edit period, note and work location" changes these; the "Work location" is the "Organisation address" unless the person works somewhere else.',
            'When someone leaves an organisation, click "End relation" and confirm. The relation ends today and stays in the history; its channels are no longer offered as recipients.',
            'An area manager who looks after several branches has one relation with the role "Manager" to each branch, with the area in the note. A change of area manager across many branches is done by the tech team with a script, not in the admin: ask the team lead.',
          ],
        },
        {
          heading: 'Channels of a person',
          steps: [
            'A company e-mail or a work mobile that the person uses at one organisation goes into "Channels of this relation" of that relation. It is offered as a recipient only for this organisation.',
            'A private number or e-mail that is the same for all their organisations goes into "Personal channels (valid for all relations)". These channels are allowed without a relation, but the person can only be written to through an active relation to an organisation.',
            '"Preferred channel" of a relation: choose a channel of the relation, a personal channel of the person or a channel of the same organisation. A channel of another organisation, also of a head office, cannot be chosen.',
            'If a value you add already belongs to the organisation, the CRM offers "Choose as preferred channel of the relation" instead of a copy. If it belongs to another person, it is a shared channel: keep it at the organisation. If it is already a channel of the same person in another relation, confirm "Keep as personal channel"; the value is then stored once and both relations can point to it.',
          ],
        },
      ],
      notes: [
        { kind: 'warning', text: 'An objection of a person cannot be undone in the admin. It blocks all personal and relation channels of the person; with the role "Owner" it also blocks the organisation (owner rule, topic 5).' },
        { kind: 'warning', text: 'A person holds private data. Record only what is needed for the business relationship and do not copy it into chats or tickets outside the team. The birthday and the salutation are never used to find or merge people.' },
      ],
    },
    el: {
      title: 'CRM: πρόσωπα και σχέσεις',
      summary: 'Κρατήστε ένα πρόσωπο μία φορά με ονοματεπώνυμο, προσφώνηση και γενέθλια, συνδέστε το με οργανισμούς μέσω σχέσεων και κρατήστε τα κανάλια του στον σωστό κάτοχο.',
      intro: 'Ένα πρόσωπο είναι ένας φυσικός άνθρωπος, που αποθηκεύεται μία φορά. Μια σχέση συνδέει ένα πρόσωπο με έναν οργανισμό: έχει περίοδο, σημείωση, ένα σύνολο ρόλων και δικά της κανάλια. Τα κανάλια που ανήκουν στο πρόσωπο και όχι σε μία εταιρεία είναι προσωπικά κανάλια. Οι οργανισμοί, η κατάσταση lead και η προσέγγιση εξηγούνται στο θέμα 5 «CRM: οργανισμοί και προσέγγιση».',
      rules: [
        'Ένα κανάλι ανήκει σε ακριβώς έναν κάτοχο: στον οργανισμό (info@, ο επίσημος αριθμός), στη σχέση (το εταιρικό email του προσώπου σε αυτόν τον οργανισμό) ή στο πρόσωπο (ιδιωτικός αριθμός ή email). Μην καταχωρίζετε ποτέ την ίδια τιμή δύο φορές.',
        'Παραπομπή, όχι αντίγραφο: το info@ της εταιρείας μένει στην εταιρεία. Αν είναι ο καλύτερος τρόπος να φτάσετε στο πρόσωπο, επιλέξτε το ως «Προτιμώμενο κανάλι» της σχέσης αντί να το καταχωρίσετε ξανά.',
        'Το ονοματεπώνυμο σχηματίζεται από όνομα και επώνυμο: μόλις συμπληρωθεί το «Όνομα» ή το «Επώνυμο», το σύστημα σχηματίζει μόνο του το «Ονοματεπώνυμο» (πρώτα το όνομα, μετά το επώνυμο) και το πεδίο κλειδώνει. Αν συμπληρώσετε τα μέρη αργότερα, αντικαθιστούν ένα ελεύθερο ονοματεπώνυμο· το CRM δείχνει το παλιό και το νέο και ζητά επιβεβαίωση με «Αντικατάσταση ονόματος».',
        'Οι ρόλοι δεν έχουν ημερομηνίες. Περίοδο («Από», «Έως») έχει μόνο η σχέση. Γράψτε το ιστορικό ρόλων ή μια περιοχή στη «Σημείωση» της σχέσης.',
        'Προσωπικά κανάλια χωρίς σχέση επιτρέπονται, αλλά σε ένα πρόσωπο μπορούμε να γράψουμε μόνο μέσω ενεργής σχέσης με οργανισμό.',
        'Ορίστε προσφώνηση μόνο όταν είναι γνωστή ή επιβεβαιωμένη, ποτέ με εικασία από το όνομα.',
      ],
      steps: [
        'Ανοίξτε το «CRM» και πατήστε «Πρόσωπα» στο πάνω μέρος της λίστας «Οργανισμοί» (/admin/crm/persons). Η λίστα δείχνει το ονοματεπώνυμο, την ένδειξη «Έχει προβάλει αντίρρηση» και τον αριθμό «Ενεργές σχέσεις».',
        'Αναζητήστε πρώτα, ώστε να μη δημιουργήσετε το ίδιο πρόσωπο δύο φορές: πληκτρολογήστε τουλάχιστον 3 χαρακτήρες από το ονοματεπώνυμο, ή ένα ακριβές email ή τηλέφωνο, και πατήστε «Αναζήτηση».',
      ],
      sections: [
        {
          heading: 'Προσθήκη προσώπου',
          steps: [
            'Πατήστε «Προσθήκη προσώπου». Συμπληρώστε «Όνομα» και «Επώνυμο» όταν μπορείτε να τα ξεχωρίσετε με ασφάλεια. Το «Ονοματεπώνυμο» σχηματίζεται τότε από αυτά και κλειδώνει (ένδειξη «Σχηματίζεται από όνομα και επώνυμο.»).',
            'Αν τα μέρη δεν διακρίνονται με ασφάλεια, π.χ. σε επαγγελματική κάρτα σε ξένη γλώσσα, αφήστε όνομα και επώνυμο κενά και πληκτρολογήστε ολόκληρο το όνομα στο «Ονοματεπώνυμο» (ελεύθερο ονοματεπώνυμο).',
            '«Προσφώνηση»: επιλέξτε Κος, Κα, Mx (ουδέτερη), Δρ ή «Χωρίς προσφώνηση» μόνο όταν είναι γνωστή ή επιβεβαιωμένη· διαφορετικά αφήστε την στο «— δεν έχει οριστεί —».',
            'Τα «Γενέθλια» είναι προαιρετικό και προσωπικό στοιχείο. Αν ξέρετε μόνο ημέρα και μήνα, επιλέξτε «Άγνωστο έτος»: το πεδίο του έτους εξαφανίζεται και αποθηκεύονται και εμφανίζονται μόνο ημέρα και μήνας. Τα γενέθλια εμφανίζονται μόνο στη σελίδα του προσώπου και ποτέ με ηλικία.',
            'Προσωπικό email, αριθμός τηλεφώνου και διεύθυνση είναι προαιρετικά. Πατήστε «Προσθήκη προσώπου». Αν μια τιμή ανήκει ήδη σε άλλο πρόσωπο, το CRM το λέει και προσφέρει «Άνοιγμα αυτού του προσώπου».',
          ],
        },
        {
          heading: 'Αλλαγή ονόματος και βασικών στοιχείων',
          steps: [
            'Στη σελίδα του προσώπου αλλάζετε τα ίδια πεδία στα «Βασικά στοιχεία» και πατάτε «Αποθήκευση». Αν το πρόσωπο έχει ελεύθερο ονοματεπώνυμο και συμπληρώσετε όνομα ή επώνυμο, το CRM δείχνει ότι το τρέχον ονοματεπώνυμο θα αντικατασταθεί από το νέο· επιβεβαιώστε με «Αντικατάσταση ονόματος». Αν αδειάσετε ξανά και τα δύο μέρη, το «Ονοματεπώνυμο» γίνεται ξανά επεξεργάσιμο και κρατά το τελευταίο σχηματισμένο όνομα.',
            'Η «Αφαίρεση διεύθυνσης» αποσυνδέει τη διεύθυνση από το πρόσωπο.',
          ],
        },
        {
          heading: 'Σχέσεις με οργανισμούς',
          steps: [
            'Στις «Σχέσεις με οργανισμούς» πατήστε το πεδίο «Οργανισμός», πληκτρολογήστε τουλάχιστον 2 χαρακτήρες από το όνομά του και επιλέξτε τον σωστό (η πόλη και η κατηγορία ξεχωρίζουν οργανισμούς με το ίδιο όνομα). Επιλέξτε τους ρόλους (επιτρέπεται και κανένας), ορίστε το «Από» αν το ξέρετε, προσθέστε «Σημείωση» και πατήστε «Προσθήκη σχέσης».',
            'Μπορείτε να ξεκινήσετε και από τη σελίδα του οργανισμού: στους «Υπεύθυνοι επικοινωνίας» αναζητήστε το πρόσωπο (τουλάχιστον 3 χαρακτήρες), επιλέξτε ρόλους και σημείωση και πατήστε «Προσθήκη υπευθύνου επικοινωνίας». Αν το πρόσωπο δεν υπάρχει ακόμη, δημιουργήστε το πρώτα στα «Πρόσωπα».',
            'Κάθε σχέση δείχνει την «Περίοδος», τους «Ρόλοι» και τη «Σημείωση». Προσθέστε ρόλο με «Προσθήκη ρόλου» και αφαιρέστε με «Αφαίρεση ρόλου …». Μια σχέση χωρίς ρόλο είναι έγκυρη και δείχνει «Λείπει ρόλος»· η λίστα ελέγχου τη δείχνει επίσης στις «Σχέσεις χωρίς ρόλο».',
            'Χρησιμοποιήστε τη «Σημείωση» για ό,τι δεν έχει δικό του πεδίο: το ιστορικό ρόλων («έως 2025 και IT») ή μια περιοχή («Περιοχή Δύσης»). Η «Επεξεργασία περιόδου, σημείωσης και τόπου εργασίας» τα αλλάζει· ο «Τόπος εργασίας» είναι η «Διεύθυνση του οργανισμού», εκτός αν το πρόσωπο εργάζεται αλλού.',
            'Όταν κάποιος φεύγει από έναν οργανισμό, πατήστε «Λήξη σχέσης» και επιβεβαιώστε. Η σχέση λήγει σήμερα και μένει στο ιστορικό· τα κανάλια της δεν προτείνονται πλέον ως παραλήπτες.',
            'Ένας υπεύθυνος περιοχής που παρακολουθεί πολλά υποκαταστήματα έχει μία σχέση με τον ρόλο «Διευθυντής/τρια» με κάθε υποκατάστημα, με την περιοχή στη σημείωση. Η αλλαγή υπευθύνου περιοχής για πολλά υποκαταστήματα γίνεται από την τεχνική ομάδα με σενάριο (script), όχι στο admin: ρωτήστε τον υπεύθυνο της ομάδας.',
          ],
        },
        {
          heading: 'Κανάλια ενός προσώπου',
          steps: [
            'Ένα εταιρικό email ή ένα κινητό εργασίας που το πρόσωπο χρησιμοποιεί σε έναν οργανισμό καταχωρίζεται στα «Κανάλια αυτής της σχέσης» εκείνης της σχέσης. Προτείνεται ως παραλήπτης μόνο για αυτόν τον οργανισμό.',
            'Ένας ιδιωτικός αριθμός ή ένα email που είναι ίδιο για όλους τους οργανισμούς του καταχωρίζεται στα «Προσωπικά κανάλια (ισχύουν για όλες τις σχέσεις)». Αυτά τα κανάλια επιτρέπονται χωρίς σχέση, αλλά στο πρόσωπο μπορούμε να γράψουμε μόνο μέσω ενεργής σχέσης με οργανισμό.',
            '«Προτιμώμενο κανάλι» μιας σχέσης: επιλέξτε κανάλι της σχέσης, προσωπικό κανάλι του προσώπου ή κανάλι του ίδιου οργανισμού. Κανάλι άλλου οργανισμού, ακόμη και του κεντρικού, δεν μπορεί να επιλεγεί.',
            'Αν μια τιμή που προσθέτετε ανήκει ήδη στον οργανισμό, το CRM προσφέρει «Επιλογή ως προτιμώμενο κανάλι της σχέσης» αντί για αντίγραφο. Αν ανήκει σε άλλο πρόσωπο, είναι κοινό κανάλι: κρατήστε την στον οργανισμό. Αν είναι ήδη κανάλι του ίδιου προσώπου σε άλλη σχέση, επιβεβαιώστε «Διατήρηση ως προσωπικό κανάλι»· η τιμή αποθηκεύεται τότε μία φορά και και οι δύο σχέσεις μπορούν να παραπέμπουν σε αυτήν.',
          ],
        },
      ],
      notes: [
        { kind: 'warning', text: 'Η αντίρρηση ενός προσώπου δεν αναιρείται από το admin. Μπλοκάρει όλα τα προσωπικά κανάλια και τα κανάλια σχέσεων του προσώπου· με τον ρόλο «Ιδιοκτήτης/τρια» μπλοκάρει και τον οργανισμό (κανόνας ιδιοκτήτη, θέμα 5).' },
        { kind: 'warning', text: 'Ένα πρόσωπο περιέχει προσωπικά δεδομένα. Καταγράφετε μόνο ό,τι χρειάζεται για την επαγγελματική σχέση και μην τα αντιγράφετε σε συνομιλίες ή tickets εκτός ομάδας. Τα γενέθλια και η προσφώνηση δεν χρησιμοποιούνται ποτέ για εύρεση ή συγχώνευση προσώπων.' },
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
        'The tab "Photos without result" lists review photos that the automatic photo check has not decided on after 30 minutes (oldest first). Look at the photo and click "Approve photo" or "Reject photo" and confirm; for a rejection tick the matching categories and optionally add a reason. Photos marked "Already visible" belong to trusted users and are public already.',
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
        'Η καρτέλα «Φωτογραφίες χωρίς αποτέλεσμα» εμφανίζει φωτογραφίες αξιολογήσεων για τις οποίες ο αυτόματος έλεγχος δεν αποφάσισε μετά από 30 λεπτά (πρώτες οι παλαιότερες). Δείτε τη φωτογραφία και πατήστε «Έγκριση φωτογραφίας» ή «Απόρριψη φωτογραφίας» και επιβεβαιώστε· για απόρριψη επιλέξτε τις κατάλληλες κατηγορίες και προαιρετικά προσθέστε αιτιολογία. Οι φωτογραφίες με την ένδειξη «Ήδη ορατή» ανήκουν σε αξιόπιστους χρήστες και είναι ήδη δημόσιες.',
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
