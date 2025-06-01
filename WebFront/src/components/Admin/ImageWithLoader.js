import React, { useState, useEffect } from 'react';
import placeholderImg from './placeholder.png';

const ImageWithLoader = ({ src, alt, onClick }) => {
  const [hasError, setHasError] = useState(false);

  // Сброс состояния при смене изображения
  useEffect(() => {
    setHasError(false);
  }, [src]);

  return (
    <img
      src={hasError ? placeholderImg : src}
      alt={alt}
      onClick={onClick}
      loading="lazy" // Нативный lazy loading
      onError={() => setHasError(true)}
    />
  );
};

export default ImageWithLoader;