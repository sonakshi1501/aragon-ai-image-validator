import { ImageRecord } from "../types";

interface Props {
  title: string;
  images: ImageRecord[];
  variant: "accepted" | "rejected";
  cardWidth: number;
}

export function ImageGallery({ title, images, variant, cardWidth }: Props) {
  return (
    <section className={`gallery gallery-${variant}`}>
      <div className="gallery-header">
        <h2>{title}</h2>
        <span className="count-badge">{images.length}</span>
      </div>

      {images.length === 0 ? (
        <p className="empty-state">No images yet</p>
      ) : (
        <div
          className="preview-grid"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))` }}
        >
          {images.map((image) => (
            <article key={image.id} className="gallery-card">
              {image.previewUrl ? (
                <div className="image-frame">
                  <img src={image.previewUrl} alt={image.originalName} />
                </div>
              ) : (
                <div className="placeholder">No preview</div>
              )}
              <div className="preview-meta">
                <strong>{image.originalName}</strong>
                {image.width && image.height && (
                  <span>
                    {image.width} x {image.height}
                  </span>
                )}
                {variant === "rejected" && image.rejectionReason && (
                  <p className="error-text">{image.rejectionReason}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
