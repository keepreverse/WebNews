import React from 'react';
import PropTypes from 'prop-types';

const NewsGallery = ({ files, onImageClick }) => {
  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/path/to/placeholder/image.jpg';
  };

  if (!files || files.length === 0) return null;

  return (
    <div className="news-gallery">
    <p><strong>Количество фотографий:</strong> {files.length}</p>
      <div className="thumbnail-container">
        {files.map((file, index) => (
          <div 
            key={index} 
            className="thumbnail"
            onClick={() => onImageClick(index)}
            role="button"
            tabIndex={0}
          >
            <img
              src={`http://127.0.0.1:5000/uploads/${file.fileName}`}
              alt={`Фото ${index + 1}`}
              className="data-image"
              loading="lazy"
              onError={handleImageError}
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