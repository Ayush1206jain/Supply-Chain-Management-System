import { useState, useEffect } from "react";

/**
 * Custom hook to track scroll direction.
 * Returns true if scrolling up (or at the top), and false if scrolling down.
 * 
 * @param {number} threshold - Scroll offset before visibility triggers
 * @returns {boolean} visible
 */
export function useScrollVisibility(threshold = 50) {
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > threshold) {
        // Scrolling down - hide
        setVisible(false);
      } else {
        // Scrolling up - show
        setVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY, threshold]);

  return visible;
}
