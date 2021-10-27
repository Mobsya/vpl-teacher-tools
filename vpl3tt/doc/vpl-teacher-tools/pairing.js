
/**
	@constructor
	@param {Object} options
*/
VPLTeacherTools.Pairing = function (options) {
	this.options = options || {};
	this.robots = [];
	this.classes = [];
	this.groups = [];
	this.pairs = [];
	this.selectedRobot = "";
	/** @type {?number} */
	this.selectedGroupId = null;
	this.groupOfSelectedPair = "";
	this.noRedraw = false;
	this.currentClass = null;

	var self = this;
	this.nonRobots = options && options.nonRobots || [];
	this.nonRobotNameMapping = options && options.nonRobotNameMapping || {};
	this.robotCon = new VPLTeacherTools.RobotConnection({
		method: options.tdmURL ? "tdm" : options.jwsURL ? "jws" : "",
		url: options && (options.tdmURL || options.jwsURL) || null,
		otherRobots: this.nonRobots,
		onChange: function (robotCon) {
			var robots = robotCon.robots;
			robots.forEach(function (r) {
				r.url = options.robotLaunchURL;
			});
			self.robots = robots.slice();
			if (options && options.onRobots) {
				options.onRobots(robots, self);
			}
			if (options && options.onGroups) {
				options.onGroups(self.groups, self);
			}
		}
	});

	var nonGroups = options && options.nonGroups.map(function (name) { return {"name": name}}) || [];
	this.client = new VPLTeacherTools.HTTPClient();
	this.client.onInvalidToken = function () {
		document.getElementById("token-error-msg").style.display = "block";
	};
	this.updateStudents();
	this.updateGroups();
};

VPLTeacherTools.Pairing.prototype.callOnStudents = function () {
	if (this.options.onStudents) {
		this.options.onStudents(this.students
			.filter(function (st) {
				return this.currentClass === null || st["class"] === this.currentClass;
			}, this)
			.map(function (st) {
				return st.name;
			}));
	}
};

VPLTeacherTools.Pairing.prototype.updateStudents = function () {
	var self = this;
	this.client.listStudents(null, {
		onSuccess: function (students) {
			// get list of unique classes
			self.classes = [];
			students.forEach(function (st) {
				var cl = st["class"];
				if (cl && self.classes.indexOf(cl) < 0) {
					self.classes.push(st["class"]);
				}
			});
			self.classes.sort();

			self.students = students;
			if (self.options.onStudents) {
				self.options.onStudents(self.students
					.filter(function (st) {
						return self.currentClass === null || st["class"] === self.currentClass;
					}));
			}
			if (self.options.onClasses) {
				self.options.onClasses(self.classes, self.currentClass);
			}
		}
	});
};

VPLTeacherTools.Pairing.prototype.setClass = function (cl) {
	this.currentClass = cl;
	this.callOnStudents();
};

/** Find the id of the group a student belongs to
	@param {string} studentName
	@return {?string} group name, or null if student isn't found or doesn't belong to a group
*/
VPLTeacherTools.Pairing.prototype.groupForStudent = function (studentName) {
	for (var i = 0; i < this.students.length; i++) {
		if (this.students[i].name === studentName) {
			return this.students[i].group_id;
		}
	}
	return null;
};

/** Find group
	@param {string} groupId
	@return {?Object}
*/
VPLTeacherTools.Pairing.prototype.findGroup = function (groupId) {
	for (var i = 0; i < this.groups.length; i++) {
		if (this.groups[i].group_id === groupId) {
			return this.groups[i];
		}
	}
	return null;
};

VPLTeacherTools.Pairing.prototype.updateGroups = function () {
	var self = this;
	this.client.listGroupsWithStudents(this.currentClass, {
		onSuccess: function (groups) {
			self.groups = groups;
			if (self.options.onGroups) {
				self.options.onGroups(groups, self);
			}
			self.client.listSessions({
				onSuccess: function (pairs) {
					pairs = pairs.map(function (pair) {
						if (!self.isRobot(pair.robot)) {
							pair.robot = self.nonRobotNameMapping[pair.robot] || pair.robot;
						}
						return pair;
					});
					// add pair to group
					pairs.forEach(function (pair) {
						var i = self.groups.findIndex(function (group) {
							return pair.group_id === group.group_id;
						});
						if (i >= 0) {
							self.groups[i].pair = pair;
						}
					});
					self.pairs = pairs;
					if (self.options.onGroups) {
						self.options.onGroups(self.groups, self);
					}
					if (self.options.onRobots) {
						self.options.onRobots(self.robots, self);
					}
				}
			});
		}
	});
};

/** Add a new group with optional initial student and select it
	@param {string} studentName student name
	@return {void}
*/
VPLTeacherTools.Pairing.prototype.addGroup = function (studentName) {
	var self = this;
	this.client.addGroup(studentName, {
		onSuccess: function (r) {
			self.updateGroups();
			self.updateStudents();
			self.selectGroup(r);
		}
	});
};

VPLTeacherTools.Pairing.prototype.removeGroup = function (groupId) {
	var self = this;
	this.client.removeGroup(groupId, {
		onSuccess: function (r) {
			self.updateGroups();
		}
	});
};

/** Add or move a student to a group
	@param {string} studentName student name
	@param {string} groupId group id
	@return {void}
*/
VPLTeacherTools.Pairing.prototype.addStudentToGroup = function (studentName, groupId) {
	var previousGroupId = this.groupForStudent(studentName);
	if (groupId !== previousGroupId) {
		var self = this;
		this.client.addStudentToGroup(studentName, groupId, {
			onSuccess: function (r) {
				self.updateStudents();
				self.updateGroups();
			}
		});
	}
};

/** Remove a student from a group
	@param {string} studentName
	@param {string} groupId
	@return {void}
*/
VPLTeacherTools.Pairing.prototype.removeStudentFromGroup = function (studentName, groupId) {
	var self = this;

	// leave group in local cache to prevent multiple removals
	for (var i = 0; i < this.students.length; i++) {
		if (this.students[i].name === studentName) {
			this.students[i].group_id = null;
			break;
		}
	}

	this.client.removeStudentFromGroup(studentName, groupId, {
		onSuccess: function (r) {
			self.updateStudents();
			self.updateGroups();
		}
	});
};

VPLTeacherTools.Pairing.prototype.getRobotNodes = function () {
	return this.tdm.nodes.filter(function (node) {
		return node.status === window["TDM"].status.ready ||
			node.status === window["TDM"].status.available ||
			node.status === window["TDM"].status.busy;
	});
};

VPLTeacherTools.Pairing.prototype.selectByStudentName = function (studentName) {
	for (var i = 0; i < this.groups.length; i++) {
		if (this.groups[i].students && this.groups[i].students.indexOf(studentName) >= 0) {
			this.selectedGroupId = this.groups[i].group_id;
			return true;
		}
	}
	return false;
};

VPLTeacherTools.Pairing.prototype.findGroupByRobotName = function (robotName) {
	for (var i = 0; i < this.groups.length; i++) {
		if (this.groups[i].pair && this.groups[i].pair.robot === robotName) {
			return this.groups[i];
		}
	}
	return null;
};

VPLTeacherTools.Pairing.prototype.selectByRobotName = function (robotName) {
	var group = this.findGroupByRobotName(robotName);
	if (group) {
		this.selectedGroupId = group.group_id;
		return true;
	}
	return false;
};

VPLTeacherTools.Pairing.prototype.isRobot = function (robotName) {
	robotName = this.nonRobotNameMapping[robotName] || robotName;
	return this.nonRobots.find(function (r) { return r.name === robotName; }) == null;
};

VPLTeacherTools.Pairing.prototype.selectGroup = function (groupId) {
	this.selectedGroupId = groupId;
};

VPLTeacherTools.Pairing.prototype.unselectGroup = function () {
	this.selectedGroupId = null;
};

VPLTeacherTools.Pairing.prototype.isGroupSelected = function (groupId) {
	return this.selectedGroupId === groupId;
};

VPLTeacherTools.Pairing.prototype.getSelectedGroup = function () {
	return this.groups.find(function (group) {
		return group.group_id === this.selectedGroupId;
	}, this);
};

VPLTeacherTools.Pairing.prototype.canBeginSession = function (robotName, groupId) {
	robotName = robotName || this.selectedRobot;
	groupId = groupId || this.selectedGroupId;
	return this.robots.find(function (r) { return r.name === robotName}, this) != undefined &&
		this.groups.find(function (g) { return g.group_id === groupId}, this) != undefined;
};

VPLTeacherTools.Pairing.prototype.deletePairByGroup = function (groupId) {
	var ix = this.pairs.findIndex(function (pair) {
		return pair.group_id === groupId;
	});
	if (ix >= 0) {
		this.pairs.splice(ix, 1);
	}
};

VPLTeacherTools.Pairing.prototype.deletePairBySessionId = function (sessionId) {
	var ix = this.pairs.findIndex(function (pair) {
		return pair.session_id === sessionId;
	});
	if (ix >= 0) {
		if (this.pairs[ix].group_id === this.selectedGroupId) {
			// unselect group to be deleted
			this.unselectGroup();
		}
		var groupIx = this.groups.findIndex(function (group) {
			return group.pair === this.pairs[ix];
		}, this);
		if (groupIx >= 0) {
			this.groups[groupIx].pair = null;
		}
		this.pairs.splice(ix, 1);
	}
};

/** Find short name from non-robot name, or return name as is
	@param {string} robotName
	@return {string}
*/
VPLTeacherTools.Pairing.prototype.shortRobotName = function (robotName) {
	for (var key in this.nonRobotNameMapping) {
		if (this.nonRobotNameMapping.hasOwnProperty(key) &&
			this.nonRobotNameMapping[key] === robotName) {
				return key;
		}
	}
	return robotName;
};

/** Find nice name from the robot name, or return name as is
	@param {string} robotName
	@return {string}
*/
VPLTeacherTools.Pairing.prototype.getRobotNiceName = function (robotName) {
	for (var i = 0; i < this.robots.length; i++) {
		if (this.robots[i].name == robotName) {
			return this.robots[i].niceName;
		}
	}
	return robotName;
};

/** Begin a session by associating a robot with a group
	@param {?string=} robotName robot name (default: selected robot)
	@param {?string=} groupId group id (default: selected group)
	@return {void}
*/
VPLTeacherTools.Pairing.prototype.beginSession = function (robotName, groupId) {
	if (this.canBeginSession(robotName, groupId)) {
		var self = this;
		groupId = groupId || this.selectedGroupId;
		var group = this.getGroup(groupId);
		if (group && group.robot) {
			if (robotName === group.robot) {
				// re-assign same robot
				return;
			}
		}
		this.client.beginSession(groupId,
			this.shortRobotName(robotName || this.selectedRobot),
			false, true,
			{
				onSuccess: function (r) {
					self.selectGroup(groupId);
					self.updateGroups();
					if (self.options && self.options.onRobots) {
						self.options.onRobots(self.robots, self);
					}
				}
			});
	}
};

VPLTeacherTools.Pairing.prototype.getGroup = function (groupId) {
	var group = this.groups.find(function (group) {
		return group.group_id === groupId;
	});
	return group;
};

VPLTeacherTools.Pairing.prototype.getToolURL = function (group, sessionId, robotName) {
	var robotAltName = this.nonRobotNameMapping[robotName];
	var r = this.robots.find(function (robot) {
		return robot.name === robotName || robot.name === robotAltName;
	});
	return r ? r.url(group, sessionId) : null;
};

VPLTeacherTools.Pairing.prototype.endSession = function (sessionId) {
	var self = this;
	this.client.endSession(sessionId, {
		onSuccess: function (r) {
			self.deletePairBySessionId(sessionId);
			if (self.options.onGroups) {
				self.options.onGroups(self.groups, self);
			}
			if (self.options.onRobots) {
				self.options.onRobots(self.robots, self);
			}
		}
	});
};

VPLTeacherTools.Pairing.prototype.autoRobotAssociation = function () {
	for (var i = 0; i < this.groups.length; i++) {
		if (i < this.robots.length && this.robots[i].canFlash()) {
			this.beginSession(this.robots[i].name, this.groups[i].group_id, false, true);
		} else if (this.robots[i].session_id !== null) {
			this.endSession(this.robots[i].session_id);
		}
	}
};

VPLTeacherTools.Pairing.prototype.isAutoRobotAssociationEnabled = function () {
	for (var i = 0; i < this.groups.length; i++) {
		if (i < this.robots.length && this.robots[i].canFlash()) {
			return true;
		}
	}
    return false;
};

VPLTeacherTools.Pairing.prototype.canEndAllSessions = function () {
	return this.pairs.length > 0;
};

VPLTeacherTools.Pairing.prototype.endAllSessions = function () {
	var self = this;
	this.client.endAllSessions(
		{
			onSuccess: function (r) {
				self.pairs = [];
				self.groups.forEach(function (group) {
					group.pair = null;
				});
				if (self.options.onGroups) {
					self.options.onGroups(self.groups, self);
				}
				if (self.options.onRobots) {
					self.options.onRobots(self.robots, self);
				}
			}
		});
};

VPLTeacherTools.Pairing.prototype.getRobot = function (robotName) {
	return this.robots.find(function (r) { return r.name === robotName}, this);
};

VPLTeacherTools.Pairing.prototype.shortenURL = function (url, cb) {
	this.client.shortenURL(url, cb);
};
