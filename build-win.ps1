# build-win.bat
# build a msi file for Windows and put it into a zip file with a readme file

python3 setup_cx_freeze.py bdist_msi

$compress = @{
    Path = ".\dist\*win64.msi", "readme-win.txt"
    CompressionLevel = "Fastest"
    DestinationPath = "VPL3Server-win.zip"
}
Compress-Archive -Force @compress
