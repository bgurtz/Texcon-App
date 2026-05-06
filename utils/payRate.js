function getHourlyRateForDate(payRates = [], workDate) {
  const date = new Date(workDate);

  const sorted = payRates
    .filter(p => p.effectiveDate <= date)
    .sort((a, b) => b.effectiveDate - a.effectiveDate);

  return sorted.length ? sorted[0].rate : 0;
}

module.exports = { getHourlyRateForDate };