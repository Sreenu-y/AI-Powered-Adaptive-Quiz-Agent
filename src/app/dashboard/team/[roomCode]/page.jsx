"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import {
  getRoomStatus,
  joinRoom,
  startRoom,
  submitAnswer,
  sendChatMessage,
  getLeaderboard
} from "@/actions/room";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Play,
  Loader2,
  Timer,
  Trophy,
  Medal,
  Crown,
  Send,
  CheckCircle2,
  XCircle,
  Home,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";

export default function RoomPage() {
  const { roomCode } = useParams();
  const router = useRouter();
  const { user } = useUser();

  const [phase, setPhase] = useState("loading"); // loading, lobby, countdown, quiz, results
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [error, setError] = useState("");

  // Quiz state
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(-1);
  const [timerPerQuestion, setTimerPerQuestion] = useState(20);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [fillAnswer, setFillAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [answerResult, setAnswerResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  const questionStartTime = useRef(Date.now());
  const timerRef = useRef(null);
  const chatEndRef = useRef(null);
  const lastSyncRef = useRef(0);
  const questionIndexRef = useRef(-1); // Ref to track current index for comparison 

  const userId = user?.id;
  const userName = user?.fullName || user?.firstName || "Player";

  // Initial Join
  useEffect(() => {
    if (!userId || !roomCode) return;

    async function init() {
      const res = await joinRoom({ roomCode, userId, userName });
      if (res.error) {
        setError(res.error);
        setPhase("error");
      }
    }
    init();
  }, [roomCode, userId, userName]);

  // Polling Sync
  const syncRoom = useCallback(async () => {
    if (!roomCode || !userId) return;

    try {
      const data = await getRoomStatus(roomCode, userId);
      if (data.error) {
        setError(data.error);
        return;
      }

      setSession(data);
      setParticipants(data.participants || []);
      setChatMessages(data.chatMessages || []);
      setTimerPerQuestion(data.timerPerQuestion || 20);

      // Handle Phase Changes
      if (data.status === "active") {
        setPhase("quiz");
        
        // Handle Question Rotation
        if (data.currentQuestionIndex !== questionIndexRef.current) {
          questionIndexRef.current = data.currentQuestionIndex;
          setQuestionIndex(data.currentQuestionIndex);
          setCurrentQuestion(data.currentQuestion);
          setSelectedAnswer("");
          setFillAnswer("");
          setSubmitted(false);
          setAnswerResult(null);
          
          // Sync timer with server
          const startAt = new Date(data.questionStartedAt);
          const elapsed = (Date.now() - startAt.getTime()) / 1000;
          const remaining = Math.max(0, Math.ceil(data.timerPerQuestion - elapsed));
          setTimeLeft(remaining);
          questionStartTime.current = Date.now() - (elapsed * 1000);
        }
      } else if (data.status === "completed") {
        setPhase("results");
        fetchLeaderboard();
      } else if (data.status === "countdown") {
        setPhase("countdown");
        // Calculate remaining seconds for the UI
        const startAt = new Date(data.questionStartedAt);
        const elapsed = (Date.now() - startAt.getTime()) / 1000;
        const remaining = Math.max(0, Math.ceil(5 - elapsed));
        setTimeLeft(remaining);
      } else if (data.status === "waiting" || data.status === "full") {
        setPhase("lobby");
      }
    } catch (err) {
      console.error("Sync error:", err);
    }
  }, [roomCode, userId]); // Removed questionIndex dependency

  useEffect(() => {
    syncRoom();
    const interval = setInterval(syncRoom, 3000);
    return () => clearInterval(interval);
  }, [syncRoom]);

  const fetchLeaderboard = async () => {
    const res = await getLeaderboard(roomCode);
    if (res.success) setLeaderboard(res.leaderboard);
  };

  // Local Timer Countdown
  useEffect(() => {
    if ((phase !== "quiz" && phase !== "countdown") || submitted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, questionIndex, submitted]);

  // Auto-submit on timeout
  useEffect(() => {
    if (timeLeft === 0 && !submitted && currentQuestion && phase === "quiz") {
      handleSubmit(true);
    }
  }, [timeLeft, submitted, currentQuestion, phase]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSubmit = async (timedOut = false) => {
    if (submitted) return;

    const answer = timedOut
      ? "__TIMED_OUT__"
      : currentQuestion.type === "fill-blank"
        ? fillAnswer
        : selectedAnswer;

    if (!timedOut && !answer.trim()) return;

    setSubmitted(true);
    const responseTimeMs = Date.now() - questionStartTime.current;

    const res = await submitAnswer({
      roomCode,
      userId,
      userName,
      questionIndex,
      answer,
      responseTimeMs,
    });

    if (res.success) {
      setAnswerResult({
        isCorrect: res.isCorrect,
        points: res.points,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation
      });
    }
  };

  const sendChat = async (e) => {
    e.preventDefault();
    const input = e.target.elements.chatInput;
    const msg = input.value.trim();
    if (!msg) return;

    sendChatMessage({ roomCode, userId, userName, message: msg });
    input.value = "";
    // Optimistic update for UI feel
    setChatMessages(prev => [...prev, { userId, userName, message: msg, timestamp: new Date() }]);
  };

  const handleForceStart = async () => {
    const res = await startRoom({ roomCode, userId });
    if (res.error) setError(res.error);
    else syncRoom();
  };

  // ── Render Views ──

  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || phase === "error") {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-12">
        <p className="text-destructive text-sm">{error || "Something went wrong"}</p>
        <Link href="/dashboard/team">
          <Button variant="outline">Back to Team Quiz</Button>
        </Link>
      </div>
    );
  }

  // Lobby
  if (phase === "lobby") {
    const isHost = session?.hostUserId === userId;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold gradient-title">
            {session?.topic}
          </h1>
          <p className="text-sm text-muted-foreground">
            Room: <span className="font-mono font-bold tracking-wider">{roomCode}</span>
            {" · "}{session?.difficulty}{" · "}{timerPerQuestion}s per question
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Players ({participants.length}/{session?.maxParticipants})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {participants.map((p, idx) => (
                  <div
                    key={`${p.userId}-${idx}`}
                    className="flex items-center gap-3 rounded-lg border border-border/50 p-2.5"
                  >
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {p.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span className="text-sm font-medium flex-1 truncate text-foreground">{p.name}</span>
                    {p.userId === session?.hostUserId && (
                      <Badge variant="outline" className="text-[10px]">Host</Badge>
                    )}
                  </div>
                ))}
              </div>

              {isHost && (
                <Button onClick={handleForceStart} className="w-full mt-4 gap-2">
                  <Play className="h-4 w-4" />
                  Start Now
                </Button>
              )}

              {!isHost && (
                <div className="mt-4 text-center">
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Waiting for host to start...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 overflow-y-auto rounded-lg border border-border/50 bg-background p-3 mb-3 space-y-2">
                {chatMessages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No messages yet</p>
                )}
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className="text-xs">
                    <span className="font-bold text-primary">{msg.userName}:</span>{" "}
                    <span className="text-muted-foreground font-medium">{msg.message}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={sendChat} className="flex gap-2">
                <input
                  name="chatInput"
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground text-foreground"
                  autoComplete="off"
                />
                <Button type="submit" size="sm" variant="outline">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Countdown
  if (phase === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center space-y-8 py-20">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-muted-foreground uppercase tracking-widest text-[14px]">
            Get Ready!
          </h2>
          <div className="text-[120px] font-black leading-none gradient-title transition-all duration-300 animate-in fade-in zoom-in">
            {timeLeft > 0 ? timeLeft : "GO!"}
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
          <p className="text-sm text-muted-foreground font-medium italic">
            Starting the quiz in a few seconds...
          </p>
        </div>
      </div>
    );
  }

  // Quiz
  if (phase === "quiz") {
    if (!currentQuestion) return <div className="text-center py-20"><Loader2 className="animate-spin inline mr-2"/>Loading question...</div>;

    const timerPercent = (timeLeft / timerPerQuestion) * 100;
    const timerColor = timeLeft <= 5 ? "text-red-500" : timeLeft <= 10 ? "text-yellow-500" : "text-primary";

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-medium">
              Question {questionIndex + 1} of {session?.numQuestions}
            </span>
            <div className={`flex items-center gap-1.5 font-mono font-bold text-lg ${timerColor}`}>
              <Timer className="h-5 w-5" />
              {timeLeft}s
            </div>
          </div>
          <Progress value={timerPercent} className="h-2" />
        </div>

        <Card className="border-t-4 border-t-primary">
          <CardHeader className="bg-primary/5 rounded-t-lg border-b border-border/10 pb-4">
            <CardTitle className="text-lg leading-relaxed text-foreground font-semibold">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {(currentQuestion.type === "mcq" || currentQuestion.type === "true-false") && (
              <div className="space-y-2">
                {currentQuestion.options.map((option, idx) => {
                  let style = "border-border hover:border-primary/50 hover:bg-primary/5 text-foreground";
                  if (submitted && answerResult) {
                    if (option.toLowerCase().trim() === answerResult.correctAnswer?.toLowerCase().trim()) {
                      style = "border-green-500 bg-green-500/10 text-green-400 font-bold";
                    } else if (option === selectedAnswer && !answerResult.isCorrect) {
                      style = "border-red-500 bg-red-500/10 text-red-400 font-bold";
                    }
                  } else if (selectedAnswer === option) {
                    style = "border-primary bg-primary/10 text-primary font-bold";
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => !submitted && setSelectedAnswer(option)}
                      disabled={submitted}
                      className={`w-full text-left rounded-lg border p-3 text-sm transition-all ${style}`}
                    >
                      <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                      {option}
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === "fill-blank" && (
              <input
                type="text"
                placeholder="Type your answer..."
                value={fillAnswer}
                onChange={(e) => setFillAnswer(e.target.value)}
                disabled={submitted}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground text-foreground font-medium"
              />
            )}

            {submitted && answerResult && (
              <div className={`rounded-lg border p-4 space-y-2 ${answerResult.isCorrect ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"}`}>
                <div className="flex items-center gap-2">
                  {answerResult.isCorrect ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  <p className="font-bold">{answerResult.isCorrect ? "Correct!" : "Incorrect"}</p>
                </div>
                {!answerResult.isCorrect && answerResult.correctAnswer && (
                  <p className="text-sm text-foreground">Correct: <span className="font-bold">{answerResult.correctAnswer}</span></p>
                )}
                {answerResult.explanation && <p className="text-sm text-muted-foreground font-medium">{answerResult.explanation}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {!submitted && (
          <div className="flex justify-end">
            <Button onClick={() => handleSubmit(false)} disabled={submitted || (currentQuestion.type === "fill-blank" ? !fillAnswer.trim() : !selectedAnswer)} className="gap-2 h-11 px-8 font-semibold">
              Submit Answer
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Results
  if (phase === "results") {
    const myEntry = leaderboard.find((e) => e.userId === userId);
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <Trophy className="h-10 w-10 text-yellow-500 mx-auto" />
          <h1 className="text-2xl font-bold gradient-title">Quiz Complete!</h1>
          <p className="text-sm text-muted-foreground">{session?.topic}</p>
        </div>

        {myEntry && (
          <Card className="border-primary/20">
            <CardContent className="py-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-xs text-muted-foreground font-medium">Rank</p><p className="text-2xl font-bold">#{myEntry.rank}</p></div>
                <div><p className="text-xs text-muted-foreground font-medium">Score</p><p className="text-2xl font-bold">{myEntry.totalScore}</p></div>
                <div><p className="text-xs text-muted-foreground font-medium">Correct</p><p className="text-2xl font-bold">{myEntry.correctCount}/{session?.numQuestions}</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4" />Rankings</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.map((entry, idx) => (
              <div key={idx} className={`flex items-center gap-3 rounded-lg border p-3 ${entry.userId === userId ? "border-primary/50 bg-primary/5" : "border-border/50"}`}>
                <span className="w-6 text-center text-xs font-bold text-muted-foreground">#{entry.rank}</span>
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{entry.userName?.[0]?.toUpperCase()}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate text-foreground">{entry.userName} {entry.userId === userId && "(You)"}</p></div>
                <span className="text-sm font-bold text-foreground">{entry.totalScore}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Link href="/dashboard/team"><Button variant="outline" className="gap-2 font-medium"><Home className="h-4 w-4" />Back to Team Quiz</Button></Link>
        </div>
      </div>
    );
  }

  return null;
}
