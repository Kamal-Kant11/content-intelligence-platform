// Fetches a public web page with SSRF protection:
// - only http/https on the default ports (80/443), no user:password@ in the URL
// - every DNS answer is checked at connect time, so a host cannot resolve to a private
//   address (also prevents DNS-rebinding between the check and the request)
// - redirects are followed by hand and every hop goes through the same checks
// - timeouts and a response-size limit
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import zlib from 'node:zlib';
import { config } from '../config/config.js';
import { badRequest } from '../utils/httpError.js';

const MAX_REDIRECTS = 5;
const ALLOWED_PORTS = new Set(['', '80', '443']);

const blocked = new net.BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, cloud metadata
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // documentation
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // documentation
  ['203.0.113.0', 24], // documentation
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, broadcast
]) {
  blocked.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  // IPv4-mapped addresses (::ffff:127.0.0.1) are already matched by the IPv4 rules above.
  ['::', 127], // unspecified and loopback (::, ::1)
  ['64:ff9b::', 96], // NAT64
  ['100::', 64], // discard
  ['2001:db8::', 32], // documentation
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
]) {
  blocked.addSubnet(network, prefix, 'ipv6');
}

export function isPublicAddress(ip) {
  const family = net.isIP(ip);
  if (!family) return false;
  return !blocked.check(ip, family === 4 ? 'ipv4' : 'ipv6');
}

class BlockedAddressError extends Error {}

// Used as the socket's DNS lookup, so the address we connect to is the address we checked.
function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, { all: true }, (err, addresses) => {
    if (err) return callback(err);
    if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address))) {
      return callback(new BlockedAddressError(`${hostname} resolves to a non-public address`));
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
}

function checkUrl(url) {
  if (!['http:', 'https:'].includes(url.protocol)) throw badRequest('Only http:// and https:// URLs are supported.');
  if (url.username || url.password) throw badRequest('URLs with a username or password are not supported.');
  if (!ALLOWED_PORTS.has(url.port)) throw badRequest('Only websites on the standard ports (80 and 443) are supported.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || (net.isIP(host) && !isPublicAddress(host))) {
    throw new BlockedAddressError(host);
  }
}

function decode(res) {
  const encoding = (res.headers['content-encoding'] || '').toLowerCase();
  if (encoding === 'gzip' || encoding === 'x-gzip') return res.pipe(zlib.createGunzip());
  if (encoding === 'deflate') return res.pipe(zlib.createInflate());
  if (encoding === 'br') return res.pipe(zlib.createBrotliDecompress());
  return res;
}

function request(url) {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.get(url, {
      lookup: safeLookup,
      headers: {
        'User-Agent': 'ContentIQ/1.0 (content quality checker)',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });
    const deadline = setTimeout(() => req.destroy(new Error('timeout')), config.urlFetchTimeoutMs);
    const done = (fn, value) => {
      clearTimeout(deadline);
      fn(value);
    };

    req.on('error', (err) => done(reject, err));
    req.on('response', (res) => {
      const { statusCode: status, headers } = res;
      if (status < 200 || status >= 300) {
        res.resume();
        return done(resolve, { status, headers, body: '' });
      }
      const type = String(headers['content-type'] || '').toLowerCase();
      if (!/text\/html|application\/xhtml\+xml|text\/plain/.test(type)) {
        res.destroy();
        return done(reject, badRequest('That URL is not a web page (expected HTML or plain text).'));
      }

      const stream = decode(res);
      const chunks = [];
      let size = 0;
      stream.on('data', (chunk) => {
        size += chunk.length;
        if (size > config.urlMaxBytes) {
          res.destroy();
          return done(reject, badRequest('That web page is too large (over 2 MB).'));
        }
        chunks.push(chunk);
      });
      stream.on('error', (err) => done(reject, err));
      stream.on('end', () => {
        const charset = /charset=([\w-]+)/.exec(type)?.[1] || 'utf-8';
        let body;
        try {
          body = new TextDecoder(charset).decode(Buffer.concat(chunks));
        } catch {
          body = new TextDecoder('utf-8').decode(Buffer.concat(chunks));
        }
        done(resolve, { status, headers, body, isHtml: !type.includes('text/plain') });
      });
    });
  });
}

export async function fetchPublicPage(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl ?? '').trim());
  } catch {
    throw badRequest('Enter a valid URL, including http:// or https://.');
  }

  try {
    for (let hop = 0; ; hop++) {
      checkUrl(url);
      const res = await request(url);
      const location = res.headers.location;
      if (res.status >= 300 && res.status < 400 && location) {
        if (hop >= MAX_REDIRECTS) throw badRequest('That URL redirects too many times.');
        url = new URL(location, url);
        continue;
      }
      if (res.status === 401 || res.status === 403) {
        throw badRequest('That page needs a login or blocks automated access. Copy the text and use Paste Text instead.');
      }
      if (res.status < 200 || res.status >= 300) throw badRequest(`The website responded with status ${res.status}.`);
      return { finalUrl: url.toString(), body: res.body, isHtml: res.isHtml };
    }
  } catch (err) {
    if (err.status) throw err;
    if (err instanceof BlockedAddressError) {
      throw badRequest('That URL points to a local or private network address, which is not allowed.');
    }
    if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') throw badRequest('Could not find that website. Check the address.');
    if (err.message === 'timeout') throw badRequest('The website took too long to respond.');
    console.error(`URL fetch failed for ${url}:`, err.message);
    throw badRequest('Could not reach that website.');
  }
}
