#!/usr/bin/python3

# Author: Yves Piguet, EPFL
# Please don't redistribute without author's permission.

# server supervisor

from vpl3tt.server_http import VPLHTTPServer
from vpl3tt.server_ws import VPLWebSocketServer
from vpl3tt.server_thymio import ThymioWebSocketServer
from vpl3tt.db import Db

import threading
import asyncio
import logging
import os
import time


class Server:

    DEFAULT_HTTP_PORT = VPLHTTPServer.DEFAULT_PORT
    DEFAULT_WS_PORT = VPLWebSocketServer.DEFAULT_PORT
    DEFAULT_START_TIMEOUT = 30

    def __init__(self,
                 db_path=None,
                 http_port=DEFAULT_HTTP_PORT,
                 ws_port=DEFAULT_WS_PORT,
                 timeout=DEFAULT_START_TIMEOUT,
                 ws_link_url=None,
                 language=None,
                 tt_language=None,
                 full_url=False,
                 logger=None,
                 update_connection=None,
                 update_robots=None,
                 initial_file_dir=None,
                 default_program_filename=None):
        self.stopping = False
        self.db_path = db_path
        self.initial_file_dir = initial_file_dir
        self.http_port = http_port
        self.http = None
        self.http_server = None
        self.ws_port = ws_port
        self.timeout = timeout
        self.ws_link_url = ws_link_url
        self.bridge = "none"
        self.tt_token = "".join([chr(97 + b % 26) for b in os.urandom(10)])
        self.language = language
        self.tt_language = tt_language
        self.full_url = full_url
        self.default_program_filename = default_program_filename
        self.ws = None
        self.ws_server = None
        self.ws_thymio = None
        self.thymio_server = None
        self.logger = logger
        self.update_con = update_connection
        self.update_robots = update_robots

    def add_files(self, if_new_db=False):
        db = Db(self.db_path)
        if not if_new_db or db.new_db:
            import os
            import re
            f = re.compile("^[^.]")
            filenames = [
                os.path.join(self.initial_file_dir, filename)
                for filename in os.listdir(self.initial_file_dir)
                if f.match(filename) and
                   os.path.isfile(os.path.join(self.initial_file_dir, filename))
            ]
            db.add_local_files(filenames, "")
            folders = [
                os.path.join(self.initial_file_dir, foldername)
                for foldername in os.listdir(self.initial_file_dir)
                if f.match(foldername) and
                   os.path.isdir(os.path.join(self.initial_file_dir, foldername))
            ]
            db.add_zipped_local_folders(folders, "")

    def set_bridge(self, bridge, app=None):
        if self.bridge != bridge:
            if app:
                app.show_robots_status("")
            if self.bridge == "jws" and self.thymio_server:
                self.thymio_server.stop()
                self.ws_thymio.join()
                self.thymio_server = None
            self.bridge = bridge
            self.http_server.bridge = bridge
            if self.bridge == "jws":
                def thymio_thread():
                    asyncio.set_event_loop(asyncio.new_event_loop())
                    self.thymio_server = ThymioWebSocketServer(
                        on_connect=self.update_robots,
                        on_disconnect=self.update_robots)
                    self.thymio_server.run()
                try:
                    from thymiodirect import Connection
                    Connection.serial_default_port()
                    self.ws_thymio = threading.Thread(target=thymio_thread)
                    self.ws_thymio.start()
                except Connection.ThymioConnectionError as e:
                    if app:
                        app.disable_serial()
                        app.show_robots_status(str(e))
                except Exception as e:
                    if app:
                        app.disable_serial()
            elif self.bridge == "tdm":
                if app:
                    def tdm_client_thread():
                        while not self.stopping:
                            app.update_robots()
                            time.sleep(2)
                    threading.Thread(target=tdm_client_thread).start()

    def start(self):

        # let know the main thread that both servers have been started
        http_started = False
        ws_started = False
        servers_started = threading.Event()

        def http_thread():
            logging.debug("http thread: beginning")

            def session_id_getter():
                return self.ws_server.session_ids

            self.http_server = VPLHTTPServer(db_path=self.db_path,
                                             http_port=self.http_port,
                                             ws_port=self.ws_port,
                                             token = self.tt_token,
                                             language=self.language,
                                             tt_language=self.tt_language,
                                             full_url=self.full_url,
                                             session_id_getter=session_id_getter,
                                             logger=self.logger)
            self.http_port = self.http_server.get_port()
            logging.debug(f"http thread: http server created, port={self.http_port}")
            nonlocal http_started
            http_started = True
            if ws_started:
                logging.debug("http thread: websocket already started")
                servers_started.set()
            else:
                logging.debug("http thread: websocket not started yet")
            self.http_server.run()
            logging.debug(f"http thread: http server started")

        def ws_thread():
            try:
                logging.debug("websocket thread: beginning")
                asyncio.set_event_loop(asyncio.new_event_loop())
                logging.debug("websocket thread: event loop set")
                self.ws_server = VPLWebSocketServer(db_path=self.db_path,
                                                    logger=self.logger,
                                                    ws_port=self.ws_port,
                                                    ws_link_url=self.ws_link_url,
                                                    on_connect=self.update_con,
                                                    on_disconnect=self.update_con,
                                                    token=self.tt_token,
                                                    default_program_filename=self.default_program_filename)
                logging.debug("websocket thread: websocket server created")
                nonlocal ws_started
                ws_started = True
                if http_started:
                    logging.debug("websocket thread: http already started")
                    servers_started.set()
                else:
                    logging.debug("websocket thread: http not started yet")
                self.ws_server.run()
                logging.debug(f"websocket thread: websocket server started")
            except Exception as e:
                import traceback
                logging.debug(traceback.format_exc())

        self.http = threading.Thread(target=http_thread)
        self.ws = threading.Thread(target=ws_thread)
        self.http.start()
        self.ws.start()
        logging.debug(f"http and websocket server threads started")

        # wait until both servers have been started before returning,
        # so that self.http_port and self.ws_port are known
        if not servers_started.wait(timeout=self.timeout):
            logging.warning(f"server event timeout ({self.timeout}s)")
            if http_started and ws_started:
                logging.warning(f"but http and websocket have started nevertheless; go on")
            else:
                logging.warning(f"???")
                raise Exception(("HTTP Server" if not http_started
                                 else "WebSocket Server" if not ws_started
                                 else "Server") + " launch timeout")

    def stop(self):
        self.stopping = True
        self.http_server.stop()
        self.ws_server.stop()
        self.http.join()
        self.ws.join()

    def get_http_port(self):
        return self.http_port
