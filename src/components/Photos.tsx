type Photo = {
  src: string;
  aspectRatio: number;
}

type PhotoGroup = {
  [key: string]: {
    startDate: Date;
    endDate: Date;
    photos: Photo[];
  }
}

const PHOTOS_LIST: PhotoGroup = {
  ["San Francisco, CA"]: {
    startDate: new Date("2025-05-05"),
    endDate: new Date("2025-05-08"),
    photos: [
      { src: "/blog/my-trip-to-sf/20250505_134900.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250505_135903.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250505_150614.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250505_152407.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250505_160119.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250506_101114.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250506_104959.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250506_111336.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250506_111746.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250506_122546.jpg", aspectRatio: 0.8202531645569621 },
      { src: "/blog/my-trip-to-sf/20250506_131736.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250506_170455.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250506_172450.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250506_173810.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250506_175232.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250507_102247.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250507_112344.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250507_112614.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250507_114005.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250507_114944.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250507_124226.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250507_132633.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250507_140045.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250508_173322.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250508_184707.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250508_184744.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250508_195740.jpg", aspectRatio: 1.7777777777777777 },
      { src: "/blog/my-trip-to-sf/20250508_200149.jpg", aspectRatio: 1.7777777777777777 },
    ]
  },
  ["New York City, NY"]: {
    startDate: new Date("2025-06-01"),
    endDate: new Date("2025-08-25"),
    photos: [
      { src: "/blog/nyc/20250530_205352.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250601_145935.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250601_165406.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250602_123502.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250603_194214.webp", aspectRatio: 0.5625 },
      { src: "/blog/nyc/20250611_174908.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250612_214054.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250614_165459.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250619_190005.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250619_204728.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250623_204946.webp", aspectRatio: 0.5626528948083719 },
      { src: "/blog/nyc/20250623_210314.webp", aspectRatio: 2.2202643171806167 },
      { src: "/blog/nyc/20250626_194622.webp", aspectRatio: 2.2202643171806167 },
      { src: "/blog/nyc/20250626_200052.webp", aspectRatio: 2.2202643171806167 },
      { src: "/blog/nyc/20250711_172037.webp", aspectRatio: 0.5625 },
      { src: "/blog/nyc/20250711_185344.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250712_114929.webp", aspectRatio: 0.5625 },
      { src: "/blog/nyc/20250712_183817.webp", aspectRatio: 0.5625 },
      { src: "/blog/nyc/20250717_191824.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250719_134750.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250719_141417.webp", aspectRatio: 0.5625 },
      { src: "/blog/nyc/20250719_151747.webp", aspectRatio: 0.5625 },
      { src: "/blog/nyc/20250720_131831.webp", aspectRatio: 0.5625 },
      { src: "/blog/nyc/20250720_133624.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250722_200444.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250724_182841.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250725_201436.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250801_214303.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250801_222259.webp", aspectRatio: 1.7770945426594926 },
      { src: "/blog/nyc/20250801_222536.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250823_132829.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250823_172758.webp", aspectRatio: 0.5625 },
      { src: "/blog/nyc/20250823_180222.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250823_180257.webp", aspectRatio: 0.5625 },
      { src: "/blog/nyc/20250823_180437.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/nyc/20250823_180629.webp", aspectRatio: 1.7777777777777777 },
    ]
  },
  ["Vancouver, BC"]: {
    startDate: new Date("2025-08-09"),
    endDate: new Date("2025-08-14"),
    photos: [
      { src: "/blog/vancouver/20250808_224931.webp", aspectRatio: 0.5625 },
      { src: "/blog/vancouver/20250809_100527.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/vancouver/20250809_100730.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/vancouver/20250809_101843.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/vancouver/20250809_122257.webp", aspectRatio: 0.5625 },
      { src: "/blog/vancouver/20250811_102840.webp", aspectRatio: 0.5625 },
      { src: "/blog/vancouver/20250811_150328.webp", aspectRatio: 0.5625 },
      { src: "/blog/vancouver/20250811_210123.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/vancouver/20250811_210355.webp", aspectRatio: 0.5625 },
      { src: "/blog/vancouver/20250813_153039.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/vancouver/20250814_112711.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/vancouver/20250814_172546.webp", aspectRatio: 1.7777777777777777 },
      { src: "/blog/vancouver/20250815_025245.webp", aspectRatio: 1.7777777777777777 },
    ]
  }
}

import { useState, useRef, useEffect } from "react";

function sortPhotosToOptimalPack(photos: Photo[], numColumns: number): Photo[] {
  const totalAspectRatio = photos.reduce((acc, photo) => acc + photo.aspectRatio, 0);
  const optimalPackSize = totalAspectRatio / numColumns;

  type Bucket = {
    Photos: Photo[];
    TotalAspectRatio: number;
  }

  const buckets: Bucket[] = Array.from({ length: numColumns }, () => ({
    Photos: [],
    TotalAspectRatio: 0,
  }));

  const sorted = [...photos].sort((a, b) => a.aspectRatio - b.aspectRatio);
  sorted.forEach(photo => {
    const optimalBucket = buckets.length > 0 ? buckets.reduce((minItem, currentItem) => {
      if (Math.abs(optimalPackSize - (currentItem.TotalAspectRatio + photo.aspectRatio)) > Math.abs(optimalPackSize - (minItem.TotalAspectRatio + photo.aspectRatio))) {
        return currentItem;
      }
      return minItem;
    }) : buckets[0];

    optimalBucket.Photos.push(photo);
    optimalBucket.TotalAspectRatio += photo.aspectRatio;
  });

  return buckets.flatMap(bucket => bucket.Photos);
}

function useColumnCount(): [number, React.RefObject<HTMLDivElement>] {
  const [columns, setColumns] = useState(1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const updateColumns = () => {
      if (ref.current) {
        const style = getComputedStyle(ref.current);
        const colCount = style.getPropertyValue("column-count");
        if (colCount) setColumns(Number(colCount));
      }
    };

    // Run once on mount
    updateColumns();

    // Watch for resize
    const observer = new ResizeObserver(updateColumns);
    observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return [columns, ref];
}


const Gallery = ({ photos, setSelectedImage }: { photos: Photo[], setSelectedImage: (src: string) => void }) => {
  const [columns, galleryRef] = useColumnCount();

  return (
    <div className="gallery" ref={galleryRef}>
      {sortPhotosToOptimalPack(photos, columns).map((photo) => (
        <img
          key={photo.src}
          src={photo.src}
          className="image"
          alt=""
          onClick={() => setSelectedImage(photo.src)}
        />
      ))}
    </div>
  );
};

export const Photos = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <>
      {Object.entries(PHOTOS_LIST).map(([location, group], idx, arr) => (
        <section key={location}>
          <div style={{ textAlign: "center", marginBottom: "2em" }}>
            <h1>{location}</h1>
            <div style={{ fontSize: "1.1em",  color: "var(--gray-11)" }}>
              {group.startDate.toLocaleDateString()} – {group.endDate.toLocaleDateString()}
            </div>
          </div>
          <Gallery photos={group.photos} setSelectedImage={setSelectedImage} />
          {idx < arr.length - 1 && (
            <hr style={{ margin: "2em 2vw", border: "none", borderTop: "2px solid var(--gray-9)" }} />
          )}
        </section>
      ))}

      {selectedImage && (
        <div className="lightbox" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Selected" />
        </div>
      )}
    </>
  );
};