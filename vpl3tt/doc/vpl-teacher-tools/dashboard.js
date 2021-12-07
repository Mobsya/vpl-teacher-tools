
/**
	@constructor
	@param {string} wsURL
	@param {{
		log: (function(string):void | undefined),
		onGroups: (function(Array.<Object>):void | undefined),
		onFiles: (function(Array.<Object>):void | undefined),
		onAttentionFiles: (function(Array.<Object>):void | undefined),
		onOpen: (function(Object,boolean):void | undefined),
		showTags: (boolean | undefined)
	}} options
*/
VPLTeacherTools.Dashboard = function (wsURL, options) {
	this.wsURL = wsURL;
	/** @type {WebSocket} */
	this.ws = null;
	this.wasConnected = false;
	/** @type {?function(boolean):void} */
	this.onConnectionStateChanged = null;
	var self = this;
	this.reconnectId = setInterval(function () {
		if (self.ws != null && self.ws.readyState >= 2) {
			// closing or closed websocket:
			// notify once
			if (self.onConnectionStateChanged && self.wasConnected) {
				self.onConnectionStateChanged(false);
			}
			self.wasConnected = false;
			// try to reconnect every 3 s
			self.connect();
		}
	}, 3000);

	this.options = options;

	this.sessions = [];
	this.wsConnections = [];

	this.client = new VPLTeacherTools.HTTPClient();
	this.client.onInvalidToken = function () {
		document.getElementById("token-error-msg").style.display = "block";
	};
	this.loadSessions();
	this.updateFiles();

	this.suspendFile = null;

	/** @type {Array.<string>} */
	this.expandedBundles = [];

	window.addEventListener("unload", function () {
		if (self.ws) {
			self.ws.addEventListener("open", function () {
				this.send(JSON.stringify({
					"sender": {
						"type": "dashboard"
					},
					"type": "bye"
				}));
			});
		}
	});
};

/** Check if websocket connection is open
	@return {boolean}
*/
VPLTeacherTools.Dashboard.prototype.isConnected = function () {
	return this.ws != null && this.ws.readyState == 1;
};

/** Refresh sessions by calling onGroups
	@param {Array=} sessions session array (default: this.sessions)
	@return {void}
*/
VPLTeacherTools.Dashboard.prototype.refreshSessions = function (sessions) {
	if (this.options.onGroups) {
		this.options.onGroups((sessions || this.sessions)
			.filter(function (session) {
				return !session.special && session.students.length > 0;
			})
			.map(function (session) {
				session.isConnected = this.wsConnections.indexOf(session.session_id) >= 0;
				return session;
			}, this));
	}
};

/** Load the list of sessions
	@return {void}
*/
VPLTeacherTools.Dashboard.prototype.loadSessions = function () {
	var self = this;
	this.client.listSessions({
		onSuccess: function (sessions) {
			self.sessions = sessions.map(function (session) {
				session.students = [];
				session.lastVPLChangedLogEntry = null;
				session.selected = false;

				self.client.listGroupStudents(session.group_id, {
					onSuccess: function (students) {
						session.students = students;
						self.refreshSessions(sessions);
					}
				});

				self.client.getLog(session.session_id, "vpl-changed", {
					onSuccess: function (logEntries) {
						if (logEntries.length > 0) {
							session.lastVPLChangedLogEntry = logEntries[0];
							self.refreshSessions(sessions);
						}
					}
				});

				return session;
			});
			self.refreshSessions();
		}
	});
};

/** Update the list of session using the last log message received
	@param {number} sessionIndex
	@param {Object} msg
	@return {void}
*/
VPLTeacherTools.Dashboard.prototype.updateSessions = function (sessionIndex, msg) {
	function datetimeStr(d) {
		function s(num, len) {
			var str = num.toString(10);
			return "0000".slice(0, len - str.length) + str;
		}
		return s(d.getFullYear(), 4) + "-" + s(d.getMonth() + 1, 2) + "-" + s(d.getDate(), 2) +
			" " + s(d.getHours(), 2) + ":" + s(d.getMinutes(), 2) + ":" + s(d.getSeconds(), 2);
	}

	if (msg["type"] === "log" && msg["data"]["type"] === "vpl-changed") {
		this.sessions[sessionIndex].lastVPLChangedLogEntry = {
			"time": datetimeStr(new Date()),
			"type": "vpl-changed",
			"data": JSON.stringify(msg["data"]["data"])
		};
		this.refreshSessions();
	}
};

VPLTeacherTools.Dashboard.prototype.updateFiles = function () {
	var self = this;
	this.client.listFiles({
		filterStudent: this.filterStudent,
		filterGroup: this.filterGroup,
		last: this.filterLast,
		getZip: true
	},
	{
		onSuccess: function (files) {
			var bundles = files.filter(function (file) {
				return file.mark && /\.zip$/i.test(file.filename);
			});
			files = files.filter(function (file) {
				return file.mark && /\.(vpl3(ui)?|txt|aseba|html|jpg|md|png|svg)$/i.test(file.filename);
			});
			var attentionFiles = [];
			bundles.forEach(function (bundle) {
				var zipbundle = new VPLTeacherTools.ZipBundle();
				zipbundle.load(atob(bundle.content), () => {
					// find files to send when the bundle itself is sent
					var filesToSend = [];
					function addFirstFileWithType(type) {
						for (var i = 0; i < zipbundle.toc.length; i++) {
							var path = zipbundle.toc[i];
							if (zipbundle.getType(path) === type) {
								filesToSend.push(path);
								break;
							}
						}
					}
					addFirstFileWithType(VPLTeacherTools.ZipBundle.Manifest.File.Type.ui);
					addFirstFileWithType(VPLTeacherTools.ZipBundle.Manifest.File.Type.vpl3);
					addFirstFileWithType(VPLTeacherTools.ZipBundle.Manifest.File.Type.statement);
					addFirstFileWithType(VPLTeacherTools.ZipBundle.Manifest.File.Type.doc);
					if (filesToSend.length === 0) {
						addFirstFileWithType(VPLTeacherTools.ZipBundle.Manifest.File.Type.program);
					}

					// add bundle
					bundle.zipbundle = zipbundle;
					bundle.files = filesToSend;
					files.push(bundle);

					// add bundle files
					if (self.expandedBundles.indexOf(bundle.filename) >= 0) {
						for (var i = 0; i < zipbundle.toc.length; i++) {
							var path = zipbundle.toc[i];
							if ([
									VPLTeacherTools.ZipBundle.Manifest.File.Type.vpl3,
									VPLTeacherTools.ZipBundle.Manifest.File.Type.ui,
									VPLTeacherTools.ZipBundle.Manifest.File.Type.program,
									VPLTeacherTools.ZipBundle.Manifest.File.Type.doc,
									VPLTeacherTools.ZipBundle.Manifest.File.Type.statement
								].indexOf(zipbundle.getType(path)) >= 0) {
								files.push({
									zipbundle: zipbundle,
									filename: path,
									tag: zipbundle["tag"],
									"default": false
								});
							}
							if (zipbundle.getType(path) === VPLTeacherTools.ZipBundle.Manifest.File.Type.attention) {
								attentionFiles.push({
									zipbundle: zipbundle,
									filename: path,
									tag: zipbundle["tag"],
									"default": false
								});
							}
						}
					}
					// update asynchronously
					if (self.options.onFiles) {
						self.options.onFiles(files);
					}
					if (self.options.onAttentionFiles) {
						self.options.onAttentionFiles(attentionFiles);
					}
				});
			});
			self.files = files.map(function (file) {
				var file1 = Object.create(file);	// prototype-based "copy"
				file1.selected = false;
				return file1;
			});
			if (self.options.onFiles) {
				self.options.onFiles(files);
			}
		}
	});
};

VPLTeacherTools.Dashboard.prototype.toggleExpand = function (file) {
	var filename = file.filename;
	var ix = this.expandedBundles.indexOf(filename);
	if (ix >= 0) {
		this.expandedBundles.splice(ix, 1);
	} else {
		this.expandedBundles.push(filename);
	}
	this.updateFiles();
};

VPLTeacherTools.Dashboard.prototype.openLastFile = function (group_id, group) {
	this.client.getLastFileForGroup(group_id, {
		onSuccess: function (file) {
			var options = {
				"initialFileName": file.filename,
				"fileId": null,
				"readOnly": true,
				"customizationMode": false
			};
			window.sessionStorage.setItem("options", JSON.stringify(options));
			window.sessionStorage.setItem("initialFileContent", file.content);
			document.location = "vpl$LANGSUFFIX.html?ui=$VPLUIURI&robot=sim&uilanguage=$LANGUAGE" +
				(group ? "&user=" + encodeURIComponent(group) : "");
		}
	});
};

VPLTeacherTools.Dashboard.prototype.setDefaultProgram = function (fileId) {
	var self = this;
	this.client.setDefaultFile(fileId, "vpl3", {
		onSuccess: function () {
			self.updateFiles();
		}
	});
};

/** Get the index of a session specified by its id
	@param {string} sessionId
	@return {number}
*/
VPLTeacherTools.Dashboard.prototype.sessionIndex = function (sessionId) {
	return this.sessions.findIndex(function (session) { return session.session_id === sessionId; });
};

/** Select, unselect or toggle group
	@param {?boolean} state
	@return {void}
*/
VPLTeacherTools.Dashboard.prototype.selectGroup = function (session, state) {
	session.selected = state === null ? !session.selected : state;
};

VPLTeacherTools.Dashboard.prototype.isGroupSelected = function (session) {
	return session.selected;
};

VPLTeacherTools.Dashboard.prototype.getIdOfSelectedSessions = function () {
	return this.sessions
		.filter(function (session) { return session.selected; })
		.map(function (session) { return session.session_id; });
};

/** Send a command to selected sessions, if any, or to all
	@param {string} name
	@param {{
		toAll: (boolean | undefined),
		selected: (boolean | undefined),
		state: (string | undefined)
	}=} opt
	@return {void}
*/
VPLTeacherTools.Dashboard.prototype.sendCommand = function (name, opt) {
	var sessions = opt && opt.toAll ? [] : this.getIdOfSelectedSessions();
	var msg = {
		"sender": {
			"type": "dashboard"
		},
		"rcpt": sessions.length > 0 ? sessions : null,
		"type": "cmd",
		"data": {
			"cmd": name
		}
	};
	if (opt && opt.selected !== undefined) {
		msg["data"]["selected"] = opt.selected;
	}
	if (opt && opt.state) {
		msg["data"]["state"] = opt.state;
	}
	this.ws.send(JSON.stringify(msg));
};

/** Send a file
	@param {string} filename
	@param {string} kind "vpl" | "help" | "statement" | "suspend"
	@param {string} content
	@param {boolean=} isBase64
	@return {void}
*/
VPLTeacherTools.Dashboard.prototype.sendFile = function (filename, kind, content, isBase64) {
	var msg = {
		"sender": {
			"type": "dashboard"
		},
		"rcpt": null,
		"type": "file",
		"data": {
			"name": filename,
			"kind": kind,
			"metadata": {},
			"content": content,
			"base64": isBase64 || false
		}
	};
	this.ws.send(JSON.stringify(msg));
};

/** Send a file
	@param {number} fileId
	@return {void}
*/
VPLTeacherTools.Dashboard.prototype.sendFileById = function (fileId) {
	var self = this;
	this.client.getFile(fileId, {
		onSuccess: function (file) {
			var filename = file.filename;
			if (file.tag) {
				filename = file.tag + "/" + filename;
			}
			var suffix = VPLTeacherTools.FileBrowser.getFileSuffix(filename).toLowerCase();
			var kind = {
				"aseba": "aseba",
				"html": "statement",
				"jpg": "statement",
				"md": "statement",
				"png": "statement",
				"svg": "statement",
				"txt": "statement",
				"vpl3": "vpl",
				"vpl3ui": "vpl"
			}[suffix] || "other";
			var isBase64 = VPLTeacherTools.FileBrowser.storeAsBase64(filename);
			self.sendFile(filename, kind, file.content, isBase64);
		}
	});
};

/** Send a zipbundle entry
	@param {VPLTeacherTools.ZipBundle} zipbundle
	@param {string} path
	@return {void}
*/
VPLTeacherTools.Dashboard.prototype.sendZipBundleEntry = function (zipbundle, path) {
	var self = this;
	var suffix = VPLTeacherTools.FileBrowser.getFileSuffix(path).toLowerCase();
	var asBase64 = ["jpg", "pdf", "png"].indexOf(suffix) >= 0;
	zipbundle.getFile(path, asBase64, (data) => {
		var manifestType = zipbundle.getType(path);
		var kind = {
			"vpl": "vpl",
			"ui": "vpl",
			"program": "aseba",
			"doc": "help",
			"statement": "statement",
			"attention": "suspend"
		}[VPLTeacherTools.ZipBundle.Manifest.typeToString(manifestType)] || "other";
		self.sendFile(path, kind, /** @type {string} */(data), asBase64);
	});
};

/** Set the file to be displayed in suspended mode
	@param {string} html
	@return {void}
*/
VPLTeacherTools.Dashboard.prototype.setSuspendHTML = function (html) {
	this.suspendFile = {
		filename: "suspend.html",
		content: html,
		base64: false
	};
};

/** Set the text to be displayed in suspended mode
	@param {string} filename
	@param {string} contentBase64
	@return {void}
*/
VPLTeacherTools.Dashboard.prototype.setSuspendFile = function (filename, contentBase64) {
	this.suspendFile = {
		filename: filename,
		content: contentBase64,
		base64: true
	};
};

/** Suspend (selected) or unsuspend (all) VPL web apps
	@param {boolean} state
	@return {void}
*/
VPLTeacherTools.Dashboard.prototype.suspend = function (state) {
	if (this.suspendFile && state) {
		this.sendFile(this.suspendFile.filename, "suspend", this.suspendFile.content, this.suspendFile.base64);
	}
	this.sendCommand("vpl:suspend", {selected: state, toAll: !state});
};

/** Change the volume value applied to the Thymio
	@param {?number} volume null to keep current volume, 0 to mute, or 1-8
	@return {void}
*/
VPLTeacherTools.Dashboard.prototype.setVolume = function (volume) {
	var settingsJSON = JSON.stringify({
		"volume": volume
	});
	this.sendFile("settings.json", "settings", settingsJSON, false);
};

/** Start websocket
	@return {void}
*/
VPLTeacherTools.Dashboard.prototype.connect = function () {
	this.ws = new WebSocket(this.wsURL);
	var self = this;
	this.ws.addEventListener("message", function (event) {
		try {
			var msg = /** @type {Object} */(JSON.parse(event.data));
			switch (msg["type"]) {
			case "hello":
			case "change":
				self.wsConnections = msg["data"];
				self.refreshSessions();
				break;
			case "log":
				if (self.options.log) {
					var sessionId = msg["sender"]["sessionid"] || "-";
					var i = self.sessionIndex(sessionId);
					var session = i >= 0 ? self.sessions[i] : null;
					if (!session || session.special !== "!teacher") {
						self.options.log(sessionId +
							(session && session.students && session.students.length > 0 ? " (" + session.students.join(", ") + ")"
	 							: "") +
							"  " +
							JSON.stringify(msg["data"]));
					}
					if (session) {
						self.updateSessions(i, msg);
					}
				}
				break;
			}
		} catch (e) {
			console.info(e);
		}
	});
	this.ws.addEventListener("open", function () {
		if (self.onConnectionStateChanged) {
			self.onConnectionStateChanged(true);
		}
		self.wasConnected = true;
		this.send(JSON.stringify({
			"sender": {
				"type": "dashboard"
			},
			"type": "hello"
		}));
	});
};
