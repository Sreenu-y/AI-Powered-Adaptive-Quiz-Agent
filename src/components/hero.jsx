"use client";

import Link from "next/link";
import React, { useEffect, useRef } from "react";
import { Button } from "./ui/button";
import Image from "next/image";
import { useUser, SignUpButton, SignInButton } from "@clerk/nextjs";

const HeroSection = () => {
  const { isSignedIn } = useUser();
  const imageRef = useRef(null);

  useEffect(() => {
    const imageElement = imageRef.current;

    if (!imageElement) return;

    let ticking = false;
    const scrollThreshold = 100;

    const handleScroll = () => {
      const scrollPosition = window.scrollY || window.pageYOffset;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (scrollPosition > scrollThreshold) {
            imageElement.classList.add("scrolled");
          } else {
            imageElement.classList.remove("scrolled");
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <section className="w-full pt-36 md:pt-48 relative z-10">
      <div className="space-y-6 text-center">
        <div className="space-y-6 mx-auto">
          <h1 className="text-6xl font-bold md:text-6xl lg:text-6xl xl:text-7xl gradient-title">
            Master Any Subject with
            <br />
            AI-Powered Adaptive Quizzes
          </h1>
          <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl">
            Generate personalized quizzes from any topic, document, or URL.
            Learn faster with AI-driven insights and adaptive difficulty.
          </p>
        </div>

        <div>
          {isSignedIn ? (
            <Link href="/dashboard">
              <Button size="lg" className="px-8 text-md">
                Get Started
              </Button>
            </Link>
          ) : (
            <SignInButton mode="modal">
              <Button size="lg" className="px-8 text-md">
                Get Started
              </Button>
            </SignInButton>
          )}
        </div>

        <div className="hero-image-wrapper mt-5 md:mt-0 flex justify-center">
          <div ref={imageRef} className="hero-image">
            <Image
              src="/banner1.jpeg"
              height={720}
              width={1200}
              alt="Quiz Agent Banner"
              className="rounded-lg shadow-2xl border mx-auto"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
