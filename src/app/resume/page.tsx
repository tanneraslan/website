import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Résumé', description: 'Tanner Aslan’s software engineering, graphics, and research experience at Klaviyo, Michigan Field Robotics Group, SeatGeek, and SIGGRAPH.',
  alternates: { canonical: '/resume' },
}
const experience = [
  ['Roblox', 'Incoming software engineer', 'Starting 2027'],
  ['Klaviyo', 'Front-end software engineering intern', 'Boston, MA · Summer 2026'],
  ['Michigan Field Robotics Group', 'Simulation engineering research assistant', 'Ann Arbor, MI · Spring 2026'],
  ['SIGGRAPH', 'Student volunteer', 'Vancouver, BC · August 2025'],
  ['SeatGeek', 'Full-stack software engineering intern', 'New York, NY · Summer 2025'],
  ['Quaternion Entertainment', 'Co-founder · Scripting and UI design', 'Remote · 2020–2023'],
]
export default function Resume() {
  return <article className="resume-content">
    <p className="eyebrow"><span className="rule"/>Tanner Aslan</p>
    <h1>Experience<span className="accent">.</span></h1>
    <ol className="experience-list">{experience.map(([company, role, where]) =>
      <li key={company}><h2>{company}</h2><p>{role}</p><small>{where}</small></li>
    )}</ol>
    <section className="education"><h2>Education</h2><p>University of Michigan · B.S. in Computer Science</p><small>Ann Arbor, MI · Expected May 2027</small></section>
  </article>
}
