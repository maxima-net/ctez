import axios from "axios";
import { useQuery } from "react-query";
import { AMMTransactionLiquidity, ctezGraphctez, ctezGraphctezDateRange, ctezGraphOvendata, ctezGraphTVL, ctezGraphVolumestat, ctezMainHeader, ctezOven, CtezStatsGql, DepositTransactionTable, driftGraphInterface, driftGraphInterfaceAll, MintBurnData, OneLineGraph, Ovendata, OvenTransactionTable, OvenTvlGql, PiGraphOven, priceSats, SwapTransaction, TvlAMMData, TvlAMMDataAll, TvlData, TvlDataALL, TwoLineGraph, TwoLineGraphWithoutValue, VolumeAMMData, VolumeAMMDataAll } from "../interfaces/analytics";

const GQL_API_URL = 'https://ctez-v2-indexer.dipdup.net/v1/graphql';

export const useCtezGraphGql = () => {
  return useQuery<CtezStatsGql[], Error>(
    'ctez_graph_gql',
    async () => {
      const response = await axios({
        url: GQL_API_URL,
        method: "POST",
        data: {
          query: `
            query {
              router_stats(order_by: {timestamp: asc}) {
                id
                timestamp
                current_avg_price
                target_price
                current_annual_drift
                ctez_sell_price
                ctez_buy_price
              }
            }
          `
        }
      });

      return response.data.data.router_stats.map((s: CtezStatsGql) => ({ ...s, current_annual_drift: s.current_annual_drift * 100 }));
    },
    { refetchInterval: 30_000 },
  );
};

export const useTvlGraphGql = () => {
  return useQuery<OvenTvlGql[], Error>(
    'oven_tvl_gql',
    async () => {
      const response = await axios({
        url: GQL_API_URL,
        method: "POST",
        data: {
          query: `
            query {
              tvl_history(order_by: {timestamp: asc}) {
                total_supply
                timestamp
                id: timestamp
              }
            }
          `
        }
      });

      return response.data.data.tvl_history.map((h: OvenTvlGql) => ({ ...h, total_supply: h.total_supply / 1e6 }));
    },
    { refetchInterval: 30_000 },
  );
};

const analyticsAPI = axios.create({
  baseURL: 'https://analyticsapi.ctez.app'
});
export const usePriceStats = () => {
  return useQuery<{ ctez_priceArr: number[], tez_priceArr: number[], dateArr: number[] }, Error>(
    'price_stats',
    async () => {
      const data = await analyticsAPI.get('/price_stats');
      const priceStatsArr: priceSats[] = data.data;
      const ctez_priceArr: number[] = [];
      const tez_priceArr: number[] = [];
      const dateArr: number[] = [];
      priceStatsArr.forEach((element) => {
        ctez_priceArr.push(element.ctez_price);
        tez_priceArr.push(parseFloat(element.tez_price));
        dateArr.push(new Date(element.timestamp).getDate())
      })
      return { ctez_priceArr, tez_priceArr, dateArr };
    },
    { refetchInterval: 30_000 },
  );
};
export const useDriftGraph = () => {
  return useQuery<OneLineGraph[], Error>(
    'drift_stats',
    async () => {
      const data = await analyticsAPI.get('/main_data/drift');
      const priceStatsArr: driftGraphInterface[] = data.data;
      priceStatsArr.sort((a, b) => new Date(a.epoch_timestamp).getTime() - new Date(b.epoch_timestamp).getTime())
      const data1: OneLineGraph[] = priceStatsArr.map((e) => {
        return <OneLineGraph>{
          value: e.drift,
          time: e.timestamp
        }
      })
      return data1;
    },
    { refetchInterval: 30_000 },
  );
};
export const useDriftGraphAll = () => {
  return useQuery<OneLineGraph[], Error>(
    'drift_stats_all',
    async () => {
      const data = await analyticsAPI.get('/main_data/drift_all');
      const priceStatsArr: driftGraphInterfaceAll[] = data.data;
      priceStatsArr.sort((a, b) => new Date(a.timestamp_from).getTime() - new Date(b.timestamp_from).getTime())
      const data1: OneLineGraph[] = priceStatsArr.map((e) => {
        return <OneLineGraph>{
          value: e.drift,
          time: e.timestamp_from
        }
      })
      return data1;
    },
    { refetchInterval: 30_000 },
  );
};
export const useMainHeader = () => {
  return useQuery<ctezMainHeader, Error>(
    'main_header',
    async () => {
      const data = await analyticsAPI.get('/summary');
      const ctezmainHeader: ctezMainHeader = data.data;
      return ctezmainHeader;
    },
    { refetchInterval: 30_000 },
  );
};
export const useCtezOven = () => {
  return useQuery<ctezOven, Error>(
    'main_ctezOven',
    async () => {
      const data = await analyticsAPI.get('/ovens');
      const ctezoven: ctezOven = data.data;
      return ctezoven;
    },
    { refetchInterval: 30_000 },
  );
};

export const useOvenTransactionTable = () => {
  return useQuery<OvenTransactionTable[], Error>(
    'main_ctez_OvenTransactionTable',
    async () => {
      const data = await analyticsAPI.get('/main_transaction/mint');
      const ovenTransactionTable: OvenTransactionTable[] = data.data;
      return ovenTransactionTable;
    },
    { refetchInterval: 30_000 },
  );
};
export const useMintedTransactionTable = () => {
  return useQuery<MintBurnData[], Error>(
    'main_ctez_MintBurnData',
    async () => {
      const data = await analyticsAPI.get('/main_transaction/burn');
      const mintBurnData: MintBurnData[] = data.data;
      return mintBurnData;
    },
    { refetchInterval: 30_000 },
  );
};
export const useDepositTransactionTable = () => {
  return useQuery<DepositTransactionTable[], Error>(
    'main_ctez_DepositTransactionTable',
    async () => {
      const data = await analyticsAPI.get('/main_transaction/deposit');
      const depositTransactionTable: DepositTransactionTable[] = data.data;
      return depositTransactionTable;
    },
    { refetchInterval: 30_000 },
  );
};
export const useWithdrawTransactionTable = () => {
  return useQuery<DepositTransactionTable[], Error>(
    'main_ctez_withdrawTransactionTable',
    async () => {
      const data = await analyticsAPI.get('/main_transaction/withdraw');
      const withdrawTransactionTable: DepositTransactionTable[] = data.data;
      return withdrawTransactionTable;
    },
    { refetchInterval: 30_000 },
  );
};
export const useSwapTransactionTable = () => {
  return useQuery<SwapTransaction[], Error>(
    'main_ctez_swapTransaction',
    async () => {
      const data = await analyticsAPI.get('/amm_transaction/swap');
      const SwapTransactionTable: SwapTransaction[] = data.data;
      return SwapTransactionTable;
    },
    { refetchInterval: 30_000 },
  );
};
export const useAddLiquidityTransactionTable = () => {
  return useQuery<AMMTransactionLiquidity[], Error>(
    'main_ctez_AddLiquidityTransaction',
    async () => {
      const data = await analyticsAPI.get('/amm_transaction/add_liquidity');
      const SwapTransactionTable: AMMTransactionLiquidity[] = data.data;
      return SwapTransactionTable;
    },
    { refetchInterval: 30_000 },
  );
};
export const useRemoveLiquidityTransactionTable = () => {
  return useQuery<AMMTransactionLiquidity[], Error>(
    'main_ctez_remove_liquidityTransaction',
    async () => {
      const data = await analyticsAPI.get('/amm_transaction/remove_liquidity');
      const SwapTransactionTable: AMMTransactionLiquidity[] = data.data;
      return SwapTransactionTable;
    },
    { refetchInterval: 30_000 },
  );
};

export const useCtezGraphctez1m = () => {
  return useQuery<TwoLineGraph[], Error>(
    'graph_ctez',
    async () => {
      const data = await analyticsAPI.get('/main_data/target');
      const priceStatsArr: ctezGraphctez[] = data.data;
      priceStatsArr.sort((a, b) => a.epoch_timestamp - b.epoch_timestamp)
      const data1: TwoLineGraph[] = priceStatsArr.map((e) => {
        return <TwoLineGraph>{
          data1: e.current_price,
          data2: e.current_target,
          value: e.current_price,
          time: e.epoch_timestamp,
          premium: e.premium,
        }
      })
      return data1;
    },
    { refetchInterval: 30_000 },
  );
};
export const useCtezGraphctezall = () => {
  return useQuery<TwoLineGraph[], Error>(
    'graph_ctez_all',
    async () => {
      const data = await analyticsAPI.get('/main_data/target_all');
      const priceStatsArr: ctezGraphctezDateRange[] = data.data;
      priceStatsArr.sort((a, b) => a.epoch_timestamp_from - b.epoch_timestamp_from);
      const data1: TwoLineGraph[] = priceStatsArr.map((e) => {
        return <TwoLineGraph>{
          data1: e.current_price,
          data2: e.current_target,
          value: e.current_price,
          time: e.epoch_timestamp_from,
          premium: e.premium,
        }
      })
      return data1;
    },
    { refetchInterval: 30_000 },
  );
};
export const useCtezGraphTVL = () => {
  return useQuery<OneLineGraph[], Error>(
    'ctez_graph_TVL',
    async () => {
      const data = await analyticsAPI.get('/tvl');
      const ctezgraphTVL: TvlData[] = data.data;
      ctezgraphTVL.sort((a, b) => a.epochTimestamp - b.epochTimestamp);
      const data1: OneLineGraph[] = ctezgraphTVL.map((e) => {
        return <OneLineGraph>{
          value: e.ovenTvl,
          time: e.epochTimestamp
        }
      })
      return data1;
    },
    { refetchInterval: 30_000 },
  );
};
export const useCtezGraphTVLAll = () => {
  return useQuery<OneLineGraph[], Error>(
    'ctez_graph_TVL_all',
    async () => {
      const data = await analyticsAPI.get('/tvl_all');
      const ctezgraphTVL: TvlDataALL[] = data.data;
      ctezgraphTVL.sort((a, b) => a.epochTimestampFrom - b.epochTimestampFrom);
      const data1: OneLineGraph[] = ctezgraphTVL.map((e) => {
        return <OneLineGraph>{
          value: e.ovenTvl,
          time: e.epochTimestampFrom
        }
      })
      return data1;
    },
    { refetchInterval: 30_000 },
  );
};
export const useCtezGraphAMMTVL = () => {
  return useQuery<OneLineGraph[], Error>(
    'ctez_graph_TVL_on',
    async () => {
      const data = await analyticsAPI.get('/tvl');
      const ctezgraphTVL: TvlData[] = data.data;
      ctezgraphTVL.sort((a, b) => a.epochTimestamp - b.epochTimestamp);
      const data1: OneLineGraph[] = ctezgraphTVL.map((e) => {
        return <OneLineGraph>{
          value: e.ammTvl,
          time: e.epochTimestamp
        }
      })
      return data1;
    },
    { refetchInterval: 30_000 },
  );
};
export const useCtezGraphAMMTVLAll = () => {
  return useQuery<OneLineGraph[], Error>(
    'ctez_graph_TVL_all_on',
    async () => {
      const data = await analyticsAPI.get('/tvl_all');
      const ctezgraphTVL: TvlDataALL[] = data.data;
      ctezgraphTVL.sort((a, b) => a.epochTimestampFrom - b.epochTimestampFrom);
      const data1: OneLineGraph[] = ctezgraphTVL.map((e) => {
        return <OneLineGraph>{
          value: e.ammTvl,
          time: e.epochTimestampFrom
        }
      })
      return data1;
    },
    { refetchInterval: 30_000 },
  );
};

export const useCtezGraphAMMVolume = () => {
  return useQuery<OneLineGraph[], Error>(
    'ctez_graph_AMM_volume',
    async () => {
      const data = await analyticsAPI.get('/volume_stats');
      const ctezgraphTVL: VolumeAMMData[] = data.data;
      const data1: OneLineGraph[] = ctezgraphTVL.reverse().map((e) => {
        return <OneLineGraph>{
          value: e.volume24hours,
          time: e.timestamp
        }
      })
      return data1;
    },
    { refetchInterval: 30_000 },
  );
};
export const useCtezGraphAMMVolumeAll = () => {
  return useQuery<OneLineGraph[], Error>(
    'ctez_graph_AMM_volume_all',
    async () => {
      const data = await analyticsAPI.get('/volume_stats_month');
      const ctezgraphTVL: VolumeAMMDataAll[] = data.data;
      const data1: OneLineGraph[] = ctezgraphTVL.reverse().map((e) => {
        return <OneLineGraph>{
          value: e.volume,
          time: e.timestampFrom
        }
      })
      return data1;
    },
    { refetchInterval: 30_000 },
  );
};

export const useCtezGraphOvendata = () => {
  return useQuery<PiGraphOven[], Error>(
    'ctez_graph_oven_pi',
    async () => {
      const data = await analyticsAPI.get('/ovens_graph');
      const ctezgraphOvendata: Ovendata[] = data.data;
      const data1: PiGraphOven[] = ctezgraphOvendata.map((e, index) => {
        return <PiGraphOven>{
          id: index,
          address: e.oven_address,
          value: parseFloat(e.percentage.toString()),
          time: e.ctez_standing
        }
      });
      return data1;
    },
  );
};
export const useCtezGraphVolumestat = () => {
  return useQuery<{ data1: number[], dateArr: number[] }, Error>(
    'ctez_graph_TVL',
    async () => {
      const data = await analyticsAPI.get('/main_data/drift');
      const ctezgraphVolumestat: ctezGraphVolumestat = data.data;
      const data1: number[] = [];
      const dateArr: number[] = [];
      ctezgraphVolumestat.volumestats.forEach((element) => {
        data1.push(element.volume24hours);
        dateArr.push(new Date(element.timestamp).getDate())
      })
      return { data1, dateArr };
    },
    { refetchInterval: 30_000 },
  );
};
