'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface QRModalProps {
  url: string;
  name: string;
  onClose: () => void;
}

export default function QRModal({ url, name, onClose }: QRModalProps) {
  const [copyText, setCopyText] = useState('Copy Link');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&margin=10`;
  const downloadName = `qr-${name.toLowerCase().replace(/\s+/g, '-')}.png`;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    // Save trigger element for returning focus on close
    triggerRef.current = document.activeElement as HTMLElement | null;
    // Focus the close button when modal opens
    setTimeout(() => closeButtonRef.current?.focus(), 50);

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Return focus to trigger element on unmount
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    };
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
      <div className="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-modal-title">
        <div className="qr-modal-header">
          <h3 className="qr-modal-title" id="qr-modal-title">{name}</h3>
          <button ref={closeButtonRef} className="qr-modal-close" aria-label="Close" onClick={onClose}>
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
