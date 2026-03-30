"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Target,
  TrendingUp,
  Trophy,
  TrendingDown,
  Calendar,
  Loader2,
  BarChart3,
  BrainCircuit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg shadow-md p-3 min-w-[140px]">
        <div className="flex justify-between items-center gap-4 text-xs">
          <span className="text-muted-foreground">{data.date}</span>
          <span className="font-medium">Score: {data.score}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function TopicDetailPage() {
  const { topic: encodedTopic } = useParams();
  const router = useRouter();
  const topic = decodeURIComponent(encodedTopic);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/analytics?topic=${encodeURIComponent(topic)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch data");
        setAttempts(data.attempts || []);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [topic]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-full" />
        <div className="h-10 w-72 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-72 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  // Compute stats
  const scores = attempts.map(
    (a) => a.accuracy || (a.totalQuestions > 0 ? Math.round((a.score / a.totalQuestions) * 100) : 0)
  );
  const totalAttempts = attempts.length;
  const avgScore = totalAttempts > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / totalAttempts) : 0;
  const bestScore = totalAttempts > 0 ? Math.max(...scores) : 0;
  const worstScore = totalAttempts > 0 ? Math.min(...scores) : 0;

  // Chart data (chronological order — oldest first)
  const chartData = [...attempts]
    .reverse()
    .map((a, i) => ({
      attempt: `#${i + 1}`,
      date: new Date(a.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      score: a.accuracy || (a.totalQuestions > 0 ? Math.round((a.score / a.totalQuestions) * 100) : 0),
    }));

  const stats = [
    {
      label: "Total Attempts",
      value: totalAttempts,
      icon: Target,
      description: "Quizzes taken",
    },
    {
      label: "Average Score",
      value: `${avgScore}%`,
      icon: TrendingUp,
      description: "Mean performance",
    },
    {
      label: "Best Score",
      value: `${bestScore}%`,
      icon: Trophy,
      description: "Highest score",
    },
    {
      label: "Worst Score",
      value: `${worstScore}%`,
      icon: TrendingDown,
      description: "Lowest score",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/dashboard/analytics")}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Performance Insights
      </button>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-bold gradient-title">
        {topic}
      </h1>

      {totalAttempts === 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No attempts yet</h3>
            <p className="text-muted-foreground mb-6">
              Take a quiz on this topic to see your performance
            </p>
            <Button onClick={() => router.push("/dashboard/quiz")} className="gap-2">
              <BrainCircuit className="h-4 w-4" />
              Start a Quiz
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">
                        {stat.description}
                      </p>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <stat.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Performance Trend graph */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trend</CardTitle>
              <CardDescription>Your scores over time for this topic</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="topicScoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--muted-foreground)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--muted-foreground)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={35}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="var(--muted-foreground)"
                    strokeWidth={2}
                    fill="url(#topicScoreGradient)"
                    name="Score %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Attempts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Recent Attempts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {attempts.map((a) => {
                  const pct = a.accuracy || (a.totalQuestions > 0 ? Math.round((a.score / a.totalQuestions) * 100) : 0);
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <BrainCircuit className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {a.score}/{a.totalQuestions} correct
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(a.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          pct >= 80
                            ? "success"
                            : pct >= 50
                            ? "warning"
                            : "destructive"
                        }
                      >
                        {pct}%
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
