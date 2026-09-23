// Seed script — fake data and dummy Drive URLs only. Never run this
// against real personal data.
//
// Requires a real Supabase auth user id: sign in once via the app first,
// then find your user id in Supabase Dashboard -> Authentication -> Users,
// and run: SEED_USER_ID=<uuid> npm run db:seed
import { createCard } from "../src/lib/cards";

const userId = process.env.SEED_USER_ID;
if (!userId) {
  console.error("Set SEED_USER_ID to your Supabase auth user id (sign in once first).");
  process.exit(1);
}

const seedCards: Parameters<typeof createCard>[1][] = [
  {
    type: "id_doc",
    title: "Aadhaar Card",
    aliases: ["aadhar", "adhaar", "UID"],
    tags: ["identity"],
    notes: "",
    fields: [
      { key: "Name", value: "Test Person", isSecret: false },
      { key: "DOB", value: "1995-04-12", isSecret: false },
      { key: "Aadhaar Number", value: "234917778821", isSecret: true },
    ],
    links: [
      {
        label: "e-Aadhaar",
        url: "https://drive.google.com/file/d/1a2B3c4D5e6F7g8H9i0JklMnoPqrSt/view",
        source: "drive",
        driveFileId: "1a2B3c4D5e6F7g8H9i0JklMnoPqrSt",
        kind: "pdf",
      },
    ],
  },
  {
    type: "id_doc",
    title: "PAN Card",
    aliases: ["pan", "permanent account number"],
    tags: ["identity", "tax"],
    notes: "",
    fields: [{ key: "PAN Number", value: "ABCDE1234F", isSecret: true }],
    links: [],
  },
  {
    type: "bank",
    title: "HDFC Savings Account",
    aliases: ["hdfc"],
    tags: ["bank"],
    notes: "Primary salary account. Branch: Koramangala.",
    fields: [
      { key: "IFSC", value: "HDFC0001234", isSecret: false },
      { key: "Branch", value: "Koramangala, Bengaluru", isSecret: false },
      { key: "Account Number", value: "50100234567890", isSecret: true },
    ],
    links: [],
  },
  {
    type: "vehicle",
    title: "Maruti Swift - RC",
    aliases: ["car papers", "RC book"],
    tags: ["car", "vehicle"],
    notes: "Registration certificate for the Swift.",
    fields: [
      { key: "Registration No", value: "KA-01-AB-1234", isSecret: false },
      { key: "Owner", value: "Test Person", isSecret: false },
    ],
    links: [
      {
        label: "RC PDF",
        url: "https://drive.google.com/file/d/2b3C4d5E6f7G8h9I0jKlMnOpQrStUv/view",
        source: "drive",
        driveFileId: "2b3C4d5E6f7G8h9I0jKlMnOpQrStUv",
        kind: "pdf",
      },
    ],
  },
  {
    type: "insurance",
    title: "Car Insurance - ICICI Lombard",
    aliases: ["car papers", "car insurance"],
    tags: ["insurance", "car"],
    notes: "Comprehensive cover for the Swift.",
    fields: [
      { key: "Policy No", value: "ICIC-CAR-88213", isSecret: false },
      { key: "Insurer", value: "ICICI Lombard", isSecret: false },
      { key: "Renews", value: "2027-03-05", isSecret: false },
    ],
    links: [],
  },
  {
    type: "medical",
    title: "Dr. Priya Nair - Dentist",
    aliases: [],
    tags: ["health", "dentist"],
    notes: "Smile Dental Clinic, Indiranagar.",
    fields: [
      { key: "Phone", value: "+91 98450 12345", isSecret: false },
      { key: "Clinic", value: "Smile Dental Clinic", isSecret: false },
    ],
    links: [],
  },
  {
    type: "note",
    title: "Wifi Router Reset Steps",
    aliases: [],
    tags: ["home", "wifi"],
    notes: "Hold reset for 10s, wait for blink, reconfigure via 192.168.1.1.",
    fields: [],
    links: [],
  },
];

for (const card of seedCards) {
  await createCard(userId, card);
}

console.log(`Seeded ${seedCards.length} cards for user ${userId}.`);
