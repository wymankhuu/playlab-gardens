'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isStarred as checkIsStarred,
  toggleStar,
  getCachedStarCount,
} from '@/lib/stars';

interface StarButtonProps {
  appId: string;
  className?: string;
}

export default function StarButton({ appId, className = 'app-star-btn' }: StarButtonProps) {
  const [starred, setStarred] = useState(false);
  const [count, setCount] = useState(0);
  const [animate, setAnimate] = useState(false);
  const animateTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setStarred(checkIsStarred(appId));
    setCount(getCachedStarCount(appId));
  }, [appId]);

  // Re-sync count when cache might have been updated externally
  useEffect(() => {
    const interval = setInterval(() => {
      const cached = getCachedStarCount(appId);
      if (cached !== count) setCount(cached);
    }, 2000);
    return () => clearInterval(interval);
  }, [appId, count]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const { nowStarred, countPromise } = toggleStar(appId);
      setStarred(nowStarred);
      setAnimate(true);

      if (animateTimer.current) clearTimeout(animateTimer.current);
      animateTimer.current = setTimeout(() => setAnimate(false), 600);

      countPromise.then((newCount) => {
        if (newCount != null) setCount(newCount);
      });
    },
    [appId],
  );

  return (
    <button
      className={`${className}${starred ? ' starred' : ''}${animate ? ' star-animate' : ''}`}
      data-app-id={appId}
      aria-label="Star this app"
      title="Star this app"
      onClick={handleClick}
    >
      <span className="star-icon">{starred ? '\u2605' : '\u2606'}</span>
      <span className="star-count">{count > 0 ? count : ''}</span>
    </button>
  );
}
