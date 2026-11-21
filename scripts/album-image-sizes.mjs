// Annotate album images during MDX compilation so the grid can reserve their
// space before any thumbnail downloads. Phone photos commonly use EXIF rotation.
import path from 'node:path'
import sharp from 'sharp'

export default function albumImageSizes() {
  return async function transform(tree, file) {
    if (path.basename(file.path || '') !== 'photos.mdx') return
    const images = []
    function collect(node) {
      if (node.type === 'image' && node.url.startsWith('/')) images.push(node)
      node.children?.forEach(collect)
    }
    collect(tree)
    await Promise.all(images.map(async node => {
      const filename = path.join(process.cwd(), 'public', node.url)
      const { autoOrient } = await sharp(filename).metadata()
      node.data ??= {}
      node.data.hProperties = { ...node.data.hProperties, width: autoOrient.width, height: autoOrient.height }
    }))
  }
}
