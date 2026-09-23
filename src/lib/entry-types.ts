import {
  StickyNote,
  Landmark,
  FileText,
  CalendarClock,
  User,
  IdCard,
  type LucideIcon,
} from "lucide-react";
import type { EntryType } from "@/db/schema";

export const ENTRY_TYPE_META: Record<
  EntryType,
  { label: string; icon: LucideIcon }
> = {
  note: { label: "Note", icon: StickyNote },
  account: { label: "Account", icon: Landmark },
  document: { label: "Document", icon: FileText },
  date: { label: "Date", icon: CalendarClock },
  contact: { label: "Contact", icon: User },
  id_doc: { label: "ID Document", icon: IdCard },
};
