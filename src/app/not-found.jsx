"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Globe } from "@/components/ui/cosmic-404";
import { useRouter } from "next/navigation";

// Animation Variants
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: "easeOut" } },
};

const globeVariants = {
  hidden: { scale: 0.85, opacity: 0, y: 10 },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: { duration: 1, ease: "easeOut" },
  },
  floating: {
    y: [-4, 4],
    transition: {
      duration: 5,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "reverse",
    },
  },
};

export default function NotFound({
  title = "Ups! Lost in space",
  description = "We couldn't find the page you're looking for. It might have been moved or deleted.",
  backText = "Go Back",
}) {
  const router = useRouter();

  const handleBack = () => {
    // If there is no history, next/navigation router.back() still works but might go nowhere.
    // We can also provide a solid push if they prefer.
    router.back();
  };

  return (
    <div className="flex flex-col justify-center items-center px-4 h-screen bg-background overflow-hidden relative">
      <AnimatePresence mode="wait">
        <motion.div
          className="text-center z-10"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={fadeUp}
        >
          <div className="flex items-center justify-center gap-4 md:gap-6 mb-10 mt-[-10vh]">
            <motion.span
              className="text-8xl md:text-9xl font-bold text-foreground select-none"
              variants={fadeUp}
            >
              4
            </motion.span>

            <motion.div
              className="relative w-32 h-32 md:w-48 md:h-48"
              variants={globeVariants}
              animate={["visible", "floating"]}
            >
              <Globe />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.08)_0%,transparent_70%)]" />
            </motion.div>

            <motion.span
              className="text-8xl md:text-9xl font-bold text-foreground select-none"
              variants={fadeUp}
            >
              4
            </motion.span>
          </div>

          <motion.h1
            className="mb-4 text-4xl md:text-6xl font-bold tracking-tight text-foreground"
            variants={fadeUp}
          >
            {title}
          </motion.h1>

          <motion.p
            className="mx-auto mb-10 max-w-md text-base md:text-lg text-muted-foreground"
            variants={fadeUp}
          >
            {description}
          </motion.p>

          <motion.div variants={fadeUp}>
            <Button 
              onClick={handleBack}
              className="gap-2 hover:scale-105 transition-all duration-500 cursor-pointer rounded-full px-8 h-12 text-base shadow-lg shadow-primary/20"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              {backText}
            </Button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
      
      {/* Background decorations for extra cosmic feel */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[10%] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-blue-500/5 blur-[100px]" />
      </div>
    </div>
  );
}
