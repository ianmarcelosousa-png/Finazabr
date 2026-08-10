import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Mail } from "lucide-react";
import { AuthLayout } from "../components/layout/AuthLayout";
import { TextField } from "../components/ui/TextField";
import { Button } from "../components/ui/Button";
import { FormError } from "../components/ui/Feedback";
import { useAuth } from "../context/AuthContext";

/**
 * Tela de recuperação de senha (§1). O backend já não revela se o e-mail
 * existe — a UI segue a mesma discrição: sempre mostra a mesma confirmação.
 */
export function EsqueciSenha() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<unknown>(null);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await forgotPassword(email);
      setEnviado(true);
    } catch (err) {
      setErro(err);
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-income-50 text-income-600">
            <CheckCircle2 size={26} />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold text-ink-900">
            Verifique seu e-mail
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Se <strong className="text-ink-700">{email}</strong> estiver cadastrado, você vai
            receber um link para redefinir sua senha.
          </p>
          <Link
            to="/login"
            className="mt-8 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Voltar para o login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-2xl font-semibold text-ink-900">
        Esqueceu sua senha?
      </h1>
      <p className="mt-1.5 text-sm text-ink-500">
        Informe seu e-mail e enviaremos um link para você criar uma nova senha.
      </p>

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

        <FormError error={erro} />

        <Button type="submit" fullWidth size="lg" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar link de recuperação"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-500">
        Lembrou a senha?{" "}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Voltar para o login
        </Link>
      </p>
    </AuthLayout>
  );
}
