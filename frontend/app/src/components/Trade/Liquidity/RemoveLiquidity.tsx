import { Flex, FormControl, FormLabel, Icon, Input, Stack, useToast, Text } from '@chakra-ui/react';
import { MdAdd } from 'react-icons/md';
import { addMinutes } from 'date-fns/fp';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { number, object } from 'yup';
import { useFormik } from 'formik';
import { RemoveLiquidityParams } from '../../../interfaces';
import { cfmmError, removeLiquidity } from '../../../contracts/cfmm';
import { IRemoveLiquidityForm, REMOVE_BTN_TXT } from '../../../constants/liquidity';
import { useWallet } from '../../../wallet/hooks';
import { useCfmmStorage, useUserLqtData } from '../../../api/queries';
import Button from '../../button';
import { useAppSelector } from '../../../redux/store';
import { useThemeColors, useTxLoader } from '../../../hooks/utilHooks';
import {
  formatNumber,
  formatNumberStandard,
  inputFormatNumberStandard,
} from '../../../utils/numbers';
import { BUTTON_TXT } from '../../../constants/swap';

const RemoveLiquidity: React.FC = () => {
  const [{ pkh: userAddress }] = useWallet();
  const [otherValues, setOtherValues] = useState({
    cashWithdraw: 0,
    tokenWithdraw: 0,
  });
  const toast = useToast();
  const { data: cfmmStorage } = useCfmmStorage();
  const { t } = useTranslation(['common']);
  const [text2, inputbg, text4, maxColor] = useThemeColors([
    'text2',
    'inputbg',
    'text4',
    'maxColor',
  ]);
  const { slippage, deadline: deadlineFromStore } = useAppSelector((state) => state.trade);
  const handleProcessing = useTxLoader();
  const { data: userLqtData } = useUserLqtData(userAddress);

  const calcMinValues = useCallback(
    (lqtBurned: number) => {
      if (!lqtBurned) {
        setOtherValues({
          cashWithdraw: 0,
          tokenWithdraw: 0,
        });
      } else if (cfmmStorage) {
        const { cashPool, tokenPool, lqtTotal } = cfmmStorage;
        const cashWithdraw =
          ((lqtBurned * 1e6 * cashPool.toNumber()) / lqtTotal.toNumber()) * (1 - slippage * 0.01);
        const tokenWithdraw =
          ((lqtBurned * 1e6 * tokenPool.toNumber()) / lqtTotal.toNumber()) * (1 - slippage * 0.01);
        setOtherValues({
          cashWithdraw: formatNumberStandard(cashWithdraw / 1e6),
          tokenWithdraw: formatNumberStandard(tokenWithdraw / 1e6),
        });
      }
    },
    [cfmmStorage, slippage],
  );

  const initialValues: IRemoveLiquidityForm = {
    lqtBurned: '',
    deadline: Number(deadlineFromStore),
    slippage: Number(slippage),
  };

  const maxValue = (): number => formatNumber(userLqtData?.ctezDexLqt || 0.0);

  const validationSchema = object().shape({
    lqtBurned: number()
      .positive(t('shouldPositive'))
      .required(t('required'))
      .max(maxValue(), `${t('insufficientBalance')}`),
    deadline: number().min(0).optional(),
    slippage: number().min(0).optional(),
  });

  const handleFormSubmit = async (formData: IRemoveLiquidityForm) => {
    if (userAddress) {
      try {
        const deadline = addMinutes(deadlineFromStore)(new Date());
        const data: RemoveLiquidityParams = {
          deadline,
          to: userAddress,
          lqtBurned: Number(formData.lqtBurned) * 1e6,
          minCashWithdrawn: otherValues.cashWithdraw,
          minTokensWithdrawn: otherValues.tokenWithdraw,
        };
        const result = await removeLiquidity(data, userAddress);
        handleProcessing(result);
      } catch (error : any) {
        const errorText = cfmmError[error.data[1].with.int as number] || t('txFailed');
        toast({
          description: errorText,
          status: 'error',
        });
      }
    }
  };

  const { values, handleChange, handleSubmit, isSubmitting, errors, ...formik } = useFormik({
    initialValues,
    validationSchema,
    onSubmit: handleFormSubmit,
  });

  useEffect(() => {
    calcMinValues(Number(values.lqtBurned));
  }, [calcMinValues, values.slippage, values.lqtBurned]);

  const { buttonText, errorList } = useMemo(() => {
    const errorListLocal = Object.values(errors);
    if (!userAddress) {
      return { buttonText: BUTTON_TXT.CONNECT, errorList: errorListLocal };
    }
    if (values.lqtBurned) {
      if (errorListLocal.length > 0) {
        return { buttonText: errorListLocal[0], errorList: errorListLocal };
      }

      return { buttonText: REMOVE_BTN_TXT.REMOVE_LIQ, errorList: errorListLocal };
    }

    return { buttonText: BUTTON_TXT.ENTER_AMT, errorList: errorListLocal };
  }, [errors, userAddress, values.lqtBurned]);

  return (
    <form onSubmit={handleSubmit} id="remove-liquidity-form">
      <Stack colorScheme="gray" spacing={2}>
        <FormControl id="to-input-amount" mb={2}>
          <FormLabel color={text2} fontSize="xs">
            LQT to burn
          </FormLabel>
          <Input
            name="lqtBurned"
            id="lqtBurned"
            value={inputFormatNumberStandard(values.lqtBurned)}
            color={text2}
            bg={inputbg}
            onChange={handleChange}
            placeholder="0.0"
            type="text"
            lang="en-US"
          />
          {typeof userLqtData?.ctezDexLqt !== 'undefined' && (
            <Text color={text4} fontSize="xs" mt={1}>
              Balance: {formatNumberStandard(userLqtData?.ctezDexLqt / 1e6)}{' '}
              <Text
                as="span"
                cursor="pointer"
                color={maxColor}
                onClick={() =>
                  formik.setFieldValue('lqtBurned', formatNumberStandard(userLqtData?.ctezDexLqt / 1e6))
                }
              >
                (Max)
              </Text>
            </Text>
          )}
        </FormControl>

        <Flex alignItems="center" justifyContent="space-between">
          <FormControl id="to-input-amount" w="45%">
            <FormLabel color={text2} fontSize="xs">
              Min. tez to withdraw
            </FormLabel>
            <Input
              readOnly
              border={0}
              placeholder="0.0"
              type="text"
              color={text2}
              lang="en-US"
              value={otherValues.cashWithdraw}
            />
          </FormControl>

          <Icon as={MdAdd} mb="-25" fontSize="lg" />
          <FormControl id="to-input-amount" w="45%">
            <FormLabel color={text2} fontSize="xs">
              Min. ctez to withdraw
            </FormLabel>
            <Input
              readOnly
              border={0}
              placeholder="0.0"
              type="text"
              color={text2}
              lang="en-US"
              value={otherValues.tokenWithdraw}
            />
          </FormControl>
        </Flex>
        <Button
          walletGuard
          variant="outline"
          type="submit"
          isLoading={isSubmitting}
          disabled={isSubmitting || errorList.length > 0}
        >
          {buttonText}
        </Button>
      </Stack>
    </form>
  );
};

export default RemoveLiquidity;
