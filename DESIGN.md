# DESIGN.md

A semântica fica aqui. Os valores (cor, espaço, raio, sombra) ficam só no `globals.css`, que nasce na F5. Até lá, não invente um valor no lugar desse arquivo.

## Princípios

1. Mobile-first: o estilo base é o de mobile e só evolui com `min-width`.

## Identidade Vibru

O tema C2 (claro) e C3 (noite) vem do ADR 0003, seção 6. O valor de cada token mora só no `globals.css`; o componente usa o nome semântico.

### Tokens semânticos

| Token                                              | Uso                                         |
| -------------------------------------------------- | ------------------------------------------- |
| `background` / `foreground`                        | fundo da página e texto                     |
| `card` / `border`                                  | bloco neutro e sua borda                    |
| `muted-foreground`                                 | texto secundário                            |
| `primary` / `primary-foreground`                   | "nós": destaque, aba ativa, botão principal |
| `sand` / `sand-foreground`                         | bodas e datas do casal                      |
| `blue-tile` / `blue-on-tile` / `blue-strong`       | blocos, texto e destaque da pessoa azul     |
| `purple-tile` / `purple-on-tile` / `purple-strong` | blocos, texto e destaque da pessoa roxa     |

### Três tons por pessoa

Cada pessoa tem três tons por tema: bloco (`*-tile`), texto sobre o bloco (`*-on-tile`) e destaque forte (`*-strong`). Pastel funciona em bloco grande, mas some num ponto ou etiqueta. A cor vem de `couple_members.color`, nunca do nome; a tradução para classes fica em `features/couple/lib/member-color.ts`.

### Tipografia

Texto em Nunito (`font-sans`), títulos e números em Bricolage Grotesque (`font-display`). Ambas vêm de `next/font`, sem request externo em runtime.

### Bento

Grade de 2 colunas no mobile e 4 a partir de `lg`, com `gap` de 8px e cantos de 24–28px. Bloco opcional sem dado não aparece; os demais sobem na grade, sem buraco (ADR 0003, seção 6, regra 6).

## Tokens

Use o token semântico (`bg-primary`, `text-muted`, `border-border`). Não escreva hex, rgb nem oklch no componente. A fonte da verdade dos valores é o `globals.css`.

## Tema

Claro, escuro e sistema. O modo ativo fica na classe `dark` do documento. Trocar a paleta de um fork é editar o `globals.css`, não os componentes.

## Componentes

1. Componente de UI só vem do shadcn, em `components/ui`.
2. Ícone só vem do lucide.
3. No mobile, a sidebar vira drawer (Sheet).
4. Abaixo de `md`, tabela vira lista de cards.

## Estados

Toda tela que busca ou envia dado tem loading, vazio e erro. Feedback curto vai em toast.

## Acessibilidade

1. Alvo de toque de no mínimo 44px.
2. Campo de formulário com fonte de no mínimo 16px.
3. Contraste e foco visível nos controles interativos.

## Proibições

1. Hex, rgb ou oklch solto no componente.
2. Variante `max-*`.
3. `vh` no lugar de `dvh`.
4. Componente visual fora do shadcn.
