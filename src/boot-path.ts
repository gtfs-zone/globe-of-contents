/**
 * Turns a crawlable `/feed/<id>/<slug>` URL into the app's `/#feed=<id>` and
 * drops the server-rendered fragment. Imported before `shell.ts`, so the shell's
 * relative URLs resolve against `/` and every later hash read sees the feed.
 */

const match = /^\/feed\/(f-[0-9a-f]{10})(?:\/|$)/.exec(window.location.pathname);
if (match) {
  window.history.replaceState(null, '', `/#feed=${match[1]}`);
}

document.getElementById('prerendered')?.remove();
