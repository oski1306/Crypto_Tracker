let usdToNok = 10.5;

async function updateRate(){
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    const data = await res.json();
    usdToNok = data.rates.NOK;
}

updateRate();

const socket = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@trade");

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const priceUSD = parseFloat(data.p);

    const priceNOK = priceUSD * usdToNok;

    console.log("Price:", priceNOK);
}