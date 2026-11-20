'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { applyActionError } from '@/lib/action-error';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '../hooks/use-notification-preferences';
import type { PushKind } from '../push-preferences';

type PreferenceOption = { kind: PushKind; label: string; hint?: string };

const OPTIONS: PreferenceOption[] = [
  { kind: 'taskAssigned', label: 'Tarefa atribuída a mim' },
  { kind: 'taskCompleted', label: 'Tarefa concluída pela outra pessoa' },
  { kind: 'dailySummary', label: 'Resumo da manhã', hint: 'Tarefas, eventos e datas de hoje.' },
  {
    kind: 'tomorrowPreview',
    label: 'Prévia de amanhã no resumo',
    hint: 'Eventos e datas do dia seguinte.',
  },
  {
    kind: 'lowStock',
    label: 'Estoque de remédio baixo',
    hint: 'O nome do remédio aparece na tela de bloqueio.',
  },
];

export function PreferencesList() {
  const preferences = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  if (!preferences.data) return null;
  const current = preferences.data;

  return (
    <ul className="flex flex-col gap-1">
      {OPTIONS.map((option) => {
        // A prévia de amanhã faz parte do resumo: sem resumo, não há onde ela apareça.
        const disabled = option.kind === 'tomorrowPreview' && !current.dailySummary;
        return (
          <li key={option.kind} className="flex min-h-11 items-center justify-between gap-3">
            <div className="flex flex-col">
              <Label htmlFor={`pref-${option.kind}`}>{option.label}</Label>
              {option.hint ? (
                <span className="text-xs text-muted-foreground">{option.hint}</span>
              ) : null}
            </div>
            <Switch
              id={`pref-${option.kind}`}
              checked={current[option.kind]}
              disabled={disabled}
              onCheckedChange={(checked) =>
                update.mutate(
                  { [option.kind]: checked },
                  { onError: (error) => applyActionError(error) },
                )
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
