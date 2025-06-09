import React, { useState, useEffect } from 'react';
import placeholderImg from '../assets/placeholder.png';

const ImageWithLoader = ({ src, alt, onClick }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  return (
    <img
      src={hasError ? placeholderImg : src}
      alt={alt}
      onClick={onClick}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
};

export default ImageWithLoader;