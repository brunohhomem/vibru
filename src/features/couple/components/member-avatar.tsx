import Image from 'next/image';
import { memberColorClasses } from '@/features/couple/lib/member-color';
import { cn } from '@/lib/cn';
import type { CoupleMember } from '@/features/couple/couple-schemas';

type MemberAvatarSize = 'extraSmall' | 'small' | 'medium' | 'large';

const SIZE_CLASSES: Record<MemberAvatarSize, string> = {
  extraSmall: 'size-5 text-[0.625rem]',
  small: 'size-7 text-xs',
  medium: 'size-9 text-sm',
  large: 'size-24 text-3xl',
};

const SIZE_PIXELS: Record<MemberAvatarSize, number> = {
  extraSmall: 20,
  small: 28,
  medium: 36,
  large: 96,
};

type MemberAvatarProps = {
  member: Pick<CoupleMember, 'displayName' | 'color' | 'avatarUrl'>;
  size?: MemberAvatarSize;
  className?: string;
};

function memberInitial(displayName: string): string {
  return displayName.trim().charAt(0).toUpperCase();
}

/**
 * Foto da pessoa, ou a inicial na cor dela quando ainda não há foto. É
 * decorativo: o nome sempre aparece em texto ao lado, então a imagem não é lida.
 */
export function MemberAvatar({ member, size = 'medium', className }: MemberAvatarProps) {
  const classes = memberColorClasses(member.color);

  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ring-2 ring-background',
        SIZE_CLASSES[size],
        classes.tile,
        classes.onTile,
        className,
      )}
    >
      {member.avatarUrl ? (
        // data URL já vem reduzida do cliente (256 px): não há o que o otimizador do Next faça.
        <Image
          src={member.avatarUrl}
          alt=""
          width={SIZE_PIXELS[size]}
          height={SIZE_PIXELS[size]}
          unoptimized
          className="size-full object-cover"
        />
      ) : (
        memberInitial(member.displayName)
      )}
    </span>
  );
}
