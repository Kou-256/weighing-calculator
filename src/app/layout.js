import './globals.css'
import { Noto_Sans_JP } from 'next/font/google'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
  preload: false,
  fallback: ['Yu Gothic', 'Meiryo', 'sans-serif'],
})

export const metadata = {
  metadataBase: new URL('https://weighing-calculator.vercel.app'),
  title: 'YVO₄ / GdVO₄ 秤量計算ツール',
  description: 'YVO₄ / GdVO₄合成用の秤量計算・記録ツール',
  applicationName: 'YVO₄ / GdVO₄ 秤量計算ツール',
  creator: 'YVO₄ / GdVO₄ 秤量計算ツール',
  publisher: 'YVO₄ / GdVO₄ 秤量計算ツール',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: '/yvo4-gdvo4',
    siteName: 'YVO₄ / GdVO₄ 秤量計算ツール',
    title: 'YVO₄ / GdVO₄ 秤量計算ツール',
    description: '小数桁数とセット数を自由に設定できるYVO₄ / GdVO₄合成用の秤量計算ツール',
    images: [{ url: '/yvo4_gdvo4_weighing_icon_preview.png', width: 512, height: 512, alt: 'YVO₄ / GdVO₄ 秤量計算ツール' }],
  },
  twitter: {
    card: 'summary',
    title: 'YVO₄ / GdVO₄ 秤量計算ツール',
    description: '小数桁数とセット数を自由に設定できるYVO₄ / GdVO₄合成用の秤量計算ツール',
    images: ['/yvo4_gdvo4_weighing_icon_preview.png'],
  },
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/yvo4_gdvo4_weighing_icon.svg', type: 'image/svg+xml' },
      { url: '/yvo4_gdvo4_weighing_icon_preview.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/yvo4_gdvo4_weighing_icon.svg',
    apple: [
      { url: '/yvo4_gdvo4_weighing_icon_preview.png', type: 'image/png', sizes: '512x512' },
    ],
  },
  appleWebApp: {
    capable: true,
    title: 'Weighing Calculator',
    statusBarStyle: 'default',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja" dir="ltr" className={notoSansJP.variable}>
      <body>{children}</body>
    </html>
  )
}
