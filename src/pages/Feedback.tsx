import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { ArrowLeft, Star, MessageSquare, CheckCircle2, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FQ {
  id: string;
  question_text: string;
  question_type: 'rating' | 'nps' | 'choice_single' | 'choice_multi' | 'text' | 'boolean';
  options: any;
  required: boolean;
  order_index: number;
}

export default function Feedback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<FQ[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      const flag = localStorage.getItem('fasirinet_feedback_submitted');
      if (flag === 'true') {
        setAlreadySubmitted(true);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('feedback_questions' as any)
        .select('*')
        .eq('is_active', true)
        .order('order_index');
      if (error) console.error(error);
      setQuestions((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const setAnswer = (qid: string, value: any) => setAnswers((a) => ({ ...a, [qid]: value }));
  const clearAnswer = (qid: string) => setAnswers((a) => {
    const next = { ...a };
    delete next[qid];
    return next;
  });

  const validate = () => {
    for (const q of questions) {
      if (!q.required) continue;
      const v = answers[q.id];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
        toast({ title: "Missing answer", description: `Please answer: ${q.question_text}`, variant: "destructive" });
        return false;
      }
      if (q.question_type === 'text' && typeof v === 'string' && v.length > 2000) {
        toast({ title: "Answer too long", description: "Keep responses under 2000 characters.", variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { data: sub, error: subErr } = await supabase
        .from('feedback_submissions' as any)
        .insert({})
        .select()
        .single();
      if (subErr) throw subErr;
      const submissionId = (sub as any).id;

      const rows = Object.entries(answers).flatMap(([qid, v]) => {
        const q = questions.find((x) => x.id === qid);
        if (!q) return [];
        const base: any = { submission_id: submissionId, question_id: qid };
        if (q.question_type === 'rating' || q.question_type === 'nps') base.value_number = Number(v);
        else if (q.question_type === 'text') base.value_text = String(v).trim();
        else if (q.question_type === 'boolean') base.value_bool = Boolean(v);
        else if (q.question_type === 'choice_single') base.value_choices = [v];
        else if (q.question_type === 'choice_multi') base.value_choices = v;
        return [base];
      });

      if (rows.length > 0) {
        const { error: ansErr } = await supabase.from('feedback_answers' as any).insert(rows);
        if (ansErr) throw ansErr;
      }

      setSubmitted(true);
      localStorage.setItem('fasirinet_feedback_submitted', 'true');
      toast({ title: "Thank you!", description: "Your feedback has been submitted anonymously." });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageSkeleton variant="form" />;
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </div>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold">Share Your Feedback</h1>
          <p className="text-muted-foreground">Your responses are anonymous and help us improve JasinaHub.</p>
        </div>

        {submitted ? (
          <Card className="bg-card/70 backdrop-blur-xl">
            <CardContent className="py-12 text-center space-y-4">
              <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500" />
              <h2 className="text-xl font-bold">Thanks for sharing your feedback</h2>
              <p className="text-muted-foreground">It goes a long way in building better solutions.</p>
              <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
            </CardContent>
          </Card>
        ) : alreadySubmitted ? (
          <Card className="bg-card/70 backdrop-blur-xl">
            <CardContent className="py-12 text-center space-y-4">
              <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500" />
              <h2 className="text-xl font-bold">You've already submitted feedback</h2>
              <p className="text-muted-foreground">Thank you — only one response per user is accepted.</p>
              <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
            </CardContent>
          </Card>
        ) : questions.length === 0 ? (
          <Card className="bg-card/70 backdrop-blur-xl">
            <CardContent className="py-12 text-center text-muted-foreground">
              No feedback questions are active right now. Check back soon!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <Card key={q.id} className="bg-card/70 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-start justify-between gap-2">
                    <span className="flex items-start gap-2">
                      <span className="text-primary">{idx + 1}.</span>
                      <span>
                        {q.question_text}
                        {q.required && <span className="text-destructive ml-1">*</span>}
                      </span>
                    </span>
                    {answers[q.id] !== undefined && answers[q.id] !== '' && !(Array.isArray(answers[q.id]) && answers[q.id].length === 0) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => clearAnswer(q.id)}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3 mr-1" /> Clear
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <QuestionInput q={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
                </CardContent>
              </Card>
            ))}

            <Button onClick={handleSubmit} disabled={submitting} size="lg" className="w-full">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Feedback"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionInput({ q, value, onChange }: { q: FQ; value: any; onChange: (v: any) => void }) {
  if (q.question_type === 'rating') {
    const max = q.options?.max ?? 5;
    return (
      <div className="flex items-center gap-2">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "p-1 transition-transform hover:scale-110",
              value >= n ? "text-yellow-400" : "text-muted-foreground"
            )}
            aria-label={`Rate ${n}`}
          >
            <Star className={cn("w-7 h-7", value >= n && "fill-current")} />
          </button>
        ))}
      </div>
    );
  }
  if (q.question_type === 'nps') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 11 }, (_, i) => i).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "w-9 h-9 rounded-lg border text-sm font-semibold transition-all",
              value === n ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    );
  }
  if (q.question_type === 'boolean') {
    return (
      <div className="flex gap-2">
        <Button type="button" variant={value === true ? "default" : "outline"} onClick={() => onChange(true)}>Yes</Button>
        <Button type="button" variant={value === false ? "default" : "outline"} onClick={() => onChange(false)}>No</Button>
      </div>
    );
  }
  if (q.question_type === 'text') {
    return <Textarea value={value || ''} onChange={(e) => onChange(e.target.value)} maxLength={2000} placeholder="Share your thoughts..." rows={4} />;
  }
  if (q.question_type === 'choice_single') {
    const opts: string[] = Array.isArray(q.options) ? q.options : (q.options?.choices ?? []);
    return (
      <RadioGroup value={value || ''} onValueChange={onChange}>
        {opts.map((opt) => (
          <div key={opt} className="flex items-center gap-2">
            <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
            <Label htmlFor={`${q.id}-${opt}`} className="cursor-pointer">{opt}</Label>
          </div>
        ))}
      </RadioGroup>
    );
  }
  if (q.question_type === 'choice_multi') {
    const opts: string[] = Array.isArray(q.options) ? q.options : (q.options?.choices ?? []);
    const arr: string[] = Array.isArray(value) ? value : [];
    const toggle = (opt: string) => {
      if (arr.includes(opt)) onChange(arr.filter((x) => x !== opt));
      else onChange([...arr, opt]);
    };
    return (
      <div className="space-y-2">
        {opts.map((opt) => (
          <div key={opt} className="flex items-center gap-2">
            <Checkbox id={`${q.id}-${opt}`} checked={arr.includes(opt)} onCheckedChange={() => toggle(opt)} />
            <Label htmlFor={`${q.id}-${opt}`} className="cursor-pointer">{opt}</Label>
          </div>
        ))}
      </div>
    );
  }
  return null;
}