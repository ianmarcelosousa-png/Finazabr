import type { ReactNode } from "react";
import { Card } from "../ui/Card";

interface SettingsSectionProps {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}

export function SettingsSection({ icon, title, description, children }: SettingsSectionProps) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <div className="w-full shrink-0 sm:w-56">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            {icon}
          </span>
          <h2 className="font-display text-base font-semibold text-ink-900">{title}</h2>
          <p className="mt-1 text-sm text-ink-500">{description}</p>
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </Card>
  );
}
