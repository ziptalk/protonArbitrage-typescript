import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { getAmounts, getTokenAddress, tokenDecimalsMap } from "./util";
import dotenv from "dotenv";
dotenv.config();

async function getPrice(client: CosmWasmClient, amount: number): Promise<[number, number]> {
  const contractAddr = process.env.USDC_NTRN_CONTRACT as string;
  const offerAsset = 'NTRN'
  try {
  } catch (error) {
    console.error('Error fetching prices:', error);
    return [-1, -1];
  }    const simulationMsg = {
    simulation: {
      offer_asset: {
        info: {
          native_token: {
            denom: getTokenAddress(offerAsset)
          }
        },
        amount: getAmounts(offerAsset, amount)
      }
    }
  };

  const reverseSimulationMsg = {
    reverse_simulation: {
      ask_asset: {
        info: {
          native_token: {
            denom: getTokenAddress(offerAsset)
          }
        },
        amount: getAmounts(offerAsset, amount)
      }
    }
  };

  const [response1, response2] = await Promise.all([
    client.queryContractSmart(contractAddr, simulationMsg),
    client.queryContractSmart(contractAddr, reverseSimulationMsg)
  ]);
  const price1 = Number(response1.return_amount) / (10 ** tokenDecimalsMap[offerAsset] * amount);
  const price2 = Number(response2.offer_amount) / (10 ** tokenDecimalsMap[offerAsset] * amount);
  return [Number(price1.toFixed(4)), Number(price2.toFixed(4))];

}

export { getPrice };
// async function test() {
//   const client = await CosmWasmClient.connect(process.env.RPC_URL as string);
//   await getPrice(client, 1000).then((res) => console.log(res));
// }
// test()