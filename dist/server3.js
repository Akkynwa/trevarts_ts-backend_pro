import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { encodeFunctionData } from 'viem';
import { signSmartContractData } from '@wert-io/widget-sc-signer';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.post('/api/wert/session', async (req, res) => {
    try {
        // const { user_address, quantity = 1 } = req.body;
        const user_address = '0x7866F7cb1aa889A808eE9d225b60fce3d4BE7F3e';
        const quantity = 1;
        if (!user_address || !user_address.startsWith('0x')) {
            return res.status(400).json({ error: 'Valid wallet identity (0x...) is required.' });
        }
        // 1. Fetch Real-Time ETH Price
        const priceResponse = await fetch('https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD');
        // FIX: Cast the response to our defined interface
        const priceData = (await priceResponse.json());
        // Now TypeScript knows that .USD exists and is a number
        const ETH_PRICE = priceData.USD;
        // 2. Financial Logic
        const UNIT_PRICE_USD = 50;
        const TOTAL_FIAT_AMOUNT = UNIT_PRICE_USD * quantity;
        const totalEthAmount = parseFloat((TOTAL_FIAT_AMOUNT / ETH_PRICE).toFixed(8));
        // 3. Encode Smart Contract "Mint" Function
        const sc_input_data = encodeFunctionData({
            abi: [{
                    inputs: [
                        { name: "to", type: "address" },
                        { name: "quantity", type: "uint256" }
                    ],
                    name: "mint",
                    type: "function",
                    stateMutability: "payable"
                }],
            functionName: 'mint',
            args: [user_address, BigInt(quantity)]
        });
        const session_id = uuidv4();
        // 4. Sign Data for Mainnet
        const signatureData = {
            address: user_address,
            commodity: "ETH",
            commodity_amount: totalEthAmount,
            network: "ethereum",
            sc_address: process.env.NFT_CONTRACT_ADDRESS,
            sc_input_data: sc_input_data,
        };
        const signedResult = signSmartContractData(signatureData, process.env.WERT_PRIVATE_KEY);
        res.json({
            session_id: session_id,
            signature: signedResult.signature,
            sc_address: process.env.NFT_CONTRACT_ADDRESS,
            sc_input_data: sc_input_data,
            fiat_amount: TOTAL_FIAT_AMOUNT,
            eth_amount: totalEthAmount
        });
        console.log(`✅ Session Created: ${session_id} | Identity: ${user_address} | Amount: $${TOTAL_FIAT_AMOUNT}`);
    }
    catch (error) {
        console.error("Critical Backend Error:", error);
        res.status(500).json({ error: "Internal server error during session initialization." });
    }
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 TrevArts Gateway Backend live on port ${PORT}`);
});
