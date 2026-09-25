import {
  IdCard,
  Landmark,
  ShieldCheck,
  Car,
  Home,
  HeartPulse,
  GraduationCap,
  User,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import type { CardType } from "@/db/schema";

export const CARD_TYPE_META: Record<
  CardType,
  { label: string; plural: string; icon: LucideIcon; tone: string }
> = {
  id_doc: {
    label: "ID Document",
    plural: "ID Documents",
    icon: IdCard,
    tone: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  },
  bank: {
    label: "Bank",
    plural: "Banking",
    icon: Landmark,
    tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  insurance: {
    label: "Insurance",
    plural: "Insurance",
    icon: ShieldCheck,
    tone: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  },
  vehicle: {
    label: "Vehicle",
    plural: "Vehicles",
    icon: Car,
    tone: "bg-amber-500/14 text-amber-700 dark:text-amber-300",
  },
  property: {
    label: "Property",
    plural: "Property",
    icon: Home,
    tone: "bg-orange-500/12 text-orange-700 dark:text-orange-300",
  },
  medical: {
    label: "Medical",
    plural: "Medical",
    icon: HeartPulse,
    tone: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  },
  education: {
    label: "Education",
    plural: "Education",
    icon: GraduationCap,
    tone: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
  },
  contact: {
    label: "Contact",
    plural: "Contacts",
    icon: User,
    tone: "bg-teal-500/12 text-teal-700 dark:text-teal-300",
  },
  note: {
    label: "Note",
    plural: "Notes",
    icon: StickyNote,
    tone: "bg-stone-500/14 text-stone-700 dark:text-stone-300",
  },
};
