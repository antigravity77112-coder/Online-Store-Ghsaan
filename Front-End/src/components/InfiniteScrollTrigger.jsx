import React, { useEffect, useRef } from 'react';

/**
 * InfiniteScrollTrigger
 * 
 * An invisible intersection observer element that triggers data loading
 * aggressively before the user reaches the bottom, providing a completely
 * frictionless, continuous browsing experience.
 */
export default function InfiniteScrollTrigger({ onIntersect, isLoadingMore, isReachingEnd }) {
  const triggerRef = useRef(null);

  useEffect(() => {
    // Prevent duplicate triggers if currently loading or catalog is exhausted
    if (isLoadingMore || isReachingEnd) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onIntersect();
        }
      },
      {
        root: null,
        // Predictive Loading: trigger 800px before the element comes into view
        rootMargin: '800px', 
        threshold: 0,
      }
    );

    const el = triggerRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [isLoadingMore, isReachingEnd, onIntersect]);

  // If we reached the end, we don't render the trigger anymore.
  if (isReachingEnd) return null;

  return (
    <div 
      ref={triggerRef} 
      className="w-full h-1 pointer-events-none opacity-0" 
      aria-hidden="true" 
    />
  );
}
