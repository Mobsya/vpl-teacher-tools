#!/usr/bin/python3

# Author: Yves Piguet, EPFL
# Please don't redistribute without author's permission.

import io
import zipfile
import base64
import re


class ZipBundle:

    MANIFEST_FILENAME = "manifest.txt"

    def __init__(self, filename=None):
        self.filename = filename
        self.zip = None
        self.path_prefix = ""
        self.manifest = {}

    def load_from_base64(self, b64):
        c = base64.b64decode(b64)
        zip = zipfile.ZipFile(io.BytesIO(c))
        self.load_from_zipfile(zip)

    def load_from_zipfile(self, zip):
        self.zip = zip

        # check if there is a single root directory
        path_prefix = ""
        names = self.zip.namelist()
        if len(names) > 0:
            if "/" in names[0]:
                path_prefix = names[0].split("/", 1)[0] + "/"
            for entry in self.zip.namelist():
                if not entry.startswith(path_prefix):
                    path_prefix = ""
                    break
        self.path_prefix = path_prefix

        self.toc = self.zip.namelist() if len(self.path_prefix) == 0 else [
            name[len(path_prefix):]
            for name in self.zip.namelist()
        ]

        try:
            manifest = self.read_as_str(self.MANIFEST_FILENAME)
            self.parse_manifest(manifest)
        except KeyError:
            pass

    def read_as_bytes(self, name):
        return self.zip.read(self.path_prefix + name)

    def read_as_str(self, name):
        return str(self.read_as_bytes(name), "utf-8")

    def parse_manifest(self, manifest):
        self.manifest = {
            "vpl3": [],
            "ui": [],
            "program": [],
            "attention": [],
            "doc": [],
            "statement": [],
        }
        type = None
        for line in manifest.split("\n"):
            line_s = line.strip()
            if line_s[-1:] == ":":
                type = line_s[:-1].lower()
                if type not in self.manifest:
                    type = None
            elif type is not None:
                r = re.match(r"([-_\/.\w]+)(\s+\([^)]*\))?$", line_s, re.UNICODE)
                if r is not None and r[1] in self.toc:
                    self.manifest[type].append(r[1])
