# Docs

Documents kept alongside Locker: personal papers (certificates, statements,
IDs) and project notes.

## How this folder works

1. **Drop new files into [`Inbox/`](Inbox/)** — any format, any name, no need to tidy first.
2. Ask Claude to organize. It sorts each file into a topic folder, gives it a readable name,
   and updates the index.

## Privacy — read this

This repo is pushed to GitHub, and the folder holds sensitive personal
documents. `.gitignore` is set so that **only this README and the empty
`Inbox/` marker are ever tracked**; every document and the index itself
(`INDEX.md`) stay on this machine. Before adding anything new here, don't
loosen those rules.

## Layout

- `Identity/` — `Aadhaar/`, `PAN Card/`, `Driving Licence/`, `Photos/`, `Signature/`, `Notes/`
- `Education/` — `SSLC (10th Standard)/`, `PUC (12th Standard)/`, `Engineering (B.E.) - NIE Mysuru/`
  (Admission, Circulars, Study Material), `MBA (PGCET 2024)/`, `CET and KEA Counselling 2019/`,
  `Entrance Exams/`, `Scholarships/`, `Certifications and Courses/`, `Career Guidance/`
- `Government Certificates/` — `Caste Certificate (SC)/`, `Income Certificate/`
- `Banking/` — by bank (`SBI/`, `HDFC Bank/`, `Syndicate - Canara Bank/`, `Karnataka Bank/`), plus `Family Accounts/` and `Forms/`
- `Finance/` — `Loans/` (HDFC, Kotak, Fibe) and `Credit Reports/`
- `Career/` — `Employment/` (Tata Electronics, MAA Academy, Emids), `Resumes/`, `Job Applications/`, `Job Notifications/`
- `Medical/`, `Housing/`, `Purchases/` — one topic each
- `Reference/` — reading material that isn't yours (`Books/`, `KEA and Board Lists/`, `Legal/`, `Study Material/`)
- `Inbox/` — drop zone, empty after each organizing pass
- `Needs Review/` — needs a human decision:
  - `Exact Duplicates/` — byte-identical copies (checksum-verified)
  - `Lower Resolution Copies/` — lower-quality scans of a filed document
  - `Not Yours/` — other people's documents
  - `Credentials/` — files containing passwords
  - `Personal Notes/` — small personal text notes

The app shows this as a tree on its **Structure** tab, and as a searchable list on **Documents**.
The full file-by-file listing is in `INDEX.md` (local only).

## Conventions

- Folders and files use readable Title Case names with spaces
  (`SSLC Marks Card (Apr 2017).pdf`); the date goes in the name where it matters.
- Scans and photos of the same document: the main file keeps the plain name, a second
  format gets a suffix (`- Scan`), e.g. `SSLC Marks Card (Apr 2017) - Scan.jpg`.
- Originals are never edited or deleted when sorting — only moved and renamed
  (original names are recorded in `INDEX.md`). Anything doubtful goes to `Needs Review/`.
- One main copy per document: the best-quality capture stays in its topic folder; other
  captures (photos, second PDFs, compressed copies) are filed in the same folder, named
  for how they differ (`- Photo`, `- Second PDF Copy`). Only byte-identical copies go to
  `Needs Review/Exact Duplicates/`.
