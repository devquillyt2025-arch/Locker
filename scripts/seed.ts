// Seed script — fake data only. Never run this against real personal data.
import { runMigrations } from "../src/db/migrate";
runMigrations();

import { createEntry } from "../src/lib/entries";

const seedEntries: Parameters<typeof createEntry>[0][] = [
  {
    type: "account",
    title: "HDFC Savings Account",
    body: "Primary salary account. Branch: Koramangala.",
    tags: ["bank", "hdfc"],
    fields: [
      { key: "IFSC", value: "HDFC0001234", sensitive: false },
      { key: "Branch", value: "Koramangala, Bengaluru", sensitive: false },
      { key: "Account Number", value: "50100234567890", sensitive: true },
    ],
  },
  {
    type: "account",
    title: "SBI Salary Account",
    body: "Old employer account, kept for FDs.",
    tags: ["bank", "sbi"],
    fields: [
      { key: "IFSC", value: "SBIN0004417", sensitive: false },
      { key: "Branch", value: "MG Road, Bengaluru", sensitive: false },
      { key: "Account Number", value: "34557890124417", sensitive: true },
    ],
  },
  {
    type: "document",
    title: "Car Insurance - ICICI Lombard",
    body: "Comprehensive cover for the Swift.",
    tags: ["insurance", "car"],
    fields: [
      { key: "Policy No", value: "ICIC-CAR-88213", sensitive: false },
      { key: "Renews", value: "2027-03-05", sensitive: false },
    ],
  },
  {
    type: "date",
    title: "Car Insurance Renewal",
    body: "ICICI Lombard comprehensive cover renewal.",
    tags: ["insurance", "car", "reminder"],
    fields: [{ key: "Due", value: "2027-03-05", sensitive: false }],
  },
  {
    type: "contact",
    title: "Dr. Priya Nair - Dentist",
    body: "Smile Dental Clinic, Indiranagar.",
    tags: ["health", "dentist"],
    fields: [
      { key: "Phone", value: "+91 98450 12345", sensitive: false },
      { key: "Clinic", value: "Smile Dental Clinic", sensitive: false },
    ],
  },
  {
    type: "id_doc",
    title: "Passport",
    body: "Regular passport, 10-year validity.",
    tags: ["identity", "travel"],
    fields: [
      { key: "Passport No", value: "N1234567", sensitive: true },
      { key: "Expiry", value: "2031-08-14", sensitive: false },
    ],
  },
  {
    type: "note",
    title: "Wifi Router Reset Steps",
    body: "Hold reset for 10s, wait for blink, reconfigure via 192.168.1.1.",
    tags: ["home", "wifi"],
    fields: [],
  },
];

for (const entry of seedEntries) {
  createEntry(entry);
}

console.log(`Seeded ${seedEntries.length} entries.`);
