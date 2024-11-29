const PHOTOS_LIST = [
  "/blog/lights.png",
  "/blog/lights.png",
  "/blog/lights.png",
  "/blog/ship.png",
  "/blog/lights.png",
  "/blog/lights.png",
];
export const Photos = () => {
  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
      }}
    >
      {PHOTOS_LIST.map((photo) => (
        <div
          key={photo}
          className="block  aspect-square overflow-hidden relative"
        >
          <img src={photo} className="object-cover w-full h-full" />
        </div>
      ))}
    </div>
  );
};
