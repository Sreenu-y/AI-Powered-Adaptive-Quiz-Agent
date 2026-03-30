"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Download,
  Loader2,
  BookOpen,
  List,
  FileText,
  Lightbulb,
  Brain,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export default function SavedNoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const res = await fetch(`/api/saved-notes/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch note");
        setNote(data.note);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchNote();
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!note?.content) return;
    try {
      const { exportToPDF } = await import("@/lib/pdf-export");
      exportToPDF(note.content);
      toast.success("PDF downloaded!");
    } catch (err) {
      toast.error("Failed to export PDF");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading note...</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-muted-foreground mb-4">Note not found</p>
        <Button onClick={() => router.push("/dashboard/saved")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Saved Notes
        </Button>
      </div>
    );
  }

  const content = note.content;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push("/dashboard/saved")}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Saved Notes
      </button>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-title">
            {note.topic}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {note.subtopic && (
              <Badge variant="secondary">{note.subtopic}</Badge>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(note.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
        <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {content?.title && (
          <div className="text-center pb-4 border-b border-border/50">
            <h2 className="text-2xl font-bold gradient-title">
              {content.title}
            </h2>
          </div>
        )}

        {content?.introduction && (
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-blue-400" />
                Introduction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {content.introduction}
              </p>
            </CardContent>
          </Card>
        )}

        {content?.keyConcepts?.length > 0 && (
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

        {content?.detailedExplanation && (
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-purple-400" />
                Detailed Explanation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {content.detailedExplanation}
              </p>
            </CardContent>
          </Card>
        )}

        {content?.examples?.length > 0 && (
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

        {content?.summary && (
          <Card className="bg-card/50 border-border/50 border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5 text-primary" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {content.summary}
              </p>
            </CardContent>
          </Card>
        )}

        {content?.resources?.length > 0 && (
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
    </div>
  );
}
