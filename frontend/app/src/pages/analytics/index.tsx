import { Box, Button, ButtonGroup, Center, Flex, Skeleton, SkeletonText, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr, useColorMode, useMediaQuery } from '@chakra-ui/react';
import React from 'react';
import { useMainHeader } from '../../api/analytics';
import { useThemeColors } from '../../hooks/utilHooks';
import { numberToMillionOrBillionFormate } from '../../utils/numberFormate';
import './analytics.css';
import GraphAMMTVL from './graph_amm_tvl';
import GraphAMMVolume from './graph_amm_volume';
import GraphCtezOld from './graph_ctez_old';
import GraphCtez from './graph_ctez';
import GraphDrift from './graph_drift';
import OvenPiChart from './graph_oven_pi';
import GraphTVL from './graph_tvl';
import OvenTable from './ovenTable';
import TransactionTableoven from './transactionsTable';
import TransactionTableAMM from './transactionsTableAmm';


const AnaluticsPage: React.FC = () => {
    const { data: headerData = false } = useMainHeader();
    const [textcolor] = useThemeColors(['homeTxt']);
    const [textHighlight] = useThemeColors(['sideBarBg']);
    const [largerScreen] = useMediaQuery(['(min-width: 900px)']);
    const [background,inputbg] = useThemeColors([
        'cardbg2',
        'inputbg',
    ]);
    const {colorMode} = useColorMode();
    const GradientText = (text: string | number, isDollor: boolean) => {
        return <b className='gradientcolortext'>
            {isDollor ? '$' : null}
            {text}
        </b>;
    }
    return (
        <Box p= {largerScreen ? '55px' : '15px'} pt={largerScreen ? '55px' : '30px'} maxWidth={1200} mx="auto" className={colorMode}>
            <Center maxWidth='759px' margin='0px auto' >
            {headerData?<Text
                    color={textcolor}
                    fontSize={largerScreen ? '40px' : '26px'}
                    lineHeight={largerScreen ? '50px' : '32px'}
                    fontWeight={400}
                    textAlign='center'
                >
           {GradientText(`${numberToMillionOrBillionFormate(headerData.total_debt)} ctez`, false) } collateralized by {GradientText(`${numberToMillionOrBillionFormate(headerData.collateral_locked)} tez`, false) } across {GradientText(`${headerData.Total_Ovens} `, false)} {GradientText('ovens',false)}
                                            
                </Text>
                :<Skeleton>
                    <Text
                    color={textcolor}
                    fontSize={largerScreen ? '40px' : '26px'}
                    lineHeight="50px"
                    fontWeight={400}
                    textAlign='center'
                >
                441.39k ctez collateralized by 568.34k tez across 195 ovens 
                </Text>
                    </Skeleton>}
            </Center>
            <div className='section-container'>
                <Text
                    fontSize={largerScreen ? '30px' : '20px'}
                    lineHeight="50px"
                    fontWeight={400}
                    className='gradientcolortext'
                    marginBottom='20px'
                >
                    Protocol
                </Text>
                <Flex direction='row' wrap={largerScreen?'nowrap':'wrap'} gridGap='10' >
                    {/* <GraphCtezOld /> */}
                    <GraphCtez />
                    <GraphDrift />
                </Flex>
            </div>
            <div className='section-container'>
                <Text
                    fontSize={largerScreen ? '30px' : '20px'}
                    lineHeight="50px"
                    fontWeight={400}
                    className='gradientcolortext'
                    marginBottom='20px'
                >
                    Ovens
                </Text>
                <OvenTable />
            </div>

            <div className='section-container'>
                <Flex direction='row' wrap={largerScreen?'nowrap':'wrap'} gridGap='10' >
                   <GraphTVL />
                     <OvenPiChart />

                </Flex>
            </div>
            <div className='section-container'>
                <TransactionTableoven />
            </div>

            <div className='section-container'>
            <Text
                    fontSize={largerScreen ? '30px' : '20px'}
                    lineHeight="50px"
                    fontWeight={400}
                    className='gradientcolortext'
                    marginBottom='20px'
                >
                    AMM
                </Text>
                <Flex direction='row' wrap={largerScreen?'nowrap':'wrap'} gridGap='10' >
                     <GraphAMMTVL/>
                   <GraphAMMVolume/>
                </Flex>
            </div>

            <div className='section-container'>
            <TransactionTableAMM/>
            </div>


        </Box>
    )
}
export default AnaluticsPage;
