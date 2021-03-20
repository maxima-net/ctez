import React, { useEffect, useState } from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import * as Yup from 'yup';
import styled from '@emotion/styled';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { Field, Form, Formik } from 'formik';
import { Button, Grid, Paper, InputAdornment } from '@material-ui/core';
import { useToasts } from 'react-toast-notifications';
import { useHistory } from 'react-router-dom';
import { getDelegates } from '../../api/tzkt';
import { create, cTezError } from '../../contracts/ctez';
import Page from '../../components/Page';
import { FormikAutocomplete } from '../../components/Autocomplete';
import { Baker, Depositor } from '../../interfaces';
import { useWallet } from '../../wallet/hooks';
import FormikTextField from '../../components/TextField';
import { TezosIcon } from '../../components/TezosIcon';
import {
  MultiInputTextField,
  MultiInputTextFieldOption,
} from '../../components/MultiInputTextField/MultiInputTextField';
import { FormikRadioGroup } from '../../components/FormikRadioGroup/FormikRadioGroup';
import { logger } from '../../utils/logger';

interface CreateVaultForm {
  delegate: string;
  amount: number;
  depositors: string[] | MultiInputTextFieldOption[];
  depositorOp: Depositor;
}

const PaperStyled = styled(Paper)`
  padding: 2em;
`;

const CreateOvenComponent: React.FC<WithTranslation> = ({ t }) => {
  const { data: delegates } = useQuery<Baker[], AxiosError, Baker[]>(['delegates'], () => {
    return getDelegates();
  });
  const [{ pkh: userAddress }] = useWallet();
  const [delegate, setDelegate] = useState('');
  const { addToast } = useToasts();
  const history = useHistory();
  const validationSchema = Yup.object().shape({
    delegate: Yup.string().required(t('required')),
    amount: Yup.number().optional(),
    depositors: Yup.array().required(t('required')),
  });

  const opSelectionList = [
    {
      label: t(Depositor.whitelist),
      value: Depositor.whitelist,
    },
    {
      label: t(Depositor.any),
      value: Depositor.any,
    },
  ];

  const defaultDepositorList =
    delegate !== ''
      ? [
          {
            value: userAddress!,
            label: 'You',
            noDelete: true,
          },
          {
            value: delegate,
            label: 'Delegate',
          },
        ]
      : [
          {
            value: userAddress!,
            label: 'You',
            noDelete: true,
          },
        ];

  const [initialValues, setInitialValues] = useState<CreateVaultForm>({
    delegate,
    amount: 0,
    depositors: userAddress ? defaultDepositorList : [],
    depositorOp: Depositor.whitelist,
  });

  useEffect(() => {
    const newState: CreateVaultForm = {
      ...initialValues,
      delegate,
      depositors: userAddress ? defaultDepositorList : [],
    };
    setInitialValues(newState);
  }, [userAddress, delegate]);

  const handleFormSubmit = async (data: CreateVaultForm) => {
    if (userAddress) {
      try {
        const depositors =
          data.depositors.length > 0 && data.depositorOp === Depositor.whitelist
            ? data.depositors.map((item: any) => item?.value ?? item)
            : undefined;
        const result = await create(
          userAddress,
          data.delegate,
          data.depositorOp,
          depositors,
          data.amount,
        );
        if (result) {
          addToast('Transaction Submitted', {
            appearance: 'success',
            autoDismiss: true,
            onDismiss: () => history.push('/'),
          });
        }
      } catch (error) {
        logger.error(error);
        const errorText = cTezError[error.data[1].with.int as number] || 'Transaction Failed';
        addToast(errorText, {
          appearance: 'error',
          autoDismiss: true,
        });
      }
    }
  };

  return (
    <Page title={t('header:createOven')}>
      <Formik
        enableReinitialize
        validateOnMount
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleFormSubmit}
      >
        {({ isSubmitting, isValid, values }) => (
          <PaperStyled>
            <Form>
              <Grid
                container
                spacing={3}
                direction="column"
                alignContent="center"
                justifyContent="center"
              >
                <Grid item style={{ width: '100%' }}>
                  <Field
                    component={FormikAutocomplete}
                    name="delegate"
                    id="delegate"
                    label={t('delegate')}
                    placeholder={t('delegatePlaceholder')}
                    options={delegates}
                    className="delegate"
                    fullWidth
                    handleChange={(value: string) => setDelegate(value)}
                  />
                </Grid>
                <Grid item>
                  <Field
                    component={FormikTextField}
                    name="amount"
                    id="amount"
                    label={t('initialDeposit')}
                    className="amount"
                    type="number"
                    min="0.1"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <TezosIcon height={30} width={30} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item style={{ width: '100%' }}>
                  <Field
                    component={FormikRadioGroup}
                    name="depositorOp"
                    id="depositorOp"
                    groupLabel={t('depositorOp')}
                    options={opSelectionList}
                  />
                </Grid>
                <Grid item>
                  <Field
                    component={MultiInputTextField}
                    id="depositors"
                    name="depositors"
                    placeholder="e.g. tz3d1ZjAkd9zCGMoRTMYNaeZhFurS65U2U1J"
                    label={t('allowedDepositors')}
                    disabled={values.depositorOp === Depositor.any}
                    isAddressField
                    defaultValue={defaultDepositorList}
                  />
                </Grid>
                <Grid item>
                  <Button
                    variant="contained"
                    type="submit"
                    disabled={!userAddress || isSubmitting || !isValid}
                    fullWidth
                  >
                    {t('submit')}
                  </Button>
                </Grid>
              </Grid>
            </Form>
          </PaperStyled>
        )}
      </Formik>
    </Page>
  );
};

export const CreateOvenPage = withTranslation(['common', 'header'])(CreateOvenComponent);
