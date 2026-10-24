import type { LegalContentByLang } from './legal-types'

export const legalContentEn: LegalContentByLang = {
  imprint: {
    title: 'Imprint',
    sections: [
      {
        heading: 'Company Information',
        body: 'Buhl Consulting Ltd.\nLegal form: Private Company Limited by Shares (Republic of Cyprus)\nRegistration number: HE 329258\nRegistered with: Department of Registrar of Companies and Intellectual Property, Republic of Cyprus',
      },
      {
        heading: 'Registered Office',
        body: 'Kimonos 1, Apt 104\n7040 Oroklini, Larnaka\nCyprus',
      },
      {
        heading: 'Contact',
        body: 'Email: info@pundo.cy\nWebsite: https://pundo.cy',
      },
      {
        heading: 'Represented By',
        body: 'Managing Director: Bernhard Buhl',
      },
      {
        heading: 'VAT Information',
        body: 'VAT Identification Number: CY10329258B',
      },
      {
        heading: 'Regulatory Information',
        body: 'Buhl Consulting Ltd. is subject to the laws and regulations of the Republic of Cyprus. The company is not subject to any specific regulatory authority beyond the general commercial and corporate oversight bodies of the Republic of Cyprus.',
      },
      {
        heading: 'Responsible for Content',
        body: 'Buhl Consulting Ltd.\nKimonos 1, Apt 104\n7040 Oroklini, Larnaka, Cyprus\nEmail: info@pundo.cy',
      },
      {
        heading: 'Online Dispute Resolution',
        body: 'In accordance with Regulation (EU) No 524/2013, the European Commission provides an Online Dispute Resolution (ODR) platform for consumers residing in the EU:\nhttps://ec.europa.eu/consumers/odr\nOur email address for the purposes of the ODR platform is: info@pundo.cy\nWe are not obligated and generally not willing to participate in dispute resolution proceedings before a consumer arbitration body. However, we will assess any request on a case-by-case basis.',
      },
      {
        heading: 'Intellectual Property Notice',
        body: 'All content on this website — including texts, images, graphics, logos, and software — is the property of Buhl Consulting Ltd. or its licensors and is protected by applicable copyright and intellectual property laws.\nThe name "Pundo" and the Pundo logo are trademarks of Buhl Consulting Ltd.\nUnauthorised reproduction, distribution, or use of any content from this website is prohibited without prior written consent.',
      },
      {
        heading: 'Liability for Content',
        body: 'The content of our website has been prepared with the greatest possible care. However, we cannot guarantee the accuracy, completeness, or timeliness of the content.\nProduct information, pricing, and availability displayed on the Platform are provided by third-party Shop Partners and publicly available sources. We do not warrant the accuracy of such third-party information.',
      },
      {
        heading: 'Liability for Links',
        body: 'Our website may contain links to external third-party websites over whose content we have no influence. We therefore cannot accept any liability for this third-party content. The linked pages were checked for possible legal violations at the time of linking. If we become aware of any legal violations, we will remove such links immediately.',
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    sections: [
      {
        heading: 'Data Controller',
        body: 'Effective date: 24 October 2026\n\nThis Privacy Policy describes how Buhl Consulting Ltd. (Registration No. HE 329258) collects, uses, stores, and protects your personal data when you use the Pundo platform at https://pundo.cy.\n\nData Controller:\nBuhl Consulting Ltd.\nKimonos 1, Apt 104, 7040 Oroklini, Larnaka, Cyprus\nEmail: info@pundo.cy',
      },
      {
        heading: 'Personal Data We Collect',
        body: 'Data you provide directly:\n• Account information (name, email address, password, preferred language)\n• Communications with us (emails, contact forms, feedback)\n• User content (product photos, reviews, ratings)\n• Shop Partner data (business name, contact person, address, email, phone, tax ID, banking details)\n\nData collected automatically:\n• Usage data (pages visited, search queries, products viewed, interaction patterns)\n• Device information (device type, operating system, browser type and version)\n• Location data (approximate location from IP address, or precise location with your explicit consent)\n• Log data (IP address, access timestamps, error reports)',
      },
      {
        heading: 'How We Use Your Data',
        body: 'We process your personal data for the following purposes:\n• Providing and maintaining the Service — performance of contract\n• Creating and managing your account — performance of contract\n• Personalising your experience — legitimate interest\n• Communicating with you about the Service — performance of contract / legitimate interest\n• Sending marketing communications (with your consent) — consent\n• Analysing usage patterns and improving the Service — legitimate interest\n• Ensuring security and preventing fraud — legitimate interest\n• Complying with legal obligations — legal obligation',
      },
      {
        heading: 'Cookies and Analytics',
        body: 'Strictly necessary cookies are required for the Service to function (session management, language preferences, security) and cannot be disabled.\n\nAnalytics: We use Plausible Analytics, a privacy-focused, self-hosted tool. Plausible does not use cookies, does not collect personal data, and is fully GDPR-compliant. Our Plausible instance runs on our own infrastructure at plausible.pundo.cy — your analytics data never leaves our servers.\n\nMarketing cookies (optional, requires your consent): With your explicit consent we use the Meta (Facebook) Pixel to measure advertising conversions and optimise our campaigns. The Pixel sets cookies (_fbp, _fbc) and transmits usage data to Meta Platforms, Inc., USA. Data transfer to the USA is based on Standard Contractual Clauses. You can grant or withdraw consent at any time via "Cookie settings" in the footer.\n\nFunctional cookies remember your preferences (e.g. preferred language, location).',
      },
      {
        heading: 'Data Sharing',
        body: 'We do not sell, rent, or trade your personal data to third parties.\n\nWe may share your data with trusted service providers:\n• Hosting: Hetzner Online GmbH, Germany\n• Email service providers (transactional communications)\n• Payment processors (for Shop Partner transactions)\n• Translation services (for multilingual content)\n\nAll service providers are contractually required to process your data only on our instructions and in accordance with applicable data protection law.\n\nWe may disclose your data if required by law or to protect our rights, prevent fraud, or protect user safety.',
      },
      {
        heading: 'International Data Transfers',
        body: 'Your data may be transferred to and processed in countries outside the EEA. Where such transfers occur, we ensure appropriate safeguards are in place (adequacy decisions, Standard Contractual Clauses). Our primary hosting infrastructure is located within the EU (Hetzner, Germany).',
      },
      {
        heading: 'Data Retention',
        body: 'We retain your personal data only as long as necessary:\n• Account data: for the duration of your account and 24 months after deletion\n• Analytics data: aggregated and anonymised, may be retained indefinitely\n• Communication data: 36 months after your last communication\n• Shop Partner data: duration of contract plus 6–8 years (Cyprus tax and commercial law)\n• Log data: up to 12 months',
      },
      // F5970 T20 (decision E2): backups keep deleted proof documents for up to 12 months (Borg rotation on prod,
      // BB decision 2026-10-18: documents stay in the backup). Anchor #shop-claim is linked from the claim upload.
      {
        id: 'levels-credits',
        heading: 'Levels, Credits and Notifications',
        body: 'Purpose: Pundo rewards confirmed contributions (for example reviews, price confirmations and photos) with levels and credits. Credits can be used for certain functions, for example Homesick searches, MCP calls and product e-mails. Levels and credits appear under the names of the brand you are using.\n\nData we process:\n• Bookings of levels and credits (what was earned or spent, when, how much, for which type of action, and a pseudonymous reference to the contribution)\n• Your current balance and level\n• Notifications about earned or spent credits and your notification settings, including the language you chose\n• Technical records proving that a notification or e-mail was sent\n\nLegal basis: Art. 6(1)(b) GDPR (providing the functions you use) and Art. 6(1)(f) GDPR (legitimate interest in preventing misuse and fraud and in correct accounting of credits). E-mail notifications and weekly summaries are sent only with your explicit consent (Art. 6(1)(a) GDPR). They are off by default. You can withdraw your consent at any time in your account or with the link in every e-mail; withdrawal does not affect earlier processing.\n\nStorage period: Bookings are kept as long as your account exists; see "Evidence Archive for Credit Bookings" for what happens when you delete it. Notifications are deleted automatically: delivery receipts after 30 days, read notifications after 90 days and unread notifications after 180 days at the latest.\n\nYour rights: You can request access, correction and deletion (see "Your Rights (GDPR)").',
      },
      {
        id: 'evidence-archive',
        heading: 'Evidence Archive for Credit Bookings',
        body: 'Purpose: When you delete your account, we anonymise your data. So that we can still prove the correct booking of levels and credits if a legal claim arises (for example a dispute about a balance, a reversal or a case of misuse), we archive a minimal record of every deleted account before the anonymisation.\n\nData in the archive: Only the bookings of levels and credits and the last balance, linked to a protected identifier. Not archived: name, e-mail address, content you wrote, photos, messages, notification settings and e-mail records.\n\nLegal basis: Art. 6(1)(f) GDPR (legitimate interest in securing evidence); for requests for erasure Art. 17(3)(e) GDPR (establishment, exercise or defence of legal claims). We weighed this interest against yours: the archive is limited to the data named above, protected, access-restricted and time-limited.\n\nProcedure: After you confirm the deletion, your account is locked immediately. We create and check the archive and only then anonymise your account. You receive a confirmation when the deletion is complete.\n\nProtection: The archive is encrypted and stored separately from the platform database. The key to read it is not on the platform servers. The archive is opened only for a concrete legal dispute, with the approval of two independent persons, and every access is logged. It is never used for analysis, advertising or product development.\n\nStorage period: 3 years from the sealing of the archive, without extension through activity. After that it is permanently deleted and the deletion is logged. Only if a concrete legal dispute about your bookings is pending when the period ends, the record is kept exactly as long as that dispute lasts and is deleted afterwards.\n\nYour rights: You can request information about the archived data and object to the processing (Art. 21 GDPR). We examine each request individually; while the exception of Art. 17(3)(e) GDPR applies, erasure before expiry is not possible. Contact: info@pundo.cy.',
      },
      {
        id: 'shop-claim',
        heading: 'Shop Takeover and Proof Documents',
        body: 'Purpose: If you apply to take over an existing shop listing on Pundo, or report that somebody else manages your listing, we use your data to verify that you are entitled to manage the listing and to protect shop owners against misuse.\n\nData we process:\n• Name, email address and account data of the applicant\n• The application (shop, chosen proof method, optional message, time of the application)\n• Proof documents you upload (e.g. business licence, proof of address as PDF, JPG or PNG). Images are stored without embedded metadata such as GPS data\n• The result of a verification call or code (time, result, note of the administrator)\n• A copy of the public contact data of the listing at the time of the application\n• A log of the decision (who decided, when, reason) and of every view of a document by an administrator\n\nLegal basis: Art. 6(1)(b) GDPR (steps taken at your request) and Art. 6(1)(f) GDPR (legitimate interest in protecting shop owners and the platform against fraudulent takeovers).\n\nRecipients: Only authorised Pundo administrators can see applications and documents. Documents are never shown to other users, including the current manager of the listing, and are not part of any public page.\n\nStorage period: Proof documents are deleted automatically 90 days after the decision on your application, or 30 days after you withdraw it or it expires. The application record without documents (status, method, reason of the decision, log) is kept so that decisions can be explained. Backups are overwritten after their regular rotation period of up to 12 months; deleted files can remain in a backup until then.\n\nBlocked accounts: If a takeover is accepted for another person, the account of the previous manager is blocked. It is neither deleted nor anonymised, so that the decision can be reviewed and contested.\n\nYour rights: You can request access, correction and deletion of this data at info@pundo.cy (see "Your Rights (GDPR)").',
      },
      {
        heading: 'Your Rights (GDPR)',
        body: 'Under GDPR you have the following rights:\n• Right of access (Art. 15) — request a copy of your personal data\n• Right to rectification (Art. 16) — correct inaccurate data\n• Right to erasure (Art. 17) — request deletion of your data\n• Right to restriction (Art. 18) — restrict processing in certain circumstances\n• Right to data portability (Art. 20) — receive your data in machine-readable format\n• Right to object (Art. 21) — object to processing based on legitimate interests\n• Right to withdraw consent (Art. 7(3)) — withdraw consent at any time\n\nTo exercise your rights, contact us at info@pundo.cy. We will respond within 30 days.\n\nYou may also lodge a complaint with the Office of the Commissioner for Personal Data Protection, Republic of Cyprus:\nIasonos 1, 1082 Nicosia, Cyprus\nPhone: +357 22 818 456\nWebsite: www.dataprotection.gov.cy',
      },
      {
        heading: "Children's Privacy",
        body: 'The Service is not directed at children under the age of 16. We do not knowingly collect personal data from children under 16. If you believe we may have collected such data, please contact us at info@pundo.cy.',
      },
      {
        heading: 'Security',
        body: 'We implement appropriate technical and organisational security measures:\n• Encryption of data in transit (TLS/SSL)\n• Hashed and salted password storage\n• Access controls and authentication\n• Regular security assessments\n• Data minimisation practices\n\nNo method of internet transmission is completely secure. We cannot guarantee absolute security.',
      },
      {
        heading: 'Changes to This Policy',
        body: 'We may update this Privacy Policy from time to time. When we make material changes, we will update the "Last Updated" date, post the revised Policy on the Platform, and notify registered users by email for significant changes.',
      },
      {
        heading: 'Contact',
        body: 'Buhl Consulting Ltd.\nKimonos 1, Apt 104\n7040 Oroklini, Larnaka, Cyprus\nEmail: info@pundo.cy\nWebsite: https://pundo.cy',
      },
    ],
  },

  terms: {
    title: 'Terms of Service',
    sections: [
      {
        heading: 'Introduction',
        body: 'Effective date: 16 April 2026\n\nThese Terms of Service govern your access to and use of the Pundo platform at https://pundo.cy and all related services, operated by Buhl Consulting Ltd. (Registration No. HE 329258), Kimonos 1, Apt 104, 7040 Oroklini, Larnaka, Cyprus.\n\nBy accessing or using the Service, you agree to be bound by these Terms. If you do not agree, you must not use the Service.',
      },
      {
        heading: 'Definitions',
        body: '• User — any individual who accesses or uses the Service\n• Shop Partner — any business that lists products or services on the Platform pursuant to a Shop Partner Agreement\n• Content — all text, images, data, product information, pricing, reviews, and other materials available through the Service\n• User Content — content submitted by Users (product photos, reviews, community contributions)\n• Platform — the Pundo website, applications, and all related technology infrastructure',
      },
      {
        heading: 'Eligibility and Account Registration',
        body: 'You must be at least 18 years of age to use the Service. If using the Service on behalf of a business, you represent that you have the authority to bind that entity.\n\nWhen creating an account, you must provide accurate, current, and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. Notify us immediately at info@pundo.cy if you become aware of any unauthorised use of your account.',
      },
      {
        heading: 'Permitted and Prohibited Use',
        body: 'You may use the Service to discover, search for, and compare products, services, and prices from local retailers and service providers in Cyprus.\n\nYou agree not to:\n• Use the Service for any unlawful purpose\n• Scrape or use automated means to collect data without our prior written consent\n• Interfere with or disrupt the Service or its servers\n• Upload or transmit viruses or other harmful code\n• Impersonate any person or entity\n• Post defamatory, obscene, or otherwise objectionable content\n• Send unsolicited commercial communications (spam)\n• Attempt to reverse-engineer any part of the Service\n• Remove or alter any copyright or trademark notices',
      },
      {
        heading: 'Content and Intellectual Property',
        body: 'All content on the Platform (excluding User Content) is the property of Buhl Consulting Ltd. or its licensors and is protected by applicable intellectual property laws.\n\nProduct information, pricing, and availability data is sourced from Shop Partners and publicly available sources. We do not warrant that such information is complete, accurate, or current. The display of a product or price does not constitute an offer to sell.\n\nBy submitting User Content, you grant Buhl Consulting Ltd. a worldwide, non-exclusive, royalty-free licence to use, reproduce, modify, publish, and distribute such content in connection with the Service.\n\n"Pundo" and the Pundo logo are trademarks of Buhl Consulting Ltd.',
      },
      {
        heading: 'Disclaimers',
        body: 'THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND.\n\nWe do not warrant that the Service will be uninterrupted, error-free, or secure, or that product information, pricing, or availability data is accurate, complete, or current.\n\nPundo is a discovery and information platform. We do not sell products or services directly, do not process transactions, and are not a party to any transaction between Users and Shop Partners.',
      },
      {
        heading: 'Limitation of Liability',
        body: 'To the maximum extent permitted by law, Buhl Consulting Ltd. shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service.\n\nOur total aggregate liability for all claims shall not exceed the greater of (a) the amount you have paid us in the twelve months preceding the claim, or (b) EUR 100.\n\nSome jurisdictions do not allow certain liability exclusions. In such cases, our liability is limited to the maximum extent permitted by applicable law.',
      },
      {
        heading: 'Indemnification',
        body: 'You agree to indemnify and hold harmless Buhl Consulting Ltd. and its directors, officers, and employees from any claims, damages, costs, and expenses (including legal fees) arising from:\n• Your use of or access to the Service\n• Your violation of these Terms\n• Your violation of any third-party rights\n• Any User Content you submit through the Service',
      },
      {
        heading: 'Third-Party Links',
        body: 'The Service may contain links to third-party websites provided for convenience only. We are not responsible for the content, products, or services of any third-party websites. Your interactions with third-party websites are solely between you and the relevant third party.',
      },
      {
        heading: 'Modifications and Termination',
        body: 'We reserve the right to modify, suspend, or discontinue the Service at any time. We may revise these Terms from time to time. Material changes will be communicated by posting a notice on the Platform or by email. Your continued use after the effective date constitutes acceptance of the revised Terms.\n\nYou may stop using the Service at any time or request account deletion by contacting info@pundo.cy. We may terminate or suspend your access immediately for any violation of these Terms.',
      },
      {
        heading: 'Governing Law and Dispute Resolution',
        body: 'These Terms are governed by the laws of the Republic of Cyprus. Any dispute shall be submitted to the exclusive jurisdiction of the courts of Larnaka, Cyprus.\n\nIf you are a consumer residing in the EU, you may also invoke the mandatory consumer protection provisions of your country of residence and bring proceedings in the courts of your country of residence.\n\nConsumers residing in the EU may submit complaints to the European Commission\'s Online Dispute Resolution platform: https://ec.europa.eu/consumers/odr',
      },
      {
        heading: 'General Provisions',
        body: 'These Terms, together with the Privacy Policy, constitute the entire agreement between you and Buhl Consulting Ltd. regarding the Service. If any provision is held invalid, the remaining provisions continue in full force and effect. These Terms are drafted in English; in the event of any discrepancy with a translated version, the English version prevails.',
      },
      {
        heading: 'Contact',
        body: 'Buhl Consulting Ltd.\nKimonos 1, Apt 104\n7040 Oroklini, Larnaka, Cyprus\nEmail: info@pundo.cy\nWebsite: https://pundo.cy',
      },
    ],
  },

  about: {
    title: 'About Us',
    sections: [
      {
        heading: 'Who We Are',
        body: 'Pundo.cy is a multilingual product and service discovery platform built for the people of Cyprus. We are operated by Buhl Consulting Ltd., a company registered in the Republic of Cyprus (Registration No. HE 329258), with our office located at Kimonos 1, Apt 104, 7040 Oroklini, Larnaka, Cyprus.',
      },
      {
        heading: 'Our Mission',
        body: 'Cyprus is home to a vibrant, multilingual population — Greek, English, Russian, and many other language speakers share the same cities, yet finding local products and services remains surprisingly difficult. Local shops are poorly discoverable online, language barriers make search frustrating, and no single platform brings it all together.\n\nPundo changes that. We make local commerce discoverable for everyone, regardless of the language they speak.',
      },
      {
        heading: 'What We Do',
        body: 'Pundo is a product and service locator that helps consumers find what they need from local retailers and service providers across Cyprus. Our platform provides:\n\n• Multilingual search and discovery — browse products and services in English, Greek, Russian, German, Arabic, and Hebrew\n• Local price transparency — compare prices and offers from shops in your area\n• Shop discovery — find local businesses you never knew existed, right around the corner\n• Up-to-date product information — current availability, pricing, and product details from local retailers',
      },
      {
        heading: 'Our Approach',
        body: 'We believe that local commerce is the backbone of any community. Rather than competing with large e-commerce platforms, we aim to complement the local retail ecosystem by making it more visible and accessible. We work directly with local shop owners to ensure their products and services reach the customers who are looking for them.',
      },
      {
        heading: 'Our Team',
        body: 'Pundo was founded by Bernhard Buhl, an Austrian expat who has called Cyprus home for over a decade. Having experienced firsthand the challenges of navigating local commerce in a multilingual environment, Bernhard set out to build the tool he wished had existed — a simple, powerful way to discover what local shops have to offer.',
      },
      {
        heading: 'Get in Touch',
        body: 'We would love to hear from you — whether you are a consumer with feedback, a shop owner interested in being listed on Pundo, or a potential partner:\n\nEmail: info@pundo.cy\nWebsite: https://pundo.cy\nCompany: Buhl Consulting Ltd.\nAddress: Kimonos 1, Apt 104, 7040 Oroklini, Larnaka, Cyprus\nRegistration: HE 329258 (Cyprus Companies Registry)',
      },
    ],
  },

  contact: {
    title: 'Contact',
    sections: [
      {
        heading: 'Get in Touch',
        body: "We'd love to hear from you — whether you're a customer with feedback or a shop owner interested in joining pundo.",
      },
      {
        heading: 'Email',
        body: 'info@pundo.cy',
      },
      {
        heading: 'Address',
        body: 'Buhl Consulting Ltd.\nKimonos 1, Apt 104\n7040 Oroklini, Larnaka\nCyprus',
      },
      {
        heading: 'For Shop Owners',
        body: "Interested in listing your shop on pundo? Email us at info@pundo.cy and we'll get you set up.",
      },
    ],
  },
}
