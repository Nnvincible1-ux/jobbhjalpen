import {
  FileText,
  Linkedin,
  ScanSearch,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";

export const SERVICE_ICON: Record<string, LucideIcon> = {
  "cv-anpassning": FileText,
  "linkedin-makeover": Linkedin,
  "cv-granskning": ScanSearch,
  intervju: MessagesSquare,
};

export const CATEGORY_LABEL: Record<string, string> = {
  job: "Jobbsök",
};
