"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Sparkles,
  Download,
  Bookmark,
  BookmarkCheck,
  MessageCircle,
  X,
  Send,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Trophy,
  Loader2,
  ArrowLeft,
  Lightbulb,
  List,
  FileText,
  Brain,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

// ─── Rich Text Renderer ───────────────────────
function RichText({ text }) {
  if (!text) return null;

  // Split on double newlines first, then split long single paragraphs at sentences
  const rawParagraphs = text.split(/\n\n+/);
  const paragraphs = [];

  for (const raw of rawParagraphs) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.length > 500) {
      // Split long paragraph at sentence boundaries
      const sentences = trimmed.split(/(?<=\.)\s+/);
      let chunk = "";
      for (const sentence of sentences) {
        if (chunk.length + sentence.length > 400 && chunk.length > 0) {
          paragraphs.push(chunk.trim());
          chunk = sentence;
        } else {
          chunk += (chunk ? " " : "") + sentence;
        }
      }
      if (chunk.trim()) paragraphs.push(chunk.trim());
    } else {
      paragraphs.push(trimmed);
    }
  }

  return (
    <div className="space-y-4">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-muted-foreground leading-relaxed text-[0.925rem]">
          {p}
        </p>
      ))}
    </div>
  );
}

// ─── Chat Message Renderer ────────────────────
function ChatMessage({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let currentList = [];
  let listType = null; // 'bullet' or 'number'

  const flushList = () => {
    if (currentList.length > 0) {
      if (listType === "number") {
        elements.push(
          <ol key={`ol-${elements.length}`} className="space-y-1.5 my-2">
            {currentList.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary font-semibold text-xs mt-0.5 shrink-0 w-4 text-right">
                  {i + 1}.
                </span>
                <span className="text-sm leading-relaxed">{renderInline(item)}</span>
              </li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="space-y-1.5 my-2">
            {currentList.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span className="text-sm leading-relaxed">{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  const renderInline = (str) => {
    // Handle **bold** patterns
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      flushList();
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <p key={`h-${i}`} className="text-sm font-semibold text-foreground mt-3 mb-1">
          {line.slice(4)}
        </p>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <p key={`h-${i}`} className="text-sm font-bold text-foreground mt-3 mb-1">
          {line.slice(3)}
        </p>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <p key={`h-${i}`} className="font-bold text-foreground mt-3 mb-1">
          {line.slice(2)}
        </p>
      );
      continue;
    }

    // Bullet points
    const bulletMatch = line.match(/^[-*•]\s+(.+)/);
    if (bulletMatch) {
      if (listType === "number") flushList();
      listType = "bullet";
      currentList.push(bulletMatch[1]);
      continue;
    }

    // Numbered list
    const numMatch = line.match(/^\d+[.)]\s+(.+)/);
    if (numMatch) {
      if (listType === "bullet") flushList();
      listType = "number";
      currentList.push(numMatch[1]);
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  flushList();

  return <div className="space-y-1">{elements}</div>;
}

// ─── Content Display ──────────────────────────
function ContentDisplay({ content }) {
  if (!content) return null;

  return (
    <div className="space-y-6">
      {/* Title */}
      {content.title && (
        <div className="text-center pb-4 border-b border-border/50">
          <h2 className="text-2xl font-bold gradient-title">
            {content.title}
          </h2>
        </div>
      )}

      {/* Introduction */}
      {content.introduction && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-blue-400" />
              Introduction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RichText text={content.introduction} />
          </CardContent>
        </Card>
      )}

      {/* Key Concepts */}
      {content.keyConcepts?.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <List className="h-5 w-5 text-green-400" />
              Key Concepts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {content.keyConcepts.map((concept, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span className="text-muted-foreground leading-relaxed">
                    {concept}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Detailed Explanation */}
      {content.detailedExplanation && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-purple-400" />
              Detailed Explanation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RichText text={content.detailedExplanation} />
          </CardContent>
        </Card>
      )}

      {/* Examples */}
      {content.examples?.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-yellow-400" />
              Examples
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {content.examples.map((example, i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg bg-muted/50 border border-border/30"
                >
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="shrink-0 mt-0.5">
                      {i + 1}
                    </Badge>
                    <p className="text-muted-foreground leading-relaxed">
                      {example}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {content.summary && (
        <Card className="bg-card/50 border-border/50 border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-primary" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RichText text={content.summary} />
          </CardContent>
        </Card>
      )}

      {/* Free Learning Resources */}
      {content.resources?.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ExternalLink className="h-5 w-5 text-cyan-400" />
              Free Learning Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {content.resources.map((res, i) => (
                <a
                  key={i}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 border border-border/30 hover:border-cyan-500/30 hover:bg-muted/80 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-cyan-400 shrink-0 transition-colors" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {res.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {res.url}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {res.source}
                  </Badge>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Practice Quiz ─────────────────────────────
function PracticeQuiz({ questions, onClose }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState([]);

  const q = questions[currentQ];

  const handleAnswer = () => {
    if (!selected) return;
    const isCorrect = selected === q.correctAnswer;
    if (isCorrect) setScore((s) => s + 1);
    setAnswers((prev) => [...prev, { question: q.question, selected, correct: q.correctAnswer, isCorrect, explanation: q.explanation }]);
    setAnswered(true);
  };

  const handleNext = () => {
    if (currentQ + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentQ((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <Trophy className="h-16 w-16 text-yellow-400 mx-auto" />
          <h3 className="text-2xl font-bold">Quiz Complete!</h3>
          <div className="text-5xl font-bold gradient-title">{pct}%</div>
          <p className="text-muted-foreground">
            You got {score} out of {questions.length} questions correct
          </p>
        </div>
        <div className="space-y-3">
          {answers.map((a, i) => (
            <Card key={i} className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {a.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                  )}
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-medium">{a.question}</p>
                    {!a.isCorrect && (
                      <p className="text-xs text-red-400">
                        Your answer: {a.selected}
                      </p>
                    )}
                    <p className="text-xs text-green-400">
                      Correct: {a.correct}
                    </p>
                    {a.explanation && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Button onClick={onClose} className="w-full">
          Back to Learning
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">
          Question {currentQ + 1} of {questions.length}
        </Badge>
        <Badge variant="outline">Score: {score}</Badge>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-6">
          <p className="text-lg font-medium mb-6">{q.question}</p>
          <div className="space-y-3">
            {q.options.map((opt, i) => {
              let optClass =
                "w-full text-left p-4 rounded-lg border transition-all ";
              if (answered) {
                if (opt === q.correctAnswer) {
                  optClass +=
                    "border-green-500 bg-green-500/10 text-green-400";
                } else if (opt === selected && opt !== q.correctAnswer) {
                  optClass += "border-red-500 bg-red-500/10 text-red-400";
                } else {
                  optClass +=
                    "border-border/50 bg-muted/30 text-muted-foreground";
                }
              } else {
                optClass +=
                  opt === selected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/50 hover:bg-muted/50";
              }

              return (
                <button
                  key={i}
                  className={optClass}
                  onClick={() => !answered && setSelected(opt)}
                  disabled={answered}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {answered && q.explanation && (
            <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-400">
                <strong>Explanation:</strong> {q.explanation}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {!answered ? (
          <Button
            onClick={handleAnswer}
            disabled={!selected}
            className="flex-1"
          >
            Submit Answer
          </Button>
        ) : (
          <Button onClick={handleNext} className="flex-1">
            {currentQ + 1 >= questions.length ? "See Results" : "Next Question"}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Chatbot Panel ─────────────────────────────
function ChatPanel({ topic, subtopic, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: `Hi! I'm your AI tutor. Ask me anything about **${topic}**${subtopic ? ` (${subtopic})` : ""}! 🎓`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          topic,
          subtopic,
          history: [...messages, userMsg].slice(-10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat failed");
      setMessages((prev) => [...prev, { role: "ai", text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Sorry, I encountered an error. Please try again." },
      ]);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-6 w-[92vw] sm:w-[400px] h-[520px] z-50 bg-background border border-border rounded-2xl flex flex-col shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">AI Tutor</h3>
            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
              {topic}{subtopic ? ` · ${subtopic}` : ""}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {m.role === "user" ? (
                <p className="text-sm whitespace-pre-wrap">{m.text}</p>
              ) : (
                <ChatMessage text={m.text} />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a question..."
            className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="h-9 w-9 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Learn Page ───────────────────────────
export default function LearnPage() {
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }
    setLoading(true);
    setContent(null);
    setSaved(false);
    setShowQuiz(false);
    setQuizQuestions(null);
    try {
      const res = await fetch("/api/generate-learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), subtopic: subtopic.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate content");
      setContent(data.content);
      toast.success("Content generated successfully!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!topic.trim()) {
      toast.error("Generate content first");
      return;
    }
    setQuizLoading(true);
    try {
      const res = await fetch("/api/generate-practice-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), subtopic: subtopic.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate quiz");
      if (!data.questions?.length)
        throw new Error("No questions generated");
      setQuizQuestions(data.questions);
      setShowQuiz(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!content) {
      toast.error("Generate content first");
      return;
    }
    try {
      const { exportToPDF } = await import("@/lib/pdf-export");
      exportToPDF(content);
      toast.success("PDF downloaded!");
    } catch (err) {
      toast.error("Failed to export PDF");
      console.error(err);
    }
  };

  const handleSaveNotes = async () => {
    if (!content) {
      toast.error("Generate content first");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/saved-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          subtopic: subtopic.trim(),
          content,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save notes");
      toast.success("Notes saved successfully!");
      setSaved(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold gradient-title">
          Learning Module
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate structured learning content, take practice quizzes, and ask
          doubts with AI
        </p>
      </div>

      {/* Input Section */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Topic <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Machine Learning"
                  className="w-full bg-muted/50 border border-border/50 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Subtopic (optional)
                </label>
                <input
                  type="text"
                  value={subtopic}
                  onChange={(e) => setSubtopic(e.target.value)}
                  placeholder="e.g. Neural Networks"
                  className="w-full bg-muted/50 border border-border/50 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {loading ? "Generating..." : "Generate Content"}
              </Button>

              <Button
                variant="outline"
                onClick={handleStartQuiz}
                disabled={quizLoading || !topic.trim()}
                className="gap-2"
              >
                {quizLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                {quizLoading ? "Generating Quiz..." : "Start Practice Quiz"}
              </Button>

              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={!content}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download as PDF
              </Button>

              <Button
                variant="outline"
                onClick={handleSaveNotes}
                disabled={!content || saving || saved}
                className={`gap-2 ${saved ? "border-green-500/50 text-green-400" : ""}`}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <BookmarkCheck className="h-4 w-4" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
                {saving ? "Saving..." : saved ? "Saved" : "Save Notes"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              Generating learning content...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This may take a moment
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quiz Mode */}
      {showQuiz && quizQuestions && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQuiz(false)}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Content
            </Button>
            <h2 className="text-xl font-bold">Practice Quiz</h2>
          </div>
          <PracticeQuiz
            questions={quizQuestions}
            onClose={() => setShowQuiz(false)}
          />
        </div>
      )}

      {/* Content Display (hidden during quiz) */}
      {!showQuiz && content && <ContentDisplay content={content} />}

      {/* Chatbot Toggle Button */}
      {topic && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:scale-110 transition-all duration-200 flex items-center justify-center"
          title="Ask AI Tutor"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Panel */}
      {showChat && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden"
            onClick={() => setShowChat(false)}
          />
          <ChatPanel
            topic={topic}
            subtopic={subtopic}
            onClose={() => setShowChat(false)}
          />
        </>
      )}
    </div>
  );
}
