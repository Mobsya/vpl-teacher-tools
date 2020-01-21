/*
	Author: Yves Piguet, EPFL
	Please don't redistribute without author's permission.
*/

/** Access to HTTP server as a client
	@constructor
*/
VPLTeacherTools.HTTPClient = function () {
};

/** Send an http request, GET if !data or POST if data
	@param {string} url
	@param {Object=} opt
	@param {string=} data
	@param {string=} dataMimetype
	@return {void}
*/
VPLTeacherTools.HTTPClient.prototype.rest = function (url, opt, data, dataMimetype) {
	if (opt && opt.asBeacon && navigator.sendBeacon) {
		// should be used to send reliably data via post from a beforeunload event listener
		navigator.sendBeacon(url, data || "");
		return;
	}

	var xhr = new XMLHttpRequest();
	if (opt && opt.onSuccess) {
		xhr.addEventListener("load", function () {
			try {
				var msg = JSON.parse(this.responseText);
				if (msg["status"] === "ok") {
					opt.onSuccess(msg["result"]);
				} else if (opt.onError) {
					opt.onError(msg["msg"]);
				}
			} catch (e) {
				if (opt.onError) {
					opt.onError(e.toString());
				} else {
					throw e;
				}
			}
		});
	}
	if (opt && opt.onError) {
		xhr.addEventListener("error", function () {
			opt.onError("Connection");
		});
	}
	xhr.open(data ? "POST" : "GET", url);
	if (dataMimetype) {
		xhr.setRequestHeader("Content-Type", dataMimetype);
	}
	if (opt && opt.logURL) {
		opt.logURL(url);
	}
	xhr.send(data || null);
};

VPLTeacherTools.HTTPClient.prototype.deleteAllStudents = function (opt) {
	this.rest("/api/deleteAllStudents", opt);
};

VPLTeacherTools.HTTPClient.prototype.addStudent = function (name, opt) {
	this.rest("/api/addStudent?student=" + encodeURIComponent(name), opt);
};

VPLTeacherTools.HTTPClient.prototype.addStudents = function (names, opt) {
	this.rest("/api/addStudents?students=" + encodeURIComponent(names.join(",")), opt);
};

VPLTeacherTools.HTTPClient.prototype.removeStudent = function (name, opt) {
	this.rest("/api/removeStudent?student=" + encodeURIComponent(name), opt);
};

VPLTeacherTools.HTTPClient.prototype.listStudents = function (opt) {
	this.rest("/api/listStudents", opt);
};

VPLTeacherTools.HTTPClient.prototype.addGroup = function (student, opt) {
	this.rest("/api/addGroup" + (student ? "?student=" + encodeURIComponent(student) : ""), opt);
};

VPLTeacherTools.HTTPClient.prototype.removeGroup = function (groupId, opt) {
	this.rest("/api/removeGroup?groupid=" + encodeURIComponent(groupId), opt);
};

VPLTeacherTools.HTTPClient.prototype.listGroups = function (opt) {
	this.rest("/api/listGroups", opt);
};

VPLTeacherTools.HTTPClient.prototype.addStudentToGroup = function (student, groupId, opt) {
	this.rest("/api/addStudentToGroup?student=" +
		encodeURIComponent(student) + "&groupid=" + encodeURIComponent(groupId),
		opt);
};

VPLTeacherTools.HTTPClient.prototype.removeStudentFromGroup = function (student, groupId, opt) {
	this.rest("/api/removeStudentFromGroup?student=" +
		encodeURIComponent(student) + "&groupid=" + encodeURIComponent(groupId),
		opt);
};

VPLTeacherTools.HTTPClient.prototype.listGroupStudents = function (groupId, opt) {
	this.rest("/api/listGroupStudents?groupid=" + encodeURIComponent(groupId), opt);
};

VPLTeacherTools.HTTPClient.prototype.listGroupsWithStudents = function (opt) {
	var self = this;
	this.listGroups({
		onSuccess: function (groups) {
			var remaining = groups.length;
			var errMsg = null;
			if (groups.length > 0) {
				groups.forEach(function (group) {
					self.listGroupStudents(group.group_id, {
	                    onSuccess: function (students) {
	                        group.students = students;
							remaining--;
							if (remaining == 0 && opt) {
								if (errMsg != null) {
									opt.onError && opt.onError(errMsg);
								} else {
									opt.onSuccess && opt.onSuccess(groups);
								}
							}
	                    },
						onError: function (msg) {
							remaining--;
							errMsg = msg;
							if (remaining == 0 && opt && opt.onError) {
								opt.onError(msg);
							}
						}
	                });
				});
			} else {
				// must still call onSuccess
				opt && opt.onSuccess && opt.onSuccess(groups);
			}
		},
		onError: opt && opt.onError
	});
};

VPLTeacherTools.HTTPClient.prototype.beginSession = function (groupId, robot, force, opt) {
	var url = "/api/beginSession?groupid=" + encodeURIComponent(groupId);
	if (robot) {
		url += "&robot=" + encodeURIComponent(robot);
	}
	if (force) {
		url += "&force=true";
	}
	this.rest(url, opt);
};

VPLTeacherTools.HTTPClient.prototype.endSession = function (sessionId, opt) {
	this.rest("/api/endSession?session=" + encodeURIComponent(sessionId), opt);
};

VPLTeacherTools.HTTPClient.prototype.endAllSessions = function (opt) {
	this.rest("/api/endAllSessions", opt);
};

VPLTeacherTools.HTTPClient.prototype.listSessions = function (opt) {
	this.rest("/api/listSessions", opt);
};

VPLTeacherTools.HTTPClient.prototype.addFile = function (filename, content, props, opt) {
	this.rest("/api/addFile?filename=" + encodeURIComponent(filename) +
		(props && props.metadata ? "&metadata=" + encodeURIComponent(props.metadata) : ""),
		opt,
		content, "text/plain");
};

VPLTeacherTools.HTTPClient.prototype.copyFile = function (id, filename, props, opt) {
	this.rest("/api/copyFile?id=" + id.toString(10) + "&filename=" + encodeURIComponent(filename) +
		(props && props.mark ? "&mark=true" : "") +
		(props && props.metadata ? "&metadata=" + encodeURIComponent(props.metadata) : ""),
		opt);
};

VPLTeacherTools.HTTPClient.prototype.extractConfigFromVPL3 = function (id, filename, props, opt) {
	this.rest("/api/extractConfigFromVPL3?id=" + id.toString(10) + "&filename=" + encodeURIComponent(filename) +
		(props && props.mark ? "&mark=true" : "") +
		(props && props.metadata ? "&metadata=" + encodeURIComponent(props.metadata) : ""),
		opt);
};

VPLTeacherTools.HTTPClient.prototype.getFile = function (id, opt) {
	this.rest("/api/getFile?id=" + id.toString(10), opt);
};

VPLTeacherTools.HTTPClient.prototype.updateFile = function (id, content, opt) {
	this.rest("/api/updateFile?id=" + id.toString(10), opt,
		content, "text/plain");
};

VPLTeacherTools.HTTPClient.prototype.renameFiles = function (id, newFilename, opt) {
	this.rest("/api/renameFile?id=" + id.toString(10) + "&name=" + encodeURIComponent(newFilename), opt);
};

VPLTeacherTools.HTTPClient.prototype.removeFiles = function (idArray, opt) {
	this.rest("/api/removeFiles?id=" + idArray.map(function (id) { return id.toString(10); }).join("+"), opt);
};

VPLTeacherTools.HTTPClient.prototype.toggleFileMark = function (id, opt) {
	this.rest("/api/markFile?id=" + id.toString(10) + "&action=toggle", opt);
};

VPLTeacherTools.HTTPClient.prototype.setDefaultFile = function (id, suffix, opt) {
	this.rest("/api/setDefaultFile?id=" + id.toString(10) + (suffix ? "&suffix=" + encodeURIComponent(suffix) : ""), opt);
};

VPLTeacherTools.HTTPClient.prototype.listFiles = function (queryProps, opt) {
	var params = [];
	if (queryProps) {
		if (queryProps.filterStudent != null) {
			params.push("student=" + encodeURIComponent(queryProps.filterStudent));
		}
		if (queryProps.last) {
			params.push("last=true");
		}
	}
	this.rest("/api/listFiles" + (params.length > 0 ? "?" + params.join("&") : ""), opt);
};

VPLTeacherTools.HTTPClient.prototype.clearFiles = function (opt) {
	this.rest("/api/clearFiles", opt);
};

VPLTeacherTools.HTTPClient.prototype.getLog = function (sessionId, last, opt) {
	var params = sessionId
		? [
			"id=" + encodeURIComponent(sessionId)
		]
		: [];
	if (last) {
		params.push("last=" + last);
	}
	this.rest("/api/getLog" + "?" + params.join("&"), opt);
};

VPLTeacherTools.HTTPClient.prototype.clearLog = function (opt) {
	this.rest("/api/clearLog", opt);
};

VPLTeacherTools.HTTPClient.prototype.shortenURL = function (url, cb) {
	var xhr = new XMLHttpRequest();
	xhr.addEventListener("load", function () {
		var shortenedURL = this.responseText.trim();
		cb(shortenedURL);
	});
	xhr.open("GET", "/api/shortenURL?u=" + encodeURIComponent(url));
	xhr.send(null);
};
