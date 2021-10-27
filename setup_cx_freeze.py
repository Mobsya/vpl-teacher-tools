# Setup file to create Windows or Mac app using cx_Freeze

# Python3 package:
# python3 -m pip install cx-Freeze

# To run it:
# - Windows: in PowerShell, type
#   python3 setup_cx_freeze.py bdist_msi
# The result is a .msi file in directory dist
# - Mac: in Terminal, for just the .app application, type
#   python3 setup_cx_freeze.py bdist_mac
# or for the application in a dmg disk image:
#   python3 setup_cx_freeze.py bdist_dmg


import sys, os
from cx_Freeze import setup, Executable

def create_plist(properties):
    """Create a temporary plist file from a dict of properties."""
    # see create_plist in cx_Freeze/macdist.py
    import plistlib
    path = "/tmp/vpl-teacher-tools-cxf-Info.plist"
    with open(path, "wb") as f:
        plistlib.dump(properties, f)
    return path

__version__ = "0.1.0"

build_exe = {
    "packages": [
        "os",
        "json",
        "websockets.legacy",
    ],
    "include_files": [],
    "excludes": [
    	"curses",
    	"lib2to3",
    	"numpy",
        "wx",
    	"xmlrpc",
    ],
}
bdist_msi = {
    "all_users": True,
    "initial_target_dir": r"[ProgramFilesFolder]\VPLTeacherTools",
    "data": {
        "Shortcut": [
            (
                "DesktopShortcut",
                "DesktopFolder",
                "VPL3 Teacher Tools",
                "TARGETDIR",
                "[TARGETDIR]launch_tk.exe",
                None,
                None,
                None,
                None,
                None,
                None,
                "TARGETDIR",
            ),
            (
                "StartupShortcut",
                "ProgramMenuFolder",
                "VPL3 Teacher Tools",
                "TARGETDIR",
                "[TARGETDIR]launch_tk.exe",
                None,
                None,
                None,
                None,
                None,
                None,
                "TARGETDIR",
            ),
        ]
    }
}
launcher = "launch_tk.py"
base = None
options = {
    "build_exe": build_exe,
    "bdist_msi": bdist_msi,
}
setup_options = {
    "name": "VPL3TeacherTools",
    "description": "VPL3 Teacher Tools built with cx_Freeze",
    "version": __version__,
    "options": options,
}
executable_options = {}

if sys.platform == "win32":
    base = "Win32GUI"
    build_exe["include_msvcr"] = False
    # the end-user should download and install
    # https://aka.ms/vs/16/release/vc_redist.x64.exe
elif sys.platform == "darwin":
    launcher = "launch_objc.py"
    info_plist_filename = create_plist({
        "CFBundleIdentifier": "ch.epfl.mobots.vpl3server",
        "CFBundleVersion": "0.1",
        "CFBundleName": "VPL3 Server",
        "CFBundleIconFile": "icon.icns",
        "CFBundleDevelopmentRegion": "English",
        "CFBundleIdentifier": "VPL3 Server",
        "NSHumanReadableCopyright":
            "2019-2021, École polytechnique fédérale de Lausanne (EPFL)",
    })
    options["bdist_mac"] = {
        "bundle_name": "VPL3Server-cxf",
        "custom_info_plist": info_plist_filename,
    }

executable_options["base"] = base

setup(
    **setup_options,
    executables=[Executable(launcher, **executable_options)],
)
