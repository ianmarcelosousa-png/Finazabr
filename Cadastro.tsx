import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { AuthLayout } from "../components/layout/AuthLayout";
import { TextField } from "../components/ui/TextField";
import { Button } from "../components/ui/Button";
import { useAuth, getErrorMessage } from "../context/AuthContext";

export function Cadastro() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      await register(nome, email, senha);
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
        Criar uma conta
      </h1>
      <p className="mt-1.5 text-sm text-ink-500">
        Comece a organizar sua vida financeira
      </p>

      {erro && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-expense-500/20 bg-expense-50 px-3.5 py-3 text-sm text-expense-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {erro}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <TextField
          label="Nome"
          type="text"
          placeholder="Seu nome completo"
          autoComplete="name"
          icon={<User size={16} />}
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

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

        <TextField
          label="Senha"
          type={showPassword ? "text" : "password"}
          placeholder="Mínimo 8 caracteres, com letra e número"
          autoComplete="new-password"
          icon={<Lock size={16} />}
          required
          minLength={8}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
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

        <TextField
          label="Confirmar senha"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          autoComplete="new-password"
          icon={<Lock size={16} />}
          required
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
        />

        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-500">
        Já tem uma conta?{" "}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Voltar para o login
        </Link>
      </p>
    </AuthLayout>
  );
}
