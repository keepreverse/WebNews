import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import placeholder from '../assets/placeholder.png';

const LazyImage = ({
  src,
  alt = '',
  className = '',
  onClick = () => {},
  onLoadCallback = () => {},
  onErrorCallback = () => {},
  style = {},
}) => {
  const imgRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!imgRef.current) return;

    imgRef.current.setAttribute('loading', 'lazy');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);


  const displaySrc = failed
    ? placeholder
    : inView
    ? src
    : undefined;

  return (
    <img
      ref={imgRef}
      src={displaySrc}
      alt={alt}
      className={className}
      style={style}
      onClick={onClick}
      onLoad={(e) => {
        if (inView && !failed) {
          onLoadCallback(e);
        }
      }}
      onError={(e) => {
        if (!failed) {
          setFailed(true);
          onErrorCallback(e);
        }
      }}
    />
  );
};

LazyImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string,
  className: PropTypes.string,
  onClick: PropTypes.func,
  onLoadCallback: PropTypes.func,
  onErrorCallback: PropTypes.func,
  style: PropTypes.object,
};

export default React.memo(LazyImage);
