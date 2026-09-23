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
  { label: string; icon: LucideIcon }
> = {
  id_doc: { label: "ID Document", icon: IdCard },
  bank: { label: "Bank", icon: Landmark },
  insurance: { label: "Insurance", icon: ShieldCheck },
  vehicle: { label: "Vehicle", icon: Car },
  property: { label: "Property", icon: Home },
  medical: { label: "Medical", icon: HeartPulse },
  education: { label: "Education", icon: GraduationCap },
  contact: { label: "Contact", icon: User },
  note: { label: "Note", icon: StickyNote },
};
