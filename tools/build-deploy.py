#!/usr/bin/env python3
"""Build the public deploy copy at ~/Desktop/ULJO-website.

Copies the site minus the dev files. The site is public since 2026-10-29:
no password lock, no noindex. (The lock lived here until then — the old
AES-GCM version is in git-less history only; tools/lock.swift is kept in
case it is ever wanted again.)
"""
import os, subprocess, sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent
# ULJO_OUT points a test build somewhere else.
OUT = Path(os.environ.get('ULJO_OUT', Path.home() / 'Desktop' / 'ULJO-website'))
EXCLUDE = ['tools/', '.claude/', 'README.md', 'system.html', '.DS_Store',
           'studio.html',                    # pass 78: "Remove underground studio section" — the page is kept here, unlinked, and not published
           'assets/img/dot.svgpath',
           'assets/video/checkout-flow.mp4', 'assets/video/ec-kiosk-anim.mp4',
           'assets/video/hero-city.mp4', 'assets/video/ui-animation.mp4']


def main():
    excl = sum((['--exclude', e] for e in EXCLUDE), [])
    subprocess.run(['rsync', '-a', '--delete', *excl, f'{SRC}/', f'{OUT}/'], check=True)
    for stale in ('_headers', 'robots.txt', 'studio.html'):          # left over from the locked builds; and the studio's page of earlier builds (rsync does not delete what it is told to leave out)
        (OUT / stale).unlink(missing_ok=True)
    print(f'Built {len(list(OUT.glob("*.html")))} pages in {OUT} (public, no lock)')


if __name__ == '__main__':
    sys.exit(main())
