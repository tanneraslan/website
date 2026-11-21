import Content from '@/content/resume.mdx'
import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Resume', description: 'Tanner Aslan’s software engineering, graphics, and research experience at Klaviyo, Michigan Field Robotics Group, SeatGeek, and SIGGRAPH.',
  alternates: { canonical: '/resume' },
}
export default function Resume() {
  return <article className="resume-document"><Content/></article>
}
