// Annotate album images during MDX compilation so the grid can reserve their
// space before any thumbnail downloads. Phone photos commonly use EXIF rotation.
import path from 'node:path'
import sharp from 'sharp'
import exifr from 'exifr'

export default function albumImageSizes({ previewSize }) {
  return async function transform(tree, file) {
    if (path.basename(path.dirname(file.path || '')) !== 'albums') return
    const images = []
    function collect(node) {
      if (node.type === 'image' && node.url.startsWith('/')) images.push(node)
      node.children?.forEach(collect)
    }
    collect(tree)
    for (const node of images) {
      const filename = path.join(process.cwd(), 'public', node.url)
      const image = sharp(filename)
      const { autoOrient, exif } = await image.metadata()
      const preview = await image.autoOrient().resize(previewSize, previewSize, { fit: 'inside' }).webp({ quality: 35 }).toBuffer()
      // Sharp may return an APP1 payload with a six-byte Exif header.
      const tiff = exif?.toString('ascii', 0, 6) === 'Exif\0\0' ? exif.subarray(6) : exif
      const gps = tiff ? await exifr.gps(tiff).catch(() => undefined) : undefined
      node.data ??= {}
      node.data.hProperties = { ...node.data.hProperties, width: autoOrient.width, height: autoOrient.height,
        'data-preview': 'data:image/webp;base64,' + preview.toString('base64'),
        ...(gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)
          ? { 'data-latitude': gps.latitude, 'data-longitude': gps.longitude } : {}) }
    }
  }
}
