/* eslint-disable @typescript-eslint/naming-convention -- as chaves do Web App Manifest (short_name, start_url, background_color, theme_color) seguem a especificação W3C, não o padrão do projeto */
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vibru',
    short_name: 'Vibru',
    description: 'O cantinho do casal: tarefas, listas, agenda e desejos.',
    lang: 'pt-BR',
    start_url: '/app',
    display: 'standalone',
    background_color: '#F8F3EE',
    theme_color: '#F8F3EE',
    // Menu de pressionar o ícone no Android e no desktop. O iOS ainda não lê este campo.
    shortcuts: [
      {
        name: 'Nova tarefa',
        short_name: 'Tarefa',
        url: '/app/tasks?novo=1',
        icons: [{ src: '/icon/192', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Agenda',
        url: '/app/agenda',
        icons: [{ src: '/icon/192', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Listas',
        url: '/app/lists',
        icons: [{ src: '/icon/192', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Desejos',
        url: '/app/wishes',
        icons: [{ src: '/icon/192', sizes: '192x192', type: 'image/png' }],
      },
    ],
    icons: [
      { src: '/icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
