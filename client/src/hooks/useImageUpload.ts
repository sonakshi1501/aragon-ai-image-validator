import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchImages,
  ImageRecord,
  LocalUploadItem,
  uploadImages,
  validateClientFile,
} from "../types";

function createLocalItem(file: File): LocalUploadItem {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    file,
    previewUrl: URL.createObjectURL(file),
    status: "idle",
  };
}

export function useImageUpload() {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [localItems, setLocalItems] = useState<LocalUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadImages = useCallback(async () => {
    try {
      const data = await fetchImages();
      setImages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load images");
    }
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files).map((file) => {
      const clientError = validateClientFile(file);
      const item = createLocalItem(file);
      if (clientError) {
        return { ...item, clientError, status: "error" as const };
      }
      return item;
    });

    setLocalItems((prev) => {
      const map = new Map(prev.map((item) => [item.id, item]));
      incoming.forEach((item) => map.set(item.id, item));
      return Array.from(map.values());
    });
  }, []);

  const upload = useCallback(async () => {
    const validFiles = localItems.filter((item) => !item.clientError).map((item) => item.file);
    if (!validFiles.length) {
      setError("No valid files to upload");
      return;
    }

    setIsUploading(true);
    setError(null);
    setLocalItems((prev) =>
      prev.map((item) =>
        item.clientError ? item : { ...item, status: "uploading" as const }
      )
    );

    try {
      const results = await uploadImages(validFiles);
      await loadImages();

      setLocalItems((prev) =>
        prev.map((item) => {
          const match = results.find((r) => r.originalName === item.file.name);
          if (!match) return item;
          return {
            ...item,
            serverRecord: match,
            status: match.status === "ACCEPTED" ? ("success" as const) : ("error" as const),
          };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setLocalItems((prev) =>
        prev.map((item) =>
          item.clientError ? item : { ...item, status: "error" as const }
        )
      );
    } finally {
      setIsUploading(false);
    }
  }, [localItems, loadImages]);

  const accepted = useMemo(
    () => images.filter((img) => img.status === "ACCEPTED"),
    [images]
  );
  const rejected = useMemo(
    () => images.filter((img) => img.status === "REJECTED"),
    [images]
  );

  return {
    images,
    localItems,
    accepted,
    rejected,
    isUploading,
    error,
    addFiles,
    upload,
    refresh: loadImages,
  };
}
