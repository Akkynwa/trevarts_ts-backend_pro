import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { encodeFunctionData } from 'viem';
import { signSmartContractData } from '@wert-io/widget-sc-signer';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const TREASURY_ADDRESS = '0x7866F7cb1aa889A808eE9d225b60fce3d4BE7F3e';
const PARTNER_ID = process.env.WERT_PARTNER_ID!;
const PRIVATE_KEY = process.env.WERT_PRIVATE_KEY!;
const CONTRACT_ADDRESS = process.env.NFT_CONTRACT!;
const NFT_PRICE_USD = 50;

const ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'quantity', type: 'uint256' }],
    outputs: [],
  },
];

app.post('/api/wert/session', async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    const fiatAmount = quantity * NFT_PRICE_USD;
    // NOTE: In production, use a real-time price API for the conversion
    const ethAmount = parseFloat((fiatAmount / 3000).toFixed(6)); 

    const scInputData = encodeFunctionData({
      abi: ABI,
      functionName: 'mint',
      args: [BigInt(quantity)],
    });

    // ✅ THE FIX: Separate the Options and the Private Key
    const options = {
      address: TREASURY_ADDRESS,
      commodity: 'ETH',
      network: 'ethereum',
      sc_address: CONTRACT_ADDRESS,
      sc_input_data: scInputData,
      commodity_amount: ethAmount, // Must be a Number
    };

    // Pass options as arg 1, and the raw Private Key string as arg 2
    const signed = signSmartContractData(options, PRIVATE_KEY);

    res.json({
      session_id: uuidv4(),
      fiat_amount: fiatAmount,
      eth_amount: ethAmount,
      sc_address: CONTRACT_ADDRESS,
      sc_input_data: scInputData,
      signature: signed.signature, // signSmartContractData returns { ...options, signature }
    });
  } catch (err: any) {
    console.error('Signing Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(4000, () => console.log('🚀 Wert backend running on port 4000'));