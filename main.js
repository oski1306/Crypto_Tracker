let socket;

const modal = document.getElementById("modal");
const addBtn = document.getElementById("addCoinBtn");
const closeModal = document.getElementById("closeModal");
const settingsModal = document.getElementById("settingsModal");
const closeSettings = document.getElementById("closeSettings");
const coinList = document.getElementById("coinList");
const emptyState = document.getElementById("empty-state");
const applyBtn = document.querySelector(".apply-btn");
const confirmModal = document.getElementById("confirmModal");
const closeConfirm = document.getElementById("closeConfirm");
const deleteModal = document.getElementById("deleteModal");
const closeDelete = document.getElementById("closeDelete");
const deleteBtn = document.querySelector(".delete-btn");

const coinSelectModal = document.getElementById("coinSelectModal");
const amountInput = document.querySelector(".modal-content input");

const timeframeMap = {
    "1D": { interval: "1h", limit: 24 },
    "1W": { interval: "1d", limit: 7 },
    "1M": { interval: "1d", limit: 30 },
    "3M": { interval: "1d", limit: 90 },
    "1Y": { interval: "1w", limit: 52 }
};

let portfolio = [];
let selectedIndex = null;
let pendingUpdate = null;
let selectedCoinIndex = null;
let chart;
let candleSeries;

deleteBtn.addEventListener("click", () => {
    const item = portfolio[selectedIndex];

    const symbol = item.coin === "btcusdt" ? "BTC" : "ETH";

    document.getElementById("deleteCoin").textContent = symbol;
    document.getElementById("deleteAmount").textContent = item.amount;

    settingsModal.classList.add("hidden");
    deleteModal.classList.remove("hidden");
});

document.getElementById("deleteYes").addEventListener("click", () => {
    portfolio.splice(selectedIndex, 1);

    deleteModal.classList.add("hidden");

    const panel = document.getElementById("extendedPanel");
    panel.classList.add("hidden");

    selectedCoinIndex = null; 
    selectedIndex = null;

    updateUI();
});

document.getElementById("deleteNo").addEventListener("click", () => {
    deleteModal.classList.add("hidden");
    settingsModal.classList.remove("hidden");
});

closeDelete.addEventListener("click", () => {
    deleteModal.classList.add("hidden");
});

deleteModal.addEventListener("click", (e) => {
    if (e.target === deleteModal) {
        deleteModal.classList.add("hidden");
    }
});

closeConfirm.addEventListener("click", () => {
    confirmModal.classList.add("hidden");
});

confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) {
        confirmModal.classList.add("hidden");
    }
});

applyBtn.addEventListener("click", () => {
    const item = portfolio[selectedIndex];

    const newAmount = parseFloat(document.querySelector("#settingsModal input").value);

    if (!newAmount || newAmount <= 0) return;

    pendingUpdate = {
        index: selectedIndex,
        oldAmount: item.amount,
        newAmount: newAmount,
        oldCurrency: "USD",
        newCurrency: "USD"
    };

    document.getElementById("oldAmount").textContent = pendingUpdate.oldAmount;
    document.getElementById("newAmount").textContent = pendingUpdate.newAmount;

    document.getElementById("oldCurrency").textContent = pendingUpdate.oldCurrency;
    document.getElementById("newCurrency").textContent = pendingUpdate.newCurrency;

    settingsModal.classList.add("hidden");
    confirmModal.classList.remove("hidden");
})



addBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
});

closeModal.addEventListener("click", () => {
    modal.classList.add("hidden");
});

coinList.addEventListener("click", (e) => {
    if (e.target.classList.contains("settings-btn")) {
        selectedIndex = e.target.dataset.index;

        const item = portfolio[selectedIndex];

        document.querySelector("#settingsModal input").value = item.amount;

        settingsModal.classList.remove("hidden");
    }
});

closeSettings.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
});

settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.add("hidden");
    }
});

coinList.addEventListener("click", async (e) => {

    if (e.target.closest(".coin-item") && !e.target.classList.contains("settings-btn")) {
        const index = e.target.closest(".coin-item").querySelector(".settings-btn").dataset.index;

        selectedCoinIndex = index;

        openExtendedPanel(index);
    }

    if (e.target.classList.contains("filter")) {
        const index = e.target.dataset.index;
        const filter = e.target.dataset.filter;

        const item = portfolio[index];

        await setFilter(index, filter);
    }
});

document.querySelector(".add-btn").addEventListener("click", async () => {
    const coin = coinSelectModal.value;
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) return;

    const newItem = {
        coin,
        amount,
        price: 0,
        activeFilter: "1D",
        history: {}
    };

    portfolio.push(newItem);

    modal.classList.add("hidden");
    amountInput.value = "";

    await getHistoricalPrice(newItem, "1D");

    updateUI();
    connectSocket(coin);
});

document.getElementById("confirmYes").addEventListener("click", () => {
    const {index, newAmount} = pendingUpdate;

    portfolio[index].amount = newAmount;

    confirmModal.classList.add("hidden");

    updateUI();
});

document.getElementById("confirmNo").addEventListener("click", () => {
    confirmModal.classList.add("hidden");
    settingsModal.classList.remove("hidden");
});

document.querySelectorAll(".ext-filter").forEach(btn => {
    btn.addEventListener("click", async () => {

        const filter = btn.dataset.filter;

        document.querySelectorAll(".ext-filter")
        .forEach(b => b.classList.remove("active"));

        btn.classList.add("active");

        await setFilter(selectedCoinIndex, filter);
    })
})



function initChart() {
    const chartContainer = document.getElementById("chart");

    chart = LightweightCharts.createChart(chartContainer, {
        width: 400,
        height: 250,
        layout: {
            background: {color: "#f2f2f2"},
            textColor: "#000"
        },
        grid: {
            vertLines: {color:"#eee"},
            horzLines: {color:"#eee"}
        },
        timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: "#ccc"
        },
        crosshair: {
            mode: 1
        }, 
        rightPriceScale: {
            borderColor: "#ccc"
        }
    });

    candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries);

    candleSeries.priceScale().applyOptions({
        scaleMargins: {
            top: 0.2,
            bottom: 0.2,
        },
    });
}

function resizeChart() {
    if (!chart) return;

    const container = document.getElementById("chart");

    chart.applyOptions({
        width: container.offsetWidth
    });
}

window.addEventListener("resize", resizeChart);

function updateExtendedUI(item) {
    const base = item.history[item.activeFilter];

    let change = null;

    if (base && item.price) {
        change = ((item.price - base ) / base) * 100;
    }

    const isPositive = change !== null && change >= 0;
    const color = change === null ? "#999" : (isPositive ? "lime" : "red");
    const sign = isPositive ? "+" : "";

    const arrow = change === null
    ? ""
    : isPositive
    ?"▲"
    :"▼";

    document.getElementById("extendedPrice").innerHTML = `
    <span style="color:${color}">
    ${item.price.toFixed(2)} USD ${change !== null ? `${arrow} ${sign}${change.toFixed(2)}%` : ""}
    </span>
    `;

    document.getElementById("userAmount").textContent = item.amount;
    document.getElementById("userValue").textContent = 
    (item.amount * item.price).toFixed(2) + " USD";
}

function getStartTime(filter) {
    const now = Date.now();

    switch (filter) {
        case "1D":
            return now - 24 * 60 * 60* 1000;
        case "1W":
            return now - 7 * 24 * 60 * 60 * 1000;
        case "1M":
            return now - 30 * 24 * 60 * 60 * 1000;
        case "3M":
            return now - 90 * 24 * 60 * 60 * 1000;
        case "1Y":
            return now - 365 * 24 * 60 * 60 * 1000;
    }
}

async function fetchCandles(symbol, filter) {
    const { interval } = timeframeMap[filter];

    const startTime = getStartTime(filter);
    const endTime = Date.now();

    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=1000`;

    const res = await fetch(url);
    const data = await res.json();

    return data.map(candle => ({
        time: candle[0] / 1000,
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4])
    }));
}

async function loadChart(symbol, filter) {

    if (!candleSeries) {
        initChart();
    }
    const candles = await fetchCandles(symbol, filter);

    candleSeries.setData(candles);
}

window.addEventListener("resize", () => {
    if (chart) {
        chart.applyOptions({
            width: document.getElementById("chart").clientWidth
        });
    }
})

async function openExtendedPanel(index) {
    const panel = document.getElementById("extendedPanel");
    panel.classList.remove("hidden");

    const item = portfolio[index];

    document.querySelectorAll(".ext-filter").forEach(btn => {
        btn.classList.remove("active");

        if (btn.dataset.filter === item.activeFilter) {
            btn.classList.add("active");
        }
    });

    const symbol = item.coin;

    document.getElementById("extendedTitle").textContent = 
    symbol === "btcusdt" ? "BTC" : "ETH";

    setTimeout(async () => {
        if (!chart) {
            initChart();
        } 

        resizeChart();

        await loadChart(symbol, item.activeFilter);
    }, 100);

    updateExtendedUI(item);
    await loadTodayStats(symbol);
}

async function loadTodayStats(symbol) {
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}`;
    const res = await fetch(url);
    const data = await res.json();

    document.getElementById("avgPrice").textContent = 
    parseFloat(data.weightedAvgPrice).toFixed(2) + " USD";

    document.getElementById("highPrice").textContent = 
    parseFloat(data.highPrice).toFixed(2) + " USD";

    document.getElementById("lowPrice").textContent = 
    parseFloat(data.lowPrice).toFixed(2) + " USD";
}

async function fetchHistoricalPrice(symbol, filter) {
  const { interval, limit } = timeframeMap[filter];

  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data || data.length === 0) return null;

  const firstCandle = data[0];

  return parseFloat(firstCandle[1]);
}

async function getHistoricalPrice(item, filter) {
    if (item.history[filter] !== undefined) {
        return item.history[filter];
    }

    const price = await fetchHistoricalPrice(item.coin, filter);

    if (price) {
        item.history[filter] = price;
    }

    return price;
}

async function setFilter (index, filter) {
    const item = portfolio[index];

    item.activeFilter = filter;

    await getHistoricalPrice(item, filter);

    if (selectedCoinIndex === index) {
        await loadChart(item.coin, filter);
        updateExtendedUI(item);

        document.querySelectorAll(".ext-filter").forEach(btn => {
            btn.classList.remove("active");

            if(btn.dataset.filter === filter) {
                btn.classList.add("active");
            }
        });
    }

    updateUI();
}
function updateUI() {
    if (portfolio.length === 0) {
        emptyState.style.display = "flex";
        coinList.style.display = "none";
        return;
    }

    emptyState.style.display = "none";
    coinList.style.display = "block";

    coinList.innerHTML = portfolio.map((item, index) => {
        const symbol = item.coin === "btcusdt" ? "BTC" : "ETH";
        const total = item.price * item.amount;

        const base = item.history[item.activeFilter];

        let change = null;

        if(base && item.price) {
            change = ((item.price - base) / base) * 100;
        }

        const isPositive = change !== null && change >= 0;
        const color = change === null ? "#999" : (isPositive ? "lime" : "red");
        const sign = isPositive ? "+" : "";

        const arrow = change === null
        ? ""
        : isPositive
        ?"▲"
        :"▼";

        return `
        <div class="coin-item">
        <div class="coin-header">
        <div class="coin-title">${symbol}</div>
        <span class="settings-btn" data-index="${index}">⚙️</span>
        </div>
        
        <div class="coin-section">
        <div>Portfolio Value:</div>
        <div style="color:${color}">
        ${total.toFixed(2)} USD
        ${change !== null ? `${arrow}${sign}${change.toFixed(2)}%`: ""}
        </div>
        </div>

        <div class="coin-section">
        <div>Price:</div>
        <div>${item.price.toFixed(2)} USD</div>
        </div>
        
        <div class="coin-section">
        <div>Amount:</div>
        <div>${item.amount} ${symbol}</div>
        </div>
        
        <div class="time-filters">
        <span class="filter ${item.activeFilter === "1D" ? "active" : ""}" data-filter="1D" data-index="${index}">1 Day</span>
        <span class="filter ${item.activeFilter === "1W" ? "active" : ""}" data-filter="1W" data-index="${index}">1 Week</span>
        <span class="filter ${item.activeFilter === "1M" ? "active" : ""}" data-filter="1M" data-index="${index}">1 Month</span>
        <span class="filter ${item.activeFilter === "3M" ? "active" : ""}" data-filter="3M" data-index="${index}">3 Months</span>
        <span class="filter ${item.activeFilter === "1Y" ? "active" : ""}" data-filter="1Y" data-index="${index}">1 Year</span>
        </div>
        </div>
        `;
    }).join("");
}

function connectSocket(coin) {
    const socket = new WebSocket(`wss://stream.binance.com:9443/ws/${coin}@ticker`);

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const price = parseFloat(data.c);

        portfolio.forEach((item) => {
            if (item.coin === coin) {
                item.price = price;
            }
        });

        if (selectedCoinIndex !== null) {
            updateExtendedUI(portfolio[selectedCoinIndex]);
        }

        updateUI();
    };
}

updateUI();