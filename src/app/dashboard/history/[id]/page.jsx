import React from "react";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import QuizAttempt from "@/models/QuizAttempt";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  BrainCircuit,
  Target,
  Lightbulb,
  BookOpen,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
} from "lucide-react";

export const metadata = {
  title: "Quiz Details | AI Tutor",
};

// Helper for rendering bold markdown
function formatBoldText(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export default async function HistoryDetailsPage(props) {
  const params = await props.params;
  const { userId } = await auth();

  if (!userId) {
    return <div>Unauthorized</div>;
  }

  await connectDB();
  const attempt = await QuizAttempt.findOne({
    _id: params.id,
    userId: userId,
  }).lean();

  if (!attempt) {
    notFound();
  }

  const isIncomplete = !attempt.answers || attempt.answers.length === 0;
  const accuracy = isIncomplete ? 0 : Math.round((attempt.score / attempt.totalQuestions) * 100);
  let statusText = isIncomplete ? "Incomplete" : "Beginner";
  if (!isIncomplete) {
    if (accuracy >= 80) statusText = "Advanced";
    else if (accuracy >= 40) statusText = "Intermediate";
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white px-4 sm:px-6 py-8 relative selection:bg-white/30">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[400px] bg-white opacity-[0.03] blur-[100px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-3xl mx-auto space-y-8 pb-16 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Top App Bar */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/history">
            <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#1a1a1a] hover:bg-[#262626] transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-white/50 shadow-sm border border-white/[0.02]">
              <ArrowLeft className="h-5 w-5 text-gray-400" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">
              {attempt.topic}
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 flex items-center gap-1.5 font-medium tracking-wide">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(attempt.createdAt).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>

        {/* Score Card / HUD */}
        <div className="bg-[#131313] rounded-[2rem] p-6 sm:p-8 relative overflow-hidden group shadow-2xl">
          <div className="grid grid-cols-3 gap-4 sm:gap-6 text-center relative z-10">
            <div className="space-y-1 sm:space-y-2">
              <p className="text-3xl sm:text-5xl font-bold tracking-tighter text-white">
                {attempt.score}
                <span className="text-gray-500 text-2xl sm:text-3xl">
                  /{attempt.totalQuestions}
                </span>
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-[0.2em] font-semibold flex items-center justify-center gap-1.5">
                <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Score
              </p>
            </div>

            <div className="space-y-1 sm:space-y-2 relative">
              {/* Vertical divider shifts */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-10 sm:h-14 bg-white/[0.04]" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-10 sm:h-14 bg-white/[0.04]" />

              <p className="text-3xl sm:text-5xl font-bold tracking-tighter text-white">
                {accuracy}%
              </p>
              <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-[0.2em] font-semibold flex items-center justify-center gap-1.5">
                <BrainCircuit className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Accuracy
              </p>
            </div>

            <div className="space-y-2 sm:space-y-3 flex flex-col items-center justify-center pt-1 sm:pt-2">
              <p className="text-xl sm:text-3xl font-bold tracking-tight text-white capitalize">
                {statusText}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-[0.2em] font-semibold flex items-center justify-center gap-1.5">
                <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Status
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic content sections */}
        <div className="space-y-8">
          {/* Question Breakdown */}
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3 text-white tracking-tight">
              <div className="bg-[#1a1a1a] p-2 rounded-xl border border-white/5 shadow-inner">
                <BrainCircuit className="h-5 w-5 text-gray-300" />
              </div>
              Neural Analytics
            </h2>

            <div className="space-y-5">
              {(attempt.answers || []).length > 0 ? (
                attempt.answers.map((answer, index) => (
                  <div
                    key={answer._id?.toString() || index}
                    className="bg-[#111111] rounded-[1.5rem] border border-white/[0.03] overflow-hidden transition-all duration-300 hover:border-white/[0.08] hover:bg-[#131313] hover:shadow-xl hover:shadow-white/[0.01]"
                    style={{ animationDelay: index * 100 + "ms" }}
                  >
                    {/* Header */}
                    <div className="p-5 sm:p-7 pb-4 flex items-start justify-between gap-4">
                      <h3 className="text-base sm:text-lg font-medium text-gray-200 leading-relaxed">
                        <span className="text-white font-bold mr-3 opacity-90 tracking-wider">
                          {(index + 1).toString().padStart(2, "0")}.
                        </span>
                        {answer.question}
                      </h3>
                      {answer.isCorrect ? (
                        <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                        </div>
                      ) : (
                        <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                          <XCircle className="h-3.5 w-3.5" /> Incorrect
                        </div>
                      )}
                    </div>

                    {/* Answers Breakdown */}
                    <div className="p-5 sm:p-7 pt-2 sm:pt-4 space-y-4">
                      {/* User's Answer */}
                      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
                        <div className="w-full sm:w-36 text-[10px] sm:text-xs font-bold tracking-widest uppercase text-gray-500 shrink-0">
                          System Input
                        </div>
                        <div
                          className={
                            "flex-1 flex gap-3 p-4 rounded-xl border " +
                            (answer.isCorrect
                              ? "bg-green-500/[0.03] border-green-500/10 text-green-300 shadow-[inset_0_0_20px_rgba(34,197,94,0.02)]"
                              : "bg-red-500/[0.03] border-red-500/10 text-red-300 shadow-[inset_0_0_20px_rgba(239,68,68,0.02)]")
                          }
                        >
                          {answer.isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 opacity-70" />
                          ) : (
                            <XCircle className="h-5 w-5 shrink-0 opacity-70" />
                          )}
                          <span className="font-medium">
                            {answer.userAnswer || "No signal detected"}
                          </span>
                        </div>
                      </div>

                      {/* Correct Answer (if wrong) */}
                      {!answer.isCorrect && (
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
                          <div className="w-full sm:w-36 text-[10px] sm:text-xs font-bold tracking-widest uppercase text-green-500/70 shrink-0">
                            Expected Output
                          </div>
                          <div className="flex-1 flex gap-3 p-4 rounded-xl border border-green-500/15 bg-green-500/[0.04] text-green-300 shadow-[inset_0_0_20px_rgba(34,197,94,0.03)]">
                            <CheckCircle2 className="h-5 w-5 shrink-0 opacity-80" />
                            <span className="font-medium">
                              {answer.correctAnswer}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Explanation */}
                      {answer.explanation && (
                        <div className="mt-6 pt-5 border-t border-white/[0.03]">
                          <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3 text-gray-500 flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                            AI Diagnostics
                          </div>
                          <div className="text-sm sm:text-base leading-relaxed p-5 rounded-[1.25rem] bg-[#161616] text-gray-300 relative group overflow-hidden border border-white/[0.02]">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            <div className="relative z-10 font-light">
                              {formatBoldText(answer.explanation)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : isIncomplete ? (
                <div className="bg-[#131313] p-10 rounded-[2rem] text-center test-gray-500 border border-white/[0.02] shadow-inner">
                  <div className="h-16 w-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4 border border-white/5">
                    <BrainCircuit className="h-8 w-8 text-yellow-500/50" />
                  </div>
                  <p className="text-gray-400 font-medium">
                    This quiz was abandoned before completion.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Use the Retake buttons below to try again.
                  </p>
                </div>
              ) : (
                <div className="bg-[#131313] p-10 rounded-[2rem] text-center test-gray-500 border border-white/[0.02] shadow-inner">
                  <div className="h-16 w-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4 border border-white/5">
                    <BrainCircuit className="h-8 w-8 text-gray-600 opacity-50" />
                  </div>
                  <p className="text-gray-400 font-medium">
                    No specific telemetry available for this session.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* AI Feedback Clusters */}
          {((attempt.focusAreas && attempt.focusAreas.length > 0) ||
            (attempt.tips && attempt.tips.length > 0) ||
            (attempt.resources && attempt.resources.length > 0)) && (
            <div className="grid sm:grid-cols-2 gap-5 mt-10">
              {/* Focus Areas Layer */}
              {attempt.focusAreas && attempt.focusAreas.length > 0 && (
                <div className="bg-[#131313] rounded-[2rem] p-6 sm:p-8 sm:col-span-2 relative overflow-hidden border border-white/[0.02]">
                  <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 blur-[60px] rounded-full pointer-events-none" />
                  <h3 className="text-lg font-bold flex items-center gap-3 text-white mb-5">
                    <div className="p-2 rounded-xl bg-white/5">
                      <Target className="h-5 w-5 text-gray-300" />
                    </div>
                    Core Optimization Targets
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {attempt.focusAreas.map((topic, i) => (
                      <span
                        key={i}
                        className="px-4 py-2 rounded-xl bg-[#1a1a1a] text-gray-200 text-sm font-medium border border-white/[0.03] shadow-sm hover:bg-[#202020] transition-colors cursor-default"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tactical Tips */}
              {attempt.tips && attempt.tips.length > 0 && (
                <div className="bg-[#131313] rounded-[2rem] p-6 sm:p-8 relative overflow-hidden sm:col-span-2 border border-white/[0.02]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[50px] rounded-full pointer-events-none" />
                  <h3 className="text-lg font-bold flex items-center gap-3 text-white mb-6">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                      <Lightbulb className="h-5 w-5 text-gray-300" />
                    </div>
                    Improvement Tips
                  </h3>
                  <ul className="space-y-4">
                    {attempt.tips.map((tip, i) => (
                      <li
                        key={i}
                        className="text-sm text-gray-300 flex items-start gap-3.5"
                      >
                        <span className="h-7 w-7 rounded-xl bg-[#1a1a1a] border border-white/[0.04] flex items-center justify-center shrink-0 shadow-inner">
                          <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                        </span>
                        <span className="leading-relaxed pt-1">
                          {formatBoldText(tip)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Knowledge Base */}
              {attempt.resources && attempt.resources.length > 0 && (
                <div className="bg-[#131313] rounded-[2rem] p-6 sm:p-8 relative overflow-hidden sm:col-span-2 border border-white/[0.02]">
                  <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/[0.02] blur-[50px] rounded-full pointer-events-none" />
                  <h3 className="text-lg font-bold flex items-center gap-3 text-white mb-6">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                      <BookOpen className="h-5 w-5 text-gray-400" />
                    </div>
                    Learning Resources
                  </h3>
                  <div className="space-y-3.5 relative z-10">
                    {attempt.resources.map((res, i) => (
                      <a
                        key={i}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block p-4 rounded-2xl border border-white/[0.03] bg-[#1a1a1a] hover:bg-[#202020] hover:border-white/20 transition-all duration-300 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors truncate">
                              {res.title}
                            </p>
                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                              {res.description}
                            </p>
                          </div>
                          <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 group-hover:text-white transition-colors shadow-inner border border-white/5 group-hover:border-white/20">
                            <ExternalLink className="h-3.5 w-3.5 text-gray-500 group-hover:text-white" />
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        {/* Retake Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {(!isIncomplete || (attempt.questions && attempt.questions.length > 0)) && (
            <Link
              href={`/dashboard/quiz?retake=${params.id}&mode=same`}
              className="flex-1"
            >
              <button className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#1a1a1a] hover:bg-[#262626] border border-white/[0.04] hover:border-white/10 text-sm font-medium text-gray-300 hover:text-white transition-all duration-300 shadow-sm">
                <RotateCcw className="h-4 w-4" />
                Retake (Same Questions)
              </button>
            </Link>
          )}
          <Link
            href={`/dashboard/quiz?retake=${params.id}&mode=new`}
            className="flex-1"
          >
            <button className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#1a1a1a] hover:bg-[#262626] border border-white/[0.04] hover:border-white/10 text-sm font-medium text-gray-300 hover:text-white transition-all duration-300 shadow-sm">
              <BrainCircuit className="h-4 w-4" />
              Retake (New Questions)
            </button>
          </Link>
        </div>

        </div>
      </div>
    </div>
  );
}
