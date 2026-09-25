import type { SVGProps } from 'react'

/** 山野咖啡品牌标识：自绘 SVG（山形 + 咖啡杯），不依赖外部图片 */
export function BrandLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect width="40" height="40" rx="10" fill="currentColor" fillOpacity="0.12" />
      <path
        d="M8 26.5L15.5 15l5 6.5L23 17l9 9.5H8z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M13 30.5h14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="26.5" cy="12" r="2.6" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

/** 小号标记（用于顶栏等紧凑场景） */
export function BrandMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M3 16.5L8.5 8l4 5L15 9.5l6 7H3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="17" cy="6.5" r="1.8" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
