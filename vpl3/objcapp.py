#!/usr/bin/python3

# Author: Yves Piguet, EPFL
# Please don't redistribute without author's permission.

# server gui with objc (for macOS only)

from vpl3.baseapp import ApplicationBase
from vpl3.cacaoapp import ApplicationObjCShell
from vpl3.urlutil import URLUtil
from Cocoa import *


class Application(ApplicationBase):

    def __init__(self, **kwargs):
        try:
            ApplicationBase.__init__(self, **kwargs)

            self.window = None
            self.qr = None
            self.robots_status = None

            self.app_objc = ApplicationObjCShell.alloc().init()
            self.app_objc.addMenu_withItems_("File", [
                [
                    "Open Tools in Browser",
                    "b",
                    lambda sender: self.start_browser_tt()
                ]
            ])
            self.app_objc.addMenu_withItems_("Edit", [
                [
                    "Copy URL",
                    "c",
                    lambda sender: self.menu_item_copy_url()
                ]
            ])
            options_menu_items = [
                [
                    "English",
                    None,
                    lambda sender: self.menu_item_language("en")
                ],
                [
                    "French",
                    None,
                    lambda sender: self.menu_item_language("fr")
                ],
                [
                    "German (English for Teacher Tools)",
                    None,
                    lambda sender: self.menu_item_language("de")
                ],
                [
                    "Italian (English for Teacher Tools)",
                    None,
                    lambda sender: self.menu_item_language("it")
                ],
                None,
                [
                    "Thymio Device Manager",
                    None,
                    lambda sender: self.menu_item_bridge("tdm")
                ],
                [
                    "JSON WebSocket",
                    None,
                    lambda sender: self.menu_item_bridge("jws")
                ],
                [
                    "No Robot",
                    None,
                    lambda sender: self.menu_item_bridge("none")
                ],
            ]
            if len(self.ui_toc) > 1:
                def ui_cmd(id):
                    # keep id in closure
                    return lambda sender: self.menu_item_ui(id)
                options_menu_items += [
                    None
                ] + [
                    [
                        ui["name"]["en"],
                        None,
                        ui_cmd(ui["id"])
                    ] for ui in self.ui_toc
                ]
            options_menu_items += [
                None,
                [
                    "Shortened URLs",
                    None,
                    lambda sender: self.menu_item_shorten_urls()
                ],
                [
                    "Login Screen QR Code",
                    None,
                    lambda sender: self.menu_item_login_QR_code()
                ],
                [
                    "Log Display in Dashboard",
                    None,
                    lambda sender: self.menu_item_log_display()
                ],
                [
                    "Advanced Simulator Features",
                    None,
                    lambda sender: self.menu_item_advanced_sim_features()
                ],
                [
                    "Developer Tools",
                    None,
                    lambda sender: self.menu_item_dev_tools()
                ],
            ]
            self.app_objc.addMenu_withItems_("Options", options_menu_items)
            self.app_objc.start()
        except Exception as e:
            ApplicationObjCShell.modalAlert(str(e), buttons=["Quit"])
            NSApp.terminate_(None)

        width = 600
        height = 370
        y = 330

        self.window = self.app_objc.createWindowWithTitle_width_height_x_y_(
            self.title(),
            width, height,
            20, 20
        )
        self.status = self.app_objc.addLabelToWindow_title_width_x_y_(
            self.window,
            "",
            width - 40, 20, y)
        y -= 20
        self.robots_status = self.app_objc.addLabelToWindow_title_width_x_y_(
            self.window,
            "",
            width - 40, 20, y)
        y -= 40
        self.open_button = self.app_objc.addButtonToWindow_title_action_width_x_y_(
            self.window,
            self.tr("Open tools in browser"),
            lambda sender: self.start_browser_tt(),
            240, (width - 240) / 2, y)
        y -= 155

        def drawQRCode(rect):
            import qrcode
            qr = qrcode.QRCode()
            path = self.tt_abs_path()
            url = URLUtil.teacher_tools_URL(port=self.http_port,
                                            path=path)
            qr.add_data(url)
            qr.make()
            n = qr.modules_count
            s = 160 // (n + 8)  # margin = at least 4 modules
            margin = (160 - n * s) / 2
            NSColor.blackColor().set()
            for i in range(n):
                for j in range(n):
                    if qr.modules[i][j]:
                        NSRectFill(NSMakeRect(margin + s * j, 160 - margin - s * i - s, s, s))
        self.qr = self.app_objc.addDrawingToWindow_draw_x_y_width_height_(self.window,
                                                                          drawQRCode,
                                                                          (width - 160) / 2, y, 160, 160)
        y -= 140

        self.help_message = self.app_objc.addLabelToWindow_title_width_x_y_(
            self.window,
            self.tr("help-message"),
            width - 40, 20, y
        )

        self.load_prefs()
        self.update_menu_state()
        self.translate_ui()

    def title(self):
        return f"{self.tr('VPL Server')} - " + self.tt_url(True)

    def disable_serial(self):
        self.no_serial = True
        self.update_menu_state()

    def main_loop(self):
        self.app_objc.run()

    def show_connection_status(self, str):
        if hasattr(self, "status") and self.status:
            self.status.setStringValue_(str)

    def show_robots_status(self, str):
        if self.robots_status:
            self.robots_status.setStringValue_(str)

    def translate_menus(self):
        for i, menuName in enumerate(self.app_objc.menuNames):
            menu = self.app_objc.getMenuWithTitle_(menuName)
            menu.setTitle_(self.tr(menuName))
            for item in self.app_objc.menuItems[i]:
                if item:
                    menuItem = self.app_objc.getMenuItemWithTitle_inMenu_(item[0], menuName)
                    menuItem.setTitle_(self.tr(item[0]))

    def translate_ui(self):
        self.translate_menus()
        if self.window:
            self.window.setTitle_(self.title())
            self.update_connection()
            self.update_robots()
            self.open_button.setTitle_(self.tr("Open tools in browser"))
            self.help_message.setStringValue_(self.tr("help-message"))
        if self.qr:
            self.qr.needsDisplay = True
            self.qr.display()

    def update_menu_state(self):
        item = self.app_objc.getMenuItemWithTitle_inMenu_("English", "Options")
        item.setState_(1 if self.language == "en" else 0)
        item = self.app_objc.getMenuItemWithTitle_inMenu_("French", "Options")
        item.setState_(1 if self.language == "fr" else 0)
        item = self.app_objc.getMenuItemWithTitle_inMenu_("German (English for Teacher Tools)", "Options")
        item.setState_(1 if self.language == "de" else 0)
        item = self.app_objc.getMenuItemWithTitle_inMenu_("Italian (English for Teacher Tools)", "Options")
        item.setState_(1 if self.language == "it" else 0)

        item = self.app_objc.getMenuItemWithTitle_inMenu_("Thymio Device Manager", "Options")
        item.setState_(1 if self.bridge == "tdm" else 0)
        item = self.app_objc.getMenuItemWithTitle_inMenu_("JSON WebSocket", "Options")
        item.setEnabled_(0 if self.no_serial else 1)
        item.setState_(1 if self.bridge == "jws" else 0)
        item = self.app_objc.getMenuItemWithTitle_inMenu_("No Robot", "Options")
        item.setState_(1 if self.bridge == "none" else 0)

        if len(self.ui_toc) > 1:
            for ui in self.ui_toc:
                item = self.app_objc.getMenuItemWithTitle_inMenu_(ui["name"]["en"], "Options")
                item.setState_(1 if self.vpl_ui == ui["id"] else 0)

        item = self.app_objc.getMenuItemWithTitle_inMenu_("Shortened URLs", "Options")
        item.setState_(0 if self.full_url else 1)

        item = self.app_objc.getMenuItemWithTitle_inMenu_("Login Screen QR Code", "Options")
        item.setState_(1 if self.has_login_qr_code else 0)

        item = self.app_objc.getMenuItemWithTitle_inMenu_("Log Display in Dashboard", "Options")
        item.setState_(1 if self.log_display else 0)

        item = self.app_objc.getMenuItemWithTitle_inMenu_("Advanced Simulator Features", "Options")
        item.setState_(1 if self.advanced_sim_features else 0)

        item = self.app_objc.getMenuItemWithTitle_inMenu_("Developer Tools", "Options")
        item.setState_(1 if self.dev_tools else 0)

    def menu_item_copy_url(self):
        path = self.tt_abs_path()
        url = URLUtil.teacher_tools_URL(port=self.http_port,
                                        path=path)
        pasteboard = NSPasteboard.generalPasteboard()
        pasteboard.clearContents()
        pasteboard.setString_forType_(url, NSStringPboardType)

    def menu_item_shorten_urls(self):
        self.set_full_url(not self.full_url)
        self.update_menu_state()
        self.save_prefs()

    def menu_item_login_QR_code(self):
        self.set_login_qr_code(not self.has_login_qr_code)
        self.update_menu_state()
        self.save_prefs()

    def menu_item_log_display(self):
        self.set_log_display(not self.log_display)
        self.update_menu_state()
        self.save_prefs()

    def menu_item_advanced_sim_features(self):
        self.set_advanced_sim_features(not self.advanced_sim_features)
        self.update_menu_state()
        self.save_prefs()

    def menu_item_dev_tools(self):
        self.set_dev_tools(not self.dev_tools)
        self.update_menu_state()
        self.save_prefs()

    def menu_item_language(self, language):
        self.set_language(language)
        self.update_menu_state()
        self.save_prefs()
        self.translate_ui()

    def menu_item_bridge(self, bridge):
        bridge = self.set_bridge(bridge)
        self.update_menu_state()
        self.save_prefs()

    def menu_item_ui(self, ui):
        self.set_vpl_ui(ui)
        self.update_menu_state()
        self.save_prefs()
