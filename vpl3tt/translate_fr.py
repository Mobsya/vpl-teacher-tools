
# Author: Yves Piguet, EPFL
# Please don't redistribute without author's permission.

# translation support (base class for any language)


def add_translations_fr(tr):
    dict = {
        "Add Default Files": "Ajouter les fichiers standards",
        "Advanced": "Avancé",
        "Advanced Simulator Features": "Fonctions avancées du simulateur",
        "Copy URL": "Copier l'URL",
        "Developer Tools": "Outils pour les développeurs",
        "Edit": "Édition",
        "English": "Anglais",
        "File": "Fichier",
        "French": "Français",
        "German (English for Teacher Tools)": "Allemand (anglais pour les outils pour les enseignants)",
        "Italian (English for Teacher Tools)": "Italien (anglais pour les outils pour les enseignants)",
        "JSON WebSocket": "WebSocket JSON",
        "Language": "Langue",
        "Log Display in Dashboard": "Journal dans le tableau de bord",
        "Login Screen QR Code": "QR code sur la page de login",
        "Autonomous Pupil Progress": "Progression autonome des élèves",
        "No Robot": "Aucun robot",
        "Number of connections:": "Nombre de connexions:",
        "Number of robots:": "Nombre de robots:",
        "Open Tools in Browser": "Ouvrir les outils dans le navigateur",
        "Open tools in browser": "Ouvrir les outils dans le navigateur",
        "Options": "Options",
        "Quit": "Quitter",
        "Shortened URLs": "URLs raccourcis",
        "TDM not running; please start Thymio Suite": "Veuillez lancer Thymio Suite pour permettre une connexion avec le TDM",
        "Thymio Device Manager": "Thymio Device Manager",
        "VPL Server": "Serveur VPL",
        "help-message": """Pour ouvrir l'interface utilisateur des Outils pour les enseignant.e.s:
dans Firefox, cliquez sur le bouton
dans un autre navigateur, menu Édition > Copier, puis collez l'URL dans le navigateur
sur une tablette, scannez le code QR ci-dessus
""",
        "program.vpl3": "programme.vpl3",
    }
    tr.set_dictionary("fr", dict)
