import React, { useEffect, useRef, useState } from 'react';

interface ParliamentChartProps {
  percentage: number;
  ariaLabel: string;
  activeColor?: string;
  children?: React.ReactNode;
  className?: string;
  interactionActive?: boolean;
}

const OUTER_DOTS = 17;
const INNER_DOTS = 13;
const CENTER = 110;
const OUTER_RADIUS = 88;
const INNER_RADIUS = OUTER_RADIUS * 0.75;
const DOT_RADIUS = 9.3;
const ARC_START = -100;
const ARC_SWEEP = 200;

function pointsForRow(count: number, radius: number, progress: number, color: string, row: string, interactionActive: boolean) {
  return Array.from({ length: count }, (_, index) => {
    const progressPosition = count === 1 ? 0 : index / (count - 1);
    const angle = (ARC_START + ARC_SWEEP * progressPosition) * Math.PI / 180;
    const isActive = progress > 0 && progressPosition <= progress;
    const waveStagger = interactionActive ? 9 : 76;
    return (
      <circle
        key={`${row}-${index}`}
        cx={CENTER + radius * Math.cos(angle)}
        cy={CENTER + radius * Math.sin(angle)}
        r={DOT_RADIUS}
        fill={isActive ? (interactionActive ? 'var(--color-apple-200)' : color) : '#DDE6DA'}
        className={isActive ? `parliament-dot-active${interactionActive ? ' parliament-dot-hover' : ''}` : undefined}
        style={isActive ? {
          animationDelay: `${(index + (row === 'inner' ? 0.5 : 0)) * waveStagger}ms`,
          animationDuration: interactionActive ? '480ms' : '2.6s',
        } : undefined}
      />
    );
  });
}

export const ParliamentChart: React.FC<ParliamentChartProps> = ({
  percentage,
  ariaLabel,
  activeColor = '#52F229',
  children,
  className = '',
  interactionActive = false,
}) => {
  const targetPercentage = Math.min(100, Math.max(0, percentage));
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const displayedPercentageRef = useRef(0);

  useEffect(() => {
    const startValue = displayedPercentageRef.current;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || startValue === targetPercentage) {
      displayedPercentageRef.current = targetPercentage;
      setDisplayPercentage(targetPercentage);
      return;
    }

    const duration = 760;
    let animationFrame = 0;
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + (targetPercentage - startValue) * easedProgress;
      displayedPercentageRef.current = nextValue;
      setDisplayPercentage(nextValue);
      if (progress < 1) animationFrame = window.requestAnimationFrame(animate);
      else {
        displayedPercentageRef.current = targetPercentage;
        setDisplayPercentage(targetPercentage);
      }
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [targetPercentage]);

  const progress = displayPercentage / 100;

  return (
    <div className={`relative z-0 -mb-24 aspect-square w-full ${className}`}>
      <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90" role="img" aria-label={ariaLabel}>
        {pointsForRow(OUTER_DOTS, OUTER_RADIUS, progress, activeColor, 'outer', interactionActive)}
        {pointsForRow(INNER_DOTS, INNER_RADIUS, progress, activeColor, 'inner', interactionActive)}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
};
