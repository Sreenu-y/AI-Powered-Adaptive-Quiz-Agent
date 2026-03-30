"use client";

import { useUser, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Button } from "./ui/button";
import { LayoutDashboard, Sparkles } from "lucide-react";

const Header = () => {
  const { isSignedIn } = useUser();

  return (
    <header className="fixed top-0 w-full border-b bg-background/80 backdrop-blur-md z-50 supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/">
          <Image
            src="/logo.png"
            width={200}
            height={200}
            alt="Quiz Agent Logo"
            className="h-12 py-1 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center space-x-2 md:space-x-4">
          {isSignedIn && (
            <>
              <Link href="/dashboard/quiz">
                <Button
                  variant="outline"
                  className="hidden md:flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Take Quiz
                </Button>
                <Button variant="outline" className="md:hidden size-9 p-0">
                  <Sparkles className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  className="hidden md:flex items-center gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
                <Button variant="outline" className="md:hidden size-9 p-0">
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              </Link>
            </>
          )}

          {!isSignedIn ? (
            <>
              <SignInButton mode="modal">
                <Button variant="outline">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button>Sign Up</Button>
              </SignUpButton>
            </>
          ) : (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-10 w-10",
                },
              }}
              afterSignOutUrl="/"
            />
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
