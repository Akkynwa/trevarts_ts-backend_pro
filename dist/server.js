import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import Web3 from 'web3';
import { signSmartContractData } from '@wert-io/widget-sc-signer';
dotenv.config();
const app = express();
const web3 = new Web3(); // Used for encoding the function call
app.use(cors());
app.use(express.json());
// --- PRODUCTION CONSTANTS ---
const TREASURY_ADDRESS = '0x7866F7cb1aa889A808eE9d225b60fce3d4BE7F3e';
const PARTNER_ID = process.env.WERT_PARTNER_ID;
const PRIVATE_KEY = process.env.WERT_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.NFT_CONTRACT;
const NFT_PRICE_USD = 1; // Updated to $1 as requested
const WERT_ORIGIN = "https://widget.wert.io";
const NETWORK = "ethereum";
const COMMODITY = "USDT"; // Changed from ETH to USDT
// --- SESSION ROUTE ---
app.post("/api/wert/session", async (req, res) => {
    try {
        const { quantity } = req.body;
        if (!quantity || quantity < 1) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }
        // 1. Calculate USDT Amount (1 USDT = $1 USD)
        // No live price fetch needed because USDT is pegged to USD
        const totalAmount = quantity * NFT_PRICE_USD;
        // 2. Encode Smart Contract Call using Web3.js (Client's Requirement)
        const scInputData = web3.eth.abi.encodeFunctionCall({
            name: 'UsdtBuyNft',
            type: 'function',
            inputs: [
                {
                    internalType: "address",
                    name: "to",
                    type: "address"
                },
                {
                    internalType: "uint256",
                    name: "nftQuantity",
                    type: "uint256"
                }
            ],
        }, [TREASURY_ADDRESS, quantity.toString()]);
        // 3. Prepare Signing Options for USDT
        const signingOptions = {
            address: TREASURY_ADDRESS,
            commodity: COMMODITY,
            network: NETWORK,
            sc_address: CONTRACT_ADDRESS,
            sc_input_data: scInputData,
            commodity_amount: totalAmount, // The amount of USDT to be sent
        };
        // 4. Sign the Data
        const signed = signSmartContractData(signingOptions, PRIVATE_KEY);
        // 5. Final Response to Frontend
        res.json({
            session_id: uuidv4(),
            partner_id: PARTNER_ID,
            origin: WERT_ORIGIN,
            network: NETWORK,
            commodity: COMMODITY,
            fiat_amount: totalAmount,
            commodity_amount: totalAmount,
            sc_address: CONTRACT_ADDRESS,
            sc_input_data: scInputData,
            signature: signed.signature,
            pk_id: 'key1',
        });
    }
    catch (err) {
        console.error('❌ Final Production Error:', err);
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/wert/webhook', (req, res) => {
    res.status(200).send('OK');
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 TrevArts USDT Production Backend Live`);
    console.log(`📍 Commodity: ${COMMODITY} | Price: $${NFT_PRICE_USD}`);
});
