// Turns the organized documents in docs/ into Locker cards.
//
// Each card links to its files (served locally at /files/..., see
// src/app/files/[...path]/route.ts) and carries only non-sensitive facts read
// off the documents: issuers, dates, results. Identity/account/register
// numbers are deliberately NOT copied into the database — they stay in the
// linked documents (add them by hand as secret fields if you want them).
//
// Safe to re-run: existing cards are never overwritten — a card that already
// exists only gains any links it is still missing.
//
//   npm run db:import-docs
import { existsSync } from "node:fs";
import path from "node:path";
import { createCard, listAllCardTitles, listCards, updateCard, type CardInput } from "../src/lib/cards";

const userId = process.env.IMPORT_USER_ID ?? "00000000-0000-0000-0000-000000000001";

type Kind = "pdf" | "image" | "doc";
const file = (label: string, rel: string, kind: Kind) => ({
  label,
  url: "/files/" + rel.split("/").map(encodeURIComponent).join("/"),
  source: "other" as const,
  driveFileId: null,
  kind,
});
const f = (key: string, value: string) => ({ key, value, isSecret: false });

const cards: CardInput[] = [
  // ---------------------------------------------------------------- education
  {
    type: "education",
    title: "SSLC Marks Card (2017)",
    aliases: ["10th marks card", "tenth marks card", "sslc certificate", "10th"],
    tags: ["education", "sslc", "school"],
    notes: "",
    fields: [
      f("Board", "Karnataka Secondary Education Examination Board"),
      f("Exam", "April 2017"),
      f("Result", "571 / 625 (91.36%) — A+"),
      f("School", "Adichunchanagiri Eng. Med. High School, Arasikere"),
      f("Medium", "English"),
    ],
    links: [
      file("Marks card (PDF)", "Education/SSLC (10th Standard)/SSLC Marks Card (Apr 2017).pdf", "pdf"),
      file("Marks card (scan)", "Education/SSLC (10th Standard)/SSLC Marks Card (Apr 2017) - Scan.jpg", "image"),
    ],
  },
  {
    type: "education",
    title: "II PUC Certificate (2019)",
    aliases: ["12th marks card", "puc marks card", "2nd puc", "twelfth", "12th"],
    tags: ["education", "puc", "college"],
    notes: "",
    fields: [
      f("Board", "Dept. of Pre-University Education, Karnataka"),
      f("Exam", "March 2019"),
      f("Result", "547 / 600 — Distinction"),
      f("Combination", "Physics, Chemistry, Maths, Biology"),
      f("College", "Adichunchanagiri PU College, Arasikere"),
      f("Result declared", "16 Apr 2019"),
    ],
    links: [
      file("Certificate (PDF)", "Education/PUC (12th Standard)/PUC 2nd Year Certificate (Mar 2019).pdf", "pdf"),
      file("Certificate (scan)", "Education/PUC (12th Standard)/PUC 2nd Year Certificate (Mar 2019) - Scan.jpg", "image"),
    ],
  },
  {
    type: "education",
    title: "PUC Transfer Certificate (2019)",
    aliases: ["TC", "transfer certificate", "puc tc"],
    tags: ["education", "puc", "college"],
    notes: "",
    fields: [
      f("Issued", "16 May 2019"),
      f("College", "Sri Adichunchanagiri PU Science College, Arasikere"),
      f("Class left", "II PUC"),
      f("Admitted", "23 May 2017"),
      f("Left college", "18 Mar 2019"),
    ],
    links: [file("Transfer certificate (scan)", "Education/PUC (12th Standard)/PUC Transfer Certificate (16 May 2019).jpg", "image")],
  },
  {
    type: "education",
    title: "B.E. Grade Cards — NIE Mysuru",
    aliases: ["engineering marks card", "btech marks card", "degree grade card", "semester grade cards", "be marks card"],
    tags: ["education", "engineering", "degree"],
    notes: "Provisional grade cards for every semester, including make-up sessions.",
    fields: [
      f("College", "The National Institute of Engineering (NIE), Mysuru"),
      f("Program", "B.E. — Electrical and Electronics Engineering"),
      f("Period", "2019 – 2023"),
      f("Semesters", "1 – 8"),
      f("Sem 8 SGPA", "8.88 (Even 2022-23, dated 26 Aug 2023)"),
    ],
    links: [
      file("All semester grade cards (PDF, 10 pages)", "Education/Engineering (B.E.) - NIE Mysuru/B.E. EEE Grade Cards - Sem 1 to Sem 8.pdf", "pdf"),
      file("Semester 8 grade card (image)", "Education/Engineering (B.E.) - NIE Mysuru/B.E. EEE Sem 8 Grade Card (26 Aug 2023).jpg", "image"),
    ],
  },
  {
    type: "education",
    title: "Post Matric Scholarship Acknowledgement (2020-21)",
    aliases: ["ssp", "state scholarship portal", "scholarship"],
    tags: ["education", "scholarship"],
    notes: "",
    fields: [
      f("Portal", "State Scholarship Portal (Post Matric), Karnataka"),
      f("Year", "2020-21"),
      f("College", "National Institute of Engineering, Mysuru"),
      f("Course", "B.E."),
    ],
    links: [file("Acknowledgement (PDF)", "Education/Scholarships/SSP Post Matric Acknowledgement 2020-21.pdf", "pdf")],
  },

  // -------------------------------------------------- government certificates
  {
    type: "id_doc",
    title: "SC Caste Certificate (Adi Karnataka)",
    aliases: ["caste certificate", "sc certificate", "caste", "scheduled caste", "adi karnataka"],
    tags: ["certificate", "caste", "government"],
    notes:
      "Every copy on file is marked “Draft Copy”. If an office asks for it, download the final verified copy from the Nadakacheri portal using the certificate number printed on the document.",
    fields: [
      f("Issued", "25 Jul 2017"),
      f("Category", "Scheduled Caste — Adi Karnataka"),
      f("Issuing authority", "Revenue Department, Arsikere Taluk, Hassan"),
      f("Validity", "Lifetime"),
      f("Status", "Draft copy only"),
    ],
    links: [
      file("Draft copy A (PDF)", "Government Certificates/Caste Certificate (SC)/SC Caste Certificate (25 Jul 2017) - Draft A.pdf", "pdf"),
      file("Draft copy B (PDF)", "Government Certificates/Caste Certificate (SC)/SC Caste Certificate (25 Jul 2017) - Draft B.pdf", "pdf"),
      file("Screenshot", "Government Certificates/Caste Certificate (SC)/SC Caste Certificate (25 Jul 2017) - Draft Screenshot.jpg", "image"),
      file("Old scan (poor quality)", "Government Certificates/Caste Certificate (SC)/SC Caste Certificate (25 Jul 2017) - Poor Scan.jpg", "image"),
      file("Attested by NIE HoD (PDF)", "Government Certificates/Caste Certificate (SC)/SC Caste Certificate (25 Jul 2017) - Attested by NIE HoD.pdf", "pdf"),
      file("Verified e-certificate (21 Sep 2026, PDF)", "Government Certificates/Caste Certificate (SC)/SC Caste Certificate (21 Sep 2026).pdf", "pdf"),
    ],
  },
  {
    type: "id_doc",
    title: "Rahul's SC Caste Certificate (Family)",
    aliases: ["rahul caste certificate", "rahul certificate", "family caste certificate"],
    tags: ["certificate", "caste", "government", "family"],
    notes: "Family document — kept for reference. The download was named “Income Certificate”, but it is a caste certificate.",
    fields: [
      f("Issued", "22 Sep 2026"),
      f("Category", "Scheduled Caste — Adi Karnataka"),
      f("Issuing authority", "Revenue Department, Arsikere Taluk, Hassan"),
      f("Validity", "Lifetime"),
    ],
    links: [
      file("Caste certificate (PDF)", "Government Certificates/Caste Certificate (SC)/Rahul - SC Caste Certificate (22 Sep 2026).pdf", "pdf"),
    ],
  },
  {
    type: "id_doc",
    title: "Income Certificate (2023)",
    aliases: ["income certificate", "income cert", "family income"],
    tags: ["certificate", "income", "government"],
    notes: "",
    fields: [
      f("Issued", "15 Feb 2023"),
      f("Valid for", "5 years (to Feb 2028)"),
      f("Family annual income", "₹4,06,092"),
      f("Issuing authority", "Revenue Department, Arsikere Taluk, Hassan"),
      f("Application filed", "2 Jan 2023"),
    ],
    links: [
      file("Income certificate (PDF)", "Government Certificates/Income Certificate/Income Certificate (15 Feb 2023).pdf", "pdf"),
      file("Application (PDF)", "Government Certificates/Income Certificate/Income Certificate Application (2 Jan 2023).pdf", "pdf"),
      file("Aadhaar consent letter — Kannada (PDF)", "Government Certificates/Income Certificate/Aadhaar Seeding Consent Letter (Kannada).pdf", "pdf"),
    ],
  },
  {
    type: "id_doc",
    title: "Income Certificate (2017)",
    aliases: ["old income certificate", "income certificate 2017"],
    tags: ["certificate", "income", "government", "old"],
    notes: "Superseded by the 2023 certificate. Kannada, low-quality scan.",
    fields: [
      f("Issued", "25 Jul 2017"),
      f("Family annual income", "₹11,000"),
      f("Valid for", "5 years"),
    ],
    links: [file("Certificate (scan)", "Government Certificates/Income Certificate/Income Certificate (25 Jul 2017) - Kannada Scan.jpg", "image")],
  },

  // ------------------------------------------------------------------ banking
  {
    type: "bank",
    title: "SBI Savings Account",
    aliases: ["sbi", "state bank of india", "sbi passbook"],
    tags: ["bank", "sbi", "savings"],
    notes: "Account number is on the passbook page linked below.",
    fields: [
      f("Bank", "State Bank of India"),
      f("Branch", "Visweswaranagar, Mysuru"),
      f("IFSC", "SBIN0040378"),
      f("Account type", "Savings"),
      f("Opened", "20 Nov 2021"),
    ],
    links: [file("Passbook front page (PDF)", "Banking/SBI/SBI Passbook Front Page (Nov 2021).pdf", "pdf")],
  },
  {
    type: "bank",
    title: "Syndicate / Canara Bank Account",
    aliases: ["syndicate bank", "canara bank", "canara", "cnb", "bank statement"],
    tags: ["bank", "canara", "syndicate", "savings"],
    notes:
      "Opened with Syndicate Bank, which merged into Canara Bank. Account number is on the passbook page linked below.",
    fields: [
      f("Bank", "Syndicate Bank (now Canara Bank)"),
      f("Branch", "Arsikere"),
      f("Passbook issued", "17 Oct 2013"),
      f("Statement period", "1 Nov 2020 – 1 Jun 2021"),
    ],
    links: [
      file("Bank statement, Nov 2020 – Jun 2021 (PDF, 21 pages)", "Banking/Syndicate - Canara Bank/Canara Bank Statement (Nov 2020 - Jun 2021).pdf", "pdf"),
      file("Passbook front page (scan)", "Banking/Syndicate - Canara Bank/Syndicate Bank Passbook Front Page (Oct 2013).jpg", "image"),
    ],
  },

  // ---------------------------------------------------------- identity + career
  {
    type: "id_doc",
    title: "Passport-size Photos",
    aliases: ["photo", "passport photo", "photos", "id photo"],
    tags: ["identity", "photo"],
    notes: "",
    fields: [f("Taken", "April 2021 and 2023 (three photos)")],
    links: [
      file("Photo, Apr 2021", "Identity/Photos/Passport Photo (Apr 2021).jpg", "image"),
      file("Photo, Sep 2023", "Identity/Photos/Passport Photo (Sep 2023).jpg", "image"),
      file("Photo, 2023 (red shirt)", "Identity/Photos/Passport Photo (2023) - Red Shirt.jpg", "image"),
    ],
  },
  {
    type: "note",
    title: "Resume",
    aliases: ["cv", "curriculum vitae"],
    tags: ["career"],
    notes: "",
    fields: [],
    links: [
      file("Resume (PDF)", "Career/Resume.pdf", "pdf"),
      file("Resume 2024 — Process Engineer at Tata Electronics (PDF)", "Career/Resumes/Resume - Process Engineer at Tata Electronics (2024).pdf", "pdf"),
      file("Resume 2024 — Process Engineer at Tata Electronics (Word)", "Career/Resumes/Resume - Process Engineer at Tata Electronics (2024) - Editable.docx", "doc"),
      file("Resume 2025 — AI/ML focus", "Career/Resumes/Resume - Program Manager at MAA Academy (AI-ML Focus, 2025).pdf", "pdf"),
      file("Resume 2025 — AI/ML focus, Core Skills layout", "Career/Resumes/Resume - Program Manager at MAA Academy (AI-ML Focus, Core Skills Layout).pdf", "pdf"),
      file("Resume Nov 2025 — Quote-to-Cash focus", "Career/Resumes/Resume - Program Manager at MAA Academy (Quote-to-Cash Focus, Nov 2025).pdf", "pdf"),
      file("Resume Nov 2025 — Senior Consultant at Emids (full career history, PDF)", "Career/Resumes/Resume - Senior Consultant at Emids (Full Career History, Nov 2025).pdf", "pdf"),
      file("Resume 2024 — earlier draft (Word)", "Career/Resumes/Resume - Process Engineer at Tata Electronics (Earlier Draft, 25 Jul 2024).docx", "doc"),
    ],
  },

  // ============================================================ added in round 2
  {
    type: "id_doc",
    title: "Aadhaar (e-Aadhaar)",
    aliases: ["aadhaar", "aadhar", "uid", "uidai", "e-aadhaar"],
    tags: ["identity", "aadhaar", "government"],
    notes: "The Aadhaar number itself is on the linked letters — it isn't stored in the app.",
    fields: [
      f("Current letter", "e-Aadhaar, digitally signed — details as on 25 Mar 2026"),
      f("Earlier letter", "e-Aadhaar dated 3 Dec 2015"),
      f("Aadhaar issued", "20 Oct 2013"),
    ],
    links: [
      file("e-Aadhaar 2026, signed (PDF)", "Identity/Aadhaar/e-Aadhaar Signed (Details as on 25 Mar 2026).pdf", "pdf"),
      file("e-Aadhaar letter 2015 (scan)", "Identity/Aadhaar/Aadhaar Letter (3 Dec 2015) - Scan.jpg", "image"),
    ],
  },
  {
    type: "education",
    title: "CET 2019 — Result & Seat Allotment",
    aliases: ["cet", "kea", "cet rank", "seat allotment", "engineering admission"],
    tags: ["education", "cet", "kea", "engineering", "2019"],
    notes: "Your own screenshots and printouts from the KEA (Karnataka Examinations Authority) engineering counselling in 2019.",
    fields: [
      f("Result", "Engineering rank 18,297 (25 May 2019)"),
      f("Mock allotment", "NIE Mysuru — Electrical & Electronics Engineering, SC (26 Jun 2019)"),
      f("First-round allotment", "NIE Mysuru — Electrical & Electronics Engineering (30 Jun 2019)"),
      f("Options entered", "17 choices, all Electrical & Electronics Engineering (22 Jun 2019)"),
      f("Decision", "Choice-1 selected (9 Jul 2019)"),
    ],
    links: [
      file("CET result screenshot", "Education/CET and KEA Counselling 2019/CET 2019 Result Screenshot (25 May 2019).png", "image"),
      file("Mock allotment result", "Education/CET and KEA Counselling 2019/Mock Allotment Result Screenshot (26 Jun 2019).jpg", "image"),
      file("First-round allotment result", "Education/CET and KEA Counselling 2019/First Round Allotment Result Screenshot (30 Jun 2019).png", "image"),
      file("Round-1 option list", "Education/CET and KEA Counselling 2019/Round 1 Option List (22 Jun 2019).jpg", "image"),
      file("Choice-1 declaration", "Education/CET and KEA Counselling 2019/First Round Choice-1 Declaration (9 Jul 2019).jpg", "image"),
      file("Handwritten college shortlist (with cutoffs)", "Education/CET and KEA Counselling 2019/Handwritten College Preference List with Cutoff Ranks (22 Jun 2019).jpg", "image"),
      file("Handwritten option codes, page 1", "Education/CET and KEA Counselling 2019/Handwritten College Option Codes - Page 1 (5 Jul 2019).jpg", "image"),
      file("Handwritten option codes, page 2", "Education/CET and KEA Counselling 2019/Handwritten College Option Codes - Page 2 (5 Jul 2019).jpg", "image"),
      file("KEA note on mock allotment", "Education/CET and KEA Counselling 2019/Mock Allotment Notes Screenshot (27 Jun 2019).png", "image"),
    ],
  },
  {
    type: "education",
    title: "KEA Admission Paperwork (2019)",
    aliases: ["kea admission order", "admission order", "verification slip", "fee challan"],
    tags: ["education", "kea", "engineering", "2019", "admission"],
    notes: "The verification slip includes a confidential option-entry key — don't share that image.",
    fields: [
      f("Documents verified", "12 Jun 2019, Hassan"),
      f("Admission order", "10 Jul 2019 — NIE Mysuru, Electrical & Electronics Engineering, SC category"),
      f("Admission fee to KEA", "₹500, paid 9 Jul 2019"),
    ],
    links: [
      file("Admission order (photo)", "Education/Engineering (B.E.) - NIE Mysuru/Admission/KEA CET 2019 Admission Order (10 Jul 2019).jpg", "image"),
      file("Verification acknowledgement slip", "Education/CET and KEA Counselling 2019/KEA Verification Acknowledgement Slip (12 Jun 2019).jpg", "image"),
      file("Documents to produce for verification", "Education/CET and KEA Counselling 2019/Documents to Produce for Verification (10 Jun 2019).jpg", "image"),
      file("Admission fee challan", "Education/CET and KEA Counselling 2019/KEA Admission Fee Challan (9 Jul 2019).jpg", "image"),
      file("Payment history (screenshot)", "Education/CET and KEA Counselling 2019/KEA Payment History Screenshot (9 Jul 2019).png", "image"),
      file("CET online application instructions", "Education/CET and KEA Counselling 2019/CET Online Application Instructions (21 Feb 2019).pdf", "pdf"),
      file("Document verification schedule", "Education/CET and KEA Counselling 2019/KEA Document Verification Schedule 2019.pdf", "pdf"),
      file("First-round option entry schedule", "Education/CET and KEA Counselling 2019/KEA First Round Option Entry Schedule 2019.pdf", "pdf"),
      file("First-round post-allotment schedule", "Education/CET and KEA Counselling 2019/KEA First Round Post-Allotment Schedule (6 Jul 2019).pdf", "pdf"),
      file("Second-round schedule & verification notice", "Education/CET and KEA Counselling 2019/KEA Second Round Schedule and Document Verification (15 Jul 2019).pdf", "pdf"),
      file("AOC notice: no extra fees", "Education/CET and KEA Counselling 2019/AOC Notice - No Extra Fees by Engineering Colleges (25 Jul 2019).pdf", "pdf"),
      file("Engineering cutoff ranks, mock round (General)", "Education/CET and KEA Counselling 2019/Engineering Cutoff Ranks - Mock Round General (CET 2019).pdf", "pdf"),
    ],
  },
  {
    type: "education",
    title: "NIE Mysuru — Admission & Fees (2019)",
    aliases: ["nie admission", "admission letter", "college fee", "fee receipt"],
    tags: ["education", "engineering", "nie", "2019", "admission"],
    notes: "",
    fields: [
      f("College", "The National Institute of Engineering (NIE), Mysuru"),
      f("Program", "B.E. — Electrical and Electronics Engineering, Semester 1"),
      f("Provisional admission letter", "12 Jul 2019 (KEA quota)"),
      f("First-year fee deposited", "₹20,320 at HDFC Bank, 12 Jul 2019"),
    ],
    links: [
      file("Provisional admission letter", "Education/Engineering (B.E.) - NIE Mysuru/Admission/NIE Provisional Admission Letter (12 Jul 2019).jpg", "image"),
      file("Fee deposit slip (HDFC)", "Education/Engineering (B.E.) - NIE Mysuru/Admission/NIE First Year Fee Deposit Slip - HDFC (12 Jul 2019).jpg", "image"),
      file("Fee structure 2019-20 & documents list", "Education/Engineering (B.E.) - NIE Mysuru/Admission/NIE Fee Structure 1st Year BE 2019-20.pdf", "pdf"),
    ],
  },
  {
    type: "education",
    title: "NIE Mysuru — Circulars & Course Papers (2019-20)",
    aliases: ["nie circular", "cie", "english enhancement course", "c lab manual"],
    tags: ["education", "engineering", "nie", "2019"],
    notes: "",
    fields: [
      f("CIE circular", "12 Jul 2019 — two 10-mark tests and a 30-mark mid-semester exam"),
      f("English Enhancement Course", "Test and exam schedule, revised 27 Aug 2019"),
    ],
    links: [
      file("CIE circular", "Education/Engineering (B.E.) - NIE Mysuru/Circulars/NIE Circular - CIE Changes (12 Jul 2019).pdf", "pdf"),
      file("English Enhancement Course schedule", "Education/Engineering (B.E.) - NIE Mysuru/Circulars/English Enhancement Course Test Schedule (27 Aug 2019).pdf", "pdf"),
      file("C Programming Lab manual (E-Box)", "Education/Engineering (B.E.) - NIE Mysuru/Study Material/C Programming Lab Manual - E-Box (2017-18).pdf", "pdf"),
    ],
  },
  {
    type: "education",
    title: "Entrance Exams 2019 — JEE Main & NEET",
    aliases: ["jee", "jee main", "neet", "admit card", "entrance exam"],
    tags: ["education", "jee", "neet", "2019", "entrance"],
    notes: "",
    fields: [
      f("JEE (Main) 2019", "Exam 10 Apr 2019, Malnad College of Engineering, Hassan"),
      f("NEET (UG) 2019", "Exam 5 May 2019, Acharya Institute of Technology, Bengaluru"),
      f("NEET result", "Declared 5 Jun 2019"),
    ],
    links: [
      file("JEE Main admit card", "Education/Entrance Exams/JEE Main 2019 Admit Card.pdf", "pdf"),
      file("NEET admit card (PDF)", "Education/Entrance Exams/NEET UG 2019 Admit Card.pdf", "pdf"),
      file("NEET admit card, signed printout (photo)", "Education/Entrance Exams/NEET UG 2019 Admit Card - Signed Printout Photo.jpg", "image"),
      file("NEET score card (screenshot)", "Education/Entrance Exams/NEET UG 2019 Score Card Screenshot (5 Jun 2019).png", "image"),
    ],
  },
  {
    type: "education",
    title: "PUC Character Certificate (2019)",
    aliases: ["character certificate", "conduct certificate"],
    tags: ["education", "puc", "certificate"],
    notes: "Photo is upside-down.",
    fields: [f("Issued by", "Adichunchanagiri PU College, Arsikere"), f("Issued", "May 2019")],
    links: [file("Character certificate (photo)", "Education/PUC (12th Standard)/PUC Character Certificate (May 2019).jpg", "image")],
  },
  {
    type: "education",
    title: "PUC Revaluation — Biology (2019)",
    aliases: ["revaluation", "re-evaluation", "scanned copy", "biology revaluation"],
    tags: ["education", "puc", "revaluation", "2019"],
    notes: "The list is a 67-page board document covering many students — your row is on page 30.",
    fields: [
      f("Applied", "1 May 2019 — scanned copy / revaluation of the Biology paper"),
      f("Outcome", "Biology marks increased by 9 after revaluation"),
    ],
    links: [
      file("Fee challan", "Education/PUC (12th Standard)/PUC Revaluation Fee Challan (1 May 2019).jpg", "image"),
      file("Board revaluation-changes list (your row: page 30)", "Reference/KEA and Board Lists/PUC 2019 Revaluation Changes List.pdf", "pdf"),
    ],
  },
  {
    type: "education",
    title: "Prize Money Application — Social Welfare (2019)",
    aliases: ["prize money", "social welfare", "scholarship application"],
    tags: ["education", "scholarship", "social-welfare", "2019"],
    notes: "Contains bank details.",
    fields: [
      f("Department", "Social Welfare, Karnataka"),
      f("Applied", "31 May 2019 — prize money for the PUC result (SC category)"),
    ],
    links: [file("Online acknowledgement (photo)", "Education/Scholarships/Social Welfare Prize Money Acknowledgement (31 May 2019).jpg", "image")],
  },
  {
    type: "education",
    title: "Scholarship Schemes & Guides",
    aliases: ["scholarship list", "nirankari", "what next", "career guide"],
    tags: ["education", "scholarship", "reference"],
    notes: "Reading material rather than your own documents.",
    fields: [],
    links: [
      file("List of scholarships for B.E. students", "Education/Scholarships/List of Scholarships for BE Students.pdf", "pdf"),
      file("Nirankari Rajmata Scholarship Scheme 2019-20", "Education/Scholarships/Nirankari Rajmata Scholarship Scheme 2019-20.pdf", "pdf"),
      file("What next after 10th class (guide)", "Education/Career Guidance/What Next After 10th Class.pdf", "pdf"),
    ],
  },
  {
    type: "bank",
    title: "Karnataka Bank Account",
    aliases: ["karnataka bank", "kbl"],
    tags: ["bank", "karnataka-bank", "savings"],
    notes: "Account number is on the passbook photo linked below.",
    fields: [f("Bank", "Karnataka Bank Ltd"), f("Branch", "Arsikere"), f("Account type", "Savings")],
    links: [file("Passbook front pages (photo)", "Banking/Karnataka Bank/Karnataka Bank Passbook Front Pages (2020).jpg", "image")],
  },
  {
    type: "bank",
    title: "ECS / NEFT Mandate Form (2019)",
    aliases: ["mandate form", "neft mandate", "ecs", "scholarship bank details"],
    tags: ["bank", "form", "scholarship"],
    notes: "The filled form contains Aadhaar and account numbers.",
    fields: [
      f("Form", "Govt. of Karnataka, Dept. of Treasuries — mandate for receiving payments"),
      f("Filled for", "Syndicate Bank account, dated 29 Oct 2019"),
    ],
    links: [
      file("Filled mandate form (scan)", "Banking/Syndicate - Canara Bank/ECS NEFT Mandate Form - Filled (29 Oct 2019).jpg", "image"),
      file("Blank form (to print)", "Banking/Forms/ECS NEFT Mandate Form (Blank).jpg", "image"),
    ],
  },
  {
    type: "bank",
    title: "Mother's Bank Accounts (SBI & Karnataka Bank)",
    aliases: ["mother bank", "mothers passbook", "amma bank", "family bank"],
    tags: ["bank", "family", "sbi", "karnataka-bank"],
    notes: "Family documents — your mother's accounts, kept for reference.",
    fields: [
      f("SBI", "Arsikere branch, passbook issued Mar 2018"),
      f("Karnataka Bank", "Arsikere, savings passbook"),
    ],
    links: [
      file("SBI passbook front page (photo)", "Banking/Family Accounts/Mother - SBI Passbook Front Page (2018).jpg", "image"),
      file("Karnataka Bank passbook front pages (photo)", "Banking/Family Accounts/Mother - Karnataka Bank Passbook Front Pages (2020).jpg", "image"),
    ],
  },
  {
    type: "note",
    title: "HP Gaming Laptop — Invoice (Oct 2019)",
    aliases: ["laptop invoice", "laptop bill", "warranty", "hp laptop"],
    tags: ["purchase", "warranty", "laptop"],
    notes: "Keep for warranty claims.",
    fields: [
      f("Item", "HP gaming laptop with accessories"),
      f("Bought", "2 Oct 2019 from Harsha (Prakash Retail Pvt. Ltd.), Shivamogga"),
      f("Total", "₹70,000"),
    ],
    links: [
      file("Tax invoice (photo)", "Purchases/HP Gaming Laptop Tax Invoice (2 Oct 2019).jpg", "image"),
      file("HP Festive Offer 2019 brochure", "Purchases/HP Festive Offer 2019 Brochure.pdf", "pdf"),
    ],
  },
  {
    type: "property",
    title: "PG Accommodation — Akshaya PG (2019)",
    aliases: ["pg", "hostel", "rent receipt", "akshaya pg", "advance receipt"],
    tags: ["housing", "pg", "receipt", "mysuru"],
    notes: "",
    fields: [
      f("PG", "Akshaya PG, Vidyaranyapuram, Mysuru (opposite NIE)"),
      f("Receipt dated", "26 Jul 2019"),
      f("Advance paid", "₹10,000, with one year's maintenance charges"),
    ],
    links: [file("Handwritten receipt (photo)", "Housing/Akshaya PG Advance and Maintenance Receipt (26 Jul 2019).jpg", "image")],
  },
  {
    type: "medical",
    title: "Spectacles — Vision Express Order (2019)",
    aliases: ["eye prescription", "glasses", "spectacles", "vision express"],
    tags: ["medical", "eyesight", "spectacles"],
    notes: "Photo is sideways. Includes the eye prescription.",
    fields: [f("Ordered", "24 Oct 2019, Vision Express, Mysuru")],
    links: [file("Order sheet (photo)", "Medical/Eyesight/Vision Express Spectacle Order Sheet (24 Oct 2019).jpg", "image")],
  },
  // (The Karnataka Police Constable job-notification card was deleted on purpose — do not re-create it.
  //  Its flyer is still in docs/Career/Job Notifications/.)

  // ============================================================ added in round 3
  {
    type: "id_doc",
    title: "Driving Licence",
    aliases: ["dl", "driving license", "licence", "rto"],
    tags: ["identity", "driving-licence", "government"],
    notes: "Front and back screenshots, a photo of the physical card, and the verified DigiLocker PDF. The licence number appears on these files — it isn't stored in the app.",
    fields: [
      f("Issued by", "Karnataka State — Licensing Authority, Hassan (KA-13)"),
      f("Issued", "8 Mar 2021"),
      f("Valid until", "17 Dec 2041 (non-transport)"),
      f("Vehicle class", "MCWG (motorcycle with gear)"),
    ],
    links: [
      file("Front (screenshot, 25 May 2026)", "Identity/Driving Licence/Driving Licence - Front (Screenshot 25 May 2026).jpg", "image"),
      file("Back (screenshot, 25 May 2026)", "Identity/Driving Licence/Driving Licence - Back (Screenshot 25 May 2026).jpg", "image"),
      file("Card photo (25 May 2026)", "Identity/Driving Licence/Driving Licence - Card Photo (25 May 2026).png", "image"),
      file("Verified DigiLocker PDF", "Identity/Driving Licence/Driving Licence (DigiLocker, Verified).pdf", "pdf"),
    ],
  },
  {
    type: "id_doc",
    title: "PAN Card",
    aliases: ["pan", "permanent account number", "income tax card"],
    tags: ["identity", "pan", "government", "tax"],
    notes: "The PAN itself is on the linked card images — it isn't stored in the app.",
    fields: [
      f("Issued by", "Income Tax Department"),
      f("e-PAN issued", "29 Nov 2024"),
      f("Also on file", "Photo of the physical card (14 Feb 2026)"),
    ],
    links: [
      file("e-PAN card (PDF)", "Identity/PAN Card/e-PAN Card (29 Nov 2024).pdf", "pdf"),
      file("Physical card (photo)", "Identity/PAN Card/PAN Card (Photo, 14 Feb 2026).jpeg", "image"),
    ],
  },
  {
    type: "id_doc",
    title: "Signature",
    aliases: ["signature", "sign", "signature image"],
    tags: ["identity", "signature"],
    notes: "For forms that ask for a signature image.",
    fields: [],
    links: [
      file("Signature (scan)", "Identity/Signature/Signature (Scan).jpg", "image"),
      file("Signature (transparent PNG, white ink)", "Identity/Signature/Signature - White on Transparent.png", "image"),
    ],
  },
  {
    type: "education",
    title: "B.E. Degree Certificate (VTU, 2023)",
    aliases: ["degree", "engineering degree", "be degree certificate", "vtu degree"],
    tags: ["education", "degree", "engineering", "vtu"],
    notes: "",
    fields: [
      f("University", "Visvesvaraya Technological University, Belagavi"),
      f("Degree", "Bachelor of Engineering — Electrical & Electronics Engineering"),
      f("College", "The National Institute of Engineering, Mysuru"),
      f("Class", "First Class with Distinction"),
      f("Passed", "August 2023 (certificate dated 1 Aug 2023)"),
    ],
    links: [
      file("Degree certificate (PDF)", "Education/Engineering (B.E.) - NIE Mysuru/B.E. Degree Certificate (VTU, Aug 2023).pdf", "pdf"),
    ],
  },
  {
    type: "education",
    title: "MBA PGCET 2024 — Exam & Syllabus",
    aliases: ["mba", "pgcet", "mba entrance", "mba finance syllabus"],
    tags: ["education", "mba", "pgcet", "2024"],
    notes: "",
    fields: [
      f("Exam", "MBA PGCET-2024, Sunday 4 Aug 2024, 2:30–4:30 pm"),
      f("Centre", "Surana PU College, Kengeri, Bengaluru"),
      f("Conducted by", "Karnataka Examinations Authority (KEA)"),
      f("Syllabus on file", "MBA (Finance), 1st year"),
    ],
    links: [
      file("Admission ticket", "Education/MBA (PGCET 2024)/PGCET 2024 Admission Ticket (Exam 4 Aug 2024).pdf", "pdf"),
      file("MBA Finance syllabus", "Education/MBA (PGCET 2024)/MBA Finance Syllabus (1st Year).pdf", "pdf"),
      file("2024 question paper with expected key answers", "Education/MBA (PGCET 2024)/Question Papers/MBA PGCET 2024 Question Paper (B4) with Expected Key Answers (4 Aug 2024).pdf", "pdf"),
    ],
  },
  {
    type: "education",
    title: "MBA PGCET Question Papers (2015-2023)",
    aliases: ["question papers", "previous papers", "pgcet papers", "mba practice papers"],
    tags: ["education", "mba", "pgcet", "practice"],
    notes: "Practice material, not your own documents. The 2024 paper is on the MBA PGCET 2024 card.",
    fields: [
      f("Years", "2015 – 2021 and 2023"),
    ],
    links: [
      file("PGCET 2015 (9 Aug 2015)", "Education/MBA (PGCET 2024)/Question Papers/MBA PGCET 2015 Question Paper (9 Aug 2015).pdf", "pdf"),
      file("PGCET 2016 (2 Jul 2016)", "Education/MBA (PGCET 2024)/Question Papers/MBA PGCET 2016 Question Paper (2 Jul 2016).pdf", "pdf"),
      file("PGCET 2017 (2 Jul 2017)", "Education/MBA (PGCET 2024)/Question Papers/MBA PGCET 2017 Question Paper (2 Jul 2017).pdf", "pdf"),
      file("PGCET 2018 (15 Jul 2018)", "Education/MBA (PGCET 2024)/Question Papers/MBA PGCET 2018 Question Paper (15 Jul 2018).pdf", "pdf"),
      file("PGCET 2019 (21 Jul 2019)", "Education/MBA (PGCET 2024)/Question Papers/MBA PGCET 2019 Question Paper (21 Jul 2019).pdf", "pdf"),
      file("PGCET 2020", "Education/MBA (PGCET 2024)/Question Papers/MBA PGCET 2020 Question Paper.pdf", "pdf"),
      file("PGCET 2021 (answers highlighted)", "Education/MBA (PGCET 2024)/Question Papers/MBA PGCET 2021 Question Paper (Answers Highlighted).pdf", "pdf"),
      file("PGCET 2023 (24 Sep 2023)", "Education/MBA (PGCET 2024)/Question Papers/MBA PGCET 2023 Question Paper (24 Sep 2023).pdf", "pdf"),
    ],
  },
  {
    type: "education",
    title: "Udemy Certificate — AI Prompt Engineering and RAG (2026)",
    aliases: ["udemy", "course certificate", "prompt engineering", "rag"],
    tags: ["education", "certificate", "udemy", "ai", "2026"],
    notes: "",
    fields: [
      f("Course", "AI Prompt Engineering and RAG for Software Engineers"),
      f("Platform", "Udemy"),
      f("Length", "2 hours"),
      f("Completed", "8 Jun 2026"),
    ],
    links: [
      file("Certificate of completion", "Education/Certifications and Courses/Udemy - AI Prompt Engineering and RAG for Software Engineers (8 Jun 2026).pdf", "pdf"),
    ],
  },
  {
    type: "note",
    title: "Job Applications & Notices (2024)",
    aliases: ["job applications", "rrb", "railway recruitment", "petc", "zs careers", "call letter"],
    tags: ["career", "jobs", "applications", "2024"],
    notes: "",
    fields: [
      f("RRB JE (CEN 03/2024)", "CBT-1 on 18 Dec 2024, iON Digital Zone, Hebbal, Mysuru"),
      f("PETC training program", "Applied 27 Nov 2024 (Uniformed Services Training Program 2024-25)"),
      f("ZS", "Decision Analytics Associate, Pune — careers page print"),
    ],
    links: [
      file("RRB JE CBT-1 e-call letter", "Career/Job Applications/RRB JE CBT-1 E-Call Letter (Exam 18 Dec 2024).pdf", "pdf"),
      file("PETC application acknowledgement", "Career/Job Applications/PETC Uniformed Services Training Application Acknowledgement (27 Nov 2024).pdf", "pdf"),
      file("ZS Decision Analytics Associate posting", "Career/Job Notifications/ZS Decision Analytics Associate, Pune - Careers Page Print.pdf", "pdf"),
    ],
  },
  {
    type: "note",
    title: "Tata Electronics — Payslips & Tax (2024)",
    aliases: ["payslip", "salary slip", "form 16", "tata payslips", "tata tax"],
    tags: ["career", "tata", "payslip", "tax", "2024"],
    notes: "All nine PDFs are password-protected, so they were filed by file name only. Salary figures are not stored in the app.",
    fields: [
      f("Employer", "Tata Electronics"),
      f("Payslips on file", "Mar – Sep 2024 (7 months)"),
      f("Tax document", "FY 2024-25 (likely Form 16)"),
    ],
    links: [
      file("Payslip — Mar 2024", "Career/Employment/Tata Electronics (2023-2024)/Payslips/Tata Payslip - Mar 2024.pdf", "pdf"),
      file("Payslip — Apr 2024", "Career/Employment/Tata Electronics (2023-2024)/Payslips/Tata Payslip - Apr 2024.pdf", "pdf"),
      file("Payslip — May 2024", "Career/Employment/Tata Electronics (2023-2024)/Payslips/Tata Payslip - May 2024.pdf", "pdf"),
      file("Payslip — Jun 2024", "Career/Employment/Tata Electronics (2023-2024)/Payslips/Tata Payslip - Jun 2024.pdf", "pdf"),
      file("Payslip — Jul 2024", "Career/Employment/Tata Electronics (2023-2024)/Payslips/Tata Payslip - Jul 2024.pdf", "pdf"),
      file("Payslip — Aug 2024", "Career/Employment/Tata Electronics (2023-2024)/Payslips/Tata Payslip - Aug 2024.pdf", "pdf"),
      file("Payslip — Sep 2024", "Career/Employment/Tata Electronics (2023-2024)/Payslips/Tata Payslip - Sep 2024.pdf", "pdf"),
      file("Tax statement FY 2024-25", "Career/Employment/Tata Electronics (2023-2024)/Payslips/Tata Tax Statement FY 2024-25 (Likely Form 16).pdf", "pdf"),
    ],
  },
  {
    type: "note",
    title: "Tata Electronics — Wistron Training Material",
    aliases: ["wistron", "case study", "line details", "rf testing", "csa"],
    tags: ["career", "tata", "wistron", "training", "manufacturing"],
    notes: "Several files exist in more than one version (different slide counts); all are kept.",
    fields: [
      f("Employer", "Tata Electronics (Wistron Infocomm Manufacturing plant)"),
      f("Contents", "Case studies (sensor flex, compass IC lift-up, ringer switch), line details, glossary, RF test notes"),
    ],
    links: [
      file("Sensor Flex — Half Soldering Issue (11 slides)", "Career/Employment/Tata Electronics (2023-2024)/Wistron Training Material/Case Studies/Sensor Flex - Half Soldering Issue (11 slides).pptx", "doc"),
      file("Sensor Flex — Half Soldering Issue (9 slides)", "Career/Employment/Tata Electronics (2023-2024)/Wistron Training Material/Case Studies/Sensor Flex - Half Soldering Issue (9 slides).pptx", "doc"),
      file("Sensor Flex — Half Soldering Issue — Team ProMax", "Career/Employment/Tata Electronics (2023-2024)/Wistron Training Material/Case Studies/Sensor Flex - Half Soldering Issue - Team ProMax.pptx", "doc"),
      file("Compass IC Lift-up — Team Omega (10 slides)", "Career/Employment/Tata Electronics (2023-2024)/Wistron Training Material/Case Studies/Compass IC Lift-up - Team Omega (10 slides).pptx", "doc"),
      file("Compass IC Lift-up — Team Omega (11 slides)", "Career/Employment/Tata Electronics (2023-2024)/Wistron Training Material/Case Studies/Compass IC Lift-up - Team Omega (11 slides).pptx", "doc"),
      file("Ringer Switch Line — Star Team (12 slides)", "Career/Employment/Tata Electronics (2023-2024)/Wistron Training Material/Case Studies/Ringer Switch Line - Star Team (12 slides).pptx", "doc"),
      file("Ringer Switch Line — Star Team (13 slides)", "Career/Employment/Tata Electronics (2023-2024)/Wistron Training Material/Case Studies/Ringer Switch Line - Star Team (13 slides).pptx", "doc"),
      file("Ringer Switch — Connector Damage", "Career/Employment/Tata Electronics (2023-2024)/Wistron Training Material/Case Studies/Ringer Switch - Connector Damage (9 slides).pptx", "doc"),
      file("Line Details (spreadsheet)", "Career/Employment/Tata Electronics (2023-2024)/Wistron Training Material/Reference/Line Details.xlsx", "doc"),
      file("P75 Line Details (spreadsheet)", "Career/Employment/Tata Electronics (2023-2024)/Wistron Training Material/Reference/P75 Line Details.xlsx", "doc"),
      file("MLB Engineering — Full Forms", "Career/Employment/Tata Electronics (2023-2024)/Wistron Training Material/Reference/MLB Engineering - Full Forms.docx", "doc"),
      file("RF Testing Stations — handwritten notes", "Career/Employment/Tata Electronics (2023-2024)/Wistron Training Material/Reference/RF Testing Stations - Handwritten Notes.pdf", "pdf"),
    ],
  },
  {
    type: "note",
    title: "MAA Academy — Resignation (Nov 2025)",
    aliases: ["resignation", "maa academy", "resignation mail", "notice"],
    tags: ["career", "maa-academy", "resignation", "2025"],
    notes: "",
    fields: [
      f("Role", "Program Manager"),
      f("Resigned", "13 Nov 2025, effective 14 Nov 2025"),
      f("Accepted", "13 Nov 2025 (reply in the same thread)"),
    ],
    links: [
      file("Resignation email thread", "Career/Employment/MAA Academy/MAA Academy Resignation Mail (13 Nov 2025).pdf", "pdf"),
    ],
  },
  {
    type: "note",
    title: "Emids — Offer & Onboarding (2025)",
    aliases: ["emids", "offer letter", "joining", "pf form", "loa", "background check"],
    tags: ["career", "emids", "offer", "onboarding", "2025"],
    notes: "The accepted offer letter contains the compensation terms — the figures are not stored in the app.",
    fields: [
      f("Employer", "Emids Technologies Private Limited"),
      f("Role", "Senior Consultant"),
      f("Offer dated", "15 Nov 2025 (accepted)"),
      f("Also on file", "HR assessment form, background-check authorizations, EPF Form 11"),
    ],
    links: [
      file("Offer letter — accepted", "Career/Employment/Emids (2025-Present)/Offer and Onboarding/Emids Offer Letter - Senior Consultant (Accepted, 15 Nov 2025).pdf", "pdf"),
      file("HR assessment feedback form", "Career/Employment/Emids (2025-Present)/Offer and Onboarding/Emids HR Assessment Feedback Form (Senior Consultant).pdf", "pdf"),
      file("Letter of authorization — digital validation", "Career/Employment/Emids (2025-Present)/Offer and Onboarding/Emids Letter of Authorization - Candidate Digital Validation.pdf", "pdf"),
      file("Letter of authorization — background check", "Career/Employment/Emids (2025-Present)/Offer and Onboarding/Emids Letter of Authorization - Background Check.pdf", "pdf"),
      file("Background check declaration (e-signed)", "Career/Employment/Emids (2025-Present)/Offer and Onboarding/Emids Background Check Declaration (E-Signed).pdf", "pdf"),
      file("EPF Form 11 (PDF)", "Career/Employment/Emids (2025-Present)/Offer and Onboarding/Emids EPF Form 11 (PF Declaration).pdf", "pdf"),
      file("EPF Form 11 (Excel)", "Career/Employment/Emids (2025-Present)/Offer and Onboarding/EPF Form 11 (Excel).xls", "doc"),
    ],
  },
  {
    type: "note",
    title: "Emids — Policies & Work Notes",
    aliases: ["emids policy", "work from office", "shift allowance", "llm notes", "python notes"],
    tags: ["career", "emids", "policy", "notes"],
    notes: "Company policies are marked internal/confidential. The bank-contacts sheet holds other people's contact details.",
    fields: [
      f("Policies", "Work-from-office guidelines (Feb 2026); shift allowance policy (from 1 Jan 2024)"),
      f("Notes", "LLM chatbot guide, LLM learning plan, Python notes, JD notes, project diagram"),
    ],
    links: [
      file("Work from Office Guidelines (Feb 2026)", "Career/Employment/Emids (2025-Present)/Company Policies/Emids India Work from Office Guidelines (Feb 2026).pdf", "pdf"),
      file("Shift Allowance Policy", "Career/Employment/Emids (2025-Present)/Company Policies/Emids Shift Allowance Policy (Effective 1 Jan 2024).pdf", "pdf"),
      file("5 Steps to Build an LLM Chatbot (PDF)", "Career/Employment/Emids (2025-Present)/Work Notes/5 Steps to Build an LLM Chatbot.pdf", "pdf"),
      file("5 Steps to Build an LLM Chatbot (Word)", "Career/Employment/Emids (2025-Present)/Work Notes/5 Steps to Build an LLM Chatbot - Editable.docx", "doc"),
      file("JD Info — Gen AI Healthcare Role (PDF)", "Career/Employment/Emids (2025-Present)/Work Notes/JD Info - Gen AI Healthcare Role.pdf", "pdf"),
      file("JD Info — Gen AI Healthcare Role (Word)", "Career/Employment/Emids (2025-Present)/Work Notes/JD Info - Gen AI Healthcare Role - Editable.docx", "doc"),
      file("Large Language Models — Learning Plan", "Career/Employment/Emids (2025-Present)/Work Notes/Large Language Models - Learning Plan.docx", "doc"),
      file("Python — My Learning Notes", "Career/Employment/Emids (2025-Present)/Work Notes/Python - My Learning Notes.docx", "doc"),
      file("Python — 3-Day Fast-Track Plan", "Career/Employment/Emids (2025-Present)/Work Notes/Python - 3-Day Fast-Track Plan.docx", "doc"),
      file("Bank contacts (spreadsheet)", "Career/Employment/Emids (2025-Present)/Work Notes/Emids Bank Contacts (Third-Party Contacts).xlsx", "doc"),
      file("NextGen MemberEdge data-flow diagram", "Career/Employment/Emids (2025-Present)/Work Notes/NextGen MemberEdge Data Flow Diagram (Screenshot 19 Nov 2025).png", "image"),
    ],
  },
  {
    type: "bank",
    title: "HDFC Personal Loan (2024)",
    aliases: ["hdfc loan", "personal loan", "loan repayment schedule", "hdfc emi"],
    tags: ["finance", "loan", "hdfc"],
    notes: "Loan and account numbers are in the schedule PDF, not in the app.",
    fields: [
      f("Lender", "HDFC Bank"),
      f("Type", "Micro personal loan"),
      f("Schedule dated", "1 Jul 2024"),
      f("Instalments", "36 monthly, first due 7 Jun 2024"),
    ],
    links: [
      file("Repayment schedule (1 Jul 2024)", "Finance/Loans/HDFC Personal Loan/HDFC Personal Loan Repayment Schedule (1 Jul 2024).pdf", "pdf"),
    ],
  },
  {
    type: "bank",
    title: "Kotak Personal Loan (2025)",
    aliases: ["kotak loan", "kotak emi", "personal loan kotak"],
    tags: ["finance", "loan", "kotak"],
    notes: "Loan account and relationship numbers are in the PDF, not in the app.",
    fields: [
      f("Lender", "Kotak Mahindra Bank"),
      f("Disbursed", "28 Apr 2025"),
      f("Runs until", "2 May 2027"),
    ],
    links: [
      file("Repayment schedule (Apr 2025 – May 2027)", "Finance/Loans/Kotak Personal Loan/Kotak Personal Loan Repayment Schedule (Apr 2025 - May 2027).pdf", "pdf"),
    ],
  },
  {
    type: "bank",
    title: "Fibe Loan (EarlySalary / Oxyzo, 2025)",
    aliases: ["fibe", "earlysalary", "oxyzo", "cash loan", "fibe loan"],
    tags: ["finance", "loan", "fibe"],
    notes: "Loan and customer ids are in the documents, not in the app.",
    fields: [
      f("Lender", "EarlySalary Services (20%) with Oxyzo Financial Services (80%)"),
      f("Product", "Cash loan, 18 months, monthly EMI"),
      f("Statement covers", "1 Aug 2025 – 17 Sep 2026"),
    ],
    links: [
      file("Loan agreement", "Finance/Loans/Fibe Loan (EarlySalary - Oxyzo)/Fibe Loan Agreement.pdf", "pdf"),
      file("Sanction letter", "Finance/Loans/Fibe Loan (EarlySalary - Oxyzo)/Fibe Loan Sanction Letter.pdf", "pdf"),
      file("Key Fact Statement", "Finance/Loans/Fibe Loan (EarlySalary - Oxyzo)/Fibe Loan Key Fact Statement.pdf", "pdf"),
      file("Product details", "Finance/Loans/Fibe Loan (EarlySalary - Oxyzo)/Fibe Loan Product Details.pdf", "pdf"),
      file("Statement of account", "Finance/Loans/Fibe Loan (EarlySalary - Oxyzo)/Fibe Loan Statement of Account (Aug 2025 - Sep 2026).pdf", "pdf"),
      file("Privacy policy", "Finance/Loans/Fibe Loan (EarlySalary - Oxyzo)/Fibe Loan Privacy Policy.pdf", "pdf"),
    ],
  },
  {
    type: "bank",
    title: "CIBIL Credit Reports (2026)",
    aliases: ["cibil", "credit score", "credit report", "credit health"],
    tags: ["finance", "credit", "cibil", "2026"],
    notes: "The score and account details are inside the reports — not copied into the app.",
    fields: [
      f("Reports on file", "2 Jun 2026 and 3 Jul 2026"),
    ],
    links: [
      file("CIBIL report — 3 Jul 2026", "Finance/Credit Reports/CIBIL Credit Report (3 Jul 2026).pdf", "pdf"),
      file("CIBIL report — 2 Jun 2026", "Finance/Credit Reports/CIBIL Credit Report (2 Jun 2026).pdf", "pdf"),
    ],
  },
  {
    type: "bank",
    title: "HDFC Bank Account",
    aliases: ["hdfc", "hdfc bank", "hdfc statement", "salary account"],
    tags: ["bank", "hdfc", "savings"],
    notes: "The account number is on the statement, not in the app.",
    fields: [
      f("Bank", "HDFC Bank"),
      f("Branch", "Hoskote"),
      f("Opened", "25 Sep 2023"),
      f("Statement generated", "1 Jun 2026"),
    ],
    links: [
      file("Account statement (generated 1 Jun 2026)", "Banking/HDFC Bank/HDFC Bank Account Statement (generated 1 Jun 2026).pdf", "pdf"),
    ],
  },
];

function existsOnDisk(link: { url: string }) {
  if (!link.url.startsWith("/files/")) return true;
  const rel = decodeURIComponent(link.url.slice("/files/".length));
  return existsSync(path.join(process.cwd(), "docs", ...rel.split("/")));
}

async function main() {
  const existing = new Map((await listCards(userId)).map((c) => [c.title, c]));
  // Titles of cards that are in the Trash: never re-create those (restore them from the app instead).
  const everTitles = new Set(await listAllCardTitles(userId));
  let created = 0;
  let extended = 0;

  for (const source of cards) {
    // Never attach a link to a file that isn't in docs/ any more. Deleting a file
    // (Trash or "delete forever") detaches it from its cards on purpose, and
    // re-adding it here would bring back a dead link.
    const card = { ...source, links: source.links.filter(existsOnDisk) };
    const current = existing.get(card.title);

    if (!current) {
      if (everTitles.has(card.title)) {
        console.log(`skip     ${card.title} (in the Trash — restore it in the app)`);
        continue;
      }
      await createCard(userId, card);
      created++;
      console.log(`created  ${card.title}`);
      continue;
    }

    // Already there — never overwrite what you may have edited in the app.
    // Only add links that aren't attached yet.
    const have = new Set(current.links.map((l) => l.url));
    const missing = card.links.filter((l) => !have.has(l.url));
    if (missing.length === 0) {
      console.log(`skip     ${card.title}`);
      continue;
    }
    await updateCard(userId, current.id, {
      type: current.type,
      title: current.title,
      aliases: current.aliases,
      tags: current.tags,
      notes: current.notes,
      fields: current.fields.map((x) => ({ key: x.key, value: x.value, isSecret: x.isSecret })),
      links: [
        ...current.links.map((l) => ({
          label: l.label,
          url: l.url,
          source: l.source,
          driveFileId: l.driveFileId,
          kind: l.kind,
        })),
        ...missing,
      ],
    });
    extended++;
    console.log(`extended ${card.title} (+${missing.length} link${missing.length > 1 ? "s" : ""})`);
  }

  console.log(`\nDone: ${created} created, ${extended} extended, ${cards.length - created - extended} unchanged.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
