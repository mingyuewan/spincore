export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.35em] text-amber-300/80">SPINCORE P0.5</p>
          <h1 className="text-3xl font-black tracking-wide text-white md:text-4xl">旋核对战 SpinCore</h1>
        </div>
        <p className="max-w-sm text-right text-xs text-slate-400">卡通金属竞技场 · 零件全部来自配置表</p>
      </header>
      {children}
    </div>
  )
}
