import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const pagesBasePath = process.env.NEXT_PUBLIC_GITHUB_PAGES_BASE_PATH
const publicAsset = (path: string) => `${pagesBasePath ?? ''}/${path}`

export const metadata: Metadata = {
  title: 'سبيك ويل | التدريب على التحدث',
  description: 'تدرّب على عرضك التقديمي أو مقابلتك القادمة مع سبيك ويل.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: publicAsset('icon-light-32x32.png'),
        media: '(prefers-color-scheme: light)',
      },
      {
        url: publicAsset('icon-dark-32x32.png'),
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: publicAsset('icon.svg'),
        type: 'image/svg+xml',
      },
    ],
    apple: publicAsset('apple-icon.png'),
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#10213c',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && pagesBasePath === undefined && <Analytics />}
      </body>
    </html>
  )
}
