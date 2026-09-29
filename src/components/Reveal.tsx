import type { CSSProperties, ReactNode } from 'react';
import { useReveal } from '../hooks/useReveal';

interface Props {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li';
  style?: CSSProperties;
}

export default function Reveal({ children, delay = 0, className = '', as = 'div', style }: Props) {
  const ref = useReveal<HTMLDivElement>();
  const Tag = as as any;
  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}
