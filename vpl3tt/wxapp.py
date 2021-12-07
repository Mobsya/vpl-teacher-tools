#!/usr/bin/python3

# Author: Yves Piguet, EPFL
# Please don't redistribute without author's permission.

# server gui with wxPython

from vpl3tt.baseapp import ApplicationBase
from vpl3tt.urlutil import URLUtil

import wx
# Ubuntu: sudo apt install python3-wxgtk4.0
# macOS: pip3 install -U wxPython

import re

class QRControl(wx.Control):
    # see implementation of GenStaticText in wx/lib/stattext.py

    def __init__(self, parent, ID=-1,
                 pos=wx.DefaultPosition, size=wx.DefaultSize,
                 style=0,
                 name="QRCode",
                 text=""):
        wx.Control.__init__(self, parent, ID, pos, size, style | wx.NO_BORDER,
                            wx.DefaultValidator, name)
        self.InheritAttributes()
        self.SetInitialSize(size)

        self.Bind(wx.EVT_PAINT, self.OnPaint)
        self.Bind(wx.EVT_ERASE_BACKGROUND, lambda event: self.OnEraseBackground())

        self.size = size
        self.text = text

    def SetText(self, text):
        self.text = text
        self.Refresh()

    def DoGetBestSize(self):
        return wx.Size(self.size[0], self.size[1])

    def AcceptsFocus(self):
        return False

    def OnPaint(self, event):
        dc = wx.BufferedPaintDC(self)

        width, height = self.GetClientSize()
        backColor = self.GetBackgroundColour()
        dc.SetBackground(wx.Brush(backColor, wx.SOLID))
        dc.Clear()

        import qrcode
        qr = qrcode.QRCode()
        qr.add_data(self.text)
        qr.make()
        n = qr.modules_count
        s = width // (n + 8)  # margin = at least 4 modules
        margin = (width - n * s) / 2
        dc.SetBrush(wx.Brush(wx.BLACK, wx.SOLID))
        for i in range(n):
            for j in range(n):
                if qr.modules[i][j]:
                    dc.DrawRectangle(margin + s * j, margin + s * i, s, s)

    def OnEraseBackground(self):
        pass

class Application(ApplicationBase, wx.App):

    def __init__(self, **kwargs):
        wx.App.__init__(self)
        ApplicationBase.__init__(self, **kwargs)

        self.frame = wx.Frame(None,
                              title=f"{self.tr('VPL Server')}",
                              style=wx.DEFAULT_FRAME_STYLE & ~wx.RESIZE_BORDER)
        self.frame.Bind(wx.EVT_CLOSE,
                        lambda event: self.quit())
        self.frame.SetMinSize(wx.Size(600, 420))

        self.panel = wx.Panel(self.frame)
        self.vbox = wx.BoxSizer(wx.VERTICAL)

        self.status = wx.StaticText(self.panel, -1)
        self.vbox.Add(self.status, 0, wx.ALL | wx.EXPAND, 10)

        self.robot_status = wx.StaticText(self.panel, -1)
        self.vbox.Add(self.robot_status, 0, wx.ALL | wx.EXPAND, 10)

        self.launch_button = wx.Button(self.panel, -1, "Ouvrir les outils dans le navigateur")  # french for worst case length
        self.launch_button.Bind(wx.EVT_BUTTON, lambda event: self.start_browser_tt())
        self.vbox.Add(self.launch_button, 0, wx.CENTER)

        self.qr_code = QRControl(self.panel, size=(160, 160), text="?")
        self.vbox.Add(self.qr_code, 0, wx.ALL | wx.CENTER, 10)

        self.help = wx.StaticText(self.panel, -1)
        self.vbox.Add(self.help, 0, wx.ALL | wx.EXPAND, 10)

        self.vbox.SetSizeHints(self.panel)
        self.panel.SetSizerAndFit(self.vbox)
        self.frame.Fit()

        self.update_connection()

        # menu
        self.menubar = wx.MenuBar()

        file_menu = wx.Menu()
        self.menu_file = self.menubar.GetMenuCount()
        self.menubar.Append(file_menu, "File")
        self.menu_item_open_tool = file_menu.Append(-1,
                                                    "Open Tools in Browser\tCtrl-B",
                                                    "Open VPL3 teacher tools in browser")
        self.frame.Bind(wx.EVT_MENU,
                        lambda event: self.start_browser_tt(),
                        self.menu_item_open_tool)
        self.menu_item_quit = file_menu.Append(wx.ID_EXIT,
                                     "Quit\tCtrl-Q")
        self.frame.Bind(wx.EVT_MENU,
                        lambda event: self.quit(),
                        self.menu_item_quit)

        edit_menu = wx.Menu()
        self.menu_edit = self.menubar.GetMenuCount()
        self.menubar.Append(edit_menu, "Edit")
        self.menu_item_copy_url = edit_menu.Append(-1,
                                                   "Copy URL\tCtrl-C",
                                                   "Copy the teacher tool URL to the clipboard")
        self.frame.Bind(wx.EVT_MENU,
                        lambda event: self.do_menu_item_copy_url(),
                        self.menu_item_copy_url)

        language_menu = wx.Menu()
        self.menu_language = self.menubar.GetMenuCount()
        self.menubar.Append(language_menu, "Language")
        self.menu_item_language_en = language_menu.AppendRadioItem(-1,
                                                                   "English")
        self.menu_item_language_fr = language_menu.AppendRadioItem(-1,
                                                                   "French")
        self.menu_item_language_de = language_menu.AppendRadioItem(-1,
                                                                   "German")
        self.menu_item_language_it = language_menu.AppendRadioItem(-1,
                                                                   "Italian")
        self.frame.Bind(wx.EVT_MENU,
                        lambda event: self.do_menu_item_language(),
                        self.menu_item_language_en)
        self.frame.Bind(wx.EVT_MENU,
                        lambda event: self.do_menu_item_language(),
                        self.menu_item_language_fr)
        self.frame.Bind(wx.EVT_MENU,
                        lambda event: self.do_menu_item_language(),
                        self.menu_item_language_de)
        self.frame.Bind(wx.EVT_MENU,
                        lambda event: self.do_menu_item_language(),
                        self.menu_item_language_it)

        options_menu = wx.Menu()
        self.menu_options = self.menubar.GetMenuCount()
        self.menubar.Append(options_menu, "Options")
        self.menu_item_login_screen_qr_code = options_menu.AppendCheckItem(-1,
                                                                           "Login Screen QR Code")
        self.menu_item_login_screen_qr_code.Check(self.has_login_qr_code)
        self.frame.Bind(wx.EVT_MENU,
                        lambda event: self.do_menu_item_login_screen_qr_code(),
                        self.menu_item_login_screen_qr_code)
        self.menu_item_autonomous_student_progress = options_menu.AppendCheckItem(-1,
                                                                                  "Autonomous Pupil Progress")
        self.menu_item_autonomous_student_progress.Check(self.has_login_qr_code)
        self.frame.Bind(wx.EVT_MENU,
                        lambda event: self.do_menu_item_autonomous_student_progress(),
                        self.menu_item_autonomous_student_progress)
        self.menu_item_log_display = options_menu.AppendCheckItem(-1,
                                                                  "Log Display in Dashboard")
        self.menu_item_log_display.Check(self.log_display)
        self.frame.Bind(wx.EVT_MENU,
                        lambda event: self.do_menu_item_log_display(),
                        self.menu_item_log_display)
        options_menu.AppendSeparator()
        self.menu_item_add_default_files = options_menu.Append(-1,
                                                               "Add Default Files")
        self.frame.Bind(wx.EVT_MENU,
                        lambda event: self.server.add_files(),
                        self.menu_item_add_default_files)

        if self.advanced:
            advanced_menu = wx.Menu()
            self.menu_advanced = self.menubar.GetMenuCount()
            self.menubar.Append(advanced_menu, "Advanced")
            self.menu_item_bridge_tdm = advanced_menu.AppendRadioItem(-1,
                                                                      "Thymio Device Manager")
            self.menu_item_bridge_jws = advanced_menu.AppendRadioItem(-1,
                                                                      "JSON WebSocket")
            self.menu_item_bridge_none = advanced_menu.AppendRadioItem(-1,
                                                                       "No Robot")
            self.frame.Bind(wx.EVT_MENU,
                            lambda event: self.do_menu_item_bridge(),
                            self.menu_item_bridge_tdm)
            self.frame.Bind(wx.EVT_MENU,
                            lambda event: self.do_menu_item_bridge(),
                            self.menu_item_bridge_jws)
            self.frame.Bind(wx.EVT_MENU,
                            lambda event: self.do_menu_item_bridge(),
                            self.menu_item_bridge_none)
            advanced_menu.AppendSeparator()
            self.menu_item_shortened_urls = advanced_menu.AppendCheckItem(-1,
                                                                          "Shortened URLs")
            self.menu_item_shortened_urls.Check(not self.full_url)
            self.frame.Bind(wx.EVT_MENU,
                            lambda event: self.do_menu_item_shortened_urls(),
                            self.menu_item_shortened_urls)
            self.menu_item_advanced_sim_features = advanced_menu.AppendCheckItem(-1,
                                                                                "Advanced Simulator Features")
            self.menu_item_advanced_sim_features.Check(self.advanced_sim_features)
            self.frame.Bind(wx.EVT_MENU,
                            lambda event: self.do_menu_item_advanced_sim_features(),
                            self.menu_item_advanced_sim_features)
            self.menu_item_dev_tools = advanced_menu.AppendCheckItem(-1,
                                                                     "Developer Tools")
            self.menu_item_dev_tools.Check(self.dev_tools)
            self.frame.Bind(wx.EVT_MENU,
                            lambda event: self.do_menu_item_dev_tools(),
                            self.menu_item_dev_tools)

        self.frame.SetMenuBar(self.menubar)

        self.load_prefs()

        self.change_language()
        self.update_menu()

        self.update_qr_code()
        self.frame.Show()

    def main_loop(self):
        self.MainLoop()

    def update_menu(self):
        self.menu_item_language_en.Check(self.language == "en")
        self.menu_item_language_fr.Check(self.language == "fr")
        self.menu_item_language_de.Check(self.language == "de")
        self.menu_item_language_it.Check(self.language == "it")
        if self.advanced:
            bridge = self.set_bridge(self.bridge)
            self.menu_item_bridge_tdm.Check(bridge == "tdm")
            self.menu_item_bridge_jws.Check(bridge == "jws")
            self.menu_item_bridge_none.Check(bridge != "tdm" and bridge != "jws")

    def update_qr_code(self):
        path = self.tt_abs_path()
        url = URLUtil.teacher_tools_URL(port=self.http_port,
                                        path=path)
        self.qr_code.SetText(url)

    def show_connection_status(self, str):
        if hasattr(self, "status") and self.status:
            self.status.SetLabel(str)

    def show_robots_status(self, str):
        self.robot_status.SetLabel(str)

    def exit_app(self):
        self.frame.Destroy()

    def change_language(self):
        r = re.compile(r"^.*\t")
        def tr(item, key):
            label = item.GetItemLabel()
            item.SetItemLabel(self.tr(key) +
                              ("\t" + r.sub("", label)
                               if "\t" in label
                               else ""))

        self.menubar.SetMenuLabel(self.menu_file, self.tr("File"))
        tr(self.menu_item_open_tool, "Open Tools in Browser")
        tr(self.menu_item_quit, "Quit")

        self.menubar.SetMenuLabel(self.menu_edit, self.tr("Edit"))
        tr(self.menu_item_copy_url, "Copy URL")

        self.menubar.SetMenuLabel(self.menu_language, self.tr("Language"))
        tr(self.menu_item_language_en, "English")
        tr(self.menu_item_language_fr, "French")
        tr(self.menu_item_language_de, "German (English for Teacher Tools)")
        tr(self.menu_item_language_it, "Italian (English for Teacher Tools)")
        self.menubar.SetMenuLabel(self.menu_options, self.tr("Options"))
        tr(self.menu_item_login_screen_qr_code, "Login Screen QR Code")
        tr(self.menu_item_autonomous_student_progress, "Autonomous Pupil Progress")
        tr(self.menu_item_log_display, "Log Display in Dashboard")
        tr(self.menu_item_add_default_files, "Add Default Files")
        if self.advanced:
            self.menubar.SetMenuLabel(self.menu_advanced, self.tr("Advanced"))
            tr(self.menu_item_bridge_tdm, "Thymio Device Manager")
            tr(self.menu_item_bridge_jws, "JSON WebSocket")
            tr(self.menu_item_bridge_none, "No Robot")
            tr(self.menu_item_shortened_urls, "Shortened URLs")
            tr(self.menu_item_advanced_sim_features, "Advanced Simulator Features")
            tr(self.menu_item_dev_tools, "Developer Tools")

        self.launch_button.SetLabel(self.tr("Open tools in browser"))
        self.help.SetLabel(self.tr("help-message"))

        self.frame.SetTitle(f"{self.tr('VPL Server')}")

    def do_menu_item_copy_url(self):
        if wx.TheClipboard.Open():
            path = self.tt_abs_path()
            url = URLUtil.teacher_tools_URL(port=self.http_port,
                                            path=path)
            wx.TheClipboard.SetData(wx.TextDataObject(url))
            wx.TheClipboard.Close()

    def do_menu_item_language(self):
        self.set_language("en" if self.menu_item_language_en.IsChecked()
                          else "fr" if self.menu_item_language_fr.IsChecked()
                          else "de" if self.menu_item_language_de.IsChecked()
                          else "it" if self.menu_item_language_it.IsChecked()
                          else "en")
        self.change_language()
        self.save_prefs()

    def do_menu_item_shortened_urls(self):
        self.set_full_url(not self.menu_item_shortened_urls.IsChecked())
        self.save_prefs()

    def do_menu_item_login_screen_qr_code(self):
        self.set_login_qr_code(self.menu_item_login_screen_qr_code.IsChecked())
        self.save_prefs()

    def do_menu_item_autonomous_student_progress(self):
        self.set_autonomous_student_progress(self.menu_item_autonomous_student_progress.IsChecked())
        self.save_prefs()

    def do_menu_item_log_display(self):
        self.set_log_display(self.menu_item_log_display.IsChecked())
        self.save_prefs()

    def do_menu_item_advanced_sim_features(self):
        self.set_advanced_sim_features(self.menu_item_advanced_sim_features.IsChecked())
        self.save_prefs()

    def do_menu_item_dev_tools(self):
        self.set_dev_tools(self.menu_item_dev_tools.IsChecked())
        self.save_prefs()

    def do_menu_item_bridge(self):
        bridge = ("tdm" if self.menu_item_bridge_tdm.IsChecked()
                  else "jws" if self.menu_item_bridge_jws.IsChecked()
                  else "none")
        bridge = self.set_bridge(bridge)
        self.menu_item_bridge_tdm.Check(bridge == "tdm")
        self.menu_item_bridge_jws.Check(bridge == "jws")
        self.menu_item_bridge_none.Check(bridge != "tdm" and bridge != "jws")
        self.save_prefs()
