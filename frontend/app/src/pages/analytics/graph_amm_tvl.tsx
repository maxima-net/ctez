import { Button, ButtonGroup, Flex, Skeleton, SkeletonText, Text, useMediaQuery } from "@chakra-ui/react";
import React, { useMemo, useState } from "react";
import { format } from 'date-fns/fp';
import { graphic } from "echarts";
import { useAmmTvlGql, useOvensTvlCurrentPointGql } from "../../api/analytics";
import { useChartZoom, useThemeColors } from "../../hooks/utilHooks";
import { numberToMillionOrBillionFormate } from "../../utils/numberFormate";
import { ChartPure } from "./chart";

const GraphAMMTVL: React.FC = () => {
    const [textcolor] = useThemeColors(['homeTxt']);
    const [largerScreen] = useMediaQuery(['(min-width: 900px)']);
    const [background] = useThemeColors([
      'cardbg2',
    ]);
    const { data: historicalData = false } = useAmmTvlGql('day');
    const currentPoint = undefined;
    const chartData = useMemo(
      () => historicalData && currentPoint ? [...historicalData, currentPoint] : historicalData,
      [historicalData, currentPoint]
    );
  
    const [value, setValue] = useState<number | undefined>();
    const [time, setTime] = useState<number | undefined>();
  
    const [activeTab, setActiveTab, startDate, endDate] = useChartZoom();
    // graph options
    const dateFormat = useMemo(() => format('MMM d, yyyy'), []);
    const dateFormat2 = useMemo(() => format('MMM, yyyy'), []);
  
    const option = useMemo(() => {
      return {
        dataset: [{
          dimensions: [
            { name: 'timestamp', displayName: '' },
            { name: 'tvl', displayName: 'TVL' },
          ],
          source: chartData
        }],
        tooltip: {
          trigger: 'axis',
          valueFormatter: (v: unknown) => `$${numberToMillionOrBillionFormate(v)}`
        },
        xAxis: {
          type: 'time',
        },
        yAxis: {
          type: 'value',
          scale: true,
        },
        series: [{
          type: 'line',
          symbol: 'none',
          areaStyle: {
            color: new graphic.LinearGradient(0, 0, 1, 0, [
              {
                offset: 0,
                color: '#3260EF4D',
              },
              {
                offset: 1,
                color: '#3560ED14',
              }
            ])
          },
          color: '#0F62FF',
          datasetIndex: 0,
          smooth: true
        }]
      } as React.ComponentProps<typeof ChartPure>['option'];
    }, [chartData]);
  
    const lastValue = chartData && chartData[chartData.length - 1]?.tvl;
    const displayText = (lastValue && !value) ? `$${numberToMillionOrBillionFormate(lastValue)}` : value ? `$${numberToMillionOrBillionFormate(value)}` : null;
  
    return (<Flex direction='column'
      borderRadius={16}
      backgroundColor={background}
      flexGrow={1}
      flexShrink={1}
      flexBasis={320}
      paddingX={largerScreen ? '35px' : '19px'}
      paddingY={largerScreen ? '27px' : '24px'}
      gridGap={6}
    >
  
      <Flex justifyContent='space-between'>
        <div>
          <Text
            color={textcolor}
            fontSize={largerScreen ? '14px' : '14px'}
            lineHeight="29px"
            fontWeight={400}
          >
            TVL
              </Text>
          <Flex flexDirection='column'>
            {displayText ? <Text
              color={textcolor}
              fontSize={largerScreen ? '32px' : '18px'}
              lineHeight="29px"
              fontWeight={600}
            >
              {displayText}
            </Text> : <SkeletonText pr={6} noOfLines={1} spacing="1" />}
            {time ? <Text fontSize='12px' >{activeTab === '1m' ? dateFormat(time) : dateFormat2(time)}</Text> : <Text fontSize='12px' opacity={0}>Time</Text>}
          </Flex>
        </div>
        <ButtonGroup variant='ghost' gridGap={2} textColor={textcolor} fontSize='12px' spacing='-1'>
          <Button fontSize='12px' className={activeTab === '1m' ? "btnactive" : ''} textDecoration='underline' onClick={() => setActiveTab('1m')} >1M</Button>
          <Button fontSize='12px' className={activeTab === 'all' ? "btnactive" : ''} textDecoration='underline' onClick={() => setActiveTab('all')}>ALL</Button>
        </ButtonGroup>
  
      </Flex>
      {chartData
        ? <ChartPure
          option={option}
          showZoom
          zoomStartDate={startDate}
          zoomEndDate={endDate}
          style={{ height: 300 }} />
        : <Skeleton height='300px' minWidth='20px' />}
    </Flex>)
}
export default GraphAMMTVL;
