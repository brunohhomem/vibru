import { ImageResponse } from 'next/og';
import { AppIconArt } from '@/components/brand/app-icon-art';

export function generateImageMetadata() {
  return [
    {
      id: '192',
      size: { width: 192, height: 192 },
      contentType: 'image/png' as const,
      alt: 'Vibru',
    },
    {
      id: '512',
      size: { width: 512, height: 512 },
      contentType: 'image/png' as const,
      alt: 'Vibru',
    },
  ];
}

export default async function Icon({ id }: { id: string | Promise<string> }) {
  const metadataId = await id;
  const dimension = metadataId === '512' ? 512 : 192;

  return new ImageResponse(<AppIconArt dimension={dimension} />, {
    width: dimension,
    height: dimension,
  });
}
