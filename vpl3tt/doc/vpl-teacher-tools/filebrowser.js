
/**
	@constructor
	@param {VPLTeacherTools.FileBrowser.Options=} options
*/
VPLTeacherTools.FileBrowser = function (options) {
	this.teacherFiles = [];
	this.studentFiles = [];
	this.classes = [];
	this.students = [];
	this.currentClass = null;
	this.options = options || {};
	this.filterTeacherSet = "";
	this.filterStudent = null;
	this.filterStudentLast = true;
	this.filterStudentSet = "";
	this.client = new VPLTeacherTools.HTTPClient();
	this.client.onInvalidToken = function () {
		document.getElementById("token-error-msg").style.display = "block";
	};
	this.updateFiles();
	this.updateStudents();
};

/**
	@typedef {{
		onSets: (function (*):void | undefined)
	}}
*/
VPLTeacherTools.FileBrowser.Options;

/** Fetch all files from db and refresh their display
	@param {{
		renamedFileId: (number | undefined),
		selectedFileIds: (Array.<number> | undefined)
	}=} opt
	(renamedFileId: id of the file to rename; or selectedFileIds: list of files to select)
*/
VPLTeacherTools.FileBrowser.prototype.updateFiles = function (opt) {
	var self = this;

	// teacher files
	this.client.listFiles({
		last: true,
		filterTag: this.filterTeacherSet || null
	},
	{
		onSuccess: function (files) {
			self.teacherFiles = files.map(function (file) {
				var file1 = Object.create(file);	// prototype-based "copy"
				if (opt && opt.renamedFileId != undefined) {
					file1.selected = file.id === opt.renamedFileId;
					file1.renamed = file.id === opt.renamedFileId;
				} else if (opt && opt.selectedFileIds != undefined) {
					file1.selected = opt.selectedFileIds.indexOf(file.id) >= 0;
					file1.renamed = false;
				} else {
					file1.selected = false;
					file1.renamed = false;
				}
				file1.moved = false;
				return file1;
			});
			if (self.options.onTeacherFiles) {
				self.options.onTeacherFiles(self.teacherFiles, self);
			}
		}
	});
	this.client.listFiles({
		filterStudent: this.filterStudent || "*",
		last: this.filterStudentLast,
		filterTag: this.filterStudentSet || null
	},
	{
		onSuccess: function (files) {
			self.studentFiles = files.map(function (file) {
				var file1 = Object.create(file);	// prototype-based "copy"
				file1.selected = false;
				return file1;
			});
			if (self.options.onStudentFiles) {
				self.options.onStudentFiles(files, self);
			}
		}
	});

	// sets
	if (this.options.onSets) {
		this.client.listFileTags({
			onSuccess: function (tags) {
				self.options.onSets(tags);
			}
		});
	}
};

VPLTeacherTools.FileBrowser.prototype.refreshFiles = function () {
	if (this.options.onTeacherFiles) {
		this.options.onTeacherFiles(this.teacherFiles, this);
	}
	if (this.options.onStudentFiles) {
		this.options.onStudentFiles(this.studentFiles, this);
	}
};

VPLTeacherTools.FileBrowser.prototype.fileIdToIndex = function (isStudentFile, fileId) {
	return (isStudentFile ? this.studentFiles : this.teacherFiles)
		.findIndex(function (file) { return file.id === fileId; });
};

VPLTeacherTools.FileBrowser.prototype.selectFile = function (isStudentFile, fileId, toggleKey, extendKey) {
	var ix = this.fileIdToIndex(isStudentFile, fileId);
	if (ix < 0) {
		return;
	}
	this.unselectFile(!isStudentFile);
	var files = isStudentFile ? this.studentFiles : this.teacherFiles;
	if (toggleKey) {
		if (ix >= 0) {
			files[ix].selected = !files[ix].selected;
		}
	} else if (extendKey) {
		if (!files[ix].selected) {
			// not already selected
			var state = 1;
				// 1=before first selected, 2=after first selected, 3=after clicked item before 1st selected
			for (var i = 0; i < files.length; i++) {
				if (files[i].id === fileId) {
					if (state === 1) {
						if (files[i].selected) {
							break;  // extend by clicking first selected file: no op
						}
						// start selecting until first already selected
						state = 3;
						files[i].selected = true;
					} else if (state === 2) {
						files[i].selected = true;
						break;
					}
				} else if (state === 2) {
					files[i].selected = true;
				} else if (state === 3) {
					if (files[i].selected) {
						break;  // stop extending
					}
					files[i].selected = true;
				} else if (files[i].selected) {
					state = 2;
				}
			}
		}
	} else {
		for (var i = 0; i < files.length; i++) {
			files[i].selected = i === ix;
		}
	}
};

VPLTeacherTools.FileBrowser.prototype.unselectFile = function (isStudentFile) {
	var files = isStudentFile ? this.studentFiles : this.teacherFiles;
	for (var i = 0; i < files.length; i++) {
		files[i].selected = false;
	}
};

VPLTeacherTools.FileBrowser.prototype.selectFiles = function (selectedFileIds) {
	this.teacherFiles.forEach((file) => {
		file.selected = selectedFileIds.indexOf(file.id) >= 0;
	});
	this.studentFiles.forEach((file) => {
		file.selected = selectedFileIds.indexOf(file.id) >= 0;
	});
};

VPLTeacherTools.FileBrowser.prototype.isFileSelected = function (isStudentFile, fileId) {
	var ix = this.fileIdToIndex(isStudentFile, fileId);
	return ix >= 0 && (isStudentFile ? this.studentFiles : this.teacherFiles)[ix].selected;
};

VPLTeacherTools.FileBrowser.prototype.countSelectedFiles = function (isStudentFile) {
	return (isStudentFile ? this.studentFiles : this.teacherFiles)
		.reduce(function (acc, val) { return val.selected ? acc + 1 : acc; }, 0);
};

VPLTeacherTools.FileBrowser.prototype.countSelectedNotRenamedFiles = function () {
	return this.teacherFiles
		.reduce(function (acc, val) { return val.selected && !val.renamed && !val.moved ? acc + 1 : acc; }, 0);
};

VPLTeacherTools.FileBrowser.prototype.toggleMark = function (fileId) {
	var self = this;
	this.client.toggleFileMark(fileId, {
		onSuccess: function () {
			self.updateFiles();
		}
	});
};

VPLTeacherTools.FileBrowser.prototype.setDefaultFile = function (fileId, suffix) {
	var self = this;
	this.client.setDefaultFile(fileId, suffix, {
		onSuccess: function () {
			self.updateFiles();
		}
	});
};

/**
	@param {string} filename
	@param {string} content
	@param {boolean=} noRename
	@param {Object=} props
	@return {void}
*/
VPLTeacherTools.FileBrowser.prototype.addFile = function (filename, content, noRename, props) {
	props = props || {};
	var self = this;
	this.client.addFile(filename, content,
		props,
		{
			onSuccess: function (r) {
				// rename immediately
				self.updateFiles(noRename ? null : {renamedFileId: r});
			}
		});
};

VPLTeacherTools.FileBrowser.prototype.canCreateProgramFile = function () {
	return this.countSelectedFiles(false) == 1
		? /.vpl3ui$/.test(this.teacherFiles.find(function (val) {
			return val.selected;
		}).filename)
		: this.teacherFiles.find(function (val) {
			return val["default"];
		}) != null;
};

VPLTeacherTools.FileBrowser.prototype.canEditTeacherFile = function () {
	if (this.countSelectedNotRenamedFiles() !== 1) {
		return false;
	}
	var file = this.selectedFile();
	var suffix = VPLTeacherTools.FileBrowser.getFileSuffix(file.filename).toLowerCase();
	return [
		"aseba", "asm", "bas", "c", "cpp", "h", "hpp", "html", "java", "js", "md", "py", "txt",
		"vpl3", "vpl3ui"
	].indexOf(suffix) >= 0;
};

VPLTeacherTools.FileBrowser.prototype.canPreviewTeacherFile = function () {
	if (this.countSelectedNotRenamedFiles() !== 1) {
		return false;
	}
	var file = this.selectedFile();
	var suffix = VPLTeacherTools.FileBrowser.getFileSuffix(file.filename).toLowerCase();
	return ["html", "md", "jpg", "png", "svg", "zip"].indexOf(suffix) >= 0;
};

VPLTeacherTools.FileBrowser.prototype.canGetConfigFile = function () {
	return this.countSelectedFiles(false) == 1
	   && VPLTeacherTools.FileBrowser.getFileSuffix(this.teacherFiles.find(function (val) {
			return val.selected;
		}).filename) === "vpl3";
};

VPLTeacherTools.FileBrowser.prototype.canViewStudentFile = function () {
	return this.countSelectedFiles(true) == 1;
};

VPLTeacherTools.FileBrowser.prototype.openFile = function (readOnly) {
	if (this.countSelectedFiles(false) + this.countSelectedFiles(true) === 1) {
		var file = this.selectedFile();
		var students = file.students;
		var self = this;
		this.client.getFile(file.id, {
			onSuccess: function (file) {
				if (students) {
					file.students = students;
				}
				self.options.onOpen && self.options.onOpen(file, readOnly);
			}
		});
	}
};

VPLTeacherTools.FileBrowser.prototype.canRenameTeacherFile = function () {
	return this.countSelectedNotRenamedFiles() == 1;
};

VPLTeacherTools.FileBrowser.prototype.renameTeacherFile = function (newFilename) {
	if (newFilename) {
		// rename file for which file.renamed is true
		var file = this.teacherFiles.find(function (val) {
			return val.renamed;
		});
		newFilename = newFilename.trim();
		if (file && newFilename !== file.filename) {
			file.filename = newFilename;
			var self = this;
			this.client.renameFile(file.id, newFilename, {
				onSuccess: function () {
					file.renamed = false;
					if (self.options.onTeacherFiles) {
						self.options.onTeacherFiles(self.teacherFiles, self);
					}
				}
			});
		} else {
			// error or same filename: redisplay teacher files to get rid of input field
			file.renamed = false;
			if (this.options.onTeacherFiles) {
				this.options.onTeacherFiles(this.teacherFiles, this);
			}
		}
	} else {
		// start renaming selected file
		var file = this.teacherFiles.find(function (val) {
			return val.selected;
		});
		file.renamed = true;
		if (this.options.onTeacherFiles) {
			this.options.onTeacherFiles(this.teacherFiles, this);
		}
	}
};

VPLTeacherTools.FileBrowser.prototype.canMoveTeacherFile = function () {
	return this.countSelectedNotRenamedFiles() == 1;
};

VPLTeacherTools.FileBrowser.prototype.moveTeacherFile = function (newSet) {
	if (newSet) {
		// change tag for which file.moved is true
		var file = this.teacherFiles.find(function (val) {
			return val.moved;
		});
		newSet = newSet.trim();
		if (file && newSet !== file.tag) {
			file.tag = newSet;
			var self = this;
			this.client.setFileTag(file.id, newSet, {
				onSuccess: function () {
					file.moved = false;
					if (self.options.onTeacherFiles) {
						self.options.onTeacherFiles(self.teacherFiles, self);
					}
					if (self.options.onSets) {
						self.client.listFileTags({
							onSuccess: function (tags) {
								self.options.onSets(tags);
							}
						});
					}
				}
			});
		} else {
			// error or same filename: redisplay teacher files to get rid of input field
			file.moved = false;
			if (this.options.onTeacherFiles) {
				this.options.onTeacherFiles(this.teacherFiles, this);
			}
		}
	} else {
		// start changing tag of selected file
		var file = this.teacherFiles.find(function (val) {
			return val.selected;
		});
		file.moved = true;
		if (this.options.onTeacherFiles) {
			this.options.onTeacherFiles(this.teacherFiles, this);
		}
	}
};

VPLTeacherTools.FileBrowser.prototype.canDuplicateTeacherFile = function () {
	return this.countSelectedNotRenamedFiles() == 1;
};

VPLTeacherTools.FileBrowser.prototype.selectedFile = function () {
	return this.teacherFiles.find(function (val) {
		return val.selected;
	}) || this.studentFiles.find(function (val) {
		return val.selected;
	});
};

VPLTeacherTools.FileBrowser.prototype.selectedOrDefaultUIFile = function () {
	var file = this.selectedFile();
	return file && /\.vpl3ui$/.test(file.filename)
		? file
		: this.teacherFiles.find(function (val) {
			return val["default"] && /\.vpl3ui$/.test(val.filename);
		});
};

VPLTeacherTools.FileBrowser.prototype.duplicateFile = function (file, newFilename) {
	var self = this;
	this.client.copyFile(file.id,
		newFilename || "copy of " + file.filename,
		{mark: true},
		{
			onSuccess: function (r) {
				// rename immediately
				self.updateFiles({renamedFileId: r});
			}
		});
};

VPLTeacherTools.FileBrowser.prototype.duplicateTeacherFile = function (filename) {
	if (this.canDuplicateTeacherFile()) {
		var file = this.teacherFiles.find(function (val) {
			return val.selected;
		});
		this.duplicateFile(file, filename);
	}
};

VPLTeacherTools.FileBrowser.prototype.canBundleTeacherFile = function () {
	// can bundle at least two files or one non-zip file
	if (this.countSelectedNotRenamedFiles() !== 1) {
		return this.countSelectedNotRenamedFiles() > 1;
	}
	var file = this.selectedFile();
	var suffix = VPLTeacherTools.FileBrowser.getFileSuffix(file.filename).toLowerCase();
	return suffix !== "zip";
};

VPLTeacherTools.FileBrowser.prototype.canManifestTeacherFile = function () {
	// can create a manifest for at least one file of a type recognized in manifest
	var ok = false;
	this.teacherFiles.forEach(function (file) {
		if (file.selected && file.filename != VPLTeacherTools.ZipBundle.manifestFilename) {
			var suffix = VPLTeacherTools.FileBrowser.getFileSuffix(file.filename).toLowerCase();
			if (["vpl3", "vpl3ui", "aseba", "jpg", "png", "html", "md", "txt"].indexOf(suffix) >= 0) {
				ok = true;
			}
		}
	});
	return ok;
};

VPLTeacherTools.FileBrowser.prototype.bundleTeacherFile = function (defaultBundleFilename) {
	var selectedFileIds = this.teacherFiles.reduce(function (acc, val) {
		return val.selected ? acc.concat(val.id) : acc;
	}, []);
	if (selectedFileIds.length > 0) {
		this.client.getFiles(selectedFileIds, {
			onSuccess: (files) => {
				var bundleFilename = defaultBundleFilename || "newbundle.zip";
				for (var i = 0; i < files.length; i++) {
					var suffix = VPLTeacherTools.FileBrowser.getFileSuffix(files[i].tag).toLowerCase();
					if (suffix === "zip") {
						bundleFilename = files[i].tag;
						break;
					}
				}
				var zipbundle = new VPLTeacherTools.ZipBundle();
				files.forEach((file) => {
					zipbundle.addFile(file.filename, file.content);
				});
				zipbundle.zip.generateAsync({type:"base64"}).then((content) => {
					this.addFile(bundleFilename, content);
				});
			}
		});
	}
};

VPLTeacherTools.FileBrowser.prototype.manifestTeacherFile = function (manifestTemplate) {
	var vpl3Files = [];
	var uiFiles = [];
	var programFiles = [];
	var attentionFiles = [];
	var docFiles = [];
	var statementFiles = [];

	this.teacherFiles.forEach(function (file) {
		if (file.selected) {
			var type = VPLTeacherTools.ZipBundle.mapSuffixToType(file.filename);
			switch (type) {
			case VPLTeacherTools.ZipBundle.Manifest.File.Type.vpl3:
				vpl3Files.push(file.filename);
				break;
			case VPLTeacherTools.ZipBundle.Manifest.File.Type.ui:
				uiFiles.push(file.filename);
				break;
			case VPLTeacherTools.ZipBundle.Manifest.File.Type.program:
				programFiles.push(file.filename);
				break;
			case VPLTeacherTools.ZipBundle.Manifest.File.Type.attention:
				attentionFiles.push(file.filename);
				break;
			case VPLTeacherTools.ZipBundle.Manifest.File.Type.statement:
				statementFiles.push(file.filename);
				break;
			}
		}
	});

	var manifestFile = manifestTemplate
		.replace("VPL3FILES", vpl3Files.join("\n"))
		.replace("UIFILES", uiFiles.join("\n"))
		.replace("PROGRAMFILES", programFiles.join("\n"))
		.replace("ATTENTIONFILES", attentionFiles.join("\n"))
		.replace("DOCFILES", docFiles.join("\n"))
		.replace("STATEMENTFILES", statementFiles.join("\n"));

	this.addFile(VPLTeacherTools.ZipBundle.manifestFilename, manifestFile);
};

VPLTeacherTools.FileBrowser.prototype.canUnbundleTeacherFile = function () {
	if (this.countSelectedNotRenamedFiles() !== 1) {
		return false;
	}
	var file = this.selectedFile();
	var suffix = VPLTeacherTools.FileBrowser.getFileSuffix(file.filename).toLowerCase();
	return suffix === "zip";
};

VPLTeacherTools.FileBrowser.prototype.unbundleTeacherFile = function () {
	if (this.canUnbundleTeacherFile()) {
		var file = this.teacherFiles.find(function (val) {
			return val.selected;
		});
		this.client.getFile(file.id, {
			onSuccess: (file) => {
				var zipbundle = new VPLTeacherTools.ZipBundle();
				zipbundle.load(atob(file.content), () => {
					var selectedFileIds = [];
					zipbundle.toc.forEach((filename) => {
						var asBase64 = VPLTeacherTools.FileBrowser.storeAsBase64(filename);
						zipbundle.getFile(filename, asBase64, (data) => {
							this.client.addFile(filename, data,
								{
									tag: file.filename  // tag with bundle name
								},
								{
									onSuccess: (r) => {
										selectedFileIds.push(r);
										this.updateFiles({selectedFileIds: selectedFileIds});
									}
								});
						});
					});
				});
			}
		});
	}
};

VPLTeacherTools.FileBrowser.prototype.canImportTeacherFile = function () {
	return true;
};

VPLTeacherTools.FileBrowser.prototype.canExportTeacherFile = function () {
	return this.countSelectedNotRenamedFiles() == 1;
};

VPLTeacherTools.FileBrowser.prototype.canExportStudentFile = function () {
	return this.countSelectedFiles(true) == 1;
};

/** Set anchor element so that it downloads text and click it
	@param {Element} anchor "a" element
	@param {string} text
	@param {string=} filename filename of downloaded file (default: "untitled.xml")
	@param {string=} mimetype mime type of downloaded file (default: "application/xml")
	@param {boolean=} isBase64 true if text is base64 which must be decoded
	@return {void}
*/
VPLTeacherTools.FileBrowser.setAnchorAndDownload = function (anchor, text, filename, mimetype, isBase64) {
	mimetype = mimetype || "application/xml";
	/** @type {string} */
	var url;
	if (typeof window.Blob === "function" && window.URL) {
		// blob URL
		if (isBase64) {
			url = "data:" + mimetype + ";base64," + text;
			fetch(url)
				.then(res => res.blob())
				.then(blob => {
					url = window.URL.createObjectURL(blob);
					anchor.href = url;
					anchor["download"] = filename || "untitled.xml";
					anchor.click();
					window.URL.revokeObjectURL(url);
				});
		} else {
			var blob = new window.Blob([text], {"type": mimetype});
			url = window.URL.createObjectURL(blob);
			anchor.href = url;
			anchor["download"] = filename || "untitled.xml";
			anchor.click();
			window.URL.revokeObjectURL(url);
		}
	} else {
		// data URL
		url = "data:" + mimetype + ";base64," + (isBase64 ? text : window["btoa"](text));
		anchor.href = url;
		anchor["download"] = filename || "untitled.xml";
		anchor.click();
	}
};

/** Download file
	@param {string} text
	@param {string=} filename filename of downloaded file (default: "untitled.xml")
	@param {string=} mimetype mime type of downloaded file (default: "application/xml")
	@param {boolean=} isBase64 true if text is base64 which must be decoded
	@return {void}
*/
VPLTeacherTools.FileBrowser.downloadText = (function () {
	// add a hidden anchor to document, which will be reused
	/** @type {Element} */
	var anchor = null;

	return function (text, filename, mimetype, isBase64) {
		if (anchor === null) {
			anchor = document.createElement("a");
			document.body.appendChild(anchor);
			anchor.style.display = "none";
		}

		VPLTeacherTools.FileBrowser.setAnchorAndDownload(anchor, text, filename, mimetype, isBase64);
	};
})();

VPLTeacherTools.FileBrowser.prototype.exportFile = function () {
	if (this.canExportTeacherFile() || this.canExportStudentFile()) {
		var file = this.selectedFile();
		var self = this;
		this.client.getFile(file.id, {
			onSuccess: function (file) {
				var suffix = VPLTeacherTools.FileBrowser.getFileSuffix(file.filename).toLowerCase();
				var mimetype = VPLTeacherTools.FileBrowser.suffixToMimetype(suffix);
				var isBase64 = VPLTeacherTools.FileBrowser.storeAsBase64(file.filename);
				VPLTeacherTools.FileBrowser.downloadText(file.content, file.filename, mimetype, isBase64);
			}
		});
	}
};

VPLTeacherTools.FileBrowser.prototype.canDeleteTeacherFiles = function () {
	return this.countSelectedFiles(false) > 0;
};

VPLTeacherTools.FileBrowser.prototype.canDeleteStudentFiles = function () {
	return this.countSelectedFiles(true) > 0;
};

VPLTeacherTools.FileBrowser.prototype.deleteFiles = function () {
	var selectedFileIds = this.teacherFiles.concat(this.studentFiles).reduce(function (acc, val) {
		return val.selected ? acc.concat(val.id) : acc;
	}, []);
	if (selectedFileIds.length > 0) {
		var self = this;
		this.client.removeFiles(selectedFileIds, {
			onSuccess: function () {
				self.updateFiles();
			}
		});
	}
};

VPLTeacherTools.FileBrowser.prototype.extractConfigFromVPL3 = function () {
	var file = this.selectedFile();
	var suffix = VPLTeacherTools.FileBrowser.getFileSuffix(file.filename).toLowerCase();
	if (suffix === "vpl3") {
		var self = this;
		this.client.extractConfigFromVPL3(file.id,
			"config of " + file.filename + "ui",
			{mark: true},
			{
				onSuccess: function (r) {
					// rename immediately
					self.updateFiles({renamedFileId: r});
				}
			});
	}
};

VPLTeacherTools.FileBrowser.getFileSuffix = function (filename) {
	return /(\.[^.]*|)$/.exec(filename)[0].slice(1);
};

VPLTeacherTools.FileBrowser.getFileIconURL = function (filename) {
	var suffix = VPLTeacherTools.FileBrowser.getFileSuffix(filename).toLowerCase();
	return {
		"aseba": "icon-file-program.svg",
		"html": "icon-file-html.svg",
		"md": "icon-file-md.svg",
		"jpg": "icon-file-img.svg",
		"png": "icon-file-img.svg",
		"svg": "icon-file-img.svg",
		"txt": "icon-file-txt.svg",
		"vpl3": "icon-file-vpl3.svg",
		"vpl3ui": "icon-file-vpl3ui.svg",
		"zip": "icon-file-bundle.svg"
	}[suffix] || null;
};

VPLTeacherTools.FileBrowser.storeAsBase64 = function (filename) {
	var suffix = VPLTeacherTools.FileBrowser.getFileSuffix(filename).toLowerCase();
	return ["jpg", "pdf", "png", "zip"].indexOf(suffix) >= 0;
};

VPLTeacherTools.FileBrowser.suffixToMimetype = function (suffix) {
	return {
		"aseba": "text/x-aseba",
		"gif": "image/gif",
		"html": "text/html",
		"jpg": "image/jpeg",
		"json": "application/json",
		"md": "text/markdown",
		"pdf": "application/pdf",
		"png": "image/png",
		"svg": "image/svg+xml",
		"txt": "text/plain",
		"zip": "application/zip"
	}[suffix] || "application/octet-stream";
};

VPLTeacherTools.FileBrowser.prototype.callOnStudents = function () {
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

VPLTeacherTools.FileBrowser.prototype.updateStudents = function () {
	var self = this;
	this.client.listStudents(null, {
		onSuccess: function (students) {
			if (self.options.onStudents || self.options.onClasses) {
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
				if (self.options.onClasses) {
					self.options.onClasses(self.classes, self.currentClass);
				}
				self.callOnStudents();
			}
		}
	});
};

VPLTeacherTools.FileBrowser.prototype.setClass = function (cl) {
	this.currentClass = cl;
	this.callOnStudents();
};
