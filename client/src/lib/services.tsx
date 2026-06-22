import {
  FileText,
  Linkedin,
  ScanSearch,
  MessagesSquare,
  Building2,
  FileSignature,
  Scale,
  type LucideIcon,
} from "lucide-react";

export const SERVICE_ICON: Record<string, LucideIcon> = {
  "cv-anpassning": FileText,
  "linkedin-makeover": Linkedin,
  "cv-granskning": ScanSearch,
  intervju: MessagesSquare,
  "brf-analys": Building2,
  "avtal-granskning": FileSignature,
  overklagande: Scale,
};

export const CATEGORY_LABEL: Record<string, string> = {
  job: "Jobbsök",
  private: "Privatliv",
};
