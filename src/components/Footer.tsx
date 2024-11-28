import React from "react";
import { EnvelopeClosedIcon, GitHubLogoIcon, LinkedInLogoIcon} from "@radix-ui/react-icons";

const Footer: React.FC = () => {
  return (
    <footer className="space-x-4 flex my-24">
      <div className="mr-auto">© Tanner Aslan 2024</div>
      <a
        className="flex items-center space-x-1"
        href="mailto:contact@tanneraslan.com"
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
      <a
        className="flex items-center space-x-1"
        href="https://www.linkedin.com/in/tanner-aslan/"
      >
        <LinkedInLogoIcon /> <span>LinkedIn</span>
      </a>
    </footer>
  );
};

export default Footer;
