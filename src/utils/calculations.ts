import type {
  BaoBenROIInput, BaoBenROIResult,
  PricingInput, PricingResult,
  ProfitInput, ProfitResult,
  AdROIInput, AdROIResult, AdROISingleResult,
  CostBreakdownItem, AdPlan,
  PriceCompareInput, PriceCompareResult, PriceFlag,
  InflatedPriceInput, InflatedPriceResult,
  FlashSaleConfig, LimitedCouponConfig, TieredCouponConfig,
  ListingROIInput, ListingROIResult, ListingSkuResult,
} from '../types';

// ==================== 通用工具 ====================

function r2(v: number, decimals = 2): number {
  return Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function pct(v: number): number {
  return r2(v * 100);
}

// ==================== 功能1：保本投产比 ====================

export function calcBaoBenROI(input: BaoBenROIInput): BaoBenROIResult {
  const { mode, price, cost, shipping, skus, returnRate, platformFeeRate, miscFeeRate, actualROI } = input;

  let grossMargin: number;
  let unitProfit: number;
  let weightedGrossMargin: number | undefined;

  if (mode === 'single') {
    unitProfit = price - cost - shipping;
    grossMargin = unitProfit / price;
  } else {
    // 多SKU加权
    unitProfit = 0;
    weightedGrossMargin = 0;
    for (const sku of skus) {
      const skuProfit = sku.price - sku.cost - sku.shipping;
      const skuMargin = skuProfit / sku.price;
      weightedGrossMargin += skuMargin * (sku.salesRatio / 100);
      unitProfit += skuProfit * (sku.salesRatio / 100);
    }
    grossMargin = weightedGrossMargin;
  }

  if (grossMargin <= 0) {
    return {
      unitProfit: r2(unitProfit),
      grossMargin: pct(grossMargin),
      baseROI: 0,
      realROI: 0,
      weightedGrossMargin: weightedGrossMargin !== undefined ? pct(weightedGrossMargin) : undefined,
      riskStatus: 'loss',
      estimatedLoss: 999999,
    };
  }

  const baseROI = 1 / grossMargin;
  const deduction = 1 - returnRate - platformFeeRate - miscFeeRate;
  const realROI = deduction > 0 ? baseROI / deduction : 999999;

  // 风险判断
  let riskStatus: 'profit' | 'break_even' | 'loss' = 'break_even';
  let estimatedLoss: number | undefined;
  if (actualROI !== undefined && actualROI > 0) {
    if (actualROI >= realROI * 1.01) riskStatus = 'profit';
    else if (actualROI >= realROI * 0.99) riskStatus = 'break_even';
    else {
      riskStatus = 'loss';
      estimatedLoss = r2((realROI - actualROI) * (actualROI > 0 ? 100 / actualROI : 0));
    }
  }

  return {
    unitProfit: r2(unitProfit),
    grossMargin: pct(grossMargin),
    baseROI: r2(baseROI),
    realROI: r2(realROI),
    weightedGrossMargin: weightedGrossMargin !== undefined ? pct(weightedGrossMargin) : undefined,
    weightedBaseROI: weightedGrossMargin !== undefined ? r2(1 / weightedGrossMargin * 100) : undefined,
    riskStatus,
    estimatedLoss,
  };
}

// ==================== 功能2：商品定价 ====================

export function calcPricing(input: PricingInput): PricingResult {
  const { mode, cost, shipping, targetMargin, targetPrice, returnRate, platformFeeRate, miscFeeRate } = input;

  // 综合成本
  const totalCost = cost + shipping + cost * miscFeeRate;
  const deduction = 1 - targetMargin / 100 - platformFeeRate - returnRate * (targetMargin / 100);

  let suggestedPrice: number;
  let maxCost: number;

  if (mode === 'cost_plus') {
    suggestedPrice = deduction > 0 ? totalCost / deduction : 999999;
  } else {
    suggestedPrice = targetPrice;
  }

  // 保本售价
  const breakevenDeduction = 1 - platformFeeRate - returnRate * 0.05;
  const breakevenPrice = breakevenDeduction > 0 ? totalCost / breakevenDeduction : 999999;

  // 竞争导向：反推可承受最大采购成本
  maxCost = targetPrice * (1 - platformFeeRate - returnRate * 0.5) - shipping - targetPrice * miscFeeRate;

  // 售价区间
  const priceRangeLow = breakevenPrice;
  const priceRangeHigh = deduction > 0 ? totalCost / deduction : breakevenPrice * 1.3;

  // 对应保本投产比
  const unitProfit = suggestedPrice - cost - shipping;
  const grossMargin = unitProfit / suggestedPrice;
  const correspondingROI = grossMargin > 0 ? r2((1 / grossMargin) / (1 - returnRate - platformFeeRate - miscFeeRate)) : 0;

  return {
    suggestedPrice: r2(suggestedPrice),
    breakevenPrice: r2(breakevenPrice),
    maxCost: r2(maxCost),
    priceRangeLow: r2(priceRangeLow),
    priceRangeHigh: r2(priceRangeHigh),
    correspondingROI,
  };
}

// ==================== 功能3：全维度利润分析 ====================

export function calcProfit(input: ProfitInput): ProfitResult {
  const {
    gmv, refundAmount, discountAmount, unitCost, salesVolume, shippedVolume,
    shippingFee, platformFeeRate, adSpend, returnRate, lossFactor,
    monthlyFixedCost, linkSalesRatio, miscFeeRate
  } = input;

  const effectiveSales = gmv - refundAmount - discountAmount;
  const directCost = unitCost * salesVolume + shippingFee * shippedVolume;
  const grossProfit = effectiveSales - directCost;
  const grossMargin = effectiveSales > 0 ? grossProfit / effectiveSales : 0;

  const platformFee = effectiveSales * platformFeeRate;
  const adFee = adSpend || effectiveSales * 0.15;
  const returnLoss = effectiveSales * returnRate * lossFactor;
  const miscFee = effectiveSales * miscFeeRate;

  let fixedCostShare = 0;
  if (monthlyFixedCost && linkSalesRatio) {
    fixedCostShare = monthlyFixedCost * (linkSalesRatio / 100);
  }

  const totalCost = directCost + platformFee + adFee + returnLoss + fixedCostShare + miscFee;
  const netProfit = effectiveSales - totalCost;
  const netMargin = effectiveSales > 0 ? netProfit / effectiveSales : 0;

  const costItems: CostBreakdownItem[] = [
    { name: '商品直接成本', amount: directCost, ratio: 0 },
    { name: '平台服务费', amount: platformFee, ratio: 0 },
    { name: '推广费用', amount: adFee, ratio: 0 },
    { name: '退货损耗', amount: returnLoss, ratio: 0 },
    { name: '固定成本分摊', amount: fixedCostShare, ratio: 0 },
    { name: '杂费', amount: miscFee, ratio: 0 },
  ];

  for (const item of costItems) {
    item.ratio = totalCost > 0 ? item.amount / totalCost : 0;
  }

  return {
    effectiveSales: r2(effectiveSales),
    directCost: r2(directCost),
    grossProfit: r2(grossProfit),
    grossMargin: pct(grossMargin),
    platformFee: r2(platformFee),
    adFee: r2(adFee),
    returnLoss: r2(returnLoss),
    fixedCostShare: r2(fixedCostShare),
    miscFee: r2(miscFee),
    netProfit: r2(netProfit),
    netMargin: pct(netMargin),
    costBreakdown: costItems.map(i => ({ ...i, amount: r2(i.amount), ratio: pct(i.ratio) })),
  };
}

// ==================== 功能4：广告ROI ====================

function analyzePlan(plan: AdPlan, returnRate: number, platformFeeRate: number, breakevenROI: number): AdROISingleResult {
  const platformROI = plan.adSpend > 0 ? plan.adGMV / plan.adSpend : 0;
  const realROI = plan.adSpend > 0 ? (plan.adGMV * (1 - returnRate - platformFeeRate)) / plan.adSpend : 0;

  let status: 'profit' | 'break_even' | 'loss' = 'break_even';
  let lossAmount = 0;
  if (realROI >= breakevenROI * 1.01) status = 'profit';
  else if (realROI >= breakevenROI * 0.99) status = 'break_even';
  else {
    status = 'loss';
    lossAmount = r2((breakevenROI - realROI) * plan.adSpend);
  }

  const adRatio = plan.adGMV > 0 ? plan.adSpend / plan.adGMV : 0;

  let suggestion = '';
  if (status === 'loss') {
    const gap = ((breakevenROI - realROI) / breakevenROI * 100);
    if (gap > 30) suggestion = '建议暂停该计划或大幅降低出价';
    else suggestion = `建议降低出价约 ${Math.round(gap)}%，或优化人群定向`;
  } else if (status === 'break_even') {
    suggestion = '处于盈亏平衡，建议小幅优化素材和出价';
  } else {
    suggestion = adRatio > 0.3 ? '盈利但推广占比偏高，可适当控制预算' : '推广效率良好，可持续放量';
  }

  return {
    platformROI: r2(platformROI),
    realROI: r2(realROI),
    status,
    lossAmount,
    adRatio: pct(adRatio),
    suggestion,
  };
}

export function calcAdROI(input: AdROIInput): AdROIResult {
  const { plans, returnRate, platformFeeRate, breakevenROI } = input;

  const analyzed = plans.map(p => ({
    ...p,
    ...analyzePlan(p, returnRate, platformFeeRate, breakevenROI),
  }));

  // 加权平均
  const totalGMV = plans.reduce((s, p) => s + p.adGMV, 0);
  const weightedAvgROI = totalGMV > 0
    ? analyzed.reduce((s, p) => s + p.realROI * (p.adGMV / totalGMV), 0)
    : 0;

  return {
    plans: analyzed,
    weightedAvgROI: r2(weightedAvgROI),
  };
}

// ==================== 功能5：比价分析 ====================

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return r2(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo));
}

function lerp(x: number, x0: number, x1: number, y0: number, y1: number): number {
  if (x1 === x0) return y0;
  return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
}

export function calcPriceCompare(input: PriceCompareInput): PriceCompareResult {
  const { myPrice, myCost, competitors } = input;

  // 无竞品数据时的兜底
  if (competitors.length === 0) {
    return {
      competitivenessScore: 65,
      rank: 1, totalCount: 1,
      percentile: 50,
      medianPrice: myPrice, minPrice: myPrice, maxPrice: myPrice, avgPrice: myPrice,
      quartile25: myPrice, quartile75: myPrice,
      optimalPriceLow: r2(myPrice * 0.95), optimalPriceHigh: r2(myPrice * 1.05),
      trafficMultiplier: 1.0,
      flags: [{ type: 'optimal', message: '暂无竞品数据，当前价格处于基准水平' }],
      suggestion: '建议先至少录入3个竞品价格以获得更准确的比价分析',
    };
  }

  const prices = competitors.map(c => c.price);
  const allPrices = [myPrice, ...prices].sort((a, b) => a - b);

  const minPrice = allPrices[0];
  const maxPrice = allPrices[allPrices.length - 1];
  const avgPrice = r2(allPrices.reduce((s, v) => s + v, 0) / allPrices.length);
  const q25 = percentile(prices, 25);
  const median = percentile(prices, 50);
  const q75 = percentile(prices, 75);
  const totalCount = competitors.length + 1;

  // 排名 (1=最低价)
  const rank = allPrices.indexOf(myPrice) + 1;
  const percentileVal = r2(((totalCount - rank) / (totalCount - 1)) * 100);

  // 竞争力分
  let score: number;
  if (myPrice <= minPrice) {
    score = 98;
  } else if (myPrice >= maxPrice) {
    score = 10;
  } else if (myPrice <= q25) {
    score = lerp(myPrice, minPrice, q25, 98, 85);
  } else if (myPrice <= median) {
    score = lerp(myPrice, q25, median, 85, 65);
  } else if (myPrice <= q75) {
    score = lerp(myPrice, median, q75, 65, 45);
  } else {
    score = lerp(myPrice, q75, maxPrice, 45, 10);
  }
  score = Math.round(score);

  // 流量系数
  let trafficMultiplier: number;
  if (score >= 90) trafficMultiplier = 1.5;
  else if (score >= 80) trafficMultiplier = 1.2;
  else if (score >= 60) trafficMultiplier = 1.0;
  else if (score >= 40) trafficMultiplier = 0.7;
  else trafficMultiplier = 0.4;

  // 最优价格区间 (5%-15% below median)
  const optimalPriceLow = r2(median * 0.85);
  const optimalPriceHigh = r2(median * 0.95);

  // 算法标记
  const flags: PriceFlag[] = [];
  const grossMargin = myPrice > 0 ? (myPrice - myCost) / myPrice : 0;

  if (score >= 90 && grossMargin < 0.10) {
    flags.push({ type: 'low_price_warning', message: '价格极低但利润空间不足，可能被平台判定为异常低价，触发限流' });
  } else if (score >= 90) {
    flags.push({ type: 'low_price_bonus', message: `你处于${competitors.length}个竞品中的最低价，享受平台最低价流量扶持` });
  }

  if (score <= 30) {
    flags.push({ type: 'high_price_warning', message: `价格高于${Math.round(percentileVal)}%的竞品，搜索排名和曝光将严重受限` });
  }

  if (score >= 60 && score < 90) {
    flags.push({ type: 'optimal', message: '当前价格竞争力良好，处于平台算法的安全区间' });
  }

  // 建议
  let suggestion: string;
  if (myPrice > optimalPriceHigh) {
    const drop = r2(myPrice - optimalPriceHigh);
    const pctDrop = Math.round((drop / myPrice) * 100);
    suggestion = `建议降价 ¥${drop}（约${pctDrop}%）至 ¥${optimalPriceHigh} 以内，可进入最优价格区间`;
  } else if (myPrice < optimalPriceLow && grossMargin > 0.15) {
    suggestion = '当前价格偏低但仍有利润，可考虑维持以获取最低价流量扶持';
  } else if (myPrice < optimalPriceLow) {
    suggestion = `当前价格过低导致利润不足，建议提价 ¥${r2(optimalPriceLow - myPrice)} 至 ¥${optimalPriceLow} 以上（仍有竞争力）`;
  } else {
    suggestion = '当前定价处于最优区间，建议持续监控竞品调价动态';
  }

  return {
    competitivenessScore: score,
    rank, totalCount,
    percentile: percentileVal,
    medianPrice: median, minPrice, maxPrice, avgPrice,
    quartile25: q25, quartile75: q75,
    optimalPriceLow, optimalPriceHigh,
    trafficMultiplier,
    flags,
    suggestion,
  };
}

// ==================== 功能6：虚高价策略 ====================

const AGGRESSIVE_MAP: Record<string, number> = {
  conservative: 1.30,
  moderate: 1.60,
  aggressive: 2.05,
};

const RISK_MAP: Record<string, { level: 'low' | 'medium' | 'high'; warnings: string[] }> = {
  conservative: {
    level: 'low',
    warnings: ['加价幅度温和，平台算法通常不会标记', '建议配合商品主图突出"券后价"以提升点击率'],
  },
  moderate: {
    level: 'medium',
    warnings: [
      '折扣力度超过35%，可能触发平台比价系统的定期抽查',
      '建议限时限量标签明确标注活动时间，避免被判定为虚假促销',
    ],
  },
  aggressive: {
    level: 'high',
    warnings: [
      '折扣力度超过50%，被平台风控标记的风险较高',
      '同一SKU不建议长期使用，可周期性切换策略降低风险',
      '建议在活动结束后及时恢复原价，避免被消费者举报"先涨后降"',
    ],
  },
};

export function calcInflatedPrice(input: InflatedPriceInput): InflatedPriceResult {
  const { targetRealPrice, cost, strategyType, aggressiveness, returnRate, platformFeeRate, miscFeeRate } = input;

  const markup = AGGRESSIVE_MAP[aggressiveness];
  const nominalPrice = r2(targetRealPrice * markup);
  const discountAmount = r2(nominalPrice - targetRealPrice);
  const discountRate = r2(discountAmount / nominalPrice);

  // 利润核算
  const unitProfit = targetRealPrice - cost - targetRealPrice * miscFeeRate;
  const profitPerOrder = r2(unitProfit);
  const marginRate = targetRealPrice > 0 ? pct(unitProfit / targetRealPrice) : 0;

  // 保本ROI
  let breakevenROI = 0;
  if (targetRealPrice > 0) {
    const gm = unitProfit / targetRealPrice;
    const ded = 1 - returnRate - platformFeeRate;
    breakevenROI = gm > 0 && ded > 0 ? r2((1 / gm) / ded) : 999999;
  }

  // 按策略类型生成配置
  let flashSaleConfig: FlashSaleConfig | undefined;
  let limitedCouponConfig: LimitedCouponConfig | undefined;
  let tieredCouponConfig: TieredCouponConfig | undefined;

  switch (strategyType) {
    case 'flash_sale': {
      flashSaleConfig = {
        discountPercent: Math.round(discountRate * 100),
        suggestedDuration: aggressiveness === 'aggressive' ? '1小时' : aggressiveness === 'moderate' ? '2小时' : '4小时',
        suggestedStartTime: '晚8点（黄金时段）',
      };
      break;
    }
    case 'limited_coupon': {
      limitedCouponConfig = {
        faceValue: discountAmount,
        quantity: aggressiveness === 'aggressive' ? 50 : aggressiveness === 'moderate' ? 100 : 200,
        minOrderAmount: nominalPrice,
      };
      break;
    }
    case 'tiered_coupon': {
      const t1 = r2(nominalPrice * 0.7);
      const d1 = r2(discountAmount * 0.7);
      const t2 = nominalPrice;
      const d2 = discountAmount;
      const t3 = r2(nominalPrice * 1.3);
      const d3 = r2(discountAmount * 1.3);
      tieredCouponConfig = {
        tiers: [
          { threshold: t1, discount: d1 },
          { threshold: t2, discount: d2 },
          { threshold: t3, discount: d3 },
        ],
      };
      break;
    }
  }

  // 消费者感知折扣 (实际折扣 × 1.1~1.2 的心理放大效应)
  const perceivedDiscount = r2(discountRate * 100 * (aggressiveness === 'aggressive' ? 1.15 : 1.08));

  // 转化率提升预估
  const conversionBoost = Math.round(discountRate * 100 * 0.55);

  const { level: riskLevel, warnings: riskWarnings } = RISK_MAP[aggressiveness];

  return {
    nominalPrice,
    discountRate: pct(discountRate),
    discountAmount,
    effectiveFinalPrice: r2(nominalPrice - discountAmount),
    flashSaleConfig,
    limitedCouponConfig,
    tieredCouponConfig,
    profitPerOrder,
    marginRate,
    breakevenROI,
    riskLevel,
    riskWarnings,
    perceivedDiscount,
    conversionBoost,
  };
}

// ==================== 多规格链接投产计算（7步法） ====================

export function calcListingROI(input: ListingROIInput): ListingROIResult {
  const { skus, returnRate, platformFeeRate, miscFeeRate, monthlyFixedCost } = input
  if (skus.length === 0) {
    return {
      step1_skuCosts: [], step2_weightedMargin: 0, step3_basicROI: 0,
      step4_realROI: 0, step5_skuBreakevens: [],
      totalSales: 0, totalGMV: 0, totalAdSpend: 0, totalCost: 0, totalProfit: 0,
      netMargin: 0, weightedAvgPrice: 0, weightedAvgCost: 0,
      breakevenROI: 0, actualROI: 0, skuResults: [], bestSku: '', worstSku: '',
      summary: '请添加至少一个SKU', adjustments: [],
    }
  }

  const feeSum = (returnRate + platformFeeRate + miscFeeRate) / 100

  // Step 1: 真实成本拆解
  const step1_skuCosts = skus.map(sku => {
    const { purchasePrice, shipping, packaging, giftCost, lossCost } = sku.costBreakdown
    return { name: sku.name, total: purchasePrice + shipping + packaging + giftCost + lossCost }
  })

  // Step 2: 真实销售占比 + 加权平均毛利率
  const totalSales = skus.reduce((s, sku) => s + sku.monthlySales, 0)
  const skuCostMap = new Map(step1_skuCosts.map(c => [c.name, c.total]))
  const step2_skus = skus.map(sku => {
    const cost = skuCostMap.get(sku.name) || 0
    const margin = sku.price > 0 ? (sku.price - cost) / sku.price : 0
    const weight = totalSales > 0 ? sku.monthlySales / totalSales : 0
    return { ...sku, cost, margin, weight }
  })
  const step2_weightedMargin = step2_skus.reduce((s, sku) => s + sku.margin * sku.weight, 0)

  // Step 3: 基础保本投产比
  const step3_basicROI = step2_weightedMargin > 0 ? 1 / step2_weightedMargin : 999999

  // Step 4: 真实保本投产比
  const step4_realROI = feeSum < 1 ? step3_basicROI / (1 - feeSum) : 999999

  // Step 5: 分SKU单独算保本
  const step5_skuBreakevens = skus.map(sku => {
    const cost = skuCostMap.get(sku.name) || 0
    const margin = sku.price > 0 ? (sku.price - cost) / sku.price : 0
    const sbr = margin > 0 ? 1 / margin : 999999
    const srr = feeSum < 1 ? sbr / (1 - feeSum) : 999999
    let status = 'normal'
    if (srr < step4_realROI * 0.9) status = 'star'
    else if (srr > step4_realROI * 1.2) status = 'drag'
    return { name: sku.name, roi: srr, status }
  })

  // 汇总
  const totalGMV = skus.reduce((s, sku) => s + sku.price * sku.monthlySales, 0)
  const totalAdSpend = skus.reduce((s, sku) => s + sku.adSpend, 0)
  const totalCostGoods = step2_skus.reduce((s, sku) => s + sku.cost * sku.monthlySales, 0)
  const totalCost = totalCostGoods + totalAdSpend + totalGMV * feeSum + monthlyFixedCost
  const totalProfit = totalGMV - totalCost
  const netMargin = totalGMV > 0 ? (totalProfit / totalGMV) * 100 : 0
  const weightedAvgPrice = totalSales > 0 ? totalGMV / totalSales : 0
  const weightedAvgCost = totalSales > 0 ? totalCostGoods / totalSales : 0
  const actualROI = totalCost > 0 ? totalGMV / totalCost : 0

  // SKU明细
  const skuResults: ListingSkuResult[] = step2_skus.map(sku => {
    const totalRev = sku.price * sku.monthlySales
    const costTotal = sku.cost * sku.monthlySales
    const profit = totalRev - costTotal - sku.adSpend - totalRev * feeSum
    const unitProfit = sku.price - sku.cost
    const unitMargin = sku.price > 0 ? (unitProfit / sku.price) * 100 : 0
    const actualWeight = totalSales > 0 ? (sku.monthlySales / totalSales) * 100 : 0
    const sbr = unitMargin > 0 ? (1 / (unitMargin / 100)) : 999999
    const srr = feeSum < 1 ? sbr / (1 - feeSum) : 999999

    let status: 'star' | 'normal' | 'drag' = 'normal'
    let suggestion = ''
    if (profit > 0 && sku.monthlySales > 0) {
      status = 'star'
      suggestion = sku.actualRatio > sku.plannedRatio ? '实际占比超预期，主力盈利SKU' : '利润贡献主力，建议提升占比'
    } else if (profit < 0 && sku.monthlySales > 0) {
      status = 'drag'
      suggestion = unitProfit < 0 ? `单件亏损¥${Math.abs(unitProfit).toFixed(2)}，建议提价或降本` : '月销量低导致广告费摊薄，建议促销冲量'
    }
    return {
      id: sku.id, name: sku.name, costDetail: sku.costBreakdown, totalCost: sku.cost,
      unitProfit, unitMargin, plannedRatio: sku.plannedRatio, actualRatio: sku.actualRatio,
      totalRevenueActual: totalRev, totalProfitActual: profit,
      salesWeight: actualWeight,
      profitContribution: totalProfit !== 0 ? (profit / totalProfit) * 100 : 0,
      skuBreakevenROI: srr, status, suggestion,
    }
  })

  const sorted = [...skuResults].sort((a, b) => b.totalProfitActual - a.totalProfitActual)
  const bestSku = sorted[0]?.name || ''
  const worstSku = sorted[sorted.length - 1]?.name || ''
  const starCount = skuResults.filter(r => r.status === 'star').length
  const dragCount = skuResults.filter(r => r.status === 'drag').length

  let summary = ''
  if (totalProfit > 0) {
    summary = `链接整体盈利 ¥${totalProfit.toFixed(2)}，${starCount}个明星SKU`
    if (dragCount > 0) summary += `，${dragCount}个拖后腿SKU需优化`
  } else if (totalProfit < 0) {
    summary = `链接整体亏损 ¥${Math.abs(totalProfit).toFixed(2)}，${dragCount}个SKU在亏损`
  } else {
    summary = '链接处于盈亏平衡点'
  }

  const adjustments: string[] = []
  if (netMargin < 5) adjustments.push('净利率低于5%')
  if (actualROI < step4_realROI * 0.8) adjustments.push('投产比远低于保本线，建议缩减广告预算')
  else if (actualROI < step4_realROI) adjustments.push('投产比低于保本线，建议优化')
  else adjustments.push('投产比在安全线以上')
  if (dragCount > 0) adjustments.push(`${dragCount}个拖后腿SKU需处理`)

  return {
    step1_skuCosts, step2_weightedMargin, step3_basicROI: step3_basicROI,
    step4_realROI: step4_realROI, step5_skuBreakevens,
    totalSales, totalGMV, totalAdSpend, totalCost, totalProfit, netMargin,
    weightedAvgPrice, weightedAvgCost, breakevenROI: step4_realROI,
    actualROI, skuResults, bestSku, worstSku, summary, adjustments,
  }
}

// ==================== 持久化 ====================

const STORAGE_KEY = 'pdd_calculator_data';

export function saveToStorage(key: string, data: unknown) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    existing[key] = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch { /* ignore */ }
}

export function loadFromStorage(key: string): unknown | null {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return data[key] ?? null;
  } catch { return null; }
}

export function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}