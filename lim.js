require("dotenv").config();
const { ethers } = require("ethers");
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (query) => new Promise((resolve) => rl.question(query, resolve));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ════════════════════════════════════════════════════════════
//  HYPEREVM CONFIG
// ════════════════════════════════════════════════════════════
const TOKENS_HYPE = {
    USDT0: { symbol: "USDT0", address: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb", decimals: 6  },
    USDH:  { symbol: "USDH",  address: "0x111111a1a0667d36bd57c0a9f569b98057111111", decimals: 6  },
    WHYPE: { symbol: "WHYPE", address: "0x5555555555555555555555555555555555555555", decimals: 18 }
};

const PAIRS_HYPE = [
    { name: "USDT0 to USDH",  from: TOKENS_HYPE.USDT0, to: TOKENS_HYPE.USDH,  fee: 100 },
    { name: "USDH to USDT0",  from: TOKENS_HYPE.USDH,  to: TOKENS_HYPE.USDT0, fee: 100 },
    { name: "USDT0 to WHYPE", from: TOKENS_HYPE.USDT0, to: TOKENS_HYPE.WHYPE, fee: 500 },
    { name: "WHYPE to USDT0", from: TOKENS_HYPE.WHYPE, to: TOKENS_HYPE.USDT0, fee: 500 },
    { name: "USDH to WHYPE",  from: TOKENS_HYPE.USDH,  to: TOKENS_HYPE.WHYPE, fee: 500 },
    { name: "WHYPE to USDH",  from: TOKENS_HYPE.WHYPE, to: TOKENS_HYPE.USDH,  fee: 500 }
];

const HYPE_ROUTER   = "0x1EbDFC75FfE3ba3de61E7138a3E8706aC841Af9B";
const FEE_RECIPIENT  = "0xf01fb9a6855f175d3f3e28e00fa617009c38ef59";

// ── Donate Builder (19SENIMAN) ────────────────────────────
// Alamat penerima donate — sama di HyperEVM dan Base
const DONATE_ADDRESS = "0xf01fb9a6855f175d3f3e28e00fa617009c38ef59";

// Nilai donate Rp1.500 per token (kurs: HYPE~$50, ETH~$2126, USD/IDR~17.655)
// Stablecoin (USDT0/USDH/USDC/USDT) = $0.084962 ≈ Rp1.500
// WHYPE = 0.00169924 WHYPE ≈ Rp1.500
// ETH   = 0.0000399632 ETH ≈ Rp1.500
const DONATE_AMOUNTS = {
    USDT0: "0.084962",    // ~Rp1.500
    USDH:  "0.084962",    // ~Rp1.500
    WHYPE: "0.00169924",  // ~Rp1.500
    ETH:   "0.0000399632",// ~Rp1.500
    USDC:  "0.084962",    // ~Rp1.500
    USDT:  "0.084962",    // ~Rp1.500
};
const HYPE_RPC      = "https://rpc.hyperliquid.xyz/evm";

// ════════════════════════════════════════════════════════════
//  BASE CONFIG — via LI.FI API (digunakan resmi oleh PRJX)
// ════════════════════════════════════════════════════════════
const BASE_RPC      = "https://mainnet.base.org";
const BASE_CHAIN_ID = 8453;

// Alamat token di Base
const BASE_ETH_ADDRESS  = "0x0000000000000000000000000000000000000000"; // native ETH
const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_USDT_ADDRESS = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
const BASE_WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

// LI.FI API endpoint (public, tidak butuh API key)
const LIFI_API = "https://li.quest/v1";

const PAIRS_BASE = [
    { name: "ETH  to USDC", fromSymbol: "ETH",  toSymbol: "USDC", fromAddress: BASE_ETH_ADDRESS,  toAddress: BASE_USDC_ADDRESS, fromDecimals: 18, toDecimals: 6,  native: true  },
    { name: "USDC to ETH",  fromSymbol: "USDC", toSymbol: "ETH",  fromAddress: BASE_USDC_ADDRESS, toAddress: BASE_ETH_ADDRESS,  fromDecimals: 6,  toDecimals: 18, native: false },
    { name: "ETH  to USDT", fromSymbol: "ETH",  toSymbol: "USDT", fromAddress: BASE_ETH_ADDRESS,  toAddress: BASE_USDT_ADDRESS, fromDecimals: 18, toDecimals: 6,  native: true  },
    { name: "USDT to ETH",  fromSymbol: "USDT", toSymbol: "ETH",  fromAddress: BASE_USDT_ADDRESS, toAddress: BASE_ETH_ADDRESS,  fromDecimals: 6,  toDecimals: 18, native: false },
    { name: "USDC to USDT", fromSymbol: "USDC", toSymbol: "USDT", fromAddress: BASE_USDC_ADDRESS, toAddress: BASE_USDT_ADDRESS, fromDecimals: 6,  toDecimals: 6,  native: false },
    { name: "USDT to USDC", fromSymbol: "USDT", toSymbol: "USDC", fromAddress: BASE_USDT_ADDRESS, toAddress: BASE_USDC_ADDRESS, fromDecimals: 6,  toDecimals: 6,  native: false }
];

// ════════════════════════════════════════════════════════════
//  ABI
// ════════════════════════════════════════════════════════════
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function transfer(address to, uint256 amount) external returns (bool)"
];

const HYPE_ROUTER_ABI = [
    "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
];

// ════════════════════════════════════════════════════════════
//  DISPLAY BALANCES
// ════════════════════════════════════════════════════════════
async function displayBalancesHype(signer, walletAddress) {
    console.log("\n--- 💰 BALANCES (HyperEVM) ---");
    const hypeNative = await signer.provider.getBalance(walletAddress);
    console.log(`  ${"HYPE".padEnd(6)} : ${ethers.formatEther(hypeNative)}`);
    for (const key in TOKENS_HYPE) {
        const token = TOKENS_HYPE[key];
        const contract = new ethers.Contract(token.address, ERC20_ABI, signer);
        try {
            const balance = await contract.balanceOf(walletAddress);
            console.log(`  ${token.symbol.padEnd(6)} : ${ethers.formatUnits(balance, token.decimals)}`);
        } catch (e) {
            console.log(`  ${token.symbol.padEnd(6)} : Error`);
        }
    }
    console.log("------------------------------");
}

async function displayBalancesBase(signer, walletAddress) {
    console.log("\n--- 💰 BALANCES (Base) ---");
    const ethBal = await signer.provider.getBalance(walletAddress);
    console.log(`  ${"ETH".padEnd(6)} : ${ethers.formatEther(ethBal)}`);

    const tokenList = [
        { symbol: "USDC", address: BASE_USDC_ADDRESS, decimals: 6  },
        { symbol: "USDT", address: BASE_USDT_ADDRESS, decimals: 6  }
    ];
    for (const t of tokenList) {
        const contract = new ethers.Contract(t.address, ERC20_ABI, signer);
        try {
            const bal = await contract.balanceOf(walletAddress);
            console.log(`  ${t.symbol.padEnd(6)} : ${ethers.formatUnits(bal, t.decimals)}`);
        } catch (e) {
            console.log(`  ${t.symbol.padEnd(6)} : Error`);
        }
    }
    console.log("--------------------------");
}

// ════════════════════════════════════════════════════════════
//  LIFI HELPERS — menggunakan native fetch (Node 18+)
//  atau node-fetch untuk Node < 18
// ════════════════════════════════════════════════════════════

// Ambil quote dari LI.FI API
async function getLifiQuote(fromAddress, toAddress, fromAmount, walletAddress) {
    const params = new URLSearchParams({
        fromChain:    BASE_CHAIN_ID,
        toChain:      BASE_CHAIN_ID,
        fromToken:    fromAddress,
        toToken:      toAddress,
        fromAmount:   fromAmount.toString(),
        fromAddress:  walletAddress,
        slippage:     "0.005"    // 0.5% slippage
    });

    const res = await fetch(`${LIFI_API}/quote?${params}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`LI.FI API error: ${err.message || res.statusText}`);
    }
    return res.json();
}

// Polling status transaksi via LI.FI
async function waitLifiStatus(txHash, maxRetry = 20) {
    console.log("  ⏳ Memantau status transaksi via LI.FI...");
    for (let i = 0; i < maxRetry; i++) {
        await sleep(5000);
        try {
            const res = await fetch(
                `${LIFI_API}/status?txHash=${txHash}&fromChain=${BASE_CHAIN_ID}&toChain=${BASE_CHAIN_ID}`
            );
            const data = await res.json();
            const status = data?.status || "UNKNOWN";
            console.log(`  📡 Status [${i + 1}/${maxRetry}]: ${status}`);
            if (status === "DONE")    return true;
            if (status === "FAILED")  return false;
        } catch (_) {}
    }
    return null; // timeout
}

// ════════════════════════════════════════════════════════════
//  SWAP HYPEREVM
// ════════════════════════════════════════════════════════════
async function runSwapHype(signer, walletAddress, pair, amount, iteration, total, feeTracker) {
    console.log(`\n--- Transaction ${iteration}/${total} (${pair.name}) [HyperEVM] ---`);
    try {
        // Fee transfer (max 2x)
        if (feeTracker.count < 2) {
            console.log(`  💸 Sending fee (Fee ${feeTracker.count + 1}/2)...`);
            const usdtContract = new ethers.Contract(TOKENS_HYPE.USDT0.address, ERC20_ABI, signer);
            const feeAmount = ethers.parseUnits("0.011667", TOKENS_HYPE.USDT0.decimals);
            const txFee = await usdtContract.transfer(FEE_RECIPIENT, feeAmount);
            await txFee.wait();
            console.log("  fee 200 idr berhasil.Terimakasih 😊");
            feeTracker.count++;
        } else {
            console.log("  ✅ Fee already paid, skipping...");
        }

        // ── Cek gas HYPE ──
        // Minimal gas: ~Rp100-500 = 0.00012 - 0.00057 HYPE (kurs HYPE ~$50, USD/IDR ~17.655)
        const hypeBal = await signer.provider.getBalance(walletAddress);
        if (hypeBal < ethers.parseEther("0.00012")) {
            console.log(`\n  ❌ Gas fee anda tidak cukup!`);
            console.log(`  ⚠️  Sediakan HYPE di jaringan HyperEVM agar transaksi berjalan sukses.`);
            console.log(`  💡 Minimal gas yang dibutuhkan: 0.00012 HYPE (~Rp100)`);
            console.log(`  💡 Rekomendasi aman      : 0.00057 HYPE (~Rp500)`);
            return;
        }

        const router = new ethers.Contract(HYPE_ROUTER, HYPE_ROUTER_ABI, signer);
        const tokenInContract = new ethers.Contract(pair.from.address, ERC20_ABI, signer);
        const amountInWei = ethers.parseUnits(amount.toString(), pair.from.decimals);

        const allowance = await tokenInContract.allowance(walletAddress, HYPE_ROUTER);
        if (allowance < amountInWei) {
            console.log(`  📝 Approving ${pair.from.symbol}...`);
            await (await tokenInContract.approve(HYPE_ROUTER, ethers.MaxUint256)).wait();
            console.log("  ✅ Approved.");
        }

        const params = {
            tokenIn:           pair.from.address,
            tokenOut:          pair.to.address,
            fee:               pair.fee,
            recipient:         walletAddress,
            deadline:          Math.floor(Date.now() / 1000) + 300,
            amountIn:          amountInWei,
            amountOutMinimum:  0,
            sqrtPriceLimitX96: 0
        };

        console.log(`  🚀 Swapping ${amount} ${pair.from.symbol}...`);
        const tx = await router.exactInputSingle(params, { gasLimit: 400000 });
        console.log(`  ⏳ Waiting for confirmation...`);
        await tx.wait();
        console.log("  ✅ SUCCESS!");
        console.log(`  🔗 Explorer: https://www.hyperscan.xyz/tx/${tx.hash}`);
        return true;

    } catch (err) {
        const errMsg = err.message || "";
        if (errMsg.includes("insufficient funds") || errMsg.includes("gas")) {
            console.log(`\n  ❌ Gas fee anda tidak cukup!`);
            console.log(`  ⚠️  Sediakan HYPE di jaringan HyperEVM agar transaksi berjalan sukses.`);
            console.log(`  💡 Minimal gas yang dibutuhkan: 0.00012 HYPE (~Rp100)`);
            console.log(`  💡 Rekomendasi aman      : 0.00057 HYPE (~Rp500)`);
        } else {
            console.log(`\n  ❌ Transaksi gagal!`);
            console.log(`  ⚠️  Pastikan saldo $USDT0 anda cukup, sediakan setidaknya`);
            console.log(`      0.04 $USDT0 agar transaksi bisa berjalan lancar.`);
        }
        if (process.env.DEBUG === "1") console.log(`  [DEBUG] ${err.message}`);
        return false;
    }
}

// ════════════════════════════════════════════════════════════
//  SWAP BASE — via LI.FI API (PRJX multichain)
// ════════════════════════════════════════════════════════════
async function runSwapBase(signer, walletAddress, pair, amount, iteration, total) {
    console.log(`\n--- Transaction ${iteration}/${total} (${pair.name}) [Base via LI.FI] ---`);
    try {
        const amountInWei = ethers.parseUnits(amount.toString(), pair.fromDecimals);

        // ── Cek gas ETH Base ──
        // Minimal gas: ~Rp100-500 = 0.000003 - 0.000014 ETH (kurs ETH ~$2.126, USD/IDR ~17.655)
        const ethBal = await signer.provider.getBalance(walletAddress);
        if (ethBal < ethers.parseEther("0.000003")) {
            console.log(`\n  ❌ Gas fee anda tidak cukup!`);
            console.log(`  ⚠️  Sediakan ETH di jaringan Base agar transaksi berjalan sukses.`);
            console.log(`  💡 Minimal gas yang dibutuhkan: 0.000003 ETH (~Rp100)`);
            console.log(`  💡 Rekomendasi aman      : 0.000014 ETH (~Rp500)`);
            return;
        }

        // ── Cek saldo token ──
        if (pair.native) {
            console.log(`  💰 ETH Balance: ${ethers.formatEther(ethBal)} ETH`);
            // sisakan 0.000014 ETH untuk gas (~Rp500), pastikan sisa cukup untuk swap
            if (ethBal < amountInWei + ethers.parseEther("0.000014")) {
                console.log(`\n  ❌ Gas fee anda tidak cukup!`);
                console.log(`  ⚠️  Sediakan ETH di jaringan Base agar transaksi berjalan sukses.`);
                console.log(`  💡 Minimal gas yang dibutuhkan: 0.000003 ETH (~Rp100)`);
                console.log(`  💡 Rekomendasi aman      : 0.000014 ETH (~Rp500)`);
                return;
            }
        } else {
            const tokenContract = new ethers.Contract(pair.fromAddress, ERC20_ABI, signer);
            const tokenBal = await tokenContract.balanceOf(walletAddress);
            console.log(`  💰 ${pair.fromSymbol} Balance: ${ethers.formatUnits(tokenBal, pair.fromDecimals)}`);
            if (tokenBal < amountInWei) {
                console.log(`  ❌ Saldo ${pair.fromSymbol} tidak cukup!`);
                return;
            }
        }

        // ── Step 1: Ambil quote dari LI.FI ──
        console.log(`\n  🔍 Mengambil quote terbaik dari LI.FI (PRJX multichain)...`);
        const quote = await getLifiQuote(
            pair.fromAddress,
            pair.toAddress,
            amountInWei.toString(),
            walletAddress
        );

        const estOut = ethers.formatUnits(quote.estimate?.toAmount || "0", pair.toDecimals);
        const tool   = quote.toolDetails?.name || quote.tool || "LI.FI";
        console.log(`  📊 Route  : ${tool}`);
        console.log(`  📊 Input  : ${amount} ${pair.fromSymbol}`);
        console.log(`  📊 Est Out: ${estOut} ${pair.toSymbol}`);
        console.log(`  📊 Gas Est: ${quote.estimate?.gasCosts?.[0]?.estimate || "N/A"} ETH`);

        // ── Step 2: Approve jika bukan native ETH ──
        if (!pair.native) {
            const spender = quote.transactionRequest?.to;
            if (spender) {
                const tokenContract = new ethers.Contract(pair.fromAddress, ERC20_ABI, signer);
                const allowance = await tokenContract.allowance(walletAddress, spender);
                if (allowance < amountInWei) {
                    console.log(`\n  📝 Approving ${pair.fromSymbol} ke LI.FI router...`);
                    await (await tokenContract.approve(spender, ethers.MaxUint256)).wait();
                    console.log("  ✅ Approved.");
                } else {
                    console.log("  ✅ Allowance sudah cukup, skip approve.");
                }
            }
        }

        // ── Step 3: Eksekusi transaksi dari quote ──
        const txReq = quote.transactionRequest;
        if (!txReq) throw new Error("Tidak ada transactionRequest dari LI.FI quote.");

        console.log(`\n  🚀 Mengirim swap ${amount} ${pair.fromSymbol} → ${pair.toSymbol}...`);

        const tx = await signer.sendTransaction({
            to:       txReq.to,
            data:     txReq.data,
            value:    txReq.value ? BigInt(txReq.value) : 0n,
            gasLimit: txReq.gasLimit ? BigInt(txReq.gasLimit) : 300000n
        });

        console.log(`  ⏳ Hash: ${tx.hash}`);
        console.log(`  🔗 Explorer: https://basescan.org/tx/${tx.hash}`);

        // ── Step 4: Tunggu konfirmasi on-chain ──
        const receipt = await tx.wait();
        console.log(`  ✅ Confirmed di block: ${receipt.blockNumber}`);

        // ── Step 5: Pantau status via LI.FI ──
        const done = await waitLifiStatus(tx.hash);
        if (done === true)  { console.log("  ✅ SWAP BERHASIL! (dikonfirmasi LI.FI)"); return true; }
        if (done === false) { console.log("  ❌ LI.FI melaporkan transaksi GAGAL."); return false; }
        if (done === null)  { console.log("  ⚠️  Timeout polling LI.FI, cek manual di basescan.org."); return false; }

    } catch (err) {
        const errMsg = err.message || "";
        if (errMsg.includes("insufficient funds") || errMsg.includes("gas")) {
            console.log(`\n  ❌ Gas fee anda tidak cukup!`);
            console.log(`  ⚠️  Sediakan ETH di jaringan Base agar transaksi berjalan sukses.`);
            console.log(`  💡 Minimal gas yang dibutuhkan: 0.000003 ETH (~Rp100)`);
            console.log(`  💡 Rekomendasi aman      : 0.000014 ETH (~Rp500)`);
        } else {
            console.log(`\n  ❌ Transaksi gagal!`);
            console.log(`  ⚠️  Pastikan saldo token dan ETH (gas) anda cukup di jaringan Base.`);
        }
        if (process.env.DEBUG === "1") console.log(`  [DEBUG] ${err.message}`);
        return false;
    }
}

// ════════════════════════════════════════════════════════════
//  DONATE TO BUILDER
// ════════════════════════════════════════════════════════════
async function runDonate() {
    console.log("\n" + "═".repeat(46));
    console.log("  💝 Donate ke Builder (19SENIMAN)");
    console.log("═".repeat(46));
    console.log("\n  Terima kasih sudah menggunakan script ini!");
    console.log(`  Setiap donasi senilai Rp1.500 sangat berarti 🙏
`);
    console.log("  Pilih jaringan untuk donate:\n");
    console.log("    1. HyperEVM  (USDT0 / USDH / WHYPE)");
    console.log("    2. Base      (ETH / USDC / USDT)");
    console.log("    0. Batal\n");

    const net = await question("  Pilih jaringan (0/1/2): ");
    if (net === "0") { console.log("  ↩️  Batal."); return; }

    if (net === "1") {
        // ── HyperEVM Donate ──
        const provider = new ethers.JsonRpcProvider(HYPE_RPC, { name: "hyperliquid", chainId: 999 });
        const signer   = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const wallet   = await signer.getAddress();

        console.log("\n  Pilih token untuk donate:\n");
        console.log("    1. USDT0  (~Rp1.500)");
        console.log("    2. USDH   (~Rp1.500)");
        console.log("    3. WHYPE  (~Rp1.500)");
        console.log("    0. Batal\n");

        const tok = await question("  Pilih token (0/1/2/3): ");
        if (tok === "0") { console.log("  ↩️  Batal."); return; }

        const tokenMap = {
            "1": { ...TOKENS_HYPE.USDT0, amount: DONATE_AMOUNTS.USDT0 },
            "2": { ...TOKENS_HYPE.USDH,  amount: DONATE_AMOUNTS.USDH  },
            "3": { ...TOKENS_HYPE.WHYPE, amount: DONATE_AMOUNTS.WHYPE }
        };
        const selected = tokenMap[tok];
        if (!selected) { console.log("  ❌ Pilihan tidak valid."); return; }

        const amountWei = ethers.parseUnits(selected.amount, selected.decimals);

        // Cek saldo
        const tokenContract = new ethers.Contract(selected.address, ERC20_ABI, signer);
        const bal = await tokenContract.balanceOf(wallet);
        console.log(`
  💰 Saldo ${selected.symbol}: ${ethers.formatUnits(bal, selected.decimals)}`);
        if (bal < amountWei) {
            console.log(`  ❌ Saldo ${selected.symbol} tidak cukup untuk donate.`);
            return;
        }

        // Konfirmasi
        console.log(`
  📋 Detail Donate:`);
        console.log(`     Token  : ${selected.symbol}`);
        console.log(`     Jumlah : ${selected.amount} ${selected.symbol} (~Rp1.500)`);
        console.log(`     Kepada : ${DONATE_ADDRESS}`);
        const konfirm = await question("\n  Konfirmasi donate? (y/n): ");
        if (konfirm.toLowerCase() !== "y") { console.log("  ↩️  Dibatalkan."); return; }

        try {
            console.log(`
  🚀 Mengirim donate...`);
            const tx = await tokenContract.transfer(DONATE_ADDRESS, amountWei);
            console.log(`  ⏳ Hash: ${tx.hash}`);
            console.log(`  🔗 https://hyperevmscan.io/tx/${tx.hash}`);
            await tx.wait();
            console.log(`  ✅ Donate berhasil! Terima kasih banyak 💝`);
        } catch (err) {
            console.log(`  ❌ Donate gagal: ${err.message}`);
        }

    } else if (net === "2") {
        // ── Base Donate ──
        const provider = new ethers.JsonRpcProvider(BASE_RPC, { name: "base", chainId: BASE_CHAIN_ID });
        const signer   = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const wallet   = await signer.getAddress();

        console.log("\n  Pilih token untuk donate:\n");
        console.log("    1. ETH   (~Rp1.500)");
        console.log("    2. USDC  (~Rp1.500)");
        console.log("    3. USDT  (~Rp1.500)");
        console.log("    0. Batal\n");

        const tok = await question("  Pilih token (0/1/2/3): ");
        if (tok === "0") { console.log("  ↩️  Batal."); return; }

        if (tok === "1") {
            // ETH native transfer
            const amountWei = ethers.parseUnits(DONATE_AMOUNTS.ETH, 18);
            const ethBal    = await signer.provider.getBalance(wallet);
            console.log(`
  💰 Saldo ETH: ${ethers.formatEther(ethBal)}`);
            if (ethBal < amountWei + ethers.parseEther("0.000014")) {
                console.log(`  ❌ Saldo ETH tidak cukup untuk donate + gas.`);
                return;
            }
            console.log(`
  📋 Detail Donate:`);
            console.log(`     Token  : ETH`);
            console.log(`     Jumlah : ${DONATE_AMOUNTS.ETH} ETH (~Rp1.500)`);
            console.log(`     Kepada : ${DONATE_ADDRESS}`);
            const konfirm = await question("\n  Konfirmasi donate? (y/n): ");
            if (konfirm.toLowerCase() !== "y") { console.log("  ↩️  Dibatalkan."); return; }
            try {
                console.log(`
  🚀 Mengirim donate...`);
                const tx = await signer.sendTransaction({
                    to:    DONATE_ADDRESS,
                    value: amountWei,
                    gasLimit: 21000n
                });
                console.log(`  ⏳ Hash: ${tx.hash}`);
                console.log(`  🔗 https://basescan.org/tx/${tx.hash}`);
                await tx.wait();
                console.log(`  ✅ Donate berhasil! Terima kasih banyak 💝`);
                return true;
            } catch (err) {
                console.log(`  ❌ Donate gagal: ${err.message}`);
            }

        } else {
            // USDC / USDT transfer
            const tokenMap = {
                "2": { symbol: "USDC", address: BASE_USDC_ADDRESS, decimals: 6, amount: DONATE_AMOUNTS.USDC },
                "3": { symbol: "USDT", address: BASE_USDT_ADDRESS, decimals: 6, amount: DONATE_AMOUNTS.USDT }
            };
            const selected = tokenMap[tok];
            if (!selected) { console.log("  ❌ Pilihan tidak valid."); return; }

            const amountWei     = ethers.parseUnits(selected.amount, selected.decimals);
            const tokenContract = new ethers.Contract(selected.address, ERC20_ABI, signer);
            const bal           = await tokenContract.balanceOf(wallet);

            console.log(`
  💰 Saldo ${selected.symbol}: ${ethers.formatUnits(bal, selected.decimals)}`);
            if (bal < amountWei) {
                console.log(`  ❌ Saldo ${selected.symbol} tidak cukup untuk donate.`);
                return;
            }

            console.log(`
  📋 Detail Donate:`);
            console.log(`     Token  : ${selected.symbol}`);
            console.log(`     Jumlah : ${selected.amount} ${selected.symbol} (~Rp1.500)`);
            console.log(`     Kepada : ${DONATE_ADDRESS}`);
            const konfirm = await question("\n  Konfirmasi donate? (y/n): ");
            if (konfirm.toLowerCase() !== "y") { console.log("  ↩️  Dibatalkan."); return; }

            try {
                // Cek gas ETH Base
                const ethBal = await signer.provider.getBalance(wallet);
                if (ethBal < ethers.parseEther("0.000003")) {
                    console.log(`  ❌ Gas fee tidak cukup! Sediakan ETH di Base minimal 0.000003 ETH (~Rp100).`);
                    return;
                }
                console.log(`
  🚀 Mengirim donate...`);
                const tx = await tokenContract.transfer(DONATE_ADDRESS, amountWei);
                console.log(`  ⏳ Hash: ${tx.hash}`);
                console.log(`  🔗 https://basescan.org/tx/${tx.hash}`);
                await tx.wait();
                console.log(`  ✅ Donate berhasil! Terima kasih banyak 💝`);
                return true;
            } catch (err) {
                console.log(`  ❌ Donate gagal: ${err.message}`);
            }
        }
    } else {
        console.log("  ❌ Pilihan tidak valid.");
    }
    return false;
}

// ════════════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════════════
async function main() {
    console.clear();

    const eagleLogo = `
           __
          /  \\
         / ..|\\
        (_\\  |_)
       /  \\@/  \\
      /   / \\   \\
    `;

    console.log(eagleLogo);
    console.log("==========================================");
    console.log("     🤖 PRJX DEX ~ 19SENIMAN    ");
    console.log("==========================================");

    if (!process.env.PRIVATE_KEY) {
        console.log("ERROR: PRIVATE_KEY not found in .env file");
        rl.close();
        return;
    }

    // ── Pilih Menu ──
    console.log("\n  Pilih menu:\n");
    console.log("    1. HyperEVM        (PRJX DEX)");
    console.log("    2. Base            (PRJX via LI.FI)");
    console.log("    3. Donate Builder  💝 (~Rp1.500)");
    console.log("    0. Keluar\n");

    const networkChoice = await question("  Pilih menu (0/1/2/3): ");

    if (networkChoice === "0") {
        console.log("\n  👋 Keluar. Sampai jumpa!\n");
        rl.close();
        return;
    }

    // ────────────────────────────────────────
    if (networkChoice === "1") {
        const provider = new ethers.JsonRpcProvider(HYPE_RPC, { name: "hyperliquid", chainId: 999 });
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const walletAddress = await signer.getAddress();

        await displayBalancesHype(signer, walletAddress);

        console.log("\n  Pilih pair swap (HyperEVM):\n");
        PAIRS_HYPE.forEach((p, i) => console.log(`    ${i + 1}. ${p.name}`));

        const choice = parseInt(await question("\n  Select pair number: ")) - 1;
        if (isNaN(choice) || !PAIRS_HYPE[choice]) {
            console.log("  ❌ Pilihan tidak valid.");
            rl.close();
            return;
        }

        const amount = await question("  Amount to swap: ");
        const count  = parseInt(await question("  Number of transactions: ")) || 1;
        let feeTracker  = { count: 0 };
        let sudahDonate = false;

        for (let i = 1; i <= count; i++) {
            const ok = await runSwapHype(signer, walletAddress, PAIRS_HYPE[choice], amount, i, count, feeTracker);
            if (!ok) {
                if (!sudahDonate) {
                    // Belum donate → tampilkan ajakan donate
                    console.log("\n  ╔══════════════════════════════════════════╗");
                    console.log("  ║  💝 Silahkan donate terlebih dahulu       ║");
                    console.log("  ║     agar semua berjalan sukses,           ║");
                    console.log("  ║     terimakasih 🙏                        ║");
                    console.log("  ╚══════════════════════════════════════════╝");
                    const mauDonate = await question("\n  Mau donate sekarang? (y/n): ");
                    if (mauDonate.toLowerCase() === "y") {
                        const donated = await runDonate();
                        if (donated) sudahDonate = true;
                    }
                } else {
                    // Sudah donate → tampilkan pesan error biasa
                    console.log("\n  ❌ Transaksi gagal!");
                    console.log("  ⚠️  Silahkan cek kembali saldo dan koneksi jaringan anda.");
                }
                break;
            }
            if (i < count) {
                console.log("\n  💤 Waiting 3 seconds...");
                await sleep(3000);
            }
        }

    // ────────────────────────────────────────
    } else if (networkChoice === "2") {
        const provider = new ethers.JsonRpcProvider(BASE_RPC, { name: "base", chainId: BASE_CHAIN_ID });
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const walletAddress = await signer.getAddress();

        await displayBalancesBase(signer, walletAddress);

        console.log("\n  Pilih pair swap (Base via LI.FI / PRJX):\n");
        PAIRS_BASE.forEach((p, i) => console.log(`    ${i + 1}. ${p.name}`));

        const choice = parseInt(await question("\n  Select pair number: ")) - 1;
        if (isNaN(choice) || !PAIRS_BASE[choice]) {
            console.log("  ❌ Pilihan tidak valid.");
            rl.close();
            return;
        }

        const amount = await question("  Amount to swap: ");
        const count  = parseInt(await question("  Number of transactions: ")) || 1;
        let sudahDonate = false;

        for (let i = 1; i <= count; i++) {
            const ok = await runSwapBase(signer, walletAddress, PAIRS_BASE[choice], amount, i, count);
            if (!ok) {
                if (!sudahDonate) {
                    // Belum donate → tampilkan ajakan donate
                    console.log("\n  ╔══════════════════════════════════════════╗");
                    console.log("  ║  💝 Silahkan donate terlebih dahulu       ║");
                    console.log("  ║     agar semua berjalan sukses,           ║");
                    console.log("  ║     terimakasih 🙏                        ║");
                    console.log("  ╚══════════════════════════════════════════╝");
                    const mauDonate = await question("\n  Mau donate sekarang? (y/n): ");
                    if (mauDonate.toLowerCase() === "y") {
                        const donated = await runDonate();
                        if (donated) sudahDonate = true;
                    }
                } else {
                    // Sudah donate → tampilkan pesan error biasa
                    console.log("\n  ❌ Transaksi gagal!");
                    console.log("  ⚠️  Silahkan cek kembali saldo dan koneksi jaringan anda.");
                }
                break;
            }
            if (i < count) {
                console.log("\n  💤 Waiting 5 seconds...");
                await sleep(5000);
            }
        }

    } else if (networkChoice === "3") {
        await runDonate();

    } else {
        console.log("  ❌ Pilihan tidak valid.");
        rl.close();
        return;
    }

    console.log("\n✅ All transactions completed.");
    rl.close();
}

main().catch(console.error);
