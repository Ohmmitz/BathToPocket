import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  className = '',
  prefix = '',
  suffix = '',
  minimumFractionDigits = 0,
  maximumFractionDigits = 2,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const currentValueRef = useRef(0);

  useEffect(() => {
    const startValue = currentValueRef.current;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || startValue === value) {
      currentValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    const duration = 720;
    let animationFrame = 0;
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + (value - startValue) * easedProgress;
      currentValueRef.current = nextValue;
      setDisplayValue(nextValue);
      if (progress < 1) animationFrame = window.requestAnimationFrame(animate);
      else {
        currentValueRef.current = value;
        setDisplayValue(value);
      }
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [value]);

  const formatNumber = (number: number) => new Intl.NumberFormat('th-TH', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(number);

  return (
    <span className={className} aria-label={`${prefix}${formatNumber(value)}${suffix}`}>
      {prefix}{formatNumber(displayValue)}{suffix}
    </span>
  );
};
