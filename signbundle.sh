#/bin/bash -ex

DEST=$1
IDENTITY="$2"

realpath() {
    [[ $1 = /* ]] && echo "$1" || echo "$PWD/${1#./}"
}

add_to_group() {
    defaults write "$1" "com.apple.security.application-groups" -array "P97H86YL8K.VPL3Server"
}

sign() {
    if [ -z "$IDENTITY" ]; then
        echo "Identity not provided, not signing"
    else
        codesign --verify --verbose --timestamp --entitlements allow.entitlements -s "$IDENTITY" "$@"
    fi
}

#defaults write $(realpath "$DEST/Contents/Info.plist") NSPrincipalClass -string NSApplication
#defaults write $(realpath "$DEST/Contents/Info.plist") NSHighResolutionCapable -string True
add_to_group $(realpath "$DEST/Contents/Info.plist")
chmod 644 $(realpath "$DEST/Contents/Info.plist")

MAIN_DIR="$DEST/Contents/MacOS"

for fw in $(ls "$DEST/Contents/Frameworks")
do
    echo "Signing $DEST/Contents/Frameworks/$fw"
    sign $(realpath "$DEST/Contents/Frameworks/$fw")
done

for plugin in $(find $DEST/Contents/Frameworks -name '*.dylib')
do
    echo "Signing $plugin"
    sign $(realpath "$plugin")
done

for so in $(find $DEST/Contents/Resources -name '*.so')
do
    echo "Signing $so"
    sign $(realpath "$so")
done

for binary in "python" "VPL3Server"
do
    echo "Signing $MAIN_DIR/$binary"
    sign --options=runtime $(realpath "$MAIN_DIR/$binary")
done

sign --force "$1"
