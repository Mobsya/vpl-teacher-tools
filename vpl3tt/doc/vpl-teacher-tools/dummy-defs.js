// declarations to permit validation with closure compiler
// (shouldn't be included in html)

var $LANGUAGE = "en";
var $VPLLANGUAGE = "en";
var $LANGSUFFIX = "";
var $BRIDGE = "tdm";
var $SHORTENURL = true;
var $LOGINQRCODE = true;
var $AUTONOMOUSSTUDENTPROGRESS = true;
var $LOGDISPLAY = true;
var $ADVANCEDSIMFEATURES = true;
var $DEVTOOLSTYLE = false;
var $VPLUIURI = "ui/svg/ui.json";
var $TTSERVERWSPORT = 8001;

var uiLanguage = "en";

var JSZip = class {
	constructor() {
		this.files = {};
		this.root = "";
	}

	/**
		@param {*=} a
		@param {*=} b
		@return {JSZipEntry}
	*/
	file(a, b) {}

	forEach(a) {}

	/**
		@param {*=} a
		@return {Promise}
	*/
	generateAsync(a) {}

	/**
		@param {*} a
		@return {Promise}
	*/
	loadAsync(a) {}
};

var JSZipEntry = class {
	/**
		@param {*=} a
		@return {Promise}
	*/
	async(a) {};
};
