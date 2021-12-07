#!/usr/bin/python3

# Author: Yves Piguet, EPFL
# Please don't redistribute without author's permission.

# server gui partial base class (must be subclassed for specific gui pkg)

from vpl3tt.server import Server
from vpl3tt.urlutil import URLUtil
from vpl3tt.translate import Translate
import vpl3tt.translate_fr
from vpl3tt.db import Db
from vpl3tt.tdm_client import TDMClient
from vpl3tt.datapath import DataPath

import threading
import os
import json


class ApplicationBase:

    DEFAULT_HTTP_PORT = Server.DEFAULT_HTTP_PORT
    DEFAULT_WS_PORT = Server.DEFAULT_WS_PORT
    DEFAULT_PREFS_PATH = os.path.expanduser("~/vplserver-prefs.json")
    UI_TOC_PATH = os.path.join("doc", "vpl", "ui", "toc.json")
    LANGUAGES = {"en", "fr", "de", "it"}
    TT_LANGUAGES = {"en", "fr"}
    BRIDGES = {"none", "tdm", "jws"}

    def __init__(self,
                 db_path=Db.DEFAULT_PATH,
                 http_port=None,
                 ws_port=DEFAULT_WS_PORT,
                 timeout=5,
                 ws_link_url=None,
                 language=None,
                 full_url=False,
                 advanced=False):
        self.translate = Translate()
        vpl3tt.translate_fr.add_translations_fr(self.translate)
        self.language = language
        self.translate.set_language(language)
        self.logger_lock = threading.Lock()
        tt_language = language  if self.translate.has_translation(language) else None
        self.server = Server(db_path=db_path,
                             http_port=http_port,
                             ws_port=ws_port,
                             timeout=timeout,
                             ws_link_url=ws_link_url,
                             language=language,
                             tt_language=tt_language,
                             full_url=full_url,
                             logger=self.logger,
                             update_connection=self.update_connection,
                             update_robots=self.update_robots,
                             initial_file_dir=DataPath.path("data"),
                             default_program_filename=self.tr("program.vpl3"))
        self.server.add_files(if_new_db=True)
        self.server.start()
        self.http_port = self.server.get_http_port()
        self.no_serial = False
        self.tt_language = tt_language
        self.bridge = "none"  # "tdm" or "jws" or "none"
        self.full_url = full_url
        self.advanced = advanced
        self.log_display = False
        self.advanced_sim_features = False
        self.has_login_qr_code = False
        self.autonomous_student_progress = True
        self.dev_tools = False
        self.load_ui_list()
        self.set_bridge("tdm")
        self.tdm_client = TDMClient()

        # to implement in subclasses:
        # GUI initialization showing self.tt_url() w/ a way to call
        # self.start_browser_tt() and self.quit()

    def tt_abs_path(self):
        return f"/tt.html?token={self.server.tt_token}"

    def tt_url(self, short=False):
        return f"{'' if short else 'http://'}{URLUtil.get_local_IP()}:{self.http_port}{self.tt_abs_path()}"

    def set_bridge(self, bridge):
        try:
            self.bridge = bridge
            self.server.set_bridge(bridge, self)
        except Exception:
            self.bridge = "none"
            self.server.set_bridge("none", self)
        return self.bridge

    def set_vpl_ui(self, ui):
        self.vpl_ui = ui
        for ui_entry in self.ui_toc:
            if ui_entry["id"] == ui:
                self.server.http_server.vpl_ui_uri = ui_entry["uri"]
                break

    def run(self):
        self.update_connection()
        self.main_loop()

    def logger(self, str):
        with self.logger_lock:
            self.writeln(str)

    def update_connection(self, session_id=None):
        str = f"""{self.tr('Number of connections:')} {
            len(self.server.ws_server.session_ids)
            if self.server.ws_server
            else "-"
        }"""
        self.show_connection_status(str)

    def update_robots(self, session_id=None):
        if self.bridge == "jws":
            str = f"""{self.tr('Number of robots:')} {
                self.server.thymio_server.robot_count
                if self.server.thymio_server
                else "-"
            }"""
            self.show_robots_status(str)
        elif self.bridge == "tdm":
            if hasattr(self, "tdm_client"):
                is_tdm_connected = self.tdm_client.check_connection()
                self.show_robots_status("" if is_tdm_connected else self.tr("TDM not running; please start Thymio Suite"))
        else:
            self.show_robots_status("")

    def start_browser_tt(self):
        path = self.tt_abs_path()
        URLUtil.start_browser(port=self.http_port,
                              path=path,
                              using=["firefox", "chrome"])

    def set_language(self, language):
        self.language = language
        self.tt_language = language if language in self.TT_LANGUAGES else "en"
        self.translate.set_language(self.tt_language)
        self.server.language = language
        self.server.tt_language = self.tt_language
        self.server.http_server.language = language
        self.server.http_server.tt_language = self.tt_language

    def set_full_url(self, b):
        self.full_url = b
        self.server.http_server.full_url = b

    def set_login_qr_code(self, b):
        self.has_login_qr_code = b
        self.server.http_server.has_login_qr_code = b

    def set_autonomous_student_progress(self, b):
        self.autonomous_student_progress = b
        self.server.http_server.autonomous_student_progress = b

    def set_dev_tools(self, b):
        self.dev_tools = b
        self.server.http_server.dev_tools = b

    def set_log_display(self, b):
        self.log_display = b
        self.server.http_server.log_display = b

    def set_advanced_sim_features(self, b):
        self.advanced_sim_features = b
        self.server.http_server.advanced_sim_features = b

    def tr(self, key):
        return self.translate.tr(key)

    def quit(self):
        self.server.stop()
        self.exit_app()

    def main_loop(self):
        # must be overriden: must run event loop or sleep until quit
        pass

    def show_connection_status(self, str):
        # should be overriden: should display str as the connection status
        pass

    def show_tdm_status(self, str):
        # should be overriden: should display str as the TDM status
        pass

    def show_robots_status(self, str):
        # should be overriden: should display str as the robots status
        pass

    def writeln(self, str):
        # should be overriden: should add str+"\n" to log
        pass

    def exit_app(self):
        # should be overriden: should run event loop or sleep until quit
        pass

    def save_prefs(self):
        prefs = {
            "language": self.language,
            "bridge": self.bridge,
            "vpl_ui": self.vpl_ui,
            "full_url": self.server.http_server.full_url,
            "login_qr_code": self.server.http_server.has_login_qr_code,
            "autonomous_student_progress": self.server.http_server.autonomous_student_progress,
            "log_display": self.log_display,
            "advanced_sim_features": self.advanced_sim_features,
            "dev_tools": self.dev_tools,
        }
        with open(self.DEFAULT_PREFS_PATH, "w") as file:
            json.dump(prefs, file, indent=4, sort_keys=True)

    def load_prefs(self):
        try:
            with open(self.DEFAULT_PREFS_PATH) as file:
                prefs = json.load(file)
                if "language" in prefs:
                    language = prefs["language"]
                    if language in self.LANGUAGES:
                        self.set_language(language)
                if "bridge" in prefs:
                    bridge = prefs["bridge"]
                    if bridge in self.BRIDGES:
                        self.set_bridge(bridge)
                if "vpl_ui" in prefs:
                    vpl_ui = prefs["vpl_ui"]
                    if vpl_ui in self.vpl_ui_set:
                        self.set_vpl_ui(prefs["vpl_ui"])
                if "full_url" in prefs:
                    self.set_full_url(prefs["full_url"])
                if "login_qr_code" in prefs:
                    self.set_login_qr_code(prefs["login_qr_code"])
                if "autonomous_student_progress" in prefs:
                    self.set_autonomous_student_progress(prefs["autonomous_student_progress"])
                if "log_display" in prefs:
                    self.set_log_display(prefs["log_display"])
                if "advanced_sim_features" in prefs:
                    self.set_advanced_sim_features(prefs["advanced_sim_features"])
                if "dev_tools" in prefs:
                    self.set_dev_tools(prefs["dev_tools"])
        except Exception:
            pass

    def load_ui_list(self):
        try:
            with open(DataPath.path(self.UI_TOC_PATH), "rb") as file:
                self.ui_toc = json.load(file)
        except Exception:
            self.ui_toc = [
            	{
            		"id": "classic",
            		"name": {
            			"en": "Appearance \"Classic\"",
            			"fr": "Apparence \"classique\""
            		},
            		"uri": "ui/classic/ui.json"
            	}
            ]
        self.vpl_ui_set = {ui["id"] for ui in self.ui_toc}
        self.set_vpl_ui(self.ui_toc[0]["id"])
        for ui in self.ui_toc:
            for language in ui["name"]:
                if language != "en":
                    self.translate.set_translation(language,
                                                   ui["name"]["en"],
                                                   ui["name"][language])
