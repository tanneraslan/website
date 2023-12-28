import { flattenDeep } from "lodash";
import dynamic from "next/dynamic";
import { Tabs, Pre } from "nextra/components";
import React from "react";

const ShaderCanvas = dynamic(() => import("./src/components/Shader"), {
  ssr: false,
});

const renderChildContent = (children) => {
  const childrenArray = React.Children.toArray(children);

  return childrenArray.map((child, index) => {
    if (typeof child !== "string") {
      return renderChildContent(child.props.children);
    } else {
      return String(child);
    }
  });
};

export default {
  components: {
    pre: ({ children, ...props }) => {
      if (props["data-language"] === "glsl") {
        const finalCode = flattenDeep(renderChildContent(children)).join("");

        return (
          <Tabs items={["code", "preview"]}>
            <Tabs.Tab>
              <Pre {...props}>{children}</Pre>
            </Tabs.Tab>
            <Tabs.Tab>
              <ShaderCanvas frag={finalCode} />
            </Tabs.Tab>
          </Tabs>
        );
      }
      return <Pre {...props}>{children}</Pre>;
    },
  },
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
      <title>
        {meta.title === "About" ? "Tanner Aslan" : `${title} - Tanner Aslan`}
      </title>
      {meta.description && (
        <meta name="description" content={meta.description} />
      )}
      {meta.title && <meta name="title" content={meta.title} />}
      {meta.tag && <meta name="keywords" content={meta.tag} />}
      {meta.author && <meta name="author" content={meta.author} />}
    </>
  ),
  readMore: "Read More →",
  darkMode: true,
  dateFormatter: (date) => `Last updated at ${date.toDateString()}`,
};
