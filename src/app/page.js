import Link from 'next/link'

const calculators = [
  {
    title: 'YVO₄ / GdVO₄',
    subtitle: 'クエン酸錯体重合法向けの秤量計算',
    href: '/yvo4-gdvo4',
    status: '利用可能',
    materials: ['Y₂O₃', 'Gd₂O₃', 'V₂O₅'],
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-[#1d1d1f] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-[28px] border border-white/80 bg-white/85 px-5 py-7 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur sm:px-8 sm:py-9">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6e6e73]">
            Weighing calculator
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                秤量計算ツール
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#6e6e73]">
                合成したい物質を選ぶと、対応する秤量計算画面を開けます。
              </p>
              <p className="mt-3 text-sm font-semibold text-[#6e6e73]">
                Created by Kou Hashizume
              </p>
            </div>
            <div className="rounded-2xl border border-[#d2d2d7] bg-[#fbfbfd] px-4 py-3">
              <div className="text-sm font-medium text-[#6e6e73]">現在の対応数</div>
              <div className="mt-1 text-3xl font-semibold">{calculators.length}</div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <Link href="/lab-notebook" className="rounded-[24px] border border-border-button-default bg-background-primary-default p-5 shadow-sm transition hover:border-accent-600">
            <span className="text-caption-1-semibold text-accent-600">実験ノート・マニュアル</span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">YVO₄ 作製ノート →</h2>
            <p className="mt-2 text-sm leading-6 text-[#6e6e73]">試料別の手順、予定時刻、写真と観察記録。装置の使い方も確認できます。</p>
          </Link>
          {calculators.map((calculator) => (
            <Link
              key={calculator.href}
              href={calculator.href}
              className="group rounded-[24px] border border-border-button-default bg-background-primary-default p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent-600 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-border-focus-ring"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex rounded-full bg-background-secondary-default px-3 py-1 text-caption-1-semibold text-accent-600">
                    {calculator.status}
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                    {calculator.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
                    {calculator.subtitle}
                  </p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-button-default bg-background-secondary-default text-title-3-semibold text-accent-600 transition group-hover:border-accent-600 group-hover:bg-button-ghost-disabled">
                  →
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {calculator.materials.map((material) => (
                  <span
                    key={material}
                    className="rounded-full border border-[#d2d2d7] bg-[#fbfbfd] px-3 py-1 text-xs font-semibold text-[#424245]"
                  >
                    {material}
                  </span>
                ))}
              </div>
            </Link>
          ))}

          <div className="rounded-[24px] border border-dashed border-[#c7c7cc] bg-white/70 p-5 text-[#6e6e73]">
            <div className="inline-flex rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-semibold">
              追加予定
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#424245]">
              新しい物質
            </h2>
            <p className="mt-2 text-sm leading-6">
              今後追加する計算ツールはここに並びます。
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
