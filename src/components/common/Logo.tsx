/**
 * Logo Component
 * StudyStudio brand logo with icon and text
 */

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: "text-sm" },
    md: { icon: 36, text: "text-lg" },
    lg: { icon: 48, text: "text-2xl" }
  };

  const { icon, text } = sizes[size];

  return (
    <div className={`flex items-center gap-2 whitespace-nowrap ${className}`}>
      <svg width={icon} height={icon} viewBox="0 0 64 64" aria-label="StudyStudio Logo">
        <path d="M32 6L2 20L32 34L62 20L32 6Z" fill="#F97316" />
        <path d="M12 26V38C12 45 20 50 32 50C44 50 52 45 52 38V26L32 36L12 26Z" fill="#FB923C" />
      </svg>

      {showText && <span className={`font-bold ${text} text-orange-500`}>Study Studio</span>}
    </div>
  );
}
