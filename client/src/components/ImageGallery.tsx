import { FiTrash2 } from "react-icons/fi";
import { ImageRecord } from "../types";

interface Props {
  title: string;
  images: ImageRecord[];
  variant: "accepted" | "rejected";
  cardWidth: number;
  deletingIds: Set<string>;
  onDelete: (id: string) => Promise<void>;
  onClearAll?: () => Promise<void>;
  isClearing?: boolean;
}

export function ImageGallery({
  title,
  images,
  variant,
  cardWidth,
  deletingIds,
  onDelete,
  onClearAll,
  isClearing = false,
}: Props) {
  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this image?");
    if (!confirmed) return;
    await onDelete(id);
  };

  const handleClearAll = async () => {
    if (!onClearAll || images.length === 0) return;
    const confirmed = window.confirm(`Delete all ${images.length} ${title.toLowerCase()} images?`);
    if (!confirmed) return;
    await onClearAll();
  };

  return (
    <section className={`gallery gallery-${variant}`}>
      <div className="gallery-header">
        <h2>{title}</h2>
        <div className="gallery-actions">
          <span className="count-badge">{images.length}</span>
          {onClearAll && images.length > 0 && (
            <button
              type="button"
              className="clear-all-btn"
              disabled={isClearing}
              onClick={handleClearAll}
            >
              {isClearing ? "Clearing..." : "Clear all"}
            </button>
          )}
        </div>
      </div>

      {images.length === 0 ? (
        <p className="empty-state">No images yet</p>
      ) : (
        <div
          className="preview-grid"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`,
          }}
        >
          {images.map((image) => {
            const isDeleting = deletingIds.has(image.id);
            return (
              <article key={image.id} className="gallery-card">
                {image.previewUrl ? (
                  <div className="image-frame">
                    <img src={image.previewUrl} alt={image.originalName} />
                  </div>
                ) : (
                  <div className="placeholder">No Preview</div>
                )}

                <div className="preview-meta">
                  <strong>{image.originalName}</strong>

                  {image.width && image.height && (
                    <span>
                      {image.width} × {image.height}
                    </span>
                  )}

                  {variant === "rejected" && image.rejectionReason && (
                    <p className="error-text">{image.rejectionReason}</p>
                  )}

                  <button
                    type="button"
                    className="delete-btn"
                    disabled={isDeleting}
                    onClick={() => void handleDelete(image.id)}
                    title="Delete image"
                  >
                    <FiTrash2 size={16} />
                    <span>{isDeleting ? "Deleting..." : "Delete"}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
