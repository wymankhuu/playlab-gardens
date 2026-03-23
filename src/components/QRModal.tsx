'use client';

import { useState, useEffect, useCallback } from 'react';

interface QRModalProps {
  url: string;
  name: string;
  onClose: () => void;
}

export default function QRModal({ url, name, onClose }: QRModalProps) {
  const [copyText, setCopyText] = useState('Copy Link');
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&margin=10`;
  const downloadName = `qr-${name.toLowerCase().replace(/\s+/g, '-')}.png`;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopyText('Copied!');
      setTimeout(() => setCopyText('Copy Link'), 2000);
    });
  };

  return (
    <div
      className="qr-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="qr-modal">
        <div className="qr-modal-header">
          <h3 className="qr-modal-title">{name}</h3>
          <button className="qr-modal-close" aria-label="Close" onClick={onClose}>
            &#10005;
          </button>
        </div>
        <div className="qr-modal-body">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImageUrl}
            alt={`QR code for ${name}`}
            className="qr-modal-image"
            width="300"
            height="300"
          />
          <p className="qr-modal-url">{url}</p>
        </div>
        <div className="qr-modal-actions">
          <a href={qrImageUrl} download={downloadName} className="qr-download-btn">
            Download QR
          </a>
          <button className="qr-copy-btn" onClick={handleCopy}>
            {copyText}
          </button>
        </div>
      </div>
    </div>
  );
}
