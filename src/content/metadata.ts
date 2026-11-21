import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { cache } from 'react'
import { parse } from 'yaml'

const root = path.join(process.cwd(), 'src/content')

export const readFrontmatter = cache(async <T = Record<string, unknown>>(file: string): Promise<T> => {
  const text = await readFile(path.join(root, file), 'utf8')
  const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)
  return (header ? parse(header[1]) : {}) as T
})

export type Collection = 'posts' | 'music'
export interface Entry {
  slug: string
  title: string
  date: string
  description?: string
  tag?: string
  image?: string
  previewImage?: string
  instruments?: string[]
  genre?: string[]
  audio?: string
  sheetMusic?: string
}

export const entries = cache(async (collection: Collection): Promise<Entry[]> => {
  const files = (await readdir(path.join(root, collection))).filter(name => name.endsWith('.mdx') && name !== 'index.mdx')
  const rows = await Promise.all(files.map(async file => {
    const front = await readFrontmatter<Entry>(`${collection}/${file}`)
    const date = front.date.split('-').map(part => part.padStart(2, '0')).join('-')
    return { ...front, date, slug: file.slice(0, -4) }
  }))
  return rows.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
})

export function postTags(post: Entry) {
  return post.tag?.split(',').map(tag => tag.trim()).filter(Boolean) ?? []
}

export async function archivePaths() {
  const [posts, music] = await Promise.all([entries('posts'), entries('music')])
  return ['/posts', '/music', ...posts.map(p => '/posts/' + p.slug), ...music.map(p => '/music/' + p.slug),
    ...Array.from(new Set(posts.flatMap(postTags)), tag => '/tags/' + encodeURIComponent(tag))]
}
