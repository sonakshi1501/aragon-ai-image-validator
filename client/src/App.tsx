import { useState } from "react";
import { ImageUpload } from "./components/ImageUpload";
import { ImageGallery } from "./components/ImageGallery";
import { useImageUpload } from "./hooks/useImageUpload";
import "./App.css";

export default function App() {
  const [previewCardWidth, setPreviewCardWidth] = useState(220);

  const {
    localItems,
    accepted,
    rejected,
    isUploading,
    error,
    addFiles,
    upload,
  } = useImageUpload();

  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow">Aragon.ai Interview Challenge</p>
        <h1>Image Upload & Validation</h1>
        <p>
          Upload portrait photos. Images are validated for format, resolution, blur,
          face size, duplicates, and multiple faces.
        </p>
      </header>

      <section className="display-controls">
        <label htmlFor="preview-width">
          Preview card width: <strong>{previewCardWidth}px</strong>
        </label>
        <input
          id="preview-width"
          type="range"
          min={160}
          max={420}
          step={10}
          value={previewCardWidth}
          onChange={(event) => setPreviewCardWidth(Number(event.target.value))}
        />
        <p className="display-hint">
          Images show fully without cropping. Increase width for taller portrait photos.
        </p>
      </section>

      <ImageUpload
        localItems={localItems}
        isUploading={isUploading}
        error={error}
        cardWidth={previewCardWidth}
        onFilesSelected={addFiles}
        onUpload={upload}
      />

      <div className="galleries">
        <ImageGallery
          title="Accepted"
          images={accepted}
          variant="accepted"
          cardWidth={previewCardWidth}
        />
        <ImageGallery
          title="Rejected"
          images={rejected}
          variant="rejected"
          cardWidth={previewCardWidth}
        />
      </div>
    </div>
  );
}
