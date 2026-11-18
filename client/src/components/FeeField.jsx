import { Field, NumberInput } from './ui';
import InputIssues, { CeilingNotice } from './InputIssues';

/** Campo da taxa da bancada (prata por 100 de nutrição), informado pelo usuário. Avisa enquanto for o padrão do app. */
export default function FeeField({ label, value, onChange, touched, onTouch, issues, ceilingNotice = true }) {
  return (
    <Field
      label={label}
      hint={touched ? undefined : 'Valor padrão do app (400), não do jogo. Informe a taxa da sua bancada (prata por 100 de nutrição).'}
    >
      <NumberInput
        value={value}
        onChange={(v) => {
          onChange(v);
          onTouch();
        }}
      />
      <InputIssues issues={issues} />
      {ceilingNotice && <CeilingNotice />}
    </Field>
  );
}
