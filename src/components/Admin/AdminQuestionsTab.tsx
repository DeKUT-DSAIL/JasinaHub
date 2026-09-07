import { useState, useRef, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit, Upload, X, FileText, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Tag, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Validation schema for question form
const questionSchema = z.object({
  question_text: z.string().trim().min(1, "Question text is required").max(2000, "Question text must be less than 2000 characters"),
  order_index: z.number().int("Order must be a whole number").min(0, "Order must be 0 or greater"),
  category_id: z.string().uuid("Invalid category"),
  image_url: z.string().url("Invalid image URL").optional().or(z.literal('')),
  image_attribution: z.string().max(500, "Attribution must be less than 500 characters").optional()
});

interface Question {
  id: string;
  question_text: string;
  image_url: string | null;
  image_attribution: string | null;
  order_index: number;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface AdminQuestionsTabProps {
  questions: Question[];
  categories: Category[];
  onDataChange: () => void;
  questionResponseCounts: Record<string, number>;
  questionTranscriptionCounts?: Record<string, number>;
}

export function AdminQuestionsTab({ questions, categories, onDataChange, questionResponseCounts, questionTranscriptionCounts }: AdminQuestionsTabProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    question_text: "",
    image_url: "",
    image_attribution: "",
    order_index: 0,
    category_id: categories.length > 0 ? categories[0].id : "",
  });

  // Sort questions based on order_index
  const sortedQuestions = useMemo(() => {
    return [...questions].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.order_index - b.order_index;
      }
      return b.order_index - a.order_index;
    });
  }, [questions, sortOrder]);

  const totalPages = Math.ceil(sortedQuestions.length / ITEMS_PER_PAGE);
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedQuestions.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedQuestions, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortOrder]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a valid image file (JPEG, PNG, GIF, WebP)",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `question-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image_url: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    const validationResult = questionSchema.safeParse({
      question_text: formData.question_text,
      order_index: formData.order_index,
      category_id: formData.category_id,
      image_url: formData.image_url || undefined,
      image_attribution: formData.image_attribution || undefined
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({
        title: "Validation Error",
        description: firstError.message,
        variant: "destructive"
      });
      return;
    }

    const validated = validationResult.data;

    try {
      if (editingQuestion) {
        const { error } = await supabase
          .from('questions')
          .update({
            question_text: validated.question_text,
            image_url: validated.image_url || null,
            image_attribution: validated.image_attribution || null,
            order_index: validated.order_index,
            category_id: validated.category_id,
          })
          .eq('id', editingQuestion.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Question updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('questions')
          .insert({
            question_text: validated.question_text,
            image_url: validated.image_url || null,
            image_attribution: validated.image_attribution || null,
            order_index: validated.order_index,
            category_id: validated.category_id,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Question added successfully"
        });
      }

      setDialogOpen(false);
      resetForm();
      onDataChange();
    } catch (error) {
      console.error('Error saving question:', error);
      toast({
        title: "Error",
        description: "Failed to save question",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Question deleted successfully"
      });

      onDataChange();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      image_url: question.image_url || "",
      image_attribution: question.image_attribution || "",
      order_index: question.order_index,
      category_id: question.category_id,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingQuestion(null);
    setFormData({
      question_text: "",
      image_url: "",
      image_attribution: "",
      order_index: questions.length,
      category_id: categories.length > 0 ? categories[0].id : "",
    });
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  const stats = useMemo(() => {
    const totalResponses = Object.values(questionResponseCounts).reduce((a, b) => a + b, 0);
    return {
      total: questions.length,
      categories: categories.length,
      responses: totalResponses
    };
  }, [questions, categories, questionResponseCounts]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tab Specific Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-blue-500/5 border-blue-500/10">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Total Questions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/5 border-purple-500/10">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">{stats.categories}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Categories</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/10">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">{stats.responses}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Total Recordings</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background/50">
              <div className="flex items-center gap-2">
                {sortOrder === 'desc' ? (
                  <ArrowDown className="w-4 h-4" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
                <SelectValue placeholder="Sort order" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">
                <div className="flex items-center gap-2">
                  <ArrowDown className="w-4 h-4" />
                  Last First
                </div>
              </SelectItem>
              <SelectItem value="asc">
                <div className="flex items-center gap-2">
                  <ArrowUp className="w-4 h-4" />
                  First First
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px] w-[95vw] max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    {editingQuestion ? (
                      <>
                        <Edit className="w-5 h-5" />
                        Edit Question
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Add New Question
                      </>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-sm sm:text-base">
                    {editingQuestion
                      ? 'Update the question details below.'
                      : 'Fill in the details to create a new question.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 sm:gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm sm:text-base">Category</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="question_text" className="text-sm sm:text-base">Question Text</Label>
                    <Textarea
                      id="question_text"
                      value={formData.question_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, question_text: e.target.value }))}
                      placeholder="Enter the question..."
                      required
                      rows={3}
                      className="resize-none text-sm sm:text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm sm:text-base">Question Image (optional)</Label>

                    {formData.image_url ? (
                      <div className="relative">
                        <img
                          src={formData.image_url}
                          alt="Question preview"
                          className="w-full h-32 sm:h-48 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 sm:top-2 sm:right-2 h-6 w-6 sm:h-8 sm:w-8 p-0"
                          onClick={removeImage}
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className={`border-2 border-dashed rounded-lg p-4 sm:p-6 text-center cursor-pointer transition-colors ${dragActive
                          ? 'border-primary bg-primary/5'
                          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => !uploading && fileInputRef.current?.click()}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleFileInputChange}
                          disabled={uploading}
                        />

                        <div className="space-y-2">
                          <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground mx-auto" />
                          <div>
                            <p className="font-medium text-foreground text-sm sm:text-base">
                              {uploading ? 'Uploading...' : 'Drop your image here or click to browse'}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                              JPEG, PNG, GIF, WebP up to 5MB
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image_attribution" className="text-sm sm:text-base">Image Attribution (optional)</Label>
                    <Input
                      id="image_attribution"
                      value={formData.image_attribution}
                      onChange={(e) => setFormData(prev => ({ ...prev, image_attribution: e.target.value }))}
                      placeholder="Photo by..."
                      className="text-sm sm:text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="order_index" className="text-sm sm:text-base">Order</Label>
                    <Input
                      id="order_index"
                      type="number"
                      value={formData.order_index}
                      onChange={(e) => setFormData(prev => ({ ...prev, order_index: parseInt(e.target.value) || 0 }))}
                      min={0}
                      className="text-sm sm:text-base"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto text-sm">
                    Cancel
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto bg-gradient-to-r from-primary to-blue-600 text-sm">
                    {editingQuestion ? 'Update Question' : 'Add Question'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {paginatedQuestions.length} of {sortedQuestions.length} questions
      </p>

      <div className="grid gap-3 sm:gap-4">
        {paginatedQuestions.map((question) => (
          <Card key={question.id} className="bg-card border-border/50 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      #{question.order_index + 1}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getCategoryName(question.category_id)}
                    </Badge>
                    {questionTranscriptionCounts && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${questionTranscriptionCounts[question.id] > 0 ? "bg-purple-500/10 text-purple-600 border-purple-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}
                      >
                        {questionTranscriptionCounts[question.id] > 0
                          ? `${questionTranscriptionCounts[question.id]} Transcription${questionTranscriptionCounts[question.id] !== 1 ? 's' : ''}`
                          : "Awaiting Transcription"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-foreground font-medium text-sm sm:text-base">{question.question_text}</p>
                  {question.image_url && (
                    <div className="mt-2 flex items-center gap-2">
                      <img
                        src={question.image_url}
                        alt="Question"
                        className="h-12 w-12 sm:h-16 sm:w-16 object-cover rounded-lg"
                      />
                      {question.image_attribution && (
                        <span className="text-xs text-muted-foreground">{question.image_attribution}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(question)}
                    className="flex-1 sm:flex-none text-xs sm:text-sm"
                  >
                    <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(question.id)}
                    className="flex-1 sm:flex-none text-xs sm:text-sm"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {paginatedQuestions.length === 0 && (
          <Card className="bg-card border-border/50 shadow-sm">
            <CardContent className="p-6 sm:p-8 text-center">
              <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-sm sm:text-base">No questions yet. Add your first question above.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
