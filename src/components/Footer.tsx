import React from "react";
import { EnvelopeClosedIcon, GitHubLogoIcon } from "@radix-ui/react-icons";

const Footer: React.FC = () => {
  return (
    <footer className="space-x-4 flex my-24">
      <div className="mr-auto">© Tanner Aslan 2024</div>
      <a
        className="flex items-center space-x-1"
        href="mailto:tanneraslan05@gmail.com"
      >
        <EnvelopeClosedIcon />
        <span>Email</span>
      </a>
      <a
        className="flex items-center space-x-1"
        href="https://github.com/tanneraslan"
      >
        <GitHubLogoIcon /> <span>Github</span>
      </a>
    </footer>
  );
};

export default Footer;
