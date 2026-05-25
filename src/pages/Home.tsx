import { Link } from 'react-router-dom'
import { TrendingUp, Tags, BarChart3, Calculator, Target, Layers, Zap, ShieldCheck, Rocket, Store } from 'lucide-react'

const modules = [
  {
    to: '/roi',
    icon: TrendingUp,
    title: '保本投产比',
    desc: '计算推广投放的最低投产底线，支持多SKU加权核算',
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
  },
  {
    to: '/pricing',
    icon: Tags,
    title: '商品定价',
    desc: '成本加成与竞争导向双模式，反推合理售价区间',
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
  },
  {
    to: '/profit',
    icon: BarChart3,
    title: '利润分析',
    desc: '全维度穿透核算真实净利润，分项展示成本构成',
    gradient: 'from-violet-500 to-purple-500',
    bg: 'bg-violet-50',
    text: 'text-violet-600',
  },
  {
    to: '/ad-roi',
    icon: Calculator,
    title: '广告ROI',
    desc: '平台口径 vs 真实口径，多计划横向对比输出优化建议',
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
  },
  {
    to: '/strategy',
    icon: Target,
    title: '比价策略',
    desc: '模拟比价算法、分析竞品分布，生成虚高价策略方案',
    gradient: 'from-rose-500 to-pink-500',
    bg: 'bg-rose-50',
    text: 'text-rose-600',
  },
  {
    to: '/listing-roi',
    icon: Layers,
    title: '链接投产',
    desc: '7步实战计算法 + 批量导入，识别明星/拖后腿SKU',
    gradient: 'from-indigo-500 to-blue-500',
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
  },
  {
    to: '/shop-overview',
    icon: Store,
    title: '店铺总览',
    desc: '聚合所有链接快照数据，一屏掌握店铺全局盈亏',
    gradient: 'from-teal-500 to-cyan-500',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
  },
]

const highlights = [
  { icon: Zap, title: '实时计算', desc: '输入即输出，毫秒级响应' },
  { icon: ShieldCheck, title: '隐私安全', desc: '纯本地计算，数据不上传' },
  { icon: Rocket, title: '运营实战', desc: '基于真实商家经验提炼' },
]

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-card">
      {/* Hero */}
      <div className="text-center py-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium mb-4">
          <Rocket className="w-3 h-3" />
          V2.0 · 全新7步计算法
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          拼多多商家运营计算器
        </h1>
        <p className="mt-3 text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
          一站式运营决策工具，覆盖定价、投产、利润、比价等核心场景
        </p>
      </div>

      {/* 功能卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(m => (
          <Link
            key={m.to}
            to={m.to}
            className="group block p-5 bg-white rounded-2xl border border-gray-100 hover:shadow-lg hover:border-transparent hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${m.gradient} mb-4 shadow-sm`}>
              <m.icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1.5 group-hover:text-indigo-600 transition-colors">
              {m.title}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{m.desc}</p>
          </Link>
        ))}
      </div>

      {/* 亮点 */}
      <div className="grid grid-cols-3 gap-4">
        {highlights.map(h => (
          <div key={h.title} className="text-center p-4 bg-white/60 rounded-xl border border-gray-100">
            <h.icon className="w-5 h-5 mx-auto text-indigo-400 mb-2" />
            <h4 className="text-sm font-medium text-gray-700">{h.title}</h4>
            <p className="text-xs text-gray-400 mt-0.5">{h.desc}</p>
          </div>
        ))}
      </div>

      {/* 快速上手 */}
      <div className="bg-gradient-to-r from-indigo-50 via-white to-violet-50 rounded-2xl p-6 border border-indigo-100">
        <h3 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          快速上手
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { step: '01', text: '全局设置中配置默认参数' },
            { step: '02', text: '选择计算模块填入数据' },
            { step: '03', text: '实时查看计算结果与图表' },
            { step: '04', text: '数据自动保存本地浏览器' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-2">
              <span className="text-xs font-bold text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded">{s.step}</span>
              <span className="text-sm text-gray-600">{s.text}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 pb-4">
        V2.0 · 适配拼多多商家后台 · 仅供运营参考，实际决策请结合店铺数据
      </p>
    </div>
  )
}