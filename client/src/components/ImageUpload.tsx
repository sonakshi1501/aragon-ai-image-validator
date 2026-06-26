import { ChangeEvent, DragEvent, useRef } from "react";
import { LocalUploadItem } from "../types";

interface Props {
  localItems: LocalUploadItem[];
  isUploading: boolean;
  error: string | null;
  cardWidth: number;
  onFilesSelected: (files: FileList | File[]) => void;
  onUpload: () => void;
}

export function ImageUpload({
  localItems,
  isUploading,
  error,
  cardWidth,
  onFilesSelected,
  onUpload,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files.length) {
      onFilesSelected(event.dataTransfer.files);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      onFilesSelected(event.target.files);
    }
  };

  const validCount = localItems.filter((item) => !item.clientError).length;

  return (
    <section className="upload-panel">
      <div
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <p className="dropzone-title">Drop images here or click to browse</p>
        <p className="dropzone-subtitle">Supported: HEIC, PNG, JPEG</p>
        <input
          ref={inputRef}
          type="file"
          accept=".heic,.heif,.png,.jpg,.jpeg,image/heic,image/png,image/jpeg"
          multiple
          hidden
          onChange={handleChange}
        />
      </div>

      {localItems.length > 0 && (
        <div className="local-previews">
          <h3>Selected files ({localItems.length})</h3>
          <div
            className="preview-grid"
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))` }}
          >
            {localItems.map((item) => (
              <article key={item.id} className={`preview-card status-${item.status}`}>
                <div className="image-frame">
                  <img src={item.previewUrl} alt={item.file.name} />
                </div>
                <div className="preview-meta">
                  <strong>{item.file.name}</strong>
                  <span>{Math.round(item.file.size / 1024)} KB</span>
                  {item.clientError && <p className="error-text">{item.clientError}</p>}
                  {item.serverRecord && (
                    <p className={item.serverRecord.status === "ACCEPTED" ? "ok-text" : "error-text"}>
                      {item.serverRecord.status === "ACCEPTED"
                        ? "Accepted"
                        : item.serverRecord.rejectionReason}
                    </p>
                  )}
                  {item.status === "uploading" && <p className="muted">Uploading...</p>}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {error && <p className="error-banner">{error}</p>}

      <button
        className="primary-btn"
        disabled={isUploading || validCount === 0}
        onClick={onUpload}
      >
        {isUploading ? "Uploading..." : `Upload ${validCount || ""} image${validCount === 1 ? "" : "s"}`}
      </button>
    </section>
  );
}
