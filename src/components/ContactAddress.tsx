'use client'

import { CheckIcon, CopyIcon } from '@radix-ui/react-icons'
import { useEffect, useState } from 'react'
import { getContactEmail } from '@/app/contact-action'
import { contactParts } from '@/content/contact'

export function ContactAddress() {
  const [status, setStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle')
  const [manualAddress, setManualAddress] = useState('')
  useEffect(() => {
    if (status !== 'copied') return
    const timer = window.setTimeout(() => setStatus('idle'), 2000)
    return () => window.clearTimeout(timer)
  }, [status])

  async function copy() {
    setStatus('copying')
    const address = getContactEmail()
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        // Safari needs the write to start within the click, before the request resolves.
        const text = address.then(value => new Blob([value], { type: 'text/plain' }))
        const write = navigator.clipboard.write([new ClipboardItem({ 'text/plain': text })])
        await Promise.all([write, text])
      } else {
        const value = await address
        await navigator.clipboard.writeText(value)
      }
      setManualAddress('')
      setStatus('copied')
    } catch {
      setManualAddress(await address.catch(() => ''))
      setStatus('error')
    }
  }

  return <span className="contact-address">
    <span className="contact-spelling">
      <span>{contactParts.mailbox}</span>
      <svg role="img" aria-label="at" viewBox="0 0 20 20" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <ellipse cx="9.3" cy="10" rx="3.4" ry="4"/>
        <path d="M13.5 6.4l-.8 6c-.3 2.3 3.4 2.8 4.8-.7C19.9 5.6 14.9 1.3 9.8 1.6 4.8 1.9 1.1 6.1 1.6 11.1c.5 5.4 6.6 9.4 12.4 6.3"/>
      </svg>
      <span>{contactParts.domain}</span>
      <svg role="img" aria-label="dot" viewBox="0 0 4 16" width=".25em" height="1em">
        <circle cx="2" cy="13.5" r="1.2" fill="currentColor"/>
      </svg>
      <span>{contactParts.suffix}</span>
    </span>
    <button type="button" className="contact-copy" title="Copy email to clipboard" aria-label="Copy email to clipboard"
      disabled={status === 'copying'} onClick={copy}>{status === 'copied' ? <CheckIcon/> : <CopyIcon/>}</button>
    <span role="status" className={status === 'error' ? undefined : 'contact-status'}>
      {status === 'copied' && 'Email copied.'}
      {status === 'error' && (manualAddress ? 'Select the email to copy manually.' : 'Couldn’t load the email. Try again.')}
    </span>
    {status === 'error' && manualAddress && <input readOnly aria-label="Email address to copy" value={manualAddress} onFocus={event => event.target.select()}/>}
  </span>
}
