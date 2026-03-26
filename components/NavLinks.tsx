'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="7" height="7" rx="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/analysis',
    label: 'Analysis',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 14l4-4 3 3 4-5 3 2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 17h14" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/brands',
    label: 'Brands',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" strokeLinejoin="round" />
        <path d="M7 18v-6h6v6" strokeLinejoin="round" />
      </svg>
    ),
  },
]

const adminLink = {
  href: '/admin',
  label: 'Admin',
  icon: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" strokeLinecap="round" />
    </svg>
  ),
}

export default function NavLinks({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const allLinks = isAdmin ? [...links, adminLink] : links

  return (
    <nav className="flex items-stretch h-full gap-0.5">
      {allLinks.map(({ href, label, icon }) => {
        const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex items-center gap-2 px-3.5 text-[13px] font-medium transition-all duration-150 ${
              active
                ? 'text-violet-700 dark:text-violet-300'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <span className={`transition-colors ${active ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400 dark:text-zinc-600'}`}>
              {icon}
            </span>
            {label}
            {active && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-violet-600 dark:bg-violet-400 rounded-t-full" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
