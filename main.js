import * as Kopi from './utils/coffee.js';

async function createMultipleWallets(numWallets, apiKey) {
    const tokens = [];
    const headers = { Accept: '*/*' };
    await Kopi.profileRequest(headers);
    for (let i = 0; i < numWallets; i++) {
        Kopi.logger(`Creating wallet ${i + 1} of ${numWallets}`);
        const wallet = Kopi.generateWallet();

        const headersAuth = {
            Accept: '*/*',
            'x-recaptcha-response': await Kopi.solve2Captcha(apiKey),
        };

        try {
            let walletData = await Kopi.createWalletAndRequest(wallet, headersAuth);

            if (!walletData.token) {
                Kopi.logger(`Error creating wallet ${i + 1}, retrying...`);
                walletData = await Kopi.createWalletAndRequest(wallet, headersAuth);
            }

            if (walletData.token) tokens.push(walletData);
            else Kopi.logger(`Failed to create wallet ${i + 1} after retrying.`, "error");
        } catch (error) {
            Kopi.logger(`Error creating wallet ${i + 1}:`, "error", error);
        }
    }

    Kopi.saveToTokenFile(tokens);
}

async function main(apiKey) {
    const tokens = Kopi.loadTokens();

    if (!tokens) return;

    for (const [index, tokenEntry] of tokens.entries()) {
        Kopi.logger(`Processing Token #${index + 1}: Address: ${tokenEntry.address}`);
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenEntry.token}`,
        };

        try {
            const profile = await Kopi.profileRequest(headers);
            const response = await Kopi.connectRequest(headers);
            await new Promise(resolve => setTimeout(resolve, 1000 ));
            
            if (!response.error || response.result !== undefined) {
                Kopi.logger(JSON.stringify(response.result), "success");
            } else {
                Kopi.logger("Failed to connect to wallet.", "error");
            }
            
            if (response.status === 401 || response.status === 403) {
                Kopi.logger(`Token for ${tokenEntry.address} is expired. Re-authenticating...`, "error");

                const headersAuth = {
                    Accept: '*/*',
                    'x-recaptcha-response': await Kopi.solve2Captcha(apiKey),
                };
                await Kopi.profileRequest(headers);
                const walletData = await Kopi.createWalletAndRequest(tokenEntry, headersAuth);
                if (walletData.token) {
                    tokenEntry.token = walletData.token;
                    Kopi.saveToTokenFile(tokens);
                }
            } else if (response.status === 429){
                Kopi.logger(response.data, 'error');
            };
        } catch (error) {
            Kopi.logger(`Error processing token #${index + 1}:`, "error", error);
        }
    }
}

(async () => {
    const rl = Kopi.readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    Kopi.logger(Kopi.banner, "debug");

    try {
        // Menu
        Kopi.logger("Choose an option:\n1. Create and Register Wallets\n2. Load Existing Tokens and Run");
        const choice = await rl.question("Enter your choice (1 or 2): ");

        if (choice === "1") {
            // Register wallets and get token
            console.log("\x1b[31mFile accounts.json will be overwritten, make sure You Backup your accounts if it exists\x1b[0m");
            const numWalletsInput = await rl.question("How many wallets do you want to create? ");
            const apiKey = await rl.question("Enter your API key for captcha solving: ");

            const numWallets = parseInt(numWalletsInput, 10);

            if (isNaN(numWallets) || numWallets <= 0) {
                Kopi.logger('Invalid number of wallets. Please enter a positive integer.', "error");
                return;
            }

            Kopi.logger(`Creating ${numWallets} wallets...`);
            await createMultipleWallets(numWallets, apiKey);

        } else if (choice === "2") {
            //Load existing tokens
            const apiKey = await rl.question("Enter your API key for captcha solving: ");
            while (true) {
                await main(apiKey);
                Kopi.logger(`Cooldowns 5 minute...`)
                await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000 )); // 5 minute cooldowns
            }

        } else {
            // Invalid option
            Kopi.logger("Invalid choice. Please enter 1 or 2.", "error");
        }

    } catch (error) {
        Kopi.logger('An error occurred:', "error", error);
    } finally {
        rl.close();
    }
})();
