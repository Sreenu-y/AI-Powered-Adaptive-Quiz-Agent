"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  Target,
  Calendar,
  ArrowRight,
  Loader2,
  BrainCircuit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AnalyticsPage() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await fetch("/api/analytics");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch analytics");
        setTopics(data.topics || []);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-72 bg-muted animate-pulse rounded-lg" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold gradient-title">
          Performance Insights
        </h1>
        <p className="text-muted-foreground mt-1">
          Topic-wise breakdown of your quiz performance
        </p>
      </div>

      {topics.length === 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No analytics yet</h3>
            <p className="text-muted-foreground mb-6">
              Complete some quizzes to see your topic-wise performance
            </p>
            <Link href="/dashboard/quiz">
              <Button className="gap-2">
                <BrainCircuit className="h-4 w-4" />
                Start a Quiz
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((t) => {
            const scoreColor =
              t.avgScore >= 80
                ? "text-green-400"
                : t.avgScore >= 50
                ? "text-yellow-400"
                : "text-red-400";
            const scoreBg =
              t.avgScore >= 80
                ? "bg-green-500/10 border-green-500/30"
                : t.avgScore >= 50
                ? "bg-yellow-500/10 border-yellow-500/30"
                : "bg-red-500/10 border-red-500/30";

            return (
              <Link
                key={t.topic}
                href={`/dashboard/analytics/${encodeURIComponent(t.topic)}`}
              >
                <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-all hover:shadow-md hover:shadow-primary/5 cursor-pointer h-full">
                  <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold leading-tight line-clamp-2">
                          {t.topic}
                        </h3>
                        <div className="shrink-0 rounded-lg bg-primary/10 p-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Target className="h-3.5 w-3.5" />
                          <span>{t.attempts} {t.attempts === 1 ? "attempt" : "attempts"}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`${scoreBg} ${scoreColor} border font-semibold`}
                        >
                          {t.avgScore}% avg
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(t.lastAttemptDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
