#!/usr/bin/python
"""This script starts a web server that is listening on port 8000 on localhost.
It will serve local files in the current subdirectory.

An example: If this directory would contain the file "index.html", the file
would be retrievable under this URL:

http://localhost:8000/index.html
"""

from BaseHTTPServer import HTTPServer
from SimpleHTTPServer import SimpleHTTPRequestHandler

port = 8000
handler = SimpleHTTPRequestHandler

httpd = HTTPServer(("127.0.0.1", port), handler)
httpd.serve_forever()
