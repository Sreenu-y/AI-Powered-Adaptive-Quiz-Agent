"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useDropzone } from "react-dropzone";
import {
  saveQuizAttempt,
  finalFeedbackAction,
} from "@/actions/quiz";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BrainCircuit,
  Upload,
  Link2,
  Type,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Trophy,
  Target,
  ExternalLink,
  Lightbulb,
  BookOpen,
  Info,
} from "lucide-react";
import Link from "next/link";

// ─── Adaptive difficulty logic ───
function getNextDifficulty(correctCount, wrongCount) {
  const ratio =
    correctCount + wrongCount === 0
      ? 0.5
      : correctCount / (correctCount + wrongCount);

  if (ratio >= 0.7) return "hard";
  if (ratio <= 0.3) return "easy";
  return "medium";
}

function pickNextQuestion(questions, answeredIds, targetDifficulty) {
  const unanswered = questions.filter((q) => !answeredIds.has(q.id));
  if (unanswered.length === 0) return null;

  // Try to find one matching the target difficulty
  const matching = unanswered.filter((q) => q.difficulty === targetDifficulty);
  if (matching.length > 0) {
    return matching[Math.floor(Math.random() * matching.length)];
  }

  // Fallback: pick any unanswered
  return unanswered[Math.floor(Math.random() * unanswered.length)];
}

// ─── Phase components ───

function ConfigPhase({ onStart, userId }) {
  const [inputType, setInputType] = useState("topic");
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [url, setUrl] = useState("");
  const [fileContent, setFileContent] = useState(null);
  const [fileName, setFileName] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [numQuestions, setNumQuestions] = useState("");
  const [quizType, setQuizType] = useState("mixed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progressValue, setProgressValue] = useState(0);

  // Smart difficulty state
  const [topicLevelInfo, setTopicLevelInfo] = useState(null); // { isNew, topicLevel }
  const [checkingLevel, setCheckingLevel] = useState(false);
  const [lastCheckedTopic, setLastCheckedTopic] = useState("");

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      if (acceptedFiles.length === 1) {
        setFileName(acceptedFiles[0].name);
      } else {
        setFileName(`${acceptedFiles.length} files selected`);
      }
      setFileContent(acceptedFiles);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
  });

  // Helper to fetch topic level
  const fetchTopicLevel = async (topicStr) => {
    if (!topicStr || !userId) return;
    setCheckingLevel(true);
    try {
      const res = await fetch(
        `/api/check-topic?topic=${encodeURIComponent(topicStr)}`,
      );
      const data = await res.json();
      const levelInfo = {
        isNew: data.level === null,
        topicLevel: data.level,
      };
      setTopicLevelInfo(levelInfo);
      if (!levelInfo.isNew) {
        setDifficulty("");
      }
    } catch (err) {
      console.error("Error checking topic level:", err);
      setTopicLevelInfo(null);
    } finally {
      setCheckingLevel(false);
    }
  };

  // Check topic level when topic changes (debounced)
  useEffect(() => {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) {
      setTopicLevelInfo(null);
      setLastCheckedTopic("");
      return;
    }

    if (trimmedTopic === lastCheckedTopic) return;

    const delayDebounceFn = setTimeout(() => {
      setLastCheckedTopic(trimmedTopic);
      fetchTopicLevel(trimmedTopic);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [topic, userId, lastCheckedTopic]);

  // Handle immediate check on blur
  const handleBlur = () => {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic || trimmedTopic === lastCheckedTopic) return;
    setLastCheckedTopic(trimmedTopic);
    fetchTopicLevel(trimmedTopic);
  };

  const handleGenerate = async () => {
    setError("");

    // --- Frontend topic validation ---
    if (inputType === "topic") {
      const t = topic.trim();
      if (!t) {
        setError("Please enter a topic");
        return;
      }
      if (/^[^a-zA-Z]*$/.test(t)) {
        setError("Please enter a meaningful topic (e.g., React, Climate Change, Data Structures)");
        return;
      }
      if (/^(.)\1+$/.test(t.replace(/\s/g, ""))) {
        setError("Please enter a meaningful topic (e.g., React, Climate Change, Data Structures)");
        return;
      }

      const s = subtopic.trim();
      if (s) {
        if (/^[^a-zA-Z]*$/.test(s) || /^(.)\1+$/.test(s.replace(/\s/g, ""))) {
          setError("Please enter a meaningful subtopic");
          return;
        }
      }
    }
    // --- End frontend validation ---

    // --- Custom question count validation ---
    if (showCustomInput) {
      const n = parseInt(customCount);
      if (isNaN(n) || n < 1 || n > 50) {
        setError("Custom question count must be between 1 and 50");
        return;
      }
    }

    setLoading(true);
    setProgressValue(0);

    const progressInterval = setInterval(() => {
      setProgressValue((prev) => {
        if (prev >= 90) return prev;
        return Math.min(prev + (Math.random() * 10 + 5), 90);
      });
    }, 1000);

    const rawCount = showCustomInput ? customCount : numQuestions;
    const effectiveCount = parseInt(String(rawCount || "10").trim());
    
    const formData = new FormData();
    formData.append("inputType", inputType);
    formData.append("numQuestions", String(effectiveCount));
    formData.append("quizType", quizType);
    if (userId) formData.append("userId", userId);
    if (difficulty) formData.append("difficulty", difficulty);

    if (inputType === "topic") {
      if (!topic.trim()) {
        setError("Please enter a topic");
        setLoading(false);
        return;
      }
      formData.append("topic", topic.trim());
      if (subtopic.trim()) formData.append("subtopic", subtopic.trim());
    } else if (inputType === "url") {
      if (!url.trim()) {
        setError("Please enter a URL");
        setLoading(false);
        return;
      }
      formData.append("url", url.trim());
    } else if (inputType === "document") {
      if (!fileContent || fileContent.length === 0) {
        setError("Please upload at least one document or image");
        setLoading(false);
        return;
      }
      if (Array.isArray(fileContent)) {
        fileContent.forEach((file) => formData.append("document", file));
      } else {
        formData.append("document", fileContent); // The actual File object
      }
    }

    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to generate quiz");
      if (!data?.questions || data.questions.length === 0)
        throw new Error("No questions generated");

      clearInterval(progressInterval);
      setProgressValue(100);

        onStart({
          quizId: data.quizId,
          questions: data.questions,
          topic: data.topic || topic || fileName || url || "General",
          subtopic: data.subtopic || subtopic.trim() || "",
          inputType,
          requestedCount: data.requestedCount || effectiveCount,
          previousTopicLevel:
            data.previousTopicLevel || topicLevelInfo?.topicLevel || null,
          isNewTopic: data.isNewTopic ?? topicLevelInfo?.isNew ?? true,
          selectedDifficulty: data.selectedDifficulty || difficulty || null,
        });
    } catch (err) {
      setError(err.message);
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
    }
  };

  const difficulties = [
    { value: "easy", label: "Beginner", color: "text-green-400" },
    { value: "medium", label: "Intermediate", color: "text-yellow-400" },
    { value: "hard", label: "Advanced", color: "text-red-400" },
  ];

  const questionCounts = [5, 10, 15];
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCount, setCustomCount] = useState("");

  // Determine whether to show difficulty selector
  const showDifficultySelector =
    inputType === "topic" && topicLevelInfo?.isNew === true;
  const showPreviousLevel =
    inputType === "topic" && topicLevelInfo?.isNew === false;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="text-center space-y-3 py-2">
        <div className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-3 mb-1 ring-1 ring-primary/10">
          <BrainCircuit className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold gradient-title">AI Quiz Generator</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Generate personalized quizzes with adaptive difficulty powered by AI
        </p>
      </div>

      {/* Source Selection */}
      <Card className="border-primary/10 shadow-lg backdrop-blur-sm bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Type className="h-4 w-4 text-primary" />
            Choose Your Source
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            defaultValue="topic"
            onValueChange={(val) => {
              setInputType(val);
              if (val !== "topic") {
                setTopicLevelInfo(null);
                setLastCheckedTopic("");
              }
            }}
          >
            <TabsList className="w-full grid grid-cols-3 h-11 p-1 bg-muted/50">
              <TabsTrigger
                value="topic"
                className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <Type className="h-3.5 w-3.5" />
                Topic
              </TabsTrigger>
              <TabsTrigger
                value="document"
                className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <Upload className="h-3.5 w-3.5" />
                Document
              </TabsTrigger>
              <TabsTrigger
                value="url"
                className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <Link2 className="h-3.5 w-3.5" />
                Web Link
              </TabsTrigger>
            </TabsList>

            <TabsContent value="topic">
              <div className="space-y-3 pt-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g., React Hooks, Machine Learning, Data Structures..."
                    value={topic}
                    onChange={(e) => {
                      setTopic(e.target.value);
                      if (e.target.value.trim() !== lastCheckedTopic) {
                        setTopicLevelInfo(null);
                      }
                    }}
                    onBlur={handleBlur}
                    className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 placeholder:text-muted-foreground/60 transition-all"
                  />
                  {checkingLevel && (
                    <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Subtopic (optional) — e.g., Deadlocks, Binary Trees..."
                  value={subtopic}
                  onChange={(e) => setSubtopic(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 placeholder:text-muted-foreground/60 transition-all"
                />
              </div>
            </TabsContent>

            <TabsContent value="document">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
                  isDragActive
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : fileName
                      ? "border-green-500/40 bg-green-500/5"
                      : "border-border/50 hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                <input {...getInputProps()} />
                {fileName ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-green-500" />
                    <p className="text-sm font-medium">{fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      Click or drop to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground/60" />
                    <p className="text-sm font-medium">
                      Drop files here or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOCX, PNG, JPG, WEBP
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="url">
              <div className="space-y-2 pt-1">
                <div className="relative">
                  <Link2 className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/60" />
                  <input
                    type="url"
                    placeholder="e.g., https://geeksforgeeks.org/... or https://youtube.com/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full rounded-xl border border-border/60 bg-background/80 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 placeholder:text-muted-foreground/60 transition-all"
                  />
                </div>
                <p className="text-xs text-muted-foreground pl-1">
                  Paste a YouTube video, a GeeksforGeeks article, or any webpage link
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Topic level status — only for topic mode */}
      {inputType === "topic" && checkingLevel && (
        <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-muted/20 p-3 text-sm text-muted-foreground animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking your history for this topic...
        </div>
      )}

      {showPreviousLevel && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-4 text-sm">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">
              You were previously rated:{" "}
              <span className="text-primary font-semibold">
                {topicLevelInfo.topicLevel}
              </span>{" "}
              in this topic
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Difficulty will be automatically adjusted based on your level.
            </p>
          </div>
        </div>
      )}

      {/* Configuration — shown for all modes */}
      <Card className="border-primary/10 shadow-lg backdrop-blur-sm bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Configuration
          </CardTitle>
          <CardDescription className="text-xs">
            Optional — leave blank for adaptive defaults
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Difficulty selector — only for new topics */}
          {inputType === "topic" && (showDifficultySelector || !topicLevelInfo) && (
            <div>
              <label className="text-sm font-medium mb-2.5 block text-foreground/80">
                  Difficulty
                </label>
                <div className="flex gap-2 flex-wrap">
                  {difficulties.map((d) => (
                    <button
                      key={d.value}
                      onClick={() =>
                        setDifficulty(difficulty === d.value ? "" : d.value)
                      }
                      className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                        difficulty === d.value
                          ? "border-primary bg-primary/15 text-primary shadow-sm shadow-primary/10"
                          : "border-border/50 text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2.5 block text-foreground/80">
                Quiz Type
              </label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: "mixed", label: "Mixed AI Pick" },
                  { value: "mcq", label: "Multiple Choice" },
                  { value: "true-false", label: "True / False" },
                  { value: "fill-blank", label: "Fill in the Blanks" }
                ].map((qt) => (
                  <button
                    key={qt.value}
                    onClick={() => setQuizType(qt.value)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                      quizType === qt.value
                        ? "border-primary bg-primary/15 text-primary shadow-sm shadow-primary/10"
                        : "border-border/50 text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    {qt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2.5 block text-foreground/80">
                Number of Questions
              </label>
              <div className="flex gap-2 flex-wrap">
                {questionCounts.map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setNumQuestions(numQuestions === String(n) ? "" : String(n));
                      setShowCustomInput(false);
                      setCustomCount("");
                    }}
                    className={`px-6 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                      numQuestions === String(n) && !showCustomInput
                        ? "border-primary bg-primary/15 text-primary shadow-sm shadow-primary/10"
                        : "border-border/50 text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setShowCustomInput(!showCustomInput);
                    setNumQuestions("");
                    if (showCustomInput) setCustomCount("");
                  }}
                  className={`px-6 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                    showCustomInput
                      ? "border-primary bg-primary/15 text-primary shadow-sm shadow-primary/10"
                      : "border-border/50 text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  Other
                </button>
              </div>
              {showCustomInput && (
                <div className="mt-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter number (e.g., 7, 13, 20...)"
                    value={customCount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, ""); // Only digits
                      if (val === "" || (parseInt(val) >= 1 && parseInt(val) <= 50)) {
                        setCustomCount(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleGenerate();
                      }
                    }}
                    className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 placeholder:text-muted-foreground/60 transition-all"
                  />
                  {customCount && (parseInt(customCount) < 1 || parseInt(customCount) > 50) && (
                    <p className="text-xs text-destructive mt-1 pl-1">Must be between 1 and 50</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading &&
        (() => {
          const loadingTips = [
            "Curating the best questions for you...",
            "Analyzing topic depth and complexity...",
            "Formatting options and hints...",
            "Double-checking the answers...",
            "Almost ready to test your knowledge...",
          ];
          const tipIndex = Math.min(
            Math.floor((progressValue / 100) * loadingTips.length),
            loadingTips.length - 1,
          );

          return (
            <div className="space-y-2 mb-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-sm text-muted-foreground px-1 font-medium">
                <span>
                  {inputType === "topic"
                    ? "Synthesizing topic knowledge..."
                    : inputType === "document"
                      ? "Extracting document context..."
                      : "Transcribing video..."}
                </span>
                <span>{Math.round(progressValue)}%</span>
              </div>
              <Progress
                value={progressValue}
                className="h-2 rounded-full shadow-inner bg-muted/60"
              />
              <p className="text-xs text-center text-muted-foreground/70 animate-pulse pt-1">
                {loadingTips[tipIndex]}
              </p>
            </div>
          );
        })()}

      <Button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full h-12 text-base gap-2 rounded-xl shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Generating Quiz...
          </>
        ) : (
          <>
            <BrainCircuit className="h-5 w-5" />
            Generate Quiz
          </>
        )}
      </Button>
    </div>
  );
}

function QuizPhase({ quizData, onComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [fillAnswer, setFillAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  const [answeredIds, setAnsweredIds] = useState(new Set());
  const [answers, setAnswers] = useState([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [difficultyProgression, setDifficultyProgression] = useState([]);

  const totalToAnswer = Math.min(
    quizData.requestedCount,
    quizData.questions.length,
  );

  // Initialize first question
  React.useEffect(() => {
    if (!currentQuestion && quizData.questions.length > 0) {
      const first = pickNextQuestion(quizData.questions, new Set(), "medium");
      setCurrentQuestion(first);
      setDifficultyProgression(["medium"]);
    }
  }, [quizData.questions, currentQuestion]);

  // Auto-advance on final question
  React.useEffect(() => {
    if (submitted && answers.length >= totalToAnswer) {
      const timer = setTimeout(() => {
        onComplete({
          answers,
          correctCount,
          wrongCount,
          difficultyProgression,
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [
    submitted,
    answers.length,
    totalToAnswer,
    answers,
    correctCount,
    wrongCount,
    difficultyProgression,
    onComplete,
  ]);

  const handleSubmit = async () => {
    if (submitted || evaluating) return;

    const userAnswer =
      currentQuestion.type === "fill-blank" ? fillAnswer : selectedAnswer;

    if (!userAnswer.trim()) return;

    let isCorrect = false;
    let evalResult;

    if (currentQuestion.type === "fill-blank") {
      // AI-based semantic evaluation for fill-in-the-blank
      setEvaluating(true);
      try {
        const correctAnswers = currentQuestion.correctAnswers && currentQuestion.correctAnswers.length > 0
          ? currentQuestion.correctAnswers
          : [currentQuestion.correctAnswer];

        const res = await fetch("/api/evaluate-answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: currentQuestion.question,
            correctAnswers,
            userAnswer,
            questionType: "fill-blank",
          }),
        });

        const data = await res.json();

        if (res.ok && !data.error) {
          isCorrect = data.isCorrect;
          evalResult = {
            isCorrect: data.isCorrect,
            correctAnswer: data.correctAnswer || currentQuestion.correctAnswer,
            explanation: data.explanation || currentQuestion.explanation || "The correct answer is: " + currentQuestion.correctAnswer,
          };
        } else {
          throw new Error(data.error || "AI evaluation failed");
        }
      } catch (err) {
        console.warn("AI evaluation failed, using fallback:", err.message);
        // Fallback: basic string matching
        const normalizedUser = String(userAnswer).trim().toLowerCase();
        const answersArray = currentQuestion.correctAnswers && currentQuestion.correctAnswers.length > 0
          ? currentQuestion.correctAnswers
          : [currentQuestion.correctAnswer];
        isCorrect = answersArray.some(
          (ans) => String(ans).trim().toLowerCase() === normalizedUser
        );
        evalResult = {
          isCorrect,
          correctAnswer: currentQuestion.correctAnswer,
          explanation: currentQuestion.explanation || "The correct answer is: " + currentQuestion.correctAnswer,
        };
      } finally {
        setEvaluating(false);
      }
    } else {
      // MCQ / True-False: local evaluation (unchanged)
      const normalizedUser = String(userAnswer).trim().toLowerCase();
      const normalizedCorrect = String(currentQuestion.correctAnswer).trim().toLowerCase();
      isCorrect = normalizedUser === normalizedCorrect;
      evalResult = {
        isCorrect,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation || "The correct answer is: " + currentQuestion.correctAnswer,
      };
    }

    setEvaluation(evalResult);
    setSubmitted(true);

    const newAnswer = {
      question: currentQuestion.question,
      questionType: currentQuestion.type,
      userAnswer,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect,
      difficulty: currentQuestion.difficulty,
      explanation: evalResult.explanation,
      topic: currentQuestion.topic,
    };

    setAnswers((prev) => [...prev, newAnswer]);

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setWrongCount((prev) => prev + 1);
    }

    setAnsweredIds((prev) => new Set([...prev, currentQuestion.id]));
  };

  const handleNext = () => {
    const newAnsweredIds = new Set([...answeredIds]);

    if (answers.length >= totalToAnswer) {
      onComplete({
        answers,
        correctCount: answers.filter((a) => a.isCorrect).length,
        wrongCount: answers.filter((a) => !a.isCorrect).length,
        difficultyProgression,
      });
      return;
    }

    const newCorrect = correctCount;
    const newWrong = wrongCount;
    const nextDifficulty = getNextDifficulty(newCorrect, newWrong);

    setDifficultyProgression((prev) => [...prev, nextDifficulty]);

    const nextQ = pickNextQuestion(
      quizData.questions,
      newAnsweredIds,
      nextDifficulty,
    );

    if (!nextQ) {
      onComplete({
        answers,
        correctCount: answers.filter((a) => a.isCorrect).length,
        wrongCount: answers.filter((a) => !a.isCorrect).length,
        difficultyProgression,
      });
      return;
    }

    setCurrentQuestion(nextQ);
    setSelectedAnswer("");
    setFillAnswer("");
    setSubmitted(false);
    setEvaluation(null);
  };

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progress = (answers.length / totalToAnswer) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Question{" "}
            {Math.min(answers.length + (submitted ? 0 : 1), totalToAnswer)} of{" "}
            {totalToAnswer}
          </span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Question card */}
      <Card className="border-t-4 border-t-primary shadow-xl">
        <CardHeader className="bg-primary/5 rounded-t-lg border-b border-border/10 pb-4">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg leading-relaxed">
              {currentQuestion.question}
            </CardTitle>
            <Badge variant="outline" className="shrink-0">
              {currentQuestion.type === "mcq"
                ? "MCQ"
                : currentQuestion.type === "true-false"
                  ? "T/F"
                  : "Fill"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* MCQ / True-False options */}
          {(currentQuestion.type === "mcq" ||
            currentQuestion.type === "true-false") && (
            <div className="space-y-2">
              {currentQuestion.options.map((option, idx) => {
                let optionStyle =
                  "border-border hover:border-primary/50 hover:bg-primary/5";

                if (submitted && evaluation) {
                  if (
                    option.toLowerCase().trim() ===
                    currentQuestion.correctAnswer.toLowerCase().trim()
                  ) {
                    optionStyle =
                      "border-green-500 bg-green-500/10 text-green-400";
                  } else if (
                    option === selectedAnswer &&
                    !evaluation.isCorrect
                  ) {
                    optionStyle = "border-red-500 bg-red-500/10 text-red-400";
                  }
                } else if (selectedAnswer === option) {
                  optionStyle = "border-primary bg-primary/10 text-primary";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => !submitted && setSelectedAnswer(option)}
                    disabled={submitted}
                    className={`w-full text-left rounded-lg border p-3 text-sm transition-all ${optionStyle}`}
                  >
                    <span className="font-medium mr-2">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>
          )}

          {/* Fill in the blank */}
          {currentQuestion.type === "fill-blank" && (
            <input
              type="text"
              placeholder="Type your answer..."
              value={fillAnswer}
              onChange={(e) => setFillAnswer(e.target.value)}
              disabled={submitted}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-50"
            />
          )}

          {/* Evaluation result */}
          {submitted && evaluation && (
            <div
              className={`rounded-lg border p-4 space-y-2 ${
                evaluation.isCorrect
                  ? "border-green-500/50 bg-green-500/5"
                  : "border-red-500/50 bg-red-500/5"
              }`}
            >
              <div className="flex items-center gap-2">
                {evaluation.isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <p className="font-medium">
                  {evaluation.isCorrect ? "Correct!" : "Incorrect"}
                </p>
              </div>
              {!evaluation.isCorrect && (
                <p className="text-sm text-muted-foreground">
                  Correct answer:{" "}
                  <span className="text-foreground font-medium">
                    {evaluation.correctAnswer}
                  </span>
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {evaluation.explanation}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex justify-end">
        {!submitted ? (
          <Button
            onClick={handleSubmit}
            disabled={
              evaluating ||
              (currentQuestion.type === "fill-blank"
                ? !fillAnswer.trim()
                : !selectedAnswer)
            }
            className="gap-2"
          >
            {evaluating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Evaluating...
              </>
            ) : (
              "Submit Answer"
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            className="gap-2 h-11 px-8"
            disabled={answers.length >= totalToAnswer}
          >
            {answers.length >= totalToAnswer ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing Results...
              </>
            ) : (
              <>
                Next Question
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// Helper to render basic markdown bold text (e.g., **text**)
function formatBoldText(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

// Compute the next topic level based on current level and accuracy
function computeNextTopicLevel(currentLevel, accuracy) {
  const levels = ["Beginner", "Intermediate", "Advanced"];
  const idx = levels.indexOf(currentLevel);
  const safeIdx = idx === -1 ? 0 : idx;

  if (accuracy >= 80) {
    return levels[Math.min(safeIdx + 1, 2)];
  } else if (accuracy < 50) {
    return levels[Math.max(safeIdx - 1, 0)];
  }
  return levels[safeIdx];
}

function ResultsPhase({ quizData, results, userId, onRetake }) {
  const [feedback, setFeedback] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const score = results.correctCount;
  const total = results.answers.length;
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

  // Compute the new topic level based on quiz performance
  const previousLevel = quizData.isNewTopic
    ? quizData.selectedDifficulty === "easy"
      ? "Beginner"
      : quizData.selectedDifficulty === "hard"
        ? "Advanced"
        : quizData.selectedDifficulty === "medium"
          ? "Intermediate"
          : "Beginner"
    : quizData.previousTopicLevel || "Beginner";

  const newTopicLevel = computeNextTopicLevel(previousLevel, accuracy);

  React.useEffect(() => {
    async function fetchFeedback() {
      try {
        const data = await finalFeedbackAction({
          results: results.answers,
          topic: quizData.topic,
        });

        if (!data?.error) {
          setFeedback(data);
        } else {
          console.error("Failed to get feedback:", data.error);
        }
      } catch (err) {
        console.error("Failed to get feedback:", err);
      } finally {
        setLoadingFeedback(false);
      }
    }
    fetchFeedback();
  }, [results.answers, quizData.topic]);

  const handleSave = async () => {
    if (!userId || saved) return;
    setSaving(true);

    try {
      const answeredTexts = results.answers.map((a) => a.question);
      const selectedQs = quizData.questions.filter((q) =>
        answeredTexts.includes(q.question),
      );

      const res = await saveQuizAttempt({
        quizId: quizData.quizId,
        userId,
        topic: quizData.topic,
        subtopic: quizData.subtopic || "",
        topicLevel: newTopicLevel,
        inputType: quizData.inputType,
        numQuestions: quizData.requestedCount || total,
        score,
        totalQuestions: total,
        accuracy,
        answers: results.answers,
        selectedQuestions: selectedQs,
        difficultyProgression: results.difficultyProgression,
        focusAreas: feedback?.focusAreas || feedback?.weakTopics || [],
        tips: feedback?.tips || [],
        resources: feedback?.resources || [],
      });

      if (res.success) setSaved(true);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save when feedback is ready and user is logged in
  React.useEffect(() => {
    if (userId && feedback && !saved && !saving) {
      handleSave();
    }
  }, [userId, feedback, saved, saving]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Score card */}
      <Card className="text-center border-t-4 border-t-primary shadow-xl">
        <CardContent className="pt-8 pb-6 space-y-4">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-4 mb-2">
            <Trophy className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold gradient-title">Quiz Complete!</h2>
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto pt-4">
            <div>
              <p className="text-2xl font-bold">
                {score}/{total}
              </p>
              <p className="text-xs text-muted-foreground">Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{accuracy}%</p>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{newTopicLevel}</p>
              <p className="text-xs text-muted-foreground">Your Level</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback */}
      {loadingFeedback ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-muted-foreground">
                Generating personalized feedback...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        feedback && (
          <>
            {/* Overall feedback */}
            {feedback.overallFeedback && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm leading-relaxed">
                    {feedback.overallFeedback}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Weak topics */}
            {feedback.weakTopics && feedback.weakTopics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4" />
                    Focus Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {feedback.weakTopics.map((topic, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-primary/5 text-primary border-primary/20"
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Improvement tips */}
            {feedback.tips && feedback.tips.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="h-4 w-4" />
                    Improvement Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {feedback.tips.map((tip, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-sm leading-relaxed"
                      >
                        <span className="text-primary font-bold mt-0.5">•</span>
                        <div className="text-muted-foreground">
                          {formatBoldText(tip)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Resources */}
            {feedback.resources && feedback.resources.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpen className="h-4 w-4" />
                    Recommended Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {feedback.resources.map((res, i) => (
                      <a
                        key={i}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-lg border border-border/50 p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium">{res.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {res.description}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleSave}
          disabled={saving || saved}
          className="flex-1 gap-2"
        >
          {saved ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Saved!
            </>
          ) : saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Results"
          )}
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => onRetake && onRetake("same")}
        >
          <RotateCcw className="h-4 w-4" />
          Retake (Same)
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => onRetake && onRetake("new")}
        >
          <BrainCircuit className="h-4 w-4" />
          Retake (New)
        </Button>
        <Link href="/dashboard" className="flex-1">
          <Button variant="outline" className="w-full">
            Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Shuffle helpers ───

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function shuffleQuizQuestions(questions) {
  return shuffleArray(questions).map((q) => ({
    ...q,
    options: q.type === "mcq" ? shuffleArray(q.options) : q.options,
  }));
}

// ─── Main Quiz Page ───

export default function QuizPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState("config"); // config | quiz | results
  const [quizData, setQuizData] = useState(null);
  const [results, setResults] = useState(null);
  const [retakeLoading, setRetakeLoading] = useState(false);

  // Handle retake from history page via URL params
  useEffect(() => {
    const retakeId = searchParams.get("retake");
    const retakeMode = searchParams.get("mode");

    if (retakeId && user?.id) {
      setRetakeLoading(true);
      fetch(`/api/quiz-attempt/${retakeId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            console.error("Failed to load retake:", data.error);
            setRetakeLoading(false);
            return;
          }

          const questions = data.selectedQuestions?.length > 0
            ? data.selectedQuestions
            : data.questions || [];

          if (retakeMode === "same") {
            if (questions.length === 0) {
              console.error("No questions found for retake (same)");
              setRetakeLoading(false);
              return;
            }
            const shuffled = shuffleQuizQuestions(questions);
            setQuizData({
              quizId: null,
              questions: shuffled,
              topic: data.topic,
              subtopic: data.subtopic || "",
              inputType: data.inputType || "topic",
              requestedCount: data.numQuestions || shuffled.length,
              previousTopicLevel: data.topicLevel || null,
              isNewTopic: false,
              selectedDifficulty: null,
            });
            setPhase("quiz");
          } else {
            // "new" mode — generate fresh questions via API
            const formData = new FormData();
            formData.append("inputType", "topic");
            formData.append("topic", data.topic);
            if (data.subtopic) formData.append("subtopic", data.subtopic);
            formData.append("numQuestions", String(data.numQuestions || 10));
            formData.append("userId", user.id);

            fetch("/api/generate-quiz", { method: "POST", body: formData })
              .then((res) => res.json())
              .then((genData) => {
                if (genData.error || !genData.questions?.length) {
                  console.error("Failed to generate retake quiz");
                  setRetakeLoading(false);
                  return;
                }
                setQuizData({
                  quizId: genData.quizId,
                  questions: genData.questions,
                  topic: genData.topic || data.topic,
                  subtopic: genData.subtopic || data.subtopic || "",
                  inputType: genData.inputType || "topic",
                  requestedCount: genData.questions.length,
                  previousTopicLevel: genData.previousTopicLevel || data.topicLevel || null,
                  isNewTopic: genData.isNewTopic ?? false,
                  selectedDifficulty: genData.selectedDifficulty || null,
                });
                setPhase("quiz");
              })
              .catch((err) => {
                console.error("Retake generation failed:", err);
              })
              .finally(() => setRetakeLoading(false));
            return;
          }
          setRetakeLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch retake attempt:", err);
          setRetakeLoading(false);
        });
    }
  }, [searchParams, user?.id]);

  const handleStart = (data) => {
    setQuizData(data);
    setPhase("quiz");
  };

  const handleComplete = (resultData) => {
    setResults(resultData);
    setPhase("results");
  };

  const handleRetake = async (mode) => {
    if (!quizData) return;

    if (mode === "same") {
      // Shuffle question order and MCQ options
      const shuffled = shuffleQuizQuestions(quizData.questions);
      setQuizData({
        ...quizData,
        quizId: null,
        questions: shuffled,
      });
      setResults(null);
      setPhase("quiz");
    } else {
      // Generate new questions with same params
      setRetakeLoading(true);
      try {
        const formData = new FormData();
        formData.append("inputType", "topic");
        formData.append("topic", quizData.topic);
        if (quizData.subtopic) formData.append("subtopic", quizData.subtopic);
        formData.append("numQuestions", String(quizData.requestedCount || 10));
        if (user?.id) formData.append("userId", user.id);

        const res = await fetch("/api/generate-quiz", { method: "POST", body: formData });
        const data = await res.json();

        if (data.error || !data.questions?.length) {
          console.error("Retake generation failed:", data.error);
          return;
        }

        setQuizData({
          quizId: data.quizId,
          questions: data.questions,
          topic: data.topic || quizData.topic,
          subtopic: data.subtopic || quizData.subtopic || "",
          inputType: data.inputType || "topic",
          requestedCount: data.questions.length,
          previousTopicLevel: data.previousTopicLevel || quizData.previousTopicLevel || null,
          isNewTopic: data.isNewTopic ?? false,
          selectedDifficulty: data.selectedDifficulty || null,
        });
        setResults(null);
        setPhase("quiz");
      } catch (err) {
        console.error("Retake generation failed:", err);
      } finally {
        setRetakeLoading(false);
      }
    }
  };

  if (retakeLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading retake quiz...</p>
      </div>
    );
  }

  if (phase === "config") {
    return <ConfigPhase onStart={handleStart} userId={user?.id} />;
  }

  if (phase === "quiz") {
    return <QuizPhase quizData={quizData} onComplete={handleComplete} />;
  }

  if (phase === "results") {
    return (
      <ResultsPhase
        quizData={quizData}
        results={results}
        userId={user?.id}
        onRetake={handleRetake}
      />
    );
  }

  return null;
}
