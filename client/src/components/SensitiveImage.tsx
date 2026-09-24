import React, { useState } from 'react';
import { HiOutlineEye } from 'react-icons/hi2';

interface SensitiveImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

/**
 * Campaign imagery is concealed by default because user uploads can contain
 * medical injuries or distressing scenes. Revealing is deliberately local to
 * this image and is not persisted between sessions.
 */
const SensitiveImage: React.FC<SensitiveImageProps> = ({ src, alt, className = '', onClick }) => {
  const [revealed, setRevealed] = useState(false);

  const reveal = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setRevealed(true);
  };

  return (
    <div className={`sensitive-image ${revealed ? 'revealed' : ''} ${className}`} onClick={onClick}>
      <img src={src} alt={alt} />
      {!revealed && (
        <button type="button" className="sensitive-image-reveal" onClick={reveal} aria-label={`Reveal image for ${alt}`}>
          <HiOutlineEye aria-hidden="true" />
          <span>Sensitive image</span>
          <small>Tap to view</small>
        </button>
      )}
    </div>
  );
};

export default SensitiveImage;
