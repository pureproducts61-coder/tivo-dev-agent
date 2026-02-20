import { Heart } from 'lucide-react';

interface BrandLogoProps {
  size?: number;
  className?: string;
}

export const BrandLogo = ({ size = 24, className = '' }: BrandLogoProps) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={0} height={0}>
        <defs>
          <linearGradient id="brand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(145, 80%, 45%)" />
            <stop offset="100%" stopColor="hsl(210, 90%, 55%)" />
          </linearGradient>
        </defs>
      </svg>
      <Heart
        size={size}
        fill="url(#brand-gradient)"
        stroke="url(#brand-gradient)"
        className="drop-shadow-[0_0_8px_hsla(175,80%,50%,0.4)]"
      />
    </div>
  );
};
