import Image from 'next/image';

type Photo = {
  id: number;
  image_url: string;
};

type Props = {
  photos: Photo[];
};

export default function PhotoGrid({ photos }: Props) {
  if (!photos || photos.length === 0) {
    return <p className="text-center text-gray-500">这个分类下还没有照片哦。</p>;
  }

  return (
    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
      {photos.map(photo => (
        <div key={photo.id} className="mb-4 break-inside-avoid">
          <Image
            src={photo.image_url}
            alt={`Photo ${photo.id}`}
            width={500}
            height={500}
            className="w-full h-auto rounded-lg shadow-md object-cover"
          />
        </div>
      ))}
    </div>
  );
}
