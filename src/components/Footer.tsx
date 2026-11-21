import { EnvelopeClosedIcon, GitHubLogoIcon, LinkedInLogoIcon } from '@radix-ui/react-icons'
import type { ReactNode } from 'react'
import { ContactAddress } from './ContactAddress'

export function Footer({ credits }: { credits?: ReactNode }) {
  return <footer className="footer">
    <div className="footer-row">
      <span>© Tanner Aslan {new Date().getUTCFullYear()}</span>
      <div className="footer-contact">
        <span className="footer-email"><EnvelopeClosedIcon aria-hidden="true"/><ContactAddress/></span>
        <a href="https://github.com/tanneraslan" aria-label="GitHub"><GitHubLogoIcon aria-hidden="true"/></a>
        <a href="https://www.linkedin.com/in/tanner-aslan/" aria-label="LinkedIn"><LinkedInLogoIcon aria-hidden="true"/></a>
        <a href="https://x.com/tanneraslan" aria-label="X">
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 48 48" fill="currentColor">
            <path fillRule="evenodd" d="M5.9199219 6 20.582031 27.375 6.2304688 44h3.1796874L21.986328 29.421875 31.986328 44H44L28.681641 21.669922 42.199219 6h-3.169922L27.275391 19.617188 17.933594 6zm3.796875 2h7.1640621l23.322266 34h-7.164063z"/>
          </svg>
        </a>
      </div>
    </div>
    {credits}
  </footer>
}
