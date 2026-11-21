'use server'

import { contactParts } from '@/content/contact'

export async function getContactEmail() {
  const { mailbox, domain, suffix } = contactParts
  return `${mailbox}@${domain}.${suffix}`
}
