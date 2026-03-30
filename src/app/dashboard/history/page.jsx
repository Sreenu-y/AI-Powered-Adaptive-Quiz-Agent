import React from "react";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import QuizAttempt from "@/models/QuizAttempt";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Calendar, Target, ChevronRight, Clock, Trash2, Activity } from "lucide-react";

export const metadata = {
  title: "Quiz History | AI Tutor",
};

export default async function HistoryPage() {
  const { userId } = await auth();

  if (!userId) {
    return <div>Unauthorized</div>;
  }

  // Connect to DB and fetch history directly in the Server Component
  await connectDB();
  const attempts = await QuizAttempt.find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  // Server Action for deleting a quiz attempt
  async function deleteAttempt(formData) {
    "use server";
    const attemptId = formData.get("attemptId");
    if (!attemptId) return;

    const { userId: currentUserId } = await auth();
    if (!currentUserId) return;

    await connectDB();
    await QuizAttempt.findOneAndDelete({ _id: attemptId, userId: currentUserId });
    revalidatePath("/dashboard/history");
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-title flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            Quiz History
          </h1>
          <p className="text-muted-foreground mt-2">
            Review your past quiz attempts, delete old records, and track your learning progress.
          </p>
        </div>
      </div>

      {attempts.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-primary/10 p-5 mb-5 shadow-sm">
              <Clock className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">No quizzes taken yet</h3>
            <p className="text-muted-foreground max-w-sm mb-8 text-sm leading-relaxed">
              You haven't completed any quizzes. Generate your first AI quiz to see your history and performance here.
            </p>
            <Link href="/dashboard/quiz">
              <Button size="lg" className="gap-2 rounded-full px-8 shadow-md">
                <BrainCircuit className="h-5 w-5" />
                Start a Quiz
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {attempts.map((attempt) => {
            const isIncomplete = !attempt.answers || attempt.answers.length === 0;
            return (
            <Card
              key={attempt._id.toString()}
              className="group relative flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/50 shadow-sm bg-background"
            >
              {/* Decorative top border */}
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary/40 to-primary transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out" />
              
              <CardHeader className="pb-3 flex-1 flex flex-col items-start gap-1">
                <div className="flex justify-between items-start gap-4 w-full">
                  {isIncomplete ? (
                    <Badge
                      variant="secondary"
                      className="shrink-0 mb-1 bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                    >
                      Incomplete
                    </Badge>
                  ) : (
                    <Badge
                      variant={
                        attempt.accuracy >= 80
                          ? "success"
                          : attempt.accuracy >= 50
                          ? "warning"
                          : "destructive"
                      }
                      className="shrink-0 mb-1"
                    >
                      {attempt.accuracy}% Accuracy
                    </Badge>
                  )}
                  
                  <form action={deleteAttempt}>
                    <input type="hidden" name="attemptId" value={attempt._id.toString()} />
                    <Button 
                      type="submit" 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete attempt"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
                
                <CardTitle className="text-xl font-bold line-clamp-2 leading-tight group-hover:text-primary transition-colors mt-2">
                  {attempt.topic}
                </CardTitle>
                
                <CardDescription className="flex items-center gap-1.5 mt-auto pt-2 font-medium text-xs">
                  <Calendar className="h-3.5 w-3.5 opacity-70" />
                  {new Date(attempt.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit"
                  })}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0 mt-auto">
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/40">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center bg-primary/10 rounded-full h-8 w-8">
                      <Target className="h-4 w-4 text-primary" />
                    </div>
                    {isIncomplete ? (
                      <span className="font-medium text-sm text-muted-foreground">
                        {attempt.totalQuestions || (attempt.questions || []).length} questions unanswered
                      </span>
                    ) : (
                      <span className="font-bold text-lg">
                        {attempt.score} <span className="text-muted-foreground/70 font-medium text-sm">/ {attempt.totalQuestions}</span>
                      </span>
                    )}
                  </div>
                  
                  <Link href={`/dashboard/history/${attempt._id.toString()}`}>
                    <Button size="sm" className="gap-1.5 h-9 rounded-full shadow-sm pr-3">
                      Review
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
