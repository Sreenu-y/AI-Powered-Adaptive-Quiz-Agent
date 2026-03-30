import { BrainCircuit, GraduationCap, Laptop, ScrollText } from "lucide-react";

export const features = [
  {
    icon: <BrainCircuit className="w-10 h-10 mb-4 text-primary" />,
    title: "Automatic Generation",
    description:
      "Instantly create quizzes from any topic, uploaded document, or web URL using advanced AI.",
  },
  {
    icon: <GraduationCap className="w-10 h-10 mb-4 text-primary" />,
    title: "Support for All Types",
    description:
      "Generate Multiple Choice (MCQs), True/False, and Fill-in-the-Blank questions effortlessly.",
  },
  {
    icon: <Laptop className="w-10 h-10 mb-4 text-primary" />,
    title: "Adaptive Learning",
    description:
      "Experience quizzes that get smarter as you do, dynamically adjusting difficulty in real-time.",
  },
  {
    icon: <ScrollText className="w-10 h-10 mb-4 text-primary" />,
    title: "AI Explanations",
    description: "Get deep insights and clear explanations for every answer to reinforce your understanding.",
  },
];
