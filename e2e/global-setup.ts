export default async function setupGlobal() {
  // @ts-ignore
  global.TransformStream = (await import('stream/web')).TransformStream;
}