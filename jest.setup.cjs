const nodeFetch = require('node-fetch');
const { ReadableStream, TransformStream } = require('node:stream/web');
const { TextDecoder, TextEncoder } = require('node:util');

global.fetch ??= nodeFetch.default || nodeFetch;
global.Headers ??= nodeFetch.Headers;
global.Request ??= nodeFetch.Request;
global.Response ??= nodeFetch.Response;
global.ReadableStream ??= ReadableStream;
global.TransformStream ??= TransformStream;
global.TextDecoder ??= TextDecoder;
global.TextEncoder ??= TextEncoder;

global.ResizeObserver ??= class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

global.IntersectionObserver ??= class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
