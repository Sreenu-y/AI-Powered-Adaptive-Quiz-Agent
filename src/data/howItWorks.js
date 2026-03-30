import { FileInput, Search, BadgeCheck, Zap } from "lucide-react";

export const howItWorks = [
  {
    title: "Provide Input",
    description: "Enter a topic, upload a document, or paste a URL to get started.",
    icon: <FileInput className="w-8 h-8 text-primary" />,
  },
  {
    title: "AI Analysis",
    description: "Our advanced AI analyzes the content to extract key concepts and facts.",
    icon: <Search className="w-8 h-8 text-primary" />,
  },
  {
    title: "Quiz Generation",
    description: "Get a custom quiz generated instantly with multiple question types.",
    icon: <BadgeCheck className="w-8 h-8 text-primary" />,
  },
  {
    title: "Adaptive Session",
    description: "Watch the system adapt difficulty in real-time while providing feedback.",
    icon: <Zap className="w-8 h-8 text-primary" />,
  },
];
