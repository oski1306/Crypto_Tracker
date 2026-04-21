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

let portfolio = [];
let selectedIndex = null;
let pendingUpdate = null;

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
        <span class="settings-btn" data-index="${index}">⚙️</span>
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