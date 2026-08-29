/**
 * 라인 아이콘 시스템 (Lucide 스타일 단일 계열, stroke 1.75).
 *
 * 원칙
 *  - 아이콘 라이브러리를 섞지 않는다. 이 파일 하나만 사용한다.
 *  - emoji 를 UI 아이콘으로 쓰지 않는다.
 *  - 문항 선택지에는 의미를 암시하는 아이콘을 쓰지 않는다.
 *    (선택 표시용 Check 만 양쪽 동일하게 사용)
 */
type P = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true
});

export const Check = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const ArrowLeft = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
);

export const ArrowRight = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export const Sparkles = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M12 8.5 13.2 11l2.5 1-2.5 1-1.2 2.5L10.8 13l-2.5-1 2.5-1z" />
  </svg>
);

export const Briefcase = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </svg>
);

export const Users = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
  </svg>
);

export const Compass = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5.5-5.5 2 2-5.5z" />
  </svg>
);

export const TrendingUp = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </svg>
);

export const RefreshCw = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
    <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
    <path d="M3 21v-5h5M21 3v5h-5" />
  </svg>
);

export const MessageCircle = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.8-.9L3 20.5l1.5-4.4A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z" />
  </svg>
);

export const Layers = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
);

export const Scale = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 4v16M6 8h12" />
    <path d="M6 8 3 15h6zM18 8l-3 7h6z" />
  </svg>
);

export const AlertCircle = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16h.01" />
  </svg>
);

export const FileText = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </svg>
);

export const Shield = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3 5 6v6c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6z" />
  </svg>
);

export const Trash = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M10 11v6M14 11v6" />
    <path d="M6 7l1 13h10l1-13M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

export const Clock = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const ListChecks = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 6.5 4.5 8 7 5" />
    <path d="M3 17.5 4.5 19 7 16" />
    <path d="M11 6.5h10M11 17.5h10" />
  </svg>
);
