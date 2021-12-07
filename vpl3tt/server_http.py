#!/usr/bin/python3

# Author: Yves Piguet, EPFL
# Please don't redistribute without author's permission.

import urllib
from vpl3tt.com_http \
    import (
        HTTPServerWithContext, HTTPRequestHandler
    )
import json
import urllib

from vpl3tt.db import Db
from vpl3tt.urlutil import URLUtil
from vpl3tt.urltiny import URLShortcuts
from vpl3tt.datapath import DataPath

import sys
import os
import getopt
import json


class VPLHTTPRequestHandler(HTTPRequestHandler):

    def __init__(self, request, client_address, server):
        HTTPRequestHandler.__init__(self, request, client_address, server)

    def map_path(self, path):
        if self.server.context.language in self.server.context.tr_mappings and path in self.server.context.tr_mappings[self.server.context.language]:
            return self.server.context.tr_mappings[self.server.context.language][path]
        else:
            return path


class VPLHTTPServer:

    DEFAULT_PORT = HTTPServerWithContext.DEFAULT_PORT
    SHORTENED_URL_PREFIX = "/vv"
    TR_MAPPINGS_JSON = os.path.join(HTTPRequestHandler.DOC_ROOT, "tr-mappings.json")

    def __init__(self,
                 db_path=Db.DEFAULT_PATH,
                 http_port=None,
                 ws_port=None,
                 token=None,
                 tt_language=None,
                 language=None,
                 full_url=False,
                 has_login_qr_code=False,
                 autonomous_student_progress=True,
                 log_display=False,
                 advanced_sim_features=False,
                 dev_tools=False,
                 bridge="tdm",
                 logger=None,
                 session_id_getter=None,
                 server_ws=None):
        self.http_port = http_port
        self.ws_port = ws_port
        self.token = token
        self.language = language
        self.tt_language = tt_language
        self.full_url = full_url
        self.has_login_qr_code = has_login_qr_code
        self.autonomous_student_progress = autonomous_student_progress
        self.log_display = log_display
        self.advanced_sim_features = advanced_sim_features
        self.dev_tools = dev_tools
        self.bridge = bridge  # "tdm" or "jws" or "none"
        self.session_id_getter = session_id_getter
        self.vpl_ui_uri = "ui/svg/ui.json"
        self.db_path = db_path
        self.db = Db(self.db_path)
        self.handler = VPLHTTPRequestHandler
        self.url_shortcuts = URLShortcuts(length=3)
        self.load_tr_mappings()
        self.server_ws = server_ws
        self.httpd = HTTPServerWithContext(context=self,
                                           port=http_port, logger=logger)

        def check_token(fn):

            def fn_with_validation(self, handler):
                q = VPLHTTPServer.query_param(handler)
                token = q["token"][0] if "token" in q else ""
                if self.token and self.token != token:
                    if logger is not None:
                        logger(f"Bad token ({token} instead of {self.token})" if self.token else "No token")
                    return {
                        "mime": "application/json",
                        "data": json.dumps({
                            "status": "err",
                            "invalid_token": True,
                            "msg": "Invalid token"
                        }, indent=4)
                    }
                return fn(self, handler)

            return fn_with_validation

        @self.httpd.http_get("/")
        def http_get_root(self, handler):
            return {
                "location": "/index.html"
            }

        @self.httpd.http_get("/api/check")
        @check_token
        def http_check(self, handler):
            return {
                "mime": "application/json",
                "data": json.dumps(None)
            }

        @self.httpd.http_get("/api/groups")
        @check_token
        def http_get_groups(self, handler):
            return {
                "mime": "application/json",
                "data": json.dumps(self.groups, indent=4)
            }

        @self.httpd.http_get("/api/pairing")
        @check_token
        def http_get_pairing(self, handler):
            return {
                "mime": "application/json",
                "data": json.dumps(None)
            }

        @self.httpd.http_get("/api/deleteAllStudents")
        @check_token
        def http_get_api_deleteAllStudents(self, handler):
            return self.call_api(Db.delete_all_students)

        @self.httpd.http_get("/api/addStudent")
        @check_token
        def http_get_api_addStudent(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "student" not in q:
                return VPLHTTPServer.error("Missing student name")
            return self.call_api(Db.add_student,
                q["student"][0],
                q["class"][0] if "class" in q else None)

        @self.httpd.http_get("/api/addStudents")
        @check_token
        def http_get_api_addStudents(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "students" not in q:
                return VPLHTTPServer.error("Missing student names")
            name_list = list(q["students"][0].split(","))
            class_list = list(q["classes"][0].split(",")) if "classes" in q else None
            return self.call_api(Db.add_students, name_list, class_list)

        @self.httpd.http_get("/api/removeStudent")
        @check_token
        def http_get_api_removeStudent(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "student" not in q:
                return VPLHTTPServer.error("Missing student name")
            return self.call_api(Db.remove_student, q["student"][0])

        @self.httpd.http_get("/api/updateStudent")
        @check_token
        def http_get_api_updateStudent(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "student" not in q:
                return VPLHTTPServer.error("Missing student name")
            student = q["student"][0]
            new_name = q["newName"][0] if "newName" in q else student
            if "class" in q:
                return self.call_api(Db.update_student, student, new_name, q["class"][0])
            else:
                return self.call_api(Db.rename_student, student, new_name)

        @self.httpd.http_get("/api/listStudents")
        @check_token
        def http_get_api_listStudents(self, handler):
            q = VPLHTTPServer.query_param(handler)
            return self.call_api(Db.list_students,
                                 q["class"][0] if "class" in q else None)

        @self.httpd.http_get("/api/listClasses")
        @check_token
        def http_get_api_listClasses(self, handler):
            return self.call_api(Db.list_classes)

        @self.httpd.http_get("/api/addGroup")
        @check_token
        def http_get_api_addGroup(self, handler):
            q = VPLHTTPServer.query_param(handler)
            student_name = q["student"][0] if "student" in q else None
            return self.call_api(Db.add_group, student_name)

        @self.httpd.http_get("/api/removeGroup")
        @check_token
        def http_get_api_removeGroup(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "groupid" not in q:
                return VPLHTTPServer.error("Missing group id")
            return self.call_api(Db.remove_group, q["groupid"][0])

        @self.httpd.http_get("/api/listGroups")
        def http_get_api_listGroups(self, handler):
            q = VPLHTTPServer.query_param(handler)
            return self.call_api(Db.list_groups,
                                 q["class"][0] if "class" in q else None)

        @self.httpd.http_get("/api/addStudentToGroup")
        @check_token
        def http_get_api_addStudentToGroup(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "student" not in q:
                return VPLHTTPServer.error("Missing student name")
            if "groupid" not in q:
                return VPLHTTPServer.error("Missing group id")
            return self.call_api(Db.add_student_to_group,
                                 q["student"][0], q["groupid"][0])

        @self.httpd.http_get("/api/removeStudentFromGroup")
        @check_token
        def http_get_api_removeStudentFromGroup(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "student" not in q:
                return VPLHTTPServer.error("Missing student name")
            return self.call_api(Db.remove_student_from_group,
                                 q["student"][0])

        @self.httpd.http_get("/api/listGroupStudents")
        def http_get_api_listGroupStudents(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "groupid" not in q:
                return VPLHTTPServer.error("Missing group id")
            return self.call_api(Db.list_group_students,
                                 q["groupid"][0])

        @self.httpd.http_get("/api/beginSession")
        @check_token
        def http_get_api_beginSession(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "groupid" not in q:
                return VPLHTTPServer.error("Missing group id")
            group_id = q["groupid"][0]
            robot = q["robot"][0] if "robot" in q else None
            force = "force" in q and q["force"][0] == "true"
            update = "update" in q and q["update"][0] == "true"

            # check if session already exists with a different robot
            current_robot = self.db.get_session_robot(group_id)
            if current_robot is not None and current_robot != robot:
                # yes, notify vpl app
                if self.server_ws is not None:
                    # assume tdm
                    robot_descr = {
                        "robot": "thymio-tdm",
                        # "url": unspecified, keep same
                        "uuid": robot,
                    }
                    session_id = self.db.get_session_id(group_id)
                    if session_id is not None:
                        self.server_ws.schedule_send_message_threadsafe("robot", robot_descr,
                                                                        only_websockets={session_id})

            return self.call_api(Db.begin_session,
                                 group_id, robot, force=force, update=update)

        @self.httpd.http_get("/api/endSession")
        @check_token
        def http_get_api_endSession(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "session" not in q:
                return VPLHTTPServer.error("Missing session")
            return self.call_api(Db.end_session,
                                 q["session"][0])

        @self.httpd.http_get("/api/endAllSessions")
        @check_token
        def http_get_api_endAllSessions(self, handler):
            return self.call_api(Db.end_all_sessions)

        @self.httpd.http_get("/api/listSessions")
        def http_get_api_listSessions(self, handler):

            def process(result):
                # add field "is_connected" which is True if session has ws
                session_ids = self.session_id_getter() if self.session_id_getter is not None else set()
                return [
                    {
                        **session,
                        "is_connected": session["session_id"] in session_ids
                    }
                    for session in result
                ]

            r = self.call_api(Db.list_sessions, process=process)
            return r

        @self.httpd.http_post("/api/addFile")
        @check_token
        def http_post_api_addFile(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "filename" not in q:
                return VPLHTTPServer.error("Missing filename")
            content = VPLHTTPServer.get_data(handler)
            return self.call_api(Db.add_file,
                                 q["filename"][0],
                                 q["tag"][0] if "tag" in q else "",
                                 content,
                                 q["groupid"][0] if "groupid" in q else None,
                                 metadata = q["metadata"][0]
                                            if "metadata" in q
                                            else None)

        @self.httpd.http_get("/api/copyFile")
        @check_token
        def http_get_api_copyFile(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "id" not in q:
                return VPLHTTPServer.error("Missing id")
            if "filename" not in q:
                return VPLHTTPServer.error("Missing filename")
            return self.call_api(Db.copy_file,
                                 int(q["id"][0]),
                                 q["filename"][0],
                                 q["tag"][0] if "tag" in q else "",
                                 mark=q["mark"][0].lower() == "true"
                                      if "mark" in q
                                      else False,
                                 metadata=q["metadata"][0]
                                          if "metadata" in q
                                          else None)

        @self.httpd.http_get("/api/extractConfigFromVPL3")
        @check_token
        def http_get_api_extractConfigFromVPL3(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "id" not in q:
                return VPLHTTPServer.error("Missing id")
            if "filename" not in q:
                return VPLHTTPServer.error("Missing filename")
            return self.call_api(Db.extract_config_from_vpl3_file,
                                 int(q["id"][0]),
                                 q["filename"][0],
                                 q["tag"][0] if "tag" in q else "",
                                 mark=q["mark"][0].lower() == "true"
                                      if "mark" in q
                                      else False,
                                 metadata=q["metadata"][0]
                                          if "metadata" in q
                                          else None)

        @self.httpd.http_get("/api/getFile")
        @check_token
        def http_get_api_getFile(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "id" not in q:
                return VPLHTTPServer.error("Missing id")
            return self.call_api(Db.get_file, int(q["id"][0]))

        @self.httpd.http_get("/api/getFiles")
        @check_token
        def http_get_api_getFiles(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "id" not in q:
                return VPLHTTPServer.error("Missing id")
            idList = list(map(int, q["id"][0].split(" ")))
            return self.call_api(Db.get_files, idList)

        @self.httpd.http_get("/api/getLastFileForGroup")
        @check_token
        def http_get_api_getLastFileForGroup(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "groupid" not in q:
                return VPLHTTPServer.error("Missing group id")
            return self.call_api(Db.get_last_file_for_group, q["groupid"][0])

        @self.httpd.http_post("/api/updateFile")
        @check_token
        def http_post_api_updateFile(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "id" not in q:
                return VPLHTTPServer.error("Missing id")
            content = VPLHTTPServer.get_data(handler)
            return self.call_api(Db.update_file,
                                 int(q["id"][0]), content)

        @self.httpd.http_get("/api/renameFile")
        @check_token
        def http_get_api_renameFile(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "id" not in q:
                return VPLHTTPServer.error("Missing id")
            if "name" not in q:
                return VPLHTTPServer.error("Missing name")
            return self.call_api(Db.rename_file,
                                 int(q["id"][0]), q["name"][0])

        @self.httpd.http_get("/api/setFileTag")
        @check_token
        def http_get_api_setFileTag(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "id" not in q:
                return VPLHTTPServer.error("Missing id")
            if "tag" not in q:
                return VPLHTTPServer.error("Missing tag")
            return self.call_api(Db.set_file_tag,
                                 int(q["id"][0]), q["tag"][0])

        @self.httpd.http_get("/api/markFile")
        @check_token
        def http_get_api_markFile(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "id" not in q:
                return VPLHTTPServer.error("Missing id")
            if "action" not in q:
                action = "set"
            else:
                action = q["action"][0]
            if action == "set" or action == "clear":
                return self.call_api(Db.mark_file,
                                     int(q["id"][0]), action == "set")
            elif action == "toggle":
                return self.call_api(Db.toggle_file_mark,
                                     int(q["id"][0]))

        @self.httpd.http_get("/api/setDefaultFile")
        @check_token
        def http_set_default_file(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "id" not in q:
                return VPLHTTPServer.error("Missing id")
            suffix = q["suffix"][0] if "suffix" in q else None
            return self.call_api(Db.set_default_file, int(q["id"][0]), suffix)

        @self.httpd.http_get("/api/removeFiles")
        @check_token
        def http_get_api_removeFiles(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "id" not in q:
                return VPLHTTPServer.error("Missing id")
            idList = list(map(int, q["id"][0].split(" ")))
            return self.call_api(Db.remove_files, idList)

        @self.httpd.http_get("/api/listFiles")
        @check_token
        def http_get_api_listFiles(self, handler):
            q = VPLHTTPServer.query_param(handler)
            student = q["student"][0] if "student" in q else None
            tag = q["tag"][0] if "tag" in q else None
            last = q["last"][0].lower() == "true" if "last" in q else False
            get_zip = q["getzip"][0].lower() == "true" if "getzip" in q else False
            return self.call_api(Db.list_files,
                                 student=student,
                                 tag=tag,
                                 last=last,
                                 get_zip=get_zip)

        @self.httpd.http_get("/api/listFileTags")
        @check_token
        def http_get_api_listFileTags(self, handler):
            return self.call_api(Db.list_file_tags)

        @self.httpd.http_get("/api/clearFiles")
        @check_token
        def http_get_api_clearFiles(self, handler):
            return self.call_api(Db.clear_files)

        @self.httpd.http_get("/api/getLog")
        @check_token
        def http_get_api_getLog(self, handler):
            q = VPLHTTPServer.query_param(handler)
            id = q["id"][0] if "id" in q else None
            last = q["last"][0] if "last" in q else None
            return self.call_api(Db.get_log, session_id=id, last_of_type=last)

        @self.httpd.http_get("/api/clearLog")
        @check_token
        def http_get_api_clearLog(self, handler):
            return self.call_api(Db.clear_log)

        @self.httpd.http_get("/api/shortenURL")
        @check_token
        def http_get_api_shortenURL(self, handler):
            q = VPLHTTPServer.query_param(handler)
            if "u" in q:
                return {
                    "mime": "text/plain",
                    "data": f"http://{URLUtil.get_local_IP()}:{self.get_port()}{VPLHTTPServer.SHORTENED_URL_PREFIX}{self.url_shortcuts.add(q['u'][0])}\n"
                }
            else:
                return VPLHTTPServer.error("missing url")

        @self.httpd.http_get_any()
        def http_get_shortenedURL(path, self, handler):
            if path.startswith(VPLHTTPServer.SHORTENED_URL_PREFIX):
                key = path[3:]
                url = self.url_shortcuts.get(key)
                if url is not None:
                    return {
                        "location": url
                    }
                else:
                    return VPLHTTPServer.error("unknown shortcut")

        self.httpd.add_filter(lambda s: s.replace(b"$LANGUAGE",
                                                  bytes(self.tt_language, "utf-8") if self.tt_language else b"en"),
                              r"^/vpl-teacher-tools/.*\.(html|css|json|js)$")
        self.httpd.add_filter(lambda s: s.replace(b"$VPLLANGUAGE",
                                                  bytes(self.language, "utf-8") if self.language else b"en"),
                              r"^/.*\.(html|css|json|js)$")
        self.httpd.add_filter(lambda s: s.replace(b"$LANGSUFFIX",
                                                  bytes("." + self.tt_language, "utf-8")
                                                      if self.tt_language and self.tt_language != "en"
                                                      else b""),
                              r"^/.*\.(html|js)$")
        self.httpd.add_filter(lambda s: s.replace(b"$BRIDGE",
                                                  bytes(self.bridge, "utf-8")),
                              r"^/.*\.(html|css|json|js)$")
        self.httpd.add_filter(lambda s: s.replace(b"$SHORTENURL", b"false" if self.full_url else b"true"),
                              r"^/vpl-teacher-tools/.*\.(html|css|json|js)$")
        self.httpd.add_filter(lambda s: s.replace(b"$LOGINQRCODE", b"true" if self.has_login_qr_code else b"false"),
                              r"^/vpl-teacher-tools/.*\.(html|css|json|js)$")
        self.httpd.add_filter(lambda s: s.replace(b"$AUTONOMOUSSTUDENTPROGRESS", b"true" if self.autonomous_student_progress else b"false"),
                              r"^/.*\.(html|css|json|js)$")
        self.httpd.add_filter(lambda s: s.replace(b"$LOGDISPLAY", b"true"  if self.log_display else b"false"),
                              r"^/vpl-teacher-tools/.*\.(html|css|json|js)$")
        self.httpd.add_filter(lambda s: s.replace(b"$ADVANCEDSIMFEATURES", b"true"  if self.advanced_sim_features else b"false"),
                              r"^/vpl-teacher-tools/.*\.(html|css|json|js)$")
        self.httpd.add_filter(lambda s: s.replace(b"$DEVTOOLSTYLE", b"block" if self.dev_tools else b"none"),
                              r"^/vpl-teacher-tools/.*\.(html|css)$")
        self.httpd.add_filter(lambda s: s.replace(b"$VPLUIURI", bytes(self.vpl_ui_uri, "utf-8")))
        self.httpd.add_filter(lambda s: s.replace(b"$TTSERVERWSPORT", bytes(str(self.ws_port), "utf-8")))
        self.groups = []

    def load_tr_mappings(self):
        with open(DataPath.path(self.TR_MAPPINGS_JSON), "rb") as file:
            self.tr_mappings = json.load(file)

    def set_server_ws(self, server_ws):
        self.server_ws = server_ws

    def run(self):
        self.httpd.serve_forever()

    def stop(self):
        self.httpd.shutdown()

    def get_port(self):
        return self.httpd.get_port()

    def query_param(handler):
        p = urllib.parse.urlparse(handler.path)
        q = urllib.parse.parse_qs(p.query, keep_blank_values=True)
        return q

    def get_data(handler, text=True):
        content_length = int(handler.headers['Content-Length'])
        post_data = handler.rfile.read(content_length)
        return post_data.decode("utf-8") if text else post_data

    def error(msg):
        return {
            "mime": "application/json",
            "data": json.dumps({
                "status": "err",
                "msg": msg
            }, indent=4)
        }

    def call_api(self, fun, *args, process=None, **kwargs):
        try:
            result = fun(self.db, *args, **kwargs)
            return {
                "mime": "application/json",
                "data": json.dumps({
                    "status": "ok",
                    "result": process(result) if process is not None else result,
                }, indent=4)
            }
        except ValueError as ve:
            return VPLHTTPServer.error(ve.args[0])


if __name__ == "__main__":
    port = VPLHTTPServer.DEFAULT_PORT
    ws_port = VPLWebSocketServer.DEFAULT_PORT
    try:
        arguments, values = getopt.getopt(sys.argv[1:],
                                          "", ["help", "port=", "wsport=", "link="])
    except getopt.error as err:
        print(str(err))
        sys.exit(1)
    for arg, val in arguments:
        if arg == "--help":
            print(f"""Usage: {sys.argv[0]} options
VPL 3 teacher tools http server

Options:
  --help       display help message and exit
  --port num   http server port number (default: {VPLHTTPServer.DEFAULT_PORT})
  --wsport num server websocket port number (default: {VPLWebSocketServer.DEFAULT_PORT})
            """)
            sys.exit(0)
        elif arg == "--port":
            port = int(val)
        elif arg == "--wsport":
            ws_port = int(val)

    server = VPLHTTPServer.create(http_port=port, ws_port=ws_port, logger=print)
    server.run()
