function clearChildren(id) {
	var el = document.getElementById(id);
	while (el.firstElementChild) {
		el.removeChild(el.firstElementChild);
	}
}

/*
Drag-and-drop data:
"S/" + student name: item in the pupil table (to add to a group)
"G/" + student name: item in the group table (to move to another group or remove)
"R/" + robot name: item in the robot table (to add to a group to make an association)
*/

function fillRobotTable(robotArray, pairing) {
	clearChildren("robots");
	var table = document.getElementById("robots");

	function addRow(robotName, flashFunction, flashFunctionDisabled) {
		var tr = document.createElement("tr");

		var td = document.createElement("td");
		td.textContent = flashFunction ? "Thymio II" : robotName;
		td.addEventListener("click", function () {
			if (pairing.selectByRobotName(robotName)) {
				pairing.updateGroups();
			}
		});
		td.className = "rect";

		// drag robot name
		td.draggable = true;
		td.addEventListener("dragstart", function (ev) {
			ev.dataTransfer.setData("text/plain", "R/" + robotName);
			ev.dataTransfer.setDragImage(tr.getElementsByTagName("td")[0], 0, 0);
			ev.dataTransfer.effectAllowed = "copy";
		});

		tr.appendChild(td);

		td = document.createElement("td");
		td.textContent = flashFunction && pairing.findGroupByRobotName(robotName) ? "\u2713" : "";	// checkmark
		tr.appendChild(td);

		td = document.createElement("td");
		if (flashFunction) {
			var btn = document.createElement("button");
			btn.textContent = "flash";
			btn.disabled = flashFunctionDisabled;
			btn.addEventListener("mousedown", function () { flashFunction(true); }, false);
			btn.addEventListener("mouseup", function () { flashFunction(false); }, false);
			td.appendChild(btn);
		}
		tr.appendChild(td);

		table.appendChild(tr);
	}

	robotArray.forEach(function (robot) {
		addRow(robot.name, robot.flash, !robot.canFlash);
	});
}

function fillStudentTable(studentArray, pairing) {
	clearChildren("students");
	var table = document.getElementById("students");

	function addRow(studentName, groupId) {

		var tr = document.createElement("tr");

		// drag student name
		tr.draggable = true;
		tr.addEventListener("dragstart", function (ev) {
			ev.dataTransfer.setData("text/plain", "S/" + studentName);
			ev.dataTransfer.setDragImage(tr.getElementsByTagName("td")[0], 0, 0);
			ev.dataTransfer.effectAllowed = "copy";
		});

		var td = document.createElement("td");
		td.textContent = studentName;
		td.className = "rect";
		td.addEventListener("click", function () {
			if (pairing.selectByStudentName(studentName)) {
				pairing.updateGroups();
			}
		}, false);
		tr.appendChild(td);

		td = document.createElement("td");
		td.textContent = groupId ? "\u2713" : "";	// checkmark
		tr.appendChild(td);

		table.appendChild(tr);
	}

    if (studentArray.length > 0) {
        studentArray.forEach(function (student) {
            addRow(student.name, student.group_id);
        });
        document.getElementById("student-help").style.display = "block";
        document.getElementById("nostudent-help").style.display = "none";
    } else {
        document.getElementById("student-help").style.display = "none";
        document.getElementById("nostudent-help").style.display = "block";
    }
}

function fillGroupTable(groupArray, pairing) {

	function checkDragType(ev) {
		if (ev.dataTransfer.types.includes("text/plain")) {
			ev.preventDefault();
			return false;
		}
		return true;
	}

	clearChildren("groups");
	var table = document.getElementById("groups");

	groupArray.forEach(function (group) {
		function select() {
			pairing.selectGroup(group.group_id);
			fillGroupTable(groupArray, pairing);
		}

		if (group.students && group.students.length > 0) {
			var tr = document.createElement("tr");

			var td = document.createElement("td");
			td.className = pairing.isGroupSelected(group.group_id) ? "rect selected" : "rect";
			group.students.forEach(function (studentName, i) {
				var span = document.createElement("span");
				span.className = "rect";
				span.textContent = studentName;

				// drag student name
				span.draggable = true;
				span.addEventListener("dragstart", function (ev) {
					ev.dataTransfer.setData("text/plain", "G/" + studentName);
					ev.dataTransfer.effectAllowed = "move";
				});

				td.appendChild(span);
			});
			td.addEventListener("click", select);

			// drop student or robot name
			tr.addEventListener("dragenter", checkDragType);
			tr.addEventListener("dragover", checkDragType);
			tr.addEventListener("drop", function (ev) {
				ev.stopPropagation();
				ev.preventDefault();
				var data = ev.dataTransfer.getData("text/plain");
				if (data && /^[SG]\//.test(data)) {
					ev.stopPropagation();
					var studentName = data.slice(2);
					pairing.addStudentToGroup(studentName, group.group_id, true);
				} else if (data && /^R\//.test(data)) {
					ev.stopPropagation();
					var robotName = data.slice(2);
					pairing.beginSession(robotName, group.group_id);
				}
			});

			tr.appendChild(td);

			if (group.pair) {
				td = document.createElement("td");
				td.className = pairing.isGroupSelected(group.group_id) ? "rect selected" : "rect";
				td.textContent = (/^\{/.test(group.pair.robot) ? "Thymio II" : group.pair.robot.replace(/[()]/g, "")) + " ";
				var rmBtn = document.createElement("span");
				rmBtn.textContent = "\u2716";	// heavy multiplication mark
				rmBtn.style.cursor = "pointer";
				rmBtn.addEventListener("click", function (ev) {
					ev.stopPropagation();
					pairing.endSession(group.pair.session_id);
				}, false);
				td.appendChild(rmBtn);
				td.addEventListener("click", select);
				tr.appendChild(td);

				var robot = pairing.getRobot(group.pair.robot);
				if (robot && robot.flash) {
					td = document.createElement("td");
					var btn = document.createElement("button");
					btn.textContent = "flash";
					btn.disabled = !robot.canFlash;
					btn.addEventListener("mousedown", function () { robot.flash(true); }, false);
					btn.addEventListener("mouseup", function () { robot.flash(false); }, false);
					td.appendChild(btn);
					tr.appendChild(td);
				}
			}

			table.appendChild(tr);
		}
	});

	// row to create new group
	var tr = document.createElement("tr");
	var td = document.createElement("td");
	td.className = "rect";
	td.textContent = "\u00a0";

	// drop student name
	tr.addEventListener("dragenter", checkDragType);
	tr.addEventListener("dragover", checkDragType);
	tr.addEventListener("drop", function (ev) {
		ev.stopPropagation();
		ev.preventDefault();
		var data = ev.dataTransfer.getData("text/plain");
		if (data && /^[SG]\//.test(data)) {
			var studentName = data.slice(2);
			pairing.addGroup(studentName);
		}
	}, false);

	tr.appendChild(td);
	table.appendChild(tr);

	// drop student name outside a group -> delete
	var body = document.body;
	body.addEventListener("dragenter", checkDragType);
	body.addEventListener("dragover", checkDragType);
	body.addEventListener("drop", function (ev) {
		ev.stopPropagation();
		ev.preventDefault();
		var studentName = ev.dataTransfer.getData("text/plain");
		if (studentName.slice(0, 2) === "G/") {
			studentName = studentName.slice(2);
			var groupId = pairing.groupForStudent(studentName);
			if (groupId) {
				pairing.removeStudentFromGroup(studentName, groupId, true);
				pairing.selectGroup(groupId);
			}
		}
	}, false);

	clearChildren("info");
	var selectedGroup = pairing.getSelectedGroup();
	if (selectedGroup && selectedGroup.robot) {
		var div = document.createElement("div");
		var p = document.createElement("p");
		var groupDescr = selectedGroup.students.length > 0
			? selectedGroup.students.join(", ")
			: selectedGroup.group_id;
		p.textContent = VPLTeacherTools.translate("Group") + ": " + groupDescr;
		div.appendChild(p);
		var p = document.createElement("p");
		p.style.overflowWrap = "break-word";
		var a = document.createElement("a");
		a.setAttribute("class", "url");
		var toolURL = VPLTeacherTools.makeVPLURL(selectedGroup);
		var url = document.location.origin + toolURL;
		a.textContent = url;
		a.setAttribute("href", url);
		a.setAttribute("target", "_blank");
		a.setAttribute("rel", "noopener");
		p.appendChild(a);
		div.appendChild(p);
		if (toolURL && window.QRCode) {
			var qrdiv = document.createElement("div");
			div.appendChild(qrdiv);
			var minViewportSize = window.visualViewport ?
				Math.min(window.visualViewport.width,
					window.visualViewport.height)
				: document.documentElement.clientWidth ?
				Math.min(document.documentElement.clientWidth,
					document.documentElement.clientHeight)
				: window.innerWidth ?
				Math.min(window.innerWidth, window.innerHeight)
				: 200;
			var size = Math.min(Math.floor(minViewportSize * 0.8), 200);
			var qrcode = new window.QRCode(qrdiv,
				{
					text: url,
					width: size,
					height: size,
					correctLevel: QRCode.CorrectLevel.L
				});
			pairing.shortenURL(url, function (shortenedURL) {
				a.textContent = shortenedURL;
				a.setAttribute("href", shortenedURL);
				while (qrdiv.firstElementChild) {
					qrdiv.removeChild(qrdiv.firstElementChild);
				}
				qrcode = new window.QRCode(qrdiv,
					{
						text: shortenedURL,
						width: size,
						height: size,
						correctLevel: QRCode.CorrectLevel.L
					});
			});
		} else {
			pairing.shortenURL(url, function (shortenedURL) {
				a.textContent = shortenedURL;
			});
		}
		document.getElementById("info").appendChild(div);
	}
}

window.addEventListener("load", function () {
	var tdmURL = VPLTeacherTools.getHashOption("w") || "ws://" + document.location.hostname + ":8597/";
	var url0 = "/vpl/vpl.html?ui=ui/classic/ui.json&uilanguage=$LANGUAGE&server=ws://" + document.location.hostname + ":8001/";
	var pairing = new VPLTeacherTools.Pairing({
		tdmURL: tdmURL,
		onRobots: function (robotArray, pairing) {
    		fillRobotTable(robotArray, pairing);
		},
		robot: {
			name: function (nodeId) {
				return nodeId;
			},
			url: function (group) {
				return url0 + "&robot=thymio-tdm&session=" + group.pair.session_id +
					(group.students ? "&user=" + encodeURIComponent(group.students.join(", ")) : "") +
					"#w=" + tdmURL + "&uuid=" + group.pair.robot;
			}
		},
		nonRobots: [
			{
				name: function () {
					return VPLTeacherTools.translate("(simulator)");
				},
				url: function (group, sessionId) {
					// set user to comma-separated users if they exist
					return url0 + "&robot=sim&session=" + sessionId +
						(group.students ? "&user=" + encodeURIComponent(group.students.join(", ")) : "");
				}
			},
			{
				name: function () {
					return VPLTeacherTools.translate("(local bridge)");
				},
				url: function (group, sessionId) {
					// set user to comma-separated users if they exist
					return url0 + "&robot=thymio&session=" + sessionId +
						(group.students ? "&user=" + encodeURIComponent(group.students.join(", ")) : "");
				}
			}
		],
		nonRobotNameMapping: {
			"!sim": VPLTeacherTools.translate("(simulator)"),
			"!thymio": VPLTeacherTools.translate("(local bridge)")
		},
		onStudents: function (studentArray) {
    		fillStudentTable(studentArray, pairing);
		},
		onGroups: function (groupArray) {
			fillGroupTable(groupArray, pairing);
		},
		nonGroups: [
			"(teacher)"
		]
	});

	var urlLogin = document.location.href.replace(/^(.*\/\/[^\/]*)\/.*$/, "$1");
	var aLogin = document.getElementById("login");
	aLogin.textContent = urlLogin;
	aLogin.href = urlLogin;

}, false);
