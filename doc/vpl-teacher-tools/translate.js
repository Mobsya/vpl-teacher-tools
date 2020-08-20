
VPLTeacherTools.translate = function(str, language) {
	/** @const */
	var en = {
		"Time (d)": "Time"
	};

	/** @const */
	var fr = {
		"add": "ajouter",
		"All files": "Tous les fichiers",
		"All pupils": "Tou.te.s les élèves",
		"Blocks": "Blocs",
		"cancel": "annuler",
		"Cancel": "Annuler",
		"Class": "Classe",
		"Connection": "Connexion",
		"Dashboard": "Tableau de bord",
		"Default": "Défaut",
		"edit": "éditer",
		"error:": "erreur:",
		"Filename": "Fichier",
		"Group": "Groupe",
		"hr": "h",
		"Import Files": "Importer des fichiers",
		"Import Pupil Names": "Importer les noms des élèves",
		"min": "min",
		"pupil local bridge": "passerelle locale",
		"(pupil local bridge)": "(passerelle locale)",
		"Marked": "Marque",
		"Message": "Message",
		"Name": "Nom",
		"no": "non",
		"(none)": "(aucun)",
		"OK": "OK",
		"Program": "Programme",
		"remove": "supprimer",
		"Rows": "Lignes",
		"sec": "s",
		"Set": "Ensemble",
		"simulator": "simulateur",
		"(simulator)": "(simulateur)",
		"Size": "Taille",
		"Students": "Élèves",
		"Submitted": "Soumis",
		"Teacher": "Enseignant.e",
		"Time": "Heure",
		"Time (d)": "Temps",
		"warning:": "remarque:",
		"yes": "oui"
	};

	var dict = {
		"en": en,
		"fr": fr
	};

	var tr = (dict[language || uiLanguage] || {})[str];
	return tr || str;
};

VPLTeacherTools.translateArray = function (a, language) {
	return a.map(function (str) {
		return VPLTeacherTools.translate(str, language);
	});
};
