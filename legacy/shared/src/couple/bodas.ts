/**
 * Nomes tradicionais brasileiros das bodas, do 1º ao 60º ano.
 *
 * A lista não é oficial: algumas fontes trocam o material de anos isolados.
 * Os marcos cobrados pela spec (1 papel, 3 couro, 25 prata, 50 ouro e
 * 60 diamante) seguem a tabela adotada aqui.
 */
const BODAS_NAMES: readonly string[] = [
  'Papel',
  'Algodão',
  'Couro',
  'Seda',
  'Madeira',
  'Perfume',
  'Lã',
  'Bronze',
  'Cerâmica',
  'Estanho',
  'Aço',
  'Linho',
  'Renda',
  'Marfim',
  'Cristal',
  'Turmalina',
  'Rosa',
  'Turquesa',
  'Água-marinha',
  'Porcelana',
  'Zircão',
  'Louça',
  'Palha',
  'Opala',
  'Prata',
  'Alexandrita',
  'Crisopázio',
  'Hematita',
  'Erva',
  'Pérola',
  'Nácar',
  'Pinho',
  'Carvalho',
  'Oliveira',
  'Coral',
  'Cedro',
  'Aventurina',
  'Mármore',
  'Jade',
  'Esmeralda',
  'Seda Dourada',
  'Prata Dourada',
  'Azeviche',
  'Carbonato',
  'Rubi',
  'Alabastro',
  'Jaspe',
  'Granito',
  'Heliotrópio',
  'Ouro',
  'Bronze Dourado',
  'Argila',
  'Antimônio',
  'Níquel',
  'Ametista',
  'Malaquita',
  'Lápis-lazúli',
  'Vidro',
  'Cereja',
  'Diamante',
];

/** Nome da boda para o número de anos completos de casamento. */
export function bodasName(years: number): string | null {
  if (!Number.isInteger(years)) return null;
  return BODAS_NAMES[years - 1] ?? null;
}
