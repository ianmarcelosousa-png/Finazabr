import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { AuthLayout } from "../components/layout/AuthLayout";
import { TextField } from "../components/ui/TextField";
import { Button } from "../components/ui/Button";
import { useAuth, getErrorMessage } from "../context/AuthContext";

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setErro(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="font-display text-2xl font-semibold text-ink-900">
        Bem-vindo de volta
      </h1>
      <p className="mt-1.5 text-sm text-ink-500">
        Entre com sua conta para continuar
      </p>

      {erro && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-expense-500/20 bg-expense-50 px-3.5 py-3 text-sm text-expense-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {erro}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <TextField
          label="E-mail"
          type="email"
          placeholder="voce@email.com"
          autoComplete="email"
          icon={<Mail size={16} />}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div>
          <TextField
            label="Senha"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            icon={<Lock size={16} />}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          <div className="mt-2 text-right">
            <Link
              to="/esqueci-senha"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>

        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-500">
        Não tem uma conta?{" "}
        <Link
          to="/cadastro"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Criar uma conta
        </Link>
      </p>
    </AuthLayout>
  );
}
