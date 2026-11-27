import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import '@fontsource/aref-ruqaa/arabic-700.css'
import '@fontsource/ibm-plex-sans-arabic/400.css'
import '@fontsource/ibm-plex-sans-arabic/500.css'
import '@fontsource/ibm-plex-sans-arabic/600.css'
import './globals.css'

const pagesBasePath = process.env.NEXT_PUBLIC_GITHUB_PAGES_BASE_PATH
const publicAsset = (path: string) => `${pagesBasePath ?? ''}/${path}`

export const metadata: Metadata = {
  title: 'طليق | التدريب على التحدث',
  description: 'تدرّب على عرضك التقديمي أو مقابلتك القادمة مع طليق.',
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
  themeColor: '#17283f',
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
