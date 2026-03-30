"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createRoom, listActiveRooms, getUserTeamHistory } from "@/actions/room";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  Loader2,
  Radio,
  Activity,
  Archive,
  Trophy,
  X,
  ChevronRight,
  ArrowRight
} from "lucide-react";

export default function TeamQuizPage() {
  const { user } = useUser();
  const router = useRouter();

  const [stats, setStats] = useState({ active: 0, live: 0, total: 0, past: 0 });
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteSession, setInviteSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("mixed");
  const [maxParticipants, setMaxParticipants] = useState(5);
  const [numQuestions, setNumQuestions] = useState(5);
  const [timerPerQuestion, setTimerPerQuestion] = useState(20);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchRooms = useCallback(async () => {
    try {
      const result = await listActiveRooms();
      if (result.success) {
        setSessions(result.rooms || []);
        if (result.stats) {
          setStats(result.stats);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchRooms, 5000);
    
    const fetchHistory = async () => {
      if (user?.id) {
        const result = await getUserTeamHistory(user.id);
        if (result.success) setHistory(result.history);
        setHistoryLoading(false);
      }
    };
    fetchHistory();

    return () => clearInterval(interval);
  }, [fetchRooms, user?.id]);

  const handleCreate = async () => {
    if (!topic.trim()) {
      setCreateError("Topic is required");
      return;
    }
    setCreateError("");
    setCreating(true);
    try {
      const result = await createRoom({
        topic: topic.trim(),
        difficulty,
        maxParticipants,
        numQuestions,
        timerPerQuestion,
        userId: user?.id,
        userName: user?.fullName || user?.firstName || "Host",
        inputType: "topic"
      });
      
      if (result.error) throw new Error(result.error);
      router.push(`/dashboard/team/${result.roomCode}`);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const statCards = [
    { label: "Open Sessions", value: stats.active, icon: Radio, description: "Waiting for players" },
    { label: "Live Now", value: stats.live, icon: Activity, description: "Quizzes in progress" },
    { label: "Completed", value: stats.past, icon: Archive, description: "Finished quizzes" },
  ];

  const difficulties = [
    { value: "mixed", label: "Mixed" },
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-title">
            Team Quiz
          </h1>
          <p className="text-muted-foreground mt-1">
            Join live sessions or create your own
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4" />
          Create Session
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((stat) => (
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

      {showCreate && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Create New Session</CardTitle>
            <CardDescription>
              Set up a quiz for others to join
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Topic</label>
              <input
                type="text"
                placeholder="e.g., React Hooks, Machine Learning..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground text-foreground"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Difficulty</label>
                <div className="flex gap-1.5 flex-wrap">
                  {difficulties.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDifficulty(d.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        difficulty === d.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Max Players</label>
                <div className="flex gap-1.5">
                  {[3, 5, 8, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setMaxParticipants(n)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        maxParticipants === n
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Questions</label>
                <div className="flex gap-1.5">
                  {[5, 10, 15].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNumQuestions(n)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        numQuestions === n
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {createError && (
              <p className="text-xs text-destructive">{createError}</p>
            )}

            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={creating} className="gap-2">
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Session
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Sessions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Available Sessions</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground text-sm">
                No active sessions. Create one to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session) => {
              const statusColors = {
                waiting: "bg-muted text-muted-foreground",
                full: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
                countdown: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
                active: "bg-green-500/10 text-green-500 border-green-500/30",
              };

              return (
                <Card
                  key={session.roomCode}
                  className="hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/team/${session.roomCode}`)}
                >
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {session.topic}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            by {session.hostName}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 ${statusColors[session.status] || ""}`}
                        >
                          {session.status?.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>
                            {session.participantsCount}/{session.maxParticipants}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] whitespace-nowrap bg-muted/30 capitalize">
                            {session.difficulty}
                          </Badge>
                          <div className={cn(
                            "rounded-full p-1.5 transition-colors",
                            session.status === "waiting" ? "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      {/* Recent Team Quizzes */}
      <div className="pt-4 mt-8 border-t border-border/50">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Archive className="h-5 w-5 text-primary" />
          My Recent Team Results
        </h2>
        
        {historyLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <Card className="bg-muted/10 border-dashed">
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground text-sm">
                No past team sessions found. Join a session to see your results!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map((item) => (
              <Card 
                key={item.roomCode} 
                className="group hover:border-primary/40 transition-all duration-300 bg-background"
              >
                <CardContent className="pt-5 space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {item.topic}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Hosted by {item.hostName} • {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">
                      {item.roomCode}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Score</p>
                      <p className="text-lg font-bold text-foreground leading-none">
                        {item.score}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Leaderboard</p>
                      <div className="flex items-center gap-1.5">
                        <Trophy className={cn(
                          "h-3.5 w-3.5",
                          item.rank === 1 ? "text-yellow-500" : 
                          item.rank === 2 ? "text-slate-400" : 
                          item.rank === 3 ? "text-amber-600" : "text-primary/40"
                        )} />
                        <p className="text-lg font-bold text-foreground leading-none">
                          {item.rank}
                          <span className="text-[10px] font-medium text-muted-foreground ml-0.5">
                            {item.rank === 1 ? "st" : item.rank === 2 ? "nd" : item.rank === 3 ? "rd" : "th"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
