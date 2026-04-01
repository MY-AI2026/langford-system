import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  UploadTaskSnapshot,
} from "firebase/storage";
import { storage } from "@/lib/firebase/config";

export interface StorageDocument {
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
  path: string;
}

// Timeout wrapper — prevents Firebase SDK hangs
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    ),
  ]);
}

export async function uploadDocument(
  studentId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<StorageDocument> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `students/${studentId}/documents/${timestamp}_${safeName}`;
  const storageRef = ref(storage, path);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot: UploadTaskSnapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(Math.round(progress));
      },
      (error) => {
        console.error("[document-service] upload error:", error);
        reject(error);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            name: file.name,
            url,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            path,
          });
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

export async function getDocuments(studentId: string): Promise<StorageDocument[]> {
  const folderRef = ref(storage, `students/${studentId}/documents`);

  try {
    const result = await withTimeout(listAll(folderRef), 8000);
    const docs = await Promise.all(
      result.items.map(async (itemRef) => {
        try {
          const url = await withTimeout(getDownloadURL(itemRef), 5000);
          const name = itemRef.name.replace(/^\d+_/, "");
          return {
            name,
            url,
            size: 0,
            uploadedAt: "",
            path: itemRef.fullPath,
          } as StorageDocument;
        } catch {
          return null;
        }
      })
    );
    return docs.filter((d): d is StorageDocument => d !== null);
  } catch (error) {
    console.error("[document-service] getDocuments error:", error);
    return [];
  }
}

export async function deleteDocument(path: string): Promise<void> {
  const fileRef = ref(storage, path);
  await withTimeout(deleteObject(fileRef), 8000);
}
