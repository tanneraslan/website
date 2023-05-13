export default {
  footer: (
    <small style={{ display: "block", marginTop: "8rem" }}>
      {new Date().getFullYear()} © Tanner Aslan.
      <style jsx>{`
        a {
          float: right;
        }

        @media screen and (max-width: 480px) {
          article {
            padding-top: 2rem;
            padding-bottom: 4rem;
          }
        }
      `}</style>
    </small>
  ),
  head: ({ title, meta }) => (
    <>
      <title>{title} - Tanner Aslan</title>
      {meta.description && (
        <meta name="description" content={meta.description} />
      )}
      {meta.tag && <meta name="keywords" content={meta.tag} />}
      {meta.author && <meta name="author" content={meta.author} />}
    </>
  ),
  readMore: "Read More →",
  darkMode: true,
  dateFormatter: (date) => `Last updated at ${date.toDateString()}`,
};
