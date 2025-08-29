import React from "react";
import { EnvelopeClosedIcon, GitHubLogoIcon, LinkedInLogoIcon, TwitterLogoIcon } from "@radix-ui/react-icons";

const NewTwitterLogoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 5.9199219 6 L 20.582031 27.375 L 6.2304688 44 L 9.4101562 44 L 21.986328 29.421875 L 31.986328 44 L 44 44 L 28.681641 21.669922 L 42.199219 6 L 39.029297 6 L 27.275391 19.617188 L 17.933594 6 L 5.9199219 6 z M 9.7167969 8 L 16.880859 8 L 40.203125 42 L 33.039062 42 L 9.7167969 8 z" fill="currentColor" fill-rude="evenodd" clip-rule="evenodd"></path>
  </svg>
);

const Footer: React.FC = () => {
  const [currentYear, setCurrentYear] = React.useState<number | null>(null);

  React.useEffect(() => {
    setCurrentYear((new Date()).getFullYear());
  }, []);

  return (
    <footer className="space-x-4 flex my-24">
      <div className="mr-auto">© Tanner Aslan {currentYear || "----"}</div>
      <a
        className="flex items-center space-x-1"
        href="mailto:contact@tanneraslan.com"
      >
        <EnvelopeClosedIcon />
      </a>
      <a
        className="flex items-center space-x-1"
        href="https://github.com/tanneraslan"
      >
        <GitHubLogoIcon />
      </a>
      <a
        className="flex items-center space-x-1"
        href="https://www.linkedin.com/in/tanner-aslan/"
      >
        <LinkedInLogoIcon />
      </a>
      <a
        className="flex items-center space-x-1"
        href="https://x.com/tanneraslan"
      >
        <NewTwitterLogoIcon />
      </a>
    </footer>
  );
};

export default Footer;
