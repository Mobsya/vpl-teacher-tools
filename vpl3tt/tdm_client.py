
# Author: Yves Piguet, EPFL
# Please don't redistribute without author's permission.

# Communication with TDM (just checking it's there)



class TDMClient:

    def __init__(self, ws=None):
        self.ws = ws or "ws://127.0.0.1:8597"

        import re
        r = re.match("ws://(.*):([\d]+)(/.*)?$", self.ws)
        if r is None:
            # invalid self.ws
            raise Exception(f"invalid websocket address {self.ws}")
        self.host = r.group(1)
        self.port = int(r.group(2))

    def check_connection(self):
        import socket

        try:
            socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            socket.connect((self.host, self.port))
            socket.close()
        except Exception as e:
            return False
        return True

    def check_connection_with_ws(self):
        import websocket
        try:
            ws = websocket.create_connection(self.ws)
            ws.close()
        except ConnectionRefusedError:
            return False
        return True
