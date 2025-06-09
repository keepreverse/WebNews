import React, { useMemo } from 'react';
import LazyImage from './LazyImage';

const Gallery = ({ files, onImageClick }) => {
  const processedFiles = useMemo(() => {
    return (
      files?.map((file) => ({
        ...file,
        fileName: file.fileName?.startsWith('placeholder')
          ? file.fileName
          : `${file.fileName}?v=${Date.now()}`,
      })) || []
    );
  }, [files]);

  if (!processedFiles || processedFiles.length === 0) return null;

  return (
    <div className="news-gallery">
      <p>
        <strong>Количество фотографий:</strong> {processedFiles.length}
      </p>
      <div className="thumbnail-container">
        {processedFiles.map((file, index) => (
          <div
            key={index}
            className="thumbnail"
            onClick={() => onImageClick(index)}
            role="button"
            tabIndex={0}
          >
            <LazyImage
              src={`http://127.0.0.1:5000/uploads/${file.fileName}`}
              alt={`Фото ${index + 1}`}
              onClick={() => onImageClick(index)}
              className="gallery-image"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Gallery;
