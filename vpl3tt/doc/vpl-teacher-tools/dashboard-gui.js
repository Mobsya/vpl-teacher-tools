var dashboard = null;

/**
	@param {string} id
	@return {Element}
*/
function clearChildren(id) {
	var el = document.getElementById(id);
	while (el.firstElementChild) {
		el.removeChild(el.firstElementChild);
	}
	return el;
}

/**
	@param {string} id
	@param {Array.<Array.<string>>=} labels
	@param {Array.<string>=} colClasses
	@return {Element}
*/
function clearTable(id, labels, colClasses) {
	var table = clearChildren(id);
	if (colClasses) {
		var colgroup = document.createElement("colgroup");
		for (var i = 0; i < (labels ? labels[0].length : colClasses.length); i++) {
			var col = document.createElement("col");
			if (i < colClasses.length) {
				col.className = colClasses[i];
			}
			colgroup.appendChild(col);
		}
		table.appendChild(colgroup);
	}
	if (labels) {
		labels.forEach(function (labelRow) {
			var tr = document.createElement("tr");
			labelRow.forEach(function (label, i) {
				if (label !== "<") {
					// "<" are merged to a single colspan
					var th = document.createElement("th");
					th.textContent = label;
					if (labelRow[i + 1] === "<") {
						var colSpan = 1;
						while (labelRow[i + colSpan] === "<") {
							colSpan++;
						}
						th.setAttribute("colspan", colSpan.toString(10));
					}
					tr.appendChild(th);
				}
			});
			table.appendChild(tr);
		});
	}
	return table;
}

function fillGroupTable(sessionArray, dashboard) {
	clearTable("groups", dashboard.options.showTags
		? [
			VPLTeacherTools.translateArray(["", "Connection", "<", "Time (d)", "Filename", "", "Tag", "Program", "<", "Message"]),
			VPLTeacherTools.translateArray(["", "Teacher", "Robot", "", "", "", "", "Rows", "Blocks", ""])
		]
		: [
			VPLTeacherTools.translateArray(["", "Connection", "<", "Time (d)", "Filename", "", "Program", "<", "Message"]),
			VPLTeacherTools.translateArray(["", "Teacher", "Robot", "", "", "", "Rows", "Blocks", ""])
		]);
	var table = document.getElementById("groups");

	sessionArray.forEach(function (session) {
		function select() {
			dashboard.selectGroup(session, null);
			fillGroupTable(sessionArray, dashboard);
		}

		var tr = document.createElement("tr");

		// group
		var td = document.createElement("td");
		td.textContent = session.students ? session.students.join(", ") : session.group;
		td.addEventListener("click", select);
		td.className = dashboard.isGroupSelected(session) ? "rect selected" : "rect";
		tr.appendChild(td);

		// connection to teacher (VPL server)
		td = document.createElement("td");
		td.textContent = VPLTeacherTools.translate(session.isConnected ? "yes" : "no");
		tr.appendChild(td);

		if (session.lastVPLChangedLogEntry != null) {
			var lastVPLChangedData = JSON.parse(session.lastVPLChangedLogEntry["data"]);

			// connection to robot
			td = document.createElement("td");
			if (session.isConnected) {
				td.textContent = VPLTeacherTools.translate(lastVPLChangedData["robot"] ? "yes" : "no");
			}
			tr.appendChild(td);

			// elapsed time
			td = document.createElement("td");
			var datetime = session.lastVPLChangedLogEntry["time"].split(" ");
			var ymd = datetime[0].split("-").map(function (str) { return parseInt(str, 10); });;
			var hms = datetime[1].split(":").map(function (str) { return parseInt(str, 10); });
			var dateLogEntry = new Date(ymd[0], ymd[1] - 1, ymd[2], hms[0], hms[1], hms[2]);
			var now = new Date();
			var elapsedSec = (now - dateLogEntry) / 1000;
			var elapsedStr = elapsedSec < 120 ? (elapsedSec < 10 ? "1" : Math.floor(elapsedSec / 10).toFixed(0) + "0") + " " + VPLTeacherTools.translate("sec")
				: elapsedSec < 7200 ? Math.floor(elapsedSec / 60).toString(10) + " " + VPLTeacherTools.translate("min")
				: elapsedSec < 172800 ? Math.floor(elapsedSec / 3600).toString(10) + " " + VPLTeacherTools.translate("hr")
				: Math.floor(elapsedSec / 86400).toString(10) + " d";
			td.textContent = elapsedStr;
			tr.appendChild(td);

			// program
			var details = [];
			if (lastVPLChangedData && lastVPLChangedData["nrules"] != undefined) {
				// filename
				td = document.createElement("td");
				var tag = "";
				if (lastVPLChangedData["filename"]) {
					var btn = document.createElement("button");
					var filename = lastVPLChangedData["filename"];
					var filenameParts = filename.split("/");
					if (filenameParts.length > 1) {
						tag = filenameParts[0];
						filename = filenameParts[filenameParts.length - 1];
					}
					btn.textContent = filename;
					btn.addEventListener("click", function () {
						dashboard.openLastFile(session.group_id,
							session.students ? session.students.join(", ") : session.group);
					}, false);
					td.appendChild(btn);
				}
				tr.appendChild(td);

				// submitted
				td = document.createElement("td");
				td.textContent = lastVPLChangedData["uploadedToServer"] ? "\u2713" : "";
				tr.appendChild(td);

				// tag
				if (dashboard.options.showTags) {
					td = document.createElement("td");
					td.textContent = tag;
					tr.appendChild(td);
				}

				details = [
					lastVPLChangedData["nrules"].toString(10),
					lastVPLChangedData["nblocks"].toString(10)
				];
			} else {
				details = ["", "", ""];
			}

			if (lastVPLChangedData["error-tr"]) {
				details.push(VPLTeacherTools.translate("error:") + " " + lastVPLChangedData["error-tr"]);
			} else if (lastVPLChangedData["warning-tr"]) {
				details.push(VPLTeacherTools.translate("warning:") + " " + lastVPLChangedData["warning-tr"]);
			}
			details.forEach(function (str) {
				td = document.createElement("td");
				td.textContent = str;
				tr.appendChild(td);
			});
		}

		table.appendChild(tr);
	});
}

function fillFileTable(fileArray, dashboard) {
	clearTable("files-dashboard", [
		VPLTeacherTools.translateArray(dashboard.options.showTags
			? ["", "Filename", "Tag", "Default"]
			: ["", "Filename", "Default"])
	]);
	var table = document.getElementById("files-dashboard");

	if (fileArray.length === 0) {
		var tr = document.createElement("tr");
		var td = document.createElement("td");
		td.textContent = "(none)";
		tr.appendChild(td);
		table.appendChild(tr);
		return;
	}

	fileArray.forEach(function (file) {
		var tr = document.createElement("tr");

		// icon
		var td = document.createElement("td");
		var fileIconURL = VPLTeacherTools.FileBrowser.getFileIconURL(file.filename);
		if (fileIconURL) {
			var img = document.createElement("img");
			img.src = fileIconURL;
			td.appendChild(img);
			if (file.files) {
				td.addEventListener("click", function () {
					dashboard.toggleExpand(file);
				}, false);
			}
		}
		tr.appendChild(td);

		// filename
		td = document.createElement("td");
		if (file.zipbundle && file.files == undefined) {
			td.textContent = "\u00a0\u00a0" + file.filename;
			td.style.fontStyle = "italic";
		} else {
			td.textContent = file.filename;
		}
		if (file.files) {
			td.addEventListener("click", function () {
				dashboard.toggleExpand(file);
			}, false);
		}
		tr.appendChild(td);

		// tag
		if (dashboard.options.showTags) {
			td = document.createElement("td");
			td.textContent = file.tag;
			tr.appendChild(td);
		}

		// default checkbox
		td = document.createElement("td");
		if (/\.vpl3$/.test(file.filename)) {
			td.textContent = file["default"] ? "\u2612" : "\u2610";
			td.addEventListener("click", function () {
				dashboard.setDefaultProgram(file.id);
			}, false);
		}
		tr.appendChild(td);

		// button to send file to students
		td = document.createElement("td");
		var btn = document.createElement("button");
		btn.textContent = "\u2197";
		btn.addEventListener("click", function () {
			if (file.zipbundle) {
				if (file.files != undefined) {
					// multiple files in a bundle
					for (var i = 0; i < file.files.length; i++) {
						dashboard.sendZipBundleEntry(file.zipbundle, file.files[i]);
					}
				} else {
					// file in a bundle
					dashboard.sendZipBundleEntry(file.zipbundle, file.filename);
				}
			} else {
				dashboard.sendFileById(file.id);
			}
		}, false);
		td.appendChild(btn);
		tr.appendChild(td);

		table.appendChild(tr);
	});
}

function fillAttentionTable(fileArray, dashboard) {
	var selAttention = document.getElementById("suspended-zip");
	while (selAttention.firstElementChild) {
		selAttention.removeChild(selAttention.firstElementChild);
	}
	fileArray.forEach(function (file, i) {
		var option = document.createElement("option");
		option.zipbundle = file.zipbundle;
		option.textContent = file.filename;
		option.selected = i === 0;
		selAttention.appendChild(option);
	});
	if (fileArray.length > 0) {
		document.getElementById("suspended-kind-zip").disabled = false;
		document.getElementById("suspended-kind-zip").checked = true;
		document.getElementById("suspended-zip").disabled = false;
		document.getElementById("suspended-kind-text").checked = false;
		document.getElementById("suspended-kind-file").checked = false;
	} else {
		document.getElementById("suspended-kind-zip").disabled = true;
		document.getElementById("suspended-zip").disabled = true;
	}
}

window.addEventListener("load", function () {
	var sessions = null;
	if (!$LOGDISPLAY) {
		document.getElementById("divlog").style.display = "none";
	}
	dashboard = new VPLTeacherTools.Dashboard("ws://" + document.location.hostname + ":$TTSERVERWSPORT/", {
		log: $LOGDISPLAY
			? function (str) {
				document.getElementById("log").textContent += str + "\n";
			}
			: function (str) {},
		onGroups: function (newSessions) {
			sessions = newSessions;
			fillGroupTable(sessions, dashboard);
		},
		onFiles: function (fileArray) {
			fillFileTable(fileArray, dashboard);
		},
		onAttentionFiles: function (fileArray) {
			fillAttentionTable(fileArray, dashboard);
		},
		onOpen: function (file, readOnly) {
			var teacherFile = !file.owner || file.owner.length == 0;
			var options = {
				"initialFileName": file.filename,
				"fileId": teacherFile ? file.id : null,
				"readOnly": readOnly,
				"customizationMode": /\.vpl3ui/.test(file.filename)
			};
			window.sessionStorage.setItem("options", JSON.stringify(options));
			window.sessionStorage.setItem("initialFileContent", file.content);
			document.location = "vpl$LANGSUFFIX.html?robot=sim&uilanguage=$LANGUAGE" +
				(teacherFile ? "&role=teacher" : "") +
				(file.students ? "&user=" + encodeURIComponent(file.students.join(", ")) : "");
		}
	});
	setInterval(function () {
		if (sessions) {
			fillGroupTable(sessions, dashboard);
		}
	}, 5000);
	dashboard.onConnectionStateChanged = function (state) {
		document.getElementById("disconnected-msg").style.display = state ? "none" : "block";
	};
	dashboard.connect();

	[
		// "vpl:stop-abnormally"
	].forEach(function (name) {
		document.getElementById(name).addEventListener("click", function () {
			dashboard.sendCommand(name);
		}, false);
	});

	document.getElementById("suspended").addEventListener("change", function () {

		function suspendWithText(str) {
			dashboard.setSuspendHTML("<div style='display: table; height: 100%; width: 100%; overflow: hidden;'>" +
				"<div style='display: table-cell; vertical-align: middle;'>" +
					"<p style='text-align: center;'>" +
						str +
					"</p>" +
				"</div>" +
			"</div>");
		}

		if (this.checked) {
			if (document.getElementById("suspended-kind-zip").checked) {
				var selAttention = document.getElementById("suspended-zip");
				var zipbundle = selAttention.options[selAttention.selectedIndex].zipbundle;
				var path = selAttention.options[selAttention.selectedIndex].value;
				var suffix = VPLTeacherTools.FileBrowser.getFileSuffix(path).toLowerCase();
				var isHTML = ["htm", "html"].indexOf(suffix) >= 0;
				var isMD = suffix === "md";
				zipbundle.getFile(path, !isHTML && !isMD, (data) => {
					if (isMD) {
						dashboard.setSuspendHTML(window["vplConvertMDToHtml"](data));
					} else if (isHTML) {
						dashboard.setSuspendHTML(data);
					} else {
						dashboard.setSuspendFile(path, data);
					}
				});
				dashboard.suspend(true);
			} else if (document.getElementById("suspended-kind-text").checked) {
				suspendWithText(document.getElementById("suspended-text").value);
				dashboard.suspend(true);
			} else if (document.getElementById("suspended-kind-file").checked) {
				var files = document.getElementById("suspended-file").files;
				if (files.length === 1) {
					var reader = new window.FileReader();
					reader.addEventListener("load", function (event) {
						dashboard.setSuspendFile(files[0].name, btoa(event.target.result));
						dashboard.suspend(true);
					});
					reader["readAsBinaryString"](files[0]);
				}
			}
		} else {
			dashboard.suspend(false);
		}
	});
	document.getElementById("suspended-text").addEventListener("change", function () {
		if (document.getElementById("suspended").checked && document.getElementById("suspended-kind-text").checked) {
			dashboard.setSuspendHTML("<div style='display: table; height: 100%; width: 100%; overflow: hidden;'>" +
				"<div style='display: table-cell; vertical-align: middle;'>" +
					"<p style='text-align: center;'>" +
						document.getElementById("suspended-text").value +
					"</p>" +
				"</div>" +
			"</div>");
			dashboard.suspend(true);
		}
	});
	document.getElementById("suspended-file").addEventListener("input", function () {
		if (document.getElementById("suspended").checked && document.getElementById("suspended-kind-file").checked) {
			var files = document.getElementById("suspended-file").files;
			if (files.length === 1) {
				var reader = new window.FileReader();
				reader.addEventListener("load", function (event) {
					dashboard.setSuspendFile(files[0].name, btoa(event.target.result));
					dashboard.suspend(true);
				});
				reader["readAsBinaryString"](files[0]);
			}
			dashboard.suspend(true);
		}
	});

	function changeVolume() {
		var volumeVal = document.getElementById("volume").checked
			? parseInt(document.getElementById("volume-value").value, 10)
			: null;
		document.getElementById("volume-value").disabled = volumeVal === null;
		document.getElementById("volume-muted").style.display = volumeVal === 0 ? "inline" : "none";
		dashboard.setVolume(volumeVal);
	}
	document.getElementById("volume").addEventListener("change", changeVolume);
	document.getElementById("volume-value").addEventListener("change", changeVolume);

	document.getElementById("clear-log").addEventListener("click", function () {
		document.getElementById("log").textContent = "";
	}, false);

	var divcontrol = document.getElementById("divcontrol");
	divcontrol.addEventListener("dragover", function (ev) {
		ev.preventDefault();
	}, false);
	divcontrol.addEventListener("drop", function (ev) {
		ev.stopPropagation();
		ev.preventDefault();
		var files = ev.dataTransfer.files;
		if (files.length === 1) {
			document.getElementById("suspended-file").files = files;
			document.getElementById("suspended-kind-file").checked = true;
		}
	}, false);
}, false);
