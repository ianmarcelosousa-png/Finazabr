import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";
import { AuthLayout } from "../components/layout/AuthLayout";
import { TextField } from "../components/ui/TextField";
import { Button } from "../components/ui/Button";
import { FormError } from "../components/ui/Feedback";
import { useAuth } from "../context/AuthContext";

export function RedefinirSenha() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { resetPassword } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState<unknown>(null);
  const [enviando, setEnviando] = useState(false);

  if (!token) {
    return (
      <AuthLayout>
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-ink-900">
            Link inválido
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Este link de redefinição de senha está incompleto. Solicite um novo.
          </p>
          <Link
            to="/esqueci-senha"
            className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Solicitar novo link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await resetPassword(token, novaSenha);
      setConcluido(true);
    } catch (err) {
      setErro(err);
    } finally {
      setEnviando(false);
    }
  };

  if (concluido) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-income-50 text-income-600">
            <CheckCircle2 size={26} />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold text-ink-900">
            Senha redefinida
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Sua senha foi alterada. Entre com a nova senha para continuar.
          </p>
          <Button className="mt-8" onClick={() => navigate("/login")}>
            Ir para o login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Nova senha</h1>
      <p className="mt-1.5 text-sm text-ink-500">Escolha uma nova senha para sua conta.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <TextField
          label="Nova senha"
          type={showPassword ? "text" : "password"}
          placeholder="Mínimo 8 caracteres, com letra e número"
          autoComplete="new-password"
          icon={<Lock size={16} />}
          required
          minLength={8}
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="cursor-pointer text-ink-400 hover:text-ink-600"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />

        <FormError error={erro} />

        <Button type="submit" fullWidth size="lg" disabled={enviando}>
          {enviando ? "Salvando…" : "Redefinir senha"}
        </Button>
      </form>
    </AuthLayout>
  );
}
