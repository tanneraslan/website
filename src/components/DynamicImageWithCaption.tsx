// @ts-ignore

const DynamicImageWithCaption = ({ src, alt, caption}) => {
  if (!src) return null; // Avoid rendering mismatched elements
  return (
    <div style={{ textAlign: "center" }}>
      <img
        src={src}
        alt={alt}
        title={alt}
        style={{ maxWidth: "100%", height: "auto", marginBottom: "5px" }} // Reduce bottom margin
      />
      <p style={{ color: "grey", fontSize: "small", marginTop: "0" }}> {/* Remove top margin */}
        {caption}
      </p>
    </div>
  );
};

export default DynamicImageWithCaption;
