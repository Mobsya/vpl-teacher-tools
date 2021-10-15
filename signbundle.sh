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
        codesign --verify --verbose=4 --timestamp --entitlements allow.entitlements -s "$IDENTITY" "$@"
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

unzip $(realpath "$MAIN_DIR/lib/library.zip") $(realpath "$MAIN_DIR/lib/library")

for plugin in $(find $MAIN_DIR -name '*.dylib')
do
    echo "Signing $plugin"
    sign $(realpath "$plugin")
done

for so in $(find $MAIN_DIR -name '*.so')
do
    echo "Signing $so"
    sign $(realpath "$so")
done

cd $(realpath "$MAIN_DIR/lib/library")
zip -r library.zip ./*

for binary in "launch_objc"
do
    echo "Signing $MAIN_DIR/$binary"
    sign --options=runtime --deep $(realpath "$MAIN_DIR/$binary")
done
