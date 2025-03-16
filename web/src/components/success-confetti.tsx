import React, { useEffect, useState } from 'react';
import styles from './success-confetti.module.css';

interface SuccessConfettiProps {
  active: boolean;
}

export const SuccessConfetti: React.FC<SuccessConfettiProps> = ({ active }) => {
  const [pieces, setPieces] = useState<React.ReactNode[]>([]);
  
  useEffect(() => {
    if (active) {
      // Generate confetti pieces only when active changes to true
      const newPieces = Array.from({ length: 100 }).map((_, i) => {
        // Randomize horizontal position
        const leftPos = Math.floor(Math.random() * 100);
        
        // Randomize animation duration between 3 and 6 seconds
        const animationDuration = 3 + Math.random() * 3;
        
        // Randomize animation delay so they don't all fall at once
        const animationDelay = Math.random() * 0.5;
        
        // Randomize the shape - 0: rectangle, 1: circle, 2: triangle
        const shape = Math.floor(Math.random() * 3);
        
        // Randomize the size
        const size = 5 + Math.floor(Math.random() * 10);
        
        // Set style for each piece
        const style = {
          left: `${leftPos}%`,
          animationDuration: `${animationDuration}s`,
          animationDelay: `${animationDelay}s`,
          width: `${size}px`,
          height: shape === 1 ? `${size}px` : `${size * 3}px`, // Circles have same width and height
        };
        
        return (
          <div 
            key={i} 
            className={`${styles.confettiPiece} ${
              shape === 0 ? styles.rectangle : 
              shape === 1 ? styles.circle : 
              styles.triangle
            } ${
              i % 5 === 0 ? styles.color1 :
              i % 5 === 1 ? styles.color2 :
              i % 5 === 2 ? styles.color3 :
              i % 5 === 3 ? styles.color4 :
              styles.color5
            }`}
            style={style}
          />
        );
      });
      
      setPieces(newPieces);
    } else {
      // Clear confetti when inactive
      setPieces([]);
    }
  }, [active]);
  
  if (!active) return null;
  
  return <div className={styles.confettiContainer}>{pieces}</div>;
}; 