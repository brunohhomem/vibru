import type { WishCategory } from '@vibru/shared';
import { Film, Heart, MapPin, Music, Plane, Star } from 'lucide-react';

type WishCategoryIconProps = { category: WishCategory; className?: string };

/** Ícone escolhido com JSX direto: o React Compiler não aceita criar componente durante o render. */
export function WishCategoryIcon({ category, className }: WishCategoryIconProps) {
  switch (category) {
    case 'movie':
      return <Film className={className} aria-hidden />;
    case 'music':
      return <Music className={className} aria-hidden />;
    case 'travel':
      return <Plane className={className} aria-hidden />;
    case 'together':
      return <Heart className={className} aria-hidden />;
    case 'date_idea':
      return <MapPin className={className} aria-hidden />;
    case 'other':
      return <Star className={className} aria-hidden />;
  }
}
