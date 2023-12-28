import { flattenDeep } from "lodash";
import dynamic from "next/dynamic";
import { Pre } from "nextra/components";
import { Box, Tabs } from "@radix-ui/themes";

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
  footer: null,
  head: ({ title, meta }) => (
    <>
      {meta.description && (
        <meta name="description" content={meta.description} />
      )}
      {meta.tag && <meta name="keywords" content={meta.tag} />}
      {meta.author && <meta name="author" content={meta.author} />}
    </>
  ),
  components: {
    navs: [],
    pre: ({ children, ...props }) => {
      if (props["data-language"] === "glsl") {
        const finalCode = flattenDeep(renderChildContent(children)).join("");

        return (
          <Tabs.Root defaultValue="code">
            <Tabs.List>
              <Tabs.Trigger value="code">Code</Tabs.Trigger>
              <Tabs.Trigger value="Preview">Preview</Tabs.Trigger>
            </Tabs.List>
            <Box pt="4">
              <Tabs.Content value="code">
                <Pre style={{ marginTop: 0 }} {...props}>
                  {children}
                </Pre>
              </Tabs.Content>
              <Tabs.Content value="Preview">
                <ShaderCanvas frag={finalCode} />
              </Tabs.Content>
            </Box>
          </Tabs.Root>
        );
      }
      return <Pre {...props}>{children}</Pre>;
    },
  },

  readMore: "Read More →",
  dateFormatter: (date) => `Last updated at ${date.toDateString()}`,
};
