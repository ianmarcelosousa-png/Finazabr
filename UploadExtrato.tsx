import { useRef, useState, type DragEvent } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { FormError, Spinner } from "../ui/Feedback";
import { cn } from "../../lib/cn";

interface Props {
  onEnviar: (file: File) => void;
  enviando: boolean;
  erro: unknown;
}

const EXTENSOES_ACEITAS = ".csv,.txt,.ofx,.qfx,.pdf";
const LIMITE_MB = 5;

export function UploadExtrato({ onEnviar, enviando, erro }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);

  const selecionar = (arquivo: File | undefined) => {
    if (arquivo) onEnviar(arquivo);
  };

  const aoSoltar = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setArrastando(false);
    selecionar(event.dataTransfer.files[0]);
  };

  return (
    <Card className="p-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={aoSoltar}
        className={cn(
          "flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          arrastando ? "border-brand-500 bg-brand-50/50" : "border-ink-200"
        )}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          {enviando ? <Spinner className="h-6 w-6" /> : <Upload size={24} />}
        </span>

        <div>
          <p className="font-display text-base font-semibold text-ink-900">
            {enviando ? "Lendo o extrato…" : "Envie seu extrato bancário"}
          </p>
          <p className="mt-1 text-sm text-ink-500">
            Arraste o arquivo aqui ou clique para escolher
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={EXTENSOES_ACEITAS}
          className="hidden"
          onChange={(e) => {
            selecionar(e.target.files?.[0]);
            // Permite reenviar o mesmo arquivo depois de um erro.
            e.target.value = "";
          }}
        />

        <Button
          onClick={() => inputRef.current?.click()}
          disabled={enviando}
          icon={<FileSpreadsheet size={16} />}
        >
          Escolher arquivo
        </Button>

        <p className="text-xs text-ink-400">
          CSV, OFX ou PDF · até {LIMITE_MB} MB
        </p>
      </div>

      <div className="mt-5">
        <FormError error={erro} />
      </div>

      <div className="mt-5 rounded-xl bg-ink-50 px-4 py-3">
        <p className="text-sm font-medium text-ink-700">Como funciona</p>
        <ol className="mt-2 space-y-1 text-sm text-ink-500">
          <li>1. O sistema lê o arquivo e identifica data, descrição, valor e tipo.</li>
          <li>2. Sugere uma categoria para cada movimentação e avisa sobre possíveis duplicatas.</li>
          <li>
            3. <strong className="text-ink-700">Você confere e confirma</strong> — nada entra
            na sua conta antes disso.
          </li>
        </ol>
        <p className="mt-3 text-xs text-ink-400">
          O arquivo é lido na memória do servidor e descartado em seguida — o extrato não
          fica armazenado.
        </p>
      </div>
    </Card>
  );
}
