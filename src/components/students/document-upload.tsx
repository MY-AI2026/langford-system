"use client";

import { useEffect, useRef, useState } from "react";
import {
  uploadDocument,
  getDocuments,
  deleteDocument,
  StorageDocument,
} from "@/lib/services/document-service";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Download,
  Trash2,
  Upload,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

interface DocumentUploadProps {
  studentId: string;
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileText className="h-5 w-5 text-red-500" />;
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext ?? ""))
    return <ImageIcon className="h-5 w-5 text-blue-500" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

export function DocumentUpload({ studentId }: DocumentUploadProps) {
  const [documents, setDocuments] = useState<StorageDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadDocuments() {
    const docs = await getDocuments(studentId);
    setDocuments(docs);
    setLoading(false);
  }

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) {
      toast.error("Only PDF, JPG, and PNG files are allowed");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      await uploadDocument(studentId, file, (p) => setProgress(p));
      toast.success("Document uploaded");
      await loadDocuments();
    } catch {
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(doc: StorageDocument) {
    setDeleting(doc.path);
    try {
      await deleteDocument(doc.path);
      setDocuments((prev) => prev.filter((d) => d.path !== doc.path));
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Documents</h3>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Upload Document"}
          </Button>
        </div>
      </div>

      {uploading && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Uploading... {progress}%</p>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {loading && (
        <Skeleton className="h-24 w-full" />
      )}

      {!loading && documents.length === 0 && !uploading ? (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">No documents uploaded</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.path}>
              <CardContent className="flex items-center gap-3 py-3">
                {fileIcon(doc.name)}
                <span className="flex-1 text-sm truncate">{doc.name}</span>
                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                  <Button size="icon" variant="ghost" title="Download">
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
                <Button
                  size="icon"
                  variant="ghost"
                  title="Delete"
                  disabled={deleting === doc.path}
                  onClick={() => handleDelete(doc)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
