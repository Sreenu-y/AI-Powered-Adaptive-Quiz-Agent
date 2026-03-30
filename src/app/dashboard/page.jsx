"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getDashboardData } from "@/actions/dashboard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BrainCircuit,
  Target,
  TrendingUp,
  Flame,
  Trophy,
  Zap,
  BookOpen,
  Award,
  Clock,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const badges = [
  { label: "First Quiz", icon: Zap, earned: true, description: "Complete your first quiz" },
  { label: "Perfect Score", icon: Trophy, earned: false, description: "Score 100% on a quiz" },
  { label: "Streak Master", icon: Flame, earned: false, description: "7-day streak" },
  { label: "Quick Learner", icon: BrainCircuit, earned: false, description: "Complete 10 quizzes" },
  { label: "Bookworm", icon: BookOpen, earned: false, description: "Upload 5 documents" },
  { label: "Overachiever", icon: Award, earned: false, description: "Score 90%+ on 5 quizzes" },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg shadow-md p-3 min-w-[150px]">
        <p className="font-semibold text-sm text-foreground mb-1 line-clamp-1">
          {data.topic}
        </p>
        <div className="flex justify-between items-center gap-4 text-xs mt-2">
          <span className="text-muted-foreground">{data.date}</span>
          <span className="font-medium">Score: {data.score}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (user?.id) {
        try {
          const result = await getDashboardData(user.id);
          setData(result);

          // Update badge earned status based on data
        } catch (err) {
          console.error("Failed to fetch dashboard data:", err);
        } finally {
          setLoading(false);
        }
      }
    }
    if (isLoaded) fetchData();
  }, [user, isLoaded]);

  if (!isLoaded || loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted animate-pulse rounded-lg" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-72 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  const stats = [
    {
      label: "Total Quizzes",
      value: data?.totalQuizzes || 0,
      icon: BrainCircuit,
      description: "Quizzes completed",
      trend: "+12%",
    },
    {
      label: "Accuracy",
      value: `${data?.accuracy || 0}%`,
      icon: Target,
      description: "Average correctness",
      trend: "+5%",
    },
    {
      label: "Avg Score",
      value: `${data?.averageScore || 0}%`,
      icon: TrendingUp,
      description: "Performance average",
      trend: "+8%",
    },
    {
      label: "Streak",
      value: `${data?.streak || 0} days`,
      icon: Flame,
      description: "Consecutive days",
      trend: data?.isTodayActive ? "Completed today" : "Start today",
      isActiveToday: data?.isTodayActive || false,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-title">
            Welcome back, {user?.firstName || "Learner"}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your progress and keep improving
          </p>
        </div>
        <Link href="/dashboard/quiz">
          <Button className="gap-2">
            <BrainCircuit className="h-4 w-4" />
            Start New Quiz
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card 
            key={stat.label} 
            className={cn(
              "transition-all duration-300",
              stat.isActiveToday && "border-orange-500/20 shadow-sm shadow-orange-500/10"
            )}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className={cn(
                    "rounded-xl p-2.5 transition-colors duration-300",
                    stat.isActiveToday ? "bg-orange-500/10" : "bg-primary/10"
                  )}>
                    <stat.icon className={cn(
                      "h-5 w-5 transition-colors duration-300",
                      stat.isActiveToday ? "text-orange-500" : "text-primary"
                    )} />
                  </div>
                  <span className={cn(
                    "text-[11px] font-medium whitespace-nowrap",
                    stat.isActiveToday ? "text-orange-500" : "text-green-500"
                  )}>
                    {stat.trend}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
          <CardDescription>Your quiz scores over time</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.chartData && data.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.chartData}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
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
                  dataKey="topic"
                  hide
                />
                <YAxis
                  domain={[0, 100]}
                  hide
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="var(--muted-foreground)"
                  strokeWidth={2}
                  fill="url(#scoreGradient)"
                  name="Score %"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">No data yet</p>
              <p className="text-sm">
                Complete your first quiz to see your progress
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentActivity && data.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {data.recentActivity.map((activity) => (
                  <Link
                    href={`/dashboard/history/${activity.id}`}
                    key={activity.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <BrainCircuit className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {activity.topic}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        activity.accuracy >= 80
                          ? "success"
                          : activity.accuracy >= 50
                          ? "warning"
                          : "destructive"
                      }
                    >
                      {activity.score}/{activity.totalQuestions}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Clock className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.label}
                  className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-colors ${
                    badge.earned
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/50 opacity-40"
                  }`}
                >
                  <div
                    className={`rounded-full p-2.5 ${
                      badge.earned ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    <badge.icon
                      className={`h-5 w-5 ${
                        badge.earned ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{badge.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {badge.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
