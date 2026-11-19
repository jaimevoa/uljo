"""Local preview server for the ULJO site.

Python's built-in http.server answers every request with the whole file and
serves one request at a time. Safari will not play a <video> from a server
that ignores byte ranges, so the hero clip showed as a still there. This one
honours Range (206 Partial Content) and serves requests in parallel.

    PORT=3000 python3 tools/serve.py
"""
import os
import re
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RANGE = re.compile(r"bytes=(\d*)-(\d*)$")


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def send_head(self):
        m = RANGE.match(self.headers.get("Range", "").strip())
        path = self.translate_path(self.path)
        if not m or not os.path.isfile(path):
            return super().send_head()
        size = os.path.getsize(path)
        start, end = m.group(1), m.group(2)
        if start == "":                      # "bytes=-N": the last N bytes
            first, last = max(0, size - int(end or 0)), size - 1
        else:
            first, last = int(start), min(int(end) if end else size - 1, size - 1)
        if first > last or first >= size:
            self.send_response(416)
            self.send_header("Content-Range", "bytes */%d" % size)
            self.end_headers()
            return None
        f = open(path, "rb")
        f.seek(first)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", "bytes %d-%d/%d" % (first, last, size))
        self.send_header("Content-Length", str(last - first + 1))
        self.end_headers()
        self._left = last - first + 1
        return f

    def copyfile(self, source, outputfile):
        left = getattr(self, "_left", None)
        if left is None:
            return super().copyfile(source, outputfile)
        while left > 0:
            chunk = source.read(min(64 * 1024, left))
            if not chunk:
                break
            outputfile.write(chunk)
            left -= len(chunk)
        self._left = None

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "3000"))
    ThreadingHTTPServer.allow_reuse_address = True
    handler = functools.partial(Handler, directory=ROOT)
    ThreadingHTTPServer(("", port), handler).serve_forever()
