import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import ImageWithLoader from '../../../features/ImageWithLoader';

const NewsGallery = ({ files, onImageClick }) => {
  const processedFiles = useMemo(() => {
    return files?.map(file => ({
      ...file,
      // Добавляем проверку на существование файла
      fileName: file.fileName?.startsWith('placeholder') 
        ? file.fileName 
        : `${file.fileName}?v=${Date.now()}`
    })) || [];
  }, [files]);

  if (!processedFiles || processedFiles.length === 0) return null;

  return (
    <div className="news-gallery">
      <p><strong>Количество фотографий:</strong> {processedFiles.length}</p>
      <div className="thumbnail-container">
        {processedFiles.map((file, index) => (
          <div 
            key={index} 
            className="thumbnail"
            onClick={() => onImageClick(index)}
            role="button"
            tabIndex={0}
          >
            <ImageWithLoader
              src={`http://127.0.0.1:5000/uploads/${file.fileName}`}
              alt={`Фото ${index + 1}`}
              onClick={() => onImageClick(index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

NewsGallery.propTypes = {
  files: PropTypes.arrayOf(
    PropTypes.shape({
      fileName: PropTypes.string.isRequired,
      fileType: PropTypes.string
    })
  ).isRequired,
  onImageClick: PropTypes.func.isRequired
};

export default React.memo(NewsGallery);