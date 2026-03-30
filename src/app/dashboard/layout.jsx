"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BrainCircuit,
  History,
  BarChart3,
  Menu,
  X,
  ChevronRight,
  PanelLeftClose,
  BookOpen,
  Bookmark,
  Users,
} from "lucide-react";

const sidebarLinks = [
  {
    title: "Main",
    links: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "AI Quiz", href: "/dashboard/quiz", icon: BrainCircuit },
      { label: "Learn", href: "/dashboard/learn", icon: BookOpen },
      { label: "Saved Notes", href: "/dashboard/saved", icon: Bookmark },
      { label: "Team Quiz", href: "/dashboard/team", icon: Users },
    ],
  },
  {
    title: "Analytics",
    links: [
      { label: "History", href: "/dashboard/history", icon: History },
      { label: "Performance Insights", href: "/dashboard/analytics", icon: BarChart3 },
    ],
  },
];

export default function DashboardLayout({ children }) {
  const fullName = useUser()?.user?.fullName;
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile
  const [collapsed, setCollapsed] = useState(false); // desktop toggle

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/50 bg-card transition-all duration-300 lg:static lg:translate-x-0",
          collapsed ? "lg:w-[68px]" : "lg:w-64",
          "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <BrainCircuit className="h-6 w-6 text-primary shrink-0" />
            {!collapsed && (
              <span className="text-lg font-bold gradient-title truncate">
                Quiz Agent
              </span>
            )}
          </Link>
          {/* Mobile close */}
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
          {/* Desktop collapse toggle — only visible when expanded */}
          {!collapsed && (
            <button
              className="hidden lg:flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {sidebarLinks.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </p>
              )}
              <div className="space-y-1">
                {group.links.map((link) => {
                  const isActive =
                    pathname === link.href ||
                    (link.href !== "/dashboard" &&
                      pathname.startsWith(link.href));
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setSidebarOpen(false)}
                      title={collapsed ? link.label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        collapsed && "justify-center px-2",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <link.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer with user */}
        <div className="border-t border-border/50 p-4">
          <div
            className={cn(
              "flex items-center gap-3",
              collapsed && "justify-center",
            )}
          >
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fullName}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar mobile */}
        <header className="flex h-14 items-center gap-4 border-b border-border/50 bg-card px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <span className="font-bold gradient-title">Quiz Agent</span>
          </div>
        </header>

        {/* Floating sidebar toggle */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="hidden lg:flex fixed top-1/2 left-[52px] z-50 -translate-y-1/2 items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:scale-110 transition-all duration-200"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
