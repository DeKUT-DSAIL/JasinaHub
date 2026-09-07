import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, Download, Loader2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type QType = 'rating' | 'nps' | 'choice_single' | 'choice_multi' | 'text' | 'boolean';

interface FQ {
  id: string;
  question_text: string;
  question_type: QType;
  options: any;
  required: boolean;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

interface FA {
  id: string;
  submission_id: string;
  question_id: string;
  value_number: number | null;
  value_text: string | null;
  value_bool: boolean | null;
  value_choices: any;
  created_at: string;
}

interface FS {
  id: string;
  created_at: string;
}

const TYPE_LABELS: Record<QType, string> = {
  rating: 'Rating (stars)',
  nps: 'NPS (0-10)',
  choice_single: 'Single choice',
  choice_multi: 'Multiple choice',
  text: 'Open text',
  boolean: 'Yes / No',
};

export function AdminFeedbackTab() {
  return (
    <Tabs defaultValue="responses" className="w-full">
      <TabsList>
        <TabsTrigger value="responses">Responses</TabsTrigger>
        <TabsTrigger value="questions">Manage Questions</TabsTrigger>
      </TabsList>
      <TabsContent value="responses" className="mt-4">
        <FeedbackResponses />
      </TabsContent>
      <TabsContent value="questions" className="mt-4">
        <FeedbackQuestions />
      </TabsContent>
    </Tabs>
  );
}

/* ---------- Responses View ---------- */

function FeedbackResponses() {
  const [questions, setQuestions] = useState<FQ[]>([]);
  const [answers, setAnswers] = useState<FA[]>([]);
  const [submissions, setSubmissions] = useState<FS[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [qs, ans, subs] = await Promise.all([
      supabase.from('feedback_questions' as any).select('*').order('order_index'),
      supabase.from('feedback_answers' as any).select('*').order('created_at', { ascending: false }),
      supabase.from('feedback_submissions' as any).select('*').order('created_at', { ascending: false }),
    ]);
    setQuestions((qs.data as any) || []);
    setAnswers((ans.data as any) || []);
    setSubmissions((subs.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card className="bg-card/70 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="w-5 h-5" /> Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <Stat label="Total submissions" value={submissions.length} />
          <Stat label="Answers collected" value={answers.length} />
          <Stat label="Active questions" value={questions.filter(q => q.is_active).length} />
        </CardContent>
      </Card>

      {questions.length === 0 ? (
        <Card className="bg-card/70 backdrop-blur-xl">
          <CardContent className="py-12 text-center text-muted-foreground">
            No questions yet. Add questions in the "Manage Questions" tab.
          </CardContent>
        </Card>
      ) : (
        questions.map((q) => (
          <QuestionAggregateCard key={q.id} q={q} answers={answers.filter(a => a.question_id === q.id)} />
        ))
      )}

      <SubmissionsTable submissions={submissions} answers={answers} questions={questions} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function QuestionAggregateCard({ q, answers }: { q: FQ; answers: FA[] }) {
  const exportCsv = () => {
    const rows = [['submission_id', 'created_at', 'value']];
    answers.forEach(a => {
      let v = '';
      if (a.value_number !== null) v = String(a.value_number);
      else if (a.value_text !== null) v = a.value_text;
      else if (a.value_bool !== null) v = a.value_bool ? 'Yes' : 'No';
      else if (a.value_choices) v = Array.isArray(a.value_choices) ? a.value_choices.join('|') : String(a.value_choices);
      rows.push([a.submission_id, a.created_at, v.replace(/"/g, '""')]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feedback-${q.id.slice(0, 8)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="bg-card/70 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-base">{q.question_text}</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">{TYPE_LABELS[q.question_type]}</Badge>
            <Badge variant={q.is_active ? "default" : "secondary"}>{q.is_active ? 'Active' : 'Inactive'}</Badge>
            <Badge variant="outline">{answers.length} responses</Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={answers.length === 0}>
          <Download className="w-4 h-4 mr-1" /> CSV
        </Button>
      </CardHeader>
      <CardContent>
        <Aggregate q={q} answers={answers} />
      </CardContent>
    </Card>
  );
}

function Aggregate({ q, answers }: { q: FQ; answers: FA[] }) {
  if (answers.length === 0) return <p className="text-sm text-muted-foreground">No responses yet.</p>;

  if (q.question_type === 'rating' || q.question_type === 'nps') {
    const max = q.question_type === 'nps' ? 10 : (q.options?.max ?? 5);
    const min = q.question_type === 'nps' ? 0 : 1;
    const nums = answers.map(a => a.value_number ?? 0);
    const avg = nums.reduce((s, n) => s + n, 0) / nums.length;
    const data = [];
    for (let i = min; i <= max; i++) {
      data.push({ label: String(i), count: nums.filter(n => n === i).length });
    }
    return (
      <div className="space-y-3">
        <div className="text-sm">Average: <span className="font-bold text-primary">{avg.toFixed(2)}</span></div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (q.question_type === 'boolean') {
    const yes = answers.filter(a => a.value_bool === true).length;
    const no = answers.filter(a => a.value_bool === false).length;
    const data = [{ label: 'Yes', count: yes }, { label: 'No', count: no }];
    return (
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count">
              <Cell fill="hsl(var(--primary))" />
              <Cell fill="hsl(var(--destructive))" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (q.question_type === 'choice_single' || q.question_type === 'choice_multi') {
    const opts: string[] = Array.isArray(q.options) ? q.options : (q.options?.choices ?? []);
    const counts: Record<string, number> = {};
    opts.forEach(o => counts[o] = 0);
    answers.forEach(a => {
      const choices = Array.isArray(a.value_choices) ? a.value_choices : [];
      choices.forEach((c: string) => { counts[c] = (counts[c] || 0) + 1; });
    });
    const data = Object.entries(counts).map(([label, count]) => ({ label, count }));
    return (
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="label" width={120} />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // text
  return (
    <div className="space-y-2 max-h-72 overflow-y-auto">
      {answers.map(a => (
        <div key={a.id} className="text-sm p-3 rounded-lg bg-muted/50 border border-border/50">
          <p className="whitespace-pre-wrap">{a.value_text}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

function SubmissionsTable({ submissions, answers, questions }: { submissions: FS[]; answers: FA[]; questions: FQ[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const qmap = useMemo(() => Object.fromEntries(questions.map(q => [q.id, q])), [questions]);

  return (
    <Card className="bg-card/70 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-lg">All submissions ({submissions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Answers</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map(s => {
              const subAns = answers.filter(a => a.submission_id === s.id);
              const isOpen = expanded === s.id;
              return (
                <>
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{new Date(s.created_at).toLocaleString()}</TableCell>
                    <TableCell>{subAns.length}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setExpanded(isOpen ? null : s.id)}>
                        {isOpen ? 'Hide' : 'View'}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow key={`${s.id}-x`}>
                      <TableCell colSpan={3} className="bg-muted/30">
                        <div className="space-y-2 py-2">
                          {subAns.map(a => {
                            const q = qmap[a.question_id];
                            let v = '';
                            if (a.value_number !== null) v = String(a.value_number);
                            else if (a.value_text !== null) v = a.value_text;
                            else if (a.value_bool !== null) v = a.value_bool ? 'Yes' : 'No';
                            else if (a.value_choices) v = Array.isArray(a.value_choices) ? a.value_choices.join(', ') : String(a.value_choices);
                            return (
                              <div key={a.id} className="text-sm">
                                <div className="font-medium text-foreground">{q?.question_text || 'Unknown question'}</div>
                                <div className="text-muted-foreground">{v}</div>
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
            {submissions.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No submissions yet</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ---------- Manage Questions View ---------- */

function FeedbackQuestions() {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<FQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FQ | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('feedback_questions' as any).select('*').order('order_index');
    setQuestions((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm('Delete this question and all its answers?')) return;
    const { error } = await supabase.from('feedback_questions' as any).delete().eq('id', id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); load(); }
  };

  const toggleActive = async (q: FQ) => {
    const { error } = await supabase.from('feedback_questions' as any).update({ is_active: !q.is_active }).eq('id', q.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  return (
    <Card className="bg-card/70 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Feedback Questions</CardTitle>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditing(null)}>
              <Plus className="w-4 h-4 mr-1" /> Add Question
            </Button>
          </DialogTrigger>
          <QuestionDialog editing={editing} onSaved={() => { setOpen(false); setEditing(null); load(); }} />
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((q) => (
                <TableRow key={q.id}>
                  <TableCell>{q.order_index}</TableCell>
                  <TableCell className="max-w-md truncate">{q.question_text}</TableCell>
                  <TableCell><Badge variant="outline">{TYPE_LABELS[q.question_type]}</Badge></TableCell>
                  <TableCell>{q.required ? 'Yes' : 'No'}</TableCell>
                  <TableCell><Switch checked={q.is_active} onCheckedChange={() => toggleActive(q)} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(q); setOpen(true); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(q.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {questions.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No questions yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function QuestionDialog({ editing, onSaved }: { editing: FQ | null; onSaved: () => void }) {
  const { toast } = useToast();
  const [text, setText] = useState(editing?.question_text || '');
  const [type, setType] = useState<QType>(editing?.question_type || 'rating');
  const [required, setRequired] = useState(editing?.required ?? false);
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [order, setOrder] = useState(editing?.order_index ?? 0);
  const [optionsText, setOptionsText] = useState(
    Array.isArray(editing?.options) ? editing!.options.join('\n') : ''
  );
  const [ratingMax, setRatingMax] = useState<number>(editing?.options?.max ?? 5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(editing?.question_text || '');
    setType(editing?.question_type || 'rating');
    setRequired(editing?.required ?? false);
    setIsActive(editing?.is_active ?? true);
    setOrder(editing?.order_index ?? 0);
    setOptionsText(Array.isArray(editing?.options) ? editing!.options.join('\n') : '');
    setRatingMax(editing?.options?.max ?? 5);
  }, [editing]);

  const save = async () => {
    if (!text.trim()) {
      toast({ title: "Question text required", variant: "destructive" });
      return;
    }
    let options: any = null;
    if (type === 'choice_single' || type === 'choice_multi') {
      const opts = optionsText.split('\n').map(s => s.trim()).filter(Boolean);
      if (opts.length < 2) {
        toast({ title: "Add at least 2 options", variant: "destructive" });
        return;
      }
      options = opts;
    } else if (type === 'rating') {
      options = { max: ratingMax };
    }

    setSaving(true);
    const payload = {
      question_text: text.trim(),
      question_type: type,
      options,
      required,
      is_active: isActive,
      order_index: order,
    };
    const { error } = editing
      ? await supabase.from('feedback_questions' as any).update(payload).eq('id', editing.id)
      : await supabase.from('feedback_questions' as any).insert(payload);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: editing ? "Updated" : "Created" });
      onSaved();
    }
  };

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? 'Edit' : 'New'} Feedback Question</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Question</Label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as QType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as QType[]).map(t => (
                  <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Order</Label>
            <Input type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value) || 0)} />
          </div>
        </div>

        {type === 'rating' && (
          <div>
            <Label>Max stars</Label>
            <Input type="number" min={3} max={10} value={ratingMax} onChange={(e) => setRatingMax(parseInt(e.target.value) || 5)} />
          </div>
        )}

        {(type === 'choice_single' || type === 'choice_multi') && (
          <div>
            <Label>Options (one per line)</Label>
            <Textarea value={optionsText} onChange={(e) => setOptionsText(e.target.value)} rows={4} placeholder={"Option A\nOption B\nOption C"} />
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label htmlFor="req">Required</Label>
          <Switch id="req" checked={required} onCheckedChange={setRequired} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="act">Active</Label>
          <Switch id="act" checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? 'Update' : 'Create')}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}