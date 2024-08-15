import { Box, Button, ButtonGroup, ButtonProps, Container, Flex, Icon, SkeletonText, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr, useMediaQuery } from "@chakra-ui/react";
import { Next, PageGroup, Paginator, Previous, usePaginator } from "chakra-paginator";
import React, { useEffect, useMemo, useState } from "react";
import * as timeago from 'timeago.js';
import { useOvenTransactionTable } from "../../api/analytics";
import { ReactComponent as leftIcon } from '../../assets/images/icons/left-icon.svg';
import { ReactComponent as rightIcon } from '../../assets/images/icons/right-icon.svg';
import { ReactComponent as linkLight } from '../../assets/images/icons/link-light.svg';
import { useTableNumberUtils } from "../../hooks/useTableUtils";
import { useThemeColors } from "../../hooks/utilHooks";
import { OvenTransactionTable } from "../../interfaces/analytics";
import { trimAddress } from "../../utils/addressUtils";
import SkeletonLayout from "../../components/skeleton";
import { numberToMillionOrBillionFormate } from "../../utils/numberFormate";

interface CommonTable {
  column: ColData[]
  data: Array<any>
}
export interface ColData {
  dataKey: string,
  isTrimAddress?: boolean,
  isTimeFormat?: boolean,
  isCtez?: boolean,
  accessor: string,
  isDescription?: boolean,
  isDescriptionAdd?: boolean,
  isDescriptionRemove?: boolean,
  isTez?: boolean,
  isCtez2?: boolean,
  isShowOperationHash?: boolean,
  operationHashDataKey?: string,
  isConsiderLogicChange?: boolean,
}

const TableCommon: React.FC<CommonTable> = ({ column, data = [] }) => {
  const { positiveOrNegative, valueFormat } = useTableNumberUtils();
  const [textcolor] = useThemeColors(['homeTxt']);
  const [textHighlight] = useThemeColors(['sideBarBg']);
  const [largerScreen] = useMediaQuery(['(min-width: 900px)']);
  const [background, inputbg] = useThemeColors([
    'cardbg2',
    'inputbg',
  ]);
  const baseStyles: ButtonProps = {
    w: 7,
    fontSize: 'sm',
    backgroundColor: 'transparent'
  };
  const activeStyles: ButtonProps = {
    ...baseStyles,
    backgroundColor: inputbg,
    _hover: {
      bg: 'light.text4',
    },
    bg: 'light.text4',
  };
  const outerLimit = 2;
  const innerLimit = 2;
  // graph options
  const ovenTransactionTable = data;
  const [currentPageOvens, setCurrentPageOvens] = useState<any>([]);
  const { pagesQuantity, offset, currentPage, setCurrentPage, isDisabled, pageSize } = usePaginator(
    {
      total: ovenTransactionTable?.length,
      initialState: {
        pageSize: largerScreen ? 5 : 5,
        isDisabled: false,
        currentPage: 1,
      },
    },
  );

  useEffect(() => {
    const indexOfLastOven = currentPage * pageSize;
    const indexOfFirstOven = indexOfLastOven - pageSize;
    const currentTodos = ovenTransactionTable && ovenTransactionTable.slice(indexOfFirstOven, indexOfLastOven);
    setCurrentPageOvens(currentTodos);
  }, [currentPage, pageSize, ovenTransactionTable.length]);
  const handlePageChange = (nextPage: number) => {
    setCurrentPage(nextPage);
  };

  const modals = useMemo(() => {
    return (
      <>
        <Paginator
          isDisabled={isDisabled}
          innerLimit={largerScreen ? innerLimit : 1}
          currentPage={currentPage}
          outerLimit={largerScreen ? outerLimit : 1}
          pagesQuantity={pagesQuantity}
          activeStyles={activeStyles}
          normalStyles={baseStyles}
          onPageChange={handlePageChange}
        >
          <Container align="center" display='flex' justifyContent='center' flexDirection={largerScreen ? 'row' : 'column'} gridGap={5} w="full" pt={4}>
            {largerScreen && <Previous className="pagignationIcon">
              <Icon
                color="light.tradebg"
                _hover={{ cursor: 'pointer' }}
                as={leftIcon}
              />
            </Previous>}
            {!largerScreen && <Flex justifyContent='center' alignItems='center' gridGap='2px'>
              <Previous className="pagignationIcon">
                <Icon
                  color="light.tradebg"
                  _hover={{ cursor: 'pointer' }}
                  as={leftIcon}
                />
              </Previous>
              <Next className="pagignationIcon">
                <Icon
                  color="light.tradebg"
                  _hover={{ cursor: 'pointer' }}
                  as={rightIcon}
                />
              </Next>
            </Flex>}
            <PageGroup justifyContent={largerScreen ? '' : 'center'} className="pageNavigation-center-btn" isInline align="center" />
            {largerScreen && <Next className="pagignationIcon">

              <Icon
                color="light.tradebg"
                _hover={{ cursor: 'pointer' }}
                as={rightIcon}
              />
            </Next>}
          </Container>
        </Paginator>
      </>
    );
  }, [ovenTransactionTable]);
  if (!ovenTransactionTable.length) {
    return (<Table variant='simple'>
      <Thead>
        <Tr>
          {column.map((coldata, mainkey) => {
            if (mainkey === 0)
              return <Th key={`coldataaccessor${mainkey}`} textAlign='left' >{coldata.accessor}</Th>;
            return <Th key={`coldataaccessor${mainkey}`}   >{coldata.accessor}</Th>;
          })}
        </Tr>
      </Thead>
      <Tbody>
        {Array(pageSize).fill(0).map((_, i) => (<Tr key={`loaderSreen${i}`}>

          {column.map((coldata, mainkey) => (<Td key={`loaderSreenIndividual${mainkey}`} >
            <SkeletonText noOfLines={1} />
          </Td>))}

        </Tr>))}
      </Tbody>
    </Table>);
  }
  return (
    <Box>
      <TableContainer
        textAlign='center'
      >
        <Table variant='simple'>
          <Thead>
            <Tr>
              {column.map((coldata, mainkey) => {
                if (mainkey === 0)
                  return <Th key={`coldataaccessor${mainkey}`} className="tableFirstCell" textAlign='left' >{coldata.accessor}</Th>;
                return <Th key={`coldataaccessor${mainkey}`} textAlign='right'  >{coldata.accessor}</Th>;
              })}
            </Tr>
          </Thead>
          <Tbody>
            {currentPageOvens.map((pagedata: any, index: number) => {
              return (
                <Tr key={pagedata.address + index}>
                  {column.map((coldata, mainkey) => {
                    const { dataKey, isTrimAddress, isTimeFormat, isCtez, isDescription, isDescriptionAdd, isDescriptionRemove, isTez, isCtez2, isShowOperationHash, isConsiderLogicChange } = coldata;
                    const operationHashDataKey = coldata.operationHashDataKey || 'operationHash';
                    if (isTimeFormat)
                      return <Td key={pagedata.address + index + mainkey} className={mainkey === 0 ? "tableFirstCell" : ''} textAlign={mainkey === 0 ? 'left' : 'right'}>{timeago.format(pagedata[dataKey])}</Td>;
                    if (isCtez && isShowOperationHash)
                      return <Td key={pagedata.address + index + mainkey} className={mainkey === 0 ? "tableFirstCell" : ''} textAlign={mainkey === 0 ? 'left' : 'right'}>
                        <div >
                          <a className="addresslinktd"
                            href={`https://tzkt.io/${pagedata[operationHashDataKey]}`}
                            rel="noreferrer"
                            target="_blank">
                            {`${numberToMillionOrBillionFormate(pagedata[dataKey], 6)} ctez`}

                            <Icon
                              color="light.tradebg"
                              _hover={{ cursor: 'pointer' }}
                              className="addresslinktdIcon"
                              as={linkLight}

                            />
                          </a>
                        </div>
                      </Td>;
                    if (isCtez)
                      return <Td key={pagedata.address + index + mainkey} className={mainkey === 0 ? "tableFirstCell" : ''} textAlign={mainkey === 0 ? 'left' : 'right'}>{numberToMillionOrBillionFormate(pagedata[dataKey], 6)} ctez</Td>;

                    if (isTrimAddress)
                      return (<Td key={pagedata.address + index + mainkey} className={mainkey === 0 ? "tableFirstCell" : ''} textAlign={mainkey === 0 ? 'left' : 'right'}>
                        <div >
                          <a
                            className="addresslinktd2"
                            href={`https://tzkt.io/${pagedata[dataKey]}`}
                            rel="noreferrer"
                            target="_blank">
                            {
                              trimAddress(pagedata[dataKey])
                            }
                            <Icon
                              color="light.tradebg"
                              _hover={{ cursor: 'pointer' }}
                              className="addresslinktdIcon"
                              as={linkLight}

                            />
                          </a>
                        </div>

                      </Td>);
                    if (isDescription)
                      return (<Td key={pagedata.address + index + mainkey} className={mainkey === 0 ? "tableFirstCell" : ''} textAlign={mainkey === 0 ? 'left' : 'right'} >
                        <div>
                          <a className="addresslinktd"
                            href={`https://tzkt.io/${pagedata[operationHashDataKey]}`}
                            rel="noreferrer"
                            target="_blank">
                            {pagedata.direction === 'tez_to_ctez' ? <p>Swap {numberToMillionOrBillionFormate(pagedata.amount_xtz, 6)} tez for {numberToMillionOrBillionFormate(pagedata.amount_ctez, 6)} ctez</p> : <p>Swap {numberToMillionOrBillionFormate(pagedata.amount_ctez, 6)} ctez for {numberToMillionOrBillionFormate(pagedata.amount_xtz, 6)} tez</p>}


                            <Icon
                              color="light.tradebg"
                              _hover={{ cursor: 'pointer' }}
                              className="addresslinktdIcon"
                              as={linkLight}

                            />
                          </a>
                        </div>

                      </Td>);
                    if (isDescriptionAdd)
                      return (<Td key={pagedata.address + index + mainkey} className={mainkey === 0 ? "tableFirstCell" : ''} textAlign={mainkey === 0 ? 'left' : 'right'} >
                        <div>
                          <a className="addresslinktd"
                            href={`https://tzkt.io/${pagedata[operationHashDataKey]}`}
                            rel="noreferrer"
                            target="_blank">
                            Add {numberToMillionOrBillionFormate(pagedata.self_amount, 6)} {pagedata.dex === 'sell_ctez' ? 'ctez' : 'tez'}
                            <Icon
                              color="light.tradebg"
                              _hover={{ cursor: 'pointer' }}
                              className="addresslinktdIcon"
                              as={linkLight}
                            />
                          </a>
                        </div>

                      </Td>);
                    if (isDescriptionRemove)
                      return (<Td key={pagedata.address + index + mainkey} className={mainkey === 0 ? "tableFirstCell" : ''} textAlign={mainkey === 0 ? 'left' : 'right'} >
                        <div>
                          <a className="addresslinktd"
                            href={`https://tzkt.io/${pagedata[operationHashDataKey]}`}
                            rel="noreferrer"
                            target="_blank">
                            Remove {numberToMillionOrBillionFormate(pagedata.quantityTk1, 6)} tez and {numberToMillionOrBillionFormate(pagedata.quantityTk2, 6)} ctez
                              <Icon
                              color="light.tradebg"
                              _hover={{ cursor: 'pointer' }}
                              className="addresslinktdIcon"
                              as={linkLight}

                            />
                          </a>
                        </div>

                      </Td>);
                    if (isTez && isShowOperationHash)
                      return <Td key={pagedata.address + index + mainkey} className={mainkey === 0 ? "tableFirstCell" : ''} textAlign={mainkey === 0 ? 'left' : 'right'}>
                        <div >
                          <a className="addresslinktd"
                            href={`https://tzkt.io/${pagedata[operationHashDataKey]}`}
                            rel="noreferrer"
                            target="_blank">
                            {`${numberToMillionOrBillionFormate(pagedata[dataKey], 6)} tez`}
                            <Icon
                              color="light.tradebg"
                              _hover={{ cursor: 'pointer' }}
                              className="addresslinktdIcon"
                              as={linkLight}

                            />
                          </a>
                        </div>
                      </Td>;
                    if (isTez && isConsiderLogicChange)
                      return <Td key={pagedata.address + index + mainkey} className={mainkey === 0 ? "tableFirstCell" : ''} textAlign={mainkey === 0 ? 'left' : 'right'}>{
                        pagedata.direction === 'tez_to_ctez' || pagedata.dex === 'sell_tez' ? `${numberToMillionOrBillionFormate(pagedata.amount_xtz ?? pagedata.self_amount, 6)} tez` : `${numberToMillionOrBillionFormate(pagedata.amount_ctez ?? pagedata.self_amount, 6)} ctez`
                      }
                      </Td>;
                    if (isCtez2 && isConsiderLogicChange)
                      return <Td key={pagedata.address + index + mainkey} className={mainkey === 0 ? "tableFirstCell" : ''} textAlign={mainkey === 0 ? 'left' : 'right'}>
                        {pagedata.direction === 'ctez_to_tez' || pagedata.dex === 'sell_tez' ? `${numberToMillionOrBillionFormate(pagedata.amount_xtz ?? pagedata.self_amount, 6)} tez` : `${numberToMillionOrBillionFormate(pagedata.amount_ctez ?? pagedata.self_amount, 6)} ctez`}
                      </Td>;

                    if (isTez)
                      return <Td key={pagedata.address + index + mainkey} className={mainkey === 0 ? "tableFirstCell" : ''} textAlign={mainkey === 0 ? 'left' : 'right'}>{numberToMillionOrBillionFormate(pagedata[dataKey], 6)} tez</Td>;
                    if (isCtez2)
                      return <Td key={pagedata.address + index + mainkey} className={mainkey === 0 ? "tableFirstCell" : ''} textAlign={mainkey === 0 ? 'left' : 'right'}>{numberToMillionOrBillionFormate(pagedata[dataKey], 6)} ctez</Td>;

                    return <Td key={pagedata.address + index + mainkey} className={mainkey === 0 ? "tableFirstCell" : ''} textAlign={mainkey === 0 ? 'left' : 'right'} >{numberToMillionOrBillionFormate(pagedata[dataKey], 6)}</Td>;
                  })}
                </Tr>)
            })}

          </Tbody>
        </Table>
      </TableContainer>

      {modals}

    </Box>)
}
export default TableCommon;
