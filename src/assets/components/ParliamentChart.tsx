import React, { useEffect, useRef, useState } from 'react';

interface ParliamentChartProps {
  percentage: number;
  ariaLabel: string;
  activeColor?: string;
  segments?: { value: number; color: string }[];
  children?: React.ReactNode;
  interactionActive?: boolean;
}

const CENTER = 110;
const DOT_RADIUS = 6;
const ARC_START = -100;
const ARC_SWEEP = 200;
const DOT_ROWS = [
  { name: 'row-outer', count: 20, radius: 88 },
  { name: 'row-inner', count: 17, radius: 72 },
] as const;

function getSegmentColors(position: number, segments: { value: number; color: string }[] | undefined, fallbackColor: string) {
  if (!segments?.length) return { color: fallbackColor, nextColor: fallbackColor };
  const positiveSegments = segments.filter((segment) => segment.value > 0);
  const total = positiveSegments.reduce((sum, segment) => sum + segment.value, 0);
  if (total <= 0) return { color: fallbackColor, nextColor: fallbackColor };

  let accumulated = 0;
  for (const [index, segment] of positiveSegments.entries()) {
    accumulated += segment.value / total;
    if (position <= accumulated || index === positiveSegments.length - 1) {
      return {
        color: segment.color,
        nextColor: positiveSegments[(index + 1) % positiveSegments.length].color,
      };
    }
  }
  return { color: fallbackColor, nextColor: fallbackColor };
}

function pointsForRow(
  count: number,
  radius: number,
  progress: number,
  color: string,
  row: string,
  interactionActive: boolean,
  segments?: { value: number; color: string }[],
) {
  return Array.from({ length: count }, (_, index) => {
    const progressPosition = count === 1 ? 0 : index / (count - 1);
    const angle = (ARC_START + ARC_SWEEP * progressPosition) * Math.PI / 180;
    const isActive = interactionActive || (progress > 0 && progressPosition <= progress);
    const waveStagger = interactionActive ? 12 : 76;
    const { color: dotColor, nextColor } = getSegmentColors(progressPosition, segments, color);
    return (
      <circle
        key={`${row}-${index}`}
        cx={CENTER + radius * Math.cos(angle)}
        cy={CENTER + radius * Math.sin(angle)}
        r={DOT_RADIUS}
        fill={isActive ? dotColor : '#DDE6DA'}
        className={isActive ? `parliament-dot-active${interactionActive ? ' parliament-dot-hover' : ''}` : undefined}
        style={isActive ? {
          animationDelay: `${index * waveStagger}ms`,
          animationDuration: interactionActive ? '300ms' : '2.6s',
          '--dot-color': dotColor,
          '--dot-next-color': interactionActive ? nextColor : dotColor,
        } as React.CSSProperties : undefined}
      />
    );
  });
}

export const ParliamentChart: React.FC<ParliamentChartProps> = ({
  percentage,
  ariaLabel,
  activeColor = '#52F229',
  segments,
  children,
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
    <div className="relative z-0 -mb-32 mx-auto aspect-square w-full max-w-[30rem]">
      <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90" role="img" aria-label={ariaLabel}>
        {DOT_ROWS.flatMap(({ name, count, radius }) =>
          pointsForRow(count, radius, progress, activeColor, name, interactionActive, segments)
        )}
      </svg>
      <div className="absolute inset-0 z-20 flex items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
};
