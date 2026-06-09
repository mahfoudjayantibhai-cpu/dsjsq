// ==================== 核心计算类型 ====================

/** 多SKU商品条目 */
export interface SkuItem {
  id: string;
  name: string;
  price: number;       // 售价(元)
  cost: number;         // 采购成本(元)
  shipping: number;     // 单件快递费(元)
  salesRatio: number;   // 销售占比 (0~100)
}

/** 保本投产比输入参数 */
export interface BaoBenROIInput {
  mode: 'single' | 'multi';
  // 单SKU
  price: number;
  cost: number;
  shipping: number;
  // 多SKU
  skus: SkuItem[];
  // 全局
  returnRate: number;     // 退货率 (0~1, 如0.2表示20%)
  platformFeeRate: number;// 平台费率 (0~1, 如0.006表示0.6%)
  miscFeeRate: number;    // 杂费费率 (0~1)
  actualROI?: number;     // 当前实际投产比(可选,用于风险提示)
}

/** 保本投产比计算结果 */
export interface BaoBenROIResult {
  unitProfit: number;
  grossMargin: number;
  baseROI: number;
  realROI: number;
  // 多SKU
  weightedGrossMargin?: number;
  weightedBaseROI?: number;
  // 风险
  riskStatus: 'profit' | 'break_even' | 'loss';
  estimatedLoss?: number;
}

// ==================== 商品定价类型 ====================

export type PricingMode = 'cost_plus' | 'competitive';

export interface PricingInput {
  mode: PricingMode;
  cost: number;
  shipping: number;
  targetMargin: number;
  targetPrice: number;
  returnRate: number;
  platformFeeRate: number;
  miscFeeRate: number;
}

export interface PricingResult {
  suggestedPrice: number;
  breakevenPrice: number;
  maxCost: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  correspondingROI: number;
}

// ==================== 利润分析类型 ====================

export type ProfitLevel = 'sku' | 'link' | 'shop';

export interface ProfitInput {
  level: ProfitLevel;
  gmv: number;
  refundAmount: number;
  discountAmount: number;
  unitCost: number;
  salesVolume: number;
  shippedVolume: number;
  shippingFee: number;
  platformFeeRate: number;
  adSpend: number;
  returnRate: number;
  lossFactor: number;
  monthlyFixedCost?: number;
  linkSalesRatio?: number;
  miscFeeRate: number;
}

export interface ProfitResult {
  effectiveSales: number;
  directCost: number;
  grossProfit: number;
  grossMargin: number;
  platformFee: number;
  adFee: number;
  returnLoss: number;
  fixedCostShare: number;
  miscFee: number;
  netProfit: number;
  netMargin: number;
  costBreakdown: CostBreakdownItem[];
}

export interface CostBreakdownItem {
  name: string;
  amount: number;
  ratio: number;
}

// ==================== 广告ROI类型 ====================

export interface AdPlan {
  id: string;
  name: string;
  adGMV: number;
  adSpend: number;
}

export interface AdROIInput {
  plans: AdPlan[];
  returnRate: number;
  platformFeeRate: number;
  breakevenROI: number;
}

export interface AdROISingleResult {
  platformROI: number;
  realROI: number;
  status: 'profit' | 'break_even' | 'loss';
  lossAmount: number;
  adRatio: number;
  suggestion: string;
}

export interface AdROIResult {
  plans: (AdPlan & AdROISingleResult)[];
  weightedAvgROI: number;
}

// ==================== 比价分析类型 ====================

export interface CompetitorPrice {
  id: string;
  name: string;
  price: number;
}

export interface PriceCompareInput {
  myPrice: number;
  myCost: number;
  competitors: CompetitorPrice[];
  platformFeeRate: number;
  returnRate: number;
}

export interface PriceFlag {
  type: 'low_price_warning' | 'low_price_bonus' | 'high_price_warning' | 'optimal';
  message: string;
}

export interface PriceCompareResult {
  competitivenessScore: number;
  rank: number;
  totalCount: number;
  percentile: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  quartile25: number;
  quartile75: number;
  optimalPriceLow: number;
  optimalPriceHigh: number;
  trafficMultiplier: number;
  flags: PriceFlag[];
  suggestion: string;
}

// ==================== 虚高价策略类型 ====================

export type StrategyType = 'flash_sale' | 'limited_coupon' | 'tiered_coupon';
export type Aggressiveness = 'conservative' | 'moderate' | 'aggressive';

export interface InflatedPriceInput {
  targetRealPrice: number;
  cost: number;
  strategyType: StrategyType;
  aggressiveness: Aggressiveness;
  returnRate: number;
  platformFeeRate: number;
  miscFeeRate: number;
}

export interface FlashSaleConfig {
  discountPercent: number;
  suggestedDuration: string;
  suggestedStartTime: string;
}

export interface LimitedCouponConfig {
  faceValue: number;
  quantity: number;
  minOrderAmount: number;
}

export interface TieredCouponConfig {
  tiers: { threshold: number; discount: number }[];
}

export interface InflatedPriceResult {
  nominalPrice: number;
  discountRate: number;
  discountAmount: number;
  effectiveFinalPrice: number;
  flashSaleConfig?: FlashSaleConfig;
  limitedCouponConfig?: LimitedCouponConfig;
  tieredCouponConfig?: TieredCouponConfig;
  profitPerOrder: number;
  marginRate: number;
  breakevenROI: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskWarnings: string[];
  perceivedDiscount: number;
  conversionBoost: number;
}

// ==================== 全局设置类型 ====================

export interface GlobalSettings {
  defaultPlatformFeeRate: number;
  defaultReturnRate: number;
  defaultMiscFeeRate: number;
  defaultShippingFee: number;
  defaultLossFactor: number;
}

// ==================== 多规格链接投产计算（7步法 + 5项成本拆解） ====================

/** 单SKU成本拆解：进货价+快递+包装+赠品+损耗 */
export interface SkuCostBreakdown {
  purchasePrice: number;   // 进货价/代发价
  shipping: number;         // 快递费
  packaging: number;        // 包装耗材
  giftCost: number;         // 赠品成本
  lossCost: number;         // 损耗平摊（退货损耗+仓储损耗）
}

export interface ListingSku {
  id: string;
  name: string;
  price: number;            // 售价
  costBreakdown: SkuCostBreakdown;
  plannedRatio: number;     // 计划销售占比（%）
  actualRatio: number;      // 真实销售占比（%）
  monthlySales: number;     // 月销售件数
  adSpend: number;          // 广告花费
}

export interface ListingROIInput {
  linkName: string;
  skus: ListingSku[];
  returnRate: number;       // 退货率（%）
  platformFeeRate: number;  // 平台费率（%）
  miscFeeRate: number;      // 杂费费率（%）
  monthlyFixedCost: number; // 月固定成本
}

export interface ListingSkuResult {
  id: string;
  name: string;
  /** 5项成本明细 */
  costDetail: SkuCostBreakdown;
  totalCost: number;        // 单件总成本
  unitProfit: number;       // 单件毛利
  unitMargin: number;       // 毛利率
  plannedRatio: number;
  actualRatio: number;
  totalRevenueActual: number;    // 按真实占比的收入
  totalProfitActual: number;     // 按真实占比的利润
  salesWeight: number;           // 真实销售权重
  profitContribution: number;    // 利润贡献度
  /** 分SKU单独保本投产比 */
  skuBreakevenROI: number;
  /** 诊断评级 */
  status: 'star' | 'normal' | 'drag';
  suggestion: string;
}

export interface ListingROIResult {
  /** 7步法中间数据 */
  step1_skuCosts: { name: string; total: number }[];
  step2_weightedMargin: number;
  step3_basicROI: number;
  step4_realROI: number;
  step5_skuBreakevens: { name: string; roi: number; status: string }[];
  /** 汇总 */
  totalSales: number;
  totalGMV: number;
  totalAdSpend: number;
  totalCost: number;
  totalProfit: number;
  netMargin: number;
  weightedAvgPrice: number;
  weightedAvgCost: number;
  breakevenROI: number;
  actualROI: number;
  skuResults: ListingSkuResult[];
  bestSku: string;
  worstSku: string;
  summary: string;
  /** 动态调整提醒 */
  adjustments: string[];
}

// ==================== 历史记录类型 ====================

export interface CalculationHistory {
  id: number;
  user_id: number;
  calc_type: string;
  input_data: string;   // JSON string
  result_data: string;  // JSON string
  created_at: string;
}

export const CALC_TYPE_LABELS: Record<string, string> = {
  'roi': '保本投产比',
  'pricing': '商品定价',
  'profit': '利润分析',
  'ad-roi': '广告ROI',
  'strategy': '比价策略',
  'listing-roi': '链接投产',
}

export const CALC_TYPE_ROUTES: Record<string, string> = {
  'roi': '/roi',
  'pricing': '/pricing',
  'profit': '/profit',
  'ad-roi': '/ad-roi',
  'strategy': '/strategy',
  'listing-roi': '/listing-roi',
}