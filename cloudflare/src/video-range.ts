// Videos on braws.app answer byte ranges (206), which Safari on iPhone and iPad needs to play them.
// The static asset layer sends the whole file, so the Worker cuts the stored file here.
// Only .mp4/.webm under /media/hero/ and /media/clips/ come through this; everything else is a plain asset.
const TYPES: Record<string, string> = { mp4: 'video/mp4', webm: 'video/webm' };
const FOLDERS = ['/media/hero/', '/media/clips/'];

interface Assets { fetch(request: Request): Promise<Response> }

export function isVideoPath(pathname: string): boolean {
  const ext = pathname.split('.').pop() ?? '';
  return !!TYPES[ext] && FOLDERS.some((f) => pathname.startsWith(f)) && !pathname.includes('..');
}

export async function videoResponse(request: Request, assets: Assets): Promise<Response> {
  const url = new URL(request.url);
  const ext = url.pathname.split('.').pop() ?? '';
  const stored = await assets.fetch(new Request(url.origin + url.pathname));
  if (!stored.ok) return stored;
  const body = new Uint8Array(await stored.arrayBuffer());
  const size = body.byteLength;
  const headers = new Headers({
    'Content-Type': TYPES[ext]!,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=604800',
  });
  const etag = stored.headers.get('ETag');
  if (etag) headers.set('ETag', etag);
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range') ?? '');
  if (!range || (!range[1] && !range[2])) {
    headers.set('Content-Length', String(size));
    return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers });
  }
  let start = range[1] ? Number(range[1]) : NaN;
  let end = range[2] ? Number(range[2]) : size - 1;
  if (Number.isNaN(start)) {
    // "bytes=-500": the last 500 bytes.
    start = Math.max(0, size - end);
    end = size - 1;
  }
  end = Math.min(end, size - 1);
  if (start > end || start >= size) {
    headers.set('Content-Range', `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(request.method === 'HEAD' ? null : body.slice(start, end + 1), { status: 206, headers });
}
