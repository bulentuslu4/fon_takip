/* =============================================
   FonTakip - Application Logic
   ============================================= */

// ==================== DATA & CONFIG ====================

const FUNDS = {
    AFA: {
        code: 'AFA', name: 'Ak Portföy Amerika Yabancı Hisse',
        shortName: 'Amerika Hisse', type: 'stock', typeName: 'ABD Hisse',
        target: 35, risk: 6, color: '#4fc3f7',
        defaultPrice: 1.33, stopaj: 10,
        description: 'ABD piyasasının genel kesiti. S&P 500 ağırlıklı.',
        pros: ['Geniş ABD piyasa erişimi', 'Dolar bazlı koruma', 'Güçlü tarihsel performans'],
        cons: ['Yönetim ücreti %2,90', 'ABD piyasa riskine duyarlı', 'Kur riski (TL güçlenirse)'],
        ybg: 32, yillik: 43
    },
    AFT: {
        code: 'AFT', name: 'Ak Portföy Yeni Teknolojiler Yabancı Hisse',
        shortName: 'Yeni Teknolojiler', type: 'stock', typeName: 'ABD Teknoloji',
        target: 25, risk: 6, color: '#7c4dff',
        defaultPrice: 0.85, stopaj: 10,
        description: 'Microsoft, NVIDIA, Alphabet gibi teknoloji devlerine odaklı.',
        pros: ['AI/yapay zeka büyüme trendi', 'Küresel teknoloji liderleri', 'Dolar bazlı'],
        cons: ['Sektör konsantrasyonu', 'Teknoloji düzeltmeleri sert olabilir', 'AFA ile kısmi örtüşme'],
        ybg: 21, yillik: 34
    },
    IJC: {
        code: 'IJC', name: 'İş Portföy Yarı İletken Teknolojileri Değişken',
        shortName: 'Yarı İletken', type: 'semi', typeName: 'Yarı İletken',
        target: 15, risk: 6, color: '#00e676',
        defaultPrice: 15.55, stopaj: 10,
        description: 'Yarı iletken (çip) sektörüne odaklı tematik fon.',
        pros: ['2026 yılının en iyi tematik fonlarından', 'AI çip talebi artıyor', 'Hem yerli hem yabancı'],
        cons: ['Çok yüksek volatilite', 'Tek sektör riski', 'Jeopolitik riskler (çip savaşları)'],
        ybg: 59, yillik: 60
    },
    GTA: {
        code: 'GTA', name: 'Garanti Portföy Altın Fonu',
        shortName: 'Altın', type: 'gold', typeName: 'Kıymetli Maden',
        target: 15, risk: 4, color: '#ffd740',
        defaultPrice: 0.12, stopaj: 10,
        description: 'Altın ve altına dayalı sermaye piyasası araçlarına yatırım.',
        pros: ['Güvenli liman - kriz koruması', 'Dolar + altın çifte koruma', 'Düşük risk (4/7)'],
        cons: ['Hisse fonlarına göre düşük getiri potansiyeli', 'Altın fiyat dalgalanmaları', 'Temettü yok'],
        ybg: 7.7, yillik: 27
    },
    AKE: {
        code: 'AKE', name: 'Ak Portföy Eurobond Borçlanma Araçları',
        shortName: 'Eurobond', type: 'bond', typeName: 'Eurobond',
        target: 10, risk: 3, color: '#ff8a65',
        defaultPrice: 0.07, stopaj: 10,
        description: 'USD cinsinden Türk devlet/özel sektör tahvillerine yatırım.',
        pros: ['Düşük volatilite', 'Dolar bazlı sabit getiri', 'Portföy dengeleyici'],
        cons: ['Düşük getiri potansiyeli', 'Türkiye kredi riskine bağlı', 'Faiz riski'],
        ybg: 12.7, yillik: 20.6
    }
};

const FUND_ORDER = ['AFA', 'AFT', 'IJC', 'GTA', 'AKE'];

// ==================== STATE MANAGEMENT ====================

let state = {
    prices: {},
    transactions: [],
    checklist: {}
};

function loadState() {
    try {
        const saved = localStorage.getItem('fontakip_state');
        if (saved) {
            state = JSON.parse(saved);
        }
        // Set default prices if not set
        FUND_ORDER.forEach(code => {
            if (!state.prices[code]) {
                state.prices[code] = FUNDS[code].defaultPrice;
            }
        });
        if (!state.transactions) state.transactions = [];
        if (!state.checklist) state.checklist = {};
        
        // Asenkron olarak otomatik fiyatları çek
        fetchAutoPrices();
    } catch (e) {
        console.error('State load error:', e);
    }
}

async function fetchAutoPrices() {
    try {
        const response = await fetch('prices.json?v=' + new Date().getTime()); // cache busting
        if (response.ok) {
            const data = await response.json();
            let updated = false;
            FUND_ORDER.forEach(code => {
                if (data[code]) {
                    state.prices[code] = parseFloat(data[code]);
                    updated = true;
                }
            });
            
            if (updated) {
                console.log('Fiyatlar otomatik güncellendi (prices.json)');
                saveState();
                
                // Eğer şuan dashboard veya portföy sayfasındaysa sayfayı yenile
                if (document.getElementById('page-dashboard').classList.contains('active')) {
                    refreshDashboard();
                } else if (document.getElementById('page-portfolio').classList.contains('active')) {
                    refreshPortfolio();
                }
            }
        }
    } catch (e) {
        console.log('Otomatik fiyat çekme başarısız (Manuel kullanım devam ediyor):', e);
    }
}

function saveState() {
    try {
        localStorage.setItem('fontakip_state', JSON.stringify(state));
    } catch (e) {
        console.error('State save error:', e);
    }
}

// ==================== UTILITY FUNCTIONS ====================

function formatCurrency(value) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency', currency: 'TRY',
        minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(value);
}

function formatNumber(value, decimals = 2) {
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals
    }).format(value);
}

function formatPercent(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}%${formatNumber(value)}`;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ==================== NAVIGATION ====================

function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`).classList.add('active');

    // Update pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(`page-${page}`);
    targetPage.classList.remove('active');
    // Force reflow for animation
    void targetPage.offsetWidth;
    targetPage.classList.add('active');

    // Refresh page data
    switch(page) {
        case 'dashboard': refreshDashboard(); break;
        case 'portfolio': refreshPortfolio(); break;
        case 'rebalance': refreshRebalance(); break;
        case 'simulator': initSimulator(); break;
        case 'advisor': refreshAdvisor(); break;
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== PORTFOLIO CALCULATIONS ====================

function getPortfolioData() {
    const holdings = {};
    FUND_ORDER.forEach(code => {
        holdings[code] = { units: 0, totalCost: 0, transactions: [] };
    });

    state.transactions.forEach(tx => {
        const h = holdings[tx.fund];
        if (tx.type === 'buy') {
            h.units += tx.units;
            h.totalCost += tx.amount;
        } else {
            h.units -= tx.units;
            h.totalCost -= (h.totalCost / (h.units + tx.units)) * tx.units;
        }
        h.transactions.push(tx);
    });

    let totalValue = 0, totalCost = 0;
    const funds = {};

    FUND_ORDER.forEach(code => {
        const h = holdings[code];
        const price = state.prices[code] || FUNDS[code].defaultPrice;
        const currentValue = h.units * price;
        const pnl = currentValue - h.totalCost;
        const pnlPercent = h.totalCost > 0 ? (pnl / h.totalCost) * 100 : 0;

        funds[code] = {
            ...FUNDS[code],
            units: h.units,
            totalCost: h.totalCost,
            currentValue: currentValue,
            price: price,
            pnl: pnl,
            pnlPercent: pnlPercent,
            avgCost: h.units > 0 ? h.totalCost / h.units : 0
        };

        totalValue += currentValue;
        totalCost += h.totalCost;
    });

    // Calculate actual weights
    FUND_ORDER.forEach(code => {
        funds[code].actualWeight = totalValue > 0 ? (funds[code].currentValue / totalValue) * 100 : 0;
        funds[code].weightDiff = funds[code].actualWeight - FUNDS[code].target;
    });

    const totalPnl = totalValue - totalCost;
    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    return { funds, totalValue, totalCost, totalPnl, totalPnlPercent };
}

// ==================== DASHBOARD ====================

let allocationChart, assetClassChart, growthChart;

function refreshDashboard() {
    const data = getPortfolioData();
    updateLastUpdateTime();

    // Hero Card
    document.getElementById('totalValue').textContent = formatCurrency(data.totalValue);
    document.getElementById('totalInvested').textContent = formatCurrency(data.totalCost);

    const changeBadge = document.getElementById('totalChangeBadge');
    const changeDetail = document.getElementById('totalChangeDetail');

    if (data.totalCost > 0) {
        changeBadge.textContent = formatPercent(data.totalPnlPercent);
        changeBadge.className = `change-badge ${data.totalPnl >= 0 ? 'positive' : 'negative'}`;
        changeDetail.textContent = `Kâr/Zarar: ${formatCurrency(data.totalPnl)}`;
    } else {
        changeBadge.textContent = '%0,00';
        changeBadge.className = 'change-badge neutral';
        changeDetail.textContent = 'Kâr/Zarar: ₺0,00';
    }

    // Quick Stats
    if (data.totalCost > 0) {
        let bestCode = FUND_ORDER[0], worstCode = FUND_ORDER[0];
        FUND_ORDER.forEach(code => {
            if (data.funds[code].totalCost > 0) {
                if (data.funds[code].pnlPercent > data.funds[bestCode].pnlPercent || data.funds[bestCode].totalCost === 0) bestCode = code;
                if (data.funds[code].pnlPercent < data.funds[worstCode].pnlPercent || data.funds[worstCode].totalCost === 0) worstCode = code;
            }
        });

        document.getElementById('bestFund').textContent = data.funds[bestCode].totalCost > 0
            ? `${bestCode} ${formatPercent(data.funds[bestCode].pnlPercent)}` : '--';
        document.getElementById('worstFund').textContent = data.funds[worstCode].totalCost > 0
            ? `${worstCode} ${formatPercent(data.funds[worstCode].pnlPercent)}` : '--';

        const maxDiff = Math.max(...FUND_ORDER.map(c => Math.abs(data.funds[c].weightDiff)));
        document.getElementById('balanceStatus').textContent = maxDiff < 3 ? '✅ Dengeli' : maxDiff < 8 ? '⚠️ Sapma var' : '🔴 Dengesiz';
    }

    // Fund Cards
    renderFundCards(data);

    // Charts
    renderAllocationChart(data);
    renderAssetClassChart(data);
    renderGrowthChart();
}

function updateLastUpdateTime() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent =
        now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function renderFundCards(data) {
    const grid = document.getElementById('fundCardsGrid');
    grid.innerHTML = '';

    FUND_ORDER.forEach(code => {
        const f = data.funds[code];
        const card = document.createElement('div');
        card.className = 'fund-card';
        card.dataset.fund = code;

        const pnlClass = f.pnl >= 0 ? 'positive' : 'negative';
        const badgeClass = f.type === 'gold' ? 'gold' : f.type === 'bond' ? 'bond' : f.type === 'semi' ? 'semi' : 'stock';

        card.innerHTML = `
            <div class="fund-card-header">
                <div>
                    <div class="fund-code">${code}</div>
                    <div class="fund-name">${f.shortName}</div>
                </div>
                <span class="fund-badge ${badgeClass}">${f.typeName}</span>
            </div>
            <div class="fund-card-body">
                <div class="fund-metric">
                    <span class="fund-metric-label">Değer</span>
                    <span class="fund-metric-value">${formatCurrency(f.currentValue)}</span>
                </div>
                <div class="fund-metric">
                    <span class="fund-metric-label">Kâr/Zarar</span>
                    <span class="fund-metric-value ${pnlClass}">${f.totalCost > 0 ? formatCurrency(f.pnl) : '--'}</span>
                </div>
                <div class="fund-metric">
                    <span class="fund-metric-label">Birim Fiyat</span>
                    <span class="fund-metric-value">₺${formatNumber(f.price, 4)}</span>
                </div>
                <div class="fund-metric">
                    <span class="fund-metric-label">Pay Adedi</span>
                    <span class="fund-metric-value">${f.units > 0 ? formatNumber(f.units, 2) : '--'}</span>
                </div>
                <div class="fund-progress">
                    <div class="fund-progress-labels">
                        <span>Ağırlık: %${formatNumber(f.actualWeight, 1)}</span>
                        <span>Hedef: %${f.target}</span>
                    </div>
                    <div class="fund-progress-bar">
                        <div class="fund-progress-fill" style="width: ${Math.min(f.actualWeight / f.target * 100, 150)}%; background: ${f.color};"></div>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderAllocationChart(data) {
    const ctx = document.getElementById('allocationChart').getContext('2d');
    const values = FUND_ORDER.map(c => data.funds[c].currentValue);
    const hasData = values.some(v => v > 0);

    if (allocationChart) allocationChart.destroy();

    allocationChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: FUND_ORDER.map(c => c),
            datasets: [{
                data: hasData ? values : FUND_ORDER.map(c => FUNDS[c].target),
                backgroundColor: FUND_ORDER.map(c => FUNDS[c].color),
                borderWidth: 0,
                spacing: 3,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#8892b0', font: { family: 'Inter', size: 11, weight: '500' },
                        padding: 12, usePointStyle: true, pointStyleWidth: 8
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(13, 19, 33, 0.95)',
                    titleFont: { family: 'Inter', weight: '600' },
                    bodyFont: { family: 'Inter' },
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1, cornerRadius: 10, padding: 12,
                    callbacks: {
                        label: (ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((ctx.raw / total) * 100).toFixed(1);
                            return hasData ? ` ${formatCurrency(ctx.raw)} (%${pct})` : ` Hedef: %${ctx.raw}`;
                        }
                    }
                }
            }
        }
    });
}

function renderAssetClassChart(data) {
    const ctx = document.getElementById('assetClassChart').getContext('2d');

    const classes = {
        'ABD Hisse': { value: 0, color: '#4fc3f7' },
        'Teknoloji': { value: 0, color: '#7c4dff' },
        'Yarı İletken': { value: 0, color: '#00e676' },
        'Altın': { value: 0, color: '#ffd740' },
        'Eurobond': { value: 0, color: '#ff8a65' }
    };

    const mapping = { AFA: 'ABD Hisse', AFT: 'Teknoloji', IJC: 'Yarı İletken', GTA: 'Altın', AKE: 'Eurobond' };

    FUND_ORDER.forEach(code => {
        classes[mapping[code]].value += data.funds[code].currentValue || FUNDS[code].target;
    });

    if (assetClassChart) assetClassChart.destroy();

    assetClassChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(classes),
            datasets: [{
                data: Object.values(classes).map(c => c.value),
                backgroundColor: Object.values(classes).map(c => c.color),
                borderWidth: 0, spacing: 3, borderRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#8892b0', font: { family: 'Inter', size: 11, weight: '500' },
                        padding: 12, usePointStyle: true, pointStyleWidth: 8
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(13, 19, 33, 0.95)',
                    titleFont: { family: 'Inter', weight: '600' },
                    bodyFont: { family: 'Inter' },
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1, cornerRadius: 10, padding: 12
                }
            }
        }
    });
}

function renderGrowthChart() {
    const ctx = document.getElementById('growthChart').getContext('2d');

    // Build growth data from transactions
    const sortedTx = [...state.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (sortedTx.length === 0) {
        if (growthChart) growthChart.destroy();
        growthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Başlangıç', '1. Ay', '2. Ay', '3. Ay', '6. Ay', '1 Yıl'],
                datasets: [{
                    label: 'Tahmini Büyüme (%25 yıllık)',
                    data: [3500, 4583, 5680, 6790, 10300, 18800],
                    borderColor: '#00d4aa',
                    backgroundColor: 'rgba(0, 212, 170, 0.1)',
                    fill: true, tension: 0.4, borderWidth: 2,
                    pointBackgroundColor: '#00d4aa', pointRadius: 4
                }, {
                    label: 'Yatırılan Tutar',
                    data: [3500, 4500, 5500, 6500, 9500, 15500],
                    borderColor: '#8892b0',
                    borderDash: [5, 5],
                    fill: false, tension: 0.4, borderWidth: 1.5,
                    pointRadius: 3, pointBackgroundColor: '#8892b0'
                }]
            },
            options: getLineChartOptions('Tahmini Portföy Büyümesi (₺)')
        });
        return;
    }

    // Calculate cumulative investment and value over time
    const dates = [];
    const invested = [];
    const values = [];
    let cumInvested = 0;

    sortedTx.forEach(tx => {
        if (tx.type === 'buy') cumInvested += tx.amount;
        else cumInvested -= tx.amount;
        dates.push(new Date(tx.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }));
        invested.push(cumInvested);
    });

    // Add current point
    const data = getPortfolioData();
    dates.push('Bugün');
    invested.push(data.totalCost);
    values.push(data.totalValue);

    // For simplicity, estimate values at each tx point proportionally
    const ratio = data.totalCost > 0 ? data.totalValue / data.totalCost : 1;
    const estimatedValues = invested.map((inv, i) => {
        if (i === invested.length - 1) return data.totalValue;
        // Linear interpolation toward current ratio
        const progress = (i + 1) / invested.length;
        const r = 1 + (ratio - 1) * progress;
        return inv * r;
    });

    if (growthChart) growthChart.destroy();
    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Portföy Değeri',
                data: estimatedValues,
                borderColor: '#00d4aa',
                backgroundColor: 'rgba(0, 212, 170, 0.1)',
                fill: true, tension: 0.4, borderWidth: 2,
                pointBackgroundColor: '#00d4aa', pointRadius: 4
            }, {
                label: 'Yatırılan Tutar',
                data: invested,
                borderColor: '#8892b0',
                borderDash: [5, 5],
                fill: false, tension: 0.4, borderWidth: 1.5,
                pointRadius: 3, pointBackgroundColor: '#8892b0'
            }]
        },
        options: getLineChartOptions('Portföy Büyümesi (₺)')
    });
}

function getLineChartOptions(title) {
    return {
        responsive: true, maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
            legend: {
                labels: {
                    color: '#8892b0', font: { family: 'Inter', size: 11, weight: '500' },
                    usePointStyle: true, pointStyleWidth: 8
                }
            },
            tooltip: {
                backgroundColor: 'rgba(13, 19, 33, 0.95)',
                titleFont: { family: 'Inter', weight: '600' },
                bodyFont: { family: 'Inter' },
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1, cornerRadius: 10, padding: 12,
                callbacks: {
                    label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
                }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255,255,255,0.04)' },
                ticks: { color: '#4a5568', font: { family: 'Inter', size: 10 } }
            },
            y: {
                grid: { color: 'rgba(255,255,255,0.04)' },
                ticks: {
                    color: '#4a5568', font: { family: 'Inter', size: 10 },
                    callback: (v) => '₺' + (v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v)
                }
            }
        }
    };
}

// ==================== PORTFOLIO MANAGEMENT ====================

function refreshPortfolio() {
    renderPriceGrid();
    renderTransactionList();
    setupTransactionCalc();
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('txDate').value = today;
}

function renderPriceGrid() {
    const grid = document.getElementById('priceGrid');
    grid.innerHTML = '';

    FUND_ORDER.forEach(code => {
        const f = FUNDS[code];
        const price = state.prices[code] || f.defaultPrice;
        const row = document.createElement('div');
        row.className = 'price-row';
        row.innerHTML = `
            <div class="fund-dot" style="background: ${f.color};"></div>
            <span class="fund-label">${code} - ${f.shortName}</span>
            <input type="number" step="0.0001" min="0" value="${price}" id="price_${code}"
                   placeholder="Fiyat">
        `;
        grid.appendChild(row);
    });
}

function savePrices() {
    FUND_ORDER.forEach(code => {
        const input = document.getElementById(`price_${code}`);
        if (input && input.value) {
            state.prices[code] = parseFloat(input.value);
        }
    });
    saveState();
    showToast('Fiyatlar güncellendi! ✅', 'success');
    refreshDashboard();
}

function setupTransactionCalc() {
    const amountInput = document.getElementById('txAmount');
    const priceInput = document.getElementById('txPrice');
    const unitsDisplay = document.getElementById('txUnits');
    const fundSelect = document.getElementById('txFund');

    function updateCalc() {
        const amount = parseFloat(amountInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        if (amount > 0 && price > 0) {
            unitsDisplay.textContent = formatNumber(amount / price, 4) + ' pay';
        } else {
            unitsDisplay.textContent = '--';
        }
    }

    // Auto-fill price when fund is selected
    fundSelect.addEventListener('change', () => {
        const code = fundSelect.value;
        if (code && state.prices[code]) {
            priceInput.value = state.prices[code];
            updateCalc();
        }
    });

    amountInput.addEventListener('input', updateCalc);
    priceInput.addEventListener('input', updateCalc);
}

function addTransaction(event) {
    event.preventDefault();

    const fund = document.getElementById('txFund').value;
    const type = document.querySelector('input[name="txType"]:checked').value;
    const amount = parseFloat(document.getElementById('txAmount').value);
    const price = parseFloat(document.getElementById('txPrice').value);
    const date = document.getElementById('txDate').value;

    if (!fund || !amount || !price || !date) {
        showToast('Lütfen tüm alanları doldur', 'error');
        return;
    }

    const units = amount / price;

    // Check if selling more than owned
    if (type === 'sell') {
        const data = getPortfolioData();
        if (units > data.funds[fund].units) {
            showToast('Sahip olduğundan fazla pay satamazsın!', 'error');
            return;
        }
    }

    const tx = {
        id: generateId(),
        fund, type, amount, price, units, date
    };

    state.transactions.push(tx);
    saveState();

    showToast(`${type === 'buy' ? 'Alış' : 'Satış'} işlemi eklendi: ${fund} ${formatCurrency(amount)}`, 'success');

    // Reset form
    document.getElementById('transactionForm').reset();
    document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('txUnits').textContent = '--';

    renderTransactionList();
}

function renderTransactionList() {
    const list = document.getElementById('transactionList');

    if (state.transactions.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📭</span>
                <p>Henüz işlem eklenmedi</p>
                <p class="empty-hint">İlk yatırımını ekleyerek başla!</p>
            </div>
        `;
        return;
    }

    // Sort by date descending
    const sorted = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    list.innerHTML = sorted.map(tx => {
        const f = FUNDS[tx.fund];
        const dateStr = new Date(tx.date).toLocaleDateString('tr-TR', {
            day: '2-digit', month: 'short', year: 'numeric'
        });

        return `
            <div class="tx-item" data-id="${tx.id}">
                <div class="tx-type-badge ${tx.type}">${tx.type === 'buy' ? 'AL' : 'SAT'}</div>
                <div class="tx-info">
                    <div class="tx-fund-name">${tx.fund} - ${f.shortName}</div>
                    <div class="tx-detail">${dateStr} · Birim: ₺${formatNumber(tx.price, 4)}</div>
                </div>
                <div class="tx-amount">
                    <div class="tx-amount-value">${formatCurrency(tx.amount)}</div>
                    <div class="tx-amount-units">${formatNumber(tx.units, 2)} pay</div>
                </div>
                <button class="tx-delete" onclick="confirmDelete('${tx.id}')" title="Sil">✕</button>
            </div>
        `;
    }).join('');
}

let pendingDeleteId = null;

function confirmDelete(id) {
    pendingDeleteId = id;
    document.getElementById('deleteModal').style.display = 'flex';
    document.getElementById('confirmDeleteBtn').onclick = () => {
        deleteTransaction(pendingDeleteId);
        closeDeleteModal();
    };
}

function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    pendingDeleteId = null;
}

function deleteTransaction(id) {
    state.transactions = state.transactions.filter(tx => tx.id !== id);
    saveState();
    showToast('İşlem silindi', 'info');
    renderTransactionList();
}

// ==================== REBALANCING ====================

let rebalanceChart;

function refreshRebalance() {
    const data = getPortfolioData();
    renderRebalanceChart(data);
    renderRebalanceSuggestions(data);
}

function renderRebalanceChart(data) {
    const ctx = document.getElementById('rebalanceChart').getContext('2d');
    if (rebalanceChart) rebalanceChart.destroy();

    rebalanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: FUND_ORDER.map(c => c),
            datasets: [{
                label: 'Mevcut %',
                data: FUND_ORDER.map(c => data.funds[c].actualWeight),
                backgroundColor: FUND_ORDER.map(c => FUNDS[c].color + 'CC'),
                borderRadius: 6, barPercentage: 0.6
            }, {
                label: 'Hedef %',
                data: FUND_ORDER.map(c => FUNDS[c].target),
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                borderWidth: 1, borderRadius: 6, barPercentage: 0.6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#8892b0', font: { family: 'Inter', size: 11, weight: '500' },
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(13, 19, 33, 0.95)',
                    titleFont: { family: 'Inter', weight: '600' },
                    bodyFont: { family: 'Inter' },
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1, cornerRadius: 10, padding: 12,
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: %${ctx.raw.toFixed(1)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#8892b0', font: { family: 'Inter', size: 11, weight: '600' } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#4a5568', font: { family: 'Inter', size: 10 }, callback: v => '%' + v },
                    max: 50
                }
            }
        }
    });
}

function renderRebalanceSuggestions(data) {
    const container = document.getElementById('rebalanceSuggestions');

    if (data.totalValue === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">⚖️</span>
                <p>Portföye işlem ekledikten sonra dengeleme önerileri burada görünecek</p>
            </div>
        `;
        return;
    }

    container.innerHTML = FUND_ORDER.map(code => {
        const f = data.funds[code];
        const targetValue = data.totalValue * (FUNDS[code].target / 100);
        const diff = targetValue - f.currentValue;
        const absDiff = Math.abs(diff);

        let actionLabel, actionClass;
        if (diff > data.totalValue * 0.01) {
            actionLabel = 'AL';
            actionClass = 'buy-more';
        } else if (diff < -data.totalValue * 0.01) {
            actionLabel = 'SAT';
            actionClass = 'sell-some';
        } else {
            actionLabel = 'DENGEDE';
            actionClass = 'balanced';
        }

        return `
            <div class="rebalance-item">
                <div class="rebalance-fund-dot" style="background: ${FUNDS[code].color};"></div>
                <div class="rebalance-info">
                    <div class="rebalance-fund-name">${code} - ${FUNDS[code].shortName}</div>
                    <div class="rebalance-detail">Mevcut: %${formatNumber(f.actualWeight, 1)} → Hedef: %${FUNDS[code].target}</div>
                </div>
                <div class="rebalance-action">
                    <div class="rebalance-action-label ${actionClass}">${actionLabel}</div>
                    <div class="rebalance-action-amount">${absDiff > data.totalValue * 0.01 ? formatCurrency(absDiff) : '✓'}</div>
                </div>
            </div>
        `;
    }).join('');
}

function calculateNextInvestment() {
    const amount = parseFloat(document.getElementById('nextAmount').value) || 1000;
    const data = getPortfolioData();
    const newTotal = data.totalValue + amount;
    const result = document.getElementById('nextInvestmentResult');

    const allocations = {};
    let remaining = amount;

    // Calculate how much each fund needs to reach target
    const needs = FUND_ORDER.map(code => {
        const targetValue = newTotal * (FUNDS[code].target / 100);
        const need = targetValue - data.funds[code].currentValue;
        return { code, need: Math.max(0, need) };
    });

    const totalNeed = needs.reduce((s, n) => s + n.need, 0);

    needs.forEach(({ code, need }) => {
        if (totalNeed > 0) {
            allocations[code] = Math.round((need / totalNeed) * amount);
        } else {
            allocations[code] = Math.round(amount * FUNDS[code].target / 100);
        }
    });

    // Adjust rounding
    const totalAllocated = Object.values(allocations).reduce((s, v) => s + v, 0);
    const diff = amount - totalAllocated;
    if (diff !== 0) {
        const maxCode = Object.entries(allocations).sort((a, b) => b[1] - a[1])[0][0];
        allocations[maxCode] += diff;
    }

    result.style.display = 'block';
    result.innerHTML = `
        <p style="margin-bottom: 12px; font-weight: 600; color: var(--text-primary);">
            ${formatCurrency(amount)} yatırımını şu şekilde dağıt:
        </p>
        ${FUND_ORDER.map(code => `
            <div class="result-line">
                <span class="result-fund" style="color: ${FUNDS[code].color};">● ${code}</span>
                <span class="result-amount">${formatCurrency(allocations[code])}</span>
            </div>
        `).join('')}
        <p style="margin-top: 12px; font-size: 0.72rem; color: var(--text-muted);">
            Bu dağılım, portföyünü hedef ağırlıklara en yakın şekilde getirir.
        </p>
    `;
}

// ==================== SIMULATOR ====================

let simChart, scenarioChart;

function initSimulator() {
    renderScenarioChart();
}

function runSimulation() {
    const initial = parseFloat(document.getElementById('simInitial').value) || 3500;
    const monthly = parseFloat(document.getElementById('simMonthly').value) || 1000;
    const years = parseInt(document.getElementById('simYears').value) || 3;
    const annualReturn = parseFloat(document.getElementById('simReturn').value) || 25;

    const monthlyReturn = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;
    const months = years * 12;

    const labels = [];
    const portfolioValues = [];
    const investedValues = [];

    let portfolio = initial;
    let invested = initial;

    labels.push('Başlangıç');
    portfolioValues.push(portfolio);
    investedValues.push(invested);

    for (let m = 1; m <= months; m++) {
        portfolio = portfolio * (1 + monthlyReturn) + monthly;
        invested += monthly;

        if (m % (months <= 36 ? 1 : 3) === 0 || m === months) {
            const yearLabel = Math.floor(m / 12);
            const monthLabel = m % 12;
            labels.push(m < 12 ? `${m}. ay` : yearLabel + 'y' + (monthLabel > 0 ? ` ${monthLabel}a` : ''));
            portfolioValues.push(Math.round(portfolio));
            investedValues.push(Math.round(invested));
        }
    }

    const finalValue = portfolioValues[portfolioValues.length - 1];
    const totalInvested = investedValues[investedValues.length - 1];
    const totalProfit = finalValue - totalInvested;

    // Show results
    document.getElementById('simResults').style.display = 'block';
    document.getElementById('simSummary').innerHTML = `
        <div class="sim-stat">
            <div class="sim-stat-label">Toplam Yatırılan</div>
            <div class="sim-stat-value">${formatCurrency(totalInvested)}</div>
        </div>
        <div class="sim-stat">
            <div class="sim-stat-label">Portföy Değeri</div>
            <div class="sim-stat-value highlight">${formatCurrency(finalValue)}</div>
        </div>
        <div class="sim-stat">
            <div class="sim-stat-label">Net Kâr</div>
            <div class="sim-stat-value" style="color: var(--color-positive);">${formatCurrency(totalProfit)}</div>
        </div>
    `;

    // Chart
    const ctx = document.getElementById('simChart').getContext('2d');
    if (simChart) simChart.destroy();

    simChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Portföy Değeri',
                data: portfolioValues,
                borderColor: '#00d4aa',
                backgroundColor: 'rgba(0, 212, 170, 0.1)',
                fill: true, tension: 0.4, borderWidth: 2.5,
                pointRadius: 3, pointBackgroundColor: '#00d4aa'
            }, {
                label: 'Yatırılan Tutar',
                data: investedValues,
                borderColor: '#8892b0',
                borderDash: [5, 5],
                fill: false, tension: 0.4, borderWidth: 1.5,
                pointRadius: 2, pointBackgroundColor: '#8892b0'
            }]
        },
        options: getLineChartOptions('DCA Simülasyonu')
    });
}

function renderScenarioChart() {
    const ctx = document.getElementById('scenarioChart').getContext('2d');
    const initial = 3500;
    const monthly = 1000;
    const months = 36;
    const scenarios = [
        { rate: 10, label: 'Düşük (%10)', color: '#ff8a65' },
        { rate: 20, label: 'Orta (%20)', color: '#ffd740' },
        { rate: 30, label: 'Yüksek (%30)', color: '#00d4aa' },
        { rate: 40, label: 'Çok Yüksek (%40)', color: '#7c4dff' }
    ];

    const labels = [];
    const datasets = [];

    scenarios.forEach(scenario => {
        const r = Math.pow(1 + scenario.rate / 100, 1 / 12) - 1;
        const data = [];
        let val = initial;
        for (let m = 0; m <= months; m++) {
            if (m > 0) val = val * (1 + r) + monthly;
            if (m % 3 === 0) {
                data.push(Math.round(val));
                if (datasets.length === 0) {
                    labels.push(m === 0 ? 'Şimdi' : m < 12 ? `${m}. ay` : `${m / 12}. yıl`);
                }
            }
        }
        datasets.push({
            label: scenario.label, data,
            borderColor: scenario.color,
            backgroundColor: 'transparent',
            tension: 0.4, borderWidth: 2,
            pointRadius: 2, pointBackgroundColor: scenario.color
        });
    });

    // Invested line
    const investedData = [];
    for (let m = 0; m <= months; m++) {
        if (m % 3 === 0) investedData.push(initial + monthly * m);
    }
    datasets.push({
        label: 'Yatırılan', data: investedData,
        borderColor: '#4a5568', borderDash: [5, 5],
        backgroundColor: 'transparent',
        tension: 0.4, borderWidth: 1.5,
        pointRadius: 0
    });

    if (scenarioChart) scenarioChart.destroy();
    scenarioChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: getLineChartOptions('3 Yıllık Senaryo Karşılaştırma')
    });
}

// ==================== ADVISOR ====================

function refreshAdvisor() {
    const data = getPortfolioData();
    const now = new Date();

    document.getElementById('advisorTimestamp').textContent =
        `Son güncelleme: ${now.toLocaleDateString('tr-TR')} ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;

    renderMarketOverview();
    renderPortfolioAnalysis(data);
    renderAdvisorTips(data);
    renderMonthlyChecklist();
}

function renderMarketOverview() {
    const container = document.getElementById('marketOverview');
    container.innerHTML = `
        <p><strong>📌 Genel Değerlendirme (Eylül 2026 Sonu):</strong></p>
        <div class="highlight-box">
            <strong>ABD Piyasası:</strong> S&P 500 yılbaşından bu yana güçlü bir performans sergiliyor.
            Yapay zeka ve teknoloji sektörü hâlâ ana itici güç. Fed faiz politikası gevşemeye devam ediyor,
            bu da hisse senetleri için pozitif. <strong>AFA ve AFT için olumlu bir ortam.</strong>
        </div>
        <div class="warning-box">
            <strong>Türkiye Piyasası:</strong> Tera Portföy fiyaskosu (SPK 131 fon tasfiyesi) güven krizine yol açtı.
            BIST düşüşte. <strong>TTE ve YAS'ı şimdilik almamak doğru karar.</strong> Piyasa toparlandığında
            değerlendirilebilir.
        </div>
        <div class="highlight-box">
            <strong>Altın:</strong> Merkez bankası alımları ve jeopolitik riskler altını desteklemeye devam ediyor.
            <strong>GTA defansif rolünü iyi oynuyor.</strong>
        </div>
        <p><strong>Yarı İletkenler:</strong> AI çip talebi güçlü ancak son 3 ayda düzeltme yaşandı.
        IJC kısa vadede volatil ama uzun vadede potansiyeli yüksek.</p>
        <p><strong>Eurobond:</strong> Türkiye'nin kredi notu görünümü iyileşiyor. AKE sabit getirili
        bir "denge" aracı olarak portföyde yerini korumalı.</p>
    `;
}

function renderPortfolioAnalysis(data) {
    const container = document.getElementById('portfolioAnalysis');

    if (data.totalCost === 0) {
        container.innerHTML = `
            <p>Henüz portföyde işlem yok. İlk yatırımını yaptıktan sonra burada detaylı analiz göreceksin.</p>
            <div class="highlight-box">
                <strong>İlk adım önerisi:</strong> Senaryo 2 dağılımıyla başla:
                AFA %35, AFT %25, IJC %15, GTA %15, AKE %10.
                3.500 TL ile başlayıp aylık 1.000 TL ekle.
            </div>
        `;
        return;
    }

    // Analysis
    const maxDiff = Math.max(...FUND_ORDER.map(c => Math.abs(data.funds[c].weightDiff)));
    const hisseAgirlik = (data.funds.AFA.actualWeight + data.funds.AFT.actualWeight + data.funds.IJC.actualWeight);
    const defansifAgirlik = (data.funds.GTA.actualWeight + data.funds.AKE.actualWeight);

    container.innerHTML = `
        <p><strong>Portföy Durumu:</strong></p>
        <p>Toplam değer: <strong>${formatCurrency(data.totalValue)}</strong> |
        Yatırılan: <strong>${formatCurrency(data.totalCost)}</strong> |
        Kâr/Zarar: <strong style="color: ${data.totalPnl >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'}">
        ${formatCurrency(data.totalPnl)} (${formatPercent(data.totalPnlPercent)})</strong></p>

        <div class="${maxDiff < 5 ? 'highlight-box' : 'warning-box'}">
            <strong>Denge Durumu:</strong> ${maxDiff < 3 ? '✅ Portföyün hedef ağırlıklara yakın, güzel dengede!' :
            maxDiff < 8 ? '⚠️ Hafif sapma var. Bir sonraki yatırımda dengelemeyi düşün.' :
            '🔴 Ciddi sapma var! Dengeleme yapman önerilir.'}
        </div>

        <p><strong>Hisse/Defansif Dengesi:</strong> Hisse %${formatNumber(hisseAgirlik, 1)} |
        Defansif %${formatNumber(defansifAgirlik, 1)}
        ${defansifAgirlik < 20 ? ' — ⚠️ Defansif ağırlık düşük, GTA/AKE artırabilirsin.' :
        ' — ✅ Denge iyi görünüyor.'}</p>
    `;
}

function renderAdvisorTips(data) {
    const container = document.getElementById('advisorTips');
    const tips = [];

    // Always-relevant tips
    tips.push({
        icon: '📅',
        title: 'Düzenli Yatırımı Unutma',
        text: 'Her ay düzenli yatırım (DCA) uzun vadede en etkili strateji. Halkbank mobil\'den otomatik alım talimatı kurabilirsin.'
    });

    tips.push({
        icon: '🛡️',
        title: 'Tera Portföy Dersi',
        text: 'Fon seçerken büyük portföy yönetim şirketlerini (Ak Portföy, İş Portföy, Garanti BBVA, Yapı Kredi) tercih et. Senin seçtiğin fonların hepsi güvenilir şirketlerden. ✅'
    });

    if (data.totalCost === 0) {
        tips.push({
            icon: '🚀',
            title: 'Hadi Başlayalım!',
            text: 'İlk yatırımını yapmak için "Portföy" sekmesine git, fon fiyatlarını güncelle ve alım işlemi ekle.'
        });
    }

    if (data.totalCost > 0) {
        // Check rebalancing need
        const maxDiff = Math.max(...FUND_ORDER.map(c => Math.abs(data.funds[c].weightDiff)));
        if (maxDiff > 5) {
            tips.push({
                icon: '⚖️',
                title: 'Dengeleme Zamanı',
                text: `Portföyünde %${formatNumber(maxDiff, 1)} sapma var. "Denge" sekmesinden dengeleme önerilerini incele.`
            });
        }

        // Fund-specific tips
        if (data.funds.IJC.pnlPercent < -10) {
            tips.push({
                icon: '🎢',
                title: 'IJC Düşüşte - Panik Yapma!',
                text: 'Yarı iletken sektörü volatil. Düşüşler alım fırsatı olabilir. Uzun vadeli düşün, panik satışı yapma.'
            });
        }

        if (data.funds.GTA.pnlPercent > 0) {
            tips.push({
                icon: '🥇',
                title: 'Altın Koruyor',
                text: 'GTA defansif rolünü iyi oynuyor. Hisse fonları düşerken altın portföyünü dengeliyor.'
            });
        }
    }

    tips.push({
        icon: '🎓',
        title: 'Öğrenmeye Devam Et',
        text: 'TEFAS, Fintables ve FVT sitelerini takip et. Her hafta 15 dakika ayırarak piyasa haberlerini oku.'
    });

    tips.push({
        icon: '⏰',
        title: 'Uzun Vade = Büyük Kazanç',
        text: 'Bileşik getirinin gücü zamanla katlanarak artar. 1-3 yıllık hedefin iyi ama mümkünse 5+ yıl düşün.'
    });

    container.innerHTML = tips.map(tip => `
        <div class="tip-card">
            <span class="tip-icon">${tip.icon}</span>
            <div class="tip-content">
                <div class="tip-title">${tip.title}</div>
                <div class="tip-text">${tip.text}</div>
            </div>
        </div>
    `).join('');
}

function showFundAnalysis(code) {
    const container = document.getElementById('fundDeepDive');
    if (!code) {
        container.innerHTML = '';
        return;
    }

    const f = FUNDS[code];
    const data = getPortfolioData();
    const holding = data.funds[code];

    container.innerHTML = `
        <div style="margin-top: 12px;">
            <div class="highlight-box">
                <strong>${f.code} - ${f.name}</strong><br>
                <span style="font-size: 0.78rem;">${f.description}</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0;">
                <div class="sim-stat">
                    <div class="sim-stat-label">Risk Değeri</div>
                    <div class="sim-stat-value">${f.risk}/7</div>
                </div>
                <div class="sim-stat">
                    <div class="sim-stat-label">Hedef Ağırlık</div>
                    <div class="sim-stat-value">%${f.target}</div>
                </div>
                <div class="sim-stat">
                    <div class="sim-stat-label">YBB Getiri</div>
                    <div class="sim-stat-value highlight">%${f.ybg}</div>
                </div>
                <div class="sim-stat">
                    <div class="sim-stat-label">1 Yıllık Getiri</div>
                    <div class="sim-stat-value highlight">%${f.yillik}</div>
                </div>
            </div>

            <p style="font-size: 0.82rem; margin-bottom: 8px;"><strong style="color: var(--color-positive);">✅ Güçlü Yanlar:</strong></p>
            <ul style="font-size: 0.78rem; color: var(--text-secondary); padding-left: 20px; margin-bottom: 16px; line-height: 1.8;">
                ${f.pros.map(p => `<li>${p}</li>`).join('')}
            </ul>

            <p style="font-size: 0.82rem; margin-bottom: 8px;"><strong style="color: var(--color-negative);">⚠️ Riskler:</strong></p>
            <ul style="font-size: 0.78rem; color: var(--text-secondary); padding-left: 20px; margin-bottom: 16px; line-height: 1.8;">
                ${f.cons.map(c => `<li>${c}</li>`).join('')}
            </ul>

            ${holding.totalCost > 0 ? `
                <div class="highlight-box">
                    <strong>Senin Pozisyonun:</strong><br>
                    Yatırılan: ${formatCurrency(holding.totalCost)} |
                    Değer: ${formatCurrency(holding.currentValue)} |
                    Kâr/Zarar: <span style="color: ${holding.pnl >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'}">
                    ${formatCurrency(holding.pnl)} (${formatPercent(holding.pnlPercent)})</span>
                </div>
            ` : `
                <div class="warning-box">
                    <strong>Bu fonda henüz pozisyonun yok.</strong>
                    Portföy sekmesinden alım yapabilirsin.
                </div>
            `}
        </div>
    `;
}

function renderMonthlyChecklist() {
    const container = document.getElementById('monthlyChecklist');
    const items = [
        { id: 'check_prices', text: 'TEFAS\'tan güncel fon fiyatlarını kontrol et ve güncelle' },
        { id: 'check_monthly', text: 'Bu ay 1.000 TL düzenli yatırımı yap' },
        { id: 'check_balance', text: 'Portföy dengesini kontrol et (Denge sekmesi)' },
        { id: 'check_news', text: 'Haftalık piyasa haberlerini oku' },
        { id: 'check_emergency', text: 'Acil durum fonunu kontrol et (2-3 aylık gider)' },
        { id: 'check_learn', text: 'Yatırım eğitimi: TEFAS/Fintables bir makale oku' },
    ];

    // Reset checklist at start of new month
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    if (state.checklist._month !== monthKey) {
        state.checklist = { _month: monthKey };
        saveState();
    }

    container.innerHTML = items.map(item => {
        const checked = state.checklist[item.id] || false;
        return `
            <div class="checklist-item ${checked ? 'checked' : ''}" onclick="toggleChecklist('${item.id}', this)">
                <div class="checklist-checkbox">${checked ? '✓' : ''}</div>
                <span class="checklist-text">${item.text}</span>
            </div>
        `;
    }).join('');
}

function toggleChecklist(id, element) {
    state.checklist[id] = !state.checklist[id];
    saveState();

    element.classList.toggle('checked');
    const checkbox = element.querySelector('.checklist-checkbox');
    checkbox.textContent = state.checklist[id] ? '✓' : '';
}

// ==================== PORTFOLIO EXPORT (Telegram Bot İçin) ====================

function exportPortfolio() {
    const data = getPortfolioData();
    const holdings = {};

    FUND_ORDER.forEach(code => {
        holdings[code] = {
            units: data.funds[code].units,
            totalCost: data.funds[code].totalCost,
            currentValue: data.funds[code].currentValue,
            price: data.funds[code].price
        };
    });

    const exportData = {
        exportDate: new Date().toISOString(),
        holdings: holdings,
        prices: state.prices,
        totalValue: data.totalValue,
        totalCost: data.totalCost,
        totalPnl: data.totalPnl,
        transactions: state.transactions
    };

    // Download as JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Portföy verisi indirildi! 📥 Telegram botu için fon klasörüne taşı.', 'success');
}

async function fetchPortfolioFromCloud() {
    try {
        const response = await fetch('portfolio_export.json?v=' + new Date().getTime());
        if (response.ok) {
            const data = await response.json();
            if (data.transactions && Array.isArray(data.transactions)) {
                state.transactions = data.transactions;
                saveState();
                refreshPortfolio();
                refreshDashboard();
                showToast('Buluttan portföy başarıyla eşillendi! 🎉', 'success');
            } else {
                showToast('Hata: Buluttaki dosya formatı geçersiz.', 'error');
            }
        } else {
            showToast('Bulutta portföy dosyası bulunamadı. Önce PC\'den yüklemelisin.', 'error');
        }
    } catch (e) {
        showToast('Bağlantı hatası: Portföy çekilemedi.', 'error');
        console.error(e);
    }
}

// ==================== INITIALIZATION ====================

function init() {
    loadState();
    initNavigation();
    refreshDashboard();
    refreshPortfolio();

    // Init scenario chart after short delay
    setTimeout(() => renderScenarioChart(), 500);

    console.log('🚀 FonTakip initialized!');
}

// Start app
document.addEventListener('DOMContentLoaded', init);
