# Author: Yves Piguet, EPFL
# Please don't redistribute without author's permission.

from setuptools import setup

with open("help.md", "r") as fh:
    long_description = fh.read()

data_files = [
    ("doc", [
        "vpl3tt/doc/client.js",
        "vpl3tt/doc/db.html",
        "vpl3tt/doc/index.html",
        "vpl3tt/doc/login-gui.js",
        "vpl3tt/doc/login.de.html",
        "vpl3tt/doc/login.en.html",
        "vpl3tt/doc/login.fr.html",
        "vpl3tt/doc/login.it.html",
        "vpl3tt/doc/tr-mappings.json",
        "vpl3tt/doc/tt.fr.html",
        "vpl3tt/doc/tt.html",
    ]),
    ("doc/libs/qrcodejs", [
        "vpl3tt/doc/libs/qrcodejs/LICENSE",
        "vpl3tt/doc/libs/qrcodejs/qrcode.min.js",
        "vpl3tt/doc/libs/qrcodejs/README.md",
    ]),
]

package_data = {
    "vpl3tt": [
        "data/*.html",
        "data/*.js",
        "data/*.json",
        "data/behaviors/*.aseba",
        "data/behaviors/*.txt",
        "doc/*.html",
        "doc/*.js",
        "doc/*.json",
        "doc/lib/qrcodejs/LICENSE",
        "doc/lib/qrcodejs/*.js",
        "doc/lib/qrcodejs/*.md",
        "doc/vpl/*.html",
        "doc/vpl/*.js",
        "doc/vpl/*.txt",
        "doc/vpl/*.svg",
        "doc/vpl/thymio/*.js",
        "doc/vpl/ui/*.json",
        "doc/vpl/ui/classic/*.css",
        "doc/vpl/ui/classic/*.html",
        "doc/vpl/ui/classic/*.json",
        "doc/vpl/ui/svg/*.css",
        "doc/vpl/ui/svg/*.html",
        "doc/vpl/ui/svg/*.json",
        "doc/vpl/ui/svg/*.svg",
        "doc/vpl-teacher-tools/*.css",
        "doc/vpl-teacher-tools/*.html",
        "doc/vpl-teacher-tools/*.js",
        "doc/vpl-teacher-tools/*.json",
        "doc/vpl-teacher-tools/*.md",
        "doc/vpl-teacher-tools/*.png",
        "doc/vpl-teacher-tools/*.svg",
        "doc/vpl-teacher-tools/*.txt",
    ],
}

setup(
    name="vpl3tt",
    version="0.1.0",
    author="Yves Piguet",
    author_email="yves.piguet@epfl.ch",
    packages=["vpl3tt"],
    include_package_data=True,
    package_data=package_data,
    description="VPL 3 teacher tools",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://mobots.epfl.ch",
    install_requires=[
        # package names as known by pip
        "qrcode",
        "thymiodirect",
        "websockets",
        "websocket-client",  # beware! pkg websocket-client for module websocket
    ],
    entry_points={
        "console_scripts": [
            "vpl3tt=vpl3tt:main",
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: BSD License",
        "Intended Audience :: Education",
        "Framework :: AsyncIO"
    ],
    python_requires=">=3.6",
)
