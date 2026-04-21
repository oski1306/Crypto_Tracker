let socket;

const modal = document.getElementById("modal");
const addBtn = document.getElementById("addCoinBtn");
const closeModal = document.getElementById("closeModal");
const coinList = document.getElementById("coinList");
const emptyState = document.getElementById("empty-state");

const coinSelectModal = document.getElementById("coinSelectModal");
const amountInput = document.querySelector(".modal-content input");

let portfolio = [];

addBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
});

closeModal.addEventListener("click", () => {
    modal.classList.add("hidden");
});

document.querySelector(".add-btn").addEventListener("click", () => {
    const coin = coinSelectModal.value;
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) return;

    portfolio.push({
        coin,
        amount,
        price: 0
    });

    modal.classList.add("hidden");
    amountInput.value = "";

    updateUI();
    connectSocket(coin);
});

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

        return `
        <div class="coin-item">
        <div class="coin-header">
        <div class="coin-title">${symbol}</div>
        ⚙️
        </div>
        
        <div class="coin-section">
        <div>Current Price:</div>
        <div>${total.toFixed(2)} USD</div>
        </div>
        
        <div class="coin-section">
        <div>Amount:</div>
        <div>${item.amount} ${symbol}</div>
        </div>
        
        <div class="time-filters">
        <span>1 Day</span>
        <span>1 Week</span>
        <span>1 Month</span>
        <span>3 Months</span>
        <span>1 Year</span>
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

        updateUI();
    };
}

updateUI();