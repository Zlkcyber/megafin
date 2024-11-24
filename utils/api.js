import { signMessage } from './wallet.js';
import fetch from 'node-fetch';
async function coday(url, method, headers, payloadData = null) {
    
    try {
        let response;
        if (method === 'POST') {
            response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: payloadData ? JSON.stringify(payloadData) : undefined,
            });
        } else if (method === 'GET') {
            response = await fetch(url, {
                method: 'GET',
                headers: headers,
            });
        } else {
            throw new Error(`Unsupported HTTP method: ${method}`);
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); 
            return { error: true, status: response.status, data: response.statusText };
        }

        // Return parsed JSON for successful responses
        return await response.json();
    } catch (error) {
        console.error('Error in coday:', error);
        return { error: true, message: error.message };
    }
}
export async function createWalletAndRequest(wallet, headers) {
    const signature = await signMessage(wallet);

    const payload = {
        wallet_hash: signature,
        key: `megafin.xyz requests you to sign in with your wallet address: ${wallet.address}`,
        invite_code: '919d0976',
    };

    const response = await coday(
        'https://api.megafin.xyz/auth',
        'POST',
        headers,
        payload
    );

    return {
        address: wallet.address,
        privateKey: wallet.privateKey,
        token: response?.result?.token || null,
    };
}

export async function profileRequest(headers) {
    return coday('https://api.megafin.xyz/users/profile', 'GET', headers);
}

export async function connectRequest(headers) {
    return coday('https://api.megafin.xyz/users/connect', 'GET', headers);
}

export function showLoadingMessage(message) {
    process.stdout.write(`\r${message}`);
}

