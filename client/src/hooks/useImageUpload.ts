import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteImageById,
  deleteImagesByStatus,
  fetchImages,
  uploadImages,
} from "../api/images";
import { ImageRecord, LocalUploadItem, validateClientFile } from "../types";

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
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [isClearing, setIsClearing] = useState(false);
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

  const clearLocalItems = useCallback(() => {
    setLocalItems([]);
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
      await uploadImages(validFiles);
      await loadImages();
      setLocalItems([]);
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

  const deleteImage = useCallback(
    async (id: string) => {
      setDeletingIds((prev) => new Set(prev).add(id));
      setError(null);

      try {
        await deleteImageById(id);
        await loadImages();
        setLocalItems((prev) =>
          prev.filter((item) => item.serverRecord?.id !== id)
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete image");
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [loadImages]
  );

  const clearRejected = useCallback(async () => {
    setIsClearing(true);
    setError(null);

    try {
      await deleteImagesByStatus("REJECTED");
      await loadImages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear rejected images");
    } finally {
      setIsClearing(false);
    }
  }, [loadImages]);

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
    deletingIds,
    isClearing,
    error,
    addFiles,
    upload,
    clearLocalItems,
    refresh: loadImages,
    deleteImage,
    clearRejected,
  };
}
