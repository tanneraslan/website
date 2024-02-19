// @ts-ignore
import ReactLatex from "react-latex";

export const Latex: React.FC<{ children: string }> = ({ children }) => {
  return <ReactLatex>{children}</ReactLatex>;
};
