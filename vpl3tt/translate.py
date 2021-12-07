
# Author: Yves Piguet, EPFL
# Please don't redistribute without author's permission.

# translation support (base class for any language)


class Translate:

    def __init__(self):
        self.dicts = {}
        self.language = "en"
        self.init_default_lang()

    def init_default_lang(self):
        self.dicts["en"] = {
            "Add Default Files": "Add Default Files",
            "Advanced": "Advanced",
            "Advanced Simulator Features": "Advanced Simulator Features",
            "Copy URL": "Copy URL",
            "Developer Tools": "Developer Tools",
            "Edit": "Edit",
            "English": "English",
            "File": "File",
            "French": "French",
            "Italian (English for Teacher Tools)": "Italian (English for Teacher Tools)",
            "JSON WebSocket": "JSON WebSocket",
            "Language": "Language",
            "Log Display in Dashboard": "Log Display in Dashboard",
            "Login Screen QR Code": "Login Screen QR Code",
            "Autonomous Pupil Progress": "Autonomous Pupil Progress",
            "No Robot": "No Robot",
            "Number of connections:": "Number of connections:",
            "Open Tools in Browser": "Open Tools in Browser",
            "Open tools in browser": "Open tools in browser",
            "Options": "Options",
            "Shortened URLs": "Shortened URLs",
            "Thymio Device Manager": "Thymio Device Manager",
            "VPL Server": "VPL Server",
            "help-message": """To open the user interface of the Teacher Tools:
in Firefox, click the button
in another browser, menu Edit > Copy, then paste the URL in the browser
on a tablet, scan the QR code above
""",
            "program.vpl3": "program.vpl3",
        }

    def set_dictionary(self, language, dict):
        self.dicts[language] = dict

    def set_translation(self, language, key, translation):
        if language not in self.dicts:
            self.dicts[language] = {
                key: translation
            }
        else:
            self.dicts[language][key] = translation

    def has_translation(self, language):
        return language in self.dicts

    def set_language(self, language):
        self.language = language

    def tr(self, key):
        return (self.dicts[self.language][key]
                if self.language in self.dicts
                and key in self.dicts[self.language]
                else key)
