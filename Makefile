# Author: Yves Piguet, EPFL
# Please don't redistribute without author's permission.

# build distribution

DIR = vpl-teacher-distrib

ROOTFILES = \
	Makefile \
	launch_objc.py \
	launch_tk.py \
	launch_windows.bat \
	launch_mac.command \
	launch_wx.py \
	setup.py \
	setup_app.py

VPL3PKGFILES = \
	vpl3tt/__init__.py \
	vpl3tt/baseapp.py \
	vpl3tt/cacaoapp.py \
	vpl3tt/com_http.py \
	vpl3tt/com_ws.py \
	vpl3tt/db.py \
	vpl3tt/launch.py \
	vpl3tt/server.py \
	vpl3tt/server_http.py \
	vpl3tt/server_thymio.py \
	vpl3tt/server_ws.py \
	vpl3tt/tdm_client.py \
	vpl3tt/tkapp.py \
	vpl3tt/objcapp.py \
	vpl3tt/translate.py \
	vpl3tt/translate_fr.py \
	vpl3tt/urltiny.py \
	vpl3tt/urlutil.py \
	vpl3tt/wxapp.py

DOCFILES = \
	vpl3tt/doc/client.js \
	vpl3tt/doc/db.html \
	vpl3tt/doc/index.html \
	vpl3tt/doc/login.en.html \
	vpl3tt/doc/login.fr.html \
	vpl3tt/doc/login.it.html \
	vpl3tt/doc/login-gui.js \
	vpl3tt/doc/tr-mappings.json \
	vpl3tt/doc/tt.html \
	vpl3tt/doc/tt.fr.html

VPLFILES = \
	vpl3tt/doc/vpl/EPFL_Logo_SVG.svg \
	vpl3tt/doc/vpl/grs_logo_RGB.svg \
	vpl3tt/doc/vpl/Logo_vpl.svg \
	vpl3tt/doc/vpl/vpl-about.html \
	vpl3tt/doc/vpl/vpl.html \
	vpl3tt/doc/vpl/vpl-min.js

THYMIOFILES = \
	vpl3tt/doc/vpl/thymio/thymio.js

UIFILES = \
	vpl3tt/doc/vpl/ui/toc.json

UICLASSICFILES = \
	vpl3tt/doc/vpl/ui/classic/aesl.json \
	vpl3tt/doc/vpl/ui/classic/aseba.json \
	vpl3tt/doc/vpl/ui/classic/block-en.json \
	vpl3tt/doc/vpl/ui/classic/block-fr.json \
	vpl3tt/doc/vpl/ui/classic/block-list.json \
	vpl3tt/doc/vpl/ui/classic/classic.css \
	vpl3tt/doc/vpl/ui/classic/cmd-sim-en.json \
	vpl3tt/doc/vpl/ui/classic/cmd-sim-fr.json \
	vpl3tt/doc/vpl/ui/classic/cmd-vpl-en.json \
	vpl3tt/doc/vpl/ui/classic/cmd-vpl-fr.json \
	vpl3tt/doc/vpl/ui/classic/doctemplate-en.html \
	vpl3tt/doc/vpl/ui/classic/doctemplate-fr.html \
	vpl3tt/doc/vpl/ui/classic/messages-fr.json \
	vpl3tt/doc/vpl/ui/classic/help-blocks-en.json \
	vpl3tt/doc/vpl/ui/classic/help-blocks-fr.json \
	vpl3tt/doc/vpl/ui/classic/help-buttons-en.json \
	vpl3tt/doc/vpl/ui/classic/help-buttons-fr.json \
	vpl3tt/doc/vpl/ui/classic/js.json \
	vpl3tt/doc/vpl/ui/classic/l2.json \
	vpl3tt/doc/vpl/ui/classic/python.json \
	vpl3tt/doc/vpl/ui/classic/typical-param-set.json \
	vpl3tt/doc/vpl/ui/classic/typical-states.json \
	vpl3tt/doc/vpl/ui/classic/ui.json

UISVGFILES = \
	vpl3tt/doc/vpl/ui/svg/aesl.json \
	vpl3tt/doc/vpl/ui/svg/aseba.json \
	vpl3tt/doc/vpl/ui/svg/block-en.json \
	vpl3tt/doc/vpl/ui/svg/block-de.json \
	vpl3tt/doc/vpl/ui/svg/block-fr.json \
	vpl3tt/doc/vpl/ui/svg/block-it.json \
	vpl3tt/doc/vpl/ui/svg/block-list.json \
	vpl3tt/doc/vpl/ui/svg/Blocks.svg \
	vpl3tt/doc/vpl/ui/svg/Blocks16.svg \
	vpl3tt/doc/vpl/ui/svg/buttons.json \
	vpl3tt/doc/vpl/ui/svg/cmd-sim-en.json \
	vpl3tt/doc/vpl/ui/svg/cmd-sim-de.json \
	vpl3tt/doc/vpl/ui/svg/cmd-sim-fr.json \
	vpl3tt/doc/vpl/ui/svg/cmd-sim-it.json \
	vpl3tt/doc/vpl/ui/svg/cmd-vpl-en.json \
	vpl3tt/doc/vpl/ui/svg/cmd-vpl-de.json \
	vpl3tt/doc/vpl/ui/svg/cmd-vpl-fr.json \
	vpl3tt/doc/vpl/ui/svg/cmd-vpl-it.json \
	vpl3tt/doc/vpl/ui/svg/doctemplate-en.html \
	vpl3tt/doc/vpl/ui/svg/doctemplate-de.html \
	vpl3tt/doc/vpl/ui/svg/doctemplate-fr.html \
	vpl3tt/doc/vpl/ui/svg/doctemplate-it.html \
	vpl3tt/doc/vpl/ui/svg/messages-en.json \
	vpl3tt/doc/vpl/ui/svg/messages-de.json \
	vpl3tt/doc/vpl/ui/svg/messages-fr.json \
	vpl3tt/doc/vpl/ui/svg/messages-it.json \
	vpl3tt/doc/vpl/ui/svg/help-blocks-en.json \
	vpl3tt/doc/vpl/ui/svg/help-blocks-de.json \
	vpl3tt/doc/vpl/ui/svg/help-blocks-fr.json \
	vpl3tt/doc/vpl/ui/svg/help-blocks-it.json \
	vpl3tt/doc/vpl/ui/svg/Icons.svg \
	vpl3tt/doc/vpl/ui/svg/js.json \
	vpl3tt/doc/vpl/ui/svg/l2.json \
	vpl3tt/doc/vpl/ui/svg/python.json \
	vpl3tt/doc/vpl/ui/svg/svg.css \
	vpl3tt/doc/vpl/ui/svg/toolbars.json \
	vpl3tt/doc/vpl/ui/svg/ui.json

TOOLSFILES = \
	vpl3tt/doc/vpl-teacher-tools/dashboard-gui.js \
	vpl3tt/doc/vpl-teacher-tools/dashboard.html \
	vpl3tt/doc/vpl-teacher-tools/dashboard.fr.html \
	vpl3tt/doc/vpl-teacher-tools/dashboard.js \
	vpl3tt/doc/vpl-teacher-tools/dev.html \
	vpl3tt/doc/vpl-teacher-tools/dev.fr.html \
	vpl3tt/doc/vpl-teacher-tools/doc.html \
	vpl3tt/doc/vpl-teacher-tools/doc.fr.html \
	vpl3tt/doc/vpl-teacher-tools/editor-gui.js \
	vpl3tt/doc/vpl-teacher-tools/editor.html \
	vpl3tt/doc/vpl-teacher-tools/editor.fr.html \
	vpl3tt/doc/vpl-teacher-tools/filebrowser-gui.js \
	vpl3tt/doc/vpl-teacher-tools/filebrowser.html \
	vpl3tt/doc/vpl-teacher-tools/filebrowser.fr.html \
	vpl3tt/doc/vpl-teacher-tools/filebrowser.js \
	vpl3tt/doc/vpl-teacher-tools/filedialog.js \
	vpl3tt/doc/vpl-teacher-tools/html-tools.css \
	vpl3tt/doc/vpl-teacher-tools/icon-file-txt.svg \
	vpl3tt/doc/vpl-teacher-tools/icon-file-html.svg \
	vpl3tt/doc/vpl-teacher-tools/icon-file-img.svg \
	vpl3tt/doc/vpl-teacher-tools/icon-file-program.svg \
	vpl3tt/doc/vpl-teacher-tools/icon-file-vpl3.svg \
	vpl3tt/doc/vpl-teacher-tools/icon-file-vpl3ui.svg \
	vpl3tt/doc/vpl-teacher-tools/initdb-dev-gui.js \
	vpl3tt/doc/vpl-teacher-tools/initdb-dev.html \
	vpl3tt/doc/vpl-teacher-tools/initdb-dev.fr.html \
	vpl3tt/doc/vpl-teacher-tools/json-ws-bridge-api.js \
	vpl3tt/doc/vpl-teacher-tools/login.js \
	vpl3tt/doc/vpl-teacher-tools/Logo_vpl.svg \
	vpl3tt/doc/vpl-teacher-tools/ns.js \
	vpl3tt/doc/vpl-teacher-tools/pairing-gui.js \
	vpl3tt/doc/vpl-teacher-tools/pairing.html \
	vpl3tt/doc/vpl-teacher-tools/pairing.fr.html \
	vpl3tt/doc/vpl-teacher-tools/robots.js \
	vpl3tt/doc/vpl-teacher-tools/pairing.js \
	vpl3tt/doc/vpl-teacher-tools/README.md \
	vpl3tt/doc/vpl-teacher-tools/students.html \
	vpl3tt/doc/vpl-teacher-tools/students-gui.js \
	vpl3tt/doc/vpl-teacher-tools/students.js \
	vpl3tt/doc/vpl-teacher-tools/students.fr.html \
	vpl3tt/doc/vpl-teacher-tools/student-debug.html \
	vpl3tt/doc/vpl-teacher-tools/student-debug.js \
	vpl3tt/doc/vpl-teacher-tools/translate.js \
	vpl3tt/doc/vpl-teacher-tools/ui.json \
	vpl3tt/doc/vpl-teacher-tools/util-files.js \
	vpl3tt/doc/vpl-teacher-tools/util-url.js \
	vpl3tt/doc/vpl-teacher-tools/viewer-gui.js \
	vpl3tt/doc/vpl-teacher-tools/viewer.html \
	vpl3tt/doc/vpl-teacher-tools/viewer.fr.html \
	vpl3tt/doc/vpl-teacher-tools/vpl-about.html \
	vpl3tt/doc/vpl-teacher-tools/vpl-gui.js \
	vpl3tt/doc/vpl-teacher-tools/vpl.html \
	vpl3tt/doc/vpl-teacher-tools/vpl.fr.html \
	vpl3tt/doc/vpl-teacher-tools/vplurl.js \
    vpl3tt/doc/vpl-teacher-tools/vpl_load.png \
    vpl3tt/doc/vpl-teacher-tools/vpl_new.png \
    vpl3tt/doc/vpl-teacher-tools/vpl_run.png \
    vpl3tt/doc/vpl-teacher-tools/vpl_stop.png

QRFILES = \
	vpl3tt/doc/libs/qrcodejs/LICENSE \
	vpl3tt/doc/libs/qrcodejs/README.md \
	vpl3tt/doc/libs/qrcodejs/qrcode.min.js

BEHAVIORFILES = \
	vpl3tt/data/behaviors/amicalV3.aseba \
	vpl3tt/data/behaviors/attentifV3.aseba \
	vpl3tt/data/behaviors/explorateurV7.aseba \
	vpl3tt/data/behaviors/obeissantV6.aseba \
	vpl3tt/data/behaviors/peureuxV3.aseba \
	vpl3tt/data/behaviors/suiveurV3.aseba \
	vpl3tt/data/behaviors/LICENSE.txt

DATAFILES = \
	vpl3tt/data/ui/basic-sensors.vpl3ui \
	vpl3tt/data/ui/basic-touch.vpl3ui \
	vpl3tt/data/ui/basic-track.vpl3ui \
	vpl3tt/data/ui/simple-sensors.vpl3ui \
	vpl3tt/data/ui/simple-touch.vpl3ui \
	vpl3tt/data/ui/simple-track.vpl3ui

UNAME = $(shell uname)
ALL = $(DIR).zip whl
ifeq ($(UNAME), Darwin)
	ALL += VPLServer.dmg
endif

.PHONY: all
all: $(ALL)

$(DIR).zip:
	rm -Rf $(DIR)
	mkdir -p $(DIR)/vpl3tt
	mkdir -p $(DIR)/vpl3tt/doc/vpl/thymio
	mkdir -p $(DIR)/vpl3tt/doc/vpl/ui/classic
	mkdir -p $(DIR)/vpl3tt/doc/vpl/ui/svg
	mkdir -p $(DIR)/vpl3tt/doc/vpl-teacher-tools
	mkdir -p $(DIR)/vpl3tt/doc/libs/qrcodejs
	mkdir -p $(DIR)/vpl3tt/data
	mkdir -p $(DIR)/vpl3tt/data/behaviors
	cp -p $(ROOTFILES) $(DIR)
	cp -p $(VPL3PKGFILES) $(DIR)/vpl3tt
	cp -p $(DOCFILES) $(DIR)/vpl3tt/doc
	cp -p $(VPLFILES) $(DIR)/vpl3tt/doc/vpl
	cp -p $(THYMIOFILES) $(DIR)/vpl3tt/doc/vpl/thymio
	cp -p $(UIFILES) $(DIR)/vpl3tt/doc/vpl/ui
	cp -p $(UICLASSICFILES) $(DIR)/vpl3tt/doc/vpl/ui/classic
	cp -p $(UISVGFILES) $(DIR)/vpl3tt/doc/vpl/ui/svg
	cp -p $(TOOLSFILES) $(DIR)/vpl3tt/doc/vpl-teacher-tools
	cp -p $(QRFILES) $(DIR)/vpl3tt/doc/libs/qrcodejs
	cp -p $(DATAFILES) $(DIR)/vpl3tt/data
	cp -p $(BEHAVIORFILES) $(DIR)/vpl3tt/data/behaviors
	zip -r - $(DIR) >$(DIR).zip

.PHONY: whl
whl: setup.py $(VPL3PKGFILES) $(DOCFILES) $(VPLFILES) $(THYMIOFILES) $(UIFILES) $(UICLASSICFILES) $(UISVGFILES) $(TOOLSFILES) $(QRFILES) $(DATAFILES) $(BEHAVIORFILES)
	rm -Rf build
	python3 setup.py bdist_wheel sdist bdist_pex

.PHONY: VPL3Server.app
VPL3Server.app: setup_app.py launch_objc.py $(VPL3PKGFILES) $(DOCFILES) $(VPLFILES) $(THYMIOFILES) $(UIFILES) $(UICLASSICFILES) $(UISVGFILES) $(TOOLSFILES) $(QRFILES) $(DATAFILES) $(BEHAVIORFILES)
	rm -Rf build
	python3 setup_app.py py2app
	codesign -s "$(APPLE_CERTIFICATE_SIGNING_IDENTITY)" -f \
        "VPL3Server.app/Contents/Frameworks/Python.framework/Versions/3.9"
    codesign -s "$(APPLE_CERTIFICATE_SIGNING_IDENTITY)" -f \
        "VPL3Server.app/Contents/MacOS/VPL3Server"
    codesign -s "$(APPLE_CERTIFICATE_SIGNING_IDENTITY)" -f \
        "$VPL3Server.app/Contents/MacOS/python"

.PHONY: build/VPL3Server-cxf.app
build/VPL3Server-cxf.app: setup_cx_freeze.py launch_objc.py $(VPL3PKGFILES) $(DOCFILES) $(VPLFILES) $(THYMIOFILES) $(UIFILES) $(UICLASSICFILES) $(UISVGFILES) $(TOOLSFILES) $(QRFILES) $(DATAFILES) $(BEHAVIORFILES)
	rm -Rf build
	python3 setup_cx_freeze.py bdist_mac

VPLServer.dmg: VPL3Server.app readme-mac.txt
	rm -Rf "VPL Server" $@
	mkdir "VPL Server"
	cp -R $^ "VPL Server"
	hdiutil create -format UDZO -imagekey zlib-level=9 -srcfolder "VPL Server" $@
	rm -Rf "VPL Server"

ServeFile.dmg: Serve\ File.app
	rm -Rf "Serve File" $@
	mkdir "Serve File"
	cp -R "$^" "Serve File"
	hdiutil create -srcfolder "Serve File" $@
	rm -Rf "Serve File"

.PHONY: Serve\ File.app
Serve\ File.app: setup_serve_via_http.py serve_via_http.py
	rm -rf build
	python3 setup_serve_via_http.py py2app

.PHONY: oh
oh:
	ohcount $(PKGFILES) $(ROOTFILES) $(DOCFILES) $(TOOLSFILES)
