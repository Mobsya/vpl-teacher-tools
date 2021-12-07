#!/usr/bin/python3

# Author: Yves Piguet, EPFL
# Please don't redistribute without author's permission.

# server gui with tkinter

from vpl3tt.baseapp import ApplicationBase
from vpl3tt.urlutil import URLUtil

import tkinter as tk
from tkinter.scrolledtext import ScrolledText
import os


class Application(ApplicationBase, tk.Tk):

    def __init__(self, **kwargs):
        tk.Tk.__init__(self)
        ApplicationBase.__init__(self, **kwargs)

        self.title(f"{self.tr('VPL Server')}")
        self.protocol("WM_DELETE_WINDOW", self.quit)  # close widget
        self.createcommand("exit", self.quit)  # Quit menu

        self.geometry("600x420")
        self.resizable(width=False, height=False)

        padding = 10

        self.status = tk.Label(self, anchor=tk.W, width=60)
        self.status.pack(padx=padding, pady=padding)

        self.robot_status = tk.Label(self, anchor=tk.W, width=60)
        self.robot_status.pack(padx=padding, pady=padding)

        self.browser_button = tk.Button(self,
                                        text=self.tr("Open tools in browser"),
                                        padx=10,
                                        command=self.start_browser_tt)
        self.browser_button.pack(padx=padding, pady=padding)

        self.qr_canvas = tk.Canvas(width=160, height=160)
        self.qr_canvas.pack(padx=padding, pady=padding)
        self.draw_qr_code()

        self.help = tk.Label(self, anchor="center", width=400)
        self.help.pack(padx=padding, pady=padding)

        #self.log = ScrolledText(self)
        #self.log.grid(sticky=tk.N+tk.W+tk.E+tk.S)
        self.log = None

        menu_items = {}

        # menus
        menubar = tk.Menu(self)
        self.config(menu=menubar)
        self.file_menu = tk.Menu(menubar, tearoff=False)
        self.file_menu.add_command(
            command=self.start_browser_tt,
            accelerator="Control-B")
        menu_items["Open Tools in Browser"] = (self.file_menu, self.file_menu.index("end"))
        self.bind("<Control-b>", lambda event: self.start_browser_tt())
        self.bind("<Control-q>", lambda event: self.quit())
        menubar.add_cascade(menu=self.file_menu)
        menu_items["File"] = (menubar, menubar.index("end"))

        self.edit_menu = tk.Menu(menubar, tearoff=False)
        self.edit_menu.add_command(
            command=self.menu_item_copy_url,
            accelerator="Control-C")
        menu_items["Copy URL"] = (self.edit_menu, self.edit_menu.index("end"))
        self.bind("<Control-c>", lambda event: self.menu_item_copy_url())
        menubar.add_cascade(menu=self.edit_menu)
        menu_items["Edit"] = (menubar, menubar.index("end"))

        def set_text():
            for key in menu_items:
                menu, index = menu_items[key]
                menu.entryconfigure(index, label=self.tr(key))
            self.v_language.set(self.language)
            self.title(f"{self.tr('VPL Server')}")
            self.update_connection()
            self.update_robots()
            self.browser_button.config(text=self.tr("Open tools in browser"))
            self.draw_qr_code()
            self.help["text"] = self.tr("help-message")

        def change_language(language):
            self.set_language(language)
            self.save_prefs()
            set_text()

        self.v_shorten_url = tk.BooleanVar(value=True)
        self.v_shorten_url.trace("w",
                                 lambda name, i, op:
                                 self.menu_item_shorten_urls(self.v_shorten_url.get()))
        self.v_login_qr_code = tk.BooleanVar(value=False)
        self.v_login_qr_code.trace("w",
                                   lambda name, i, op:
                                   self.menu_item_login_qr_code(self.v_login_qr_code.get()))
        self.v_autonomous_student_progress = tk.BooleanVar(value=False)
        self.v_autonomous_student_progress.trace("w",
                                                 lambda name, i, op:
                                                 self.menu_item_autonomous_student_progress(self.v_autonomous_student_progress.get()))
        self.v_log_in_dashboard = tk.BooleanVar(value=False)
        self.v_log_in_dashboard.trace("w",
                                      lambda name, i, op:
                                      self.menu_item_log_in_dashboard(self.v_log_in_dashboard.get()))
        self.v_advanced_sim_features = tk.BooleanVar(value=False)
        self.v_advanced_sim_features.trace("w",
                                           lambda name, i, op:
                                           self.menu_item_advanced_sim_features(self.v_advanced_sim_features.get()))
        self.v_dev_tools = tk.BooleanVar(value=False)
        self.v_dev_tools.trace("w",
                               lambda name, i, op:
                               self.menu_item_dev_tools(self.v_dev_tools.get()))
        self.v_language = tk.StringVar(value="fr")
        self.v_bridge = tk.StringVar(value=self.bridge)
        self.v_vpl_ui = tk.StringVar(value="A")

        self.language_menu = tk.Menu(menubar, tearoff=False)
        self.language_menu.add_radiobutton(variable=self.v_language,
                                           value="en",
                                           command=lambda: change_language("en"))
        menu_items["English"] = (self.language_menu, self.language_menu.index("end"))
        self.language_menu.add_radiobutton(variable=self.v_language,
                                           value="fr",
                                           command=lambda: change_language("fr"))
        menu_items["French"] = (self.language_menu, self.language_menu.index("end"))
        self.language_menu.add_radiobutton(variable=self.v_language,
                                           value="de",
                                           command=lambda: change_language("de"))
        menu_items["German (English for Teacher Tools)"] = (self.language_menu, self.language_menu.index("end"))
        self.language_menu.add_radiobutton(variable=self.v_language,
                                           value="it",
                                           command=lambda: change_language("it"))
        menu_items["Italian (English for Teacher Tools)"] = (self.language_menu, self.language_menu.index("end"))
        menubar.add_cascade(menu=self.language_menu)
        menu_items["Language"] = (menubar, menubar.index("end"))

        self.options_menu = tk.Menu(menubar, tearoff=False)
        self.options_menu.add_checkbutton(variable=self.v_login_qr_code)
        menu_items["Login Screen QR Code"] = (self.options_menu, self.options_menu.index("end"))
        self.options_menu.add_checkbutton(variable=self.v_autonomous_student_progress)
        menu_items["Autonomous Pupil Progress"] = (self.options_menu, self.options_menu.index("end"))
        self.options_menu.add_checkbutton(variable=self.v_log_in_dashboard)
        menu_items["Log Display in Dashboard"] = (self.options_menu, self.options_menu.index("end"))
        self.options_menu.add_separator()
        self.options_menu.add_command(command=lambda: self.server.add_files())
        menu_items["Add Default Files"] = (self.options_menu, self.options_menu.index("end"))
        menubar.add_cascade(menu=self.options_menu)
        menu_items["Options"] = (menubar, menubar.index("end"))

        if self.advanced:
            self.advanced_menu = tk.Menu(menubar, tearoff=False)
            self.advanced_menu.add_radiobutton(variable=self.v_bridge,
                                              value="tdm",
                                              command=lambda: self.menu_item_bridge("tdm"))
            menu_items["Thymio Device Manager"] = (self.advanced_menu, self.advanced_menu.index("end"))
            self.advanced_menu.add_radiobutton(variable=self.v_bridge,
                                              value="jws",
                                              command=lambda: self.menu_item_bridge("jws"))
            menu_items["JSON WebSocket"] = (self.advanced_menu, self.advanced_menu.index("end"))
            self.advanced_menu.add_radiobutton(variable=self.v_bridge,
                                              value="none",
                                              command=lambda: self.menu_item_bridge("none"))
            menu_items["No Robot"] = (self.advanced_menu, self.advanced_menu.index("end"))
            if len(self.ui_toc) > 1:
                self.advanced_menu.add_separator()
                for ui in self.ui_toc:
                    self.advanced_menu.add_radiobutton(variable=self.v_vpl_ui,
                                                      value=ui["id"],
                                                      command=lambda: self.menu_item_ui(self.v_vpl_ui.get()))
                    menu_items[ui["name"]["en"]] = (self.advanced_menu, self.advanced_menu.index("end"))
            self.advanced_menu.add_separator()
            self.advanced_menu.add_checkbutton(variable=self.v_shorten_url)
            menu_items["Shortened URLs"] = (self.advanced_menu, self.advanced_menu.index("end"))
            self.advanced_menu.add_checkbutton(variable=self.v_advanced_sim_features)
            menu_items["Advanced Simulator Features"] = (self.advanced_menu, self.advanced_menu.index("end"))
            self.advanced_menu.add_checkbutton(variable=self.v_dev_tools)
            menu_items["Developer Tools"] = (self.advanced_menu, self.advanced_menu.index("end"))
            menubar.add_cascade(menu=self.advanced_menu)
            menu_items["Advanced"] = (menubar, menubar.index("end"))

        self.load_prefs()
        set_text()
        self.v_language.set(self.language)
        self.v_bridge.set(self.bridge)
        self.v_vpl_ui.set(self.vpl_ui)
        self.v_shorten_url.set(not self.full_url)
        self.v_login_qr_code.set(self.has_login_qr_code)
        self.v_autonomous_student_progress.set(self.autonomous_student_progress)
        self.v_log_in_dashboard.set(self.log_display)
        self.v_advanced_sim_features.set(self.advanced_sim_features)
        self.v_dev_tools.set(self.dev_tools)

        self.initialized = True

    def disable_serial(self):
        self.no_serial = True
        self.options_menu.entryconfig("JSON WebSocket", state="disabled")

    def is_initialized(self):
        return  "initialized" in self.__dict__ and self.initialized

    def writeln(self, str):
        if self.is_initialized() and self.log:
            self.log.insert("end", str + "\n")
            self.log.see(tk.END)

    def show_connection_status(self, str):
        if self.is_initialized() and str:
            self.status["text"] = str

    def show_robots_status(self, str):
        if self.is_initialized():
            self.robot_status["text"] = str

    def draw_qr_code(self):
        import qrcode
        qr = qrcode.QRCode()
        path = self.tt_abs_path()
        url = URLUtil.teacher_tools_URL(port=self.http_port,
                                        path=path)
        qr.add_data(url)
        qr.make()
        n = qr.modules_count
        qr_size = int(self.qr_canvas["width"])
        s = qr_size // (n + 8)  # margin = at least 4 modules
        margin = (qr_size - n * s) / 2
        self.qr_canvas.delete("all")
        for i in range(n):
            for j in range(n):
                if qr.modules[i][j]:
                    self.qr_canvas.create_rectangle(margin + s * j, margin + s * i, margin + s * j + s, margin + s * i + s, fill="#000", outline="")

    def menu_item_copy_url(self):
        path = self.tt_abs_path()
        url = URLUtil.teacher_tools_URL(port=self.http_port,
                                        path=path)
        self.clipboard_clear()
        self.clipboard_append(url)

    def menu_item_shorten_urls(self, b):
        self.set_full_url(not b)
        self.save_prefs()

    def menu_item_login_qr_code(self, b):
        self.set_login_qr_code(b)
        self.save_prefs()

    def menu_item_autonomous_student_progress(self, b):
        self.set_autonomous_student_progress(b)
        self.save_prefs()

    def menu_item_log_in_dashboard(self, b):
        self.set_log_display(b)
        self.save_prefs()

    def menu_item_advanced_sim_features(self, b):
        self.set_advanced_sim_features(b)
        self.save_prefs()

    def menu_item_dev_tools(self, b):
        self.set_dev_tools(b)
        self.save_prefs()

    def menu_item_bridge(self, bridge):
        bridge = self.set_bridge(bridge)
        self.v_bridge.set(bridge)
        self.save_prefs()

    def menu_item_ui(self, ui):
        self.set_vpl_ui(ui)
        self.save_prefs()

    def main_loop(self):
        self.mainloop()

    def exit_app(self):
        self.destroy()
        os._exit(0) # forced exit despite coroutines
