import { useGlobalSettings } from '../context/GlobalSettings'
import { useDecimalInput } from '../components/DecimalInput'
import { RotateCcw } from 'lucide-react'

export default function Settings() {
  const { settings, updateSettings, resetSettings } = useGlobalSettings()

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">全局参数设置</h2>
        <button
          onClick={resetSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          恢复默认
        </button>
      </div>

      <p className="text-sm text-gray-500">设置全局默认值后，各计算模块会自动沿用这些参数。进入具体模块后仍可单独调整。</p>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
        <div className="space-y-4">
          <SettingRow
            label="默认平台费率"
            value={settings.defaultPlatformFeeRate}
            onChange={v => updateSettings({ defaultPlatformFeeRate: v })}
            unit="%"
            hint="拼多多实物类目基础技术服务费率为 0.6%"
            multiplier={100}
          />
          <SettingRow
            label="默认退货率"
            value={settings.defaultReturnRate}
            onChange={v => updateSettings({ defaultReturnRate: v })}
            unit="%"
            hint="行业参考值 15%~30%，建议填入店铺近30天真实数据"
            multiplier={100}
          />
          <SettingRow
            label="默认杂费费率"
            value={settings.defaultMiscFeeRate}
            onChange={v => updateSettings({ defaultMiscFeeRate: v })}
            unit="%"
            hint="含人工、包装、仓储、运费险等，行业参考值 5%~10%"
            multiplier={100}
          />
          <SettingRow
            label="默认快递费"
            value={settings.defaultShippingFee}
            onChange={v => updateSettings({ defaultShippingFee: v })}
            unit="元/件"
            hint="建议填入与快递公司的签约价格"
            multiplier={1}
          />
          <SettingRow
            label="默认损耗系数"
            value={settings.defaultLossFactor}
            onChange={v => updateSettings({ defaultLossFactor: v })}
            unit=""
            hint="退货导致的额外损耗比例，含退回运费、包装损耗、二次折价"
            multiplier={1}
          />
        </div>
      </div>

      <div className="bg-orange-50 rounded-xl border border-orange-100 p-4 text-sm text-orange-700">
        <p className="font-medium mb-1">参数口径说明</p>
        <ul className="space-y-1 text-xs">
          <li>平台费率 = 技术服务费（0.6%）+ 活动额外服务费（按活动类别叠加）</li>
          <li>退货率 = 近30天退货件数 ÷ 总发货件数，建议每月更新</li>
          <li>杂费费率涵盖所有非平台类间接成本，新商家建议按 5%~10% 估算</li>
          <li>所有参数在各计算模块中均可单独覆盖，不受全局设置锁定</li>
        </ul>
      </div>
    </div>
  )
}

function SettingRow({ label, value, onChange, unit, hint, multiplier }: {
  label: string; value: number; onChange: (v: number) => void; unit: string; hint: string; multiplier: number
}) {
  const displayValue = +(value * multiplier).toFixed(multiplier === 100 ? 2 : 2)
  const { text, handle } = useDecimalInput(displayValue, (v) => onChange(v / multiplier))
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b border-gray-50">
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <input type="text" inputMode="decimal" value={text}
          onChange={e => handle(e.target.value)}
          className="w-20 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
        />
        {unit && <span className="text-xs text-gray-500 w-8">{unit}</span>}
      </div>
    </div>
  )
}