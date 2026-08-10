import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, LogOut, PiggyBank, ShieldCheck, Sparkles, Trash2, UserRound } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { TextField } from "../components/ui/TextField";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState, FormError, LoadingState } from "../components/ui/Feedback";
import { SettingsSection } from "../components/configuracoes/SettingsSection";
import { useAuth } from "../context/AuthContext";
import {
  useAtualizarConfiguracoes,
  useConfiguracoes,
  useExcluirRegra,
  useRegras,
} from "../hooks/queries";
import { iniciaisDoNome } from "../lib/finance";

function useSalvoFeedback() {
  const [salvo, setSalvo] = useState(false);
  const dispararSalvo = () => {
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  };
  return { salvo, dispararSalvo };
}

function SalvoBadge({ visivel }: { visivel: boolean }) {
  if (!visivel) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-income-600">
      <Check size={15} /> Salvo
    </span>
  );
}

export function Configuracoes() {
  const navigate = useNavigate();
  const { user, updateProfile, changePassword, logout } = useAuth();

  const [nome, setNome] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [erroPerfil, setErroPerfil] = useState<unknown>(null);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const perfilFeedback = useSalvoFeedback();

  const configuracoes = useConfiguracoes();
  const atualizarConfiguracoes = useAtualizarConfiguracoes();
  const [percentual, setPercentual] = useState(20);
  const percentualFeedback = useSalvoFeedback();

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [erroSenha, setErroSenha] = useState<unknown>(null);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const senhaFeedback = useSalvoFeedback();

  const regras = useRegras();
  const excluirRegra = useExcluirRegra();

  useEffect(() => {
    if (configuracoes.data) setPercentual(configuracoes.data.investmentPercentage);
  }, [configuracoes.data]);

  const handleSalvarPerfil = async (event: React.FormEvent) => {
    event.preventDefault();
    setErroPerfil(null);
    setSalvandoPerfil(true);
    try {
      await updateProfile(nome.trim(), email.trim());
      perfilFeedback.dispararSalvo();
    } catch (err) {
      setErroPerfil(err);
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const handleSalvarPercentual = async () => {
    await atualizarConfiguracoes.mutateAsync({ investmentPercentage: percentual });
    percentualFeedback.dispararSalvo();
  };

  const handleAtualizarSenha = async (event: React.FormEvent) => {
    event.preventDefault();
    setErroSenha(null);
    setSalvandoSenha(true);
    try {
      await changePassword(senhaAtual, novaSenha);
      setSenhaAtual("");
      setNovaSenha("");
      senhaFeedback.dispararSalvo();
    } catch (err) {
      setErroSenha(err);
    } finally {
      setSalvandoSenha(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Gerencie seu perfil, preferências e segurança"
      />

      <div className="space-y-5">
        <SettingsSection
          icon={<UserRound size={20} />}
          title="Perfil"
          description="Suas informações pessoais e de contato."
        >
          <form onSubmit={handleSalvarPerfil}>
            <div className="mb-5 flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-lg font-semibold text-white">
                {iniciaisDoNome(nome)}
              </span>
              <p className="text-sm text-ink-500">
                Conta criada em{" "}
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("pt-BR")
                  : "—"}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Nome"
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
              <TextField
                label="E-mail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="mt-3">
              <FormError error={erroPerfil} />
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Button type="submit" size="sm" disabled={salvandoPerfil}>
                {salvandoPerfil ? "Salvando…" : "Salvar alterações"}
              </Button>
              <SalvoBadge visivel={perfilFeedback.salvo} />
            </div>
          </form>
        </SettingsSection>

        <SettingsSection
          icon={<PiggyBank size={20} />}
          title="Porcentagem desejada para investir"
          description="Percentual da receita mensal reservado como sugestão de investimento."
        >
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={50}
              value={percentual}
              onChange={(e) => setPercentual(Number(e.target.value))}
              className="h-2 flex-1 cursor-pointer accent-invest-500"
              aria-label="Percentual de investimento"
            />
            <span className="w-16 shrink-0 rounded-lg bg-invest-50 px-3 py-1.5 text-center font-display text-base font-semibold text-invest-600">
              {percentual}%
            </span>
          </div>
          <p className="mt-3 text-xs text-ink-400">
            Usado para calcular o card &quot;Quanto posso investir&quot; na Visão Geral.
            Vale para todos os meses até você alterar.
          </p>
          <div className="mt-3">
            <FormError error={atualizarConfiguracoes.error} />
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Button
              size="sm"
              onClick={handleSalvarPercentual}
              disabled={atualizarConfiguracoes.isPending}
            >
              {atualizarConfiguracoes.isPending ? "Salvando…" : "Salvar preferência"}
            </Button>
            <SalvoBadge visivel={percentualFeedback.salvo} />
          </div>
        </SettingsSection>

        <SettingsSection
          icon={<Sparkles size={20} />}
          title="Categorias aprendidas"
          description="Associações que o sistema guardou a partir das suas correções nas importações de extrato."
        >
          {regras.isLoading ? (
            <LoadingState />
          ) : (regras.data ?? []).length === 0 ? (
            <EmptyState
              icon={<Sparkles size={20} />}
              title="Nada aprendido ainda"
              description="Ao corrigir a categoria de uma movimentação importada, o sistema passa a reconhecê-la sozinho."
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {regras.data!.map((regra) => (
                <li key={regra.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-ink-500">
                      {regra.pattern}
                    </p>
                    <p className="text-sm font-medium text-ink-900">
                      → {regra.categoryName}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-ink-400">
                    {regra.hitCount}x
                  </span>
                  <button
                    onClick={() => excluirRegra.mutate(regra.id)}
                    className="shrink-0 cursor-pointer rounded-lg p-1.5 text-ink-400 hover:bg-expense-50 hover:text-expense-600"
                    aria-label={`Esquecer regra ${regra.pattern}`}
                    title="Esquecer esta associação"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <FormError error={excluirRegra.error} />
          </div>
        </SettingsSection>

        <SettingsSection
          icon={<ShieldCheck size={20} />}
          title="Segurança"
          description="Mantenha sua conta protegida."
        >
          <form onSubmit={handleAtualizarSenha}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Senha atual"
                type="password"
                placeholder="••••••••"
                required
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
              />
              <TextField
                label="Nova senha"
                type="password"
                placeholder="Mínimo 8 caracteres, com letra e número"
                required
                minLength={8}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
              />
            </div>
            <div className="mt-3">
              <FormError error={erroSenha} />
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Button type="submit" size="sm" disabled={salvandoSenha}>
                {salvandoSenha ? "Atualizando…" : "Atualizar senha"}
              </Button>
              <SalvoBadge visivel={senhaFeedback.salvo} />
            </div>
          </form>
        </SettingsSection>

        <Card className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-expense-50 text-expense-500">
              <LogOut size={20} />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-ink-900">Sair</h2>
              <p className="text-sm text-ink-500">Encerrar sessão neste dispositivo.</p>
            </div>
          </div>
          <Button variant="danger" onClick={handleLogout}>
            Sair da conta
          </Button>
        </Card>
      </div>
    </div>
  );
}
