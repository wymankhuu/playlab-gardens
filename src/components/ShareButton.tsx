'use client';

import { useState } from 'react';

interface ShareButtonProps {
  url: string;
  className?: string;
}

export default function ShareButton({ url, className }: ShareButtonProps) {
  const [showToast, setShowToast] = useState(false);

  const handleClick = () => {
    navigator.clipboard.writeText(url).then(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    });
  };

  return (
    <button
      className={`share-link-btn${className ? ' ' + className : ''}${showToast ? ' copied' : ''}`}
      data-url={url}
      title="Copy share link"
      aria-label="Copy share link"
      onClick={handleClick}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      {' '}Share
      {showToast && <span className="copied-toast">Copied!</span>}
    </button>
  );
}
