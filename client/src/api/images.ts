import { ImageRecord } from "../types";

export async function fetchImages(): Promise<ImageRecord[]> {
  const response = await fetch("/api/images");
  if (!response.ok) throw new Error("Failed to load images");
  return response.json();
}

export async function uploadImages(files: File[]): Promise<ImageRecord[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  const response = await fetch("/api/images", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Upload failed");
  }

  return response.json();
}

export async function deleteImageById(id: string): Promise<void> {
  const response = await fetch(`/api/images/${id}`, { method: "DELETE" });
  if (response.status !== 204 && !response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to delete image");
  }
}

export async function deleteImagesByStatus(
  status: "ACCEPTED" | "REJECTED"
): Promise<void> {
  const response = await fetch(`/api/images?status=${status}`, { method: "DELETE" });
  if (response.status !== 204 && !response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to clear images");
  }
}
