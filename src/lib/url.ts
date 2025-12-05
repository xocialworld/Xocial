export function getAppURL() {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

  if (!url.startsWith('http')) {
    url = `https://${url}`
  }

  url = url.endsWith('/') ? url : `${url}/`
  return url
}
