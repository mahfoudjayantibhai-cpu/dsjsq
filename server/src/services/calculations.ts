// Ported calculation engine - server-side version

// ========== 保本投产比 ==========
export function calcBaoBenROI(input: any) {
  const { mode, price, cost, shipping, skus, returnRate, platformFeeRate, miscFeeRate, actualROI } = input

  if (mode === 'single') {
    const unitProfit = price - cost - shipping
    const grossMargin = price > 0 ? (unitProfit / price) * 100 : 0
    const baseROI = unitProfit > 0 ? price / unitProfit : Infinity
    const effectiveMargin = unitProfit - price * ((returnRate || 0) + (platformFeeRate || 0) + (miscFeeRate || 0))
    const realROI = effectiveMargin > 0 ? price / effectiveMargin : Infinity
    let riskStatus: string = 'profit'
    let estimatedLoss: number | undefined
    if (actualROI && isFinite(realROI)) {
      if (actualROI >= realROI) riskStatus = 'profit'
      else if (actualROI >= realROI * 0.9) riskStatus = 'break_even'
      else { riskStatus = 'loss'; estimatedLoss = (price - price / actualROI) * (1 - (returnRate || 0)) }
    }
    return { unitProfit, grossMargin, baseROI: isFinite(baseROI) ? baseROI : 0, realROI: isFinite(realROI) ? realROI : 0, riskStatus, estimatedLoss }
  }

  const skuList = skus || []
  const totalRatio = skuList.reduce((s: number, sk: any) => s + (sk.salesRatio || 0), 0)
  let weightedMargin = 0, weightedBaseROI = 0
  skuList.forEach((sk: any) => {
    const up = sk.price - sk.cost - (sk.shipping || 0)
    const m = sk.price > 0 ? up / sk.price : 0
    const w = totalRatio > 0 ? sk.salesRatio / totalRatio : 0
    weightedMargin += m * w
    weightedBaseROI += (up > 0 ? sk.price / up : 0) * w
  })
  const avgPrice = skuList.reduce((s: number, sk: any) => s + sk.price * (sk.salesRatio / totalRatio), 0)
  const avgProfit = avgPrice * weightedMargin
  const effective = avgProfit - avgPrice * ((returnRate || 0) + (platformFeeRate || 0) + (miscFeeRate || 0))
  const realROI = effective > 0 ? avgPrice / effective : Infinity

  return {
    unitProfit: avgProfit, grossMargin: weightedMargin * 100, baseROI: weightedBaseROI,
    weightedGrossMargin: weightedMargin * 100, weightedBaseROI,
    realROI: isFinite(realROI) ? realROI : 0, riskStatus: 'profit'
  }
}

// ========== 商品定价 ==========
export function calcPricing(input: any) {
  const { mode, cost, shipping, targetMargin, targetPrice, returnRate, platformFeeRate, miscFeeRate } = input
  const unitCost = cost + (shipping || 0)
  const feeBurden = 1 - (returnRate || 0) - (platformFeeRate || 0) - (miscFeeRate || 0)

  if (mode === 'cost_plus') {
    const marginRate = (targetMargin || 30) / 100
    const suggestedPrice = feeBurden > 0 ? unitCost / (1 - marginRate) / feeBurden : unitCost / (1 - marginRate)
    const breakevenPrice = feeBurden > 0 ? unitCost / feeBurden : unitCost
    return {
      suggestedPrice: Math.round(suggestedPrice * 100) / 100,
      breakevenPrice: Math.round(breakevenPrice * 100) / 100,
      maxCost: Math.round((targetPrice || suggestedPrice) * feeBurden * 100) / 100,
      priceRangeLow: Math.round(suggestedPrice * 0.9 * 100) / 100,
      priceRangeHigh: Math.round(suggestedPrice * 1.1 * 100) / 100,
      correspondingROI: Math.round((suggestedPrice / (suggestedPrice - unitCost / feeBurden)) * 100) / 100
    }
  }

  const competitivePrice = targetPrice || cost * 3
  const unitProfit = competitivePrice - unitCost - competitivePrice * ((returnRate || 0) + (platformFeeRate || 0) + (miscFeeRate || 0))
  return {
    suggestedPrice: competitivePrice,
    breakevenPrice: Math.round(unitCost / feeBurden * 100) / 100,
    maxCost: Math.round(competitivePrice * feeBurden * 100) / 100,
    priceRangeLow: Math.round(competitivePrice * 0.85 * 100) / 100,
    priceRangeHigh: Math.round(competitivePrice * 1.15 * 100) / 100,
    correspondingROI: unitProfit > 0 ? Math.round((competitivePrice / unitProfit) * 100) / 100 : 0
  }
}

// ========== 利润分析 ==========
export function calcProfit(input: any) {
  const { gmv, refundAmount, discountAmount, unitCost, salesVolume, shippedVolume, shippingFee,
    platformFeeRate, adSpend, returnRate, lossFactor, monthlyFixedCost, linkSalesRatio, miscFeeRate } = input

  const effectiveSales = gmv - (refundAmount || 0) - (discountAmount || 0)
  const directCost = (unitCost || 0) * (shippedVolume || salesVolume || 0) + (shippingFee || 0) * (shippedVolume || salesVolume || 0)
  const grossProfit = effectiveSales - directCost
  const grossMargin = effectiveSales > 0 ? (grossProfit / effectiveSales) * 100 : 0
  const platformFee = effectiveSales * (platformFeeRate || 0)
  const adFee = adSpend || 0
  const returnLoss = effectiveSales * (returnRate || 0) * (lossFactor || 1)
  const fixedCostShare = (monthlyFixedCost || 0) * (linkSalesRatio || 1)
  const miscFee = effectiveSales * (miscFeeRate || 0)
  const netProfit = grossProfit - platformFee - adFee - returnLoss - fixedCostShare - miscFee
  const netMargin = effectiveSales > 0 ? (netProfit / effectiveSales) * 100 : 0

  return {
    effectiveSales, directCost, grossProfit, grossMargin, platformFee, adFee, returnLoss, fixedCostShare, miscFee,
    netProfit, netMargin,
    costBreakdown: [
      { name: '直接成本', amount: directCost, ratio: effectiveSales > 0 ? directCost / effectiveSales : 0 },
      { name: '平台费用', amount: platformFee, ratio: platformFeeRate || 0 },
      { name: '广告费用', amount: adFee, ratio: effectiveSales > 0 ? adFee / effectiveSales : 0 },
      { name: '退货损耗', amount: returnLoss, ratio: effectiveSales > 0 ? returnLoss / effectiveSales : 0 },
      { name: '固定成本', amount: fixedCostShare, ratio: effectiveSales > 0 ? fixedCostShare / effectiveSales : 0 },
      { name: '杂费', amount: miscFee, ratio: miscFeeRate || 0 },
    ]
  }
}

// ========== 广告ROI ==========
export function calcAdROI(input: any) {
  const { plans, breakevenROI } = input
  const results = (plans || []).map((p: any) => {
    const platformROI = p.adSpend > 0 ? p.adGMV / p.adSpend : 0
    const feeBurden = p.adGMV * (input.returnRate || 0) + p.adGMV * (input.platformFeeRate || 0)
    const realProfit = p.adGMV - feeBurden - p.adSpend
    const realROI = p.adSpend > 0 ? p.adGMV / (p.adSpend + feeBurden) : 0
    let status = 'profit'
    let lossAmount = 0
    const target = breakevenROI || 3
    if (realROI >= target) status = 'profit'
    else if (realROI >= target * 0.8) status = 'break_even'
    else { status = 'loss'; lossAmount = p.adSpend + feeBurden - p.adGMV }

    return {
      ...p, platformROI, realROI, status, lossAmount,
      adRatio: p.adGMV > 0 ? p.adSpend / p.adGMV : 0,
      suggestion: realROI >= target ? '投产比良好，可适度追投' : realROI >= target * 0.8 ? '接近保本线，优化素材或人群' : '亏损，建议立即调整或暂停'
    }
  })

  const totalGMV = results.reduce((s: number, r: any) => s + r.adGMV, 0)
  const totalSpend = results.reduce((s: number, r: any) => s + r.adSpend, 0)
  return { plans: results, weightedAvgROI: totalSpend > 0 ? totalGMV / totalSpend : 0 }
}

// ========== 比价策略 ==========
export function calcPriceStrategy(input: any) {
  const { myPrice, myCost, competitors, platformFeeRate, returnRate } = input
  const prices = (competitors || []).map((c: any) => c.price).concat(myPrice).sort((a: number, b: number) => a - b)
  const n = prices.length
  const median = n % 2 === 0 ? (prices[n / 2 - 1] + prices[n / 2]) / 2 : prices[Math.floor(n / 2)]
  const min = prices[0], max = prices[n - 1]
  const avg = prices.reduce((s: number, p: number) => s + p, 0) / n
  const q25 = prices[Math.max(0, Math.floor(n * 0.25) - 1)]
  const q75 = prices[Math.min(n - 1, Math.floor(n * 0.75))]

  const rank = prices.indexOf(myPrice) + 1
  const percentile = (rank - 1) / (n - 1 || 1)
  const competitivenessScore = 100 - percentile * 100

  const feeBurden = 1 - (platformFeeRate || 0) - (returnRate || 0)
  const optimalPriceLow = Math.max(myCost / feeBurden * 1.05, 0)
  const optimalPriceHigh = median * 1.05
  const trafficMultiplier = myPrice <= q25 ? 1.5 : myPrice <= median ? 1.2 : myPrice <= q75 ? 1.0 : 0.7

  const flags: any[] = []
  if (myPrice < q25) flags.push({ type: 'low_price_bonus', message: '价格处于最低25%区间，可获得额外流量加权' })
  if (myPrice > q75) flags.push({ type: 'high_price_warning', message: '价格处于最高25%区间，流量曝光受限' })
  if (myPrice <= min * 1.05) flags.push({ type: 'optimal', message: '价格极具竞争力' })

  return {
    competitivenessScore: Math.round(competitivenessScore),
    rank, totalCount: n, percentile: Math.round(percentile * 100),
    medianPrice: median, minPrice: min, maxPrice: max, avgPrice: Math.round(avg * 100) / 100,
    quartile25: q25, quartile75: q75,
    optimalPriceLow: Math.round(optimalPriceLow * 100) / 100,
    optimalPriceHigh: Math.round(optimalPriceHigh * 100) / 100,
    trafficMultiplier: Math.round(trafficMultiplier * 100) / 100,
    flags,
    suggestion: myPrice <= median ? '价格竞争力良好，保持当前策略' : '建议参考最优区间调整定价'
  }
}

// ========== 链接投产（7步法）==========
export function calcListingROI(input: any) {
  const { linkName, skus, returnRate, platformFeeRate, miscFeeRate, monthlyFixedCost } = input

  const feeFactor = 1 - (returnRate || 0) / 100 - (platformFeeRate || 0) / 100 - (miscFeeRate || 0) / 100
  const skuResults = (skus || []).map((sku: any) => {
    const cb = sku.costBreakdown || {}
    const totalCost = (cb.purchasePrice || 0) + (cb.shipping || 0) + (cb.packaging || 0) + (cb.giftCost || 0) + (cb.lossCost || 0)
    const unitProfit = sku.price - totalCost
    const unitMargin = sku.price > 0 ? (unitProfit / sku.price) * 100 : 0
    const totalRevenue = sku.price * (sku.monthlySales || 0) * ((sku.actualRatio || sku.plannedRatio || 0) / 100)
    const effectiveProfit = unitProfit - sku.price * ((returnRate || 0) / 100 + (platformFeeRate || 0) / 100 + (miscFeeRate || 0) / 100)
    const totalProfit = effectiveProfit * (sku.monthlySales || 0) * ((sku.actualRatio || sku.plannedRatio || 0) / 100)
    const skuBreakevenROI = effectiveProfit > 0 ? sku.price / effectiveProfit : Infinity

    let status: string, suggestion: string
    if (unitMargin > 30) { status = 'star'; suggestion = '高利润SKU，建议加大推广力度' }
    else if (unitMargin > 10) { status = 'normal'; suggestion = '正常水平，保持当前策略' }
    else { status = 'drag'; suggestion = '利润过低，建议优化成本或提价' }

    return {
      id: sku.id, name: sku.name,
      costDetail: cb, totalCost, unitProfit, unitMargin,
      plannedRatio: sku.plannedRatio, actualRatio: sku.actualRatio || sku.plannedRatio,
      totalRevenueActual: totalRevenue, totalProfitActual: totalProfit,
      salesWeight: 0, profitContribution: 0,
      skuBreakevenROI: isFinite(skuBreakevenROI) ? skuBreakevenROI : 0,
      status, suggestion
    }
  })

  const totalGMV = skuResults.reduce((s: number, r: any) => s + r.totalRevenueActual, 0)
  const totalProfitAll = skuResults.reduce((s: number, r: any) => s + r.totalProfitActual, 0)
  skuResults.forEach((r: any) => {
    r.profitContribution = totalProfitAll !== 0 ? (r.totalProfitActual / totalProfitAll) * 100 : 0
    r.salesWeight = totalGMV > 0 ? (r.totalRevenueActual / totalGMV) * 100 : 0
  })

  const totalCostAll = skuResults.reduce((s: number, r: any) => s + r.totalCost * (skus.find((sk: any) => sk.id === r.id)?.monthlySales || 0) * ((r.actualRatio) / 100 || 1), 0)
  const totalSales = skus.reduce((s: number, sk: any) => s + (sk.monthlySales || 0), 0)
  const totalAdSpend = skus.reduce((s: number, sk: any) => s + (sk.adSpend || 0), 0)
  const netProfitFinal = totalProfitAll - (monthlyFixedCost || 0)
  const netMargin = totalGMV > 0 ? (netProfitFinal / totalGMV) * 100 : 0

  const weightedPrice = totalSales > 0 ? skus.reduce((s: number, sk: any) => s + sk.price * sk.monthlySales, 0) / totalSales : 0
  const weightedCost = totalSales > 0 ? skuResults.reduce((s: number, r: any) => s + r.totalCost * (skus.find((sk: any) => sk.id === r.id)?.monthlySales || 0), 0) / totalSales : 0
  const effectiveUnit = weightedPrice * feeFactor - weightedCost
  const breakevenROI = effectiveUnit > 0 ? weightedPrice / effectiveUnit : Infinity
  const actualROI = (totalAdSpend + totalCostAll) > 0 ? totalGMV / (totalAdSpend + totalCostAll) : 0

  const sorted = [...skuResults].sort((a, b) => b.totalProfitActual - a.totalProfitActual)
  const bestSku = sorted[0]?.name || '-'
  const worstSku = sorted[sorted.length - 1]?.name || '-'

  const step1 = skus.map((sk: any) => {
    const cb = sk.costBreakdown || {}
    const tc = (cb.purchasePrice || 0) + (cb.shipping || 0) + (cb.packaging || 0) + (cb.giftCost || 0) + (cb.lossCost || 0)
    return { name: sk.name, total: tc }
  })
  const weightedMargin = totalGMV > 0 ? skuResults.reduce((s: number, r: any) => s + r.unitMargin * r.totalRevenueActual, 0) / totalGMV : 0
  const basicROI = weightedMargin > 0 ? 100 / weightedMargin : Infinity

  const adjustments: string[] = []
  const draggers = skuResults.filter((r: any) => r.status === 'drag')
  if (draggers.length > 0) adjustments.push(`${draggers.length}个拖后腿SKU需重点优化：${draggers.map((d: any) => d.name).join('、')}`)
  if (netMargin < 5) adjustments.push('净利润率低于5%，建议检查广告花费或成本结构')

  return {
    step1_skuCosts: step1,
    step2_weightedMargin: Math.round(weightedMargin * 100) / 100,
    step3_basicROI: isFinite(basicROI) ? Math.round(basicROI * 100) / 100 : 0,
    step4_realROI: isFinite(breakevenROI) ? Math.round(breakevenROI * 100) / 100 : 0,
    step5_skuBreakevens: skuResults.map((r: any) => ({ name: r.name, roi: r.skuBreakevenROI, status: r.status })),
    totalSales, totalGMV, totalAdSpend, totalCost: totalCostAll,
    totalProfit: totalProfitAll, netMargin: Math.round(netMargin * 100) / 100,
    weightedAvgPrice: Math.round(weightedPrice * 100) / 100,
    weightedAvgCost: Math.round(weightedCost * 100) / 100,
    breakevenROI: isFinite(breakevenROI) ? Math.round(breakevenROI * 100) / 100 : 0,
    actualROI: Math.round(actualROI * 100) / 100,
    skuResults, bestSku, worstSku,
    summary: netProfitFinal > 0 ? '链接整体盈利，继续保持' : '链接亏损，需优化成本或调整投放',
    adjustments
  }
}
