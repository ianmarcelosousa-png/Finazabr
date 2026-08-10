import { FluxoPage } from "../components/recorrencias/FluxoPage";

export function Despesas() {
  return (
    <FluxoPage
      titulo="Despesas"
      descricao="Suas contas fixas mensais e os gastos variáveis do mês"
      tipoRecorrencia="fixed_expense"
      tiposLancamento={["fixed_expense", "variable_expense"]}
      rotuloRecorrencias="Nova despesa fixa"
      rotuloAvulsos="Despesas do mês"
      rotuloNovoAvulso="Despesa variável"
      tipoAvulso="variable_expense"
    />
  );
}
