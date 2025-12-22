import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { encodeFunctionData } from 'viem';
import { signSmartContractData } from '@wert-io/widget-sc-signer';
import dotenv from 'dotenv';
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.post('/api/wert/session', async (req, res) => {
    try {
        const { user_address, quantity = 1 } = req.body;
        const PRIVATE_KEY = process.env.WERT_PRIVATE_KEY;
        const SC_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;
        // 1. Calculate locked price ($50 per NFT)
        const UNIT_PRICE_USD = 50;
        const TOTAL_USD = UNIT_PRICE_USD * quantity;
        // Mock ETH conversion (In production, fetch real ETH price here)
        const ETH_PRICE = 3200;
        const totalEthAmount = parseFloat((TOTAL_USD / ETH_PRICE).toFixed(8));
        // 2. Encode the Mint function: mint(address to, uint256 quantity)
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
        // 3. Generate the Secure Signature
        const signatureData = {
            address: user_address, // The buyer
            commodity: "ETH",
            commodity_amount: totalEthAmount,
            network: "sepolia",
            sc_address: SC_ADDRESS,
            sc_input_data: sc_input_data,
        };
        const result = signSmartContractData(signatureData, PRIVATE_KEY);
        res.json({
            click_id: uuidv4(),
            signature: result.signature,
            sc_input_data,
            sc_address: SC_ADDRESS,
            fiat_amount: TOTAL_USD,
            eth_amount: totalEthAmount
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.listen(4000, () => console.log('Backend running on port 4000'));
