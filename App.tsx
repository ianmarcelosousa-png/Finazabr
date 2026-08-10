import { Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider } from "./context/AuthContext";
import { MonthProvider } from "./context/MonthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/auth/ProtectedRoute";
import { Login } from "./pages/Login";
import { Cadastro } from "./pages/Cadastro";
import { EsqueciSenha } from "./pages/EsqueciSenha";
import { RedefinirSenha } from "./pages/RedefinirSenha";
import { VisaoGeral } from "./pages/VisaoGeral";
import { Lancamentos } from "./pages/Lancamentos";
import { Receitas } from "./pages/Receitas";
import { Despesas } from "./pages/Despesas";
import { ImportarExtrato } from "./pages/ImportarExtrato";
import { Categorias } from "./pages/Categorias";
import { Configuracoes } from "./pages/Configuracoes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dinheiro muda com frequência (lançamentos, importações) — cache curto
      // evita tela desatualizada sem refazer a requisição a cada re-render.
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MonthProvider>
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route path="/esqueci-senha" element={<EsqueciSenha />} />
              <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<VisaoGeral />} />
                <Route path="/lancamentos" element={<Lancamentos />} />
                <Route path="/receitas" element={<Receitas />} />
                <Route path="/despesas" element={<Despesas />} />
                <Route path="/importar" element={<ImportarExtrato />} />
                <Route path="/categorias" element={<Categorias />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
              </Route>
            </Route>
          </Routes>
        </MonthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
