import { useState, useEffect, useRef } from 'react'
import { HelpCircle } from 'lucide-react'

export function useDecimalInput(value: number, onChange: (v: number) => void) {
  const [text, setText] = useState(value === 0 ? '' : String(value))
  const prevRef = useRef(value)

  useEffect(() => {
    if (value !== prevRef.current) {
      prevRef.current = value
      setText(value === 0 ? '' : String(value))
    }
  }, [value])

  const handle = (raw: string) => {
    setText(raw)
    if (raw === '' || raw === '-' || raw === '.') { onChange(0); return }
    if (/^\d+\.$/.test(raw)) return
    if (/^-?\d+\.?\d*$/.test(raw)) {
      const n = parseFloat(raw)
      if (!isNaN(n)) onChange(n)
    }
  }
  return { text, handle }
}

export function DecimalInput({ label, value, onChange, suffix, hint, className = '' }: {
  label: string; value: number; onChange: (v: number) => void; suffix?: string; hint?: string; className?: string
}) {
  const { text, handle } = useDecimalInput(value, onChange)
  return (
    <div className={`flex-1 min-w-0 ${className}`}>
      <label className="block text-[11px] text-gray-500 mb-0.5 font-medium">
        {label}
        {hint && (
          <span className="ml-1 text-gray-300 cursor-help" title={hint}>
            <HelpCircle className="w-2.5 h-2.5 inline" />
          </span>
        )}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onChange={e => handle(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
        />
        {suffix && text !== '' && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">{suffix}</span>
        )}
      </div>
    </div>
  )
}

export function DecimalInputSm({ label, value, onChange, suffix }: {
  label: string; value: number; onChange: (v: number) => void; suffix?: string
}) {
  const { text, handle } = useDecimalInput(value, onChange)
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-400">{label}</span>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onChange={e => handle(e.target.value)}
          className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-200"
        />
        {suffix && text !== '' && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400">{suffix}</span>
        )}
      </div>
    </div>
  )
}