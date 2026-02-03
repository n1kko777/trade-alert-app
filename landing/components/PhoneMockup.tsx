export default function PhoneMockup() {
  return (
    <div className="relative w-[280px] h-[580px] mx-auto">
      {/* Phone Frame */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900 rounded-[3rem] shadow-2xl border-4 border-gray-700">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl" />

        {/* Screen */}
        <div className="absolute top-2 left-2 right-2 bottom-2 bg-background rounded-[2.5rem] overflow-hidden">
          {/* App Content Preview */}
          <div className="p-4 pt-8">
            {/* Status bar placeholder */}
            <div className="flex justify-between items-center mb-6 px-2">
              <span className="text-xs text-text-muted">9:41</span>
              <div className="flex gap-1">
                <span className="text-xs text-text-muted">📶</span>
                <span className="text-xs text-text-muted">🔋</span>
              </div>
            </div>

            {/* Alert cards */}
            <div className="space-y-3">
              <AlertCard
                symbol="BTC"
                change="+5.2%"
                isUp={true}
                delay={0}
              />
              <AlertCard
                symbol="ETH"
                change="-3.8%"
                isUp={false}
                delay={0.5}
              />
              <AlertCard
                symbol="SOL"
                change="+12.4%"
                isUp={true}
                delay={1}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Glow effect */}
      <div className="absolute -inset-4 bg-accent/20 rounded-[4rem] blur-3xl -z-10 animate-pulse-slow" />
    </div>
  )
}

function AlertCard({
  symbol,
  change,
  isUp,
  delay
}: {
  symbol: string
  change: string
  isUp: boolean
  delay: number
}) {
  return (
    <div
      className="bg-card rounded-xl p-3 border border-border animate-pulse"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-accent">{symbol.slice(0, 2)}</span>
          </div>
          <div>
            <div className="font-semibold text-sm text-text-primary">{symbol}/USDT</div>
            <div className="text-xs text-text-muted">Bybit Spot</div>
          </div>
        </div>
        <div className={`font-bold text-sm ${isUp ? 'text-success' : 'text-error'}`}>
          {change}
        </div>
      </div>
    </div>
  )
}
