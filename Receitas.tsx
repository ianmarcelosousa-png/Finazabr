import { FluxoPage } from "../components/recorrencias/FluxoPage";

export function Receitas() {
  return (
    <FluxoPage
      titulo="Receitas"
      descricao="Sua renda principal recorrente e as rendas extras do mês"
      tipoRecorrencia="income"
      tiposLancamento={["income"]}
      rotuloRecorrencias="Nova receita recorrente"
      rotuloAvulsos="Receitas do mês"
      rotuloNovoAvulso="Renda extra"
      tipoAvulso="income"
    />
  );
}
