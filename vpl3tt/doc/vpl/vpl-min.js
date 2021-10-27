/* Copyright 2018-2021 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE - author Yves Piguet */
(function(){
var A3a = {};
A3a.Node = function(name, nodeId) {
  this.name = name;
  this.nodeId = nodeId;
};
A3a.Node.nodeList = [];
A3a.Node.registerNode = function(node) {
  A3a.Node.nodeList.push(node);
};
A3a.Node.clearNodeList = function(cls) {
  if (cls) {
    for (var i = A3a.Node.nodeList.length - 1; i >= 0; i--) {
      if (A3a.Node.nodeList[i] instanceof cls) {
        A3a.Node.nodeList.splice(i, 1);
      }
    }
  } else {
    A3a.Node.nodeList = [];
  }
};
A3a.Node.getNodeList = function() {
  return A3a.Node.nodeList;
};
A3a.Node.findNodeByName = function(name) {
  for (var i = 0; i < A3a.Node.nodeList.length; i++) {
    if (A3a.Node.nodeList[i].name === name) {
      return A3a.Node.nodeList[i];
    }
  }
  return null;
};
A3a.Node.findNodeById = function(nodeId) {
  for (var i = 0; i < A3a.Node.nodeList.length; i++) {
    if (A3a.Node.nodeList[i].nodeId === nodeId) {
      return A3a.Node.nodeList[i];
    }
  }
  return null;
};
A3a.Node.prototype.getVariableAsync = function(varName, cb) {
  throw "not implemented";
};
A3a.Node.prototype.setVariableAsync = function(varName, val, cb) {
  throw "not implemented";
};
A3a.Node.prototype.putA3aCodeAsync = function(code, globalEvents, cb) {
  throw "not implemented";
};
A3a.Node.prototype.getAllVariablesAsync = function(cb) {
  throw "not implemented";
};
A3a.Node.prototype.setBreakpoints = function(breakpoints, cb) {
  throw "not implemented";
};
A3a.Node.EventListenerRef;
A3a.Node.prototype.addEventListener = function(eventName, cb) {
  throw "not implemented";
};
A3a.Node.prototype.addAllEventListener = function(cb) {
  throw "not implemented";
};
A3a.Node.prototype.removeEventListener = function(source) {
  throw "not implemented";
};
A3a.NodeProxy = function(name, nodeId, url, protocolVersion) {
  A3a.Node.call(this, name, nodeId);
  this.url = url;
  this.protocolVersion = protocolVersion;
};
A3a.NodeProxy.prototype = Object.create(A3a.Node.prototype);
A3a.NodeProxy.prototype.constructor = A3a.NodeProxy;
A3a.NodeProxy.callXHRAsync = function(method, url, cb, data) {
  var xhr = new XMLHttpRequest;
  xhr.timeout = 5000;
  if (cb) {
    xhr.addEventListener("timeout", function(e) {
      cb(null);
    });
    xhr.addEventListener("error", function(e) {
      cb(null);
    });
    xhr.addEventListener("load", function(e) {
      switch(xhr.status) {
        case 200:
          var txt = xhr.responseText;
          cb(txt);
          break;
        default:
          cb(null);
          break;
      }
    });
  }
  xhr.open(method, url, true);
  xhr.send(data);
};
A3a.NodeProxy.init = function(rootURL, cb) {
  rootURL = rootURL || "";
  A3a.NodeProxy.callXHRAsync("GET", rootURL + "/nodes", function(json) {
    if (json !== null) {
      var a = JSON.parse(json);
      if (a.length === 0) {
        A3a.NodeProxy.init(rootURL, cb);
      } else {
        A3a.Node.clearNodeList(A3a.NodeProxy);
        a.forEach(function(obj) {
          var nodeProxy = new A3a.NodeProxy(obj["name"], obj["aeslId"], rootURL + "/nodes/" + obj["name"], obj["protocolVersion"]);
          A3a.NodeProxy.callXHRAsync("GET", rootURL + "/nodes/" + obj["name"], function(json) {
            nodeProxy.description = json ? JSON.parse(json) : "";
          });
          A3a.Node.registerNode(nodeProxy);
        });
        cb && cb();
      }
    }
  });
};
A3a.NodeProxy.prototype.updateDescriptionAsync = function(cb) {
  var nodeProxy = this;
  A3a.NodeProxy.callXHRAsync("GET", this.url, function(json) {
    nodeProxy.description = json ? JSON.parse(json) : "";
    cb && cb(nodeProxy.description);
  });
};
A3a.NodeProxy.prototype.getVariableAsync = function(varName, cb) {
  var url = this.url + "/" + varName;
  A3a.NodeProxy.callXHRAsync("GET", url, function(json) {
    var val = json ? JSON.parse(json) : [];
    cb && cb(val, varName);
  });
};
A3a.NodeProxy.prototype.setVariableAsync = function(varName, val, cb) {
  var url = this.url + "/" + varName + "/";
  if (val instanceof Array) {
    url += val.map(function(num) {
      return num.toString(10);
    }).join("/");
  } else {
    url += val.toString(10);
  }
  A3a.NodeProxy.callXHRAsync("GET", url, function(json) {
    cb && cb(val, varName);
  });
};
A3a.NodeProxy.prototype.codeTextToXML = function(code, globalEvents) {
  return "<!DOCTYPE aesl-source>\n" + "<network>\n" + (globalEvents || []).map(function(e) {
    return "<event size='" + (e.size || 0).toString(10) + "' name='" + e.name + "'/>\n";
  }).join("") + "<keywords flag='true'/>\n" + "<node nodeId='" + (this.nodeId || 1).toString(10) + "' name='" + this.name + "'><![CDATA[" + code + "]]\x3e</node>\n" + "</network>\n";
};
A3a.NodeProxy.prototype.putA3aCodeAsync = function(code, globalEvents, cb) {
  var xml = this.codeTextToXML(code, globalEvents);
  A3a.NodeProxy.callXHRAsync("PUT", this.url, cb && function() {
    cb();
  }, xml);
};
A3a.NodeProxy.prototype.getAllVariablesAsync = function(cb) {
  A3a.NodeProxy.callXHRAsync("GET", this.url + "?q=vardict", cb && function(json) {
    json && cb(JSON.parse(json));
  });
};
A3a.NodeProxy.prototype.setBreakpoints = function(breakpoints, cb) {
  A3a.NodeProxy.callXHRAsync("GET", this.url + "?q=bp&data=" + breakpoints.map(function(n) {
    return n.toString(10);
  }).join("%2C"), cb && function(json) {
    cb();
  });
};
A3a.NodeProxy.prototype.addEventListener = function(eventName, cb) {
  eventName = eventName.toString();
  var url = this.url + "/events";
  if (eventName) {
    url += "/" + eventName;
  }
  var source = new EventSource(url);
  source.onmessage = function(event) {
    cb(event.data.split(" ").slice(1).map(function(str) {
      return parseInt(str, 10);
    }), eventName);
  };
  return source;
};
A3a.NodeProxy.prototype.addAllEventListener = function(cb) {
  var url = this.url.replace(/\/nodes\/.*$/, "") + "/events";
  var source = new EventSource(url);
  source.onmessage = function(event) {
    var a = event.data.split(" ");
    cb(a.slice(1).map(function(s) {
      return parseInt(s, 10);
    }), a[0]);
  };
  return source;
};
A3a.NodeProxy.prototype.removeEventListener = function(source) {
  source.close();
};
A3a.vpl = {};
A3a.vpl.draw = {};
A3a.vpl.blockType = {event:"e", action:"a", state:"s", comment:"c", hidden:"h", undef:"?"};
A3a.vpl.mode = {basic:"b", advanced:"a", custom:"c"};
A3a.vpl.defaultLanguage = "aseba";
A3a.vpl.BlockTemplate = function(blockParams) {
  this.name = blockParams.name;
  this.type = blockParams.type;
  this.modes = blockParams.modes || [A3a.vpl.mode.basic, A3a.vpl.mode.advanced];
  this.noState = blockParams.noState || false;
  this.defaultParam = blockParams.defaultParam || null;
  this.typicalParam = blockParams.typicalParam || null;
  this.typicalParamSet = blockParams.typicalParamSet || null;
  this.paramAccessibility = blockParams.paramAccessibility;
  this.exportParam = blockParams.exportParam || null;
  this.importParam = blockParams.importParam || null;
  this.validate = blockParams.validate || null;
  this.genCode = blockParams.genCode || {"aseba":this.type === A3a.vpl.blockType.event ? function(block) {
    return {begin:"# onevent " + block.blockTemplate.name + "\n"};
  } : function(block) {
    return {statement:"# " + block.blockTemplate.name + "\n"};
  }};
  this.draw = blockParams.draw || function(canvas, block, box, isZoomed) {
    canvas.text(block.blockTemplate.name);
  };
  this.alwaysZoom = blockParams.alwaysZoom || false;
  this.mousedown = blockParams.mousedown || null;
  this.mousedrag = blockParams.mousedrag || null;
  this.changeMode = blockParams.changeMode || null;
};
A3a.vpl.BlockTemplate.aeslImportRule;
A3a.vpl.BlockTemplate.aeslImportRules = [];
A3a.vpl.BlockTemplate.param;
A3a.vpl.BlockTemplate.defaultParam;
A3a.vpl.BlockTemplate.exportParam;
A3a.vpl.BlockTemplate.importParam;
A3a.vpl.BlockTemplate.validateFun;
A3a.vpl.BlockTemplate.genCodeFun;
A3a.vpl.BlockTemplate.drawFun;
A3a.vpl.BlockTemplate.mousedownFun;
A3a.vpl.BlockTemplate.mousedragFun;
A3a.vpl.BlockTemplate.changeModeFun;
A3a.vpl.BlockTemplate.sectionPriFun;
A3a.vpl.BlockTemplate.params;
A3a.vpl.BlockTemplate.prototype.renderToCanvas = function(canvas, block, box, x0, y0, isZoomed) {
  canvas.ctx.save();
  canvas.ctx.translate(x0, y0);
  this.draw(canvas, block, box, isZoomed);
  canvas.ctx.restore();
};
A3a.vpl.BlockTemplate.substInline = function(fmt, params, options, keepResult) {
  var result = null;
  options = options || {i:0, slowdown:1};
  while (true) {
    var r = /`([^`]*)`/.exec(fmt);
    if (r == null) {
      break;
    }
    result = (new Function("$", "i", "slowdown", "rgb", "toFixed", "return " + r[1] + ";"))(params, options.i, options.slowdown, function(rgb) {
      rgb = [rgb[0], Math.max(0.2 + 0.8 * rgb[1], rgb[2] / 2), rgb[2]];
      var max = Math.max(rgb[0], Math.max(rgb[1], rgb[2]));
      return rgb.map(function(x) {
        return 0.88 * (1 - max) + (0.12 + 0.88 * max) * x;
      });
    }, function(x, nDigits) {
      return parseFloat(x.toFixed(nDigits === undefined ? 2 : nDigits)).toString();
    });
    fmt = fmt.slice(0, r.index) + result + fmt.slice(r.index + r[0].length);
  }
  return keepResult ? result : fmt;
};
A3a.vpl.BlockParamAccessibility = function(controls) {
  this.controls = controls || [];
};
A3a.vpl.BlockParamAccessibility.prototype.addControl = function(control) {
  this.controls.push(control);
};
A3a.vpl.BlockParamAccessibility.Control = function(top, left, bottom, right, onSelect, onUp, onDown, onClick) {
  this.top = top;
  this.left = left;
  this.bottom = bottom;
  this.right = right;
  this.onSelect = onSelect;
  this.onUp = onUp;
  this.onDown = onDown;
  this.onClick = onClick || null;
};
A3a.vpl.BlockParamAccessibility.Control.OnAction;
A3a.vpl.BlockParamAccessibility.Control.OnClick;
A3a.vpl.Block = function(blockTemplate, ruleContainer, positionInContainer) {
  this.blockTemplate = blockTemplate;
  this.ruleContainer = ruleContainer;
  this.positionInContainer = positionInContainer;
  this.disabled = false;
  this.locked = false;
  this.marks = {};
  this.param = blockTemplate.defaultParam ? blockTemplate.defaultParam() : null;
  this.onPrepareChange = null;
  this.onChanged = null;
  this.dragging = null;
};
A3a.vpl.positionInContainer;
A3a.vpl.Block.prototype.copy = function(ruleContainer, positionInContainer, onPrepareChange, onChanged) {
  var newBlock = new A3a.vpl.Block(this.blockTemplate, ruleContainer, positionInContainer);
  newBlock.disabled = this.disabled;
  newBlock.onPrepareChange = onPrepareChange;
  newBlock.onChanged = onChanged;
  if (this.param) {
    var newParam = this.param.slice();
    newBlock.param = newParam;
  }
  return newBlock;
};
A3a.vpl.Block.prototype.beginChange = function() {
  this.onPrepareChange && this.onPrepareChange();
};
A3a.vpl.Block.prototype.endChange = function() {
  this.onChanged && this.onChanged();
};
A3a.vpl.compiledCode;
A3a.vpl.Block.prototype.generateCode = function(language, program) {
  return this.disabled ? {} : this.blockTemplate.genCode[language] ? this.blockTemplate.genCode[language](this, program) : A3a.vpl.Program.codeGenerator[language].generateMissingCodeForBlock(this, program);
};
A3a.vpl.EmptyBlock = function(blockType, ruleContainer, positionInContainer) {
  A3a.vpl.Block.call(this, A3a.vpl.EmptyBlock.templates[blockType], ruleContainer, positionInContainer);
};
A3a.vpl.EmptyBlock.prototype = Object.create(A3a.vpl.Block.prototype);
A3a.vpl.EmptyBlock.prototype.constructor = A3a.vpl.EmptyBlock;
A3a.vpl.EmptyBlock.templates = {"e":new A3a.vpl.BlockTemplate({name:"empty e", type:A3a.vpl.blockType.event, draw:function(canvas, block, box, isZoomed) {
  var blockTemplate = A3a.vpl.BlockTemplate.findByName("!empty event");
  if (blockTemplate) {
    blockTemplate.draw(canvas, block, box, isZoomed);
  }
}}), "a":new A3a.vpl.BlockTemplate({name:"empty a", type:A3a.vpl.blockType.action, draw:function(canvas, block, box, isZoomed) {
  var blockTemplate = A3a.vpl.BlockTemplate.findByName("!empty action");
  if (blockTemplate) {
    blockTemplate.draw(canvas, block, box, isZoomed);
  }
}}), "s":new A3a.vpl.BlockTemplate({name:"empty s", type:A3a.vpl.blockType.state, draw:function(canvas, block, box, isZoomed) {
  var blockTemplate = A3a.vpl.BlockTemplate.findByName("!empty state") || A3a.vpl.BlockTemplate.findByName("!empty event");
  if (blockTemplate) {
    blockTemplate.draw(canvas, block, box, isZoomed);
  }
}})};
A3a.vpl.EmptyBlock.prototype.generateCode = function() {
  return {};
};
A3a.vpl.Rule = function() {
  this.events = [];
  this.actions = [];
  this.error = null;
  this.disabled = false;
  this.locked = false;
};
A3a.vpl.Rule.prototype.copy = function() {
  var eh = new A3a.vpl.Rule;
  for (var i = 0; i < this.events.length; i++) {
    eh.setBlock(this.events[i], null, null, null);
  }
  for (var i = 0; i < this.actions.length; i++) {
    eh.setBlock(this.actions[i], null, null, null);
  }
  return eh;
};
A3a.vpl.Rule.prototype.isEmpty = function() {
  return this.events.length === 0 && this.actions.length === 0;
};
A3a.vpl.Rule.prototype.toggleDisable = function() {
  this.disabled = !this.disabled;
  if (this.disabled) {
    this.error = null;
  }
};
A3a.vpl.Rule.prototype.hasBlockOfType = function(type) {
  for (var i = 0; i < this.events.length; i++) {
    if (this.events[i].blockTemplate.type === type) {
      return true;
    }
  }
  for (var i = 0; i < this.actions.length; i++) {
    if (this.actions[i].blockTemplate.type === type) {
      return true;
    }
  }
  return false;
};
A3a.vpl.Rule.prototype.getEventBlockByType = function(name) {
  for (var i = 0; i < this.events.length; i++) {
    if (this.events[i].blockTemplate.name === name) {
      return this.events[i];
    }
  }
  return null;
};
A3a.vpl.Rule.prototype.setBlock = function(block, posInRule, onPrepareChange, onChanged, noCopy) {
  if (block) {
    switch(block.blockTemplate.type) {
      case A3a.vpl.blockType.event:
      case A3a.vpl.blockType.state:
        if (block.ruleContainer === this) {
          if (posInRule) {
            this.events.splice(block.positionInContainer.index, 1);
            if (noCopy) {
              block.onPrepareChange = onPrepareChange;
              block.onChanged = onChanged;
            } else {
              block = block.copy(this, posInRule, onPrepareChange, onChanged);
            }
            this.events.splice(posInRule.index, 0, block);
          }
        } else {
          if (posInRule) {
            if (this.events[posInRule.index] === block) {
              return;
            }
            if (noCopy) {
              block.onPrepareChange = onPrepareChange;
              block.onChanged = onChanged;
            } else {
              block = block.copy(this, posInRule, onPrepareChange, onChanged);
            }
            this.events[posInRule.index] = block;
          } else {
            if (noCopy) {
              block.onPrepareChange = onPrepareChange;
              block.onChanged = onChanged;
            } else {
              block = block.copy(this, {eventSide:true, index:this.events.length}, onPrepareChange, onChanged);
            }
            this.events.push(block);
          }
        }
        break;
      case A3a.vpl.blockType.action:
      case A3a.vpl.blockType.comment:
        if (block.ruleContainer === this) {
          if (posInRule) {
            this.removeBlock(block.positionInContainer);
            if (noCopy) {
              block.onPrepareChange = onPrepareChange;
              block.onChanged = onChanged;
            } else {
              block = block.copy(this, posInRule, onPrepareChange, onChanged);
            }
            (posInRule.eventSide ? this.events : this.actions).splice(posInRule.index, 0, block);
          }
        } else {
          if (posInRule) {
            if ((posInRule.eventSide ? this.events : this.actions)[posInRule.index] === block) {
              return;
            }
            if (noCopy) {
              block.onPrepareChange = onPrepareChange;
              block.onChanged = onChanged;
            } else {
              block = block.copy(this, posInRule, onPrepareChange, onChanged);
            }
            (posInRule.eventSide ? this.events : this.actions)[posInRule.index] = block;
          } else {
            if (noCopy) {
              block.onPrepareChange = onPrepareChange;
              block.onChanged = onChanged;
            } else {
              block = block.copy(this, {eventSide:false, index:this.actions.length}, onPrepareChange, onChanged);
            }
            this.actions.push(block);
          }
        }
        break;
    }
    this.fixBlockContainerRefs();
  }
};
A3a.vpl.Rule.prototype.removeBlock = function(posInRule) {
  if (posInRule.eventSide) {
    if (this.events[posInRule.index]) {
      this.events.splice(posInRule.index, 1);
      this.fixBlockContainerRefs();
    }
  } else {
    if (this.actions[posInRule.index]) {
      this.actions.splice(posInRule.index, 1);
      this.fixBlockContainerRefs();
    }
  }
};
A3a.vpl.Rule.prototype.fixBlockContainerRefs = function() {
  this.events.forEach(function(event, i) {
    event.ruleContainer = this;
    event.positionInContainer = {eventSide:true, index:i};
  }, this);
  this.actions.forEach(function(action, i) {
    action.ruleContainer = this;
    action.positionInContainer = {eventSide:false, index:i};
  }, this);
};
A3a.vpl.Rule.prototype.checkConflicts = function(otherRule) {
  function compareEvents(a, b) {
    if (a.disabled) {
      return b.disabled ? 0 : 1;
    } else {
      if (b.disabled) {
        return -1;
      }
    }
    var at = a.blockTemplate.name;
    var bt = b.blockTemplate.name;
    return at > bt ? 1 : at < bt ? -1 : 0;
  }
  function areParamEqual(block1, block2) {
    if (block1.param === null && block2.param === null) {
      return true;
    }
    if (block1.param === null || block2.param === null || block1.param.length !== block2.param.length) {
      return false;
    }
    for (var i = 0; i < block1.param.length; i++) {
      if (block1.param[i] !== block2.param[i]) {
        return false;
      }
    }
    return true;
  }
  function areEventBlocksDisabled(rule) {
    for (var i = 0; i < rule.events.length; i++) {
      if (!rule.events[i].disabled) {
        return false;
      }
    }
    return true;
  }
  if (this.disabled || otherRule.disabled) {
    return false;
  }
  if (areEventBlocksDisabled(this) || areEventBlocksDisabled(otherRule)) {
    return false;
  }
  if (this.events.length === 0 || otherRule.events.length !== this.events.length) {
    return false;
  }
  var eSorted = this.events.slice(0, 1).concat(this.events.slice(1).sort(compareEvents));
  var eOtherSorted = otherRule.events.slice(0, 1).concat(otherRule.events.slice(1).sort(compareEvents));
  for (var i = 0; i < eSorted.length && !eSorted[i].disabled && !eOtherSorted[i].disabled; i++) {
    if (eSorted[i].blockTemplate !== eOtherSorted[i].blockTemplate || !areParamEqual(eSorted[i], eOtherSorted[i])) {
      return false;
    }
  }
  if (this.error == null || this.error.isWarning) {
    var err = new A3a.vpl.Error("Rules with same events");
    err.addEventConflictError(otherRule);
    this.error = err;
  }
  if (otherRule.error == null || otherRule.error.isWarning) {
    var err = new A3a.vpl.Error("Rules with same events");
    err.addEventConflictError(this);
    otherRule.error = err;
  }
  return true;
};
A3a.vpl.RuleComment = function(comment) {
  A3a.vpl.Rule.call(this);
  this.comment = comment || "";
};
A3a.vpl.RuleComment.prototype = Object.create(A3a.vpl.Rule.prototype);
A3a.vpl.RuleComment.prototype.constructor = A3a.vpl.RuleComment;
A3a.vpl.RuleComment.prototype.copy = function() {
  return new A3a.vpl.RuleComment(this.comment);
};
A3a.vpl.RuleComment.prototype.isEmpty = function() {
  return false;
};
A3a.vpl.RuleComment.prototype.setBlock = function() {
  throw "internal";
};
A3a.vpl.RuleComment.prototype.removeBlock = function() {
  throw "internal";
};
A3a.vpl.RuleComment.prototype.checkConflicts = function() {
  return false;
};
A3a.vpl.UIConfig = function() {
  this.disabledUI = [];
  this.toolbarCustomizationMode = false;
  this.toolbarCustomizationDisabled = false;
  this.blockCustomizationMode = false;
  this.keyboardShortcutsEnabled = true;
  this.keyboardAccessibility = false;
  this.nodragAccessibility = false;
};
A3a.vpl.UIConfig.prototype.reset = function() {
  this.disabledUI = [];
};
A3a.vpl.UIConfig.prototype.isDisabled = function(featureName) {
  return this.disabledUI.indexOf(featureName) >= 0;
};
A3a.vpl.UIConfig.prototype.setDisabledFeatures = function(featureList) {
  this.disabledUI = featureList.slice();
};
A3a.vpl.UIConfig.prototype.disable = function(featureName) {
  if (this.disabledUI.indexOf(featureName) < 0) {
    this.disabledUI.push(featureName);
  }
};
A3a.vpl.UIConfig.prototype.enable = function(featureName) {
  var ix = this.disabledUI.indexOf(featureName);
  if (ix >= 0) {
    this.disabledUI.splice(ix, 1);
  }
};
A3a.vpl.UIConfig.prototype.toggle = function(featureName) {
  var ix = this.disabledUI.indexOf(featureName);
  if (ix >= 0) {
    this.disabledUI.splice(ix, 1);
  } else {
    this.disabledUI.push(featureName);
  }
};
A3a.vpl.Translation = function() {
  this.dict = {};
  this.language = "en";
};
A3a.vpl.Translation.prototype.addDictForLanguage = function(lang, dict) {
  if (!this.dict[lang]) {
    this.dict[lang] = {};
  }
  var d = this.dict[lang];
  for (var key in dict) {
    if (dict.hasOwnProperty(key)) {
      d[key] = dict[key];
    }
  }
};
A3a.vpl.Translation.prototype.getLanguage = function() {
  return this.language;
};
A3a.vpl.Translation.prototype.setLanguage = function(language) {
  this.language = language;
};
A3a.vpl.Translation.prototype.translate = function(msg, language) {
  var dict = this.dict[language || this.language];
  return dict && dict[msg] || msg;
};
A3a.vpl.DynamicHelp = function() {
  this.fragments = {};
  this.images = {};
};
A3a.vpl.DynamicHelp.prototype.add = function(fragments) {
  for (var language in fragments) {
    if (fragments.hasOwnProperty(language)) {
      if (!this.fragments[language]) {
        this.fragments[language] = {};
      }
      for (var section in fragments[language]) {
        if (fragments[language].hasOwnProperty(section)) {
          if (!this.fragments[language][section]) {
            this.fragments[language][section] = {};
          }
          for (var id in fragments[language][section]) {
            if (fragments[language][section].hasOwnProperty(id)) {
              this.fragments[language][section][id] = fragments[language][section][id].slice();
            }
          }
        }
      }
    }
  }
};
A3a.vpl.DynamicHelp.prototype.clearImageMapping = function() {
  this.images = {};
};
A3a.vpl.DynamicHelp.prototype.addImageMapping = function(urlMD, url) {
  this.images[urlMD] = url;
};
A3a.vpl.DynamicHelp.prototype.get = function(language, section, id) {
  return this.fragments[language] && this.fragments[language][section] && this.fragments[language][section][id] ? this.fragments[language][section][id] : null;
};
A3a.vpl.DynamicHelp.prototype.convertToHTML = function(md) {
  var html = "";
  md.forEach(function(line) {
    line = line.replace(/&\s/g, "&amp; ");
    var parEl = "p";
    if (/^###/.test(line)) {
      line = line.slice(2);
      parEl = "h4";
    } else {
      if (/^##/.test(line)) {
        line = line.slice(2);
        parEl = "h3";
      } else {
        if (/^#/.test(line)) {
          line = line.slice(1);
          parEl = "h2";
        }
      }
    }
    function handleSpans(re, tag) {
      var sp = line.split(re);
      if (sp.length > 1) {
        line = sp[0];
        for (var i = 1; i < sp.length; i++) {
          line += (i % 2 == 1 ? "<" : "</") + tag + ">" + sp[i];
        }
        if (sp.length % 2 == 0) {
          line += "</" + tag + ">";
        }
      }
    }
    handleSpans(/\*\*|__/, "strong");
    handleSpans(/\*|_/, "em");
    while (true) {
      var re = /!\[([^\]]*)\]\(([^)]*)\)/.exec(line);
      if (!re) {
        break;
      }
      var url = this.images[re[2]] || re[2];
      line = line.slice(0, re.index) + '<img src="' + url + '" alt="' + re[1] + '">' + line.slice(re.index + re[0].length);
    }
    line = line.replace(/\[([^\]]*)\]\(([^)]*)\)/g, '<a href="$2">$1</a>');
    if (parEl === "p" && /^<img /.test(line) && !/^.+<img/.test(line)) {
      html += '<p class="md parimg">' + line + "</" + parEl + ">\n";
    } else {
      html += "<" + parEl + ' class="md">' + line + "</" + parEl + ">\n";
    }
  }, this);
  return html;
};
A3a.vpl.DynamicHelp.prototype.generate = function(language, buttons, blocks, docTemplates) {
  var docTemplate = docTemplates && docTemplates[language] ? "<div style='padding: 2em; max-width: 60em; margin-left: auto; margin-right: auto;'>\n" + docTemplates[language] + "</div>\n" : "<html>\n" + "<style>\n" + "body {font-family: sans-serif;}\n" + "img {float: left; margin-right: 10px; margin-bottom: 20px;}\n" + "h1, h2, hr {clear: left;}\n" + "p {margin-left: 120px}\n" + "p.parimg {margin-left: 0}\n" + "</style>\n" + "<body>\n" + "<div style='padding: 2em; max-width: 60em; margin-left: auto; margin-right: auto;'>\n" + 
  "BUTTONS" + "<hr>\n" + "BLOCKS" + "</div>\n" + "</body>\n" + "</html>\n";
  var htmlButtons = "";
  buttons.forEach(function(commandId) {
    var frag = this.get(language, "buttons", commandId);
    if (frag) {
      htmlButtons += this.convertToHTML(frag);
    }
  }, this);
  var htmlBlocks = "";
  blocks.forEach(function(blockId) {
    var frag = this.get(language, "blocks", blockId);
    if (frag) {
      htmlBlocks += this.convertToHTML(frag);
    }
  }, this);
  return docTemplate.replace("BUTTONS", htmlButtons).replace("BLOCKS", htmlBlocks);
};
A3a.vpl.Program = function(mode, uiConfig) {
  this.filename = null;
  this.readOnly = false;
  this.mode = mode || A3a.vpl.mode.basic;
  this.noVPL = false;
  this.teacherRole = A3a.vpl.Program.teacherRoleType.student;
  this.experimentalFeatures = false;
  this.volume = null;
  this.program = [];
  this.slowdownFactor = 1;
  this.uploaded = false;
  this.notUploadedYet = true;
  this.uploadedToServer = false;
  this.flashed = false;
  this.onUpdate = null;
  this.saveChanges = null;
  this.getEditedSourceCodeFun = null;
  this.setEditedSourceCodeFun = null;
  this.undoState = new A3a.vpl.Undo;
  this.code = {};
  this.currentLanguage = A3a.vpl.defaultLanguage;
  this.message = null;
  this.enabledBlocksBasic = A3a.vpl.Program.basicBlocks;
  this.multiEventBasic = A3a.vpl.Program.basicMultiEvent;
  this.enabledBlocksAdvanced = A3a.vpl.Program.advancedBlocks;
  this.multiEventAdvanced = A3a.vpl.Program.advancedMultiEvent;
  this.uiConfig = uiConfig || new A3a.vpl.UIConfig;
  this.logger = null;
};
A3a.vpl.Program.mimetype = "application/x-vpl3";
A3a.vpl.Program.suffix = "vpl3";
A3a.vpl.Program.defaultFilename = "program." + A3a.vpl.Program.suffix;
A3a.vpl.Program.mimetypeUI = "application/x-vpl3-ui";
A3a.vpl.Program.suffixUI = "vpl3ui";
A3a.vpl.Program.defaultFilenameUI = "ui." + A3a.vpl.Program.suffixUI;
A3a.vpl.Program.codeGenerator = {};
A3a.vpl.Program.advancedModeEnabled = true;
A3a.vpl.Program.basicBlocks = [];
A3a.vpl.Program.basicMultiEvent = false;
A3a.vpl.Program.advancedMultiEvent = true;
A3a.vpl.Program.advancedBlocks = [];
A3a.vpl.Program.resetBlockLib = function() {
  A3a.vpl.Program.basicBlocks = A3a.vpl.BlockTemplate.getBlocksByMode(A3a.vpl.mode.basic).map(function(b) {
    return b.name;
  });
  A3a.vpl.Program.advancedBlocks = A3a.vpl.BlockTemplate.getBlocksByMode(A3a.vpl.mode.advanced).map(function(b) {
    return b.name;
  });
};
A3a.vpl.Program.enableAllBlocks = function(mode) {
  var blocks = A3a.vpl.BlockTemplate.lib.map(function(b) {
    return b.name;
  });
  switch(mode) {
    case A3a.vpl.mode.basic:
      A3a.vpl.Program.basicBlocks = blocks;
      break;
    case A3a.vpl.mode.advanced:
      A3a.vpl.Program.advancedBlocks = blocks;
      break;
  }
};
A3a.vpl.Program.prototype.resetUI = function() {
  this.uiConfig.reset();
};
A3a.vpl.Program.prototype.new = function(resetUndoStack) {
  if (resetUndoStack) {
    this.undoState.reset();
  } else {
    this.saveStateBeforeChange();
  }
  this.mode = A3a.vpl.mode.basic;
  this.enabledBlocksBasic = A3a.vpl.Program.basicBlocks;
  this.multiEventBasic = A3a.vpl.Program.basicMultiEvent;
  this.enabledBlocksAdvanced = A3a.vpl.Program.advancedBlocks;
  this.multiEventAdvanced = A3a.vpl.Program.advancedMultiEvent;
  this.program = [];
  this.code = {};
  this.notUploadedYet = true;
  this.enforceSingleTrailingEmptyEventHandler();
};
A3a.vpl.Program.prototype.isEmpty = function() {
  for (var i = 0; i < this.program.length; i++) {
    if (!this.program[i].isEmpty()) {
      return false;
    }
  }
  return true;
};
A3a.vpl.Program.prototype.getError = function() {
  for (var i = 0; i < this.program.length; i++) {
    if (this.program[i].error !== null) {
      return this.program[i].error;
    }
  }
  return null;
};
A3a.vpl.Program.prototype.displaySingleEvent = function() {
  if (this.mode === A3a.vpl.mode.basic ? this.multiEventBasic : this.multiEventAdvanced) {
    return false;
  }
  for (var i = 0; i < this.program.length; i++) {
    if (this.program[i].events.length > 1 || this.program[i].events.length > 0 && this.program[i].events[0].blockTemplate.type === A3a.vpl.blockType.state) {
      return false;
    }
  }
  return true;
};
A3a.vpl.Program.prototype.setSlowdownFactor = function(slowdownFactor) {
  this.slowdownFactor = slowdownFactor;
};
A3a.vpl.Program.prototype.invalidateCode = function() {
  this.code = {};
};
A3a.vpl.Program.prototype.saveStateBeforeChange = function() {
  this.undoState.saveStateBeforeChange(this.exportToObject(), {uploaded:this.uploaded, uploadedToServer:this.uploadedToServer, flashed:this.flashed});
  this.code = {};
  this.uploaded = false;
  this.uploadedToServer = false;
  this.flashed = false;
};
A3a.vpl.Program.prototype.saveStateAfterChange = function() {
  if (this.saveChanges) {
    this.saveChanges();
  }
};
A3a.vpl.Program.prototype.undo = function(updateFun) {
  if (this.undoState.canUndo()) {
    var markedState = this.undoState.undo(this.exportToObject(), {uploaded:this.uploaded, uploadedToServer:this.uploadedToServer, flashed:this.flashed});
    this.importFromObject(markedState.state, updateFun);
    this.uploaded = markedState.marks.uploaded;
    this.uploadedToServer = markedState.marks.uploadedToServer;
    this.flashed = markedState.marks.flashed;
    this.code = {};
  }
};
A3a.vpl.Program.prototype.redo = function(updateFun) {
  if (this.undoState.canRedo()) {
    var markedState = this.undoState.redo(this.exportToObject(), {uploaded:this.uploaded, uploadedToServer:this.uploadedToServer, flashed:this.flashed});
    this.importFromObject(markedState.state, updateFun);
    this.uploaded = markedState.marks.uploaded;
    this.uploadedToServer = markedState.marks.uploadedToServer;
    this.flashed = markedState.marks.flashed;
    this.code = {};
  }
};
A3a.vpl.Program.prototype.setMode = function(mode) {
  if (mode !== this.mode) {
    this.saveStateBeforeChange();
    this.mode = mode;
    this.program.forEach(function(rule) {
      function convertBlock(block, isState) {
        return block;
      }
      rule.events.forEach(function(event, i) {
        rule.events[i] = convertBlock(event);
      });
      rule.actions.forEach(function(action, i) {
        rule.actions[i] = convertBlock(action);
      });
    });
  }
};
A3a.vpl.Program.teacherRoleType = {student:"s", teacher:"t", customizableBlocks:"custb"};
A3a.vpl.Program.prototype.setTeacherRole = function(teacherRole) {
  this.teacherRole = teacherRole;
};
A3a.vpl.Program.prototype.addEventHandler = function() {
  this.program.push(new A3a.vpl.Rule);
  this.enforceSingleTrailingEmptyEventHandler();
};
A3a.vpl.Program.prototype.addComment = function(comment, position) {
  var ruleComment = new A3a.vpl.RuleComment(comment);
  if (position != null && position < this.program.length) {
    this.program.splice(position, 0, ruleComment);
  } else {
    if (this.program.length === 0 || !this.program[this.program.length - 1].isEmpty()) {
      position = this.program.length;
      this.program.push(ruleComment);
    } else {
      position = this.program.length - 1;
      this.program.splice(position, 0, ruleComment);
    }
  }
  this.enforceSingleTrailingEmptyEventHandler();
  return position;
};
A3a.vpl.Program.prototype.enforceSingleTrailingEmptyEventHandler = function() {
  if (this.program.length === 0 || !this.program[this.program.length - 1].isEmpty()) {
    this.addEventHandler();
  } else {
    while (this.program.length > 1 && this.program[this.program.length - 2].isEmpty()) {
      this.program.splice(-2, 1);
    }
  }
};
A3a.vpl.Program.prototype.exportToObject = function(opt) {
  var obj = {};
  if (!opt || opt.lib !== false) {
    obj["basicBlocks"] = this.enabledBlocksBasic;
    obj["basicMultiEvent"] = this.multiEventBasic;
    if (A3a.vpl.Program.advancedModeEnabled) {
      obj["advanced"] = this.mode === A3a.vpl.mode.advanced;
      obj["advancedBlocks"] = this.enabledBlocksAdvanced;
      obj["advancedMultiEvent"] = this.multiEventAdvanced;
    }
    obj["disabledUI"] = this.uiConfig.disabledUI;
  }
  if (opt && opt.prog === false) {
    return obj;
  }
  var src = this.getEditedSourceCodeFun ? this.getEditedSourceCodeFun() : null;
  var p = null;
  if (src == null) {
    p = this.program.map(function(rule) {
      var b = [];
      function addBlock(block) {
        if (block) {
          b.push({"name":block.blockTemplate.name, "disabled":block.disabled, "locked":block.locked, "param":block.blockTemplate.exportParam ? block.blockTemplate.exportParam(block) : block.param ? block.param.slice() : null});
        }
      }
      if (rule instanceof A3a.vpl.RuleComment) {
        return {"comment":rule.comment, "disabled":rule.disabled, "locked":rule.locked};
      } else {
        rule.events.forEach(function(event) {
          addBlock(event);
        });
        rule.actions.forEach(function(action) {
          addBlock(action);
        });
        return {"blocks":b, "disabled":rule.disabled, "locked":rule.locked};
      }
    });
  }
  obj["program"] = p;
  obj["code"] = src;
  return obj;
};
A3a.vpl.Program.prototype.exportToJSON = function(opt) {
  return JSON.stringify(this.exportToObject(opt), null, "\t");
};
A3a.vpl.Program.ImportOptions;
A3a.vpl.Program.prototype.importFromObject = function(obj, updateFun, options) {
  var self = this;
  var importFinished = false;
  var view = "vpl";
  try {
    if (obj) {
      if (obj["disabledUI"] && (!options || !options.dontChangeUI)) {
        this.uiConfig.setDisabledFeatures(obj["disabledUI"]);
      }
      if (!options || !options.dontChangeBlocks) {
        var isAdvanced = obj["advanced"] == true;
        if (A3a.vpl.Program.advancedModeEnabled) {
          this.mode = isAdvanced ? A3a.vpl.mode.advanced : A3a.vpl.mode.basic;
          this.enabledBlocksBasic = obj["basicBlocks"] || A3a.vpl.Program.basicBlocks;
          this.multiEventBasic = obj["basicMultiEvent"] !== undefined ? obj["basicMultiEvent"] : A3a.vpl.Program.basicMultiEvent;
          this.enabledBlocksAdvanced = obj["advancedBlocks"] || A3a.vpl.Program.advancedBlocks;
          this.multiEventAdvanced = obj["advancedMultiEvent"] !== undefined ? obj["advancedMultiEvent"] : A3a.vpl.Program.advancedMultiEvent;
        } else {
          this.mode = A3a.vpl.mode.basic;
          this.enabledBlocksBasic = isAdvanced ? obj["advancedBlocks"] || A3a.vpl.Program.advancedBlocks : obj["basicBlocks"] || A3a.vpl.Program.basicBlocks;
          this.multiEventBasic = isAdvanced ? obj["advancedMultiEvent"] !== undefined ? obj["advancedMultiEvent"] : A3a.vpl.Program.advancedMultiEvent : obj["basicMultiEvent"] !== undefined ? obj["basicMultiEvent"] : A3a.vpl.Program.basicMultiEvent;
        }
      }
      if (!options || !options.dontChangeProgram) {
        if (obj["program"]) {
          this.program = obj["program"].map(function(rule) {
            if (rule.hasOwnProperty("comment")) {
              var rc = new A3a.vpl.RuleComment(rule.comment);
              rc.disabled = rule["disabled"] || false;
              rc.locked = rule["locked"] || false;
              return rc;
            } else {
              var eh = new A3a.vpl.Rule;
              rule["blocks"].forEach(function(block) {
                var bt = A3a.vpl.BlockTemplate.findByName(block["name"]);
                if (bt) {
                  var b = new A3a.vpl.Block(bt, null, null);
                  b.disabled = block["disabled"] || false;
                  b.locked = block["locked"] || false;
                  if (bt.importParam) {
                    bt.importParam(b, block["param"], function() {
                      if (importFinished && updateFun) {
                        updateFun("vpl");
                      }
                    });
                  } else {
                    b.param = block["param"];
                  }
                  eh.setBlock(b, null, function() {
                    self.saveStateBeforeChange();
                  }, function() {
                    self.saveStateAfterChange();
                  }, true);
                }
              }, this);
              eh.disabled = rule["disabled"] || false;
              eh.locked = rule["locked"] || false;
              return eh;
            }
          }, this);
        } else {
          this.program = [];
        }
        if (this.setEditedSourceCodeFun) {
          var code = obj["code"];
          this.setEditedSourceCodeFun(obj["code"] == undefined ? null : code);
          if (code != null) {
            view = "src";
          }
        }
      }
    }
  } catch (e) {
  }
  this.enforceSingleTrailingEmptyEventHandler();
  this.noVPL = view === "src";
  updateFun && updateFun(view);
  importFinished = true;
};
A3a.vpl.Program.prototype.importFromJSON = function(json, updateFun, options) {
  try {
    var obj = JSON.parse(json);
    this.importFromObject(obj, updateFun, options);
    this.undoState.reset();
  } catch (e) {
  }
};
A3a.vpl.Program.prototype.getCode = function(language) {
  if (typeof this.code[language] !== "string") {
    var codeGenerator = A3a.vpl.Program.codeGenerator[language];
    this.code[language] = codeGenerator.generate(this);
  }
  return this.code[language];
};
A3a.vpl.Program.prototype.getCodeLocation = function(language, ref) {
  var codeGenerator = A3a.vpl.Program.codeGenerator[language];
  var pos1 = codeGenerator.findMark(ref, true);
  var pos2 = codeGenerator.findMark(ref, false);
  return pos1 >= 0 && pos2 >= 0 ? {begin:pos1, end:pos2} : null;
};
A3a.vpl.Program.prototype.codeForActions = function(rule, language) {
  var codeGenerator = A3a.vpl.Program.codeGenerator[language];
  return codeGenerator.generate(this, rule.actions);
};
A3a.vpl.Program.prototype.codeForBlock = function(block, language) {
  var codeGenerator = A3a.vpl.Program.codeGenerator[language];
  return codeGenerator.generate(this, [block]);
};
A3a.vpl.Program.prototype.setLogger = function(logger) {
  this.logger = logger;
};
A3a.vpl.Program.prototype.log = function(data) {
  if (this.logger) {
    this.logger(data);
  }
};
A3a.vpl.CodeGenerator = function(language, andOperator, trueConstant) {
  this.language = language;
  this.andOperator = andOperator;
  this.trueConstant = trueConstant;
  this.marks = [];
};
A3a.vpl.CodeGenerator.Mark = function(id, ref, isBegin) {
  this.id = id;
  this.ref = ref;
  this.isBegin = isBegin;
  if (id < 0 || id > 63743 - 57344) {
    throw "internal";
  }
  this.str = String.fromCharCode(57344 + id);
  this.pos = -1;
};
A3a.vpl.CodeGenerator.Mark.prototype.findInCode = function(code) {
  return code.indexOf(this.str);
};
A3a.vpl.CodeGenerator.Mark.getMarksInCode = function(code) {
  var marks = [];
  for (var i = 0; i < code.length; i++) {
    if (code.charCodeAt(i) >= 57344 && code.charCodeAt(i) <= 63743) {
      var mark = new A3a.vpl.CodeGenerator.Mark(code.charCodeAt(i) - 57344, null, false);
      mark.pos = i - marks.length;
      marks.push(mark);
    }
  }
  return marks;
};
A3a.vpl.CodeGenerator.Mark.extract = function(a, code) {
  a.forEach(function(mark) {
    mark.pos = mark.findInCode(code);
  });
  a.sort(function(a, b) {
    return a.pos - b.pos;
  });
  for (var i = 0; i < a.length; i++) {
    a[i].pos -= i;
    code = code.replace(a[i].str, "");
  }
  a.forEach(function(mark) {
    var i;
    if (mark.isBegin) {
      while (true) {
        for (i = mark.pos; code[i] === " " || code[i] === "\t"; i++) {
        }
        if (code[i] === "\n") {
          mark.pos = i + 1;
        } else {
          break;
        }
      }
      if (code[mark.pos - 1] === " " || code[mark.pos - 1] === "\t") {
        for (i = mark.pos - 1; code[i] === " " || code[i] === "\t"; i--) {
        }
        if (code[i] === "\n") {
          mark.pos = i + 1;
        }
      }
    } else {
      if (code[mark.pos - 1] === " " || code[mark.pos - 1] === "\t") {
        for (i = mark.pos - 1; code[i] === " " || code[i] === "\t"; i--) {
        }
        if (code[i] === "\n") {
          mark.pos = i + 1;
        }
      }
    }
  });
  return code;
};
A3a.vpl.CodeGenerator.Mark.remove = function(code) {
  return code.replace(/[\ue000-\uf8ff]/g, "");
};
A3a.vpl.CodeGenerator.prototype.bracket = function(code, ref) {
  var id = this.marks.length;
  var mark1 = new A3a.vpl.CodeGenerator.Mark(id, ref, true);
  this.marks.push(mark1);
  var mark2 = new A3a.vpl.CodeGenerator.Mark(id + 1, ref, false);
  this.marks.push(mark2);
  return mark1.str + code + mark2.str;
};
A3a.vpl.CodeGenerator.prototype.findMark = function(ref, isBegin) {
  for (var i = 0; i < this.marks.length; i++) {
    if (this.marks[i].ref === ref && this.marks[i].isBegin === isBegin) {
      return this.marks[i].pos;
    }
  }
  return -1;
};
A3a.vpl.CodeGenerator.prototype.generateCodeForEventHandler = function(rule, program) {
  if (rule.disabled || rule.isEmpty()) {
    return {};
  }
  rule.error = null;
  var hasEvent = false;
  var hasState = false;
  for (var i = 0; i < rule.events.length; i++) {
    if (!rule.events[i].disabled) {
      if (rule.events[i].blockTemplate.type === A3a.vpl.blockType.event) {
        hasEvent = true;
        if (rule.events[i].blockTemplate.validate) {
          var err = rule.events[i].blockTemplate.validate(rule.events[i]);
          if (err) {
            err.addEventError([i]);
            if (!err.isWarning || !rule.error) {
              rule.error = err;
              if (!err.isWarning) {
                return {error:err};
              }
            }
          }
        }
      } else {
        if (rule.events[i].blockTemplate.type === A3a.vpl.blockType.state) {
          hasState = true;
        }
      }
      if ((rule.events[i].blockTemplate.type === A3a.vpl.blockType.event || rule.events[i].blockTemplate.type === A3a.vpl.blockType.state) && rule.error === null) {
        for (var j = i + 1; j < rule.events.length; j++) {
          if (!rule.events[j].disabled && rule.events[j].blockTemplate === rule.events[i].blockTemplate) {
            var err = new A3a.vpl.Error("Same block used multiple times", true);
            err.addEventError([i, j]);
            rule.error = err;
          }
        }
      }
    }
  }
  var hasAction = false;
  for (var i = 0; i < rule.actions.length; i++) {
    if (!rule.actions[i].disabled && rule.actions[i].blockTemplate.type === A3a.vpl.blockType.action) {
      hasAction = true;
      break;
    }
  }
  if (!hasEvent && !hasAction) {
    return rule.error ? {error:rule.error} : {};
  }
  if (!hasEvent && !hasState) {
    var err = new A3a.vpl.Error("Missing event block");
    err.addEventError([]);
    rule.error = err;
    return {error:err};
  }
  if (!hasAction) {
    var err = new A3a.vpl.Error("Missing action block");
    err.addActionError(0);
    rule.error = err;
    return {error:err};
  } else {
    if (!rule.error) {
      for (var i = 0; i < rule.actions.length; i++) {
        if (!rule.actions[i].disabled) {
          for (var j = i + 1; j < rule.actions.length; j++) {
            if (!rule.actions[j].disabled && rule.actions[j].blockTemplate.type === A3a.vpl.blockType.action && rule.actions[j].blockTemplate === rule.actions[i].blockTemplate) {
              var err = new A3a.vpl.Error("Same block used multiple times", true);
              err.addActionError(i);
              err.addActionError(j);
              rule.error = err;
            }
          }
        }
      }
    }
  }
  var initVarDecl = [];
  var initCodeExec = [];
  var initCodeDecl = [];
  var clause = "";
  var auxClauses = [];
  var clauseInit = "";
  var auxClausesInit = [];
  var str = "";
  rule.events.forEach(function(event, i) {
    var code = event.generateCode(this.language, program);
    if (i === 0 && code.sectionBegin) {
      if (code.clause) {
        clause = this.bracket(code.clause, event);
        if (code.clauseInit) {
          clauseInit += code.clauseInit;
        }
      }
    } else {
      if (code.clauseAsCondition || code.clause) {
        auxClauses.push(this.bracket(code.clauseAsCondition || code.clause, event));
        if (code.clauseInit) {
          auxClausesInit = auxClausesInit.concat(code.clauseInit);
        }
      }
    }
    if (code.initVarDecl) {
      initVarDecl = initVarDecl.concat(code.initVarDecl);
    }
    if (code.initCodeExec) {
      initCodeExec = initCodeExec.concat(code.initCodeExec);
    }
    if (code.initCodeDecl) {
      initCodeDecl = initCodeDecl.concat(code.initCodeDecl);
    }
    if (code.statement) {
      str += this.bracket(code.statement, event);
    }
  }, this);
  for (var i = 0; i < rule.actions.length; i++) {
    var code = rule.actions[i].generateCode(this.language, program);
    str += code.statement ? this.bracket(code.statement, rule.actions[i]) : "";
    if (code.initVarDecl) {
      code.initVarDecl.forEach(function(frag) {
        if (initVarDecl.indexOf(frag) < 0) {
          initVarDecl.push(frag);
        }
      });
    }
    if (code.initCodeExec) {
      code.initCodeExec.forEach(function(frag) {
        if (initCodeExec.indexOf(frag) < 0) {
          initCodeExec.push(frag);
        }
      });
    }
    if (code.initCodeDecl) {
      code.initCodeDecl.forEach(function(frag) {
        if (initCodeDecl.indexOf(frag) < 0) {
          initCodeDecl.push(frag);
        }
      });
    }
  }
  if (str.length > 0) {
    var eventCode = rule.events[0].blockTemplate.type === A3a.vpl.blockType.event ? rule.events[0].generateCode(this.language, program) : null;
    var auxEventCode = rule.events.slice(1).filter(function(eb) {
      return eb.blockTemplate.type === A3a.vpl.blockType.event;
    }).map(function(eb) {
      return eb.generateCode(this.language, program);
    }, this);
    return {firstEventType:rule.events[0] ? rule.events[0].blockTemplate.name : "", initVarDecl:initVarDecl, initCodeExec:initCodeExec, initCodeDecl:initCodeDecl, sectionBegin:eventCode ? eventCode.sectionBegin : "", sectionEnd:eventCode ? eventCode.sectionEnd : "", sectionPreamble:eventCode ? eventCode.sectionPreamble : "", auxSectionBegin:auxEventCode.map(function(ec) {
      return ec.sectionBegin || "";
    }), auxSectionEnd:auxEventCode.map(function(ec) {
      return ec.sectionEnd || "";
    }), auxSectionPreamble:auxEventCode.map(function(ec) {
      return ec.sectionPreamble || "";
    }), clauseInit:clauseInit, auxClausesInit:auxClausesInit, clause:clause, auxClauses:auxClauses.join(" " + this.andOperator + " "), statement:(eventCode && eventCode.statement || "") + str};
  } else {
    return {};
  }
};
A3a.vpl.CodeGenerator.prototype.generateCodeForVolume = function(program) {
  if (program.volume !== null) {
    var volumeTemplate = A3a.vpl.BlockTemplate.findByName("!volume");
    if (volumeTemplate !== null) {
      var block = new A3a.vpl.Block(volumeTemplate, null, null);
      block.param = [program.volume];
      var volumeGenCode = volumeTemplate && volumeTemplate.genCode[this.language];
      if (volumeGenCode) {
        return "\n" + volumeGenCode(block).statement;
      }
    }
  }
  return "";
};
A3a.vpl.CodeGenerator.prototype.reset = function() {
  this.marks = [];
};
A3a.vpl.CodeGenerator.prototype.generate = function(program, runBlocks) {
  throw "internal";
};
A3a.vpl.CodeGenerator.prototype.generateMissingCodeForBlock = function(block, program) {
  throw "internal";
};
A3a.vpl.CodeGeneratorA3a = function() {
  A3a.vpl.CodeGenerator.call(this, "aseba", "and", "1 == 1");
};
A3a.vpl.CodeGeneratorA3a.prototype = Object.create(A3a.vpl.CodeGenerator.prototype);
A3a.vpl.CodeGeneratorA3a.prototype.constructor = A3a.vpl.CodeGeneratorA3a;
A3a.vpl.CodeGeneratorA3a.prototype.generate = function(program, runBlocks) {
  this.reset();
  var c = program.program.map(function(rule) {
    return this.generateCodeForEventHandler(rule, program);
  }, this);
  var sections = {};
  var sectionList = [];
  c.forEach(function(evCode) {
    if (evCode.sectionBegin) {
      sections[evCode.sectionBegin] = {sectionBegin:evCode.sectionBegin, sectionEnd:evCode.sectionEnd, sectionPreamble:evCode.sectionPreamble, clauseInit:"", clauseAssignment:""};
      if (sectionList.indexOf(evCode.sectionBegin) < 0) {
        sectionList.push(evCode.sectionBegin);
      }
    }
    if (evCode.auxSectionBegin) {
      evCode.auxSectionBegin.forEach(function(sectionBegin, i) {
        sections[sectionBegin] = {sectionBegin:sectionBegin, sectionEnd:evCode.auxSectionEnd[i], sectionPreamble:evCode.auxSectionPreamble[i], clauseInit:"", clauseAssignment:""};
        if (sectionList.indexOf(sectionBegin) < 0) {
          sectionList.push(sectionBegin);
        }
      });
    }
  });
  var initVarDecl = [];
  var initCodeExec = [];
  var initCodeDecl = [];
  var clauses = [];
  c.forEach(function(evCode, i) {
    evCode.initVarDecl && evCode.initVarDecl.forEach(function(fr) {
      if (initVarDecl.indexOf(fr) < 0) {
        initVarDecl.push(fr);
      }
    });
    evCode.initCodeExec && evCode.initCodeExec.forEach(function(fr) {
      if (initCodeExec.indexOf(fr) < 0) {
        initCodeExec.push(fr);
      }
    });
    evCode.initCodeDecl && evCode.initCodeDecl.forEach(function(fr) {
      if (initCodeDecl.indexOf(fr) < 0) {
        initCodeDecl.push(fr);
      }
    });
    if (evCode.sectionBegin) {
      evCode.clauseIndex = clauses.indexOf(A3a.vpl.CodeGenerator.Mark.remove(evCode.clause || evCode.sectionBegin));
      if (evCode.clauseIndex < 0) {
        evCode.clauseIndex = clauses.length;
        clauses.push(A3a.vpl.CodeGenerator.Mark.remove(evCode.clause || evCode.sectionBegin));
        var section = sections[evCode.sectionBegin];
        if (evCode.clauseInit && section.clauseInit.indexOf(evCode.clauseInit) < 0) {
          section.clauseInit += evCode.clauseInit;
        }
        section.clauseAssignment += evCode.clause ? "when " + evCode.clause + " do\n" + "eventCache[" + evCode.clauseIndex + "] = 1\n" + "end\n" : "eventCache[" + evCode.clauseIndex + "] = 1\n";
      }
    }
    if (!evCode.sectionBegin) {
      evCode.statement = this.bracket(evCode.statement || "", program.program[i]);
    }
  }, this);
  var runBlocksCodeStatement = "";
  if (runBlocks) {
    var rule = new A3a.vpl.Rule;
    var initBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("init"), null, null);
    rule.setBlock(initBlock, null, null, null);
    runBlocks.forEach(function(block) {
      rule.setBlock(block, null, null, null);
    });
    var runBlocksCode = this.generateCodeForEventHandler(rule, program);
    var runBlockPrerequisite = true;
    runBlocksCode.initVarDecl.forEach(function(fr) {
      if (initVarDecl.indexOf(fr) < 0) {
        runBlockPrerequisite = false;
      }
    });
    runBlocksCode.initCodeDecl.forEach(function(fr) {
      if (initCodeDecl.indexOf(fr) < 0) {
        runBlockPrerequisite = false;
      }
    });
    if (runBlockPrerequisite) {
      runBlocksCodeStatement = runBlocksCode.statement;
    } else {
      if (runBlocksCode.statementWithoutInit) {
        runBlocksCodeStatement = runBlocksCode.statementWithoutInit;
      }
    }
  }
  var auxClausesInit = [];
  var actionsTestCode = "";
  var actionsExecCode = "";
  var actionTestCount = 0;
  for (var i = 0; i < program.program.length; i++) {
    if (c[i].clauseIndex >= 0) {
      c[i].auxClausesInit && c[i].auxClausesInit.forEach(function(cl) {
        if (auxClausesInit.indexOf(cl) < 0) {
          auxClausesInit.push(cl);
        }
      });
      actionsTestCode += "if eventCache[" + c[i].clauseIndex + "] != 0" + (c[i].auxClauses ? " and " + c[i].auxClauses : "") + " then\n" + "todo[" + actionTestCount + "] = 1\n" + "end\n";
      actionsExecCode += "if todo[" + actionTestCount + "] != 0 then\n" + c[i].statement + "end\n";
      actionTestCount++;
    } else {
      if (c[i].auxClauses) {
        actionsTestCode += "when " + c[i].auxClauses + " do\n" + "todo[" + actionTestCount + "] = 1\n" + "end\n";
        actionsExecCode += "if todo[" + actionTestCount + "] != 0 then\n" + c[i].statement + "end\n";
        actionTestCount++;
      }
    }
  }
  var str = initVarDecl.length > 0 ? "\n" + initVarDecl.join("\n") : "";
  if (clauses.length > 0) {
    str += "var eventCache[] = [" + clauses.map(function() {
      return "0";
    }).join(", ") + "]\n";
  }
  if (actionTestCount > 0) {
    str += "var todo[] = [";
    for (var i = 0; i < actionTestCount; i++) {
      str += i > 0 ? ", 0" : "0";
    }
    str += "]\n";
  }
  if (runBlocks) {
    str += "\n" + runBlocksCodeStatement;
  } else {
    if (initCodeExec.length > 0) {
      str += "\n" + initCodeExec.join("\n");
    }
    if (actionsTestCode) {
      str += (str.length > 0 ? "\n" : "") + "timer.period[1] = 50\n";
    }
  }
  for (var i = 0; i < sectionList.length; i++) {
    if (!/onevent/.test(sections[sectionList[i]].sectionBegin) && (sections[sectionList[i]].sectionPreamble || sections[sectionList[i]].clauseInit || sections[sectionList[i]].clauseAssignment)) {
      str += "\n" + (sections[sectionList[i]].sectionBegin || "") + (sections[sectionList[i]].sectionPreamble || "") + (sections[sectionList[i]].clauseInit || "") + (sections[sectionList[i]].clauseAssignment || "") + (sections[sectionList[i]].sectionEnd || "");
    }
  }
  str += this.generateCodeForVolume(program);
  if (initCodeDecl.length > 0) {
    str += "\n" + initCodeDecl.join("\n");
  }
  for (var i = 0; i < sectionList.length; i++) {
    if (/onevent/.test(sections[sectionList[i]].sectionBegin) && (sections[sectionList[i]].sectionPreamble || sections[sectionList[i]].clauseInit || sections[sectionList[i]].clauseAssignment)) {
      str += "\n" + (sections[sectionList[i]].sectionBegin || "") + (sections[sectionList[i]].sectionPreamble || "") + (sections[sectionList[i]].clauseInit || "") + (sections[sectionList[i]].clauseAssignment || "") + (sections[sectionList[i]].sectionEnd || "");
    }
  }
  if (actionsTestCode) {
    str += "\nonevent timer1\n" + auxClausesInit.join("") + actionsTestCode + actionsExecCode;
    for (var i = 0; i < clauses.length; i++) {
      str += "eventCache[" + i + "] = 0\n";
    }
    for (var i = 0; i < actionTestCount; i++) {
      str += "todo[" + i + "] = 0\n";
    }
  }
  if (str[0] === "\n") {
    str = str.slice(1);
  }
  var indent = 0;
  var lines = str.split("\n").map(function(line) {
    return line.trim();
  }).map(function(line) {
    function startsWithAnyOf(a) {
      var line1 = A3a.vpl.CodeGenerator.Mark.remove(line);
      for (var i = 0; i < a.length; i++) {
        if (line1.slice(0, a[i].length) === a[i] && !/^\w/.test(line1.slice(a[i].length))) {
          return true;
        }
      }
      return false;
    }
    if (line.length > 0) {
      var preDec = startsWithAnyOf(["else", "elseif", "end", "onevent", "sub"]);
      var postInc = startsWithAnyOf(["if", "else", "elseif", "for", "onevent", "sub", "when", "while"]);
      if (preDec) {
        indent = Math.max(indent - 1, 0);
      }
      line = "\t\t\t\t\t".slice(0, indent) + line;
      if (postInc) {
        indent++;
      }
    }
    return line;
  });
  for (var i = lines.length - 2; i >= 0; i--) {
    if (/^\s*#/.test(lines[i])) {
      var nextLineInitialBlanks = lines[i + 1].replace(/^(\s*).*$/, "$1");
      lines[i] = nextLineInitialBlanks + lines[i].replace(/^\s*/, "");
    }
  }
  str = lines.join("\n");
  for (var i = 0; i < program.program.length; i++) {
    for (var j = i + 1; j < program.program.length; j++) {
      program.program[i].checkConflicts(program.program[j]);
    }
  }
  str = A3a.vpl.CodeGenerator.Mark.extract(this.marks, str);
  return str;
};
A3a.vpl.CodeGeneratorA3a.prototype.generateMissingCodeForBlock = function(block, program) {
  var code = "# missing Aseba implementation for block " + block.blockTemplate.name + "\n";
  switch(block.blockTemplate.type) {
    case A3a.vpl.blockType.event:
    case A3a.vpl.blockType.state:
      return {clauseInit:code, clause:"1 == 1"};
    case A3a.vpl.blockType.action:
      return {statement:code};
    default:
      return {};
  }
};
A3a.vpl.Program.codeGenerator["aseba"] = new A3a.vpl.CodeGeneratorA3a;
A3a.vpl.CodeGeneratorL2 = function() {
  A3a.vpl.CodeGenerator.call(this, "l2", "&&", "true");
};
A3a.vpl.CodeGeneratorL2.prototype = Object.create(A3a.vpl.CodeGenerator.prototype);
A3a.vpl.CodeGeneratorL2.prototype.constructor = A3a.vpl.CodeGeneratorL2;
A3a.vpl.CodeGeneratorL2.prototype.generate = function(program, runBlocks) {
  this.reset();
  var c = program.program.map(function(rule) {
    return this.generateCodeForEventHandler(rule, program);
  }, this);
  var sections = {};
  var sectionList = [];
  c.forEach(function(evCode) {
    if (evCode.sectionBegin) {
      sections[evCode.sectionBegin] = {sectionBegin:evCode.sectionBegin, sectionEnd:evCode.sectionEnd, sectionPreamble:evCode.sectionPreamble, clauseInit:"", clauseAssignment:""};
      if (sectionList.indexOf(evCode.sectionBegin) < 0) {
        sectionList.push(evCode.sectionBegin);
      }
    }
    if (evCode.auxSectionBegin) {
      evCode.auxSectionBegin.forEach(function(sectionBegin, i) {
        sections[sectionBegin] = {sectionBegin:sectionBegin, sectionEnd:evCode.auxSectionEnd[i], sectionPreamble:evCode.auxSectionPreamble[i], clauseInit:"", clauseAssignment:""};
        if (sectionList.indexOf(sectionBegin) < 0) {
          sectionList.push(sectionBegin);
        }
      });
    }
  });
  var initVarDecl = [];
  var initCodeExec = [];
  var initCodeDecl = [];
  var clauses = [];
  c.forEach(function(evCode, i) {
    evCode.initVarDecl && evCode.initVarDecl.forEach(function(fr) {
      if (initVarDecl.indexOf(fr) < 0) {
        initVarDecl.push(fr);
      }
    });
    evCode.initCodeExec && evCode.initCodeExec.forEach(function(fr) {
      if (initCodeExec.indexOf(fr) < 0) {
        initCodeExec.push(fr);
      }
    });
    evCode.initCodeDecl && evCode.initCodeDecl.forEach(function(fr) {
      if (initCodeDecl.indexOf(fr) < 0) {
        initCodeDecl.push(fr);
      }
    });
    if (evCode.sectionBegin) {
      evCode.clauseIndex = clauses.indexOf(A3a.vpl.CodeGenerator.Mark.remove(evCode.clause || evCode.sectionBegin));
      if (evCode.clauseIndex < 0) {
        evCode.clauseIndex = clauses.length;
        clauses.push(A3a.vpl.CodeGenerator.Mark.remove(evCode.clause || evCode.sectionBegin));
        var section = sections[evCode.sectionBegin];
        if (evCode.clauseInit && section.clauseInit.indexOf(evCode.clauseInit) < 0) {
          section.clauseInit += evCode.clauseInit;
        }
        section.clauseAssignment += evCode.clause ? "when (" + evCode.clause + ") {\n" + "eventCache[" + evCode.clauseIndex + "] = true;\n" + "}\n" : "eventCache[" + evCode.clauseIndex + "] = true;\n";
      }
    }
    if (!evCode.sectionBegin) {
      evCode.statement = this.bracket(evCode.statement || "", program.program[i]);
    }
  }, this);
  var runBlocksCode = "";
  if (runBlocks) {
    var rule = new A3a.vpl.Rule;
    var initBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("init"), null, null);
    rule.setBlock(initBlock, null, null, null);
    runBlocks.forEach(function(block) {
      rule.setBlock(block, null, null, null);
    });
    runBlocksCode = this.generateCodeForEventHandler(rule, program).statement;
  }
  var auxClausesInit = [];
  var actionsTestCode = "";
  var actionsExecCode = "";
  var actionTestCount = 0;
  for (var i = 0; i < program.program.length; i++) {
    if (c[i].clauseIndex >= 0) {
      c[i].auxClausesInit && c[i].auxClausesInit.forEach(function(cl) {
        if (auxClausesInit.indexOf(cl) < 0) {
          auxClausesInit.push(cl);
        }
      });
      actionsTestCode += "if (eventCache[" + c[i].clauseIndex + "]" + (c[i].auxClauses ? " && " + c[i].auxClauses : "") + ") {\n" + "todo[" + actionTestCount + "] = true;\n" + "}\n";
      actionsExecCode += "if (todo[" + actionTestCount + "]) {\n" + c[i].statement + "}\n";
      actionTestCount++;
    } else {
      if (c[i].auxClauses) {
        actionsTestCode += "when (" + c[i].auxClauses + ") {\n" + "todo[" + actionTestCount + "] = true;\n" + "}\n";
        actionsExecCode += "if (todo[" + actionTestCount + "]) {\n" + c[i].statement + "}\n";
        actionTestCount++;
      }
    }
  }
  var str = initVarDecl.length > 0 ? "\n" + initVarDecl.join("\n") : "";
  if (clauses.length > 0) {
    str += "bool eventCache[" + clauses.length + "] = false;\n";
  }
  if (runBlocks) {
    str += "\n" + runBlocksCode;
  } else {
    var strInit = "";
    if (initCodeExec.length > 0) {
      strInit += "\n" + initCodeExec.join("\n");
    }
    if (strInit) {
      str += (str.length > 0 ? "\n" : "") + strInit.slice(1);
    }
    if (actionsTestCode) {
      str += (str.length > 0 ? "\n" : "") + "timer.period[1] = 50;\n";
    }
  }
  for (var i = 0; i < sectionList.length; i++) {
    if (!/onevent/.test(sections[sectionList[i]].sectionBegin) && (sections[sectionList[i]].sectionPreamble || sections[sectionList[i]].clauseInit || sections[sectionList[i]].clauseAssignment)) {
      str += "\n" + (sections[sectionList[i]].sectionBegin || "") + (sections[sectionList[i]].sectionPreamble || "") + (sections[sectionList[i]].clauseInit || "") + (sections[sectionList[i]].clauseAssignment || "") + (sections[sectionList[i]].sectionEnd || "");
    }
  }
  str += this.generateCodeForVolume(program);
  if (initCodeDecl.length > 0) {
    str += "\n" + initCodeDecl.join("\n");
  }
  for (var i = 0; i < sectionList.length; i++) {
    if (/onevent/.test(sections[sectionList[i]].sectionBegin) && (sections[sectionList[i]].sectionPreamble || sections[sectionList[i]].clauseInit || sections[sectionList[i]].clauseAssignment)) {
      str += "\n" + (sections[sectionList[i]].sectionBegin || "") + (sections[sectionList[i]].sectionPreamble || "") + (sections[sectionList[i]].clauseInit || "") + (sections[sectionList[i]].clauseAssignment || "") + (sections[sectionList[i]].sectionEnd || "");
    }
  }
  if (actionsTestCode) {
    str += "\nonevent timer1 {\n";
    if (actionTestCount > 0) {
      str += "bool todo[" + actionTestCount + "] = false;\n";
    }
    str += auxClausesInit.join("") + actionsTestCode + actionsExecCode + "eventCache = false;\n" + "}\n";
  }
  if (str[0] === "\n") {
    str = str.slice(1);
  }
  var indent = 0;
  var lines = str.split("\n").map(function(line) {
    return line.trim();
  }).map(function(line) {
    var line1 = A3a.vpl.CodeGenerator.Mark.remove(line);
    if (line1.length > 0) {
      var preDec = line1[0] === "}";
      var postInc = line1.slice(-1) === "{";
      if (preDec) {
        indent = Math.max(indent - 1, 0);
      }
      line = "\t\t\t\t\t".slice(0, indent) + line;
      if (postInc) {
        indent++;
      }
    }
    return line;
  });
  for (var i = lines.length - 2; i >= 0; i--) {
    if (/^\s*#/.test(lines[i])) {
      var nextLineInitialBlanks = lines[i + 1].replace(/^(\s*).*$/, "$1");
      lines[i] = nextLineInitialBlanks + lines[i].replace(/^\s*/, "");
    }
  }
  str = lines.join("\n");
  for (var i = 0; i < program.program.length; i++) {
    for (var j = i + 1; j < program.program.length; j++) {
      program.program[i].checkConflicts(program.program[j]);
    }
  }
  str = A3a.vpl.CodeGenerator.Mark.extract(this.marks, str);
  return str;
};
A3a.vpl.CodeGeneratorL2.prototype.generateMissingCodeForBlock = function(block, program) {
  var code = "// missing L2 implementation for block " + block.blockTemplate.name + "\n";
  switch(block.blockTemplate.type) {
    case A3a.vpl.blockType.event:
    case A3a.vpl.blockType.state:
      return {clauseInit:code, clause:"true"};
    case A3a.vpl.blockType.action:
      return {statement:code};
    default:
      return {};
  }
};
A3a.vpl.Program.codeGenerator["l2"] = new A3a.vpl.CodeGeneratorL2;
A3a.vpl.CodeGeneratorJS = function() {
  A3a.vpl.CodeGenerator.call(this, "js", "&&", "true");
};
A3a.vpl.CodeGeneratorJS.prototype = Object.create(A3a.vpl.CodeGenerator.prototype);
A3a.vpl.CodeGeneratorJS.prototype.constructor = A3a.vpl.CodeGeneratorJS;
A3a.vpl.CodeGeneratorJS.prototype.generate = function(program, runBlocks) {
  this.reset();
  var c = program.program.map(function(rule) {
    return this.generateCodeForEventHandler(rule, program);
  }, this);
  var sections = {};
  var sectionList = [];
  c.forEach(function(evCode) {
    if (evCode.sectionBegin) {
      sections[evCode.sectionBegin] = {sectionBegin:evCode.sectionBegin, sectionEnd:evCode.sectionEnd, sectionPreamble:evCode.sectionPreamble, clauseInit:"", clauseAssignment:""};
      if (sectionList.indexOf(evCode.sectionBegin) < 0) {
        sectionList.push(evCode.sectionBegin);
      }
    }
    if (evCode.auxSectionBegin) {
      evCode.auxSectionBegin.forEach(function(sectionBegin, i) {
        sections[sectionBegin] = {sectionBegin:sectionBegin, sectionEnd:evCode.auxSectionEnd[i], sectionPreamble:evCode.auxSectionPreamble[i], clauseInit:"", clauseAssignment:""};
        if (sectionList.indexOf(sectionBegin) < 0) {
          sectionList.push(sectionBegin);
        }
      });
    }
  });
  var initVarDecl = [];
  var initCodeExec = [];
  var initCodeDecl = [];
  var clauses = [];
  var initEventIndices = [];
  var nextCond = 0;
  c.forEach(function(evCode, i) {
    evCode.initVarDecl && evCode.initVarDecl.forEach(function(fr) {
      if (initVarDecl.indexOf(fr) < 0) {
        initVarDecl.push(fr);
      }
    });
    evCode.initCodeExec && evCode.initCodeExec.forEach(function(fr) {
      if (initCodeExec.indexOf(fr) < 0) {
        initCodeExec.push(fr);
      }
    });
    evCode.initCodeDecl && evCode.initCodeDecl.forEach(function(fr) {
      if (initCodeDecl.indexOf(fr) < 0) {
        initCodeDecl.push(fr);
      }
    });
    var statement = evCode.statement || "";
    if (evCode.clause) {
      statement = "cond = " + evCode.clause + ";\n" + "if (cond && !cond0[" + nextCond + "]) {\n" + statement + "}\n" + "cond0[" + nextCond + "] = cond;\n";
      nextCond++;
    }
    if (evCode.sectionBegin) {
      evCode.clauseIndex = clauses.indexOf(A3a.vpl.CodeGenerator.Mark.remove(evCode.clause || evCode.sectionBegin));
      if (evCode.clauseIndex < 0) {
        evCode.clauseIndex = clauses.length;
        clauses.push(A3a.vpl.CodeGenerator.Mark.remove(evCode.clause || evCode.sectionBegin));
        var section = sections[evCode.sectionBegin];
        if (evCode.clauseInit && section.clauseInit.indexOf(evCode.clauseInit) < 0) {
          section.clauseInit += evCode.clauseInit;
        }
        if (evCode.clause) {
          section.clauseAssignment += "cond = " + evCode.clause + ";\n" + "if (cond && !cond0[" + nextCond + "]) {\n" + "eventCache[" + evCode.clauseIndex + "] = true;\n" + "}\n" + "cond0[" + nextCond + "] = cond;\n";
          nextCond++;
        } else {
          section.clauseAssignment += "eventCache[" + evCode.clauseIndex + "] = true;\n";
        }
      }
    }
    if (!evCode.sectionBegin) {
      evCode.statement = this.bracket(statement, program.program[i]);
    }
    if (program.program[i].getEventBlockByType("init")) {
      initEventIndices.push(i);
    }
  }, this);
  var runBlocksCode = "";
  if (runBlocks) {
    var rule = new A3a.vpl.Rule;
    var initBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("init"), null, null);
    rule.setBlock(initBlock, null, null, null);
    runBlocks.forEach(function(block) {
      rule.setBlock(block, null, null, null);
    });
    runBlocksCode = this.generateCodeForEventHandler(rule, program).statement;
  }
  var auxClausesInit = [];
  var actionsTestCode = "";
  var actionsExecCode = "";
  var actionTestCount = 0;
  for (var i = 0; i < program.program.length; i++) {
    if (c[i].clauseIndex >= 0) {
      c[i].auxClausesInit && c[i].auxClausesInit.forEach(function(cl) {
        if (auxClausesInit.indexOf(cl) < 0) {
          auxClausesInit.push(cl);
        }
      });
      actionsTestCode += "if (eventCache[" + c[i].clauseIndex + "]" + (c[i].auxClauses ? " && " + c[i].auxClauses : "") + ") {\n" + "todo[" + actionTestCount + "] = true;\n" + "}\n";
      actionsExecCode += "if (todo[" + actionTestCount + "]) {\n" + c[i].statement + "}\n";
      actionTestCount++;
    } else {
      if (c[i].auxClauses) {
        actionsTestCode += "cond = " + c[i].auxClauses + ";\n" + "if (cond && !cond0[" + nextCond + "]) {\n" + "todo[" + actionTestCount + "] = true;\n" + "}\n" + "cond0[" + nextCond + "] = cond;\n";
        nextCond++;
        actionsExecCode += "if (todo[" + actionTestCount + "]) {\n" + c[i].statement + "}\n";
        actionTestCount++;
      }
    }
  }
  if (nextCond > 0) {
    initVarDecl.unshift("var cond0;\nvar cond;\n");
    initCodeExec.unshift("cond0 = [];\n");
  }
  var str = initVarDecl.length > 0 ? "\n" + initVarDecl.join("\n") : "";
  if (clauses.length > 0) {
    str += "var eventCache = [];\n";
  }
  if (actionTestCount > 0) {
    str += "var todo = [];\n";
  }
  if (runBlocks) {
    str += "\n" + runBlocksCode;
  } else {
    var strInit = "";
    if (initCodeExec.length > 0) {
      strInit += "\n" + initCodeExec.join("\n");
    }
    if (actionsTestCode) {
      strInit += "this.setTimer(1, 0.1, true);\n";
    }
    if (strInit) {
      str += (str.length > 0 ? "\n" : "") + 'this.addEventListener("init", function (name, param) {\n' + strInit.slice(1) + "});\n";
    }
  }
  if (initCodeDecl.length > 0) {
    throw "internal error, unsupported sub/onevent in js";
  }
  for (var i = 0; i < sectionList.length; i++) {
    if (sections[sectionList[i]].sectionPreamble || sections[sectionList[i]].clauseInit || sections[sectionList[i]].clauseAssignment) {
      str += "\n" + (sections[sectionList[i]].sectionBegin || "") + (sections[sectionList[i]].sectionPreamble || "") + (sections[sectionList[i]].clauseInit || "") + (sections[sectionList[i]].clauseAssignment || "") + (sections[sectionList[i]].sectionEnd || "");
    }
  }
  if (actionsTestCode) {
    str += '\nthis.addEventListener("timer1", function (name, param) {\n' + auxClausesInit.join("") + actionsTestCode + actionsExecCode;
    for (var i = 0; i < clauses.length; i++) {
      str += "eventCache[" + i + "] = false;\n";
    }
    for (var i = 0; i < actionTestCount; i++) {
      str += "todo[" + i + "] = false;\n";
    }
  }
  if (str.trim().length > 0) {
    str += "});";
  }
  if (str[0] === "\n") {
    str = str.slice(1);
  }
  var indent = 0;
  var lines = str.split("\n").map(function(line) {
    return line.trim();
  }).map(function(line) {
    var line1 = A3a.vpl.CodeGenerator.Mark.remove(line);
    if (line1.length > 0) {
      var preDec = line1[0] === "}";
      var postInc = line1.slice(-1) === "{";
      if (preDec) {
        indent = Math.max(indent - 1, 0);
      }
      line = "\t\t\t\t\t".slice(0, indent) + line;
      if (postInc) {
        indent++;
      }
    }
    return line;
  });
  for (var i = lines.length - 2; i >= 0; i--) {
    if (/^\s*#/.test(lines[i])) {
      var nextLineInitialBlanks = lines[i + 1].replace(/^(\s*).*$/, "$1");
      lines[i] = nextLineInitialBlanks + lines[i].replace(/^\s*/, "");
    }
  }
  str = lines.join("\n");
  for (var i = 0; i < program.program.length; i++) {
    for (var j = i + 1; j < program.program.length; j++) {
      program.program[i].checkConflicts(program.program[j]);
    }
  }
  str = A3a.vpl.CodeGenerator.Mark.extract(this.marks, str);
  return str;
};
A3a.vpl.CodeGeneratorJS.prototype.generateMissingCodeForBlock = function(block, program) {
  var code = "// missing JavaScript implementation for block " + block.blockTemplate.name + "\n";
  switch(block.blockTemplate.type) {
    case A3a.vpl.blockType.event:
    case A3a.vpl.blockType.state:
      return {clauseInit:code, clause:"true"};
    case A3a.vpl.blockType.action:
      return {statement:code};
    default:
      return {};
  }
};
A3a.vpl.Program.codeGenerator["js"] = new A3a.vpl.CodeGeneratorJS;
A3a.vpl.CodeGeneratorPython = function() {
  A3a.vpl.CodeGenerator.call(this, "python", "and", "True");
};
A3a.vpl.CodeGeneratorPython.prototype = Object.create(A3a.vpl.CodeGenerator.prototype);
A3a.vpl.CodeGeneratorPython.prototype.constructor = A3a.vpl.CodeGeneratorPython;
A3a.vpl.CodeGeneratorPython.prototype.generate = function(program, runBlocks) {
  this.reset();
  var c = program.program.map(function(rule) {
    return this.generateCodeForEventHandler(rule, program);
  }, this);
  var sections = {};
  var sectionList = [];
  c.forEach(function(evCode) {
    if (evCode.sectionBegin) {
      sections[evCode.sectionBegin] = {sectionBegin:evCode.sectionBegin, sectionEnd:evCode.sectionEnd, sectionPreamble:evCode.sectionPreamble, clauseInit:"", clauseAssignment:""};
      if (sectionList.indexOf(evCode.sectionBegin) < 0) {
        sectionList.push(evCode.sectionBegin);
      }
    }
    if (evCode.auxSectionBegin) {
      evCode.auxSectionBegin.forEach(function(sectionBegin, i) {
        sections[sectionBegin] = {sectionBegin:sectionBegin, sectionEnd:evCode.auxSectionEnd[i], sectionPreamble:evCode.auxSectionPreamble[i], clauseInit:"", clauseAssignment:""};
        if (sectionList.indexOf(sectionBegin) < 0) {
          sectionList.push(sectionBegin);
        }
      });
    }
  });
  var initVarDecl = [];
  var initCodeExec = [];
  var initCodeDecl = [];
  var clauses = [];
  var nextCond = 0;
  c.forEach(function(evCode, i) {
    evCode.initVarDecl && evCode.initVarDecl.forEach(function(fr) {
      if (initVarDecl.indexOf(fr) < 0) {
        initVarDecl.push(fr);
      }
    });
    evCode.initCodeExec && evCode.initCodeExec.forEach(function(fr) {
      if (initCodeExec.indexOf(fr) < 0) {
        initCodeExec.push(fr);
      }
    });
    evCode.initCodeDecl && evCode.initCodeDecl.forEach(function(fr) {
      if (initCodeDecl.indexOf(fr) < 0) {
        initCodeDecl.push(fr);
      }
    });
    if (evCode.sectionBegin) {
      evCode.clauseIndex = clauses.indexOf(A3a.vpl.CodeGenerator.Mark.remove(evCode.clause || evCode.sectionBegin));
      if (evCode.clauseIndex < 0) {
        evCode.clauseIndex = clauses.length;
        clauses.push(A3a.vpl.CodeGenerator.Mark.remove(evCode.clause || evCode.sectionBegin));
        var section = sections[evCode.sectionBegin];
        if (evCode.clauseInit && section.clauseInit.indexOf(evCode.clauseInit) < 0) {
          section.clauseInit += evCode.clauseInit;
        }
        if (evCode.clause) {
          section.clauseAssignment += "cond = " + evCode.clause + "\n" + "if cond and not cond0[" + nextCond + "]:\n" + "eventCache[" + evCode.clauseIndex + "] = True\n" + "<\n" + "cond0[" + nextCond + "] = cond\n";
          nextCond++;
        } else {
          section.clauseAssignment += "eventCache[" + evCode.clauseIndex + "] = True\n";
        }
      }
    }
    if (!evCode.sectionBegin) {
      evCode.statement = this.bracket(evCode.statement || "", program.program[i]);
    }
  }, this);
  var runBlocksCodeStatement = "";
  if (runBlocks) {
    var rule = new A3a.vpl.Rule;
    var initBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("init"), null, null);
    rule.setBlock(initBlock, null, null, null);
    runBlocks.forEach(function(block) {
      rule.setBlock(block, null, null, null);
    });
    var runBlocksCode = this.generateCodeForEventHandler(rule, program);
    var runBlockPrerequisite = true;
    runBlocksCode.initVarDecl.forEach(function(fr) {
      if (initVarDecl.indexOf(fr) < 0) {
        runBlockPrerequisite = false;
      }
    });
    runBlocksCode.initCodeDecl.forEach(function(fr) {
      if (initCodeDecl.indexOf(fr) < 0) {
        runBlockPrerequisite = false;
      }
    });
    if (runBlockPrerequisite) {
      runBlocksCodeStatement = runBlocksCode.statement;
    } else {
      if (runBlocksCode.statementWithoutInit) {
        runBlocksCodeStatement = runBlocksCode.statementWithoutInit;
      }
    }
  }
  if (nextCond > 0) {
    initCodeExec.unshift("cond0 = [False for i in range(" + nextCond + ")]\n");
  }
  var auxClausesInit = [];
  var actionsTestCode = "";
  var actionsExecCode = "";
  var actionTestCount = 0;
  for (var i = 0; i < program.program.length; i++) {
    if (c[i].clauseIndex >= 0) {
      c[i].auxClausesInit && c[i].auxClausesInit.forEach(function(cl) {
        if (auxClausesInit.indexOf(cl) < 0) {
          auxClausesInit.push(cl);
        }
      });
      actionsTestCode += "if eventCache[" + c[i].clauseIndex + "]" + (c[i].auxClauses ? " and " + c[i].auxClauses : "") + ":\n" + "todo[" + actionTestCount + "] = True\n" + "<\n";
      actionsExecCode += "if todo[" + actionTestCount + "]:\n" + c[i].statement + "<\n";
      actionTestCount++;
    } else {
      if (c[i].auxClauses) {
        actionsTestCode += "cond = " + c[i].auxClauses + "\n" + "if cond and not cond0[" + i + "]:\n" + "todo[" + actionTestCount + "] = 1\n" + "<\n" + "cond0[" + i + "] = cond\n";
        actionsExecCode += "if todo[" + actionTestCount + "]:\n" + c[i].statement + "<\n";
        actionTestCount++;
      }
    }
  }
  var str = initVarDecl.length > 0 ? initVarDecl.join("\n") : "";
  if (clauses.length > 0) {
    str += "eventCache = [" + clauses.map(function() {
      return "0";
    }).join(", ") + "]\n";
  }
  if (actionTestCount > 0) {
    str += "todo = [";
    for (var i = 0; i < actionTestCount; i++) {
      str += i > 0 ? ", 0" : "0";
    }
    str += "]\n";
  }
  if (runBlocks) {
    str += "\n" + runBlocksCode;
  } else {
    if (initCodeExec.length > 0) {
      str += "\n" + initCodeExec.join("\n");
    }
    if (actionsTestCode) {
      str += (str.length > 0 ? "\n" : "") + "thymio.timer.period[1] = 50\n";
    }
  }
  for (var i = 0; i < sectionList.length; i++) {
    if (!/onevent/.test(sections[sectionList[i]].sectionBegin) && (sections[sectionList[i]].sectionPreamble || sections[sectionList[i]].clauseInit || sections[sectionList[i]].clauseAssignment)) {
      str += "\n" + (sections[sectionList[i]].sectionBegin || "") + (sections[sectionList[i]].sectionPreamble || "") + (sections[sectionList[i]].clauseInit || "") + (sections[sectionList[i]].clauseAssignment || "") + (sections[sectionList[i]].sectionEnd || "");
    }
  }
  str += this.generateCodeForVolume(program);
  if (initCodeDecl.length > 0) {
    str += "\n" + initCodeDecl.join("\n");
  }
  for (var i = 0; i < sectionList.length; i++) {
    if (/onevent/.test(sections[sectionList[i]].sectionBegin) && (sections[sectionList[i]].sectionPreamble || sections[sectionList[i]].clauseInit || sections[sectionList[i]].clauseAssignment)) {
      str += "\n" + (sections[sectionList[i]].sectionBegin || "") + (sections[sectionList[i]].sectionPreamble || "") + (sections[sectionList[i]].clauseInit || "") + (sections[sectionList[i]].clauseAssignment || "") + (sections[sectionList[i]].sectionEnd || "");
    }
  }
  if (actionsTestCode) {
    str += "\n@thymio.onevent(thymio.TIMER1)\n" + "def onevent_timer1():\n" + auxClausesInit.join("") + actionsTestCode + actionsExecCode;
    for (var i = 0; i < clauses.length; i++) {
      str += "eventCache[" + i + "] = False\n";
    }
    for (var i = 0; i < actionTestCount; i++) {
      str += "todo[" + i + "] = False\n";
    }
    str += "<\n";
  }
  if (str[0] === "\n") {
    str = str.slice(1);
  }
  if (str) {
    str = "import thymio\n\n" + str;
  }
  str = A3a.vpl.CodeGenerator.Mark.remove(str);
  str = str.replace(/\n[ \t]+/g, "\n").replace(/\n<\n\n<\n/g, "\n<\n<\n");
  var indent = 0;
  var prog = "";
  str.split("\n").map(function(line) {
    return line.trim();
  }).forEach(function(line) {
    var line1 = A3a.vpl.CodeGenerator.Mark.remove(line);
    if (line1.length > 0) {
      var preDec = line1 === "<";
      var postInc = line1.slice(-1) === ":";
      if (preDec) {
        indent = Math.max(indent - 1, 0);
      }
      if (line1 !== "<") {
        line = "\t\t\t\t\t".slice(0, indent) + line;
        if (postInc) {
          indent++;
        }
      }
    }
    if (line1 !== "<") {
      prog += line + "\n";
    }
  });
  str = prog;
  for (var i = 0; i < program.program.length; i++) {
    for (var j = i + 1; j < program.program.length; j++) {
      program.program[i].checkConflicts(program.program[j]);
    }
  }
  str = A3a.vpl.CodeGenerator.Mark.extract(this.marks, str);
  return str;
};
A3a.vpl.CodeGeneratorPython.prototype.generateMissingCodeForBlock = function(block, program) {
  var code = "# missing Python implementation for block " + block.blockTemplate.name + "\n";
  switch(block.blockTemplate.type) {
    case A3a.vpl.blockType.event:
    case A3a.vpl.blockType.state:
      return {clauseInit:code, clause:"True"};
    case A3a.vpl.blockType.action:
      return {statement:code};
    default:
      return {};
  }
};
A3a.vpl.Program.codeGenerator["python"] = new A3a.vpl.CodeGeneratorPython;
A3a.vpl.CodeGeneratorAsm = function() {
  A3a.vpl.CodeGeneratorA3a.call(this);
};
A3a.vpl.CodeGeneratorAsm.prototype = Object.create(A3a.vpl.CodeGenerator.prototype);
A3a.vpl.CodeGeneratorAsm.prototype.constructor = A3a.vpl.CodeGeneratorAsm;
A3a.vpl.CodeGeneratorAsm.prototype.generate = function(program, runBlocks) {
  var asebaSourceCode = A3a.vpl.CodeGeneratorA3a.prototype.generate.call(this, program, runBlocks);
  var asebaNode = new A3a.A3aNode(A3a.thymioDescr);
  var c = new A3a.Compiler(asebaNode, asebaSourceCode);
  c.functionLib = A3a.A3aNode.stdMacros;
  var bytecode = c.compile();
  var str = A3a.vm.disToListing(bytecode, true);
  return str;
};
A3a.vpl.Program.codeGenerator["asm"] = new A3a.vpl.CodeGeneratorAsm;
A3a.vpl.Commands = function(logger) {
  this.commands = [];
  this.logger = logger || null;
};
A3a.vpl.Commands.prototype.clear = function() {
  this.commands = [];
};
A3a.vpl.Commands.prototype.add = function(name, opt) {
  var cmd = new A3a.vpl.Commands.Command(name, opt);
  this.commands.push(cmd);
};
A3a.vpl.Commands.isEnabled;
A3a.vpl.Commands.isSelected;
A3a.vpl.Commands.getState;
A3a.vpl.Commands.action;
A3a.vpl.Commands.doDrop;
A3a.vpl.Commands.canDrop;
A3a.vpl.Commands.isAvailable;
A3a.vpl.Commands.CommandProperties;
A3a.vpl.Commands.prototype.find = function(name) {
  for (var i = 0; i < this.commands.length; i++) {
    if (this.commands[i].name === name) {
      return this.commands[i];
    }
  }
  return null;
};
A3a.vpl.Commands.prototype.findByKeyShortcut = function(key, names) {
  for (var i = 0; i < this.commands.length; i++) {
    if ((!names || names.indexOf(this.commands[i].name) >= 0) && this.commands[i].keyShortcut && this.commands[i].keyShortcut === key && this.commands[i].isAvailable()) {
      return this.commands[i];
    }
  }
  return null;
};
A3a.vpl.Commands.prototype.hasAction = function(name) {
  var cmd = this.find(name);
  return cmd != null && cmd.actionFun != null;
};
A3a.vpl.Commands.prototype.logExecCommand = function(name) {
  if (this.logger) {
    var cmd = this.find(name);
    var data = {"cmd":name};
    if (cmd.isSelectedFun) {
      data["selected"] = cmd.isSelected();
    }
    if (cmd.getStateFun) {
      data["state"] = cmd.getState();
    }
    this.logger({"type":"cmd", "data":data});
  }
};
A3a.vpl.Commands.prototype.execute = function(name, modifier) {
  var cmd = this.find(name);
  if (cmd) {
    cmd.execute(modifier);
    this.logExecCommand(name);
  }
};
A3a.vpl.Commands.prototype.executeForSelected = function(name, selected, modifier) {
  var cmd = this.find(name);
  if (cmd && cmd.executeForSelected(selected, modifier)) {
    this.logExecCommand(name);
    return true;
  }
  return false;
};
A3a.vpl.Commands.prototype.executeForState = function(name, state, modifier) {
  var cmd = this.find(name);
  if (cmd && cmd.executeForState(state, modifier)) {
    this.logExecCommand(name);
    return true;
  }
  return false;
};
A3a.vpl.Commands.prototype.doDrop = function(name, droppedItem) {
  if (this.logger) {
    this.logger({"type":"drop", "data":{"cmd":name}});
  }
  var cmd = this.find(name);
  cmd && cmd.doDrop(droppedItem);
};
A3a.vpl.Commands.prototype.canDrop = function(name, droppedItem) {
  var cmd = this.find(name);
  return cmd != null && cmd.canDrop(droppedItem);
};
A3a.vpl.Commands.prototype.isAvailable = function(name) {
  if (window["vplConfig"] && window["vplConfig"]["ignoredCommands"] && window["vplConfig"]["ignoredCommands"].indexOf(name) >= 0) {
    return false;
  }
  var cmd = this.find(name);
  return cmd != null && cmd.isAvailable();
};
A3a.vpl.Commands.prototype.isEnabled = function(name) {
  var cmd = this.find(name);
  return cmd != null && cmd.isEnabled();
};
A3a.vpl.Commands.prototype.isSelected = function(name) {
  var cmd = this.find(name);
  return cmd != null && cmd.isSelected();
};
A3a.vpl.Commands.prototype.getState = function(name) {
  var cmd = this.find(name);
  return cmd != null ? cmd.getState() : null;
};
A3a.vpl.Commands.Command = function(name, opt) {
  this.name = name;
  this.isEnabledFun = opt.isEnabled || null;
  this.isSelectedFun = opt.isSelected || null;
  this.getStateFun = opt.getState || null;
  this.actionFun = opt.action || null;
  this.doDropFun = opt.doDrop || null;
  this.canDropFun = opt.canDrop || null;
  this.obj = opt.object || null;
  this.keep = opt.keep || false;
  this.isAvailableFun = opt.isAvailable || null;
  this.possibleStates = opt.possibleStates || null;
  this.keyShortcut = opt.keyShortcut || null;
};
A3a.vpl.Commands.Command.prototype.execute = function(modifier) {
  if (this.isEnabled()) {
    this.actionFun && this.actionFun(this.obj, modifier);
  }
};
A3a.vpl.Commands.Command.prototype.executeForSelected = function(selected, modifier) {
  if (!this.isSelectedFun) {
    return false;
  } else {
    if (selected === this.isSelected()) {
      return true;
    }
  }
  this.execute(modifier);
  return selected === this.isSelected();
};
A3a.vpl.Commands.Command.prototype.executeForState = function(state, modifier) {
  if (!this.getStateFun) {
    return false;
  }
  var state0 = this.getState();
  if (state === state0) {
    return true;
  }
  for (var i = 0; i < 100; i++) {
    this.execute(modifier);
    var newState = this.getState();
    if (newState === state) {
      return true;
    } else {
      if (newState === state0) {
        return false;
      }
    }
  }
  return false;
};
A3a.vpl.Commands.Command.prototype.doDrop = function(droppedItem) {
  if (this.canDrop(droppedItem)) {
    this.doDropFun && this.doDropFun(this.obj, droppedItem);
  }
};
A3a.vpl.Commands.Command.prototype.canDrop = function(droppedItem) {
  return this.canDropFun != null && this.canDropFun(this.obj, droppedItem);
};
A3a.vpl.Commands.Command.prototype.isEnabled = function() {
  return this.isEnabledFun == null || this.isEnabledFun(this.obj);
};
A3a.vpl.Commands.Command.prototype.isSelected = function() {
  return this.isSelectedFun != null && this.isSelectedFun(this.obj);
};
A3a.vpl.Commands.Command.prototype.getState = function() {
  return this.getStateFun != null ? this.getStateFun(this.obj) : null;
};
A3a.vpl.Commands.Command.prototype.isAvailable = function() {
  return this.isAvailableFun == null || this.isAvailableFun(this.obj);
};
A3a.vpl.Application = function(canvasEl) {
  if (!A3a.vpl.Application.initialized) {
    A3a.vpl.Program.resetBlockLib();
    A3a.vpl.Application.initialized = true;
  }
  this.canvasEl = canvasEl;
  this.css = new CSSParser.VPL;
  this.i18n = new A3a.vpl.Translation;
  this.uiConfig = new A3a.vpl.UIConfig;
  var self = this;
  this.commands = new A3a.vpl.Commands(function(data) {
    self.log(data);
  });
  this.forcedCommandState = null;
  this.vplToolbarConfig = ["vpl:close", "!space", "vpl:about", "vpl:help", "vpl:statement", "!space", "vpl:new", "vpl:save", "vpl:load", "vpl:upload", "vpl:filename", "vpl:exportToHTML", "!space", "vpl:advanced", "!stretch", "vpl:readonly", "!stretch", "vpl:add-comment", "!stretch", "vpl:undo", "vpl:redo", "!stretch", "vpl:connected", "!stretch", "vpl:run", "vpl:stop", "!space", "vpl:slowdown", "vpl:debug", "vpl:robot", "!space", "vpl:flash", "!stretch", "vpl:sim", "vpl:text", "!stretch", "vpl:teacher-reset", 
  "vpl:teacher-save", "vpl:teacher-setasnew", "vpl:teacher"];
  this.vplToolbar2Config = ["!!stretch", "vpl:message-error", "vpl:message-warning", "!!stretch", "vpl:duplicate", "vpl:disable", "vpl:lock", "vpl:trashcan"];
  this.srcToolbarConfig = ["src:close", "!space", "src:new", "src:save", "!space", "src:language", "src:disass", "!stretch", "src:run", "src:stop", "!stretch", "src:sim", "src:vpl", "!space", "src:locked", "!stretch", "src:teacher-reset", "src:teacher"];
  this.simToolbarConfig = ["sim:close", "!stretch", "sim:restart", "sim:pause", "!space", "sim:speedup", "sim:noise", "!stretch", "sim:pen", "sim:clear", "!space", "sim:map-kind", "sim:map", "sim:map-ground", "sim:map-obstacles", "sim:map-height", "!stretch", "sim:vpl", "sim:text", "!stretch", "sim:teacher-reset", "sim:teacher"];
  this.views = ["vpl"];
  this.viewRelativeSizes = {"vpl":1, "src":1, "sim":1};
  this.simMaps = ["ground", "height", "obstacles"];
  this.jsonForNew = null;
  this.aboutBox = null;
  this.loadBox = null;
  this.helpBox = null;
  this.statementBox = null;
  this.suspendBox = null;
  this.suspended = false;
  this.docTemplates = {};
  this.username = null;
  this.program = new A3a.vpl.Program(A3a.vpl.mode.basic, this.uiConfig);
  this.program.setLogger(function(data) {
    self.log(data);
  });
  this.restored = false;
  this.programNotUploadedToServerYet = true;
  this.vplMessage = "";
  this.vplMessageIsWarning = false;
  this.draggedItem = null;
  this.vplCanvas = new A3a.vpl.Canvas(canvasEl, {css:this.css, prepareDrag:function(draggedItem) {
    self.draggedItem = draggedItem;
    if (draggedItem) {
      self.renderProgramToCanvas();
    }
  }});
  this.vplCanvas.state = {vpl:new A3a.vpl.Program.CanvasRenderingState};
  this.cssForHTMLDocument = "";
  this.simCanvas = null;
  this.sim2d = null;
  this.robots = [];
  this.currentRobotIndex = -1;
  this.multipleViews = false;
  this.useLocalStorage = false;
  this.vplHint = null;
  this.vplCanvas.defaultDoOver = function() {
    if (self.vplHint !== null) {
      self.vplHint = null;
      self.renderProgramToCanvas();
    }
  };
  this.vplCanvas.defaultEndDrag = function() {
    self.renderProgramToCanvas();
  };
  this.simHint = null;
  this.loggers = [];
  this.logDataPrevious = null;
  this.supervisorConnected = null;
  this.keyboard = new A3a.vpl.Keyboard;
  this.keyboard.attach();
  this.textField = null;
  this.kbdControl = new A3a.vpl.KbdControl(this);
  this.vplCanvas.addPreMousedown(function(rawMouseEvent, mouseEvent) {
    if (!self.uiConfig.nodragAccessibility) {
      self.kbdControl.exit();
    }
    if (self.textField !== null) {
      var cursorIndex = self.textField.findCursorByPos(mouseEvent.x, mouseEvent.y);
      if (cursorIndex == null) {
        self.textField.finish(true);
        self.textField = null;
      } else {
        self.textField.selBegin = self.textField.selEnd = cursorIndex;
      }
    }
    return true;
  });
};
A3a.vpl.Application.Logger;
A3a.vpl.Application.initialized = false;
A3a.vpl.Application.prototype.setUILanguage = function(language) {
  return this.i18n.setLanguage(language);
};
A3a.vpl.Application.prototype.pushVPLKeyShortcuts = function() {
  var self = this;
  this.keyboard.pushHandler(function(event) {
    if (!self.uiConfig.keyboardShortcutsEnabled || self.views.indexOf("src") >= 0 || (event.altKey || event.ctrlKey || event.metaKey)) {
      return false;
    }
    if (self.views.indexOf("vpl") >= 0) {
      var cmd = self.commands.findByKeyShortcut(event.key, self.vplToolbarConfig.concat(self.vplToolbar2Config));
      if (cmd) {
        cmd.execute(event.altKey);
        return true;
      }
    }
    return false;
  });
  if (this.uiConfig.keyboardAccessibility) {
    this.kbdControl.addHandlers();
  }
};
A3a.vpl.Application.prototype.startTextField = function(options) {
  if (this.textField !== null) {
    this.textField.finish(true);
  }
  this.textField = new A3a.vpl.TextField(this, options);
};
A3a.vpl.Application.prototype.translate = function(messageKey, language) {
  return this.i18n.translate(messageKey, language);
};
A3a.vpl.Application.prototype.newVPL = function(resetUndoStack) {
  this.program.new(resetUndoStack);
  this.kbdControl.reset();
  if (this.uiConfig.nodragAccessibility) {
    this.kbdControl.targetType = A3a.vpl.KbdControl.ObjectType.rule;
    this.kbdControl.targetIndex1 = 0;
  }
};
A3a.vpl.Application.prototype.setAboutBoxContent = function(html) {
  var self = this;
  this.aboutBox = html ? new A3a.vpl.HTMLPanel(html, this.uiConfig.keyboardShortcutsEnabled ? {onShow:function() {
    self.keyboard.pushKeyHandler("Escape", function() {
      self.aboutBox.hide();
    });
  }, onHide:function() {
    self.keyboard.popHandler();
  }} : null) : null;
};
A3a.vpl.Application.prototype.setHelpContent = function(html, isStatement) {
  var app = this;
  var saveBox = new CSSParser.VPL.Box;
  saveBox.width = saveBox.height = 64;
  var dims = A3a.vpl.Canvas.calcDims(16, 16);
  var saveDataURL = A3a.vpl.Canvas.controlToDataURL(function(ctx, box, isPressed) {
    (app.program.toolbarDrawButton || A3a.vpl.Commands.drawButtonJS)("vpl:save", ctx, dims, app.css, ["vpl", "top", "detached"], saveBox, app.i18n, true, false, false, null);
  }, saveBox.width, saveBox.height, saveBox, dims, 1);
  var saveEl = '<img src="' + saveDataURL.url + '" width=' + saveDataURL.width + " height=" + saveDataURL.height + ">";
  var self = this;
  var panel = html ? new A3a.vpl.HTMLPanel(html, {otherWidgets:[{title:"\u21d3", htmlElement:saveEl, fun:function() {
    A3a.vpl.Program.downloadText(html, "doc.html", "text/html");
  }}], scroll:true, onShow:this.uiConfig.keyboardShortcutsEnabled ? function() {
    self.keyboard.pushKeyHandler("Escape", function() {
      self.helpBox.hide();
    });
  } : null, onHide:this.uiConfig.keyboardShortcutsEnabled ? function() {
    self.keyboard.popHandler();
  } : null}) : null;
  if (isStatement) {
    this.statementBox = panel;
  } else {
    this.helpBox = panel;
  }
};
A3a.vpl.Application.prototype.setHelpForCurrentAppState = function() {
  function mergeArrays(a, b) {
    var c = a.slice();
    b.forEach(function(el) {
      if (c.indexOf(el) < 0) {
        c.push(el);
      }
    });
    return c;
  }
  if (this.dynamicHelp) {
    var commands = this.vplToolbarConfig.concat(this.vplToolbar2Config).filter(function(id) {
      return id[0] !== "!" && this.commands.isAvailable(id);
    }, this);
    var blocks = this.program.mode === A3a.vpl.mode.basic ? this.program.enabledBlocksBasic : this.program.enabledBlocksAdvanced;
    blocks.sort(function(a, b) {
      var aIx = A3a.vpl.BlockTemplate.lib.indexOf(A3a.vpl.BlockTemplate.findByName(a));
      var bIx = A3a.vpl.BlockTemplate.lib.indexOf(A3a.vpl.BlockTemplate.findByName(b));
      return aIx < bIx ? -1 : aIx > bIx ? 1 : 0;
    });
    this.dynamicHelp.clearImageMapping();
    var dims = A3a.vpl.Canvas.calcDims(100, 100);
    var cssBoxes = this.getCSSBoxes(this.css);
    var toolbarItemBoxes = A3a.vpl.ControlBar.buttonBoxes(this, this.vplToolbarConfig, ["vpl", "top"]);
    var toolbar2ItemBoxes = A3a.vpl.ControlBar.buttonBoxes(this, this.vplToolbar2Config, ["vpl", "bottom"]);
    this.forcedCommandState = {disabled:false, isAvailable:true, isPressed:false, isEnabled:true, isSelected:false, state:null};
    var controlBar = this.createVPLToolbar(this.vplToolbarConfig, ["vpl", "top"], cssBoxes.toolbarBox, cssBoxes.toolbarSeparatorBox, toolbarItemBoxes);
    var controlBar2 = this.createVPLToolbar(this.vplToolbar2Config, ["vpl", "bottom"], cssBoxes.toolbar2Box, cssBoxes.toolbarSeparator2Box, toolbar2ItemBoxes);
    var scale = 50 / toolbarItemBoxes["vpl:new"].width;
    this.vplToolbarConfig.forEach(function(id) {
      var url = controlBar.toolbarButtonToDataURL(id, toolbarItemBoxes[id], dims, scale);
      if (url) {
        this.dynamicHelp.addImageMapping("vpl:cmd:" + id.replace(/:/g, "-"), url.url);
      }
    }, this);
    this.vplToolbar2Config.forEach(function(id) {
      var url = controlBar2.toolbarButtonToDataURL(id, toolbar2ItemBoxes[id], dims, scale);
      if (url) {
        this.dynamicHelp.addImageMapping("vpl:cmd:" + id.replace(/:/g, "-"), url.url);
      }
    }, this);
    this.forcedCommandState = null;
    A3a.vpl.BlockTemplate.lib.forEach(function(blockTemplate) {
      try {
        var block = new A3a.vpl.Block(blockTemplate, null, null);
        block.param = blockTemplate.typicalParam ? blockTemplate.typicalParam() : block.param;
        var urlMD = "vpl:block:" + blockTemplate.name.replace(/ /g, "-");
        var url = block.toDataURL(this.css, dims, 1);
        this.dynamicHelp.addImageMapping(urlMD, url);
      } catch (e) {
      }
    }, this);
    var html = this.dynamicHelp.generate(this.i18n.language, commands, blocks, this.docTemplates);
    this.setHelpContent(html);
  }
};
A3a.vpl.Application.prototype.generateBlockList = function() {
  var blockList = [];
  A3a.vpl.BlockTemplate.lib.forEach(function(blockTemplate, i) {
    if (blockTemplate.type === A3a.vpl.blockType.event || blockTemplate.type === A3a.vpl.blockType.state) {
      blockList.push(blockTemplate.name);
    }
  });
  A3a.vpl.BlockTemplate.lib.forEach(function(blockTemplate, i) {
    if (blockTemplate.type === A3a.vpl.blockType.action || blockTemplate.type === A3a.vpl.blockType.comment) {
      blockList.push(blockTemplate.name);
    }
  });
  var str = JSON.stringify(blockList, null, "\t");
  A3a.vpl.Program.downloadText(str, "block-list.json", "application/json");
};
A3a.vpl.Application.prototype.generateDynamicHelpButtonContentSkeleton = function(language) {
  language = language || this.i18n.language;
  var languageName = {"en":"english", "fr":"french", "de":"german", "it":"italian", "sp":"spanish"}[language] || "unknown";
  var buttons = {};
  this.vplToolbarConfig.concat(this.vplToolbar2Config).forEach(function(id) {
    if (id[0] !== "!") {
      buttons[id] = ["# " + this.translate(id, language), "![" + id + "](vpl:cmd:" + id.replace(/:/g, "-") + ")", "..."];
    }
  }, this);
  var c = {"help":{}};
  c["help"][language] = {};
  c["help"][language]["buttons"] = buttons;
  var str = JSON.stringify(c, null, "\t");
  A3a.vpl.Program.downloadText(str, "help-buttons-" + languageName + ".json", "application/json");
};
A3a.vpl.Application.prototype.generateDynamicHelpBlockContentSkeleton = function(language) {
  language = language || this.i18n.language;
  var languageName = {"en":"english", "fr":"french", "de":"german", "it":"italian", "sp":"spanish"}[language] || "unknown";
  var typeDictI18N = {"en":{"e":"Type: event or condition block", "a":"Type: action block", "s":"Type: condition block", "c":"Type: comment block"}, "fr":{"e":"Type: bloc d'\u00e9v\u00e9nement ou de condition", "a":"Type: bloc d'action", "s":"Type: bloc de condition", "c":"Type: block de commentaire"}, "de":{"e":"Art: Ereignisblock oder Zustandblock", "a":"Art: Aktionblock", "s":"Art: Zustandblock", "c":"Art: Anmerkungblock"}};
  var typeDict = typeDictI18N[language] || typeDictI18N["en"];
  var blocks = {};
  A3a.vpl.BlockTemplate.lib.forEach(function(b) {
    if (b.type !== A3a.vpl.blockType.hidden) {
      blocks[b.name] = ["# " + this.translate(b.name, language), "![" + b.name + "](vpl:block:" + b.name.replace(/ /g, "-") + ")", typeDict[b.type], "..."];
    }
  }, this);
  var c = {"help":{}};
  c["help"][language] = {};
  c["help"][language]["blocks"] = blocks;
  var str = JSON.stringify(c, null, "\t");
  A3a.vpl.Program.downloadText(str, "help-blocks-" + languageName + ".json", "application/json");
};
A3a.vpl.Application.prototype.setSuspendBoxContent = function(html) {
  var suspended = this.suspended;
  if (suspended && this.suspendBox) {
    this.suspendBox.hide();
  }
  this.suspendBox = html ? new A3a.vpl.HTMLPanel(html, {noCloseWidget:true}) : null;
  if (html && suspended) {
    this.suspendBox.show();
  }
};
A3a.vpl.Application.prototype.setView = function(views, options) {
  var app = this;
  if (options && (options.noVPL || options.unlocked)) {
    this.program.noVPL = true;
    this.editor.noVPL = true;
    this.editor.lockWithVPL(false);
  }
  if (views.length === 1 && options && options.fromView && this.views.length > 1) {
    if (this.views.indexOf(views[0]) >= 0) {
      return;
    }
    var viewIx = this.views[0] === options.fromView ? 1 : 0;
    var views1 = this.views.slice();
    views1[viewIx] = views[0];
    views = views1;
  } else {
    if (options && options.openView) {
      if (this.views.indexOf(views[0]) < 0) {
        views = this.views.concat(views);
      }
    } else {
      if (views.length === 1 && options && options.closeView && this.views.length > 1 && this.views.indexOf(views[0]) >= 0) {
        this.views.splice(this.views.indexOf(views[0]), 1);
        views = this.views;
      } else {
        if (views.length === 1 && options && options.toggle) {
          if (this.views.indexOf(views[0]) >= 0) {
            this.views.splice(this.views.indexOf(views[0]), 1);
            views = this.views;
          } else {
            views = this.views.concat(views);
          }
        }
      }
    }
  }
  this.views = views;
  if (this.sim2d != null) {
    this.simCanvas.hide();
  }
  this.vplCanvas.hide();
  if (this.editor != null) {
    document.getElementById("src-editor").style.display = views.indexOf("src") >= 0 ? "block" : "none";
    this.editor.tbCanvas.hide();
  }
  if (views.indexOf("vpl") >= 0) {
    this.vplCanvas.show();
  }
  if (views.indexOf("src") >= 0) {
    this.editor.tbCanvas.show();
  }
  if (this.sim2d != null && views.indexOf("sim") >= 0) {
    this.simCanvas.show();
  }
  this.layout(window.innerWidth < window.innerHeight);
  for (var i = 0; i < views.length; i++) {
    switch(views[i]) {
      case "vpl":
        this.vplCanvas.onUpdate = function() {
          if (!app.program.noVPL) {
            app.program.invalidateCode();
            app.program.enforceSingleTrailingEmptyEventHandler();
            if (app.editor) {
              app.editor.changeCode(app.program.getCode(app.program.currentLanguage));
            }
            app.log();
          }
          app.renderProgramToCanvas();
        };
        break;
      case "src":
        this.editor.lockWithVPL(!(options && (options.noVPL || options.unlocked)));
        this.editor.focus();
        this.editor.resize(window.innerWidth, window.innerHeight);
        break;
      case "sim":
        this.simCanvas.onUpdate = function() {
          app.renderSim2dViewer();
        };
        break;
    }
  }
  if (options && (options.closeView || options.openView)) {
    app.vplResize();
  }
  var onDraw = function() {
    views.indexOf("vpl") >= 0 && app.vplCanvas.redraw();
    views.indexOf("src") >= 0 && app.editor.tbCanvas.redraw();
    views.indexOf("sim") >= 0 && app.simCanvas.redraw();
  };
  if (this.vplCanvas) {
    this.vplCanvas.onDraw = onDraw;
  }
  if (this.editor && this.editor.tbCanvas) {
    this.editor.tbCanvas.onDraw = onDraw;
  }
  if (this.simCanvas) {
    this.simCanvas.onDraw = onDraw;
  }
  if (views.indexOf("vpl") >= 0) {
    this.vplCanvas.onUpdate();
    this.vplCanvas.onDraw ? this.vplCanvas.onDraw() : this.vplCanvas.redraw();
  }
  if (views.indexOf("src") >= 0) {
    this.renderSourceEditorToolbar();
    this.editor.tbCanvas.onDraw ? this.editor.tbCanvas.onDraw() : this.editor.tbCanvas.redraw();
  }
  if (views.indexOf("sim") >= 0) {
    this.start(false);
    this.simCanvas.onUpdate();
    this.simCanvas.onDraw ? this.simCanvas.onDraw() : this.simCanvas.redraw();
  }
};
A3a.vpl.Application.prototype["setView"] = A3a.vpl.Application.prototype.setView;
A3a.vpl.Application.prototype.layout = function(verticalLayout) {
  var relSizes = this.views.map(function(view) {
    return this.viewRelativeSizes[view];
  }, this);
  var sumRelSizes = relSizes.reduce(function(acc, rs) {
    return acc + rs;
  }, 0);
  var x = 0;
  for (var i = 0; i < this.views.length; i++) {
    var relArea = verticalLayout ? {xmin:0, xmax:1, ymin:x, ymax:x + relSizes[i] / sumRelSizes} : {xmin:x, xmax:x + relSizes[i] / sumRelSizes, ymin:0, ymax:1};
    x += relSizes[i] / sumRelSizes;
    switch(this.views[i]) {
      case "vpl":
        this.vplCanvas.setRelativeArea(relArea);
        break;
      case "src":
        this.editor.tbCanvas.setRelativeArea(relArea);
        break;
      case "sim":
        this.simCanvas.setRelativeArea(relArea);
        break;
    }
  }
};
A3a.vpl.Application.prototype.vplResize = function() {
  var bounds = this.vplCanvas.canvas.parentElement.getBoundingClientRect();
  var width = bounds.width;
  var height = window.innerHeight - bounds.top;
  this.layout(width < height);
  if (window["vplDisableResize"]) {
    var bnd = this.vplCanvas.canvas.getBoundingClientRect();
    width = bnd.width;
    height = bnd.height;
  }
  this.vplCanvas.resize(width, height);
  if (this.editor) {
    this.editor.resize(width, height);
  }
  if (this.sim2d) {
    this.simCanvas.resize(width, height);
  }
  this.views.forEach(function(view) {
    switch(view) {
      case "vpl":
        this.renderProgramToCanvas();
        break;
      case "src":
        this.editor.tbCanvas.redraw();
        break;
      case "sim":
        if (this.sim2d) {
          this.renderSim2dViewer();
        }
        break;
    }
  }, this);
  if (this.aboutBox) {
    this.aboutBox.center();
  }
};
A3a.vpl.Application.prototype.stopRobot = function(abnormal) {
  if (this.currentRobotIndex >= 0) {
    var stopBlockTemplate = null;
    if (abnormal) {
      stopBlockTemplate = A3a.vpl.BlockTemplate.findByName("!stop and blink");
    }
    if (!stopBlockTemplate) {
      stopBlockTemplate = A3a.vpl.BlockTemplate.findByName("!stop");
    }
    var language = this.program.currentLanguage;
    var stopGenCode = stopBlockTemplate && stopBlockTemplate.genCode[language];
    if (stopGenCode) {
      this.robots[this.currentRobotIndex].runGlue.run(stopGenCode(null).statement, language);
    }
  }
};
A3a.vpl.Application.prototype.canStopRobot = function() {
  return !this.program.noVPL && this.robots[this.currentRobotIndex].runGlue.isEnabled(this.program.currentLanguage);
};
A3a.vpl.Application.prototype.addLogger = function(logger) {
  this.loggers.push(logger);
};
A3a.vpl.Application.prototype.log = function(data) {
  if (data == null) {
    this.updateErrorInfo();
    data = {"type":"vpl-changed", "data":{"filename":this.program.filename, "nrules":this.program.program.reduce(function(acc, cur) {
      return cur.events.length + cur.actions.length > 0 ? acc + 1 : acc;
    }, 0), "nblocks":this.program.program.reduce(function(acc, cur) {
      return acc + cur.events.length + cur.actions.length;
    }, 0), "uploadedToServer":this.program.uploadedToServer, "error":this.vplMessage && !this.vplMessageIsWarning ? this.vplMessage : null, "warning":this.vplMessage && this.vplMessageIsWarning ? this.vplMessage : null, "error-tr":this.vplMessage && !this.vplMessageIsWarning ? this.i18n.translate(this.vplMessage) : null, "warning-tr":this.vplMessage && this.vplMessageIsWarning ? this.i18n.translate(this.vplMessage) : null, "robot":this.currentRobotIndex >= 0 ? this.robots[this.currentRobotIndex].runGlue.isConnected() && 
    this.robots[this.currentRobotIndex].runGlue.getName() : null}};
    var dataStr = JSON.stringify(data);
    if (dataStr === this.logDataPrevious) {
      return;
    }
    this.logDataPrevious = dataStr;
  }
  this.loggers.forEach(function(logger) {
    try {
      logger(data);
    } catch (e) {
    }
  });
};
A3a.vpl.validateUI = function(ui) {
  var msg = "";
  function validateBlockDefinition(b) {
    var name = b["name"];
    if (name[0] === "!") {
      return 0;
    }
    var errorCount = 0;
    if (!/^\w/.test(name)) {
      msg += 'Bad block name "' + name + '"\n';
      errorCount++;
    }
    var defParam = b["defaultParameters"];
    var typicalParam = b["typicalParameters"];
    var buttons = b["buttons"];
    var radiobuttons = b["radiobuttons"];
    var sliders = b["sliders"];
    var rotating = b["rotating"];
    var diffwheelmotion = b["diffwheelmotion"];
    var score = b["score"];
    var otherParameters = b["otherParameters"] ? parseInt(b["otherParameters"], 10) : 0;
    var drawArr = b["draw"];
    var svg;
    function belongsToDisplayedElement(id) {
      for (var i = 0; i < drawArr.length; i++) {
        if (drawArr[i]["uri"]) {
          var uriDec = A3a.vpl.Canvas.decodeURI(drawArr[i]["uri"]);
          if (ui.svg[uriDec.f].hasAncestor(id, uriDec.id)) {
            return true;
          }
        }
      }
      return false;
    }
    if (drawArr) {
      var f = null;
      for (var i = 0; i < drawArr.length; i++) {
        if (drawArr[i]["uri"]) {
          if (f == null) {
            f = A3a.vpl.Canvas.decodeURI(drawArr[i]["uri"]).f;
            svg = ui.svg[f];
          } else {
            var uriDec = A3a.vpl.Canvas.decodeURI(drawArr[i]["uri"]);
            if (uriDec.f !== f) {
              msg += 'In block "' + name + '", multiple svg\n';
              errorCount++;
            } else {
              if (!svg.hasElement(uriDec.id)) {
                msg += 'In block "' + name + '", uri "' + drawArr[i]["uri"] + '" not found\n';
                errorCount++;
              }
            }
          }
        }
      }
    }
    if (buttons) {
      buttons.forEach(function(button) {
        if (!svg.hasElement(button["id"])) {
          msg += 'In block "' + name + '", button id "' + button["id"] + '" not found\n';
          errorCount++;
        } else {
          if (!belongsToDisplayedElement(button["id"])) {
            msg += 'In block "' + name + '", button id "' + button["id"] + '" not displayed\n';
            errorCount++;
          }
        }
        if (button["val"] == undefined) {
          msg += 'In block "' + name + '", missing property "val"\n';
          errorCount++;
        } else {
          if (button["st"] == undefined) {
            msg += 'In block "' + name + '", missing property "st"\n';
            errorCount++;
          } else {
            if (button["val"].length !== button["st"].length) {
              msg += 'In block "' + name + '", properties "val" and "st" have different lengths\n';
              errorCount++;
            }
          }
        }
      });
    }
    if (radiobuttons) {
      radiobuttons.forEach(function(radiobutton) {
        if (!svg.hasElement(radiobutton["id"])) {
          msg += 'In block "' + name + '", radiobutton id "' + radiobutton["id"] + '" not found\n';
          errorCount++;
        } else {
          if (!belongsToDisplayedElement(radiobutton["id"])) {
            msg += 'In block "' + name + '", radiobutton id "' + radiobutton["id"] + '" not displayed\n';
            errorCount++;
          } else {
            if (radiobutton["val"] == undefined) {
              msg += 'In block "' + name + '", missing property "val"\n';
              errorCount++;
            } else {
              if (radiobutton["val"] instanceof Array) {
                msg += 'In block "' + name + '", illegal array in property "val"\n';
                errorCount++;
              } else {
                if (radiobutton["st"] == undefined) {
                  msg += 'In block "' + name + '", missing property "st"\n';
                  errorCount++;
                } else {
                  if (radiobutton["st"].length !== 2) {
                    msg += 'In block "' + name + '", property "st" must have length 2\n';
                    errorCount++;
                  }
                }
              }
            }
          }
        }
      });
    }
    if (sliders) {
      sliders.forEach(function(slider) {
        if (!svg.hasElement(slider["id"])) {
          msg += 'In block "' + name + '", slider id "' + slider["id"] + '" not found\n';
          errorCount++;
        } else {
          if (!belongsToDisplayedElement(slider["id"])) {
            msg += 'In block "' + name + '", slider id "' + slider["id"] + '" not displayed\n';
            errorCount++;
          }
        }
        if (!svg.hasElement(slider["thumbId"])) {
          msg += 'In block "' + name + '", slider thumbId "' + slider["thumbId"] + '" not found\n';
          errorCount++;
        } else {
          if (!belongsToDisplayedElement(slider["thumbId"])) {
            msg += 'In block "' + name + '", slider thumbId "' + slider["thumbId"] + '" not displayed\n';
            errorCount++;
          }
        }
        if (slider["min"] == undefined) {
          msg += 'In block "' + name + '", slider min undefined\n';
          errorCount++;
        }
        if (slider["max"] == undefined) {
          msg += 'In block "' + name + '", slider max undefined\n';
          errorCount++;
        }
        if (slider["lowerPartId"]) {
          if (!svg.hasElement(slider["lowerPartId"])) {
            msg += 'In block "' + name + '", slider lowerPartId "' + slider["lowerPartId"] + '" not found\n';
            errorCount++;
          }
        }
        if (slider["snap"]) {
          var snap = slider["snap"];
          if (snap instanceof Array) {
            for (var i = 0; i < snap.length; i++) {
              if (typeof snap[i] === "string") {
                if (!/^`.+`$/.test(snap[i])) {
                  msg += 'In block "' + name + '", invalid slider snap expression\n';
                  errorCount++;
                }
              } else {
                if (typeof snap[i] !== "number") {
                  msg += 'In block "' + name + '", slider snap must be a number or a string\n';
                  errorCount++;
                }
              }
            }
          }
        }
      });
    }
    if (rotating) {
      rotating.forEach(function(rot) {
        var id = rot["id"];
        var centerId = rot["centerId"];
        var thumbId = rot["thumbId"];
        var idFound = false;
        var centerIdFound = false;
        var thumbIdFound = false;
        if (!svg.hasElement(id)) {
          msg += 'In block "' + name + '", rotating id "' + id + '" not found\n';
          errorCount++;
        } else {
          if (!belongsToDisplayedElement(id)) {
            msg += 'In block "' + name + '", rotating id "' + id + '" not displayed\n';
            errorCount++;
          }
        }
        if (!svg.hasElement(centerId)) {
          msg += 'In block "' + name + '", rotating centerId "' + centerId + '" not found\n';
          errorCount++;
        }
        if (!svg.hasElement(thumbId)) {
          msg += 'In block "' + name + '", rotating thumbId "' + thumbId + '" not found\n';
          errorCount++;
        } else {
          if (!belongsToDisplayedElement(thumbId)) {
            msg += 'In block "' + name + '", rotating thumbId "' + thumbId + '" not displayed\n';
            errorCount++;
          }
        }
        if (!svg.hasAncestor(thumbId, id)) {
          msg += 'In block "' + name + '", rotating thumbId "' + thumbId + '" not a descendent of id "' + id + '"\n';
          errorCount++;
        }
      });
    }
    if (diffwheelmotion) {
      if (!svg.hasElement(diffwheelmotion["id"])) {
        msg += 'In block "' + name + '", diffwheelmotion id "' + diffwheelmotion["id"] + '" not found\n';
        errorCount++;
      } else {
        if (!belongsToDisplayedElement(diffwheelmotion["id"])) {
          msg += 'In block "' + name + '", diffwheelmotion id "' + diffwheelmotion["id"] + '" not displayed\n';
          errorCount++;
        }
      }
    }
    if (score) {
      if (!svg.hasElement(score["id"])) {
        msg += 'In block "' + name + '", score id "' + score["id"] + '" not found\n';
        errorCount++;
      } else {
        if (!belongsToDisplayedElement(score["id"])) {
          msg += 'In block "' + name + '", score id "' + score["id"] + '" not displayed\n';
          errorCount++;
        }
      }
      if (typeof score["numHeights"] !== "number" || score["numHeights"] !== Math.round(score["numHeights"]) || score["numHeights"] <= 0) {
        msg += 'In block "' + name + '", score numHeights must be a strictly positive integer\n';
        errorCount++;
      }
    }
    if ((buttons || radiobuttons || sliders || rotating || score || otherParameters > 0) && !defParam) {
      msg += 'In block "' + name + '", missing defaultParameters\n';
      errorCount++;
    }
    if (defParam) {
      var nParams = 0;
      if (buttons) {
        nParams += buttons.length;
      }
      if (radiobuttons) {
        nParams += 1;
      }
      if (sliders) {
        nParams += sliders.length;
      }
      if (rotating) {
        nParams += rotating.length;
      }
      if (score) {
        nParams += 2 * Math.floor((defParam.length - nParams) / 2);
      }
      nParams += otherParameters;
      if (nParams !== defParam.length) {
        msg += 'In block "' + name + '", defaultParameters.length=' + defParam.length + ", needs " + nParams + " parameters\n";
        errorCount++;
      } else {
        if (typicalParam && typicalParam.length != nParams) {
          msg += 'In block "' + name + '", typicalParameters.length=' + typicalParam.length + ", needs " + nParams + " parameters\n";
          errorCount++;
        }
      }
    }
    return errorCount;
  }
  var errorCount = 0;
  if (ui["blocks"]) {
    ui["blocks"].forEach(function(b) {
      errorCount += validateBlockDefinition(b);
    });
  }
  if (errorCount > 0) {
    msg += errorCount + " error" + (errorCount > 1 ? "s" : "") + "\n";
  }
  return msg || null;
};
A3a.vpl.Application.prototype.addVPLCommands = function() {
  this.commands.add("vpl:close", {action:function(app, modifier) {
    app.setView(["vpl"], {closeView:true});
  }, object:this, isAvailable:function(app) {
    return app.views.length > 1 && app.views.indexOf("vpl") >= 0;
  }, keyShortcut:"w"});
  this.commands.add("vpl:about", {action:function(app, modifier) {
    app.aboutBox.show();
  }, object:this, isAvailable:function(app) {
    return app.aboutBox != null;
  }, keyShortcut:"i"});
  this.commands.add("vpl:help", {action:function(app, modifier) {
    app.helpBox.show();
  }, object:this, isAvailable:function(app) {
    return app.helpBox != null;
  }, keyShortcut:"?"});
  this.commands.add("vpl:statement", {action:function(app, modifier) {
    app.statementBox.show();
  }, object:this, isAvailable:function(app) {
    return app.statementBox != null;
  }});
  this.commands.add("vpl:readonly", {isEnabled:function(app) {
    return false;
  }, object:this, isAvailable:function(app) {
    return app.program.readOnly || app.program.noVPL;
  }});
  this.commands.add("vpl:suspend", {action:function(app, modifier) {
    app.suspended = !app.suspended;
    if (app.suspended) {
      if (app.canStopRobot()) {
        app.stopRobot(true);
        app.program.uploaded = false;
      }
      app.suspendBox.show();
    } else {
      app.suspendBox.hide();
    }
  }, isSelected:function(app) {
    return app.suspended;
  }, object:this, isAvailable:function(app) {
    return app.program.teacherRole === A3a.vpl.Program.teacherRoleType.student && app.suspendBox != null;
  }});
  this.commands.add("vpl:new", {action:function(app, modifier) {
    app.newVPL();
    if (app.jsonForNew) {
      app.loadProgramJSON(app.jsonForNew);
    }
    app.program.saveStateAfterChange();
    app.renderProgramToCanvas();
  }, isEnabled:function(app) {
    return !app.program.noVPL && !app.program.readOnly && !app.program.isEmpty();
  }, object:this, isAvailable:function(app) {
    return !app.program.readOnly;
  }, keyShortcut:"n"});
  this.commands.add("vpl:save", {action:function(app, modifier) {
    if (modifier) {
      var html = app.toHTMLDocument(app.css);
      A3a.vpl.Program.downloadText(html, "vpl-program.html", "text/html");
    } else {
      var json = app.program.exportToJSON({lib:true, prog:true});
      A3a.vpl.Program.downloadText(json, app.program.filename || A3a.vpl.Program.defaultFilename, A3a.vpl.Program.mimetype);
    }
  }, isEnabled:function(app) {
    return !app.program.noVPL && !app.program.isEmpty();
  }, object:this, isAvailable:function(app) {
    return !app.program.readOnly;
  }, keyShortcut:"s"});
  this.commands.add("vpl:load", {action:function(app, modifier) {
    app.loadBox.show("Open program file", ".aesl,.json,." + A3a.vpl.Program.suffix + ",." + A3a.vpl.Program.suffixUI, function(file) {
      app.loadProgramFile(file);
      app.program.saveStateAfterChange();
    });
  }, isEnabled:function(app) {
    return !app.program.noVPL && !app.program.readOnly;
  }, object:this, isAvailable:function(app) {
    return !app.program.readOnly;
  }, keyShortcut:"o"});
  this.commands.add("vpl:upload", {action:function(app, modifier) {
    var json = app.program.exportToJSON({lib:false, prog:true});
    window["vplUpload"](app.program.filename, json);
    app.program.uploadedToServer = true;
    app.programNotUploadedToServerYet = false;
  }, isEnabled:function(app) {
    return !app.program.noVPL && !app.program.readOnly && !app.program.isEmpty();
  }, isSelected:function(app) {
    return app.program.uploadedToServer;
  }, getState:function(app) {
    if (app.program.isEmpty()) {
      return "empty";
    } else {
      if (app.program.uploadedToServer) {
        return "uploaded";
      } else {
        if (app.programNotUploadedToServerYet) {
          return "canUpload";
        } else {
          return "canUploadAgain";
        }
      }
    }
  }, object:this, isAvailable:function(app) {
    return window["vplUpload"] != null && !app.program.readOnly;
  }});
  this.commands.add("vpl:exportToHTML", {action:function(app, modifier) {
    if (modifier) {
      var html = app.uiToHTMLDocument(app.css);
      A3a.vpl.Program.downloadText(html, "vpl-ui.html", "text/html");
    } else {
      var html = app.toHTMLDocument(app.css);
      A3a.vpl.Program.downloadText(html, "vpl-program.html", "text/html");
    }
  }, isEnabled:function(app) {
    return !app.program.noVPL && !app.program.isEmpty();
  }, object:this, keyShortcut:"h"});
  this.commands.add("vpl:text", {action:function(app, modifier) {
    if (app.multipleViews) {
      app.setView(["src"], {openView:true});
    } else {
      app.setView(["src"], {fromView:"vpl"});
    }
  }, isEnabled:function(app) {
    return !app.program.noVPL;
  }, doDrop:function(app, draggedItem) {
    if (draggedItem.data instanceof A3a.vpl.Block && draggedItem.data.ruleContainer) {
      var block = draggedItem.data;
      var span = app.program.getCodeLocation(app.program.currentLanguage, block);
      if (span) {
        app.setView(["src"]);
        app.editor.selectRange(span.begin, span.end);
      }
    } else {
      if (draggedItem.data instanceof A3a.vpl.Rule) {
        var rule = draggedItem.data;
        var span = app.program.getCodeLocation(app.program.currentLanguage, rule);
        if (span) {
          app.setView(["src"]);
          app.editor.selectRange(span.begin, span.end);
        }
      }
    }
  }, canDrop:function(app, draggedItem) {
    return draggedItem.data instanceof A3a.vpl.Block && draggedItem.data.ruleContainer != null || draggedItem.data instanceof A3a.vpl.Rule;
  }, object:this, isAvailable:function(app) {
    return app.editor && app.views.indexOf("src") < 0;
  }});
  this.commands.add("vpl:text-toggle", {action:function(app, modifier) {
    app.setView(["src"], {toggle:true});
  }, isEnabled:function(app) {
    return !app.program.noVPL;
  }, isSelected:function(app) {
    return app.views.indexOf("src") >= 0;
  }, object:this, possibleStates:[{selected:false}, {selected:true}]});
  this.commands.add("vpl:advanced", {action:function(app, modifier) {
    app.program.setMode(app.program.mode === A3a.vpl.mode.basic ? A3a.vpl.mode.advanced : A3a.vpl.mode.basic);
    app.setHelpForCurrentAppState();
  }, isEnabled:function(app) {
    return !app.program.noVPL && !app.program.readOnly;
  }, isSelected:function(app) {
    return app.program.mode === A3a.vpl.mode.advanced;
  }, object:this, isAvailable:function(app) {
    return A3a.vpl.Program.advancedModeEnabled && !app.program.readOnly;
  }, possibleStates:[{selected:false}, {selected:true}]});
  this.commands.add("vpl:undo", {action:function(app, modifier) {
    app.program.undo(function() {
      app.renderProgramToCanvas();
      app.program.saveStateAfterChange();
    });
  }, isEnabled:function(app) {
    return !app.program.noVPL && app.program.undoState.canUndo();
  }, object:this, isAvailable:function(app) {
    return !app.program.readOnly;
  }, keyShortcut:"z"});
  this.commands.add("vpl:redo", {action:function(app, modifier) {
    app.program.redo(function() {
      app.renderProgramToCanvas();
      app.program.saveStateAfterChange();
    });
  }, isEnabled:function(app) {
    return !app.program.noVPL && app.program.undoState.canRedo();
  }, object:this, isAvailable:function(app) {
    return !app.program.readOnly;
  }, keyShortcut:"y"});
  this.commands.add("vpl:add-comment", {action:function(app, modifier) {
    app.program.saveStateBeforeChange();
    var position = app.kbdControl.targetType === A3a.vpl.KbdControl.ObjectType.rule ? app.kbdControl.targetIndex1 : null;
    position = app.program.addComment("", position, true);
    app.program.saveStateAfterChange();
    app.editComment(position);
    app.renderProgramToCanvas();
  }, isEnabled:function(app) {
    return !app.program.noVPL;
  }, object:this, isAvailable:function(app) {
    return !app.program.readOnly;
  }});
  this.commands.add("vpl:run", {action:function(app, modifier) {
    var code = app.program.getCode(app.program.currentLanguage);
    app.robots[app.currentRobotIndex].runGlue.run(code, app.program.currentLanguage);
    app.program.uploaded = true;
    app.program.notUploadedYet = false;
  }, isEnabled:function(app) {
    if (app.program.noVPL || !app.robots[app.currentRobotIndex].runGlue.isEnabled(app.program.currentLanguage)) {
      return false;
    }
    var error = app.program.getError();
    return error == null || error.isWarning;
  }, isSelected:function(app) {
    return app.program.uploaded;
  }, getState:function(app) {
    if (app.program.isEmpty()) {
      return "empty";
    } else {
      if (app.program.uploaded) {
        return "running";
      } else {
        var error = app.program.getError();
        if (error && !error.isWarning) {
          return "error";
        } else {
          if (app.program.notUploadedYet) {
            return "canLoad";
          } else {
            return "canReload";
          }
        }
      }
    }
  }, doDrop:function(app, draggedItem) {
    if (draggedItem.data instanceof A3a.vpl.Block) {
      if (draggedItem.data.ruleContainer) {
        var code = app.program.codeForBlock(draggedItem.data, app.program.currentLanguage);
        app.robots[app.currentRobotIndex].runGlue.run(code, app.program.currentLanguage);
      } else {
        app.vplCanvas.zoomedItemProxy = app.vplCanvas.makeZoomedClone(draggedItem);
      }
    } else {
      if (draggedItem.data instanceof A3a.vpl.Rule) {
        var code = app.program.codeForActions(draggedItem.data, app.program.currentLanguage);
        app.robots[app.currentRobotIndex].runGlue.run(code, app.program.currentLanguage);
      }
    }
  }, canDrop:function(app, draggedItem) {
    return app.currentRobotIndex >= 0 && app.robots[app.currentRobotIndex].runGlue.isEnabled(app.program.currentLanguage) && draggedItem.data instanceof A3a.vpl.Rule && draggedItem.data.hasBlockOfType(A3a.vpl.blockType.action) || draggedItem.data instanceof A3a.vpl.Block && draggedItem.data.ruleContainer != null && draggedItem.data.blockTemplate.type === A3a.vpl.blockType.action;
  }, object:this, isAvailable:function(app) {
    return app.currentRobotIndex >= 0;
  }, possibleStates:[{selected:false}, {selected:true}, {state:"empty"}, {state:"running"}, {state:"error"}, {state:"canLoad"}, {state:"canReload"}], keyShortcut:"r"});
  this.commands.add("vpl:stop", {action:function(app, modifier) {
    app.stopRobot();
    app.program.uploaded = false;
  }, isEnabled:function(app) {
    return app.canStopRobot();
  }, object:this, isAvailable:function(app) {
    return app.currentRobotIndex >= 0;
  }, keyShortcut:"."});
  this.commands.add("vpl:stop-abnormally", {action:function(app, modifier) {
    app.stopRobot(true);
    app.program.uploaded = false;
  }, isEnabled:function(app) {
    return app.canStopRobot();
  }, object:this, isAvailable:function(app) {
    return app.currentRobotIndex >= 0;
  }});
  this.commands.add("vpl:slowdown", {action:function(app, modifier) {
    var s = [0.1, 0.2, 0.5, 1];
    app.program.setSlowdownFactor(s[(s.indexOf(app.program.slowdownFactor) + 1) % s.length]);
  }, isSelected:function(app) {
    return app.program.slowdownFactor !== 1;
  }, getState:function(app) {
    return app.program.slowdownFactor;
  }, object:this, possibleStates:[{selected:true, state:0.1}, {selected:true, state:0.2}, {selected:true, state:0.5}, {selected:false, state:1}]});
  this.commands.add("vpl:debug", {action:function(app) {
  }, isSelected:function(app) {
    return false;
  }, object:this, isAvailable:function(app) {
    return false;
  }, possibleStates:[{selected:false}, {selected:true}]});
  this.commands.add("vpl:flash", {action:function(app, modifier) {
    var code = app.program.getCode(app.program.currentLanguage);
    app.robots[app.currentRobotIndex].runGlue.flash(code, app.program.currentLanguage);
    app.program.flashed = true;
  }, isEnabled:function(app) {
    if (app.program.noVPL || !app.robots[app.currentRobotIndex].runGlue.canFlash(app.program.currentLanguage)) {
      return false;
    }
    var error = app.program.getError();
    return error == null || error.isWarning;
  }, isSelected:function(app) {
    return app.program.flashed;
  }, object:this, isAvailable:function(app) {
    return app.currentRobotIndex >= 0 && app.robots[app.currentRobotIndex].runGlue.isFlashAvailable();
  }});
  this.commands.add("vpl:connected", {isSelected:function(app) {
    return !app.program.noVPL && app.robots[app.currentRobotIndex].runGlue.isConnected();
  }, getState:function(app) {
    return app.supervisorConnected ? "monitored" : app.supervisorConnected === false ? "nonmonitored" : "";
  }, object:this, isAvailable:function(app) {
    return app.currentRobotIndex >= 0;
  }, possibleStates:[{selected:false}, {selected:true}, {selected:false, state:"monitored"}, {selected:true, state:"monitored"}, {selected:false, state:"nonmonitored"}, {selected:true, state:"nonmonitored"}]});
  this.commands.add("vpl:robot", {action:function(app) {
    app.currentRobotIndex = (app.currentRobotIndex + 1) % app.robots.length;
  }, getState:function(app) {
    return app.robots[app.currentRobotIndex].name;
  }, object:this, isAvailable:function(app) {
    return app.robots.length > 1;
  }});
  this.commands.add("vpl:volume", {action:function(app) {
    var values = [null, 8, 7, 6, 5, 4, 3, 2, 1, 0];
    app.program.volume = values[(values.indexOf(app.program.volume) + 1) % values.length];
  }, isSelected:function(app) {
    return app.program.volume !== null;
  }, getState:function(app) {
    return app.program.volume === null ? "" : app.program.volume.toString(10);
  }, object:this, possibleStates:[{selected:false, state:""}, {selected:true, state:"8"}, {selected:true, state:"7"}, {selected:true, state:"6"}, {selected:true, state:"5"}, {selected:true, state:"4"}, {selected:true, state:"3"}, {selected:true, state:"2"}, {selected:true, state:"1"}, {selected:true, state:"0"}]});
  this.commands.add("vpl:sim", {action:function(app, modifier) {
    if (app.multipleViews) {
      app.setView(["sim"], {openView:true});
    } else {
      app.setView(["sim"], {fromView:"vpl"});
    }
  }, isEnabled:function(app) {
    return !app.program.noVPL;
  }, object:this, isAvailable:function(app) {
    return app.currentRobotIndex >= 0 && app.sim2d != null && app.views.indexOf("sim") < 0;
  }});
  this.commands.add("vpl:duplicate", {isEnabled:function(app) {
    return !app.program.noVPL;
  }, doDrop:function(app, draggedItem) {
    var i = app.program.program.indexOf(draggedItem.data);
    if (i >= 0) {
      app.program.saveStateBeforeChange();
      app.program.program.splice(i + 1, 0, draggedItem.data.copy());
      app.program.saveStateAfterChange();
      app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
      app.log();
    }
  }, canDrop:function(app, draggedItem) {
    return draggedItem.data instanceof A3a.vpl.Rule && !draggedItem.data.isEmpty();
  }, object:this, isAvailable:function(app) {
    return !app.program.readOnly;
  }});
  this.commands.add("vpl:disable", {isEnabled:function(app) {
    return !app.program.noVPL;
  }, doDrop:function(app, draggedItem) {
    if (draggedItem.data instanceof A3a.vpl.Block) {
      app.program.saveStateBeforeChange();
      draggedItem.data.disabled = !draggedItem.data.disabled;
      app.program.saveStateAfterChange();
      app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
      app.log();
    } else {
      if (draggedItem.data instanceof A3a.vpl.Rule) {
        app.program.saveStateBeforeChange();
        draggedItem.data.toggleDisable();
        app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
        app.log();
      }
    }
  }, canDrop:function(app, draggedItem) {
    return draggedItem.data instanceof A3a.vpl.Rule ? !draggedItem.data.isEmpty() : draggedItem.data instanceof A3a.vpl.Block && draggedItem.data.ruleContainer !== null;
  }, object:this, isAvailable:function(app) {
    return !app.program.readOnly;
  }});
  this.commands.add("vpl:lock", {isEnabled:function(app) {
    return !app.program.noVPL;
  }, doDrop:function(app, draggedItem) {
    if (draggedItem.data instanceof A3a.vpl.Block) {
      app.program.saveStateBeforeChange();
      draggedItem.data.locked = !draggedItem.data.locked;
      app.program.saveStateAfterChange();
      app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
      app.log();
    } else {
      if (draggedItem.data instanceof A3a.vpl.Rule) {
        app.program.saveStateBeforeChange();
        draggedItem.data.locked = !draggedItem.data.locked;
        app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
        app.log();
      }
    }
  }, canDrop:function(app, draggedItem) {
    return draggedItem.data instanceof A3a.vpl.Rule ? !draggedItem.data.isEmpty() : draggedItem.data instanceof A3a.vpl.Block && draggedItem.data.ruleContainer !== null;
  }, object:this, isAvailable:function(app) {
    return app.program.experimentalFeatures && app.program.teacherRole === A3a.vpl.Program.teacherRoleType.teacher && !app.program.readOnly;
  }});
  this.commands.add("vpl:trashcan", {isEnabled:function(app) {
    return !app.program.noVPL;
  }, doDrop:function(app, draggedItem) {
    if (draggedItem.data instanceof A3a.vpl.Block) {
      if (draggedItem.data.ruleContainer !== null) {
        app.program.saveStateBeforeChange();
        draggedItem.data.ruleContainer.removeBlock(draggedItem.data.positionInContainer);
        app.program.saveStateAfterChange();
        app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
        app.log();
      }
    } else {
      if (draggedItem.data instanceof A3a.vpl.Rule) {
        var i = app.program.program.indexOf(draggedItem.data);
        if (i >= 0) {
          app.program.saveStateBeforeChange();
          app.program.program.splice(i, 1);
          app.program.saveStateAfterChange();
          app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
          app.log();
        }
      }
    }
  }, canDrop:function(app, draggedItem) {
    return draggedItem.data instanceof A3a.vpl.Block ? draggedItem.data.ruleContainer !== null && !draggedItem.data.locked : draggedItem.data instanceof A3a.vpl.Rule && (!draggedItem.data.isEmpty() || app.program.program.indexOf(draggedItem.data) + 1 < app.program.program.length) && !draggedItem.data.locked;
  }, object:this, isAvailable:function(app) {
    return !app.program.readOnly;
  }});
  this.commands.add("vpl:message-error", {isEnabled:function(app) {
    return false;
  }, getState:function(app) {
    return app.vplMessage;
  }, object:this, isAvailable:function(app) {
    return app.vplMessage && !app.vplMessageIsWarning;
  }});
  this.commands.add("vpl:message-warning", {isEnabled:function(app) {
    return false;
  }, getState:function(app) {
    return app.vplMessage;
  }, object:this, isAvailable:function(app) {
    return app.vplMessage && app.vplMessageIsWarning;
  }});
  this.commands.add("vpl:message-empty", {isEnabled:function(app) {
    return false;
  }, object:this, isAvailable:function(app) {
    return !app.vplMessage;
  }});
  this.commands.add("vpl:filename", {isEnabled:function(app) {
    return false;
  }, getState:function(app) {
    return (app.program.filename || "") + (app.username ? "\n" + app.username : "");
  }, object:this, isAvailable:function(app) {
    return app.program.filename || app.username ? true : false;
  }});
  this.commands.add("vpl:teacher", {action:function(app, modifier) {
    app.program.uiConfig.blockCustomizationMode = !app.program.uiConfig.blockCustomizationMode;
    if (app.program.teacherRole === A3a.vpl.Program.teacherRoleType.teacher) {
      app.program.uiConfig.toolbarCustomizationMode = app.program.uiConfig.blockCustomizationMode;
    } else {
      app.program.uiConfig.toolbarCustomizationDisabled = app.program.uiConfig.blockCustomizationMode;
    }
    if (!app.program.uiConfig.blockCustomizationMode) {
      app.setHelpForCurrentAppState();
    }
  }, isEnabled:function(app) {
    return !app.program.noVPL && !app.program.readOnly;
  }, isSelected:function(app) {
    return app.program.uiConfig.blockCustomizationMode;
  }, object:this, keep:true, isAvailable:function(app) {
    return app.program.teacherRole !== A3a.vpl.Program.teacherRoleType.student && !app.program.readOnly;
  }, possibleStates:[{selected:false}, {selected:true}]});
  this.commands.add("vpl:teacher-reset", {action:function(app, modifier) {
    if (modifier) {
      A3a.vpl.Program.enableAllBlocks(app.program.mode);
      app.program.enabledBlocksBasic = A3a.vpl.Program.basicBlocks;
      app.program.enabledBlocksAdvanced = A3a.vpl.Program.advancedBlocks;
    } else {
      A3a.vpl.Program.resetBlockLib();
      app.program.new();
      app.program.resetUI();
    }
  }, isEnabled:function(app) {
    return !app.program.noVPL;
  }, object:this, keep:true, isAvailable:function(app) {
    return app.program.teacherRole !== A3a.vpl.Program.teacherRoleType.student && app.program.uiConfig.blockCustomizationMode && !app.program.readOnly;
  }});
  this.commands.add("vpl:teacher-save", {action:function(app, modifier) {
    var json = app.program.exportToJSON({lib:true, prog:false});
    A3a.vpl.Program.downloadText(json, A3a.vpl.Program.defaultFilenameUI, A3a.vpl.Program.mimetypeUI);
  }, isEnabled:function(app) {
    return !app.program.noVPL;
  }, object:this, keep:true, isAvailable:function(app) {
    return app.program.teacherRole !== A3a.vpl.Program.teacherRoleType.student && app.program.uiConfig.blockCustomizationMode && !app.program.readOnly;
  }});
  this.commands.add("vpl:teacher-setasnew", {action:function(app, modifier) {
    var json = app.program.exportToJSON({lib:true, prog:false});
    app.jsonForNew = app.jsonForNew === json ? null : json;
  }, isSelected:function(app) {
    return app.jsonForNew === app.program.exportToJSON({lib:true, prog:false});
  }, object:this, keep:true, isAvailable:function(app) {
    return app.program.teacherRole !== A3a.vpl.Program.teacherRoleType.student && app.program.uiConfig.blockCustomizationMode && !app.program.readOnly;
  }, possibleStates:[{selected:false}, {selected:true}]});
};
A3a.vpl.ControlBar = function(canvas) {
  this.canvas = canvas;
  this.controls = [];
  this.layout = "";
  this.x = 0;
  this.y = 0;
};
A3a.vpl.ControlBar.controlBarItemDraw;
A3a.vpl.ControlBar.Bounds;
A3a.vpl.ControlBar.prototype.reset = function() {
  this.controls = [];
  this.layout = "";
};
A3a.vpl.ControlBar.prototype.addControl = function(draw, bounds, cb, id) {
  this.controls.push({draw:draw, cb:cb || null, id:id || "", bounds:bounds, x:0, y:0});
  this.layout += "X";
};
A3a.vpl.ControlBar.prototype.addSpace = function(nonDiscardable) {
  this.layout += nonDiscardable ? "_" : " ";
};
A3a.vpl.ControlBar.prototype.addStretch = function(nonDiscardable) {
  this.layout += nonDiscardable ? "S" : "s";
};
A3a.vpl.ControlBar.prototype.calcLayout = function(toolbarBox, itemBoxes, separatorBox) {
  this.x = toolbarBox.x;
  this.y = toolbarBox.y;
  var layout = this.layout.replace(/^[s ]+/, "").replace(/[s ]+$/, "").replace(/ +/g, " ").replace(/s +/g, "s").replace(/ +s/g, "s").replace(/s+/g, "s");
  var itemsTotalWidth = 0;
  var sepCount = 0;
  var stretchCount = 0;
  var controlIx = 0;
  for (var i = 0; i < layout.length; i++) {
    switch(layout[i]) {
      case "X":
        itemsTotalWidth += itemBoxes[this.controls[controlIx].id].totalWidth();
        controlIx++;
        break;
      case " ":
      case "_":
        sepCount++;
        break;
      case "s":
      case "S":
        stretchCount++;
        break;
    }
  }
  var separatorGap = separatorBox ? separatorBox.totalWidth() : 0;
  var stretchSize = 0;
  if (itemsTotalWidth >= toolbarBox.width) {
    separatorGap = 0;
  } else {
    while (true) {
      var s = itemsTotalWidth + separatorGap * sepCount;
      stretchSize = (toolbarBox.width - s) / stretchCount;
      if (stretchSize >= separatorGap || !(separatorGap > 0)) {
        break;
      }
      separatorGap /= 2;
    }
  }
  controlIx = 0;
  var p = toolbarBox.x;
  for (var i = 0; i < layout.length; i++) {
    switch(layout[i]) {
      case "X":
        var control = this.controls[controlIx];
        control.x = p + itemBoxes[control.id].offsetLeft();
        p += itemBoxes[control.id].totalWidth();
        control.y = toolbarBox.y + itemBoxes[control.id].offsetTop();
        controlIx++;
        break;
      case " ":
      case "_":
        p += separatorGap;
        break;
      case "s":
      case "S":
        p += stretchSize;
        break;
    }
  }
};
A3a.vpl.ControlBar.prototype.addToCanvas = function(toolbarBox, itemBoxes, doOver) {
  var self = this;
  this.canvas.addDecoration(function(ctx) {
    toolbarBox.drawAt(ctx, self.x, self.y);
  });
  this.controls.forEach(function(control) {
    this.canvas.addControl(control.x, control.y, itemBoxes[control.id], function(ctx, box, isPressed) {
      var sc = Math.min(box.width / (control.bounds.xmax - control.bounds.xmin), box.height / (control.bounds.ymax - control.bounds.ymin));
      ctx.save();
      ctx.translate(-control.bounds.xmin, -control.bounds.ymin);
      if (sc !== 1) {
        ctx.scale(sc, sc);
        box = box.copy();
        box.width /= sc;
        box.height /= sc;
      }
      var disableMark = control.draw(ctx, box, isPressed);
      if (disableMark) {
        self.canvas.disabledMark(0, 0, box.width, box.height, ["button"], ["button"]);
      }
      ctx.restore();
    }, {action:control.cb.action || null, doDrop:control.cb.doDrop || null, canDrop:control.cb.canDrop || null, doOver:doOver ? function() {
      doOver(control.id);
    } : null}, control.id);
  }, this);
};
A3a.vpl.Commands.drawButtonJS = function(id, ctx, dims, css, cssClasses, box, i18n, isEnabled, isSelected, isPressed, state) {
  var col = {bg:"navy", bgPr:"#37f", bgOn:"#06f", fg:"white", fgDis:"#777", fgOff:"#44a", fgDimOn:"#ddf", fgDim:"#99a", bgTeacher:"#a00", bgTeacherOn:"#d10", bgTeacherPr:"#d00", bgTeacherPrOn:"#f50", fgTeacherDis:"#c66", fgTeacherOff:"#800"};
  col = {bg:"white", bgPr:"#ddd", bgOn:"white", fg:"#333", fgDis:"#999", fgOff:"#ddd", fgDimOn:"#555", fgDim:"#666", bgTeacher:"#fcc", bgTeacherOn:"#fcc", bgTeacherPr:"#faa", bgTeacherPrOn:"#faa", fgTeacherDis:"#866", fgTeacherOff:"#faa"};
  function drawUndo(x, y, flipped) {
    ctx.save();
    if (flipped) {
      ctx.scale(-1, 1);
      ctx.translate(-2 * x - dims.controlSize, 0);
    }
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(x, y, dims.controlSize, dims.controlSize);
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    ctx.beginPath();
    ctx.moveTo(x + dims.controlSize * 0.1, y + dims.controlSize * 0.6);
    ctx.lineTo(x + dims.controlSize * 0.4, y + dims.controlSize * 0.6);
    ctx.lineTo(x + dims.controlSize * 0.25, y + dims.controlSize * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + dims.controlSize * 0.5, y + dims.controlSize * 0.83, dims.controlSize * 0.4, 4.2, 5.6);
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = dims.controlSize * 0.08;
    ctx.stroke();
    ctx.restore();
  }
  function drawButtonTri(x, y, rot) {
    var s = dims.controlSize;
    ctx.save();
    ctx.fillStyle = isPressed ? col.bgPr : col.bg;
    ctx.fillRect(x, y, s, s);
    ctx.translate(x + s / 2, y + s / 2);
    ctx.rotate(-rot * Math.PI / 2);
    ctx.translate(-x - s / 2, -y - s / 2);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.3557, y + s * 0.25);
    ctx.lineTo(x + s * 0.3557, y + s * 0.75);
    ctx.lineTo(x + s * 0.7887, y + s * 0.5);
    ctx.closePath();
    ctx.strokeStyle = col.fg;
    ctx.lineWidth = 2 * dims.controlLineWidth;
    ctx.stroke();
    ctx.restore();
  }
  function drawRobot() {
    ctx.beginPath();
    ctx.moveTo(0, 0.5 * dims.controlSize);
    ctx.lineTo(0.5 * dims.controlSize, 0.5 * dims.controlSize);
    ctx.lineTo(0.5 * dims.controlSize, -0.25 * dims.controlSize);
    ctx.bezierCurveTo(0.3 * dims.controlSize, -0.5 * dims.controlSize, dims.controlSize * 0.02, -0.5 * dims.controlSize, 0, -0.5 * dims.controlSize);
    ctx.lineTo(0, -0.5 * dims.controlSize);
    ctx.bezierCurveTo(-0.02 * dims.controlSize, -0.5 * dims.controlSize, -0.3 * dims.controlSize, -0.5 * dims.controlSize, -0.5 * dims.controlSize, -0.25 * dims.controlSize);
    ctx.lineTo(-0.5 * dims.controlSize, 0.5 * dims.controlSize);
    ctx.closePath();
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    ctx.fill();
  }
  var draw = {"vpl:close":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize * 0.5, dims.controlSize);
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.1, dims.controlSize * 0.1);
    ctx.lineTo(dims.controlSize * 0.4, dims.controlSize * 0.4);
    ctx.moveTo(dims.controlSize * 0.1, dims.controlSize * 0.4);
    ctx.lineTo(dims.controlSize * 0.4, dims.controlSize * 0.1);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.stroke();
  }, "vpl:about":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold " + Math.round(dims.controlSize * 0.7).toString(10) + "px times";
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    ctx.fillText("i", dims.controlSize * 0.5, dims.controlSize * 0.5);
  }, "vpl:help":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold " + Math.round(dims.controlSize * 0.7).toString(10) + "px times";
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    ctx.fillText("?", dims.controlSize * 0.5, dims.controlSize * 0.5);
  }, "vpl:statement":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.strokeRect(dims.controlSize * 0.25, dims.controlSize * 0.2, dims.controlSize * 0.5, dims.controlSize * 0.6);
    ctx.beginPath();
    ctx.arc(dims.controlSize * 0.33, dims.controlSize * 0.4, dims.controlSize * 0.03, 0, 2 * Math.PI);
    ctx.arc(dims.controlSize * 0.33, dims.controlSize * 0.6, dims.controlSize * 0.03, 0, 2 * Math.PI);
    ctx.fill();
    for (var i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(dims.controlSize * 0.4, dims.controlSize * (0.32 + 0.1 * i));
      ctx.lineTo(dims.controlSize * 0.7, dims.controlSize * (0.32 + 0.1 * i));
      ctx.stroke();
      ctx.lineWidth = dims.controlSize * 0.01;
      ctx.setLineDash([dims.controlSize * 0.02, dims.controlSize * 0.02]);
    }
  }, "vpl:readonly":function() {
    var s = dims.controlSize;
    var th = 0.1;
    var ln = 0.22;
    var ln1 = 0.15;
    var lN = 0.4;
    ctx.save();
    ctx.fillStyle = col.fgDim;
    ctx.strokeStyle = col.fgDim;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.translate(s * 0.5, s * 0.7);
    ctx.save();
    ctx.rotate(0.6);
    ctx.beginPath();
    ctx.moveTo(-th * ln1 / ln * s, (ln - ln1) * s);
    ctx.lineTo(0, ln * s);
    ctx.lineTo(th * ln1 / ln * s, (ln - ln1) * s);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-th * s, -lN * s);
    ctx.lineTo(-th * s, 0);
    ctx.lineTo(0, ln * s);
    ctx.lineTo(th * s, 0);
    ctx.lineTo(th * s, -lN * s);
    ctx.restore();
    ctx.moveTo(-0.2 * s, -0.4 * s);
    ctx.lineTo(0.4 * s, 0.2 * s);
    ctx.stroke();
    ctx.restore();
  }, "vpl:new":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.25, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.25, dims.controlSize * 0.8);
    ctx.lineTo(dims.controlSize * 0.75, dims.controlSize * 0.8);
    ctx.lineTo(dims.controlSize * 0.75, dims.controlSize * 0.3);
    ctx.lineTo(dims.controlSize * 0.65, dims.controlSize * 0.2);
    ctx.closePath();
    ctx.moveTo(dims.controlSize * 0.65, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.65, dims.controlSize * 0.3);
    ctx.lineTo(dims.controlSize * 0.75, dims.controlSize * 0.3);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.stroke();
  }, "vpl:save":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.25, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.25, dims.controlSize * 0.7);
    ctx.lineTo(dims.controlSize * 0.67, dims.controlSize * 0.7);
    ctx.lineTo(dims.controlSize * 0.67, dims.controlSize * 0.27);
    ctx.lineTo(dims.controlSize * 0.6, dims.controlSize * 0.2);
    ctx.closePath();
    ctx.moveTo(dims.controlSize * 0.6, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.6, dims.controlSize * 0.27);
    ctx.lineTo(dims.controlSize * 0.67, dims.controlSize * 0.27);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.stroke();
    ctx.lineWidth = 1.5 * dims.controlLineWidth;
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.8, dims.controlSize * 0.5);
    ctx.lineTo(dims.controlSize * 0.8, dims.controlSize * 0.8);
    ctx.moveTo(dims.controlSize * 0.7, dims.controlSize * 0.7);
    ctx.lineTo(dims.controlSize * 0.8, dims.controlSize * 0.8);
    ctx.lineTo(dims.controlSize * 0.9, dims.controlSize * 0.7);
    ctx.stroke();
  }, "vpl:exportToHTML":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = 1.5 * dims.controlLineWidth;
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.8, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.8, dims.controlSize * 0.5);
    ctx.moveTo(dims.controlSize * 0.7, dims.controlSize * 0.4);
    ctx.lineTo(dims.controlSize * 0.8, dims.controlSize * 0.5);
    ctx.lineTo(dims.controlSize * 0.9, dims.controlSize * 0.4);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold " + Math.round(dims.controlSize * 0.3).toString(10) + "px sans-serif";
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    ctx.fillText("HTML", dims.controlSize * 0.5, dims.controlSize * 0.7);
    ctx.stroke();
  }, "vpl:load":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.25, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.25, dims.controlSize * 0.7);
    ctx.lineTo(dims.controlSize * 0.67, dims.controlSize * 0.7);
    ctx.lineTo(dims.controlSize * 0.67, dims.controlSize * 0.27);
    ctx.lineTo(dims.controlSize * 0.6, dims.controlSize * 0.2);
    ctx.closePath();
    ctx.moveTo(dims.controlSize * 0.6, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.6, dims.controlSize * 0.27);
    ctx.lineTo(dims.controlSize * 0.67, dims.controlSize * 0.27);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.stroke();
    ctx.lineWidth = 1.5 * dims.controlLineWidth;
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.8, dims.controlSize * 0.55);
    ctx.lineTo(dims.controlSize * 0.8, dims.controlSize * 0.85);
    ctx.moveTo(dims.controlSize * 0.7, dims.controlSize * 0.65);
    ctx.lineTo(dims.controlSize * 0.8, dims.controlSize * 0.55);
    ctx.lineTo(dims.controlSize * 0.9, dims.controlSize * 0.65);
    ctx.stroke();
  }, "vpl:upload":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.25, dims.controlSize * 0.25);
    ctx.lineTo(dims.controlSize * 0.25, dims.controlSize * 0.75);
    ctx.lineTo(dims.controlSize * 0.67, dims.controlSize * 0.75);
    ctx.lineTo(dims.controlSize * 0.67, dims.controlSize * 0.32);
    ctx.lineTo(dims.controlSize * 0.6, dims.controlSize * 0.25);
    ctx.closePath();
    ctx.moveTo(dims.controlSize * 0.6, dims.controlSize * 0.25);
    ctx.lineTo(dims.controlSize * 0.6, dims.controlSize * 0.32);
    ctx.lineTo(dims.controlSize * 0.67, dims.controlSize * 0.32);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.stroke();
    var top = 0.15;
    if (state === "uploaded" || state === "canUploadAgain") {
      ctx.beginPath();
      ctx.moveTo(dims.controlSize * 0.7, dims.controlSize * 0.1);
      ctx.lineTo(dims.controlSize * 0.7, dims.controlSize * 0.35);
      ctx.lineTo(dims.controlSize * 0.9, dims.controlSize * 0.35);
      ctx.lineTo(dims.controlSize * 0.9, dims.controlSize * 0.16);
      ctx.lineTo(dims.controlSize * 0.84, dims.controlSize * 0.1);
      ctx.closePath();
      ctx.fillStyle = col.fgDim;
      ctx.fill();
      top = 0.4;
    }
    ctx.lineWidth = 1.5 * dims.controlLineWidth;
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.8, dims.controlSize * (top / 1.5 + 0.35));
    ctx.lineTo(dims.controlSize * 0.8, dims.controlSize * top);
    ctx.moveTo(dims.controlSize * 0.7, dims.controlSize * (top + 0.1));
    ctx.lineTo(dims.controlSize * 0.8, dims.controlSize * top);
    ctx.lineTo(dims.controlSize * 0.9, dims.controlSize * (top + 0.1));
    ctx.stroke();
    ctx.fillStyle = isEnabled ? isSelected || isPressed ? col.fg : col.fgOff : col.fgDis;
    ctx.fillRect(dims.controlSize * 0.1, dims.controlSize * 0.8, dims.controlSize * 0.8, dims.controlSize * 0.1);
  }, "vpl:text":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.25, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.25, dims.controlSize * 0.8);
    ctx.lineTo(dims.controlSize * 0.75, dims.controlSize * 0.8);
    ctx.lineTo(dims.controlSize * 0.75, dims.controlSize * 0.3);
    ctx.lineTo(dims.controlSize * 0.65, dims.controlSize * 0.2);
    ctx.closePath();
    ctx.moveTo(dims.controlSize * 0.65, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.65, dims.controlSize * 0.3);
    ctx.lineTo(dims.controlSize * 0.75, dims.controlSize * 0.3);
    for (var y = 0.2; y < 0.6; y += 0.1) {
      ctx.moveTo(dims.controlSize * 0.3, dims.controlSize * (0.2 + y));
      ctx.lineTo(dims.controlSize * 0.7, dims.controlSize * (0.2 + y));
    }
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.stroke();
  }, "vpl:text-toggle":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.28, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.28, dims.controlSize * 0.7);
    ctx.lineTo(dims.controlSize * 0.70, dims.controlSize * 0.7);
    ctx.lineTo(dims.controlSize * 0.70, dims.controlSize * 0.27);
    ctx.lineTo(dims.controlSize * 0.63, dims.controlSize * 0.2);
    ctx.closePath();
    ctx.moveTo(dims.controlSize * 0.63, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.63, dims.controlSize * 0.27);
    ctx.lineTo(dims.controlSize * 0.70, dims.controlSize * 0.27);
    for (var y = 0.1; y < 0.5; y += 0.1) {
      ctx.moveTo(dims.controlSize * 0.33, dims.controlSize * (0.2 + y));
      ctx.lineTo(dims.controlSize * 0.63, dims.controlSize * (0.2 + y));
    }
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.stroke();
    ctx.fillStyle = isEnabled ? isSelected || isPressed ? col.fg : col.fgOff : col.fgDis;
    ctx.fillRect(dims.controlSize * 0.1, dims.controlSize * 0.8, dims.controlSize * 0.8, dims.controlSize * 0.1);
  }, "vpl:advanced":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : isSelected ? col.bgOn : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    for (var i = 0; i < 4; i++) {
      for (var j = 0; j < 5; j++) {
        ctx.fillRect(dims.controlSize * 0.1 * (1 + i) + (i < 2 ? 0 : dims.controlSize * 0.43), dims.controlSize * 0.1 * (2 + j), dims.controlSize * 0.07, dims.controlSize * 0.07);
      }
    }
    ctx.fillStyle = !isEnabled ? col.fgDis : isSelected || isPressed ? col.fg : col.fgOff;
    ctx.fillRect(dims.controlSize * 0.1, dims.controlSize * 0.8, dims.controlSize * 0.8, dims.controlSize * 0.1);
  }, "vpl:undo":function() {
    drawUndo(0, 0, false);
  }, "vpl:redo":function() {
    drawUndo(0, 0, true);
  }, "vpl:add-comment":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.2, dims.controlSize * 0.6);
    ctx.lineTo(dims.controlSize * 0.8, dims.controlSize * 0.6);
    ctx.moveTo(dims.controlSize * 0.7, dims.controlSize * 0.35);
    ctx.lineTo(dims.controlSize * 0.9, dims.controlSize * 0.35);
    ctx.moveTo(dims.controlSize * 0.8, dims.controlSize * 0.25);
    ctx.lineTo(dims.controlSize * 0.8, dims.controlSize * 0.45);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.stroke();
    ctx.strokeRect(dims.controlSize * 0.1, dims.controlSize * 0.5, dims.controlSize * 0.8, dims.controlSize * 0.2);
  }, "vpl:run":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.3, dims.controlSize * 0.25);
    ctx.lineTo(dims.controlSize * 0.3, dims.controlSize * 0.75);
    ctx.lineTo(dims.controlSize * 0.8, dims.controlSize * 0.5);
    ctx.closePath();
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    ctx.fill();
    ctx.fillStyle = isEnabled ? isSelected || isPressed ? col.fg : col.fgOff : col.fgDis;
    ctx.fillRect(dims.controlSize * 0.1, dims.controlSize * 0.8, dims.controlSize * 0.8, dims.controlSize * 0.1);
  }, "vpl:stop":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    ctx.fillRect(dims.controlSize * 0.28, dims.controlSize * 0.28, dims.controlSize * 0.44, dims.controlSize * 0.44);
  }, "vpl:debug":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.save();
    ctx.translate(0.5 * dims.controlSize, 0.42 * dims.controlSize);
    ctx.scale(0.0085 * dims.controlSize, 0.012 * dims.controlSize);
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, 2 * Math.PI);
    ctx.moveTo(-13, -10);
    ctx.bezierCurveTo(0, -5, 0, -5, 13, -10);
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 20);
    ctx.moveTo(-18, -5);
    ctx.lineTo(-30, -10);
    ctx.moveTo(-18, 2);
    ctx.lineTo(-32, 6);
    ctx.moveTo(-15, 10);
    ctx.lineTo(-26, 18);
    ctx.moveTo(18, -5);
    ctx.lineTo(30, -10);
    ctx.moveTo(18, 2);
    ctx.lineTo(32, 6);
    ctx.moveTo(15, 10);
    ctx.lineTo(26, 18);
    ctx.restore();
    ctx.stroke();
    ctx.fillStyle = isEnabled ? isSelected || isPressed ? col.fg : col.fgOff : col.fgDis;
    ctx.fillRect(dims.controlSize * 0.1, dims.controlSize * 0.8, dims.controlSize * 0.8, dims.controlSize * 0.1);
  }, "vpl:flash":function() {
    var s = dims.controlSize;
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, s, s);
    ctx.save();
    ctx.translate(s * 0.6, s * 0.4);
    ctx.scale(0.4, 0.4);
    drawRobot();
    ctx.restore();
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(s * 0.25, s * 0.4);
    ctx.rotate(-Math.PI / 2);
    ctx.font = "bold " + Math.round(s / 4).toString(10) + "px sans-serif";
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    ctx.fillText("flash", 0, 0);
    ctx.restore();
    ctx.fillStyle = isEnabled ? isSelected || isPressed ? col.fg : col.fgOff : col.fgDis;
    ctx.fillRect(dims.controlSize * 0.1, dims.controlSize * 0.8, dims.controlSize * 0.8, dims.controlSize * 0.1);
  }, "vpl:connected":function() {
    isEnabled = false;
    ctx.translate(0, 0.1 * dims.controlSize);
    ctx.save();
    ctx.translate(dims.controlSize * 0.8, dims.controlSize * 0.2);
    ctx.scale(0.35, 0.35);
    drawRobot();
    ctx.restore();
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = 1.5 * dims.controlLineWidth;
    if (state) {
      ctx.strokeRect(0, 0.05 * dims.controlSize, 0.3 * dims.controlSize, 0.3 * dims.controlSize);
    }
    ctx.strokeRect(0.3 * dims.controlSize, 0.55 * dims.controlSize, 0.4 * dims.controlSize, 0.3 * dims.controlSize);
    ctx.lineWidth = dims.controlLineWidth;
    ctx.beginPath();
    ctx.moveTo(0.7 * dims.controlSize, 0.7 * dims.controlSize);
    ctx.bezierCurveTo(0.9 * dims.controlSize, 0.7 * dims.controlSize, 0.9 * dims.controlSize, 0.7 * dims.controlSize, 0.85 * dims.controlSize, 0.35 * dims.controlSize);
    if (state) {
      ctx.moveTo(0.3 * dims.controlSize, 0.7 * dims.controlSize);
      ctx.bezierCurveTo(0.1 * dims.controlSize, 0.7 * dims.controlSize, 0.1 * dims.controlSize, 0.7 * dims.controlSize, 0.15 * dims.controlSize, 0.35 * dims.controlSize);
    }
    ctx.stroke();
    function cross(x, y) {
      var s = 0.08 * dims.controlSize;
      ctx.save();
      ctx.fillStyle = isEnabled ? col.bgPr : col.bg;
      ctx.fillRect(x - s, y - s, 2 * s, 2 * s);
      ctx.beginPath();
      ctx.moveTo(x - s, y - s);
      ctx.lineTo(x + s, y + s);
      ctx.moveTo(x + s, y - s);
      ctx.lineTo(x - s, y + s);
      ctx.stroke();
      ctx.restore();
    }
    if (!isSelected) {
      cross(0.86 * dims.controlSize, 0.55 * dims.controlSize);
    }
    if (state === "nonmonitored") {
      cross(0.14 * dims.controlSize, 0.55 * dims.controlSize);
    }
  }, "vpl:robot":function() {
    ctx.fillStyle = isPressed ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    switch(state) {
      case "thymio":
        ctx.save();
        ctx.translate(dims.controlSize / 2, dims.controlSize * 0.35);
        ctx.scale(0.3, 0.3);
        ctx.rotate(0.2);
        drawRobot();
        ctx.restore();
        break;
      case "thymio-tdm":
        ctx.save();
        ctx.translate(dims.controlSize / 2, dims.controlSize * 0.35);
        ctx.scale(0.3, 0.3);
        ctx.rotate(0.2);
        drawRobot();
        ctx.restore();
        ctx.fillStyle = col.fg;
        ctx.fillRect(dims.controlSize * 0.4, dims.controlSize * 0.65, dims.controlSize * 0.2, dims.controlSize * 0.2);
        break;
      case "sim":
        ctx.save();
        ctx.translate(dims.controlSize / 2, dims.controlSize * 0.35);
        ctx.scale(0.3, 0.3);
        ctx.rotate(0.2);
        drawRobot();
        ctx.beginPath();
        ctx.strokeStyle = col.fg;
        ctx.lineWidth = dims.controlLineWidth / 0.3;
        ctx.strokeRect(-dims.controlSize, -0.8 * dims.controlSize, 2 * dims.controlSize, 1.6 * dims.controlSize);
        ctx.restore();
        break;
    }
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.2, dims.controlSize * 0.75);
    ctx.lineTo(dims.controlSize * 0.5, dims.controlSize * 0.75);
    ctx.lineTo(dims.controlSize * 0.5, dims.controlSize * (state === "sim" ? 0.6 : 0.3));
    ctx.strokeStyle = col.fg;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.stroke();
  }, "vpl:sim":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.save();
    ctx.translate(dims.controlSize / 2, dims.controlSize * 0.35);
    ctx.scale(0.4, 0.4);
    ctx.rotate(0.2);
    drawRobot();
    ctx.beginPath();
    ctx.arc(dims.controlSize, 0.5 * dims.controlSize, 1.4 * dims.controlSize, -3.2, -3.8, true);
    ctx.strokeStyle = isPressed && isEnabled ? col.fgDimOn : col.fgDim;
    ctx.lineWidth = 0.2 * dims.controlSize;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(dims.controlSize, 0.5 * dims.controlSize, 0.6 * dims.controlSize, -3.3, -3.8, true);
    ctx.stroke();
    ctx.restore();
  }, "vpl:message-empty":function() {
  }, "vpl:message-error":function(app) {
    if (state) {
      ctx.fillStyle = box.color;
      ctx.font = box.cssFontString();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var msg = i18n.translate(state);
      ctx.fillText(msg, box.width / 2, box.height / 2);
    }
  }, "vpl:filename":function(app) {
    if (state) {
      ctx.beginPath();
      var w = 3 * dims.controlSize;
      ctx.rect(0, 0, w, dims.controlSize);
      ctx.clip();
      ctx.fillStyle = box.color;
      ctx.font = box.cssFontString();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var str = state.trim();
      var strArray = str.split("\n").slice(0, 2).map(function(s) {
        s = s.slice(0, 80);
        if (s.length > 1 && ctx.measureText(s).width > w) {
          while (s.length > 1 && ctx.measureText(s + "\u2026").width > w) {
            s = s.slice(0, -1);
          }
          s += "\u2026";
        }
        return s;
      });
      if (strArray.length > 1) {
        ctx.fillText(strArray[0], box.width / 2, box.height * 0.25);
        ctx.fillText(strArray[1], box.width / 2, box.height * 0.75);
      } else {
        ctx.fillText(strArray[0], box.width / 2, box.height / 2);
      }
    }
  }, "vpl:duplicate":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.strokeRect(dims.controlSize * 0.3, dims.controlSize * 0.3, dims.controlSize * 0.4, dims.controlSize * 0.15);
    ctx.strokeRect(dims.controlSize * 0.3, dims.controlSize * 0.55, dims.controlSize * 0.4, dims.controlSize * 0.15);
  }, "vpl:disable":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.strokeRect(dims.controlSize * 0.3, dims.controlSize * 0.3, dims.controlSize * 0.4, dims.controlSize * 0.4);
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.2, dims.controlSize * 0.6);
    ctx.lineTo(dims.controlSize * 0.8, dims.controlSize * 0.4);
    ctx.stroke();
  }, "vpl:lock":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.strokeRect(dims.controlSize * 0.3, dims.controlSize * 0.3, dims.controlSize * 0.4, dims.controlSize * 0.4);
    A3a.vpl.Canvas.lock(ctx, dims.controlSize * 0.5, dims.controlSize * 0.52, dims.controlSize * 0.04, col.fg);
  }, "vpl:trashcan":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.25, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.32, dims.controlSize * 0.8);
    ctx.lineTo(dims.controlSize * 0.68, dims.controlSize * 0.8);
    ctx.lineTo(dims.controlSize * 0.75, dims.controlSize * 0.2);
    ctx.closePath();
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.stroke();
  }, "vpl:teacher-reset":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgTeacherPr : col.bgTeacher;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.25, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.25, dims.controlSize * 0.8);
    ctx.lineTo(dims.controlSize * 0.75, dims.controlSize * 0.8);
    ctx.lineTo(dims.controlSize * 0.75, dims.controlSize * 0.3);
    ctx.lineTo(dims.controlSize * 0.65, dims.controlSize * 0.2);
    ctx.closePath();
    ctx.moveTo(dims.controlSize * 0.65, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.65, dims.controlSize * 0.3);
    ctx.lineTo(dims.controlSize * 0.75, dims.controlSize * 0.3);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgTeacherDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.stroke();
    ctx.fillStyle = isEnabled ? col.fg : col.fgTeacherDis;
    A3a.vpl.Canvas.drawHexagonalNut(ctx, dims.controlSize * 0.63, dims.controlSize * 0.7, dims.controlSize * 0.2);
  }, "vpl:teacher-save":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgTeacherPr : col.bgTeacher;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgTeacherDis;
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.25, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.25, dims.controlSize * 0.7);
    ctx.lineTo(dims.controlSize * 0.67, dims.controlSize * 0.7);
    ctx.lineTo(dims.controlSize * 0.67, dims.controlSize * 0.27);
    ctx.lineTo(dims.controlSize * 0.6, dims.controlSize * 0.2);
    ctx.closePath();
    ctx.moveTo(dims.controlSize * 0.6, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.6, dims.controlSize * 0.27);
    ctx.lineTo(dims.controlSize * 0.67, dims.controlSize * 0.27);
    ctx.lineWidth = dims.controlLineWidth;
    ctx.stroke();
    ctx.lineWidth = 1.5 * dims.controlLineWidth;
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.8, dims.controlSize * 0.5);
    ctx.lineTo(dims.controlSize * 0.8, dims.controlSize * 0.8);
    ctx.moveTo(dims.controlSize * 0.7, dims.controlSize * 0.7);
    ctx.lineTo(dims.controlSize * 0.8, dims.controlSize * 0.8);
    ctx.lineTo(dims.controlSize * 0.9, dims.controlSize * 0.7);
    ctx.stroke();
    ctx.fillStyle = isEnabled ? col.fg : col.fgTeacherDis;
    A3a.vpl.Canvas.drawHexagonalNut(ctx, dims.controlSize * 0.46, dims.controlSize * 0.45, dims.controlSize * 0.2);
  }, "vpl:teacher-setasnew":function() {
    ctx.fillStyle = isPressed && isEnabled ? isSelected ? col.bgTeacherPrOn : col.bgTeacherPr : isSelected && isEnabled ? col.bgTeacherOn : col.bgTeacher;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgTeacherDis;
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.25, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.25, dims.controlSize * 0.7);
    ctx.lineTo(dims.controlSize * 0.67, dims.controlSize * 0.7);
    ctx.lineTo(dims.controlSize * 0.67, dims.controlSize * 0.27);
    ctx.lineTo(dims.controlSize * 0.6, dims.controlSize * 0.2);
    ctx.closePath();
    ctx.moveTo(dims.controlSize * 0.6, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.6, dims.controlSize * 0.27);
    ctx.lineTo(dims.controlSize * 0.67, dims.controlSize * 0.27);
    ctx.lineWidth = dims.controlLineWidth;
    ctx.stroke();
    ctx.lineWidth = 1.5 * dims.controlLineWidth;
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.8, dims.controlSize * 0.5);
    ctx.lineTo(dims.controlSize * 0.5, dims.controlSize * 0.5);
    ctx.moveTo(dims.controlSize * 0.6, dims.controlSize * 0.4);
    ctx.lineTo(dims.controlSize * 0.5, dims.controlSize * 0.5);
    ctx.lineTo(dims.controlSize * 0.6, dims.controlSize * 0.6);
    ctx.stroke();
    ctx.fillStyle = !isEnabled ? col.fgDis : isSelected || isPressed ? col.fg : col.fgTeacherOff;
    ctx.fillRect(dims.controlSize * 0.1, dims.controlSize * 0.8, dims.controlSize * 0.8, dims.controlSize * 0.1);
  }, "vpl:teacher":function() {
    ctx.fillStyle = isPressed && isEnabled ? isSelected ? col.bgTeacherPrOn : col.bgTeacherPr : isSelected && isEnabled ? col.bgTeacherOn : col.bgTeacher;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.fillStyle = isEnabled ? col.fg : col.fgTeacherDis;
    A3a.vpl.Canvas.drawHexagonalNut(ctx, dims.controlSize * 0.5, dims.controlSize * 0.4, dims.controlSize * 0.27);
    ctx.fillStyle = !isEnabled ? col.fgDis : isSelected || isPressed ? col.fg : col.fgTeacherOff;
    ctx.fillRect(dims.controlSize * 0.1, dims.controlSize * 0.8, dims.controlSize * 0.8, dims.controlSize * 0.1);
  }, "src:vpl":function() {
    ctx.save();
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.25, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.25, dims.controlSize * 0.8);
    ctx.lineTo(dims.controlSize * 0.75, dims.controlSize * 0.8);
    ctx.lineTo(dims.controlSize * 0.75, dims.controlSize * 0.3);
    ctx.lineTo(dims.controlSize * 0.65, dims.controlSize * 0.2);
    ctx.closePath();
    ctx.moveTo(dims.controlSize * 0.65, dims.controlSize * 0.2);
    ctx.lineTo(dims.controlSize * 0.65, dims.controlSize * 0.3);
    ctx.lineTo(dims.controlSize * 0.75, dims.controlSize * 0.3);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.stroke();
    ctx.fillStyle = isPressed && isEnabled ? col.fg : col.fgDim;
    for (var y = 0.15; y < 0.6; y += 0.15) {
      ctx.fillRect(dims.controlSize * 0.3, dims.controlSize * (0.2 + y), dims.controlSize * 0.4, dims.controlSize * 0.10);
    }
    ctx.restore();
  }, "src:locked":function() {
    ctx.save();
    ctx.fillStyle = !isEnabled ? col.bg : isPressed ? col.bgPr : isSelected ? col.bgOn : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.fillStyle = !isEnabled ? col.fgDis : isSelected ? col.fgDimOn : col.fgDim;
    for (var y = 0.15; y < 0.6; y += 0.15) {
      ctx.fillRect(dims.controlSize * 0.15, dims.controlSize * (0 + y), dims.controlSize * 0.4, dims.controlSize * 0.10);
    }
    A3a.vpl.Canvas.lock(ctx, dims.controlSize * 0.77, dims.controlSize * 0.36, dims.controlSize * 0.06, isEnabled ? col.fg : col.fgDis, !isSelected);
    ctx.fillStyle = !isEnabled ? col.fgDis : isSelected || isPressed ? col.fg : col.fgOff;
    ctx.fillRect(dims.controlSize * 0.1, dims.controlSize * 0.8, dims.controlSize * 0.8, dims.controlSize * 0.1);
    ctx.restore();
  }, "src:language":function() {
    var languageAbbr = {"aseba":"Aa", "l2":"l2", "asm":"asm", "js":"js", "python":"Py"};
    var s = dims.controlSize;
    ctx.save();
    ctx.fillStyle = !isEnabled ? col.bg : isPressed ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, s, s);
    ctx.beginPath();
    for (var i = 0; i < 3; i++) {
      ctx.moveTo(s * 0.2, s * (0.2 + 0.1 * i));
      ctx.lineTo(s * 0.5, s * (0.2 + 0.1 * i));
    }
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.stroke();
    for (var i = 0; i < 3; i++) {
      var phi = 2 * (i + 0.25) / 3 * Math.PI;
      A3a.vpl.Canvas.drawArcArrow(ctx, 0.75 * s, 0.3 * s, 0.15 * s, phi - Math.PI * 0.3, phi + Math.PI * 0.3, {arrowAtStart:false, arrowSize:3 * dims.controlLineWidth, style:isEnabled ? col.fg : col.fgDis});
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold " + Math.round(s / 3).toString(10) + "px sans-serif";
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    ctx.fillText(languageAbbr[state], s * 0.5, s * 0.7);
    ctx.restore();
  }, "src:disass":function() {
    var s = dims.controlSize;
    ctx.save();
    ctx.fillStyle = isEnabled && isPressed ? col.bgPr : isSelected ? col.bgOn : col.bg;
    ctx.fillRect(0, 0, s, s);
    ctx.beginPath();
    ctx.moveTo(s * 0.2, s * 0.2);
    ctx.lineTo(s * 0.3, s * 0.2);
    for (var i = 0; i < 5; i++) {
      ctx.moveTo(s * 0.4, s * (0.2 + 0.1 * i));
      ctx.lineTo(s * 0.45, s * (0.2 + 0.1 * i));
      ctx.moveTo(s * 0.55, s * (0.2 + 0.1 * i));
      ctx.lineTo(s * 0.65, s * (0.2 + 0.1 * i));
    }
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.stroke();
    ctx.fillStyle = isEnabled && (isSelected || isPressed) ? col.fg : col.fgOff;
    ctx.fillRect(dims.controlSize * 0.1, dims.controlSize * 0.8, dims.controlSize * 0.8, dims.controlSize * 0.1);
    ctx.restore();
  }, "src:run":function() {
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.beginPath();
    ctx.moveTo(dims.controlSize * 0.3, dims.controlSize * 0.25);
    ctx.lineTo(dims.controlSize * 0.3, dims.controlSize * 0.75);
    ctx.lineTo(dims.controlSize * 0.8, dims.controlSize * 0.5);
    ctx.closePath();
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    ctx.fill();
  }, "sim:restart":function() {
    ctx.save();
    ctx.fillStyle = isPressed ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, box.width, box.height);
    var s = dims.controlSize;
    ctx.lineWidth = 0.05 * s;
    A3a.vpl.Canvas.drawArcArrow(ctx, 0.5 * s, 0.5 * s, 0.25 * s, 1.56, 0, {arrowAtStart:false, arrowSize:0.2 * s, style:col.fg});
    ctx.restore();
  }, "sim:pause":function() {
    ctx.save();
    ctx.fillStyle = isPressed ? col.bgPr : isSelected ? col.bgOn : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    ctx.fillRect(dims.controlSize * 0.28, dims.controlSize * 0.28, dims.controlSize * 0.15, dims.controlSize * 0.44);
    if (isSelected) {
      ctx.beginPath();
      ctx.moveTo(dims.controlSize * 0.54, dims.controlSize * 0.28);
      ctx.lineTo(dims.controlSize * 0.62, dims.controlSize * 0.28);
      ctx.lineTo(dims.controlSize * 0.75, dims.controlSize * 0.5);
      ctx.lineTo(dims.controlSize * 0.62, dims.controlSize * 0.72);
      ctx.lineTo(dims.controlSize * 0.54, dims.controlSize * 0.72);
      ctx.fill();
    } else {
      ctx.fillRect(dims.controlSize * 0.57, dims.controlSize * 0.28, dims.controlSize * 0.15, dims.controlSize * 0.44);
    }
    ctx.restore();
  }, "sim:speedup":function() {
    ctx.save();
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : isSelected ? col.bgOn : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    ctx.beginPath();
    for (var i = 0; i < 2; i++) {
      ctx.moveTo(dims.controlSize * (0.3 + 0.22 * i), dims.controlSize * 0.25 / 2);
      ctx.lineTo(dims.controlSize * (0.3 + 0.22 * i), dims.controlSize * 0.75 / 2);
      ctx.lineTo(dims.controlSize * (0.3 + 0.2 + 0.22 * i), dims.controlSize * 0.5 / 2);
      ctx.closePath();
    }
    ctx.fill();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold " + Math.round(dims.controlSize / 3).toString(10) + "px sans-serif";
    ctx.fillText(state >= 1 ? "\u00d7" + state.toString(10) : "\u00f7" + Math.round(1 / state).toString(10), dims.controlSize * 0.5, dims.controlSize * 0.7);
    ctx.restore();
  }, "sim:noise":function() {
    ctx.save();
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : isSelected ? col.bgOn : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.beginPath();
    var noise = [0.58, 1.48, 0.96, 0.39, 1.36, 0.09, -0.75, -1.58, -0.32, -1.36, -1.39, -0.94, -1.10, -1.04, -0.10, 0.93, 1.22, 0.60, 0.89, 0.61];
    ctx.moveTo(0.1 * dims.controlSize, (0.4 + 0.1 * noise[0]) * dims.controlSize);
    for (var i = 1; i < noise.length; i++) {
      ctx.lineTo((0.1 + 0.8 / (noise.length - 1) * i) * dims.controlSize, (0.4 + 0.1 * noise[i]) * dims.controlSize);
    }
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.stroke();
    ctx.fillStyle = !isEnabled ? col.fgDis : isSelected || isPressed ? col.fg : col.fgOff;
    ctx.fillRect(dims.controlSize * 0.1, dims.controlSize * 0.8, dims.controlSize * 0.8, dims.controlSize * 0.1);
    ctx.restore();
  }, "sim:pen":function() {
    var s = dims.controlSize;
    ctx.save();
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : isSelected ? col.bgOn : col.bg;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = !isEnabled ? col.fgDis : isSelected || isPressed ? col.fg : col.fgOff;
    ctx.fillRect(s * 0.1, s * 0.8, s * 0.8, s * 0.1);
    ctx.translate(s * 0.5, s * (0.4 + (isSelected ? 0.13 : 0)));
    var th = 0.1;
    var ln = 0.22;
    var ln1 = 0.15;
    ctx.beginPath();
    ctx.moveTo(-th * ln1 / ln * s, (ln - ln1) * s);
    ctx.lineTo(0, ln * s);
    ctx.lineTo(th * ln1 / ln * s, (ln - ln1) * s);
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-th * s, -ln * s);
    ctx.lineTo(-th * s, 0);
    ctx.lineTo(0, ln * s);
    ctx.lineTo(th * s, 0);
    ctx.lineTo(th * s, -ln * s);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.stroke();
    ctx.restore();
  }, "sim:clear":function() {
    var s = dims.controlSize;
    ctx.save();
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.lineWidth = dims.controlLineWidth;
    ctx.strokeRect(0.15 * s, 0.25 * s, 0.7 * s, 0.5 * s);
    ctx.translate(0.5 * s, 0.4 * s);
    ctx.rotate(0.4);
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    ctx.fillRect(0, 0, 0.3 * s, 0.2 * s);
    ctx.restore();
  }, "sim:map-kind":function() {
    var s = dims.controlSize;
    var lineWidth = dims.controlLineWidth;
    ctx.save();
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
    var i0 = ["ground", "height", "obstacles"].indexOf(state);
    for (var i = 0; i < 3; i++) {
      var phi = 2 * (i + 0.25) / 3 * Math.PI;
      if (i === i0) {
        ctx.fillRect(s * (0.5 - 0.15 + 0.25 * Math.cos(phi)), s * (0.5 - 0.11 + 0.25 * Math.sin(phi)), 0.3 * s, 0.22 * s);
      } else {
        ctx.strokeRect(s * (0.5 - 0.15 + 0.25 * Math.cos(phi)), s * (0.5 - 0.11 + 0.25 * Math.sin(phi)), 0.3 * s, 0.22 * s);
      }
      A3a.vpl.Canvas.drawArcArrow(ctx, 0.5 * s, 0.5 * s, 0.36 * s, phi - Math.PI * 0.42, phi - Math.PI * 0.22, {arrowAtStart:false, arrowSize:3 * lineWidth, style:col.fg});
    }
    ctx.restore();
  }, "sim:map":function() {
    function calcHeight(x, y) {
      return 0.2 * Math.cos(5 * x + 2 * y - 3) - (y - 0.9) * (y - 0.9) / 3;
    }
    var s = dims.controlSize;
    ctx.save();
    ctx.fillStyle = isPressed && isEnabled ? col.bgPr : isSelected ? col.bgOn : col.bg;
    ctx.fillRect(0, 0, dims.controlSize, dims.controlSize);
    ctx.fillStyle = !isEnabled ? col.fgDis : isSelected || isPressed ? col.fg : col.fgOff;
    ctx.fillRect(s * 0.1, s * 0.8, s * 0.8, s * 0.1);
    ctx.lineWidth = dims.controlLineWidth;
    ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
    ctx.strokeRect(0.15 * s, 0.15 * s, 0.7 * s, 0.5 * s);
    switch(state) {
      case "ground":
        ctx.lineWidth = s * 0.08;
        ctx.beginPath();
        ctx.arc(0.6 * s, 0.4 * s, 0.15 * s, -0.5 * Math.PI, 0.5 * Math.PI);
        ctx.lineTo(0.4 * s, 0.55 * s);
        ctx.arc(0.4 * s, 0.4 * s, 0.15 * s, 0.5 * Math.PI, 1.5 * Math.PI);
        ctx.closePath();
        ctx.stroke();
        break;
      case "height":
        ctx.beginPath();
        for (var y = 0; y <= 0.75; y += 0.25) {
          for (var x = 0; x <= 1; x += 0.1) {
            var z = calcHeight(x, y);
            var xd = s * (0.2 + 0.5 * x + 0.15 * y);
            var yd = s * (0.5 - 0.3 * y - 0.2 * z);
            if (x === 0) {
              ctx.moveTo(xd, yd);
            } else {
              ctx.lineTo(xd, yd);
            }
          }
        }
        ctx.stroke();
        break;
      case "obstacles":
        ctx.strokeRect(0.2 * s, 0.2 * s, 0.6 * s, 0.4 * s);
        ctx.beginPath();
        ctx.moveTo(0.4 * s, 0.2 * s);
        ctx.lineTo(0.4 * s, 0.43 * s);
        ctx.moveTo(0.6 * s, 0.6 * s);
        ctx.lineTo(0.6 * s, 0.37 * s);
        ctx.stroke();
        break;
    }
    ctx.restore();
  }, "sim:map-ground":function() {
    state = "ground";
    draw["sim:map"]();
  }, "sim:map-height":function() {
    state = "height";
    draw["sim:map"]();
  }, "sim:map-obstacles":function() {
    state = "obstacles";
    draw["sim:map"]();
  }, "sim-event:forward":function() {
    drawButtonTri(0, 0, 1);
  }, "sim-event:backward":function() {
    drawButtonTri(0, 0, 3);
  }, "sim-event:left":function() {
    drawButtonTri(0, 0, 2);
  }, "sim-event:right":function() {
    drawButtonTri(0, 0, 0);
  }, "sim-event:center":function() {
    var s = dims.controlSize;
    ctx.save();
    ctx.fillStyle = isPressed ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, s, s);
    ctx.beginPath();
    ctx.arc(0.5 * s, 0.5 * s, 0.25 * s, 0, 2 * Math.PI);
    ctx.strokeStyle = col.fg;
    ctx.lineWidth = 2 * dims.controlLineWidth;
    ctx.stroke();
    ctx.restore();
  }, "sim-event:clap":function() {
    var s = dims.controlSize;
    ctx.save();
    ctx.fillStyle = isPressed ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, s, s);
    ctx.beginPath();
    ctx.strokeStyle = col.fg;
    ctx.lineWidth = 2 * dims.controlLineWidth;
    ctx.translate(0.5 * s, 0.5 * s);
    ctx.rotate(0.1);
    for (var i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(0.12 * s, 0);
      ctx.lineTo(0.24 * s, 0);
      ctx.moveTo(0.28 * s, 0);
      ctx.lineTo(0.36 * s, 0);
      ctx.stroke();
      ctx.rotate(Math.PI / 4.5);
    }
    ctx.restore();
  }, "sim-event:tap":function() {
    var s = dims.controlSize;
    ctx.save();
    ctx.fillStyle = isPressed ? col.bgPr : col.bg;
    ctx.fillRect(0, 0, s, s);
    ctx.beginPath();
    ctx.strokeStyle = col.fg;
    ctx.lineWidth = 2 * dims.controlLineWidth;
    ctx.translate(0.6 * s, 0.6 * s);
    for (var i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, 0.15 * s * i, Math.PI * 0.9, Math.PI * 1.7);
      ctx.stroke();
    }
    ctx.moveTo(0.3 * s, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, 0.3 * s);
    ctx.stroke();
    ctx.restore();
  }};
  draw["vpl:message-warning"] = draw["vpl:message-error"];
  draw["vpl:slowdown"] = draw["sim:speedup"];
  draw["src:close"] = draw["vpl:close"];
  draw["src:new"] = draw["vpl:new"];
  draw["src:save"] = draw["vpl:save"];
  draw["src:load"] = draw["vpl:load"];
  draw["src:stop"] = draw["vpl:stop"];
  draw["src:connected"] = draw["vpl:connected"];
  draw["src:sim"] = draw["vpl:sim"];
  draw["src:teacher"] = draw["vpl:teacher"];
  draw["src:teacher-reset"] = draw["vpl:teacher-reset"];
  draw["sim:close"] = draw["vpl:close"];
  draw["sim:vpl"] = draw["src:vpl"];
  draw["sim:text"] = draw["vpl:text"];
  draw["sim:teacher"] = draw["vpl:teacher"];
  draw["sim:teacher-reset"] = draw["vpl:teacher-reset"];
  var dr = draw[id];
  if (dr) {
    dr();
  }
  return false;
};
A3a.vpl.Commands.getButtonBoundsJS = function(id, dims) {
  switch(id) {
    case "vpl:close":
    case "src:close":
    case "sim:close":
      return {xmin:0, xmax:dims.controlSize / 2, ymin:0, ymax:dims.controlSize};
    case "vpl:message-error":
    case "vpl:message-warning":
    case "vpl:message-empty":
      return {xmin:0, xmax:5 * dims.controlSize, ymin:0, ymax:dims.controlSize};
    case "vpl:filename":
      return {xmin:0, xmax:3 * dims.controlSize, ymin:0, ymax:dims.controlSize};
  }
  return {xmin:0, xmax:dims.controlSize, ymin:0, ymax:dims.controlSize};
};
A3a.vpl.ControlBar.drawButton;
A3a.vpl.ControlBar.getButtonBounds;
A3a.vpl.Application.prototype.isButtonAvailable = function(id) {
  var disabled = this.uiConfig.isDisabled(id);
  return (this.forcedCommandState ? this.forcedCommandState.isAvailable : this.commands.isAvailable(id)) && (this.uiConfig.toolbarCustomizationMode || !disabled);
};
A3a.vpl.ControlBar.prototype.addButton = function(app, id, cssClasses, drawButton, buttonBounds) {
  var disabled = app.uiConfig.isDisabled(id);
  if (app.isButtonAvailable(id)) {
    var canvas = this.canvas;
    var cmd = app.commands.find(id);
    var keepAvailable = cmd.keep;
    var obj = cmd.obj;
    this.addControl(function(ctx, box, isPressed) {
      if (app.forcedCommandState) {
        drawButton(id, ctx, canvas.dims, canvas.css, cssClasses, box, app.i18n, app.forcedCommandState.isEnabled && (keepAvailable || !app.uiConfig.toolbarCustomizationDisabled), app.forcedCommandState.isSelected, app.forcedCommandState.isPressed, app.forcedCommandState.state);
      } else {
        var isEnabled = app.commands.isEnabled(id) && (keepAvailable || !app.uiConfig.toolbarCustomizationDisabled);
        if (!isEnabled && app.uiConfig.nodragAccessibility) {
          var targetObject = app.kbdControl.getTargetObject();
          isEnabled = app.commands.canDrop(id, {data:targetObject});
        }
        drawButton(id, ctx, canvas.dims, canvas.css, cssClasses, box, app.i18n, isEnabled, app.commands.isSelected(id), isPressed, app.commands.getState(id));
      }
      return app.forcedCommandState ? app.forcedCommandState.disabled : disabled;
    }, buttonBounds, {action:app.uiConfig.toolbarCustomizationMode && !keepAvailable ? function(downEvent) {
      app.uiConfig.toggle(id);
      return 1;
    } : app.commands.hasAction(id) && (keepAvailable || !app.uiConfig.toolbarCustomizationDisabled) ? function(downEvent) {
      app.commands.execute(id, downEvent.modifier);
    } : app.uiConfig.nodragAccessibility && !(app.uiConfig.toolbarCustomizationMode && !keepAvailable && app.uiConfig.toolbarCustomizationDisabled) ? function(downEvent) {
      app.kbdControl.executeCommand(cmd);
    } : null, doDrop:app.uiConfig.toolbarCustomizationMode && !keepAvailable && app.uiConfig.toolbarCustomizationDisabled ? null : function(targetItem, droppedItem) {
      app.commands.doDrop(id, droppedItem);
    }, canDrop:app.uiConfig.toolbarCustomizationMode && !keepAvailable && app.uiConfig.toolbarCustomizationDisabled ? null : function(targetItem, droppedItem) {
      return app.commands.canDrop(id, droppedItem);
    }}, id);
  }
};
A3a.vpl.ControlBar.prototype.setButtons = function(app, buttons, cssClasses, drawButton, getButtonBounds) {
  this.reset();
  for (var i = 0; i < buttons.length; i++) {
    switch(buttons[i]) {
      case "!space":
        this.addSpace();
        break;
      case "!!space":
        this.addSpace(true);
        break;
      case "!stretch":
        this.addStretch();
        break;
      case "!!stretch":
        this.addStretch(true);
        break;
      default:
        this.addButton(app, buttons[i], cssClasses, drawButton, getButtonBounds(buttons[i], this.canvas.dims, app.commands.find(buttons[i]).obj));
        break;
    }
  }
};
A3a.vpl.ControlBar.hasAvailableButtons = function(app, buttons) {
  for (var i = 0; i < buttons.length; i++) {
    if (buttons[i][0] !== "!" && app.commands.isAvailable(buttons[i])) {
      return true;
    }
  }
  return false;
};
A3a.vpl.ControlBar.buttonBoxes = function(app, buttons, cssClasses) {
  var boxes = {};
  for (var i = 0; i < buttons.length; i++) {
    if (buttons[i][0] !== "!") {
      var buttonBox = app.css.getBox({tag:"button", id:buttons[i].replace(/:/g, "-"), clas:cssClasses, pseudoClass:app.draggedItem && app.commands.canDrop(buttons[i], app.draggedItem) ? ["possible-drop-target"] : null});
      boxes[buttons[i]] = buttonBox;
    }
  }
  return boxes;
};
A3a.vpl.ControlBar.maxBoxHeight = function(boxes) {
  var maxHeight = 0;
  for (var key in boxes) {
    if (boxes.hasOwnProperty(key)) {
      maxHeight = Math.max(maxHeight, boxes[key].totalHeight());
    }
  }
  return maxHeight;
};
A3a.vpl.widgetsJS = {"vpl:then":function(ctx, id, dims, box) {
  var s = Math.min(box.width, box.height);
  ctx.strokeStyle = dims.ruleMarks;
  ctx.lineWidth = 0.2 * s;
  ctx.beginPath();
  ctx.moveTo(-0.25 * s, -0.5 * s);
  ctx.lineTo(0.25 * s, 0);
  ctx.lineTo(-0.25 * s, 0.5 * s);
  ctx.stroke();
}, "vpl:error":function(ctx, id, dims, box) {
  var s = Math.min(box.width, box.height);
  ctx.fillStyle = "white";
  ctx.strokeStyle = dims.errorColor;
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = dims.errorColor;
  ctx.font = "bold " + Math.round(s * 0.75).toString() + "px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("?", 0, s * 0.05);
}, "vpl:warning":function(ctx, id, dims, box) {
  var s = Math.min(box.width, box.height);
  ctx.fillStyle = "white";
  ctx.strokeStyle = dims.warningColor;
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = dims.warningColor;
  ctx.font = "bold " + Math.round(s * 0.75).toString() + "px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", 0, s * 0.05);
}, "vpl:moreHigh":function(ctx, id, dims, box) {
  var s = Math.min(box.width, box.height);
  ctx.beginPath();
  ctx.moveTo(-0.2 * s, 0.1 * s);
  ctx.lineTo(0, -0.1 * s);
  ctx.lineTo(0.2 * s, 0.1 * s);
  ctx.lineWidth = s * 0.1;
  ctx.strokeStyle = "black";
  ctx.shadowColor = "white";
  ctx.shadowBlur = s * 0.2;
  ctx.stroke();
}, "vpl:moreLow":function(ctx, id, dims, box) {
  var s = Math.min(box.width, box.height);
  ctx.beginPath();
  ctx.moveTo(-0.2 * s, -0.1 * s);
  ctx.lineTo(0, 0.1 * s);
  ctx.lineTo(0.2 * s, -0.1 * s);
  ctx.lineWidth = s * 0.1;
  ctx.strokeStyle = "black";
  ctx.shadowColor = "white";
  ctx.shadowBlur = s * 0.2;
  ctx.stroke();
}, "vpl:customize":function(ctx, id, dims, box) {
  var r = Math.min(box.width, box.height) / 2;
  ctx.fillStyle = dims.ruleMarks;
  A3a.vpl.Canvas.drawHexagonalNut(ctx, 0, 0, r);
}};
A3a.vpl.Program.CanvasRenderingState = function() {
  this.programScroll = new A3a.vpl.ScrollArea(1, 1);
  this.eventScroll = new A3a.vpl.ScrollArea(1, 1);
  this.eventScroll.leftScrollbar = true;
  this.actionScroll = new A3a.vpl.ScrollArea(1, 1);
};
A3a.vpl.Application.prototype.createVPLFixedStringDoOverFun = function(str) {
  var app = this;
  return function() {
    if (app.vplHint !== str) {
      app.vplHint = str;
      app.renderProgramToCanvas();
    }
  };
};
A3a.vpl.Application.prototype.createVPLControlBarDoOverFun = function() {
  var app = this;
  return function(id) {
    if (app.vplHint !== id) {
      app.vplHint = id;
      app.renderProgramToCanvas();
    }
  };
};
A3a.vpl.Application.blockTypeCSSSelectors = {"e":"event", "s":"state", "a":"action", "c":"comment"};
A3a.vpl.Application.ItemActivityOptions;
A3a.vpl.Application.prototype.addBlockToCanvas = function(canvas, block, box, cssClasses, x, y, opts) {
  function isActionSide(type) {
    return type === A3a.vpl.blockType.action || type === A3a.vpl.blockType.comment;
  }
  var app = this;
  var program = app.program;
  var blockSize = Math.min(box.width, box.height);
  var scale = canvas.dims.blockSize != 0 ? blockSize / canvas.dims.blockSize : 1;
  var blockTypeCSSSelector = A3a.vpl.Application.blockTypeCSSSelectors[block.blockTemplate.type];
  if (blockTypeCSSSelector && cssClasses.indexOf(blockTypeCSSSelector) < 0) {
    cssClasses.push(blockTypeCSSSelector);
  }
  var item = new A3a.vpl.CanvasItem(block, box.width, box.height, x, y, function(canvas, item, dx, dy, isZoomed) {
    var ctx = canvas.ctx;
    ctx.save();
    var dims0 = canvas.dims;
    canvas.dims = A3a.vpl.Canvas.calcDims(blockSize, canvas.dims.controlSize * scale);
    box.drawAt(ctx, item.x + dx, item.y + dy);
    block.blockTemplate.renderToCanvas(canvas, item.data, box, item.x + dx, item.y + dy, isZoomed);
    if (block.locked) {
      canvas.lockedMark(item.x + dx, item.y + dy, blockSize, blockSize, true);
    }
    if (block.disabled || opts.disabled) {
      canvas.disabledMark(item.x + dx, item.y + dy, blockSize, blockSize, cssClasses, cssClasses, !block.disabled && !opts.crossedOut);
    }
    if (block.marks.kbdTarget) {
      canvas.overlayRect(item.x + dx, item.y + dy, box.width, box.height, cssClasses.concat("kbd-target"));
    }
    if (block.marks.kbdSelected) {
      canvas.overlayRect(item.x + dx, item.y + dy, box.width, box.height, cssClasses.concat("kbd-selected"));
    }
    if (block.marks.kbdSelectedParam != null && block.blockTemplate.paramAccessibility !== null) {
      var c = block.blockTemplate.paramAccessibility.controls[block.marks.kbdSelectedParam];
      canvas.overlayRect(item.x + dx + box.width * c.left, item.y + dy + box.height * c.top, box.width * (c.right - c.left), box.height * (c.bottom - c.top), cssClasses.concat("kbd-selected", "param"));
    }
    canvas.dims = dims0;
    ctx.restore();
  }, opts && opts.notInteractive || block.disabled || block.locked || block.ruleContainer && block.ruleContainer.locked || !block.blockTemplate.mousedown ? opts && opts.mousedown ? {mousedown:opts.mousedown} : null : {mousedown:block.blockTemplate.mousedown, mousedrag:block.blockTemplate.mousedrag}, opts && opts.notDropTarget ? null : function(targetBlockItem, newBlockItem) {
    if (targetBlockItem.data.ruleContainer) {
      program.saveStateBeforeChange();
      targetBlockItem.data.ruleContainer.setBlock(newBlockItem.data, targetBlockItem.data.positionInContainer, function() {
        program.saveStateBeforeChange();
      }, function() {
        program.saveStateAfterChange();
      });
      program.saveStateAfterChange();
    }
    canvas.onUpdate && canvas.onUpdate();
  }, opts && opts.notDropTarget ? null : function(targetItem, droppedItem) {
    return droppedItem.data instanceof A3a.vpl.Block && (isActionSide(targetItem.data.blockTemplate.type) === isActionSide(droppedItem.data.blockTemplate.type) || droppedItem.data.blockTemplate.type === A3a.vpl.blockType.comment) && targetItem.data !== droppedItem.data;
  });
  var canvasSize = canvas.getSize();
  if (!(opts && opts.notInteractive || !block.blockTemplate.mousedown)) {
    if (program.zoomBlocks || block.blockTemplate.alwaysZoom) {
      item.zoomOnLongPress = function(zoomedItem) {
        return canvas.makeZoomedClone(zoomedItem);
      };
    }
    if (program.touchZoomBlocks || block.blockTemplate.alwaysZoom) {
      item.zoomOnLongTouchPress = function(zoomedItem) {
        return canvas.makeZoomedClone(zoomedItem);
      };
    }
  }
  item.clickable = !(opts && opts.notClickable);
  item.draggable = !(opts && opts.notDraggable);
  item.doOver = app.createVPLFixedStringDoOverFun(block.blockTemplate.name);
  var index = canvas.itemIndex(block);
  if (this.uiConfig.nodragAccessibility && opts && opts.accessibility) {
    item.draggable = false;
    var self = this;
    item.interactiveCB = opts.accessibility.type !== A3a.vpl.KbdControl.ObjectType.none ? {mousedown:function(canvas, data, width, height, left, top, ev) {
      if (self.kbdControl.targetType !== opts.accessibility.type || self.kbdControl.targetIndex1 !== opts.accessibility.index1 || self.kbdControl.targetIndex2 !== opts.accessibility.index2) {
        self.kbdControl.targetType = opts.accessibility.type;
        self.kbdControl.targetIndex1 = opts.accessibility.index1;
        self.kbdControl.targetIndex2 = opts.accessibility.index2;
      } else {
        self.kbdControl.clickOnParamControl((ev.x - left) / width, (ev.y - top) / height);
      }
      canvas.redraw();
      return 0;
    }, mousedrag:function(canvas, data, dragIndex, width, height, left, top, ev) {
      var canvasBndRect = canvas.canvas.getBoundingClientRect();
      var x = ev.x - canvasBndRect.left;
      var y = ev.y - canvasBndRect.top;
      var isInside = x >= item.x && x < item.x + item.width && y >= item.y && y < item.y + item.height;
      if (self.kbdControl.targetType !== (isInside ? opts.accessibility.type : A3a.vpl.KbdControl.ObjectType)) {
        self.kbdControl.targetType = isInside ? opts.accessibility.type : A3a.vpl.KbdControl.ObjectType;
        canvas.redraw();
      }
    }} : {mouseup:function(canvas, data, dragIndex) {
      if (opts.accessibility.click) {
        opts.accessibility.click();
      }
    }};
  }
  canvas.setItem(item, index);
  return item;
};
A3a.vpl.BlockTemplate.BlockMarks;
A3a.vpl.Application.prototype.addBlockTemplateToCanvas = function(canvas, blockTemplate, box, x, y, kbdSelected, accessibility) {
  var block = new A3a.vpl.Block(blockTemplate, null, null);
  if (blockTemplate.typicalParam) {
    block.param = blockTemplate.typicalParam();
  }
  block.marks = {kbdSelected:kbdSelected || false, kbdSelectedParam:null, kbdTarget:false};
  var program = this.program;
  var crossedOut = (program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced).indexOf(blockTemplate.name) < 0;
  var canvasItem = this.addBlockToCanvas(canvas, block, box, ["block", "library"], x, y, {notInteractive:true, notDropTarget:true, notDraggable:program.noVPL || program.readOnly, disabled:crossedOut || program.readOnly, crossedOut:crossedOut, mousedown:this.uiConfig.blockCustomizationMode && !program.noVPL && !program.readOnly ? function(canvas, data, width, height, x, y, downEvent) {
    var a = program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced;
    if (a.indexOf(blockTemplate.name) >= 0) {
      a.splice(a.indexOf(blockTemplate.name), 1);
    } else {
      a.push(blockTemplate.name);
    }
    return 1;
  } : null, accessibility:this.uiConfig.blockCustomizationMode ? null : accessibility});
  if (blockTemplate.typicalParam) {
    canvasItem.makeDraggedItem = function(item) {
      var draggedItem = item.clone();
      draggedItem.data = new A3a.vpl.Block(blockTemplate, null, null);
      return draggedItem;
    };
  }
};
A3a.vpl.Application.measureRuleWidth = function(rule, displaySingleEvent, cssBoxes) {
  var events = [];
  var totalEvents = 0;
  events = rule.events.map(function(event, j) {
    var box = rule.error && rule.error.eventError && (rule.error.eventErrorIndices.length === 0 || rule.error.eventErrorIndices.indexOf(j) >= 0) ? rule.error.isWarning ? cssBoxes.blockContainerWarningBox : cssBoxes.blockContainerErrorBox : cssBoxes.blockContainerBox;
    box.width = event == null ? (events.length === 1 ? cssBoxes.blockEmptyEventOnlyChildBox : cssBoxes.blockEmptyEventAuxBox).totalWidth() : A3a.vpl.Program.boxForBlockType(event, j === 0, cssBoxes).totalWidth();
    totalEvents += box.totalWidth();
    return cssBoxes.blockContainerBox.width;
  });
  if (rule.events.length === 0 || !displaySingleEvent && rule.events[rule.events.length - 1] !== null) {
    cssBoxes.blockContainerBox.width = (rule.events.length === 0 ? cssBoxes.blockEmptyEventOnlyChildBox : cssBoxes.blockEmptyEventAuxBox).totalWidth();
    events.push(cssBoxes.blockContainerBox.width);
    totalEvents += cssBoxes.blockContainerBox.totalWidth();
  }
  var sep = cssBoxes.ruleSeparatorBox.totalWidth();
  var actions = [];
  var totalActions = 0;
  actions = rule.actions.map(function(action, j) {
    var box = rule.error && !rule.error.eventError && (rule.error.actionErrorIndices.length === 0 || rule.error.actionErrorIndices.indexOf(j) >= 0) ? rule.error.isWarning ? cssBoxes.blockContainerWarningBox : cssBoxes.blockContainerErrorBox : cssBoxes.blockContainerBox;
    box.width = action == null ? (actions.length === 1 ? cssBoxes.blockEmptyActionOnlyChildBox : cssBoxes.blockEmptyActionBox).totalWidth() : A3a.vpl.Program.boxForBlockType(action, j === 0, cssBoxes).totalWidth();
    totalActions += box.totalWidth();
    return box.totalWidth();
  });
  if (rule.actions.length === 0 || rule.actions[rule.actions.length - 1] !== null) {
    cssBoxes.blockContainerBox.width = (rule.actions.length === 0 ? cssBoxes.blockEmptyActionOnlyChildBox : cssBoxes.blockEmptyActionBox).totalWidth();
    actions.push(cssBoxes.blockContainerBox.width);
    totalActions += cssBoxes.blockContainerBox.totalWidth();
  }
  return {total:totalEvents + sep + totalActions, events:events, totalEvents:totalEvents, sep:sep, actions:actions, totalActions:totalActions};
};
A3a.vpl.Program.boxForBlockType = function(block, isFirst, cssBoxes) {
  switch(block.blockTemplate.type) {
    case A3a.vpl.blockType.event:
      return isFirst ? cssBoxes.blockEventMainBox : cssBoxes.blockEventAuxBox;
    case A3a.vpl.blockType.action:
      return cssBoxes.blockActionBox;
    case A3a.vpl.blockType.state:
      return cssBoxes.blockStateBox;
    case A3a.vpl.blockType.comment:
      return cssBoxes.blockCommentBox;
    default:
      throw "internal";
  }
};
A3a.vpl.Program.blockVerticalOffset = function(blockBox, containerBox) {
  switch(blockBox.verticalAlign) {
    case "middle":
      return (containerBox.height - blockBox.totalHeight()) / 2;
    case "bottom":
      return containerBox.height - blockBox.totalHeight();
    case "top":
      return 0;
    default:
      return containerBox.height - blockBox.totalHeight() - blockBox.verticalAlign;
  }
};
A3a.vpl.Application.prototype.editComment = function(ruleIndex) {
  var self = this;
  var canvas = this.vplCanvas;
  var rule = this.program.program[ruleIndex];
  if (this.textField && this.textField.ref === rule) {
    return;
  }
  this.textField = new A3a.vpl.TextField(this, {initialValue:rule.comment, display:function(str, selBegin, selEnd) {
    canvas.onUpdate && canvas.onUpdate();
  }, finish:function(str) {
    if (str !== null) {
      rule.comment = str;
    }
    self.textField = null;
    canvas.onUpdate && canvas.onUpdate();
  }, ref:rule});
};
A3a.vpl.Application.prototype.addRuleToCanvas = function(canvas, rule, ruleIndex, displaySingleEvent, maxWidthForEventRightAlign, eventX0, actionX0, y, cssBoxes) {
  var isComment = rule instanceof A3a.vpl.RuleComment;
  var canvasSize = canvas.getSize();
  var x = eventX0;
  var widths = A3a.vpl.Application.measureRuleWidth(rule, displaySingleEvent, cssBoxes);
  var self = this;
  var program = this.program;
  var ruleBox = isComment ? self.textField && self.textField.ref === rule ? cssBoxes.ruleCommentEditedBox : cssBoxes.ruleCommentBox : cssBoxes.ruleBox;
  var block0Box = rule.events.length > 0 && rule.events[0].blockTemplate.type === A3a.vpl.blockType.event ? cssBoxes.blockEventMainBox : cssBoxes.blockEventAuxBox;
  var item = new A3a.vpl.CanvasItem(rule, ruleBox.paddedWidth(), ruleBox.paddedHeight(), x - ruleBox.paddingLeft - cssBoxes.blockContainerBox.offsetLeft() - block0Box.offsetLeft(), y - ruleBox.paddingTop - cssBoxes.blockContainerBox.offsetTop() - block0Box.offsetTop(), function(canvas, item, dx, dy) {
    var ctx = canvas.ctx;
    ruleBox.drawAt(ctx, item.x + dx, item.y + dy, true);
    if (isComment) {
      ctx.save();
      ctx.fillStyle = ruleBox.color;
      ctx.font = ruleBox.cssFontString();
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      if (self.textField && self.textField.ref === rule) {
        var strLeftSize = ctx.measureText(self.textField.str.slice(0, self.textField.selBegin));
        var ascent = strLeftSize["fontBoundingBoxAscent"] || 0;
        var descent = strLeftSize["fontBoundingBoxDescent"] || 0;
        if (ascent === 0 || descent === 0) {
          ascent = ruleBox.fontSize / 2;
          descent = ascent;
        }
        var textFieldFrame = {top:item.y + dy + ruleBox.paddingTop + ruleBox.height / 2 - ascent, bottom:item.y + dy + ruleBox.paddingTop + ruleBox.height / 2 + descent, left:item.x + dx + ruleBox.paddingLeft, right:item.x + dx + ruleBox.paddingLeft + ctx.measureText(self.textField.str).width};
        var rightPos = self.textField.str.split("").map(function(c, i) {
          return ctx.measureText(self.textField.str.slice(0, i + 1)).width;
        });
        self.textField.setRenderingPos(textFieldFrame, rightPos);
        if (self.textField.selEnd === self.textField.selBegin) {
          ctx.strokeStyle = "black";
          ctx.beginPath();
          ctx.moveTo(textFieldFrame.left + strLeftSize.width, textFieldFrame.top);
          ctx.lineTo(textFieldFrame.left + strLeftSize.width, textFieldFrame.bottom);
          ctx.stroke();
        } else {
          var strSelSize = ctx.measureText(self.textField.str.slice(self.textField.selBegin, self.textField.selEnd));
          ctx.save();
          ctx.fillStyle = "silver";
          ctx.fillRect(textFieldFrame.left + strLeftSize.width - 1, textFieldFrame.top, strSelSize.width, ascent + descent);
          ctx.restore();
        }
        ctx.fillText(self.textField.str, textFieldFrame.left, item.y + dy + ruleBox.paddingTop + ruleBox.height / 2);
      } else {
        ctx.fillText(rule.comment, item.x + dx + ruleBox.paddingLeft, item.y + dy + ruleBox.paddingTop + ruleBox.height / 2);
      }
      ctx.restore();
      if (self.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.rule && self.kbdControl.selectionIndex1 === ruleIndex) {
        canvas.overlayRect(item.x + dx, item.y + dy, item.width, item.height, ["rule", "comment", "kbd-selected"]);
      }
      if (self.kbdControl.targetType === A3a.vpl.KbdControl.ObjectType.rule && self.kbdControl.targetIndex1 === ruleIndex) {
        canvas.overlayRect(item.x + dx, item.y + dy, item.width, item.height, ["rule", "comment", "kbd-target"]);
      }
    } else {
      var separatorWidth = cssBoxes.ruleSeparatorBox.totalWidth();
      cssBoxes.ruleSeparatorBox.drawAt(ctx, actionX0 - cssBoxes.ruleSeparatorBox.width - cssBoxes.ruleSeparatorBox.marginRight - cssBoxes.ruleSeparatorBox.paddingRight - cssBoxes.blockContainerBox.offsetLeft() - cssBoxes.blockActionBox.offsetLeft() + dx, item.y + (ruleBox.paddedHeight() - cssBoxes.ruleSeparatorBox.height) / 2 + dy);
      canvas.drawWidget("vpl:then", actionX0 - cssBoxes.ruleSeparatorBox.totalWidth() / 2 - cssBoxes.blockContainerBox.offsetLeft() - cssBoxes.blockActionBox.offsetLeft() + dx, item.y + ruleBox.paddedHeight() / 2 + dy, cssBoxes.ruleSeparatorBox);
      if (rule.locked) {
        canvas.lockedMark(item.x, item.y, item.width, item.height, false, rule.disabled ? "#ddd" : "");
      }
      if (self.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.rule && self.kbdControl.selectionIndex1 === ruleIndex) {
        canvas.overlayRect(item.x + dx, item.y + dy, item.width, item.height, ["rule", "kbd-selected"]);
      }
      if (self.kbdControl.targetType === A3a.vpl.KbdControl.ObjectType.rule && self.kbdControl.targetIndex1 === ruleIndex) {
        canvas.overlayRect(item.x + dx, item.y + dy, item.width, item.height, ["rule", "kbd-target"]);
      }
      var x = item.x + dx + ruleBox.paddingLeft;
      if (maxWidthForEventRightAlign > 0) {
        x += maxWidthForEventRightAlign - widths.totalEvents;
      }
      events.forEach(function(event, j) {
        var box = rule.error && rule.error.eventError && (rule.error.eventErrorIndices.length === 0 || rule.error.eventErrorIndices.indexOf(j) >= 0) ? rule.error.isWarning ? cssBoxes.blockContainerWarningBox : cssBoxes.blockContainerErrorBox : cssBoxes.blockContainerBox;
        box.width = event == null ? (events.length === 1 ? cssBoxes.blockEmptyEventOnlyChildBox : cssBoxes.blockEmptyEventAuxBox).totalWidth() : A3a.vpl.Program.boxForBlockType(event, j === 0, cssBoxes).totalWidth();
        box.drawAt(ctx, x + box.marginLeft, item.y + dy + ruleBox.paddingTop + cssBoxes.blockContainerBox.marginTop, true);
        x += box.totalWidth();
      });
      x = item.x + dx + ruleBox.paddingLeft + actionX0 - eventX0;
      actions.forEach(function(action, j) {
        var box = rule.error && !rule.error.eventError && (rule.error.actionErrorIndices.length === 0 || rule.error.actionErrorIndices.indexOf(j) >= 0) ? rule.error.isWarning ? cssBoxes.blockContainerWarningBox : cssBoxes.blockContainerErrorBox : cssBoxes.blockContainerBox;
        box.width = action == null ? (actions.length === 1 ? cssBoxes.blockEmptyActionOnlyChildBox : cssBoxes.blockEmptyActionBox).totalWidth() : A3a.vpl.Program.boxForBlockType(action, j === 0, cssBoxes).totalWidth();
        box.drawAt(ctx, x + box.marginLeft, item.y + dy + ruleBox.paddingTop + cssBoxes.blockContainerBox.marginTop, true);
        x += box.totalWidth();
      });
    }
  }, isComment ? {mouseup:function(canvas, data, dragIndex, width, height, left, top, ev) {
    self.editComment(ruleIndex);
  }} : null, function(targetItem, droppedItem) {
    if (droppedItem.data instanceof A3a.vpl.Rule) {
      var targetIndex = program.program.indexOf(targetItem.data);
      var droppedIndex = program.program.indexOf(droppedItem.data);
      if (targetIndex >= 0 && droppedIndex >= 0) {
        program.saveStateBeforeChange();
        program.program.splice(droppedIndex, 1);
        program.program.splice(targetIndex, 0, droppedItem.data);
        program.saveStateAfterChange();
      }
    } else {
      if (droppedItem.data instanceof A3a.vpl.Block) {
        program.saveStateBeforeChange();
        targetItem.data.setBlock(droppedItem.data, null, function() {
          program.saveStateBeforeChange();
        }, function() {
          program.saveStateAfterChange();
        });
        program.saveStateAfterChange();
      }
    }
    canvas.onUpdate && canvas.onUpdate();
  }, function(targetItem, droppedItem) {
    return droppedItem.data instanceof A3a.vpl.Rule ? droppedItem.data !== targetItem.data : !isComment && droppedItem.data.ruleContainer !== targetItem.data && (program.mode === A3a.vpl.mode.advanced || targetItem.data.events.length === 0 || droppedItem.data instanceof A3a.vpl.Block && droppedItem.data.blockTemplate.type === A3a.vpl.blockType.action);
  });
  if (rule.disabled) {
    item.drawOverlay = function(ctx, item, dx, dy, isZoomed) {
      canvas.disabledMark(item.x + dx, item.y + dy, item.width, item.height, ["rule"], ["rule"]);
    };
  }
  if (this.program.noVPL || this.program.readOnly) {
    item.draggable = false;
  }
  if (this.uiConfig.nodragAccessibility) {
    item.draggable = false;
    item.interactiveCB = {mousedown:function(canvas, data, width, height, left, top, ev) {
      self.kbdControl.targetType = A3a.vpl.KbdControl.ObjectType.rule;
      self.kbdControl.targetIndex1 = ruleIndex;
      canvas.redraw();
      return 0;
    }, mousedrag:function(canvas, data, dragIndex, width, height, left, top, ev) {
      var canvasBndRect = canvas.canvas.getBoundingClientRect();
      var x = ev.x - canvasBndRect.left;
      var y = ev.y - canvasBndRect.top;
      var isInside = x >= item.x && x < item.x + item.width && y >= item.y && y < item.y + item.height;
      if (self.kbdControl.targetType !== (isInside ? A3a.vpl.KbdControl.ObjectType.rule : A3a.vpl.KbdControl.ObjectType)) {
        self.kbdControl.targetType = isInside ? A3a.vpl.KbdControl.ObjectType.rule : A3a.vpl.KbdControl.ObjectType;
        canvas.redraw();
      }
    }};
  }
  canvas.setItem(item);
  if (!isComment) {
    var childItem;
    var events = rule.events;
    if (events.length === 0 || !displaySingleEvent && events[events.length - 1] !== null) {
      events = events.concat(null);
    }
    x = eventX0;
    if (maxWidthForEventRightAlign > 0) {
      x += maxWidthForEventRightAlign - widths.totalEvents;
    }
    events.forEach(function(event, j) {
      var blockBox = event ? A3a.vpl.Program.boxForBlockType(event, j === 0, cssBoxes) : events.length === 1 ? cssBoxes.blockEmptyEventOnlyChildBox : cssBoxes.blockEmptyEventAuxBox;
      var containerBox = rule.error && rule.error.eventError && (rule.error.eventErrorIndices.length === 0 || rule.error.eventErrorIndices.indexOf(j) >= 0) ? rule.error.isWarning ? cssBoxes.blockContainerWarningBox : cssBoxes.blockContainerErrorBox : cssBoxes.blockContainerBox;
      var vertOffset = A3a.vpl.Program.blockVerticalOffset(blockBox, containerBox);
      if (event) {
        event.marks = {kbdSelected:this.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.blockLeft && this.kbdControl.selectionIndex1 === ruleIndex && this.kbdControl.selectionIndex2 === j, kbdSelectedParam:this.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.blockLeftParam && this.kbdControl.selectionIndex1 === ruleIndex && this.kbdControl.selectionIndex2 === j ? this.kbdControl.selectionParamIndex : null, kbdTarget:this.kbdControl.targetType === A3a.vpl.KbdControl.ObjectType.blockLeft && 
        this.kbdControl.targetIndex1 === ruleIndex && this.kbdControl.targetIndex2 === j};
        containerBox.width = blockBox.totalWidth();
        childItem = this.addBlockToCanvas(canvas, event, blockBox, ["block"], x, y + vertOffset, {notInteractive:rule.disabled || this.program.noVPL || this.program.readOnly, notClickable:rule.disabled || this.program.noVPL || this.program.readOnly, notDraggable:this.program.noVPL || this.program.readOnly, accessibility:{type:A3a.vpl.KbdControl.ObjectType.blockLeft, index1:ruleIndex, index2:j}});
      } else {
        event = new A3a.vpl.EmptyBlock(A3a.vpl.blockType.event, rule, {eventSide:true, index:j});
        event.marks = {kbdSelected:this.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.blockLeft && this.kbdControl.selectionIndex1 === ruleIndex && this.kbdControl.selectionIndex2 === j, kbdSelectedParam:null, kbdTarget:this.kbdControl.targetType === A3a.vpl.KbdControl.ObjectType.blockLeft && this.kbdControl.targetIndex1 === ruleIndex && this.kbdControl.targetIndex2 === j};
        containerBox.width = blockBox.totalWidth();
        childItem = this.addBlockToCanvas(canvas, event, blockBox, ["block"], x, y + vertOffset, {notDropTarget:rule.disabled || this.program.readOnly, notClickable:true, notDraggable:true, accessibility:{type:A3a.vpl.KbdControl.ObjectType.blockLeft, index1:ruleIndex, index2:j}});
      }
      item.attachItem(childItem);
      x += containerBox.totalWidth();
    }, this);
    var actions = rule.actions;
    if (actions.length === 0 || actions[actions.length - 1] !== null) {
      actions = actions.concat(null);
    }
    x = actionX0;
    actions.forEach(function(action, j) {
      var blockBox = action ? A3a.vpl.Program.boxForBlockType(action, j == 0, cssBoxes) : actions.length === 1 ? cssBoxes.blockEmptyActionOnlyChildBox : cssBoxes.blockEmptyActionBox;
      var containerBox = rule.error && !rule.error.eventError && (rule.error.actionErrorIndices.length === 0 || rule.error.actionErrorIndices.indexOf(j) >= 0) ? rule.error.isWarning ? cssBoxes.blockContainerWarningBox : cssBoxes.blockContainerErrorBox : cssBoxes.blockContainerBox;
      var vertOffset = A3a.vpl.Program.blockVerticalOffset(blockBox, containerBox);
      if (action) {
        action.marks = {kbdSelected:this.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.blockRight && this.kbdControl.selectionIndex1 === ruleIndex && this.kbdControl.selectionIndex2 === j, kbdSelectedParam:this.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.blockRightParam && this.kbdControl.selectionIndex1 === ruleIndex && this.kbdControl.selectionIndex2 === j ? this.kbdControl.selectionParamIndex : null, kbdTarget:this.kbdControl.targetType === A3a.vpl.KbdControl.ObjectType.blockRight && 
        this.kbdControl.targetIndex1 === ruleIndex && this.kbdControl.targetIndex2 === j};
        containerBox.width = blockBox.totalWidth();
        childItem = this.addBlockToCanvas(canvas, action, A3a.vpl.Program.boxForBlockType(action, j === 0, cssBoxes), ["block"], x, y + vertOffset, {notInteractive:rule.disabled || this.program.noVPL || this.program.readOnly, notClickable:rule.disabled || this.program.noVPL || this.program.readOnly, notDraggable:this.program.noVPL || this.program.readOnly, accessibility:{type:A3a.vpl.KbdControl.ObjectType.blockRight, index1:ruleIndex, index2:j}});
      } else {
        action = new A3a.vpl.EmptyBlock(A3a.vpl.blockType.action, rule, {eventSide:false, index:j});
        action.marks = {kbdSelected:this.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.blockRight && this.kbdControl.selectionIndex1 === ruleIndex && this.kbdControl.selectionIndex2 === j, kbdSelectedParam:null, kbdTarget:this.kbdControl.targetType === A3a.vpl.KbdControl.ObjectType.blockRight && this.kbdControl.targetIndex1 === ruleIndex && this.kbdControl.targetIndex2 === j};
        containerBox.width = blockBox.totalWidth();
        childItem = this.addBlockToCanvas(canvas, action, blockBox, ["block"], x, y, {notDropTarget:program.readOnly, notClickable:true, notDraggable:true, accessibility:{type:A3a.vpl.KbdControl.ObjectType.blockRight, index1:ruleIndex, index2:j}});
      }
      item.attachItem(childItem);
      x += containerBox.totalWidth();
    }, this);
    canvas.addDecoration(function(ctx) {
      if (rule.error !== null) {
        var box = rule.error.isWarning ? cssBoxes.warningWidgetBox : cssBoxes.errorWidgetBox;
        canvas.drawWidget(rule.error.isWarning ? "vpl:warning" : "vpl:error", eventX0 - ruleBox.paddingLeft - ruleBox.marginLeft - cssBoxes.blockContainerBox.offsetLeft() - block0Box.offsetLeft() - box.width / 2 - box.marginRight - box.paddingRight, y + block0Box.height * 0.5, box);
      }
    });
  }
};
A3a.vpl.Program.prototype.addEventHandlerConflictLinkToCanvas = function(canvas, x, y1, y2, cssBoxes, isWarning) {
  var self = this;
  var widgetBox = isWarning ? cssBoxes.warningWidgetBox : cssBoxes.errorWidgetBox;
  canvas.addDecoration(function(ctx) {
    var errorLine = canvas.css.getLine({tag:"conflict-line", clas:[isWarning ? "warning" : "error"]});
    var xc = x - cssBoxes.ruleBox.paddingLeft - cssBoxes.ruleBox.marginLeft - cssBoxes.blockContainerBox.offsetLeft() - cssBoxes.blockEventMainBox.offsetLeft() - widgetBox.width / 2 - widgetBox.marginRight - widgetBox.paddingRight;
    var yc1 = y1 + (cssBoxes.blockContainerBox.height + widgetBox.height) / 2;
    var yc2 = y2 + (cssBoxes.blockContainerBox.height - widgetBox.height) / 2;
    ctx.beginPath();
    ctx.moveTo(xc, yc1);
    ctx.lineTo(xc, yc2);
    errorLine.stroke(ctx);
    ctx.beginPath();
    ctx.arc(xc, yc1, errorLine.lineWidth, 0, Math.PI);
    errorLine.stroke(ctx);
    ctx.beginPath();
    ctx.arc(xc, yc2, errorLine.lineWidth, -Math.PI, 0);
    errorLine.stroke(ctx);
  });
};
A3a.vpl.Application.prototype.getCSSBoxes = function(css) {
  var cssBoxes = {};
  var zoomBlocks = window.matchMedia && window.matchMedia("(pointer: coarse)").matches ? this.program.touchZoomBlocks : this.program.zoomBlocks;
  cssBoxes.viewBox = css.getBox({tag:"view", clas:["vpl"]});
  cssBoxes.toolbarSeparatorBox = css.getBox({tag:"separator", clas:["vpl", "top"]});
  cssBoxes.toolbarSeparator2Box = css.getBox({tag:"separator", clas:["vpl", "bottom"]});
  cssBoxes.toolbarBox = css.getBox({tag:"toolbar", clas:["vpl", "top"]});
  cssBoxes.toolbar2Box = css.getBox({tag:"toolbar", clas:["vpl", "bottom"]});
  cssBoxes.vplBox = css.getBox({tag:"vpl", id:"scrolling-vpl"});
  cssBoxes.blockEventMainBox = css.getBox({tag:"block", clas:["event", "event-main"], pseudoClass:zoomBlocks ? ["small"] : []});
  cssBoxes.blockEventAuxBox = css.getBox({tag:"block", clas:["event", "event-aux"], pseudoClass:zoomBlocks ? ["small"] : []});
  cssBoxes.blockActionBox = css.getBox({tag:"block", clas:["action"], pseudoClass:zoomBlocks ? ["small"] : []});
  cssBoxes.blockStateBox = css.getBox({tag:"block", clas:["state"], pseudoClass:zoomBlocks ? ["small"] : []});
  cssBoxes.blockCommentBox = css.getBox({tag:"block", clas:["comment"], pseudoClass:zoomBlocks ? ["small"] : []});
  cssBoxes.blockEmptyEventBox = css.getBox({tag:"block", clas:["event", "empty"], pseudoClass:zoomBlocks ? ["small"] : []});
  cssBoxes.blockEmptyActionBox = css.getBox({tag:"block", clas:["action", "empty"], pseudoClass:zoomBlocks ? ["small"] : []});
  cssBoxes.blockEmptyEventOnlyChildBox = css.getBox({tag:"block", clas:["event", "empty"], pseudoClass:zoomBlocks ? ["only-child", "small"] : ["only-child"]});
  cssBoxes.blockEmptyEventAuxBox = css.getBox({tag:"block", clas:["event", "event-aux", "empty"], pseudoClass:zoomBlocks ? ["small"] : []});
  cssBoxes.blockEmptyActionOnlyChildBox = css.getBox({tag:"block", clas:["action", "empty"], pseudoClass:zoomBlocks ? ["only-child", "small"] : ["only-child"]});
  cssBoxes.blockContainerBox = css.getBox({tag:"block-container"});
  cssBoxes.blockContainerErrorBox = css.getBox({tag:"block-container", clas:["error"]});
  cssBoxes.blockContainerWarningBox = css.getBox({tag:"block-container", clas:["warning"]});
  cssBoxes.ruleBox = css.getBox({tag:"rule", pseudoClass:zoomBlocks ? ["small"] : []});
  cssBoxes.ruleSeparatorBox = css.getBox({tag:"widget", id:"widget-then", pseudoClass:zoomBlocks ? ["small"] : []});
  cssBoxes.ruleCommentBox = css.getBox({tag:"rule", clas:["comment"], pseudoClass:zoomBlocks ? ["small"] : []});
  cssBoxes.ruleCommentEditedBox = css.getBox({tag:"rule", clas:["comment"], pseudoClass:zoomBlocks ? ["small", "edited"] : ["edited"]});
  cssBoxes.blockEventLibItemBox = css.getBox({tag:"block", clas:["library", "event"]});
  cssBoxes.blockActionLibItemBox = css.getBox({tag:"block", clas:["library", "action"]});
  cssBoxes.blockStateLibItemBox = css.getBox({tag:"block", clas:["library", "state"]});
  cssBoxes.blockCommentLibItemBox = css.getBox({tag:"block", clas:["library", "comment"]});
  cssBoxes.blockEventLibBox = css.getBox({tag:"block-library", clas:["event"]});
  cssBoxes.blockActionLibBox = css.getBox({tag:"block-library", clas:["action"]});
  cssBoxes.errorWidgetBox = css.getBox({tag:"widget", id:"widget-error", pseudoClass:zoomBlocks ? ["small"] : []});
  cssBoxes.warningWidgetBox = css.getBox({tag:"widget", id:"widget-warning", pseudoClass:zoomBlocks ? ["small"] : []});
  return cssBoxes;
};
A3a.vpl.Application.prototype.updateErrorInfo = function() {
  var uiConfig = this.uiConfig;
  var program = this.program;
  var code = program.getCode(program.currentLanguage);
  this.vplMessage = "";
  this.vplMessageIsWarning = false;
  if (!uiConfig.blockCustomizationMode) {
    for (var i = 0; i < program.program.length; i++) {
      if (program.program[i].error) {
        if (!program.program[i].error.isWarning) {
          this.vplMessage = program.program[i].error.msg;
          this.vplMessageIsWarning = false;
          break;
        } else {
          if (!this.vplMessage) {
            this.vplMessage = program.program[i].error.msg;
            this.vplMessageIsWarning = true;
          }
        }
      }
    }
  }
  var isError = this.vplMessage !== "" && !this.vplMessageIsWarning;
  if (!isError) {
    try {
      var app = this;
      var checkErrMsg = this.robots[this.currentRobotIndex].runGlue.check(code, app.program.currentLanguage, function(errorMsg) {
        app.renderProgramToCanvas();
      });
      if (checkErrMsg) {
        this.vplMessage = checkErrMsg;
        isError = true;
      }
    } catch (e) {
    }
  }
  return isError;
};
A3a.vpl.Application.prototype.createVPLToolbar = function(toolbarConfig, cssClasses, toolbarBox, toolbarSeparatorBox, toolbarItemBoxes) {
  var controlBar = new A3a.vpl.ControlBar(this.vplCanvas);
  controlBar.setButtons(this, toolbarConfig, cssClasses, this.program.toolbarDrawButton || A3a.vpl.Commands.drawButtonJS, this.program.toolbarGetButtonBounds || A3a.vpl.Commands.getButtonBoundsJS);
  controlBar.calcLayout(toolbarBox, toolbarItemBoxes, toolbarSeparatorBox);
  return controlBar;
};
A3a.vpl.Application.prototype.getEnabledBlockTemplateByIndex = function(isAction, index) {
  for (var i = 0; i < A3a.vpl.BlockTemplate.lib.length; i++) {
    var blockTemplate = A3a.vpl.BlockTemplate.lib[i];
    if ((isAction ? blockTemplate.type === A3a.vpl.blockType.action || blockTemplate.type === A3a.vpl.blockType.comment : blockTemplate.type === A3a.vpl.blockType.event || blockTemplate.type === A3a.vpl.blockType.state) && (this.program.mode === A3a.vpl.mode.basic ? this.program.enabledBlocksBasic : this.program.enabledBlocksAdvanced).indexOf(blockTemplate.name) >= 0) {
      if (index === 0) {
        return blockTemplate;
      }
      index--;
    }
  }
  return null;
};
A3a.vpl.Application.prototype.renderProgramToCanvas = function() {
  var uiConfig = this.uiConfig;
  var canvas = this.vplCanvas;
  var program = this.program;
  var cssBoxes = this.getCSSBoxes(canvas.css);
  canvas.recalcSize();
  this.updateErrorInfo();
  program.zoomBlocks = canvas.dims.blockSize < canvas.dims.minInteractiveBlockSize;
  program.touchZoomBlocks = canvas.dims.blockSize < canvas.dims.minTouchInteractiveBlockSize;
  var canvasSize = canvas.getSize();
  var renderingState = canvas.state.vpl;
  var self = this;
  var showState = program.mode === A3a.vpl.mode.advanced;
  var toolbar2HasAvButtons = A3a.vpl.ControlBar.hasAvailableButtons(this, this.vplToolbar2Config);
  var displaySingleEvent = program.displaySingleEvent();
  var nMaxEventHandlerELength = 0;
  var nMaxEventHandlerALength = 0;
  var maxEventsWidth = 0;
  var maxActionsWidth = 0;
  var nNormalRules = 0;
  var nCommentRules = 0;
  program.program.forEach(function(rule) {
    if (rule instanceof A3a.vpl.RuleComment) {
      nCommentRules++;
    } else {
      nNormalRules++;
    }
    var blocks = rule.events;
    nMaxEventHandlerELength = Math.max(nMaxEventHandlerELength, blocks.length + (blocks.length === 0 || blocks[blocks.length - 1] !== null ? 1 : 0));
    blocks = rule.actions;
    nMaxEventHandlerALength = Math.max(nMaxEventHandlerALength, blocks.length + (blocks.length === 0 || blocks[blocks.length - 1] !== null ? 1 : 0));
    var details = A3a.vpl.Application.measureRuleWidth(rule, displaySingleEvent, cssBoxes);
    maxEventsWidth = Math.max(maxEventsWidth, details.totalEvents);
    maxActionsWidth = Math.max(maxActionsWidth, details.totalActions);
  });
  if (displaySingleEvent) {
    nMaxEventHandlerELength = 1;
  }
  var nEvTemplates = 0;
  var nAcTemplates = 0;
  A3a.vpl.BlockTemplate.lib.forEach(function(blockTemplate, i) {
    if (uiConfig.blockCustomizationMode || (program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced).indexOf(blockTemplate.name) >= 0) {
      switch(blockTemplate.type) {
        case A3a.vpl.blockType.event:
        case A3a.vpl.blockType.state:
          nEvTemplates++;
          break;
        case A3a.vpl.blockType.action:
        case A3a.vpl.blockType.comment:
          nAcTemplates++;
          break;
      }
    }
  }, this);
  this.kbdControl.libLeftNum = nEvTemplates;
  this.kbdControl.libRightNum = nAcTemplates;
  canvas.addDefaultDoDrop("delete", function(dropTargetItem, draggedItem, x, y) {
    if (self.commands.canDrop("vpl:trashcan", draggedItem)) {
      var left = eventX0 - cssBoxes.ruleBox.offsetLeft() - cssBoxes.blockContainerBox.offsetLeft() - cssBoxes.blockEventMainBox.offsetLeft();
      var width = cssBoxes.ruleBox.totalWidth();
      if (x < left || x > left + width) {
        self.commands.doDrop("vpl:trashcan", draggedItem);
        return true;
      }
    }
    return false;
  });
  var toolbarItemBoxes = A3a.vpl.ControlBar.buttonBoxes(this, this.vplToolbarConfig, ["vpl", "top"]);
  var toolbarItemHeight = A3a.vpl.ControlBar.maxBoxHeight(toolbarItemBoxes);
  var toolbar2ItemBoxes = A3a.vpl.ControlBar.buttonBoxes(this, this.vplToolbar2Config, ["vpl", "bottom"]);
  var toolbar2ItemHeight = A3a.vpl.ControlBar.maxBoxHeight(toolbar2ItemBoxes);
  cssBoxes.viewBox.setTotalWidth(canvasSize.width);
  cssBoxes.viewBox.setTotalHeight(canvasSize.height);
  cssBoxes.viewBox.setPosition(0, 0);
  cssBoxes.toolbarBox.setTotalWidth(cssBoxes.viewBox.width);
  cssBoxes.toolbarBox.height = toolbarItemHeight;
  cssBoxes.toolbarBox.setPosition(cssBoxes.viewBox.x, cssBoxes.viewBox.y);
  cssBoxes.blockEventLibBox.setTotalHeight(cssBoxes.viewBox.height - cssBoxes.toolbarBox.totalHeight());
  var maxBlPerCol = Math.max(Math.floor(cssBoxes.blockEventLibBox.height / cssBoxes.blockEventLibItemBox.totalHeight()), 1);
  var evCol = cssBoxes.blockEventLibBox.scroll ? 1 : Math.ceil(nEvTemplates / maxBlPerCol);
  cssBoxes.blockEventLibBox.width = evCol * cssBoxes.blockEventLibItemBox.totalWidth();
  cssBoxes.blockEventLibBox.setPosition(cssBoxes.viewBox.x, cssBoxes.viewBox.y + cssBoxes.toolbarBox.totalHeight());
  cssBoxes.blockActionLibBox.setTotalHeight(cssBoxes.viewBox.height - cssBoxes.toolbarBox.totalHeight());
  var acCol = cssBoxes.blockActionLibBox.scroll ? 1 : Math.ceil(nAcTemplates / maxBlPerCol);
  cssBoxes.blockActionLibBox.width = acCol * cssBoxes.blockActionLibItemBox.totalWidth();
  cssBoxes.blockActionLibBox.setPosition(cssBoxes.viewBox.x + cssBoxes.viewBox.width - cssBoxes.blockActionLibBox.totalWidth(), cssBoxes.viewBox.y + cssBoxes.toolbarBox.totalHeight());
  cssBoxes.toolbar2Box.setTotalWidth(cssBoxes.viewBox.width - cssBoxes.blockEventLibBox.totalWidth() - cssBoxes.blockActionLibBox.totalWidth());
  cssBoxes.toolbar2Box.height = toolbar2ItemHeight;
  cssBoxes.toolbar2Box.setPosition(cssBoxes.viewBox.x + cssBoxes.blockEventLibBox.totalWidth(), cssBoxes.viewBox.y + cssBoxes.viewBox.height - cssBoxes.toolbar2Box.totalHeight());
  cssBoxes.vplBox.setTotalWidth(cssBoxes.viewBox.width - cssBoxes.blockEventLibBox.totalWidth() - cssBoxes.blockActionLibBox.totalWidth());
  cssBoxes.vplBox.setTotalHeight(cssBoxes.viewBox.height - cssBoxes.toolbarBox.totalHeight() - (toolbar2HasAvButtons ? cssBoxes.toolbar2Box.totalHeight() : 0));
  cssBoxes.vplBox.setPosition(cssBoxes.viewBox.x + cssBoxes.blockEventLibBox.totalWidth(), cssBoxes.viewBox.y + cssBoxes.toolbarBox.totalHeight());
  cssBoxes.blockContainerBox.width = cssBoxes.blockContainerErrorBox.width = cssBoxes.blockContainerWarningBox.width = cssBoxes.blockEventMainBox.totalWidth();
  cssBoxes.blockContainerBox.height = cssBoxes.blockContainerErrorBox.height = cssBoxes.blockContainerWarningBox.height = cssBoxes.blockEventMainBox.totalHeight();
  var ruleSeparatorWidth = cssBoxes.ruleSeparatorBox.totalWidth();
  var blockStep = cssBoxes.blockContainerBox.totalWidth();
  var ruleWidth = maxEventsWidth + maxActionsWidth + ruleSeparatorWidth;
  var eventX0 = cssBoxes.viewBox.x + (cssBoxes.viewBox.width - ruleWidth + cssBoxes.errorWidgetBox.totalWidth()) / 2;
  var actionX0 = eventX0 + maxEventsWidth + ruleSeparatorWidth;
  cssBoxes.ruleBox.width = ruleWidth;
  cssBoxes.ruleBox.height = cssBoxes.blockContainerBox.totalHeight();
  cssBoxes.ruleCommentBox.width = ruleWidth;
  cssBoxes.ruleCommentBox.height = cssBoxes.ruleCommentBox.fontSize;
  cssBoxes.ruleCommentEditedBox.width = ruleWidth;
  cssBoxes.ruleCommentEditedBox.height = cssBoxes.ruleCommentBox.fontSize;
  var ruleVerticalOffset = [];
  program.program.forEach(function(rule, i) {
    var height = rule instanceof A3a.vpl.RuleComment ? cssBoxes.ruleCommentBox.totalHeight() : cssBoxes.ruleBox.totalHeight();
    ruleVerticalOffset.push(i === 0 ? height : ruleVerticalOffset[i - 1] + height);
  });
  function boxForBlockTemplate(cssBoxes, blockTemplate) {
    switch(blockTemplate.type) {
      case A3a.vpl.blockType.event:
        return cssBoxes.blockEventLibItemBox;
      case A3a.vpl.blockType.action:
        return cssBoxes.blockActionLibItemBox;
      case A3a.vpl.blockType.state:
        return cssBoxes.blockStateLibItemBox;
      case A3a.vpl.blockType.comment:
        return cssBoxes.blockCommentLibItemBox;
      default:
        throw "internal";
    }
  }
  canvas.clearItems();
  canvas.addDecoration(function(ctx) {
    cssBoxes.viewBox.draw(ctx);
  });
  var controlBar = this.createVPLToolbar(this.vplToolbarConfig, ["vpl", "top"], cssBoxes.toolbarBox, cssBoxes.toolbarSeparatorBox, toolbarItemBoxes);
  controlBar.addToCanvas(cssBoxes.toolbarBox, toolbarItemBoxes, self.createVPLControlBarDoOverFun());
  if (this.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.toolbarTop && !this.uiConfig.blockCustomizationMode) {
    var selectedTBCmd = this.kbdControl.getSelectedCmd();
    var selectedTBControl = null;
    for (var i = 0; i < controlBar.controls.length; i++) {
      if (controlBar.controls[i].id === selectedTBCmd.name) {
        selectedTBControl = controlBar.controls[i];
        break;
      }
    }
    var selectedTBControlBox = toolbarItemBoxes[selectedTBControl.id];
    canvas.addDecoration(function(ctx) {
      canvas.overlayRect(selectedTBControl.x, selectedTBControl.y, selectedTBControlBox.width, selectedTBControlBox.height, ["button", "top", "kbd-selected"]);
    });
  }
  if (toolbar2HasAvButtons > 0) {
    var controlBar2 = this.createVPLToolbar(this.vplToolbar2Config, ["vpl", "bottom"], cssBoxes.toolbar2Box, cssBoxes.toolbarSeparator2Box, toolbar2ItemBoxes);
    controlBar2.addToCanvas(cssBoxes.toolbar2Box, toolbar2ItemBoxes, self.createVPLControlBarDoOverFun());
    if (this.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.toolbarBottom && !this.uiConfig.blockCustomizationMode) {
      var selectedTBCmd = this.kbdControl.getSelectedCmd();
      var selectedTBControl = null;
      for (var i = 0; i < controlBar2.controls.length; i++) {
        if (controlBar2.controls[i].id === selectedTBCmd.name) {
          selectedTBControl = controlBar2.controls[i];
          break;
        }
      }
      var selectedTBControlBox = toolbar2ItemBoxes[selectedTBControl.id];
      canvas.addDecoration(function(ctx) {
        canvas.overlayRect(selectedTBControl.x, selectedTBControl.y, selectedTBControlBox.width, selectedTBControlBox.height, ["button", "bottom", "kbd-selected"]);
      });
    }
  }
  var stepEvent = cssBoxes.blockEventLibItemBox.totalHeight();
  var stepAction = cssBoxes.blockActionLibItemBox.totalHeight();
  var eventLibWidth = 0;
  var actionLibWidth = 0;
  if (cssBoxes.blockEventLibBox.scroll) {
    this.kbdControl.libLeftColLen = 1;
    eventLibWidth = cssBoxes.blockEventLibItemBox.totalWidth();
    renderingState.eventScroll.setTotalHeight(nEvTemplates * stepEvent);
    cssBoxes.blockEventLibBox.width = eventLibWidth;
    cssBoxes.blockEventLibBox.height = cssBoxes.blockEventLibBox.height;
    renderingState.eventScroll.resize(cssBoxes.blockEventLibBox.x, cssBoxes.blockEventLibBox.y, cssBoxes.blockEventLibBox.width, cssBoxes.blockEventLibBox.height);
    canvas.addDecoration(function(ctx) {
      cssBoxes.blockEventLibBox.draw(ctx);
    });
    renderingState.eventScroll.begin(canvas);
    var row = 0;
    A3a.vpl.BlockTemplate.lib.forEach(function(blockTemplate, i) {
      if ((blockTemplate.type === A3a.vpl.blockType.event || blockTemplate.type === A3a.vpl.blockType.state) && (uiConfig.blockCustomizationMode || (program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced).indexOf(blockTemplate.name) >= 0)) {
        var box = boxForBlockTemplate(cssBoxes, blockTemplate);
        var x = cssBoxes.blockEventLibBox.x + box.offsetLeft();
        var y = cssBoxes.blockEventLibBox.y + box.offsetTop() + row * stepEvent;
        this.addBlockTemplateToCanvas(canvas, blockTemplate, box, x, y, self.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.libLeft && self.kbdControl.selectionIndex1 === row, {type:A3a.vpl.KbdControl.ObjectType.none, index1:0, index2:0, click:function() {
          self.kbdControl.activateTemplate(blockTemplate);
        }});
        row++;
      }
    }, this);
    renderingState.eventScroll.end();
    canvas.addDecoration(function(ctx) {
      var moreHighBox = canvas.css.getBox({tag:"widget", id:"widget-moreHigh"});
      var moreLowBox = canvas.css.getBox({tag:"widget", id:"widget-moreLow"});
      if (!renderingState.eventScroll.isTop()) {
        canvas.drawWidget("vpl:moreHigh", cssBoxes.blockEventLibBox.x + cssBoxes.blockEventLibBox.width / 2, cssBoxes.blockEventLibBox.y + moreHighBox.totalHeight() / 2, moreHighBox);
      }
      if (!renderingState.eventScroll.isBottom()) {
        canvas.drawWidget("vpl:moreLow", cssBoxes.blockEventLibBox.x + cssBoxes.blockEventLibBox.width / 2, cssBoxes.blockEventLibBox.y + cssBoxes.blockEventLibBox.height - moreLowBox.totalHeight() / 2, moreLowBox);
      }
    });
  } else {
    canvas.addDecoration(function(ctx) {
      cssBoxes.blockEventLibBox.draw(ctx);
    });
    eventLibWidth = evCol * stepEvent + cssBoxes.blockEventLibBox.nonContentWidth();
    var colLen = Math.ceil(nEvTemplates / evCol);
    this.kbdControl.libLeftColLen = colLen;
    var row = 0;
    A3a.vpl.BlockTemplate.lib.forEach(function(blockTemplate, i) {
      if ((blockTemplate.type === A3a.vpl.blockType.event || blockTemplate.type === A3a.vpl.blockType.state) && (uiConfig.blockCustomizationMode || (program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced).indexOf(blockTemplate.name) >= 0)) {
        var box = boxForBlockTemplate(cssBoxes, blockTemplate);
        var x = cssBoxes.blockEventLibBox.x + box.offsetLeft() + Math.floor(row / colLen) * stepEvent;
        var y = cssBoxes.blockEventLibBox.y + box.offsetTop() + stepEvent * (row % colLen);
        self.addBlockTemplateToCanvas(canvas, blockTemplate, box, x, y, self.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.libLeft && self.kbdControl.selectionIndex1 === row % colLen && self.kbdControl.selectionIndex2 === Math.floor(row / colLen), {type:A3a.vpl.KbdControl.ObjectType.none, index1:0, index2:0, click:function() {
          self.kbdControl.activateTemplate(blockTemplate);
        }});
        row++;
      }
    }, this);
  }
  if (cssBoxes.blockActionLibBox.scroll) {
    this.kbdControl.libRightColLen = 1;
    actionLibWidth = cssBoxes.blockActionLibItemBox.totalWidth();
    renderingState.actionScroll.setTotalHeight(nAcTemplates * stepAction);
    cssBoxes.blockActionLibBox.width = actionLibWidth;
    cssBoxes.blockActionLibBox.height = cssBoxes.blockActionLibBox.height;
    renderingState.actionScroll.resize(cssBoxes.blockActionLibBox.x, cssBoxes.blockActionLibBox.y, cssBoxes.blockActionLibBox.width, cssBoxes.blockActionLibBox.height);
    canvas.addDecoration(function(ctx) {
      cssBoxes.blockActionLibBox.draw(ctx);
    });
    renderingState.actionScroll.begin(canvas);
    row = 0;
    A3a.vpl.BlockTemplate.lib.forEach(function(blockTemplate, i) {
      if ((blockTemplate.type === A3a.vpl.blockType.action || blockTemplate.type === A3a.vpl.blockType.comment) && (uiConfig.blockCustomizationMode || (program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced).indexOf(blockTemplate.name) >= 0)) {
        var box = boxForBlockTemplate(cssBoxes, blockTemplate);
        this.addBlockTemplateToCanvas(canvas, blockTemplate, box, cssBoxes.blockActionLibBox.x + cssBoxes.blockActionLibItemBox.offsetLeft(), cssBoxes.blockActionLibBox.y + cssBoxes.blockActionLibItemBox.offsetTop() + row * stepAction, self.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.libRight && self.kbdControl.selectionIndex1 === row, {type:A3a.vpl.KbdControl.ObjectType.none, index1:0, index2:0, click:function() {
          self.kbdControl.activateTemplate(blockTemplate);
        }});
        row++;
      }
    }, this);
    renderingState.actionScroll.end();
    canvas.addDecoration(function(ctx) {
      var moreHighBox = canvas.css.getBox({tag:"widget", id:"widget-moreHigh"});
      var moreLowBox = canvas.css.getBox({tag:"widget", id:"widget-moreLow"});
      if (!renderingState.actionScroll.isTop()) {
        canvas.drawWidget("vpl:moreHigh", cssBoxes.blockActionLibBox.x + cssBoxes.blockActionLibBox.width / 2, cssBoxes.blockActionLibBox.y + moreHighBox.totalHeight() / 2, moreHighBox);
      }
      if (!renderingState.actionScroll.isBottom()) {
        canvas.drawWidget("vpl:moreLow", cssBoxes.blockActionLibBox.x + cssBoxes.blockActionLibBox.width / 2, cssBoxes.blockActionLibBox.y + cssBoxes.blockActionLibBox.height - moreLowBox.totalHeight() / 2, moreLowBox);
      }
    });
  } else {
    canvas.addDecoration(function(ctx) {
      cssBoxes.blockActionLibBox.draw(ctx);
    });
    actionLibWidth = acCol * stepAction + cssBoxes.blockActionLibBox.nonContentWidth();
    colLen = Math.ceil(nAcTemplates / acCol);
    this.kbdControl.libRightColLen = colLen;
    row = 0;
    A3a.vpl.BlockTemplate.lib.forEach(function(blockTemplate, i) {
      if ((blockTemplate.type === A3a.vpl.blockType.action || blockTemplate.type === A3a.vpl.blockType.comment) && (uiConfig.blockCustomizationMode || (program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced).indexOf(blockTemplate.name) >= 0)) {
        var box = boxForBlockTemplate(cssBoxes, blockTemplate);
        var x = cssBoxes.blockActionLibBox.x + box.offsetLeft() + cssBoxes.blockActionLibBox.width - (acCol - Math.floor(row / colLen)) * stepAction;
        var y = cssBoxes.blockActionLibBox.y + box.offsetTop() + stepAction * (row % colLen);
        self.addBlockTemplateToCanvas(canvas, blockTemplate, box, x, y, self.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.libRight && self.kbdControl.selectionIndex1 === row % colLen && self.kbdControl.selectionIndex2 === Math.floor(row / colLen), {type:A3a.vpl.KbdControl.ObjectType.none, index1:0, index2:0, click:function() {
          self.kbdControl.activateTemplate(blockTemplate);
        }});
        row++;
      }
    }, this);
  }
  if (uiConfig.blockCustomizationMode) {
    (function() {
      var eventContainerBox = cssBoxes.blockContainerBox.copy();
      eventContainerBox.width = cssBoxes.blockEventMainBox.totalWidth();
      var auxEventContainerBox = cssBoxes.blockContainerBox.copy();
      auxEventContainerBox.width = cssBoxes.blockEventAuxBox.totalWidth();
      var actionContainerBox = cssBoxes.blockContainerBox.copy();
      actionContainerBox.width = cssBoxes.blockActionBox.totalWidth();
      var totalWidth = eventContainerBox.totalWidth() + auxEventContainerBox.totalWidth() + cssBoxes.ruleSeparatorBox.totalWidth() + actionContainerBox.totalWidth();
      var ruleBox = cssBoxes.ruleBox.copy();
      ruleBox.width = totalWidth;
      var eventX0 = cssBoxes.viewBox.x + (cssBoxes.viewBox.width - totalWidth) / 2 + (eventLibWidth - actionLibWidth) / 2 - canvas.dims.scrollbarWidth / 2;
      var actionX0 = eventX0 + totalWidth - actionContainerBox.totalWidth();
      var y = cssBoxes.vplBox.y + ruleBox.offsetTop() + eventContainerBox.offsetTop();
      var isInside = false;
      var item = new A3a.vpl.CanvasItem(self, ruleBox.paddedWidth(), ruleBox.paddedHeight(), eventX0 - ruleBox.paddingLeft - eventContainerBox.offsetLeft(), y - ruleBox.paddingTop - eventContainerBox.offsetTop(), function(canvas, item, dx, dy) {
        var ctx = canvas.ctx;
        ruleBox.drawAt(ctx, item.x + dx, item.y + dy, true);
        var separatorWidth = cssBoxes.ruleSeparatorBox.totalWidth();
        cssBoxes.ruleSeparatorBox.drawAt(ctx, actionX0 - cssBoxes.ruleSeparatorBox.width - cssBoxes.ruleSeparatorBox.marginRight - cssBoxes.ruleSeparatorBox.paddingRight - cssBoxes.blockContainerBox.offsetLeft() - cssBoxes.blockActionBox.offsetLeft() + dx, item.y + (cssBoxes.ruleBox.paddedHeight() - cssBoxes.ruleSeparatorBox.height) / 2 + dy);
        canvas.drawWidget("vpl:then", actionX0 - cssBoxes.ruleSeparatorBox.totalWidth() / 2 - cssBoxes.blockContainerBox.offsetLeft() - cssBoxes.blockActionBox.offsetLeft() + dx, item.y + cssBoxes.ruleBox.paddedHeight() / 2 + dy, cssBoxes.ruleSeparatorBox);
        var x = item.x + dx + ruleBox.paddingLeft;
        eventContainerBox.drawAt(ctx, x + eventContainerBox.marginLeft, item.y + dy + ruleBox.paddingTop + eventContainerBox.marginTop, true);
        cssBoxes.blockEventMainBox.drawAt(ctx, x + eventContainerBox.offsetLeft() + cssBoxes.blockEventMainBox.marginLeft, item.y + dy + ruleBox.paddingTop + eventContainerBox.offsetTop() + cssBoxes.blockEventMainBox.marginTop + A3a.vpl.Program.blockVerticalOffset(cssBoxes.blockEventMainBox, eventContainerBox), true);
        x += eventContainerBox.totalWidth();
        auxEventContainerBox.drawAt(ctx, x + auxEventContainerBox.marginLeft, item.y + dy + ruleBox.paddingTop + auxEventContainerBox.marginTop, true);
        cssBoxes.blockEventAuxBox.drawAt(ctx, x + eventContainerBox.offsetLeft() + cssBoxes.blockEventAuxBox.marginLeft, item.y + dy + ruleBox.paddingTop + auxEventContainerBox.offsetTop() + cssBoxes.blockEventAuxBox.marginTop + A3a.vpl.Program.blockVerticalOffset(cssBoxes.blockEventAuxBox, auxEventContainerBox), true);
        if (!(self.program.mode === A3a.vpl.mode.advanced ? self.program.multiEventAdvanced : self.program.multiEventBasic) ^ isInside) {
          canvas.disabledMark(x + eventContainerBox.offsetLeft() + cssBoxes.blockEventAuxBox.marginLeft, item.y + dy + ruleBox.paddingTop + auxEventContainerBox.offsetTop() + cssBoxes.blockEventAuxBox.marginTop + A3a.vpl.Program.blockVerticalOffset(cssBoxes.blockEventAuxBox, auxEventContainerBox), cssBoxes.blockEventAuxBox.width, cssBoxes.blockEventAuxBox.height, ["block"], ["block"], false);
        }
        x = item.x + dx + cssBoxes.ruleBox.paddingLeft + actionX0 - eventX0;
        actionContainerBox.drawAt(ctx, x + actionContainerBox.marginLeft, item.y + dy + ruleBox.paddingTop + actionContainerBox.marginTop, true);
        cssBoxes.blockActionBox.drawAt(ctx, x + actionContainerBox.offsetLeft() + cssBoxes.blockActionBox.marginLeft, item.y + dy + ruleBox.paddingTop + actionContainerBox.offsetTop() + cssBoxes.blockActionBox.marginTop + A3a.vpl.Program.blockVerticalOffset(cssBoxes.blockActionBox, actionContainerBox), true);
      }, {mousedown:function(canvas, data, width, height, left, top, ev) {
        isInside = true;
        canvas.redraw();
        return 0;
      }, mousedrag:function(canvas, data, dragIndex, width, height, left, top, ev) {
        var canvasBndRect = canvas.canvas.getBoundingClientRect();
        var x = ev.x - canvasBndRect.left;
        var y = ev.y - canvasBndRect.top;
        isInside = x >= left && x < left + width && y >= top && y < top + height;
        canvas.redraw();
      }, mouseup:function(canvas, data, dragIndex) {
        if (isInside) {
          if (self.program.mode === A3a.vpl.mode.advanced) {
            self.program.multiEventAdvanced = !self.program.multiEventAdvanced;
          } else {
            self.program.multiEventBasic = !self.program.multiEventBasic;
          }
        }
        canvas.redraw();
      }}, null, null);
      item.draggable = false;
      canvas.setItem(item);
    })();
    var customizationBox = canvas.css.getBox({tag:"widget", id:"vpl-customize"});
    customizationBox.width = cssBoxes.vplBox.width / 2;
    customizationBox.height = (cssBoxes.vplBox.height - cssBoxes.ruleBox.totalHeight()) / 2;
    canvas.addDecoration(function(ctx) {
      canvas.drawWidget("vpl:customize", cssBoxes.vplBox.x + cssBoxes.vplBox.width / 2, cssBoxes.vplBox.y + (cssBoxes.vplBox.height + cssBoxes.ruleBox.totalHeight()) / 2, customizationBox);
    });
  } else {
    if (program.message) {
      canvas.addDecoration(function(ctx) {
        var lines = program.message.split("\n");
        var fontSize = Math.min(14, canvasSize.height / lines.length);
        ctx.font = fontSize + "px sans-serif";
        ctx.textAlign = "start";
        ctx.textBaseline = "top";
        var x0 = cssBoxes.vplBox.x + fontSize;
        var y0 = cssBoxes.vplBox.y + fontSize;
        lines.forEach(function(line, i) {
          ctx.fillText(line, x0, y0 + fontSize * 1.2 * i);
        });
      });
    } else {
      var vplWidth = cssBoxes.ruleBox.totalWidth() + cssBoxes.vplBox.paddingLeft + cssBoxes.vplBox.paddingRight + cssBoxes.errorWidgetBox.totalWidth();
      renderingState.programScroll.setTotalWidth(vplWidth);
      renderingState.programScroll.setTotalHeight(ruleVerticalOffset[ruleVerticalOffset.length - 1]);
      switch(self.kbdControl.selectionType) {
        case A3a.vpl.KbdControl.ObjectType.rule:
        case A3a.vpl.KbdControl.ObjectType.blockLeft:
        case A3a.vpl.KbdControl.ObjectType.blockRight:
        case A3a.vpl.KbdControl.ObjectType.blockLeftParam:
        case A3a.vpl.KbdControl.ObjectType.blockRightParam:
          renderingState.programScroll.scrollToShowVertSpan(self.kbdControl.selectionIndex1 > 0 ? ruleVerticalOffset[self.kbdControl.selectionIndex1 - 1] : 0, ruleVerticalOffset[self.kbdControl.selectionIndex1]);
          break;
      }
      renderingState.programScroll.resize(cssBoxes.vplBox.x, cssBoxes.vplBox.y, cssBoxes.vplBox.width, cssBoxes.vplBox.height);
      canvas.addDecoration(function(ctx) {
        cssBoxes.vplBox.draw(ctx);
      });
      renderingState.programScroll.begin(canvas);
      eventX0 += (eventLibWidth - actionLibWidth) / 2 - canvas.dims.scrollbarWidth / 2;
      actionX0 += (eventLibWidth - actionLibWidth) / 2 - canvas.dims.scrollbarWidth / 2;
      if (vplWidth > cssBoxes.vplBox.width) {
        eventX0 += (vplWidth - cssBoxes.vplBox.width) / 2 + cssBoxes.vplBox.paddingLeft + cssBoxes.vplBox.marginLeft;
        actionX0 += (vplWidth - cssBoxes.vplBox.width) / 2 + cssBoxes.vplBox.paddingLeft + cssBoxes.vplBox.marginLeft;
      }
      var errorMsg = "";
      var isWarning = false;
      program.program.forEach(function(rule, i) {
        if ((i > 0 ? ruleVerticalOffset[i - 1] : 0) < cssBoxes.vplBox.height + renderingState.programScroll.vertScroll && ruleVerticalOffset[i] > renderingState.programScroll.vertScroll) {
          this.addRuleToCanvas(canvas, rule, i, displaySingleEvent, canvas.dims.eventRightAlign ? maxEventsWidth : 0, eventX0, actionX0, cssBoxes.vplBox.y + (i > 0 ? ruleVerticalOffset[i - 1] : 0) + cssBoxes.ruleBox.offsetTop() + cssBoxes.blockContainerBox.offsetTop(), cssBoxes);
        }
        if (rule.error !== null && errorMsg === "") {
          errorMsg = rule.error.msg;
          isWarning = rule.error.isWarning;
          if (rule.error.conflictEventHandler !== null) {
            for (var j = i + 1; j < program.program.length; j++) {
              if (program.program[j] === rule.error.conflictEventHandler) {
                program.addEventHandlerConflictLinkToCanvas(canvas, eventX0, cssBoxes.vplBox.y + cssBoxes.ruleBox.totalHeight() * i + cssBoxes.ruleBox.offsetTop() + cssBoxes.blockContainerBox.offsetTop(), cssBoxes.vplBox.y + cssBoxes.ruleBox.totalHeight() * j + cssBoxes.ruleBox.offsetTop() + cssBoxes.blockContainerBox.offsetTop(), cssBoxes, rule.error.isWarning);
                break;
              }
            }
          }
        }
      }, this);
      renderingState.programScroll.end();
      if (!renderingState.programScroll.isTop()) {
        var moreHighBox = canvas.css.getBox({tag:"widget", id:"widget-moreHigh"});
        var item = new A3a.vpl.CanvasItem(null, moreHighBox.totalWidth(), moreHighBox.totalHeight(), cssBoxes.vplBox.x + cssBoxes.vplBox.width - moreHighBox.totalWidth(), cssBoxes.vplBox.y + moreHighBox.totalHeight() - moreHighBox.totalHeight(), function(canvas, item, dx, dy) {
          canvas.drawWidget("vpl:moreHigh", cssBoxes.vplBox.x + cssBoxes.vplBox.width - moreHighBox.totalWidth() / 2, cssBoxes.vplBox.y + moreHighBox.totalHeight() / 2, moreHighBox);
        }, {mouseup:function() {
          renderingState.programScroll.scrollCanvas(0, -cssBoxes.ruleBox.totalHeight());
          canvas.redraw();
        }}, null, null, "scrollUp");
        canvas.setItem(item);
      }
      if (!renderingState.programScroll.isBottom()) {
        var moreLowBox = canvas.css.getBox({tag:"widget", id:"widget-moreLow"});
        var item = new A3a.vpl.CanvasItem(null, moreLowBox.totalWidth(), moreLowBox.totalHeight(), cssBoxes.vplBox.x + cssBoxes.vplBox.width - moreLowBox.totalWidth(), cssBoxes.vplBox.y + cssBoxes.vplBox.height - moreLowBox.totalHeight(), function(canvas, item, dx, dy) {
          canvas.drawWidget("vpl:moreLow", cssBoxes.vplBox.x + cssBoxes.vplBox.width - moreLowBox.totalWidth() / 2, cssBoxes.vplBox.y + cssBoxes.vplBox.height - moreLowBox.totalHeight() / 2, moreLowBox);
        }, {mouseup:function() {
          renderingState.programScroll.scrollCanvas(0, cssBoxes.ruleBox.totalHeight());
          canvas.redraw();
        }}, null, null, "scrollDown");
        canvas.setItem(item);
      }
      if (program.noVPL) {
        canvas.addDecoration(function(ctx) {
          canvas.disabledMark(cssBoxes.vplBox.x, cssBoxes.vplBox.y, cssBoxes.vplBox.width, cssBoxes.vplBox.height, ["vpl"], ["vpl"]);
        });
      }
    }
  }
  if (this.vplHint) {
    canvas.addDecoration(function(ctx) {
      var box = canvas.css.getBox({tag:"hint"});
      ctx.fillStyle = box.color;
      ctx.font = box.cssFontString();
      ctx.textAlign = "start";
      ctx.textBaseline = "middle";
      var msg = self.i18n.translate(self.vplHint);
      if (self.uiConfig.nodragAccessibility) {
        var msgNoDrag = self.i18n.translate(self.vplHint + ";nodrag");
        if (msgNoDrag.slice(-7) !== ";nodrag") {
          msg = msgNoDrag;
        }
      }
      box.width = ctx.measureText(msg).width;
      box.height = box.fontSize * 1.2;
      box.drawAt(ctx, box.marginLeft, canvasSize.height - box.totalHeight() + box.marginTop, true);
      ctx.fillText(msg, box.offsetLeft(), canvasSize.height - box.totalHeight() + box.offsetTop() + box.height / 2);
    });
  }
  program.onUpdate && program.onUpdate();
  canvas.redraw();
};
var CSSParser = function() {
  this.src = {};
  this.rawRules = [];
  this.lengthUnits = {"px":1, "cm":96 / 2.54, "mm":96 / 25.4, "in":96, "pc":96 / 6, "pt":96 / 72};
  this.angleUnits = {"rad":1, "deg":Math.PI / 180, "grad":Math.PI / 200, "turn":2 * Math.PI};
  this.lengthBase = null;
};
CSSParser.prototype.reset = function() {
  this.src = {};
  this.rawRules = [];
};
CSSParser.prototype.parse = function(filename, src) {
  this.src[filename] = src;
  var i = 0;
  var line = 1;
  var col = 1;
  function location() {
    return filename + " line " + line + " col " + col;
  }
  function skipBlanks() {
    while (i < src.length) {
      if (src[i] === " " || src[i] === "\t") {
        i++;
        col++;
      } else {
        if (src[i] === "\n") {
          i++;
          col = 1;
          line++;
        } else {
          if (src[i] === "\r") {
            i++;
          } else {
            if (src.slice(i, i + 2) === "/*") {
              for (i += 2, col += 2; i < src.length;) {
                if (src.slice(i, i + 2) === "*/") {
                  i += 2;
                  col += 2;
                  break;
                } else {
                  i++;
                  col++;
                }
              }
            } else {
              break;
            }
          }
        }
      }
    }
  }
  function skipCharacter() {
    if (src[i] === "\n") {
      col = 1;
      line++;
    } else {
      if (src[i] !== "\r") {
        col++;
      }
    }
    i++;
  }
  function parseTag() {
    var len = 0;
    while (i + len < src.length && /[-_a-z0-9]/i.test(src[i + len])) {
      len++;
    }
    i += len;
    col += len;
    return src.slice(i - len, i);
  }
  function parseSelector() {
    var sel = new CSSParser.Selector;
    if (!/[a-z_.#*:]/i.test(src[i])) {
      throw "Syntax error " + location();
    }
    if (/[a-z_]/i.test(src[i])) {
      sel.tag = parseTag();
    } else {
      if (src[i] === "*") {
        skipCharacter();
      }
    }
    while (true) {
      if (src[i] === "#") {
        if (sel.id) {
          throw "Multiple ids in selector " + location();
        }
        skipCharacter();
        sel.id = parseTag();
      } else {
        if (src[i] === ".") {
          skipCharacter();
          sel.clas.push(parseTag());
        } else {
          if (src[i] === ":") {
            skipCharacter();
            sel.pseudoClass.push(parseTag());
          } else {
            break;
          }
        }
      }
    }
    return sel;
  }
  function parseValue() {
    var j = 0;
    var quoted = false;
    while (i + j < src.length && (quoted || src[i + j] !== ";" && src[i + j] !== "}")) {
      if (src[i] === "\n") {
        line++;
        col = 1;
      } else {
        if (src[i] !== "\r") {
          col++;
        } else {
          if (src[i] === '"') {
            quoted = !quoted;
          }
        }
      }
      j++;
    }
    i += j;
    return src.slice(i - j, i).trim();
  }
  while (i < src.length) {
    skipBlanks();
    if (i >= src.length) {
      break;
    }
    var selectors = [];
    while (true) {
      selectors.push(parseSelector());
      skipBlanks();
      if (src[i] !== ",") {
        break;
      }
      i++;
      col++;
      skipBlanks();
    }
    if (src[i] !== "{") {
      throw "Syntax error " + location();
    }
    i++;
    col++;
    var props = {};
    while (true) {
      while (true) {
        skipBlanks();
        if (src[i] !== ";") {
          break;
        }
        i++;
      }
      if (i >= src.length) {
        throw "Unclosed block " + location();
      } else {
        if (src[i] === "}") {
          i++;
          col++;
          break;
        } else {
          if (!/[-a-z_]/i.test(src[i])) {
            throw "Syntax error " + location();
          }
        }
      }
      var key = parseTag();
      skipBlanks();
      if (src[i] !== ":") {
        throw "Missing colon " + location();
      }
      i++;
      col++;
      var val = parseValue();
      props[key] = this.processValue(key, val);
    }
    for (var j = 0; j < selectors.length; j++) {
      this.rawRules.push({selector:selectors[j], properties:props});
    }
  }
};
CSSParser.prototype.processValue = function(key, val) {
  return val;
};
CSSParser.prototype.convertLength = function(length) {
  if (/^(max|min)\(.*\)$/.test(length)) {
    var args = length.slice(4, -1).split(",").map(function(arg) {
      return this.convertLength(arg);
    }, this);
    return new CSSParser.Length.MultipleValues(length.slice(0, 3), args);
  }
  var re = /^(-?([0-9]+\.?|[0-9]*\.[0-9]+))([a-z]*|%)$/.exec(length);
  var sc = 1;
  var type = CSSParser.Length.type.absolute;
  if (re == null) {
    throw "Illegal length";
  } else {
    if (re[3] === "%") {
      type = CSSParser.Length.type.percentage;
    } else {
      if (this.lengthUnits.hasOwnProperty(re[3])) {
        sc = this.lengthUnits[re[3]];
      } else {
        if (re[3] === "vw") {
          type = CSSParser.Length.type.vw;
        } else {
          if (re[3] === "vh") {
            type = CSSParser.Length.type.vh;
          } else {
            if (re[3] === "vmin") {
              type = CSSParser.Length.type.vmin;
            } else {
              if (re[3] === "vmax") {
                type = CSSParser.Length.type.vmax;
              } else {
                if (re[3] === "ww") {
                  type = CSSParser.Length.type.ww;
                } else {
                  if (re[3] === "wh") {
                    type = CSSParser.Length.type.wh;
                  } else {
                    if (re[3] === "wmin") {
                      type = CSSParser.Length.type.wmin;
                    } else {
                      if (re[3] === "wmax") {
                        type = CSSParser.Length.type.wmax;
                      } else {
                        if (parseFloat(re[1]) == 0) {
                          sc = 0;
                        } else {
                          throw "Unknown length unit";
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return new CSSParser.Length(parseFloat(re[1]) * sc, type);
};
CSSParser.prototype.convertAngle = function(angle) {
  var re = /^(-?([0-9]+\.?|[0-9]*\.[0-9]+))([a-z]*)$/.exec(angle);
  var sc = 1;
  if (re == null) {
    throw "Illegal angle";
  } else {
    if (this.angleUnits.hasOwnProperty(re[3])) {
      sc = this.angleUnits[re[3]];
    } else {
      if (parseFloat(re[1]) == 0) {
        sc = 0;
      } else {
        throw "Unknown angle unit";
      }
    }
  }
  return parseFloat(re[1]) * sc;
};
CSSParser.colorDict = {"aliceblue":"#F0F8FF", "antiquewhite":"#FAEBD7", "aqua":"#00FFFF", "aquamarine":"#7FFFD4", "azure":"#F0FFFF", "beige":"#F5F5DC", "bisque":"#FFE4C4", "black":"#000000", "blanchedalmond":"#FFEBCD", "blue":"#0000FF", "blueviolet":"#8A2BE2", "brown":"#A52A2A", "burlywood":"#DEB887", "cadetblue":"#5F9EA0", "chartreuse":"#7FFF00", "chocolate":"#D2691E", "coral":"#FF7F50", "cornflowerblue":"#6495ED", "cornsilk":"#FFF8DC", "crimson":"#DC143C", "cyan":"#00FFFF", "darkblue":"#00008B", 
"darkcyan":"#008B8B", "darkgoldenrod":"#B8860B", "darkgray":"#A9A9A9", "darkgreen":"#006400", "darkgrey":"#A9A9A9", "darkkhaki":"#BDB76B", "darkmagenta":"#8B008B", "darkolivegreen":"#556B2F", "darkorange":"#FF8C00", "darkorchid":"#9932CC", "darkred":"#8B0000", "darksalmon":"#E9967A", "darkseagreen":"#8FBC8F", "darkslateblue":"#483D8B", "darkslategray":"#2F4F4F", "darkslategrey":"#2F4F4F", "darkturquoise":"#00CED1", "darkviolet":"#9400D3", "deeppink":"#FF1493", "deepskyblue":"#00BFFF", "dimgray":"#696969", 
"dimgrey":"#696969", "dodgerblue":"#1E90FF", "firebrick":"#B22222", "floralwhite":"#FFFAF0", "forestgreen":"#228B22", "fuchsia":"#FF00FF", "gainsboro":"#DCDCDC", "ghostwhite":"#F8F8FF", "gold":"#FFD700", "goldenrod":"#DAA520", "gray":"#808080", "green":"#008000", "greenyellow":"#ADFF2F", "grey":"#808080", "honeydew":"#F0FFF0", "hotpink":"#FF69B4", "indianred":"#CD5C5C", "indigo":"#4B0082", "ivory":"#FFFFF0", "khaki":"#F0E68C", "lavender":"#E6E6FA", "lavenderblush":"#FFF0F5", "lawngreen":"#7CFC00", 
"lemonchiffon":"#FFFACD", "lightblue":"#ADD8E6", "lightcoral":"#F08080", "lightcyan":"#E0FFFF", "lightgoldenrodyellow":"#FAFAD2", "lightgray":"#D3D3D3", "lightgreen":"#90EE90", "lightgrey":"#D3D3D3", "lightpink":"#FFB6C1", "lightsalmon":"#FFA07A", "lightseagreen":"#20B2AA", "lightskyblue":"#87CEFA", "lightslategray":"#778899", "lightslategrey":"#778899", "lightsteelblue":"#B0C4DE", "lightyellow":"#FFFFE0", "lime":"#00FF00", "limegreen":"#32CD32", "linen":"#FAF0E6", "magenta":"#FF00FF", "maroon":"#800000", 
"mediumaquamarine":"#66CDAA", "mediumblue":"#0000CD", "mediumorchid":"#BA55D3", "mediumpurple":"#9370DB", "mediumseagreen":"#3CB371", "mediumslateblue":"#7B68EE", "mediumspringgreen":"#00FA9A", "mediumturquoise":"#48D1CC", "mediumvioletred":"#C71585", "midnightblue":"#191970", "mintcream":"#F5FFFA", "mistyrose":"#FFE4E1", "moccasin":"#FFE4B5", "navajowhite":"#FFDEAD", "navy":"#000080", "oldlace":"#FDF5E6", "olive":"#808000", "olivedrab":"#6B8E23", "orange":"#FFA500", "orangered":"#FF4500", "orchid":"#DA70D6", 
"palegoldenrod":"#EEE8AA", "palegreen":"#98FB98", "paleturquoise":"#AFEEEE", "palevioletred":"#DB7093", "papayawhip":"#FFEFD5", "peachpuff":"#FFDAB9", "peru":"#CD853F", "pink":"#FFC0CB", "plum":"#DDA0DD", "powderblue":"#B0E0E6", "purple":"#800080", "red":"#FF0000", "rosybrown":"#BC8F8F", "royalblue":"#4169E1", "saddlebrown":"#8B4513", "salmon":"#FA8072", "sandybrown":"#F4A460", "seagreen":"#2E8B57", "seashell":"#FFF5EE", "sienna":"#A0522D", "silver":"#C0C0C0", "skyblue":"#87CEEB", "slateblue":"#6A5ACD", 
"slategray":"#708090", "slategrey":"#708090", "snow":"#FFFAFA", "springgreen":"#00FF7F", "steelblue":"#4682B4", "tan":"#D2B48C", "teal":"#008080", "thistle":"#D8BFD8", "tomato":"#FF6347", "turquoise":"#40E0D0", "violet":"#EE82EE", "wheat":"#F5DEB3", "white":"#FFFFFF", "whitesmoke":"#F5F5F5", "yellow":"#FFFF00", "yellowgreen":"#9ACD32", "transparent":"rgba(0,0,0,0)"};
CSSParser.Length = function(val, type) {
  this.val = val;
  this.type = type ? type : CSSParser.Length.type.absolute;
};
CSSParser.Length.type = {absolute:"abs", percentage:"%", vw:"vw", vh:"vh", vmin:"vmin", vmax:"vmax", ww:"ww", wh:"wh", wmin:"wmin", wmax:"wmax"};
CSSParser.Length.prototype.setValue = function(val, type) {
  this.val = val;
  this.type = type ? type : CSSParser.Length.type.absolute;
};
CSSParser.Length.prototype.toValue = function(lengthBase) {
  switch(this.type) {
    case CSSParser.Length.type.absolute:
      return this.val;
    case CSSParser.Length.type.percentage:
      return this.val * (lengthBase ? lengthBase.base / 100 : 1);
    case CSSParser.Length.type.vw:
      return this.val * (lengthBase ? lengthBase.vw : 1);
    case CSSParser.Length.type.vh:
      return this.val * (lengthBase ? lengthBase.vh : 1);
    case CSSParser.Length.type.vmin:
      return this.val * (lengthBase ? Math.min(lengthBase.vw, lengthBase.vh) : 1);
    case CSSParser.Length.type.vmax:
      return this.val * (lengthBase ? Math.max(lengthBase.vw, lengthBase.vh) : 1);
    case CSSParser.Length.type.ww:
      return this.val * (lengthBase ? lengthBase.ww : 1);
    case CSSParser.Length.type.wh:
      return this.val * (lengthBase ? lengthBase.wh : 1);
    case CSSParser.Length.type.wmin:
      return this.val * (lengthBase ? Math.min(lengthBase.ww, lengthBase.wh) : 1);
    case CSSParser.Length.type.wmax:
      return this.val * (lengthBase ? Math.max(lengthBase.ww, lengthBase.wh) : 1);
    default:
      throw "internal";
  }
};
CSSParser.Length.MultipleValues = function(fun, values) {
  CSSParser.Length.call(this, 0);
  this.fun = fun;
  this.values = values;
};
CSSParser.Length.MultipleValues.prototype = Object.create(CSSParser.Length.prototype);
CSSParser.Length.MultipleValues.prototype.constructor = CSSParser.Length.MultipleValues;
CSSParser.Length.MultipleValues.prototype.toValue = function(lengthBase) {
  switch(this.fun) {
    case "max":
      return this.values.reduce(function(acc, val) {
        return Math.max(acc, val.toValue(lengthBase));
      }, -Infinity);
    case "min":
      return this.values.reduce(function(acc, val) {
        return Math.min(acc, val.toValue(lengthBase));
      }, Infinity);
    default:
      throw "internal";
  }
};
CSSParser.LengthBase = function(base, vw, vh, ww, wh) {
  this.base = base;
  this.vw = vw;
  this.vh = vh;
  this.ww = ww;
  this.wh = wh;
};
CSSParser.Selector = function(opt) {
  this.tag = opt && opt.tag || null;
  this.id = opt && opt.id || null;
  this.clas = opt && opt.clas || [];
  this.pseudoClass = opt && opt.pseudoClass || [];
};
CSSParser.Selector.Options;
CSSParser.Selector.prototype.specificity = function() {
  return (this.id != null ? 100 : 0) + 10 * (this.clas.length + this.pseudoClass.length) + (this.tag != null ? 1 : 0);
};
CSSParser.Selector.stringifyOptions = function(opt, lengthBase) {
  var str = (opt.id ? "#" + opt.id : opt.tag || "") + (opt.clas && opt.clas.length > 0 ? "." + opt.clas.join(".") : "") + (opt.pseudoClass && opt.pseudoClass.length > 0 ? ":" + opt.pseudoClass.join(".") : "") || "*";
  if (lengthBase) {
    str += "/" + Math.round(lengthBase.base).toString(10) + "," + Math.round(lengthBase.vw).toString(10) + "," + Math.round(lengthBase.vh).toString(10) + "," + Math.round(lengthBase.ww).toString(10) + "," + Math.round(lengthBase.wh).toString(10);
  }
  return str;
};
CSSParser.Selector.prototype.match = function(opt) {
  if (opt.tag && this.tag && opt.tag !== this.tag) {
    return false;
  }
  if (this.id && this.id !== opt.id) {
    return false;
  }
  for (var i = 0; i < this.clas.length; i++) {
    if (opt.clas == undefined || opt.clas.indexOf(this.clas[i]) < 0) {
      return false;
    }
  }
  for (var i = 0; i < this.pseudoClass.length; i++) {
    if (opt.pseudoClass == undefined || opt.pseudoClass.indexOf(this.pseudoClass[i]) < 0) {
      return false;
    }
  }
  return true;
};
CSSParser.VPL = function() {
  CSSParser.call(this);
  this.elements = [];
  this.rules = [];
  this.boxCache = {};
  this.lineCache = {};
  this.borderStyles = ["none", "hidden", "dotted", "dashed", "solid", "double"];
  this.fontStyles = ["normal", "italic", "oblique"];
  this.fontWeights = ["normal", "bold"];
};
CSSParser.VPL.prototype = Object.create(CSSParser.prototype);
CSSParser.VPL.prototype.constructor = CSSParser.VPL;
CSSParser.VPL.prototype.reset = function() {
  CSSParser.prototype.reset.call(this);
  this.boxCache = {};
  this.lineCache = {};
};
CSSParser.VPL.prototype.addElement = function(tag) {
  this.elements.push(tag);
};
CSSParser.VPL.prototype.defineProperties = function() {
  for (var i = 0; i < this.rawRules.length; i++) {
    var props = new CSSParser.VPL.Properties;
    props.setProperties(this.rawRules[i].properties, this.rawRules[i].selector.specificity());
    this.rules.push({selector:this.rawRules[i].selector, props:props});
  }
};
CSSParser.VPL.prototype.processValue = function(key, val) {
  var self = this;
  function isLength(val) {
    try {
      self.convertLength(val);
    } catch (e) {
      return false;
    }
    return true;
  }
  function isColor(val) {
    return CSSParser.colorDict.hasOwnProperty(val) || /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val) || /^rgba\([^()]*\)$/.test(val);
  }
  function isStyle(val) {
    return self.borderStyles.indexOf(val) >= 0;
  }
  function isLineCap(val) {
    return ["butt", "round", "square"].indexOf(val) >= 0;
  }
  val = val.replace(/\s+(?=[^()]*\))/g, "");
  switch(key) {
    case "margin-left":
    case "margin-right":
    case "margin-top":
    case "margin-bottom":
    case "padding-left":
    case "padding-right":
    case "padding-top":
    case "padding-bottom":
    case "border-left-width":
    case "border-right-width":
    case "border-top-width":
    case "border-bottom-width":
    case "border-corner-length":
    case "line-width":
    case "width":
    case "height":
    case "min-width":
    case "min-height":
    case "max-width":
    case "max-height":
    case "font-size":
      return this.convertLength(val);
    case "margin":
    case "padding":
    case "border-width":
      var lengths = val.replace(/ +/g, " ").split(" ").map(function(val1) {
        return self.convertLength(val1);
      });
      switch(lengths.length) {
        case 1:
          return [lengths[0], lengths[0], lengths[0], lengths[0]];
        case 2:
          return [lengths[0], lengths[1], lengths[0], lengths[1]];
        case 3:
          return [lengths[0], lengths[1], lengths[2], lengths[1]];
        case 4:
          return lengths;
        default:
          throw "Wrong number of lengths";
      }case "border-style":
    case "border-left-style":
    case "border-right-style":
    case "border-top-style":
    case "border-bottom-style":
    case "line-style":
      if (!isStyle(val)) {
        throw "Unknown border style";
      }
      return val;
    case "line-cap":
      if (!isLineCap(val)) {
        throw "Unknown line cap";
      }
      return val;
    case "border-color":
    case "border-left-color":
    case "border-right-color":
    case "border-top-color":
    case "border-bottom-color":
    case "color":
    case "background-color":
    case "background":
    case "border-cut-background":
      if (!isColor(val)) {
        throw "Unknown border color";
      }
      return val;
    case "border-left":
    case "border-right":
    case "border-top":
    case "border-bottom":
    case "border":
    case "line":
      var color = null;
      var style = null;
      var width = null;
      val.replace(/ +/g, " ").split(" ").forEach(function(val1) {
        if (isColor(val1)) {
          color = val1;
        } else {
          if (isStyle(val1)) {
            style = val1;
          } else {
            if (isLength(val1)) {
              width = self.convertLength(val1);
            } else {
              throw "Illegal border property";
            }
          }
        }
      });
      return {color:color, style:style === null && (color || width) ? "solid" : style, width:width === null && (color || style) ? new CSSParser.Length(1) : width};
    case "border-top-left-radius":
    case "border-top-right-radius":
    case "border-bottom-right-radius":
    case "border-bottom-left-radius":
    case "border-top-left-cut":
    case "border-top-right-cut":
    case "border-bottom-left-cut":
    case "border-bottom-right-cut":
      var r = val.replace(/ +/g, " ").split(" ").map(function(val1) {
        return self.convertLength(val1);
      });
      switch(r.length) {
        case 1:
          return [r[0], r[0]];
        case 2:
          return r;
        default:
          throw "Wrong number of radii";
      }case "border-radius":
    case "border-cut":
      var rr = val.split("/").map(function(part) {
        var r = part.replace(/ +/g, " ").split(" ").map(function(val1) {
          return val1 === "/" ? "/" : self.convertLength(val1);
        });
        switch(r.length) {
          case 1:
            return [r[0], r[0], r[0], r[0]];
          case 2:
            return [r[0], r[1], r[0], r[1]];
          case 3:
            return [r[0], r[1], r[2], r[1]];
          case 4:
            return r;
          default:
            throw "Wrong number of radii";
        }
      });
      switch(rr.length) {
        case 1:
          return rr[0].concat(rr[0]);
        case 2:
          return rr[0].concat(rr[1]);
        default:
          throw "Wrong number of radius dimensions";
      }case "font":
      var fontStyle = "";
      var fontWeight = "";
      var fontSize = null;
      var fontFamily = "";
      val.replace(/ +/g, " ").split(" ").forEach(function(val1) {
        if (fontSize === null) {
          if (isLength(val1)) {
            fontSize = self.convertLength(val1);
          } else {
            if (self.fontStyles.indexOf(val1) >= 0) {
              fontStyle = val1;
            } else {
              if (self.fontWeights.indexOf(val1) >= 0) {
                fontWeight = val1;
              } else {
                throw "Unknown font style " + val1;
              }
            }
          }
        } else {
          if (fontFamily !== "") {
            throw "Unexpected font style after font-family";
          } else {
            fontFamily = val1;
          }
        }
      });
      return {fontFamily:fontFamily, fontSize:fontSize, fontStyle:fontStyle, fontWeight:fontWeight};
    case "box-shadow":
    case "line-shadow":
      val = val.split(",")[0];
      var valArr = val.replace(/ +/g, " ").split(" ");
      if (valArr[0] === "inset") {
        valArr = valArr.slice(1);
      }
      if (valArr.length >= 3 && valArr.length <= 5) {
        return {offset:[this.convertLength(valArr[0]), this.convertLength(valArr[1])], color:valArr[valArr.length - 1], blurRadius:valArr.length >= 4 ? this.convertLength(valArr[2]) : null, spreadRadius:valArr.length >= 5 ? this.convertLength(valArr[3]) : null};
      }
      return {};
    case "overflow":
      if (["wrap", "scroll"].indexOf(val) < 0) {
        throw "Unknown overflow mode";
      }
      return val;
    case "vertical-align":
      return ["top", "middle", "bottom"].indexOf(val) >= 0 ? val : this.convertLength(val);
    default:
      return val;
  }
};
CSSParser.VPL.prototype.getProperties = function(opt) {
  var props = null;
  for (var i = 0; i < this.rules.length; i++) {
    if (this.rules[i].selector.match(opt)) {
      props = props ? props.merge(this.rules[i].props) : this.rules[i].props.copy();
    }
  }
  for (var key in props) {
    if (props.hasOwnProperty(key) && props[key] instanceof CSSParser.Length) {
      props[key] = props[key].toValue(this.lengthBase);
    }
  }
  return props;
};
CSSParser.VPL.prototype.getBox = function(opt) {
  var key = CSSParser.Selector.stringifyOptions(opt, this.lengthBase);
  if (this.boxCache[key]) {
    return this.boxCache[key];
  }
  var props = this.getProperties(opt);
  var box = new CSSParser.VPL.Box(props, this.lengthBase);
  this.boxCache[key] = box;
  return box;
};
CSSParser.VPL.prototype.getLine = function(opt) {
  var key = CSSParser.Selector.stringifyOptions(opt, this.lengthBase);
  if (this.lineCache[key]) {
    return this.lineCache[key];
  }
  var props = this.getProperties(opt);
  var line = new CSSParser.VPL.Line(props, this.lengthBase);
  this.lineCache[key] = line;
  return line;
};
CSSParser.VPL.Properties = function() {
  this.properties = {};
  this.propSpecificity = {};
};
CSSParser.VPL.Properties.prototype.setProperties = function(props, specificity, propSpecificity) {
  for (var key in props) {
    if (props.hasOwnProperty(key)) {
      this.properties[key] = props[key];
      this.propSpecificity[key] = propSpecificity && propSpecificity[key] || specificity;
    }
  }
};
CSSParser.VPL.Properties.prototype.copy = function() {
  var props = new CSSParser.VPL.Properties;
  props.setProperties(this.properties, 0, this.propSpecificity);
  return props;
};
CSSParser.VPL.Properties.prototype.merge = function(overridingProps) {
  var props = this.copy();
  for (var key in overridingProps.properties) {
    if (overridingProps.properties.hasOwnProperty(key) && (!props.hasOwnProperty(key) || overridingProps.propSpecificity[key] >= props.propSpecificity[key])) {
      props.properties[key] = overridingProps.properties[key];
    }
  }
  return props;
};
CSSParser.VPL.Box = function(props, lengthBase) {
  this.width = 0;
  this.height = 0;
  this.x = 0;
  this.y = 0;
  this.marginLeft = 0;
  this.marginRight = 0;
  this.marginTop = 0;
  this.marginBottom = 0;
  this.sameBorder = true;
  this.roundedCorners = false;
  this.borderLeftWidth = 0;
  this.borderRightWidth = 0;
  this.borderTopWidth = 0;
  this.borderBottomWidth = 0;
  this.borderLeftStyle = "none";
  this.borderRightStyle = "none";
  this.borderTopStyle = "none";
  this.borderBottomStyle = "none";
  this.borderLeftColor = "black";
  this.borderRightColor = "black";
  this.borderTopColor = "black";
  this.borderBottomColor = "black";
  this.borderTopLeftRadius = [0, 0];
  this.borderTopRightRadius = [0, 0];
  this.borderBottomRightRadius = [0, 0];
  this.borderBottomLeftRadius = [0, 0];
  this.borderTopLeftCut = false;
  this.borderTopRightCut = false;
  this.borderBottomLeftCut = false;
  this.borderBottomRightCut = false;
  this.borderCornerLength = 0;
  this.paddingLeft = 0;
  this.paddingRight = 0;
  this.paddingTop = 0;
  this.paddingBottom = 0;
  this.backdropColor = "transparent";
  this.backgroundColor = "transparent";
  this.color = "black";
  this.fontFamily = "sans-serif";
  this.fontSize = 10;
  this.fontStyle = "";
  this.fontWeight = "";
  this.scroll = false;
  this.verticalAlign = "middle";
  this.shadowOffset = null;
  this.shadowBlurRadius = 0;
  this.shadowSpreadRadius = 0;
  this.shadowColor = null;
  this.otherProperties = {};
  if (props) {
    this.setProperties(props.properties, lengthBase);
  }
};
CSSParser.VPL.Box.prototype = Object.create(CSSParser.VPL.Properties.prototype);
CSSParser.VPL.Box.prototype.constructor = CSSParser.VPL.Box;
CSSParser.VPL.Box.prototype.setProperties = function(props, lengthBase) {
  var width = -1;
  var height = -1;
  var minWidth = -1;
  var minHeight = -1;
  var maxWidth = 1e9;
  var maxHeight = 1e9;
  for (var key in props) {
    switch(key) {
      case "margin-left":
        this.marginLeft = props[key].toValue(lengthBase);
        break;
      case "margin-right":
        this.marginRight = props[key].toValue(lengthBase);
        break;
      case "margin-top":
        this.marginTop = props[key].toValue(lengthBase);
        break;
      case "margin-bottom":
        this.marginBottom = props[key].toValue(lengthBase);
        break;
      case "border-left-width":
        this.borderLeftWidth = props[key].toValue(lengthBase);
        this.sameBorder = false;
        break;
      case "border-right-width":
        this.borderRightWidth = props[key].toValue(lengthBase);
        this.sameBorder = false;
        break;
      case "border-top-width":
        this.borderTopWidth = props[key].toValue(lengthBase);
        this.sameBorder = false;
        break;
      case "border-bottom-width":
        this.borderBottomWidth = props[key].toValue(lengthBase);
        this.sameBorder = false;
        break;
      case "border-corner-length":
        this.borderCornerLength = props[key].toValue(lengthBase);
        break;
      case "padding-left":
        this.paddingLeft = props[key].toValue(lengthBase);
        break;
      case "padding-right":
        this.paddingRight = props[key].toValue(lengthBase);
        break;
      case "padding-top":
        this.paddingTop = props[key].toValue(lengthBase);
        break;
      case "padding-bottom":
        this.paddingBottom = props[key].toValue(lengthBase);
        break;
      case "margin":
        this.marginTop = props[key][0].toValue(lengthBase);
        this.marginRight = props[key][1].toValue(lengthBase);
        this.marginBottom = props[key][2].toValue(lengthBase);
        this.marginLeft = props[key][3].toValue(lengthBase);
        break;
      case "border-width":
        this.borderTopWidth = props[key][0].toValue(lengthBase);
        if (this.borderTopStyle === "none" && this.borderTopWidth > 0) {
          this.borderTopStyle = null;
        }
        this.borderRightWidth = props[key][1].toValue(lengthBase);
        if (this.borderRightStyle === "none" && this.borderRightWidth > 0) {
          this.borderRightStyle = null;
        }
        this.borderBottomWidth = props[key][2].toValue(lengthBase);
        if (this.borderBottomStyle === "none" && this.borderBottomWidth > 0) {
          this.borderBottomStyle = null;
        }
        this.borderLeftWidth = props[key][3].toValue(lengthBase);
        if (this.borderLeftStyle === "none" && this.borderLeftWidth > 0) {
          this.borderLeftStyle = null;
        }
        break;
      case "padding":
        this.paddingTop = props[key][0].toValue(lengthBase);
        this.paddingRight = props[key][1].toValue(lengthBase);
        this.paddingBottom = props[key][2].toValue(lengthBase);
        this.paddingLeft = props[key][3].toValue(lengthBase);
        break;
      case "border-style":
        this.borderLeftStyle = props[key];
        this.borderRightStyle = props[key];
        this.borderTopStyle = props[key];
        this.borderBottomStyle = props[key];
        break;
      case "border-left-style":
        this.borderLeftStyle = props[key];
        this.sameBorder = false;
        break;
      case "border-right-style":
        this.borderRightStyle = props[key];
        this.sameBorder = false;
        break;
      case "border-top-style":
        this.borderTopStyle = props[key];
        this.sameBorder = false;
        break;
      case "border-bottom-style":
        this.borderBottomStyle = props[key];
        this.sameBorder = false;
        break;
      case "border-color":
        this.borderLeftColor = props[key];
        this.borderRightColor = props[key];
        this.borderTopColor = props[key];
        this.borderBottomColor = props[key];
        break;
      case "border-left-color":
        this.borderLeftColor = props[key];
        this.sameBorder = false;
        break;
      case "border-right-color":
        this.borderRightColor = props[key];
        this.sameBorder = false;
        break;
      case "border-top-color":
        this.borderTopColor = props[key];
        this.sameBorder = false;
        break;
      case "border-bottom-color":
        this.borderBottomColor = props[key];
        this.sameBorder = false;
        break;
      case "border-left":
        if (props[key].color !== null) {
          this.borderLeftColor = props[key].color;
        }
        if (props[key].style !== null) {
          this.borderLeftStyle = props[key].style;
        }
        if (props[key].width !== null) {
          this.borderLeftWidth = props[key].width.toValue(lengthBase);
        }
        this.sameBorder = false;
        break;
      case "border-right":
        if (props[key].color !== null) {
          this.borderRightColor = props[key].color;
        }
        if (props[key].style !== null) {
          this.borderRightStyle = props[key].style;
        }
        if (props[key].width !== null) {
          this.borderRightWidth = props[key].width.toValue(lengthBase);
        }
        this.sameBorder = false;
        break;
      case "border-top":
        if (props[key].color !== null) {
          this.borderTopColor = props[key].color;
        }
        if (props[key].style !== null) {
          this.borderTopStyle = props[key].style;
        }
        if (props[key].width !== null) {
          this.borderTopWidth = props[key].width.toValue(lengthBase);
        }
        this.sameBorder = false;
        break;
      case "border-bottom":
        if (props[key].color !== null) {
          this.borderBottomColor = props[key].color;
        }
        if (props[key].style !== null) {
          this.borderBottomStyle = props[key].style;
        }
        if (props[key].width !== null) {
          this.borderBottomWidth = props[key].width.toValue(lengthBase);
        }
        this.sameBorder = false;
        break;
      case "border":
        if (props[key].color !== null) {
          this.borderLeftColor = this.borderRightColor = this.borderTopColor = this.borderBottomColor = props[key].color;
        }
        if (props[key].style !== null) {
          this.borderLeftStyle = this.borderRightStyle = this.borderTopStyle = this.borderBottomStyle = props[key].style;
        }
        if (props[key].width !== null) {
          this.borderLeftWidth = this.borderRightWidth = this.borderTopWidth = this.borderBottomWidth = props[key].width.toValue(lengthBase);
        }
        this.sameBorder = true;
        break;
      case "border-top-left-radius":
        this.borderTopLeftRadius = props[key].map(function(l) {
          return l.toValue(lengthBase);
        });
        this.roundedCorners = true;
        break;
      case "border-top-right-radius":
        this.borderTopRightRadius = props[key].map(function(l) {
          return l.toValue(lengthBase);
        });
        this.roundedCorners = true;
        break;
      case "border-bottom-right-radius":
        this.borderBottomRightRadius = props[key].map(function(l) {
          return l.toValue(lengthBase);
        });
        this.roundedCorners = true;
        break;
      case "border-bottom-left-radius":
        this.borderBottomLeftRadius = props[key].map(function(l) {
          return l.toValue(lengthBase);
        });
        this.roundedCorners = true;
        break;
      case "border-radius":
        this.borderTopLeftRadius = [props[key][0].toValue(lengthBase), props[key][4].toValue(lengthBase)];
        this.borderTopRightRadius = [props[key][1].toValue(lengthBase), props[key][5].toValue(lengthBase)];
        this.borderBottomRightRadius = [props[key][2].toValue(lengthBase), props[key][6].toValue(lengthBase)];
        this.borderBottomLeftRadius = [props[key][3].toValue(lengthBase), props[key][7].toValue(lengthBase)];
        this.roundedCorners = true;
        break;
      case "border-top-left-cut":
        this.borderTopLeftRadius = props[key].map(function(l) {
          return l.toValue(lengthBase);
        });
        this.borderTopLeftCut = true;
        this.roundedCorners = true;
        break;
      case "border-top-right-cut":
        this.borderTopRightRadius = props[key].map(function(l) {
          return l.toValue(lengthBase);
        });
        this.borderTopRightCut = true;
        this.roundedCorners = true;
        break;
      case "border-bottom-left-cut":
        this.borderBottomLeftCut = props[key].map(function(l) {
          return l.toValue(lengthBase);
        });
        this.borderBottomLeftCut = true;
        this.roundedCorners = true;
        break;
      case "border-bottom-right-cut":
        this.borderBottomRightRadius = props[key].map(function(l) {
          return l.toValue(lengthBase);
        });
        this.borderBottomRightCut = true;
        this.roundedCorners = true;
        break;
      case "border-cut":
        this.borderTopLeftRadius = [props[key][0].toValue(lengthBase), props[key][4].toValue(lengthBase)];
        this.borderTopRightRadius = [props[key][1].toValue(lengthBase), props[key][5].toValue(lengthBase)];
        this.borderBottomRightRadius = [props[key][2].toValue(lengthBase), props[key][6].toValue(lengthBase)];
        this.borderBottomLeftRadius = [props[key][3].toValue(lengthBase), props[key][7].toValue(lengthBase)];
        this.borderTopLeftCut = true;
        this.borderTopRightCut = true;
        this.borderBottomLeftCut = true;
        this.borderBottomRightCut = true;
        this.roundedCorners = true;
        break;
      case "backdrop-color":
        this.backdropColor = props[key];
        break;
      case "background-color":
      case "background":
        this.backgroundColor = props[key];
        break;
      case "color":
        this.color = props[key];
        break;
      case "font":
        this.fontFamily = props[key].fontFamily;
        this.fontSize = props[key].fontSize.toValue(lengthBase);
        this.fontStyle = props[key].fontStyle;
        this.fontWeight = props[key].fontWeight;
        break;
      case "font-family":
        this.fontFamily = props[key];
        break;
      case "font-size":
        this.fontSize = props[key].toValue(lengthBase);
        break;
      case "font-style":
        this.fontStyle = props[key];
        break;
      case "font-weight":
        this.fontWeight = props[key];
        break;
      case "overflow":
        this.scroll = props[key] === "scroll";
        break;
      case "vertical-align":
        this.verticalAlign = props[key] instanceof CSSParser.Length ? props[key].toValue(lengthBase) : props[key];
        break;
      case "box-shadow":
        if (props[key].shadowOffset !== null) {
          this.shadowOffset = props[key].offset.map(function(l) {
            return l ? l.toValue(lengthBase) : 0;
          });
          this.shadowBlurRadius = props[key].blurRadius ? props[key].blurRadius.toValue(lengthBase) : 0;
          this.shadowSpreadRadius = props[key].spreadRadius ? props[key].spreadRadius.toValue(lengthBase) : 0;
          this.shadowColor = props[key].color;
        }
        break;
      case "width":
        width = props[key].toValue(lengthBase);
        break;
      case "min-width":
        minWidth = props[key].toValue(lengthBase);
        break;
      case "max-width":
        maxWidth = props[key].toValue(lengthBase);
        break;
      case "height":
        height = props[key].toValue(lengthBase);
        break;
      case "min-height":
        minHeight = props[key].toValue(lengthBase);
        break;
      case "max-height":
        maxHeight = props[key].toValue(lengthBase);
        break;
      default:
        if (props.hasOwnProperty(key)) {
          this.otherProperties[key] = props[key];
        }
        break;
    }
  }
  width = Math.max(Math.min(width, maxWidth), minWidth);
  height = Math.max(Math.min(height, maxHeight), minHeight);
  if (width >= 0) {
    this.width = width;
  }
  if (height >= 0) {
    this.height = height;
  }
};
CSSParser.VPL.Box.prototype.setPosition = function(left, top) {
  this.x = left + this.offsetLeft();
  this.y = top + this.offsetTop();
};
CSSParser.VPL.Box.prototype.totalWidth = function() {
  return this.width + this.nonContentWidth();
};
CSSParser.VPL.Box.prototype.totalHeight = function() {
  return this.height + this.nonContentHeight();
};
CSSParser.VPL.Box.prototype.setTotalWidth = function(totalWidth) {
  this.width = totalWidth - (this.marginLeft + this.borderLeftWidth + this.paddingLeft + this.paddingRight + this.borderRightWidth + this.marginRight);
};
CSSParser.VPL.Box.prototype.setTotalHeight = function(totalHeight) {
  this.height = totalHeight - (this.marginTop + this.borderTopWidth + this.paddingTop + this.paddingBottom + this.borderBottomWidth + this.marginBottom);
};
CSSParser.VPL.Box.prototype.copy = function() {
  var box = new CSSParser.VPL.Box;
  box.width = this.width;
  box.height = this.height;
  box.x = this.x;
  box.y = this.y;
  box.marginLeft = this.marginLeft;
  box.marginRight = this.marginRight;
  box.marginTop = this.marginTop;
  box.marginBottom = this.marginBottom;
  box.sameBorder = this.sameBorder;
  box.roundedCorners = this.roundedCorners;
  box.borderLeftWidth = this.borderLeftWidth;
  box.borderRightWidth = this.borderRightWidth;
  box.borderTopWidth = this.borderTopWidth;
  box.borderBottomWidth = this.borderBottomWidth;
  box.borderLeftStyle = this.borderLeftStyle;
  box.borderRightStyle = this.borderRightStyle;
  box.borderTopStyle = this.borderTopStyle;
  box.borderBottomStyle = this.borderBottomStyle;
  box.borderLeftColor = this.borderLeftColor;
  box.borderRightColor = this.borderRightColor;
  box.borderTopColor = this.borderTopColor;
  box.borderBottomColor = this.borderBottomColor;
  box.borderTopLeftRadius = this.borderTopLeftRadius;
  box.borderTopRightRadius = this.borderTopRightRadius;
  box.borderBottomRightRadius = this.borderBottomRightRadius;
  box.borderBottomLeftRadius = this.borderBottomLeftRadius;
  box.borderTopLeftCut = this.borderTopLeftCut;
  box.borderTopRightCut = this.borderTopRightCut;
  box.borderBottomLeftCut = this.borderBottomLeftCut;
  box.borderBottomRightCut = this.borderBottomRightCut;
  box.borderCornerLength = this.borderCornerLength;
  box.paddingLeft = this.paddingLeft;
  box.paddingRight = this.paddingRight;
  box.paddingTop = this.paddingTop;
  box.paddingBottom = this.paddingBottom;
  box.backdropColor = this.backdropColor;
  box.backgroundColor = this.backgroundColor;
  box.color = this.color;
  box.fontFamily = this.fontFamily;
  box.fontSize = this.fontSize;
  box.fontStyle = this.fontStyle;
  box.fontWeight = this.fontWeight;
  box.scroll = this.scroll;
  box.verticalAlign = this.verticalAlign;
  box.shadowOffset = this.shadowOffset;
  box.shadowBlurRadius = this.shadowBlurRadius;
  box.shadowSpreadRadius = this.shadowSpreadRadius;
  box.shadowColor = this.shadowColor;
  return box;
};
CSSParser.VPL.Box.prototype.offsetLeft = function() {
  return this.marginLeft + this.borderLeftWidth + this.paddingLeft;
};
CSSParser.VPL.Box.prototype.nonContentWidth = function() {
  return this.marginLeft + this.borderLeftWidth + this.paddingLeft + this.paddingRight + this.borderRightWidth + this.marginRight;
};
CSSParser.VPL.Box.prototype.offsetTop = function() {
  return this.marginTop + this.borderTopWidth + this.paddingTop;
};
CSSParser.VPL.Box.prototype.nonContentHeight = function() {
  return this.marginTop + this.borderTopWidth + this.paddingTop + this.paddingBottom + this.borderBottomWidth + this.marginBottom;
};
CSSParser.VPL.Box.prototype.paddingWidth = function() {
  return this.paddingLeft + this.paddingRight;
};
CSSParser.VPL.Box.prototype.paddedWidth = function() {
  return this.width + this.paddingLeft + this.paddingRight;
};
CSSParser.VPL.Box.prototype.paddingHeight = function() {
  return this.paddingTop + this.paddingBottom;
};
CSSParser.VPL.Box.prototype.paddedHeight = function() {
  return this.height + this.paddingTop + this.paddingBottom;
};
CSSParser.VPL.Box.prototype.cssFontString = function() {
  return (this.fontStyle ? this.fontStyle + " " : "") + (this.fontWeight ? this.fontWeight + " " : "") + this.fontSize.toFixed(1) + "px " + this.fontFamily;
};
CSSParser.VPL.Line = function(props, lengthBase) {
  this.margin = 0;
  this.width = null;
  this.style = null;
  this.cap = null;
  this.color = "black";
  this.shadowOffset = null;
  this.shadowBlurRadius = 0;
  this.shadowSpreadRadius = 0;
  this.shadowColor = null;
  this.otherProperties = {};
  if (props) {
    this.setProperties(props.properties, lengthBase);
  }
  if (this.width === null) {
    this.width = this.style !== null && this.style !== "none" ? 1 : 0;
  }
  if (this.style === null) {
    this.style = this.width > 0 ? "solid" : "none";
  }
  if (this.cap === null) {
    this.cap = "butt";
  }
};
CSSParser.VPL.Line.prototype = Object.create(CSSParser.VPL.Properties.prototype);
CSSParser.VPL.Line.prototype.constructor = CSSParser.VPL.Line;
CSSParser.VPL.Line.prototype.setProperties = function(props, lengthBase) {
  for (var key in props) {
    switch(key) {
      case "margin":
        this.margin = props[key].toValue(lengthBase);
        break;
      case "line-width":
        this.width = props[key].toValue(lengthBase);
        break;
      case "line-style":
        this.style = props[key];
        break;
      case "line-cap":
        this.cap = props[key];
        break;
      case "color":
        this.color = props[key];
        break;
      case "line":
        if (props[key].color !== null) {
          this.color = props[key].color;
        }
        if (props[key].style !== null) {
          this.style = props[key].style;
        }
        if (props[key].width !== null) {
          this.width = props[key].width.toValue(lengthBase);
        }
        break;
      case "line-shadow":
        if (props[key].shadowOffset !== null) {
          this.shadowOffset = props[key].offset.map(function(l) {
            return l ? l.toValue(lengthBase) : 0;
          });
          this.shadowBlurRadius = props[key].blurRadius ? props[key].blurRadius.toValue(lengthBase) : 0;
          this.shadowSpreadRadius = props[key].spreadRadius ? props[key].spreadRadius.toValue(lengthBase) : 0;
          this.shadowColor = props[key].color;
        }
        break;
      default:
        if (props.hasOwnProperty(key)) {
          this.otherProperties[key] = props[key];
        }
        break;
    }
  }
};
CSSParser.VPL.Line.prototype.copy = function() {
  var line = new CSSParser.VPL.Line;
  line.margin = this.margin;
  line.width = this.width;
  line.style = this.style;
  line.cap = this.cap;
  line.color = this.color;
  line.shadowOffset = this.shadowOffset;
  line.shadowBlurRadius = this.shadowBlurRadius;
  line.shadowSpreadRadius = this.shadowSpreadRadius;
  line.shadowColor = this.shadowColor;
  return line;
};
CSSParser.VPL.debug = false;
CSSParser.VPL.Box.setLineStyle = function(ctx, lineWidth, color, style) {
  ctx.strokeStyle = color || "black";
  switch(style) {
    case "dotted":
      ctx.setLineDash([2 * lineWidth, 3 * lineWidth]);
      ctx.lineDashOffset = 0;
      break;
    case "dashed":
      ctx.setLineDash([3 * lineWidth, 3 * lineWidth]);
      ctx.lineDashOffset = 0;
      break;
  }
  ctx.lineWidth = lineWidth || 0;
};
CSSParser.VPL.Box.prototype.drawAt = function(ctx, x, y, includePadding) {
  if (!includePadding) {
    x -= this.paddingLeft;
    y -= this.paddingTop;
  }
  var self = this;
  var w = this.width + this.paddingLeft + this.paddingRight;
  var h = this.height + this.paddingTop + this.paddingBottom;
  if (CSSParser.VPL.debug) {
    ctx.save();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeRect(x + this.paddingLeft, y + this.paddingTop, this.width, this.height);
    ctx.strokeRect(x - this.marginLeft, y - this.marginTop, w + this.marginLeft + this.marginRight, h + this.marginTop + this.marginBottom);
    ctx.restore();
  }
  function rrect() {
    var rx = Math.min(self.borderTopLeftRadius[0], w / 2);
    var ry = Math.min(self.borderTopLeftRadius[1], h / 2);
    ctx.moveTo(x, y + ry);
    if (self.borderTopLeftCut) {
      ctx.lineTo(x + rx, y);
    } else {
      ctx.bezierCurveTo(x, y + ry / 2, x + rx / 2, y, x + rx, y);
    }
    rx = Math.min(self.borderTopRightRadius[0], w / 2);
    ry = Math.min(self.borderTopRightRadius[1], h / 2);
    ctx.lineTo(x + w - rx, y);
    if (self.borderTopRightCut) {
      ctx.lineTo(x + w, y + ry);
    } else {
      ctx.bezierCurveTo(x + w - rx / 2, y, x + w, y + ry / 2, x + w, y + ry);
    }
    rx = Math.min(self.borderBottomRightRadius[0], w / 2);
    ry = Math.min(self.borderBottomRightRadius[1], h / 2);
    ctx.lineTo(x + w, y + h - ry);
    if (self.borderBottomRightCut) {
      ctx.lineTo(x + w - rx, y + h);
    } else {
      ctx.bezierCurveTo(x + w, y + h - ry / 2, x + w - rx / 2, y + h, x + w - rx, y + h);
    }
    rx = Math.min(self.borderBottomLeftRadius[0], w / 2);
    ry = Math.min(self.borderBottomLeftRadius[1], h / 2);
    ctx.lineTo(x + rx, y + h);
    if (self.borderBottomLeftCut) {
      ctx.lineTo(x, y + h - ry);
    } else {
      ctx.bezierCurveTo(x + rx / 2, y + h, x, y + h - ry / 2, x, y + h - ry);
    }
    ctx.closePath();
  }
  ctx.save();
  if (this.borderCornerLength > 0) {
    ctx.beginPath();
    ctx.rect(x - this.borderCornerLength, y - this.borderCornerLength, 2 * this.borderCornerLength, 2 * this.borderCornerLength);
    ctx.rect(x + w - this.borderCornerLength, y - this.borderCornerLength, 2 * this.borderCornerLength, 2 * this.borderCornerLength);
    ctx.rect(x - this.borderCornerLength, y + h - this.borderCornerLength, 2 * this.borderCornerLength, 2 * this.borderCornerLength);
    ctx.rect(x + w - this.borderCornerLength, y + h - this.borderCornerLength, 2 * this.borderCornerLength, 2 * this.borderCornerLength);
    ctx.clip();
  }
  if (this.backdropColor !== "transparent") {
    ctx.fillStyle = this.backdropColor;
    ctx.fillRect(x, y, w, h);
  }
  ctx.beginPath();
  if (this.roundedCorners) {
    ctx.beginPath();
    rrect();
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.save();
  if (this.shadowOffset) {
    ctx.shadowOffsetX = this.shadowOffset[0];
    ctx.shadowOffsetY = this.shadowOffset[1];
    ctx.shadowColor = this.shadowColor;
    ctx.shadowBlur = this.shadowBlurRadius;
  }
  if (this.backgroundColor) {
    ctx.fillStyle = this.backgroundColor;
  } else {
    if (this.shadowOffset) {
      ctx.fillStyle = "transparent";
    }
  }
  ctx.fill();
  ctx.restore();
  if (this.sameBorder) {
    if (this.borderLeftWidth > 0 && this.borderLeftColor && this.borderLeftStyle !== "none" && this.borderLeftStyle !== "hidden") {
      CSSParser.VPL.Box.setLineStyle(ctx, this.borderLeftWidth, this.borderLeftColor, this.borderLeftStyle);
      if (this.borderLeftStyle === "double") {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale((w - 3 * this.borderLeftWidth) / w, (h - 3 * this.borderLeftWidth) / h);
        ctx.translate(-x - w / 2, -y - h / 2);
        rrect();
        ctx.restore();
      }
      ctx.stroke();
    }
  } else {
    if (this.borderLeftWidth > 0 && this.borderLeftColor && this.borderLeftStyle !== "none" && this.borderLeftStyle !== "hidden") {
      CSSParser.VPL.Box.setLineStyle(ctx, this.borderLeftWidth, this.borderLeftColor, this.borderLeftStyle);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + h);
      ctx.stroke();
    }
    if (this.borderRightWidth > 0 && this.borderRightColor && this.borderRightStyle !== "none" && this.borderRightStyle !== "hidden") {
      CSSParser.VPL.Box.setLineStyle(ctx, this.borderRightWidth, this.borderRightColor, this.borderRightStyle);
      ctx.beginPath();
      ctx.moveTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.stroke();
    }
    if (this.borderTopWidth > 0 && this.borderTopColor && this.borderTopStyle !== "none" && this.borderTopStyle !== "hidden") {
      CSSParser.VPL.Box.setLineStyle(ctx, this.borderTopWidth, this.borderTopColor, this.borderTopStyle);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.stroke();
    }
    if (this.borderBottomWidth > 0 && this.borderBottomColor && this.borderBottomStyle !== "none" && this.borderBottomStyle !== "hidden") {
      CSSParser.VPL.Box.setLineStyle(ctx, this.borderBottomWidth, this.borderBottomColor, this.borderBottomStyle);
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.stroke();
    }
  }
  ctx.restore();
  if (CSSParser.VPL.debug && this.otherProperties["-vpl-debug"]) {
    ctx.save();
    ctx.font = "9px sans-serif";
    ctx.textAlign = "start";
    ctx.textBaseline = "top";
    ctx.fillStyle = "black";
    ctx.fillText(this.otherProperties["-vpl-debug"], x, y);
    ctx.restore();
  }
};
CSSParser.VPL.Box.prototype.draw = function(ctx) {
  this.drawAt(ctx, this.x, this.y);
};
CSSParser.VPL.Line.prototype.stroke = function(ctx) {
  ctx.save();
  if (this.shadowOffset) {
    ctx.shadowOffsetX = this.shadowOffset[0];
    ctx.shadowOffsetY = this.shadowOffset[1];
    ctx.shadowColor = this.shadowColor;
    ctx.shadowBlur = this.shadowBlurRadius;
  }
  if (this.width > 0 && this.color && this.style !== "none" && this.style !== "hidden") {
    CSSParser.VPL.Box.setLineStyle(ctx, this.width, this.color, this.style);
    ctx.lineCap = this.cap;
    ctx.stroke();
  }
  ctx.restore();
};
A3a.vpl.CanvasItem = function(data, width, height, x, y, draw, interactiveCB, doDrop, canDrop, id) {
  this.data = data;
  this.width = width;
  this.height = height;
  this.x = x;
  this.y = y;
  this.clippingRect = null;
  this.attachedItems = [];
  this.drawContent = draw;
  this.drawOverlay = null;
  this.clickable = true;
  this.draggable = true;
  this.makeDraggedItem = null;
  this.interactiveCB = interactiveCB || null;
  this.doDrop = doDrop || null;
  this.canDrop = canDrop || null;
  this.noDropHint = false;
  this.dropTarget = false;
  this.doScroll = null;
  this.doOver = null;
  this.id = id || "";
  this.zoomOnLongPress = null;
  this.zoomOnLongTouchPress = null;
  this.onUpdate = null;
  this.dragging = null;
};
A3a.vpl.CanvasItem.prototype.attachItem = function(item) {
  this.attachedItems.push(item);
};
A3a.vpl.CanvasItem.prototype.clone = function() {
  var c = new A3a.vpl.CanvasItem(this.data, this.width, this.height, this.x, this.y, this.drawContent, this.interactiveCB, this.doDrop, this.canDrop, this.id);
  c.drawOverlay = this.drawOverlay;
  return c;
};
A3a.vpl.CanvasItem.prototype.draw = function(canvas, dx, dy, overlay, isZoomed) {
  var ctx = canvas.ctx;
  var clipped = this.clippingRect && dx === undefined;
  if (clipped) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.clippingRect.x, this.clippingRect.y, this.clippingRect.w, this.clippingRect.h);
    ctx.clip();
    dx = this.clippingRect.xOffset;
    dy = this.clippingRect.yOffset;
  }
  if (overlay) {
    this.drawOverlay && this.drawOverlay(canvas, this, dx || 0, dy || 0, isZoomed);
  } else {
    this.drawContent && this.drawContent(canvas, this, dx || 0, dy || 0, isZoomed);
  }
  if (clipped) {
    ctx.restore();
  }
};
A3a.vpl.CanvasItem.prototype.applyClipping = function(ctx) {
  if (this.clippingRect) {
    ctx.beginPath();
    ctx.rect(this.clippingRect.x, this.clippingRect.y, this.clippingRect.w, this.clippingRect.h);
    ctx.clip();
  }
};
A3a.vpl.CanvasItem.prototype.toDataURL = function(dims, scale, mimetype) {
  var canvasEl = document.createElement("canvas");
  scale = scale || 1;
  canvasEl.width = scale * this.width;
  canvasEl.height = scale * this.height;
  var canvas = new A3a.vpl.Canvas(canvasEl, {pixelRatio:scale});
  canvas.dims = dims;
  this.draw(canvas);
  this.draw(canvas, 0, 0, true);
  return canvasEl.toDataURL(mimetype || "image/png");
};
A3a.vpl.CanvasItem.draw;
A3a.vpl.CanvasItem.makeDraggedItem;
A3a.vpl.CanvasItem.mouseEvent;
A3a.vpl.CanvasItem.mousedown;
A3a.vpl.CanvasItem.mousedrag;
A3a.vpl.CanvasItem.mouseup;
A3a.vpl.CanvasItem.doDrop;
A3a.vpl.CanvasItem.canDrop;
A3a.vpl.CanvasItem.doScroll;
A3a.vpl.CanvasItem.doOver;
A3a.vpl.CanvasItem.endDrag;
A3a.vpl.CanvasItem.prototype.getTranslation = function() {
  return this.clippingRect ? {dx:this.clippingRect.xOffset, dy:this.clippingRect.yOffset} : {dx:0, dy:0};
};
A3a.vpl.CanvasItem.prototype.isInClip = function(x, y) {
  return !this.clippingRect || x >= this.clippingRect.x && x < this.clippingRect.x + this.clippingRect.w && y >= this.clippingRect.y && y < this.clippingRect.y + this.clippingRect.h;
};
A3a.vpl.Canvas = function(canvas, options) {
  var backingScale = options && options.pixelRatio || ("devicePixelRatio" in window ? window["devicePixelRatio"] : 1);
  this.canvas = canvas;
  this.canvasWidth = canvas.width / backingScale;
  this.canvasHeight = canvas.height / backingScale;
  this.relativeArea = options && options.relativeArea || {xmin:0, xmax:1, ymin:0, ymax:1};
  this.width = this.canvasWidth * (this.relativeArea.xmax - this.relativeArea.xmin);
  this.height = this.canvasHeight * (this.relativeArea.ymax - this.relativeArea.ymin);
  this.visible = true;
  this.preMousedown = [];
  this.clickNoDragTolerance = 10;
  this.transform0 = null;
  this.transform = null;
  this.ctx = this.canvas.getContext("2d");
  this.state = null;
  this.defaultDoOver = null;
  this.prepareDrag = options && options.prepareDrag || null;
  this.defaultDoDrop = [];
  this.defaultEndDrag = null;
  this.clickTimestamp = 0;
  this.zoomedItemIndex = -1;
  this.zoomedItemProxy = null;
  this.downControl = {};
  this.clientData = {};
  this.css = options && options.css || new CSSParser.VPL;
  this.dims = null;
  this.resize(this.width, this.height, options && options.pixelRatio);
  this.widgets = {};
  var self = this;
  function mousedown(downEvent) {
    if (!self.visible) {
      return;
    }
    var mouseEvent = self.makeMouseEvent(downEvent, backingScale);
    for (var i = 0; i < self.preMousedown.length; i++) {
      if (!self.preMousedown[i](downEvent, mouseEvent)) {
        return;
      }
    }
    function startInteraction(item) {
      var canvasBndRect = self.canvas.getBoundingClientRect();
      var d = item.getTranslation();
      item.dragging = item.interactiveCB.mousedown ? item.interactiveCB.mousedown(self, item.data, item.width, item.height, canvasBndRect.left + item.x + d.dx, canvasBndRect.top + item.y + d.dy, mouseEvent) : 0;
      if (item.dragging !== null) {
        item.interactiveCB.mousedrag && item.interactiveCB.mousedrag(self, item.data, item.dragging, item.width, item.height, canvasBndRect.left + item.x + d.dx, canvasBndRect.top + item.y + d.dy, mouseEvent);
        self.onUpdate && self.onUpdate();
        self.onDraw ? self.onDraw() : self.redraw();
        A3a.vpl.dragFun = item.interactiveCB.mousedrag || item.interactiveCB.mouseup ? function(e, isUp, isTouch) {
          if (!isUp) {
            if (item.interactiveCB.mousedrag) {
              item.interactiveCB.mousedrag(self, item.data, item.dragging, item.width, item.height, canvasBndRect.left + item.x + d.dx, canvasBndRect.top + item.y + d.dy, self.makeMouseEvent(e, backingScale));
              self.onUpdate && self.onUpdate();
              self.onDraw ? self.onDraw() : self.redraw();
            }
          } else {
            if (item.interactiveCB.mouseup) {
              if (item.interactiveCB.mouseup) {
                item.interactiveCB.mouseup(self, item.data, item.dragging, item.width, item.height, canvasBndRect.left + item.x + d.dx, canvasBndRect.top + item.y + d.dy, self.makeMouseEvent(e, backingScale));
                self.onUpdate && self.onUpdate();
                self.onDraw ? self.onDraw() : self.redraw();
              }
            }
          }
        } : null;
        self.onUpdate && self.onUpdate();
        self.onDraw ? self.onDraw() : self.redraw();
        return !item.draggable || item.interactiveCB != null && item.interactiveCB.mousedrag != null;
      }
      return false;
    }
    if (self.isZoomedItemProxyClicked(mouseEvent)) {
      var item = self.zoomedItemProxy;
      if (item.interactiveCB) {
        startInteraction(item);
      }
      return;
    } else {
      if (self.zoomedItemProxy) {
        self.zoomedItemIndex = -1;
        self.zoomedItemProxy = null;
        self.onUpdate && self.onUpdate();
        self.onDraw ? self.onDraw() : self.redraw();
        return;
      }
    }
    var indices = self.clickedItemIndex(mouseEvent, true);
    if (indices.length > 0) {
      var item = self.items[indices[0]];
      if (self.zoomedItemIndex >= 0 && self.zoomedItemIndex !== indices[0]) {
        self.zoomedItemIndex = -1;
        self.zoomedItemProxy = null;
      }
      self.clickTimestamp = Date.now();
      if (item.interactiveCB) {
        if ((downEvent instanceof MouseEvent ? item.zoomOnLongPress : item.zoomOnLongTouchPress) && self.zoomedItemIndex !== indices[0]) {
        } else {
          if (startInteraction(item)) {
            return;
          }
        }
      }
      if (item.draggable) {
        var draggedItem = item.makeDraggedItem ? item.makeDraggedItem(item) : item;
        var dropTargetItem = null;
        var d = draggedItem.getTranslation();
        var x0 = mouseEvent.x - d.dx;
        var y0 = mouseEvent.y - d.dy;
        var dragFunForNoItemDrag = A3a.vpl.dragFun;
        A3a.vpl.dragFun = function(dragEvent, isUp, isTouch) {
          var mouseEvent = self.makeMouseEvent(dragEvent, backingScale);
          if (self.prepareDrag) {
            self.prepareDrag(isUp ? null : item);
          }
          if (isUp) {
            if ((isTouch ? item.zoomOnLongTouchPress : item.zoomOnLongPress) && Math.abs(mouseEvent.x - d.dx - x0) + Math.abs(mouseEvent.y - d.dy - y0) < self.clickNoDragTolerance) {
              self.zoomedItemIndex = indices[0];
              self.zoomedItemProxy = (isTouch ? item.zoomOnLongTouchPress : item.zoomOnLongPress)(item, isTouch);
            } else {
              if (item.interactiveCB && item.interactiveCB.mouseup && Math.abs(mouseEvent.x - d.dx - x0) + Math.abs(mouseEvent.y - d.dy - y0) < self.clickNoDragTolerance) {
                dragFunForNoItemDrag(dragEvent, isUp, isTouch);
                return;
              } else {
                if (dropTargetItem && dropTargetItem.doDrop && (!dropTargetItem.canDrop || dropTargetItem.canDrop(dropTargetItem, draggedItem))) {
                  dropTargetItem.doDrop(dropTargetItem, draggedItem);
                } else {
                  if (dropTargetItem == null || dropTargetItem.doDrop == null || dropTargetItem.canDrop && !dropTargetItem.canDrop(dropTargetItem, draggedItem)) {
                    var i;
                    for (i = 0; i < self.defaultDoDrop.length; i++) {
                      if (self.defaultDoDrop[i].doDrop(dropTargetItem, draggedItem, mouseEvent.x, mouseEvent.y)) {
                        break;
                      }
                    }
                    if (i >= self.defaultDoDrop.length && self.defaultEndDrag) {
                      self.defaultEndDrag();
                    }
                  } else {
                    if (self.defaultEndDrag) {
                      self.defaultEndDrag();
                    }
                  }
                }
              }
            }
            self.redraw();
            self.canvas.style.cursor = "default";
          } else {
            var targetIndices = self.clickedItemIndex(mouseEvent, false);
            dropTargetItem = null;
            var canDrop = false;
            for (var i = 0; !canDrop && i < targetIndices.length; i++) {
              dropTargetItem = self.items[targetIndices[i]];
              canDrop = dropTargetItem.doDrop && (!dropTargetItem.canDrop || dropTargetItem.canDrop(dropTargetItem, draggedItem));
            }
            if (canDrop && dropTargetItem != null) {
              dropTargetItem.dropTarget = true;
              self.redraw();
              dropTargetItem.dropTarget = false;
            } else {
              self.redraw();
            }
            var ctx = self.ctx;
            if (canDrop && !dropTargetItem.noDropHint) {
              var dropTargetTranslation = dropTargetItem.getTranslation();
              self.overlayRect(dropTargetItem.x + dropTargetTranslation.dx, dropTargetItem.y + dropTargetTranslation.dy, dropTargetItem.width, dropTargetItem.height, ["drop-target"]);
            }
            ctx.save();
            self.clip();
            if (self.transform) {
              ctx.translate(self.width / 2, self.height / 2);
              CanvasRenderingContext2D.prototype.transform.apply(ctx, self.transform);
              ctx.translate(-self.width / 2, -self.height / 2);
            }
            ctx.translate(self.canvasWidth * self.relativeArea.xmin, self.canvasHeight * self.relativeArea.ymin);
            ctx.globalAlpha = 0.5;
            draggedItem.draw(self, mouseEvent.x - x0, mouseEvent.y - y0);
            draggedItem.attachedItems.forEach(function(attachedItem) {
              attachedItem.draw(self, mouseEvent.x - x0, mouseEvent.y - y0);
              attachedItem.draw(self, mouseEvent.x - x0, mouseEvent.y - y0, true);
            });
            draggedItem.draw(self, mouseEvent.x - x0, mouseEvent.y - y0, true);
            ctx.restore();
            self.canvas.style.cursor = canDrop ? "copy" : "default";
          }
        };
      }
    } else {
      if (self.zoomedItemIndex >= 0) {
        self.zoomedItemIndex = -1;
        self.zoomedItemProxy = null;
        self.redraw();
      }
    }
  }
  canvas.addEventListener("mousedown", mousedown, false);
  canvas.addEventListener("touchstart", function(ev) {
    var touches = ev.targetTouches;
    if (touches.length === 1) {
      ev.preventDefault();
      mousedown(touches[0]);
      A3a.vpl.lastTouch = touches[0];
    }
  }, false);
  canvas.addEventListener("wheel", function(wheelEvent) {
    if (!self.visible) {
      return;
    }
    function doScroll(item) {
      if (item.doScroll) {
        wheelEvent.preventDefault();
        var dx = wheelEvent["deltaMode"] === 0 ? wheelEvent["deltaX"] : wheelEvent["deltaMode"] === 1 ? wheelEvent["deltaX"] * 10 : wheelEvent["deltaX"] * 30;
        var dy = wheelEvent["deltaMode"] === 0 ? wheelEvent["deltaY"] : wheelEvent["deltaMode"] === 1 ? wheelEvent["deltaY"] * 10 : wheelEvent["deltaY"] * 30;
        item.doScroll(dx, dy);
      }
    }
    var mouseEvent = self.makeMouseEvent(wheelEvent, backingScale);
    if (self.isZoomedItemProxyClicked(mouseEvent)) {
      self.zoomedItemProxy && doScroll(self.zoomedItemProxy);
    } else {
      if (self.zoomedItemIndex < 0) {
        var indices = self.clickedItemIndex(mouseEvent, true);
        for (var i = 0; i < indices.length; i++) {
          if (self.items[indices[i]].doScroll != null) {
            doScroll(self.items[indices[i]]);
            break;
          }
        }
      }
    }
  }, false);
  canvas.addEventListener("mousemove", function(overEvent) {
    if (!self.visible) {
      return;
    }
    var mouseEvent = self.makeMouseEvent(overEvent, backingScale);
    var indices = self.clickedItemIndex(mouseEvent, true);
    for (var i = 0; i < indices.length; i++) {
      if (self.items[indices[i]].doOver != null) {
        overEvent.preventDefault();
        self.items[indices[i]].doOver();
        return;
      }
    }
    if (self.defaultDoOver) {
      self.defaultDoOver();
    }
  }, false);
  this.items = [];
  this.clipStack = [];
  this.onUpdate = null;
  this.onDraw = null;
};
A3a.vpl.Canvas.prototype.addPreMousedown = function(preMousedown) {
  this.preMousedown.push(preMousedown);
};
A3a.vpl.Canvas.RelativeArea;
A3a.vpl.Canvas.prepareDrag;
A3a.vpl.Canvas.prototype.setRelativeArea = function(relativeArea) {
  this.relativeArea = relativeArea || {xmin:0, xmax:1, ymin:0, ymax:1};
  this.width = this.canvasWidth * (this.relativeArea.xmax - this.relativeArea.xmin);
  this.height = this.canvasHeight * (this.relativeArea.ymax - this.relativeArea.ymin);
};
A3a.vpl.Canvas.defaultDoDrop;
A3a.vpl.Canvas.prototype.addDefaultDoDrop = function(tag, doDrop) {
  for (var i = 0; i < this.defaultDoDrop.length; i++) {
    if (this.defaultDoDrop[i].tag === tag) {
      this.defaultDoDrop[i].doDrop = doDrop;
      return;
    }
  }
  this.defaultDoDrop.push({tag:tag, doDrop:doDrop});
};
A3a.vpl.Canvas.prototype.show = function() {
  this.visible = true;
};
A3a.vpl.Canvas.prototype.hide = function() {
  this.visible = false;
};
A3a.vpl.Canvas.prototype.setFilter = function(filter) {
  this.canvas["style"]["filter"] = filter;
};
A3a.vpl.Canvas.prototype.initTransform = function(transform) {
  this.transform0 = transform && transform.slice();
  this.transform = this.transform0;
};
A3a.vpl.Canvas.prototype.resetTransform = function() {
  this.transform = this.transform0;
};
A3a.vpl.Canvas.prototype.setScale = function(sc) {
  this.transform = (this.transform0 || [1, 0, 0, 1, 0, 0]).map(function(x) {
    return x * sc;
  });
};
A3a.vpl.Canvas.prototype.applyTransform = function(p) {
  var T = this.transform;
  if (T) {
    var w2 = this.width / 2;
    var h2 = this.height / 2;
    T = T.slice(0, 4).concat(T[4] - w2 * T[0] - h2 * T[2] + w2, T[5] - w2 * T[1] - h2 * T[3] + h2);
    return [T[0] * p[0] + T[2] * p[1] + T[4] + this.canvasWidth * this.relativeArea.xmin, T[1] * p[0] + T[3] * p[1] + T[5] + this.canvasHeight * this.relativeArea.ymin];
  } else {
    return [p[0] + this.canvasWidth * this.relativeArea.xmin, p[1] + this.canvasHeight * this.relativeArea.ymin];
  }
};
A3a.vpl.Canvas.prototype.applyInverseTransform = function(p) {
  p = [p[0] - this.canvasWidth * this.relativeArea.xmin, p[1] - this.canvasHeight * this.relativeArea.ymin];
  var T = this.transform;
  if (T) {
    var w2 = this.width / 2;
    var h2 = this.height / 2;
    T = T.slice(0, 4).concat(T[4] - w2 * T[0] - h2 * T[2] + w2, T[5] - w2 * T[1] - h2 * T[3] + h2);
    var det = T[0] * T[3] - T[1] * T[2];
    return [(T[3] * p[0] - T[2] * p[1] + T[2] * T[5] - T[3] * T[4]) / det, (-T[1] * p[0] + T[0] * p[1] + T[1] * T[4] - T[0] * T[5]) / det];
  } else {
    return p;
  }
};
A3a.vpl.Canvas.prototype.makeMouseEvent = function(e, pixelRatio) {
  var mouseEvent = {x:e.clientX, y:e.clientY, modifier:e.altKey};
  var p1 = this.applyInverseTransform([mouseEvent.x, mouseEvent.y]);
  mouseEvent.x = p1[0];
  mouseEvent.y = p1[1];
  return mouseEvent;
};
A3a.vpl.Canvas.prototype.update = function() {
  this.onUpdate && this.onUpdate();
  this.onDraw ? this.onDraw() : this.redraw();
};
A3a.vpl.Canvas.dims;
A3a.vpl.Canvas.calcDims = function(blockSize, controlSize) {
  return {blockSize:blockSize, minInteractiveBlockSize:60, minTouchInteractiveBlockSize:120, eventRightAlign:false, blockLineWidth:Math.max(1, Math.min(3, Math.round(blockSize / 40))), blockFont:Math.round(blockSize / 4).toString(10) + "px sans-serif", controlColor:"navy", controlDownColor:"#37f", controlActiveColor:"#06f", controlSize:controlSize, controlLineWidth:Math.max(1, Math.min(3, controlSize / 30)), controlFont:"bold 15px sans-serif", scrollbarThumbColor:"navy", scrollbarBackgroundColor:"#ccc", 
  scrollbarWidth:5, errorColor:"#e44", warningColor:"#f88", ruleMarks:"#bbb"};
};
A3a.vpl.Canvas.prototype.recalcSize = function(pixelRatio) {
  this.width = this.canvasWidth * (this.relativeArea.xmax - this.relativeArea.xmin);
  this.height = this.canvasHeight * (this.relativeArea.ymax - this.relativeArea.ymin);
  this.ctx = this.canvas.getContext("2d");
  var backingScale = pixelRatio || ("devicePixelRatio" in window ? window["devicePixelRatio"] : 1);
  if (backingScale != 1) {
    this.ctx["resetTransform"]();
    this.ctx.scale(backingScale, backingScale);
  }
  this.css.lengthBase = new CSSParser.LengthBase(this.width, this.width / 100, this.height / 100, this.canvasWidth / 100, this.canvasHeight / 100);
  var blockSize = this.css.getBox({tag:"block"}).width;
  var controlSize = this.css.getBox({tag:"button"}).width;
  this.dims = A3a.vpl.Canvas.calcDims(blockSize, controlSize);
};
A3a.vpl.Canvas.prototype.resize = function(width, height, pixelRatio) {
  var backingScale = pixelRatio || ("devicePixelRatio" in window ? window["devicePixelRatio"] : 1);
  this.canvas.width = width * backingScale;
  this.canvas.height = height * backingScale;
  this.canvas.style.width = width + "px";
  this.canvas.style.height = height + "px";
  this.canvasWidth = width;
  this.canvasHeight = height;
  this.recalcSize(pixelRatio);
};
A3a.vpl.Canvas.ClippingRect;
A3a.vpl.Canvas.prototype.itemIndex = function(data) {
  for (var i = 0; i < this.items.length; i++) {
    if (this.items[i].data === data) {
      return i;
    }
  }
  return -1;
};
A3a.vpl.Canvas.prototype.clickedItemIndex = function(mouseEvent, clickableOnly) {
  var canvasBndRect = this.canvas.getBoundingClientRect();
  var x = mouseEvent.x - canvasBndRect.left;
  var y = mouseEvent.y - canvasBndRect.top;
  var indices = [];
  for (var i = this.items.length - 1; i >= 0; i--) {
    var d = this.items[i].getTranslation();
    if ((!clickableOnly || this.items[i].clickable) && x >= this.items[i].x + d.dx && x <= this.items[i].x + d.dx + this.items[i].width && y >= this.items[i].y + d.dy && y <= this.items[i].y + d.dy + this.items[i].height && this.items[i].isInClip(x, y)) {
      indices.push(i);
    }
  }
  return indices;
};
A3a.vpl.Canvas.prototype.makeZoomedClone = function(item) {
  var c = item.clone();
  var canvasSize = this.getSize();
  var sc = Math.min(canvasSize.width, canvasSize.height) / 1.5 / c.width;
  c.width *= sc;
  c.height *= sc;
  c.x = (canvasSize.width - c.width) / 2;
  c.y = (canvasSize.height - c.height) / 2;
  c.zoomOnLongPress = null;
  c.zoomOnLongTouchPress = null;
  var self = this;
  c.drawContent = function(canvas, item1, dx, dy) {
    var ctx = canvas.ctx;
    ctx.save();
    ctx.translate(item1.x, item1.y);
    ctx.scale(sc, sc);
    ctx.translate(-item1.x, -item1.y);
    item.drawContent(canvas, c, item1.x - c.x, item1.y - c.y, true);
    ctx.restore();
  };
  if (item.drawOverlay) {
    c.drawOverlay = function(canvas, item1, dx, dy, isZoomed) {
      var ctx = canvas.ctx;
      ctx.save();
      ctx.translate(item1.x, item1.y);
      ctx.scale(sc, sc);
      ctx.translate(-item1.x, -item1.y);
      item.drawOverlay(canvas, c, item1.x - c.x, item1.y - c.y, true);
      ctx.restore();
    };
  }
  return c;
};
A3a.vpl.Canvas.prototype.isZoomedItemProxyClicked = function(mouseEvent) {
  if (this.zoomedItemProxy == null) {
    return false;
  }
  var canvasBndRect = this.canvas.getBoundingClientRect();
  var x = mouseEvent.x - canvasBndRect.left;
  var y = mouseEvent.y - canvasBndRect.top;
  return x >= this.zoomedItemProxy.x && x <= this.zoomedItemProxy.x + this.zoomedItemProxy.width && y >= this.zoomedItemProxy.y && y <= this.zoomedItemProxy.y + this.zoomedItemProxy.height;
};
A3a.vpl.Canvas.prototype.getSize = function() {
  return {width:this.width, height:this.height};
};
A3a.vpl.Canvas.prototype.clearItems = function() {
  this.items = [];
};
A3a.vpl.Canvas.prototype.clip = function() {
  this.ctx.beginPath();
  this.ctx.rect(this.canvasWidth * this.relativeArea.xmin, this.canvasHeight * this.relativeArea.ymin, this.canvasWidth * (this.relativeArea.xmax - this.relativeArea.xmin), this.canvasHeight * (this.relativeArea.ymax - this.relativeArea.ymin));
  this.ctx.clip();
};
A3a.vpl.Canvas.prototype.erase = function() {
  this.ctx.clearRect(this.canvasWidth * this.relativeArea.xmin, this.canvasHeight * this.relativeArea.ymin, this.canvasWidth * (this.relativeArea.xmax - this.relativeArea.xmin), this.canvasHeight * (this.relativeArea.ymax - this.relativeArea.ymin));
};
A3a.vpl.Canvas.prototype.beginClip = function(x, y, width, height, xOffset, yOffset) {
  xOffset = xOffset || 0;
  yOffset = yOffset || 0;
  if (this.clipStack.length > 0) {
    var c0 = this.clipStack[this.clipStack.length - 1];
    if (c0.x > x) {
      width -= c0.x - x;
      x = c0.x;
    }
    if (c0.x + c0.w < x + width) {
      width = c0.x + c0.w - x;
    }
    if (c0.y > y) {
      height -= c0.y - y;
      y = c0.y;
    }
    if (c0.y + c0.h < y + height) {
      height = c0.y + c0.h - y;
    }
    xOffset += c0.xOffset;
    yOffset += c0.yOffset;
  }
  this.clipStack.push({x:x, y:y, w:width, h:height, xOffset:xOffset, yOffset:yOffset});
};
A3a.vpl.Canvas.prototype.endClip = function() {
  this.clipStack.pop();
};
A3a.vpl.Canvas.prototype.setItem = function(item, index) {
  if (this.clipStack.length > 0) {
    item.clippingRect = this.clipStack[this.clipStack.length - 1];
  }
  if (index >= 0) {
    this.items[index] = item;
  } else {
    this.items.push(item);
  }
};
A3a.vpl.Canvas.prototype.addDecoration = function(fun) {
  var item = new A3a.vpl.CanvasItem(null, -1, -1, 0, 0, function(canvas, item, dx, dy) {
    var ctx = canvas.ctx;
    ctx.save();
    ctx.translate(item.x + dx, item.y + dy);
    fun(ctx);
    ctx.restore();
  });
  this.setItem(item);
  return item;
};
A3a.vpl.Canvas.controlDraw;
A3a.vpl.Canvas.controlAction;
A3a.vpl.Canvas.controlCallbacks;
A3a.vpl.Canvas.prototype.addControl = function(x, y, box, draw, cb, id) {
  var downEvent;
  var self = this;
  var item = new A3a.vpl.CanvasItem(null, box.width, box.height, x, y, function(canvas, item, dx, dy) {
    var ctx = canvas.ctx;
    ctx.save();
    box.drawAt(ctx, item.x + dx, item.y + dy);
    ctx.translate(item.x + dx, item.y + dy);
    draw(ctx, box, self.downControl.id === id && self.downControl.isInside || item.dropTarget);
    ctx.restore();
  }, cb && (cb.action || cb.doMouseDown || cb.doMouseUp) ? {mousedown:function(canvas, data, width, height, left, top, ev) {
    self.downControl = {id:id, rect:{x:item.x, y:item.y, w:width, h:height}, isInside:true};
    downEvent = ev;
    if (cb.doMouseDown) {
      cb.doMouseDown(downEvent);
    }
    self.redraw();
    return 0;
  }, mousedrag:function(canvas, data, dragIndex, width, height, left, top, ev) {
    var canvasBndRect = canvas.canvas.getBoundingClientRect();
    var x = ev.x - canvasBndRect.left;
    var y = ev.y - canvasBndRect.top;
    self.downControl.isInside = x >= self.downControl.rect.x && x < self.downControl.rect.x + self.downControl.rect.w && y >= self.downControl.rect.y && y < self.downControl.rect.y + self.downControl.rect.h;
    canvas.redraw();
  }, mouseup:function(canvas, data, dragIndex) {
    if (cb.action) {
      if (self.downControl.isInside) {
        cb.action(downEvent);
      }
    } else {
      if (cb.doMouseUp) {
        cb.doMouseUp(downEvent);
      }
    }
    self.downControl = {};
    self.redraw();
  }} : null, cb && cb.doDrop, cb && cb.canDrop, id);
  item.doOver = cb && cb.doOver || null;
  item.draggable = false;
  item.noDropHint = true;
  this.setItem(item);
  return item;
};
A3a.vpl.Canvas.drawWidget;
A3a.vpl.Canvas.prototype.drawWidget = function(id, x, y, cssBox) {
  cssBox.drawAt(this.ctx, x - cssBox.width / 2, y - cssBox.height / 2);
  var w = this.widgets[id];
  if (w != undefined) {
    this.ctx.save();
    this.ctx.translate(x, y);
    w(this.ctx, id, this.dims, cssBox);
    this.ctx.restore();
  }
};
A3a.vpl.Canvas.prototype.redraw = function() {
  if (!this.visible) {
    return;
  }
  this.erase();
  this.ctx.save();
  if (this.transform) {
    this.ctx.translate(this.width / 2, this.height / 2);
    CanvasRenderingContext2D.prototype.transform.apply(this.ctx, this.transform);
    this.ctx.translate(-this.width / 2, -this.height / 2);
  }
  this.ctx.translate(this.canvasWidth * this.relativeArea.xmin, this.canvasHeight * this.relativeArea.ymin);
  this.items.forEach(function(item) {
    item.draw(this);
  }, this);
  this.items.forEach(function(item) {
    item.draw(this, undefined, undefined, true);
  }, this);
  if (this.zoomedItemProxy) {
    this.ctx.save();
    this.ctx.globalAlpha = 0.5;
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(this.canvasWidth * this.relativeArea.xmin, this.canvasHeight * this.relativeArea.ymin, this.canvasWidth * (this.relativeArea.xmax - this.relativeArea.xmin), this.canvasHeight * (this.relativeArea.ymax - this.relativeArea.ymin));
    this.ctx.restore();
    this.zoomedItemProxy.draw(this);
    this.zoomedItemProxy.draw(this, 0, 0, true);
  }
  this.ctx.restore();
};
A3a.vpl.ScrollArea = function(wTotal, hTotal, x, y, wView, hView) {
  this.wTotal = wTotal;
  this.hTotal = hTotal;
  this.x = x || 0;
  this.y = y || 0;
  this.wView = wView || 0;
  this.hView = hView || 0;
  this.topScrollbar = false;
  this.leftScrollbar = false;
  this.backgroundStyle = "";
  this.horScroll = 0;
  this.x0 = 0;
  this.vertScroll = 0;
  this.y0 = 0;
  this.canvas = null;
};
A3a.vpl.ScrollArea.prototype.setTotalWidth = function(wTotal) {
  this.wTotal = wTotal;
  this.horScroll = Math.max(0, Math.min(this.horScroll, this.wTotal - this.wView));
};
A3a.vpl.ScrollArea.prototype.setTotalHeight = function(hTotal) {
  this.hTotal = hTotal;
  this.vertScroll = Math.max(0, Math.min(this.vertScroll, this.hTotal - this.hView));
};
A3a.vpl.ScrollArea.prototype.resize = function(x, y, wView, hView) {
  this.x = x;
  this.y = y;
  this.wView = wView;
  this.hView = hView;
  this.horScroll = Math.max(0, Math.min(this.horScroll, this.wTotal - this.wView));
  this.vertScroll = Math.max(0, Math.min(this.vertScroll, this.hTotal - this.hView));
};
A3a.vpl.ScrollArea.prototype.begin = function(canvas) {
  this.canvas = canvas;
  var self = this;
  var item = new A3a.vpl.CanvasItem(null, this.wView, this.hView, this.x, this.y, null, this.wTotal > this.wView || this.hTotal > this.hView ? {mousedown:function(canvas, data, width, height, x, y, downEvent) {
    self.x0 = downEvent.x;
    self.y0 = downEvent.y;
    return 0;
  }, mousedrag:function(canvas, data, dragging, width, height, x, y, dragEvent) {
    var deltaX = Math.max(Math.min(dragEvent.x - self.x0, self.horScroll), self.horScroll - self.wTotal + self.wView);
    self.horScroll -= deltaX;
    self.x0 += deltaX;
    var deltaY = Math.max(Math.min(dragEvent.y - self.y0, self.vertScroll), self.vertScroll - self.hTotal + self.hView);
    self.vertScroll -= deltaY;
    self.y0 += deltaY;
  }} : null, null, null);
  item.draggable = false;
  item.doScroll = function(dx, dy) {
    self.scrollCanvas(dx, dy);
    canvas.onUpdate();
  };
  canvas.setItem(item);
  if (this.backgroundStyle) {
    canvas.addDecoration(function(ctx) {
      ctx.save();
      ctx.fillStyle = self.backgroundStyle;
      ctx.fillRect(self.x, self.y, self.wView, self.hView);
      ctx.restore();
    });
  }
  if (this.wTotal > this.wView || this.hTotal > this.hView) {
    canvas.addDecoration(function(ctx) {
      ctx.save();
      if (self.wTotal > self.wView) {
        var scrollbarRelLength = self.wView / self.wTotal;
        var scrollbarAbsLength = Math.max(scrollbarRelLength * self.wView, Math.min(20, self.wView));
        var scrollbarMaxMotion = self.wView - scrollbarAbsLength;
        var scrollbarRelMotion = self.horScroll / (self.wTotal - self.wView);
        var scrollbarMotion = scrollbarRelMotion * scrollbarMaxMotion;
        ctx.fillStyle = canvas.dims.scrollbarBackgroundColor;
        ctx.fillRect(self.x, self.topScrollbar ? self.y - 2 - canvas.dims.scrollbarWidth : self.y + self.hView + 2, self.wView, canvas.dims.scrollbarWidth);
        ctx.fillStyle = canvas.dims.scrollbarThumbColor;
        ctx.fillRect(self.x + scrollbarMotion, self.topScrollbar ? self.y - 2 - canvas.dims.scrollbarWidth : self.y + self.hView + 2, scrollbarAbsLength, canvas.dims.scrollbarWidth);
      }
      if (self.hTotal > self.hView) {
        var scrollbarRelLength = self.hView / self.hTotal;
        var scrollbarAbsLength = Math.max(scrollbarRelLength * self.hView, Math.min(20, self.hView));
        var scrollbarMaxMotion = self.hView - scrollbarAbsLength;
        var scrollbarRelMotion = self.vertScroll / (self.hTotal - self.hView);
        var scrollbarMotion = scrollbarRelMotion * scrollbarMaxMotion;
        ctx.save();
        ctx.fillStyle = canvas.dims.scrollbarBackgroundColor;
        ctx.fillRect(self.leftScrollbar ? self.x - 2 - canvas.dims.scrollbarWidth : self.x + self.wView + 2, self.y, canvas.dims.scrollbarWidth, self.hView);
        ctx.fillStyle = canvas.dims.scrollbarThumbColor;
        ctx.fillRect(self.leftScrollbar ? self.x - 2 - canvas.dims.scrollbarWidth : self.x + self.wView + 2, self.y + scrollbarMotion, canvas.dims.scrollbarWidth, scrollbarAbsLength);
      }
      ctx.restore();
    });
  }
  canvas.beginClip(this.x, this.y, this.wView, this.hView, -this.horScroll, -this.vertScroll);
};
A3a.vpl.ScrollArea.prototype.end = function() {
  this.canvas.endClip();
};
A3a.vpl.ScrollArea.prototype.scrollCanvas = function(dx, dy) {
  this.horScroll += dx;
  this.vertScroll += dy;
};
A3a.vpl.ScrollArea.prototype.scrollToShowHorSpan = function(left, right) {
  if (right - this.horScroll > this.wView) {
    this.horScroll = right - this.wView;
  }
  if (left < this.horScroll) {
    this.horScroll = left;
  }
};
A3a.vpl.ScrollArea.prototype.scrollToShowVertSpan = function(top, bottom) {
  if (bottom - this.vertScroll > this.hView) {
    this.vertScroll = bottom - this.hView;
  }
  if (top < this.vertScroll) {
    this.vertScroll = top;
  }
};
A3a.vpl.ScrollArea.prototype.isLeft = function() {
  return this.horScroll <= this.wView * 0.001;
};
A3a.vpl.ScrollArea.prototype.isRight = function() {
  return this.horScroll >= this.wTotal - this.wView * 1.001;
};
A3a.vpl.ScrollArea.prototype.isTop = function() {
  return this.vertScroll <= this.hView * 0.001;
};
A3a.vpl.ScrollArea.prototype.isBottom = function() {
  return this.vertScroll >= this.hTotal - this.hView * 1.001;
};
A3a.vpl.Canvas.prototype.clearBlockBackground = function(box) {
  this.ctx.save();
  this.ctx.fillStyle = "#ddd";
  this.ctx.fillRect(this.dims.blockLineWidth, this.dims.blockLineWidth, box.width - 2 * this.dims.blockLineWidth, box.height - 2 * this.dims.blockLineWidth);
  this.ctx.restore();
};
A3a.vpl.Canvas.prototype.overlayRect = function(left, top, width, height, overlayRectClasses) {
  var overlayRect = this.css.getBox({tag:"overlay-rectangle", clas:overlayRectClasses || []});
  overlayRect.x = left;
  overlayRect.y = top;
  overlayRect.width = width;
  overlayRect.height = height;
  overlayRect.draw(this.ctx);
};
A3a.vpl.Canvas.prototype.disabledMark = function(left, top, width, height, overlayRectClasses, crossoutLineClasses, noCrossoutLine) {
  this.overlayRect(left, top, width, height, (overlayRectClasses || []).concat("disabled"));
  if (!noCrossoutLine) {
    this.ctx.save();
    var crossoutLine = this.css.getLine({tag:"crossout-line", clas:crossoutLineClasses || []});
    this.ctx.beginPath();
    var angle = this.css.convertAngle(crossoutLine.otherProperties["line-angle"] || "0");
    var overflow = this.css.convertLength(crossoutLine.otherProperties["line-overflow"] || "0").toValue(this.css.lengthBase);
    var dx = 0, dy = 0;
    if (Math.abs(angle % Math.PI) < Math.PI * 0.25 || Math.abs((Math.PI - angle) % Math.PI) < Math.PI * 0.25) {
      dx = (width / 2 + overflow) * Math.sign(Math.cos(angle));
      dy = height / 2 * Math.sin(angle) * Math.sqrt(2);
    } else {
      dy = (height / 2 + overflow) * Math.sign(Math.sin(angle));
      dx = width / 2 * Math.cos(angle) * Math.sqrt(2);
    }
    this.ctx.moveTo(left + width / 2 - dx, top + height / 2 - dy);
    this.ctx.lineTo(left + width / 2 + dx, top + height / 2 + dy);
    crossoutLine.stroke(this.ctx);
    this.ctx.restore();
  }
};
A3a.vpl.Canvas.lock = function(ctx, x, y, r, color, unlocked) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = r;
  ctx.fillRect(x - 2.5 * r, y - r, 5 * r, 4 * r);
  ctx.beginPath();
  ctx.moveTo(x - 1.7 * r, y);
  ctx.lineTo(x - 1.7 * r, y);
  if (unlocked) {
    ctx.arc(x - 3.4 * r, y - 2 * r, 1.7 * r, 0, Math.PI, true);
    ctx.lineTo(x - 5.1 * r, y);
  } else {
    ctx.arc(x, y - 2 * r, 1.7 * r, -Math.PI, 0);
    ctx.lineTo(x + 1.7 * r, y);
  }
  ctx.stroke();
  ctx.restore();
};
A3a.vpl.Canvas.prototype.lockedMark = function(left, top, width, height, inside, color) {
  var r = 0.03 * this.dims.blockSize;
  var x = left + width + (inside ? -5 : 5) * r;
  var y = top + 0.15 * height;
  A3a.vpl.Canvas.lock(this.ctx, x, y, r, color || "#333");
};
A3a.vpl.Canvas.drawArcArrow = function(ctx, x, y, r, a1, a2, opt) {
  ctx.save();
  if (opt) {
    if (opt.style) {
      ctx.strokeStyle = opt.style;
      ctx.fillStyle = opt.style;
    }
    if (opt.lineWidth !== undefined) {
      ctx.lineWidth = opt.lineWidth;
    }
    if (opt.alpha !== undefined) {
      ctx.globalAlpha = opt.alpha;
    }
  }
  var s = opt && opt.arrowSize !== undefined ? opt.arrowSize : 5 * ctx.lineWidth;
  ctx.beginPath();
  var a1b = a1 + (opt && opt.arrowAtStart ? s / r : 0);
  var a2b = a2 - (opt && opt.arrowAtStart ? 0 : s / r);
  ctx.arc(x, y, r, a1b, a2b);
  ctx.stroke();
  if (opt && opt.arrowAtStart) {
    ctx.translate(x + r * Math.cos(a1), y + r * Math.sin(a1));
    ctx.rotate((a1 + a1b) / 2 + Math.PI);
  } else {
    ctx.translate(x + r * Math.cos(a2), y + r * Math.sin(a2));
    ctx.rotate((a2 + a2b) / 2);
  }
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(s / 2, -s * 1.2);
  ctx.lineTo(-s / 2, -s * 1.2);
  ctx.fill();
  ctx.restore();
};
A3a.vpl.Canvas.prototype.text = function(str, opt) {
  var ctx = this.ctx;
  var dims = this.dims;
  ctx.save();
  ctx.fillStyle = opt && opt.fillStyle || "white";
  ctx.font = dims.blockFont;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(0.5 * dims.blockSize + (opt && opt.x || 0), 0.5 * dims.blockSize - (opt && opt.y || 0));
  opt && opt.rot && ctx.rotate(-opt.rot);
  ctx.translate(-0.5 * dims.blockSize, -0.5 * dims.blockSize);
  ctx.fillText(str, 0.5 * dims.blockSize, 0.5 * dims.blockSize);
  ctx.restore();
};
A3a.vpl.Canvas.prototype.robotTop = function(options) {
  var ctx = this.ctx;
  var dims = this.dims;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, this.dims.blockSize, this.dims.blockSize);
  ctx.clip();
  if (options && (options.scale || options.rotation)) {
    if (options.translation) {
      ctx.translate(-options.translation[0], -options.translation[1]);
    }
    ctx.translate(0.5 * dims.blockSize, 0.5 * dims.blockSize);
    if (options.scale) {
      ctx.scale(options.scale, options.scale);
    }
    if (options.rotation) {
      ctx.rotate(-options.rotation);
    }
    ctx.translate(-0.5 * dims.blockSize, -0.5 * dims.blockSize);
  }
  ctx.beginPath();
  ctx.moveTo(dims.blockSize * 0.5, dims.blockSize - dims.blockLineWidth);
  if (!options || options.side !== "left") {
    ctx.lineTo(dims.blockSize - dims.blockLineWidth, dims.blockSize - dims.blockLineWidth);
    ctx.lineTo(dims.blockSize - dims.blockLineWidth, dims.blockSize * 0.25);
    ctx.bezierCurveTo(dims.blockSize * 0.8, dims.blockLineWidth, dims.blockSize * 0.52, dims.blockLineWidth, dims.blockSize * 0.5, dims.blockLineWidth);
  }
  if (!options || options.side !== "right") {
    ctx.lineTo(dims.blockSize * 0.5, dims.blockLineWidth);
    ctx.bezierCurveTo(dims.blockSize * 0.48, dims.blockLineWidth, dims.blockSize * 0.2, dims.blockLineWidth, dims.blockLineWidth, dims.blockSize * 0.25);
    ctx.lineTo(dims.blockLineWidth, dims.blockSize - dims.blockLineWidth);
  }
  ctx.closePath();
  if (options && options.rgb) {
    var rgb = [options.rgb[0], Math.max(0.2 + 0.8 * options.rgb[1], options.rgb[2] / 2), options.rgb[2]];
    var max = Math.max(rgb[0], Math.max(rgb[1], rgb[2]));
    ctx.fillStyle = "rgb(" + rgb.map(function(x) {
      return Math.round(225 * (1 - max) + (30 + 225 * max) * x);
    }).join(",") + ")";
  } else {
    ctx.fillStyle = "white";
  }
  ctx.fill();
  if (options && options.rgb) {
    ctx.strokeStyle = "white";
    ctx.lineWidth = dims.blockLineWidth;
    ctx.stroke();
  }
  if (options && options.withWheels) {
    ctx.fillStyle = "black";
    ctx.fillRect(0, dims.blockSize * 0.6, dims.blockSize * 0.1, dims.blockSize * 0.35);
    ctx.fillRect(dims.blockSize * 0.9, dims.blockSize * 0.6, dims.blockSize * 0.1, dims.blockSize * 0.35);
  }
  ctx.restore();
};
A3a.vpl.draw.diffWheels = function(dleft, dright) {
  var phi = (dright - dleft) / 2;
  var R = dright === dleft ? Infinity : (dright + dleft) / (2 * phi);
  return {phi:phi, R:R, x:Math.abs(R) > 1e3 * Math.abs(dleft + dright) ? 0 : R * (phi < 1e-2 ? phi * phi / 2 : 1 - Math.cos(phi)), y:Math.abs(R) > 1e3 * Math.abs(dleft + dright) ? (dleft + dright) / 2 : R * Math.sin(phi)};
};
A3a.vpl.Canvas.prototype.traces = function(dleft, dright, rw, options) {
  var ctx = this.ctx;
  var dims = this.dims;
  rw *= dims.blockSize;
  var ra = options && options.r || [-1, 0, 1];
  var color = options && options.color || "black";
  var linewidth = options && options.linewidth !== undefined ? options.linewidth : 1;
  function arc(x, y, r, phi) {
    if (r > 0) {
      ctx.arc(x, y, r, 0, -phi, phi > 0);
    } else {
      if (r < 0) {
        ctx.arc(x, y, -r, Math.PI, Math.PI - phi, phi > 0);
      }
    }
  }
  var tr = A3a.vpl.draw.diffWheels(dleft, dright);
  ctx.save();
  ctx.translate(0.5 * dims.blockSize, 0.5 * dims.blockSize);
  ctx.strokeStyle = color;
  ctx.lineWidth = dims.blockLineWidth * linewidth;
  if (Math.abs(tr.R) > 20) {
    ctx.beginPath();
    ra.forEach(function(r) {
      ctx.moveTo(r * rw, 0);
      ctx.lineTo((tr.x + r) * rw, -tr.y * rw);
    });
    ctx.stroke();
  } else {
    ra.forEach(function(r) {
      ctx.beginPath();
      arc(-tr.R * rw, 0, (tr.R + r) * rw, tr.phi);
      ctx.stroke();
    });
  }
  ctx.restore();
  return tr;
};
A3a.vpl.Canvas.prototype.robotTopCheck = function(width, height, left, top, dleft, dright, r, ev) {
  var dims = this.dims;
  dleft *= dims.blockSize;
  dright *= dims.blockSize;
  r *= dims.blockSize;
  var x = ev.x - left - width / 2;
  var y = top + width / 2 - ev.y;
  var tr = A3a.vpl.draw.diffWheels(dleft, dright);
  return (x - tr.x) * (x - tr.x) + (y - tr.y) * (y - tr.y) < r * r;
};
A3a.vpl.Canvas.prototype.robotSide = function(scale) {
  var ctx = this.ctx;
  var dims = this.dims;
  ctx.save();
  if (scale) {
    ctx.translate(0.5 * dims.blockSize, 0.5 * dims.blockSize);
    if (scale) {
      ctx.scale(scale, scale);
    }
    ctx.translate(-0.5 * dims.blockSize, -0.5 * dims.blockSize);
  }
  ctx.fillStyle = "white";
  ctx.fillRect(dims.blockLineWidth, dims.blockSize * 0.45, dims.blockSize - 2 * dims.blockLineWidth, dims.blockSize * 0.35);
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(dims.blockSize * 0.27, dims.blockSize * 0.72, dims.blockSize * 0.20, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(dims.blockSize * 0.27, dims.blockSize * 0.72, dims.blockSize * 0.12, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(dims.blockSize * 0.8, dims.blockSize * 0.8 - dims.blockLineWidth, dims.blockSize * 0.1, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
};
A3a.vpl.Canvas.prototype.tap = function(scale) {
  var ctx = this.ctx;
  var dims = this.dims;
  ctx.save();
  ctx.lineWidth = dims.blockLineWidth;
  ctx.strokeStyle = "white";
  for (var i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc((0.5 - 0.45 * (scale || 1)) * dims.blockSize, 0.48 * dims.blockSize, 0.05 * dims.blockSize * i, Math.PI * 0.9, Math.PI * 1.7);
    ctx.stroke();
  }
  ctx.restore();
};
A3a.vpl.Canvas.prototype.remoteControl = function() {
  var ctx = this.ctx;
  var dims = this.dims;
  ctx.save();
  ctx.fillStyle = "#eee";
  ctx.fillRect(0.1 * dims.blockSize, dims.blockLineWidth, 0.8 * dims.blockSize, dims.blockSize - 2 * dims.blockLineWidth);
  ctx.restore();
};
A3a.vpl.Canvas.prototype.buttons = function(shapes, state, opt) {
  var ctx = this.ctx;
  var dims = this.dims;
  shapes.forEach(function(shape, i) {
    ctx.save();
    ctx.translate(dims.blockSize * (0.5 + shape.x), dims.blockSize * (0.5 - shape.y));
    ctx.rotate(shape.r || 0);
    ctx.fillStyle = shape.fillStyle ? shape.fillStyle : opt && opt.fillColors && state ? opt.fillColors[state[i]] : state && state[i] === true ? "red" : state && state[i] === 1 ? "#f66" : state && state[i] === -1 ? "#333" : "white";
    ctx.strokeStyle = shape.strokeStyle ? shape.strokeStyle : opt && opt.strokeColors && state ? opt.strokeColors[state[i]] : state && (state[i] === 1 || state[i] === true) ? "#700" : state && state[i] < 0 ? "black" : "#aaa";
    ctx.lineWidth = dims.blockLineWidth;
    ctx.lineJoin = "round";
    var sz = shape.size || 1;
    switch(shape.sh) {
      case "r":
        ctx.fillRect(-dims.blockSize * 0.08 * sz, -dims.blockSize * 0.08 * sz, dims.blockSize * 0.16 * sz, dims.blockSize * 0.16 * sz);
        ctx.strokeRect(-dims.blockSize * 0.08 * sz, -dims.blockSize * 0.08 * sz, dims.blockSize * 0.16 * sz, dims.blockSize * 0.16 * sz);
        break;
      case "t":
        ctx.beginPath();
        ctx.moveTo(0, -122e-3 * dims.blockSize * sz);
        ctx.lineTo(106e-3 * dims.blockSize * sz, 62e-3 * dims.blockSize * sz);
        ctx.lineTo(-106e-3 * dims.blockSize * sz, 62e-3 * dims.blockSize * sz);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case "c":
        ctx.beginPath();
        ctx.arc(0, 0, dims.blockSize * 0.112 * sz, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        break;
    }
    if (state && opt && opt.cross !== undefined && opt.cross === state[i]) {
      var s = 0.06;
      ctx.strokeStyle = "white";
      ctx.beginPath();
      ctx.moveTo(-dims.blockSize * s * sz, -dims.blockSize * s * sz);
      ctx.lineTo(dims.blockSize * s * sz, dims.blockSize * s * sz);
      ctx.moveTo(-dims.blockSize * s * sz, dims.blockSize * s * sz);
      ctx.lineTo(dims.blockSize * s * sz, -dims.blockSize * s * sz);
      ctx.stroke();
    }
    ctx.restore();
  });
};
A3a.vpl.Canvas.buttonShape;
A3a.vpl.Canvas.prototype.notesLL = function(notes, left, right, low, high, numHeights, noteSize, linewidth) {
  var ctx = this.ctx;
  var dims = this.dims;
  ctx.save();
  ctx.strokeStyle = "black";
  ctx.lineWidth = dims.blockLineWidth * linewidth;
  var numNotes = notes.length / 2;
  for (var i = 0; i < numNotes; i++) {
    if (notes[2 * i + 1] > 0) {
      ctx.fillStyle = notes[2 * i + 1] === 2 ? "white" : "black";
      ctx.beginPath();
      ctx.arc(dims.blockSize * (left + (right - left) / numNotes * (i + 0.5)), dims.blockSize * (low + (high - low) / numHeights * (notes[2 * i] + 0.5)), dims.blockSize * noteSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
};
A3a.vpl.Canvas.prototype.notes = function(notes) {
  var ctx = this.ctx;
  var dims = this.dims;
  ctx.save();
  ctx.fillStyle = "#eee";
  for (var i = 0; i < 5; i++) {
    ctx.fillRect(dims.blockSize * 0.1, dims.blockSize * (0.1 + 0.16 * i), dims.blockSize * 0.8, dims.blockSize * 0.16 - dims.blockLineWidth);
  }
  this.notesLL(notes, 0.1, 0.9, 0.9, 0.1, 5, 0.14, 1);
  ctx.restore();
};
A3a.vpl.Canvas.prototype.playSDFile = function(fileId) {
  var ctx = this.ctx;
  var dims = this.dims;
  var dx = fileId === null ? -0.15 * dims.blockSize : 0;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(dims.blockSize * 0.4 + dx, dims.blockSize * 0.3);
  ctx.lineTo(dims.blockSize * 0.4 + dx, dims.blockSize * 0.7);
  ctx.lineTo(dims.blockSize * 0.7 + dx, dims.blockSize * 0.7);
  ctx.lineTo(dims.blockSize * 0.7 + dx, dims.blockSize * 0.37);
  ctx.lineTo(dims.blockSize * 0.63 + dx, dims.blockSize * 0.3);
  ctx.closePath();
  ctx.lineWidth = dims.blockLineWidth;
  ctx.strokeStyle = "white";
  ctx.lineJoin = "round";
  ctx.stroke();
  for (var r = 0.15; r < 0.31; r += 0.06) {
    ctx.beginPath();
    ctx.arc(dims.blockSize * 0.65 + dx, dims.blockSize * 0.5, dims.blockSize * r, -0.6, 0.6);
    ctx.stroke();
  }
  if (fileId === null) {
    ctx.beginPath();
    ctx.moveTo(dims.blockSize * 0.12, dims.blockSize * 0.6);
    ctx.lineTo(dims.blockSize * 0.88, dims.blockSize * 0.4);
    ctx.lineWidth = dims.blockLineWidth * 1.5;
    ctx.stroke();
  } else {
    this.text(fileId.toString(10), {x:-0.3 * dims.blockSize});
  }
  ctx.restore();
};
A3a.vpl.Canvas.prototype.microphone = function() {
  var ctx = this.ctx;
  var dims = this.dims;
  ctx.save();
  ctx.beginPath();
  ctx.arc(dims.blockSize * 0.7, dims.blockSize * 0.6, dims.blockSize * 0.15, 0, 2 * Math.PI);
  ctx.fillStyle = "white";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(dims.blockSize * 0.7, dims.blockSize * 0.6);
  ctx.lineTo(dims.blockSize * 0.8, dims.blockSize * 0.95);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 0.13 * dims.blockSize;
  ctx.stroke();
  ctx.lineWidth = 1.5 * dims.blockLineWidth;
  ctx.translate(dims.blockSize * 0.3, dims.blockSize * 0.3);
  ctx.rotate(0.1);
  for (var i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(0.07 * dims.blockSize, 0);
    ctx.lineTo(0.14 * dims.blockSize, 0);
    ctx.moveTo(0.17 * dims.blockSize, 0);
    ctx.lineTo(0.22 * dims.blockSize, 0);
    ctx.stroke();
    ctx.rotate(Math.PI / 4.5);
  }
  ctx.restore();
};
A3a.vpl.Canvas.prototype.accelerometerHandle = function() {
  var ctx = this.ctx;
  var dims = this.dims;
  ctx.beginPath();
  ctx.arc(0, 0, dims.blockSize * 0.4, 0, 2 * Math.PI, true);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -dims.blockSize * 0.4);
  ctx.strokeStyle = "#666";
  ctx.lineWidth = dims.blockLineWidth;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -dims.blockSize * 0.4, dims.blockSize * 0.1, 0, 2 * Math.PI);
  ctx.fillStyle = "white";
  ctx.fill();
  ctx.strokeStyle = "black";
  ctx.stroke();
};
A3a.vpl.Canvas.prototype.robotAccelerometer = function(pitch, angle) {
  var ctx = this.ctx;
  var dims = this.dims;
  var phi = angle * Math.PI / 12;
  ctx.save();
  ctx.translate(dims.blockSize * 0.5, dims.blockSize * 0.5);
  ctx.rotate(phi);
  this.accelerometerHandle();
  ctx.fillRect(-0.28 * dims.blockSize, -0.10 * dims.blockSize, 0.56 * dims.blockSize, 0.20 * dims.blockSize);
  ctx.fillStyle = "black";
  if (pitch) {
    ctx.beginPath();
    ctx.arc(-0.15 * dims.blockSize, 0.03 * dims.blockSize, 0.11 * dims.blockSize, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(-0.15 * dims.blockSize, 0.03 * dims.blockSize, 0.07 * dims.blockSize, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.15 * dims.blockSize, 0.07 * dims.blockSize, 0.06 * dims.blockSize, 0, 2 * Math.PI);
    ctx.fill();
  } else {
    ctx.fillRect(-0.28 * dims.blockSize, 0.10 * dims.blockSize, 0.08 * dims.blockSize, 0.04 * dims.blockSize);
    ctx.fillRect(0.20 * dims.blockSize, 0.10 * dims.blockSize, 0.08 * dims.blockSize, 0.04 * dims.blockSize);
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(0, 0.06 * dims.blockSize, 0.06 * dims.blockSize, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.restore();
};
A3a.vpl.Canvas.prototype.robotYaw = function(angle) {
  var ctx = this.ctx;
  var dims = this.dims;
  var phi = angle * Math.PI / 12;
  ctx.save();
  ctx.translate(dims.blockSize * 0.5, dims.blockSize * 0.5);
  ctx.rotate(phi);
  this.accelerometerHandle();
  ctx.translate(-dims.blockSize / 2, -dims.blockSize / 2);
  this.robotTop({withWheels:true, scale:0.45});
  ctx.restore();
};
A3a.vpl.Canvas.prototype.accelerometerCheck = function(width, height, left, top, ev, tp) {
  var x = ev.x - left - width / 2;
  var y = top + width / 2 - ev.y;
  var r2 = (x * x + y * y) / (width * width / 4);
  return r2 < 1 && r2 > 0.4 && (tp || y >= 0);
};
A3a.vpl.Canvas.prototype.accelerometerDrag = function(width, height, left, top, ev, tp) {
  var x = ev.x - left - width / 2;
  var y = top + width / 2 - ev.y;
  var a = Math.round(Math.atan2(x, y) * 12 / Math.PI);
  return tp ? a === 12 ? -12 : a : Math.max(-6, Math.min(6, a));
};
A3a.vpl.Canvas.drawTimerLogArc = function(ctx, x0, y0, rExt, rIntMax, rIntMin, angle, fillStyle) {
  var d = (rIntMax - rIntMin) / 4;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x0, y0, rExt, -Math.PI / 2, 3 * Math.PI / 2 - 0.05);
  ctx.arc(x0, y0, rIntMax - 4 * d, 3 * Math.PI / 2 - 0.05, Math.PI, true);
  ctx.arc(x0 + d, y0, rIntMax - 3 * d, Math.PI, Math.PI / 2, true);
  ctx.arc(x0 + d, y0 - d, rIntMax - 2 * d, Math.PI / 2, 0, true);
  ctx.arc(x0, y0 - d, rIntMax - d, 0, -Math.PI / 2, true);
  ctx.clip();
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.arc(x0, y0, rExt, -Math.PI / 2, -Math.PI / 2 + angle);
  ctx.lineTo(x0, y0);
  ctx.fill();
  ctx.restore();
};
A3a.vpl.Canvas.prototype.drawInit = function() {
  var ctx = this.ctx;
  var dims = this.dims;
  var r = 0.4 * dims.blockSize;
  ctx.save();
  ctx.fillStyle = "black";
  ctx.strokeStyle = "black";
  ctx.lineWidth = dims.blockLineWidth;
  ctx.beginPath();
  ctx.arc(dims.blockSize * 0.3, dims.blockSize * 0.5, dims.blockSize * 0.08, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(dims.blockSize * 0.42, dims.blockSize * 0.5);
  ctx.lineTo(dims.blockSize * 0.7, dims.blockSize * 0.5);
  ctx.stroke();
  var triSize = r * 0.4;
  ctx.beginPath();
  ctx.moveTo(dims.blockSize * 0.8, dims.blockSize * 0.5);
  ctx.lineTo(dims.blockSize * 0.8 - triSize * Math.sqrt(3) / 2, dims.blockSize * 0.5 + triSize / 2);
  ctx.lineTo(dims.blockSize * 0.8 - triSize * Math.sqrt(3) / 2, dims.blockSize * 0.5 - triSize / 2);
  ctx.fill();
  ctx.restore();
};
A3a.vpl.Canvas.drawTimer = function(ctx, x0, y0, r, lineWidth, drawText, time, isEvent, isLog) {
  var time2 = isLog ? time <= 0 ? 0 : Math.max(Math.log(time * 10) / Math.log(100), 0) : time / 4;
  ctx.save();
  if (!isEvent && drawText) {
    drawText(time);
  }
  ctx.beginPath();
  ctx.arc(x0, y0, r, 0, 2 * Math.PI);
  ctx.fillStyle = "white";
  ctx.fill();
  A3a.vpl.Canvas.drawTimerLogArc(ctx, x0, y0, r * 0.9, isLog ? r * 0.8 : r * 0.6, isLog ? r * 0.5 : r * 0.6, 2 * Math.PI * (isEvent ? 0.2 : time2), isEvent ? "#ddd" : "red");
  ctx.beginPath();
  ctx.arc(x0, y0, r / 2, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x0, y0, r, 0, 2 * Math.PI);
  ctx.strokeStyle = "black";
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x0 - 0.1 * r * Math.sin(2 * time2 * Math.PI), y0 + 0.1 * r * Math.cos(2 * time2 * Math.PI));
  ctx.lineTo(x0 + 0.9 * r * Math.sin(2 * time2 * Math.PI), y0 - 0.9 * r * Math.cos(2 * time2 * Math.PI));
  ctx.lineWidth = 2 * lineWidth;
  ctx.stroke();
  if (isEvent) {
    A3a.vpl.Canvas.drawArcArrow(ctx, x0, y0, r * 1.25, -Math.PI * 0.5, -Math.PI * 0.1, {arrowAtStart:true, arrowSize:5 * lineWidth, style:"black"});
  }
  ctx.restore();
};
A3a.vpl.Canvas.prototype.drawTimer = function(time, isEvent, isLog) {
  var ctx = this.ctx;
  var s = this.dims.blockSize;
  var time2 = isLog ? time === 0 ? 0 : Math.log(time * 10) / Math.log(100) : time / 4;
  var r = 0.4 * s;
  var dx = isEvent ? -0.05 * s : 0.05 * s;
  var dy = isEvent ? 0.07 * s : 0.03 * s;
  var x0 = s / 2 + dx;
  var y0 = s / 2 + dy;
  A3a.vpl.Canvas.drawTimer(ctx, x0, y0, r, this.dims.blockLineWidth, function(t) {
    ctx.textAlign = "start";
    ctx.textBaseline = "top";
    ctx.font = Math.round(s / 6).toString(10) + "px sans-serif";
    ctx.fillStyle = "white";
    ctx.fillText(t.toFixed(t < 1 ? 2 : 1), s / 20, s / 40);
  }, time, isEvent, isLog);
};
A3a.vpl.Canvas.drawClock = function(ctx, xl, xr, y, h, n, opt) {
  ctx.save();
  if (opt) {
    if (opt.style) {
      ctx.strokeStyle = opt.style;
      ctx.fillStyle = opt.style;
    }
    if (opt.lineWidth !== undefined) {
      ctx.lineWidth = opt.lineWidth;
    }
    if (opt.alpha !== undefined) {
      ctx.globalAlpha = opt.alpha;
    }
  }
  ctx.beginPath();
  var d = h / 2;
  ctx.moveTo(xl, y + d);
  for (var i = 0; i < n; i++) {
    var x = xl + (xr - xl) * (0.5 + i) / n;
    ctx.lineTo(x, y + d);
    d = -d;
    ctx.lineTo(x, y + d);
  }
  ctx.lineTo(xr, y + d);
  ctx.stroke();
  ctx.restore();
};
A3a.vpl.Canvas.drawArc = function(ctx, x0, y0, rInner, rOuter, a1, a2, fillStyle, strokeStyle, lineWidth) {
  var rMid = (rInner + rOuter) / 2;
  var rEnd = (rOuter - rInner) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x0, y0, rInner, -a2, -a1);
  ctx.arc(x0 + rMid * Math.cos(a1), y0 - rMid * Math.sin(a1), rEnd, -a1 - Math.PI, -a1, true);
  ctx.arc(x0, y0, rOuter, -a1, -a2, true);
  ctx.arc(x0 + rMid * Math.cos(a2), y0 - rMid * Math.sin(a2), rEnd, -a2, -a2 + Math.PI, true);
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};
A3a.vpl.Canvas.prototype.drawArc = function(a1, a2, val) {
  var dims = this.dims;
  var x0 = dims.blockSize / 2;
  var y0 = dims.blockSize / 2;
  var rInner = dims.blockSize * 0.3;
  var rOuter = dims.blockSize * 0.45;
  A3a.vpl.Canvas.drawArc(this.ctx, x0, y0, rInner, rOuter, a1, a2, val < 0 ? "white" : val === 2 ? "red" : val > 0 ? "#f70" : "#ddd", val === 0 ? "#bbb" : "black", dims.blockLineWidth);
};
A3a.vpl.Canvas.prototype.drawState = function(state) {
  var ctx = this.ctx;
  ctx.save();
  this.drawArc(Math.PI * 0.65, Math.PI * 0.85, state[0]);
  this.drawArc(Math.PI * 0.15, Math.PI * 0.35, state[1]);
  this.drawArc(Math.PI * 1.15, Math.PI * 1.35, state[2]);
  this.drawArc(Math.PI * 1.65, Math.PI * 1.85, state[3]);
  ctx.restore();
};
A3a.vpl.Canvas.prototype.drawStateToggle = function(state) {
  var ctx = this.ctx;
  ctx.save();
  this.drawArc(Math.PI * 0.6, Math.PI * 0.9, state[0]);
  this.drawArc(Math.PI * 0.1, Math.PI * 0.4, state[1]);
  this.drawArc(Math.PI * 1.1, Math.PI * 1.4, state[2]);
  this.drawArc(Math.PI * 1.6, Math.PI * 1.9, state[3]);
  ctx.restore();
};
A3a.vpl.Canvas.prototype.drawState8 = function(state) {
  var ctx = this.ctx;
  ctx.save();
  for (var i = 0; i < 8; i++) {
    this.drawArc(Math.PI * (0.5 - 0.04 - i * 0.25), Math.PI * (0.5 + 0.04 - i * 0.25), i === state ? 1 : -1);
  }
  ctx.restore();
};
A3a.vpl.Canvas.prototype.drawState8Change = function() {
  var ctx = this.ctx;
  ctx.save();
  for (var i = 0; i < 8; i++) {
    this.drawArc(Math.PI * (0.5 - 0.04 - i * 0.25), Math.PI * (0.5 + 0.04 - i * 0.25), 0);
  }
  ctx.restore();
};
A3a.vpl.Canvas.prototype.buttonClick = function(shapes, width, height, left, top, ev) {
  var x = (ev.x - left) / width - 0.5;
  var y = 0.5 - (ev.y - top) / height;
  for (var i = 0; i < shapes.length; i++) {
    var sz = shapes[i].size || 1;
    if (Math.max(Math.abs(x - shapes[i].x), Math.abs(y - shapes[i].y)) < 0.11 * sz) {
      return i;
    }
  }
  return null;
};
A3a.vpl.draw.levelType = {none:0, low:1, high:2};
A3a.vpl.Canvas.prototype.slider = function(val, pos, vert, thumbColor, levelType) {
  var ctx = this.ctx;
  var dims = this.dims;
  ctx.save();
  if (vert) {
    ctx.translate(0.5 * dims.blockSize, 0.5 * dims.blockSize);
    ctx.rotate(-Math.PI / 2);
    ctx.scale(1, -1);
    ctx.translate(-0.5 * dims.blockSize, -0.5 * dims.blockSize);
  }
  function sliderPath(min, max) {
    ctx.beginPath();
    ctx.moveTo(dims.blockSize * (0.1 + 0.8 * min), dims.blockSize * (0.46 - pos));
    ctx.lineTo(dims.blockSize * (0.1 + 0.8 * max), dims.blockSize * (0.46 - pos));
    ctx.arc(dims.blockSize * (0.1 + 0.8 * max), dims.blockSize * (0.5 - pos), dims.blockSize * 0.04, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(dims.blockSize * (0.1 + 0.8 * max), dims.blockSize * (0.54 - pos));
    ctx.lineTo(dims.blockSize * (0.1 + 0.8 * min), dims.blockSize * (0.54 - pos));
    ctx.arc(dims.blockSize * (0.1 + 0.8 * min), dims.blockSize * (0.5 - pos), dims.blockSize * 0.04, Math.PI / 2, -Math.PI / 2);
  }
  ctx.lineWidth = dims.blockLineWidth;
  ctx.fillStyle = "white";
  ctx.strokeStyle = "black";
  sliderPath(0, 1);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = thumbColor;
  switch(levelType || A3a.vpl.draw.levelType.none) {
    case A3a.vpl.draw.levelType.low:
      sliderPath(0, val);
      ctx.fill();
      ctx.stroke();
      break;
    case A3a.vpl.draw.levelType.high:
      sliderPath(val, 1);
      ctx.fill();
      ctx.stroke();
      break;
  }
  ctx.fillStyle = thumbColor;
  ctx.strokeStyle = "black";
  ctx.lineWidth = dims.blockLineWidth;
  ctx.beginPath();
  ctx.arc(dims.blockSize * (0.1 + 0.8 * val), dims.blockSize * (0.5 - pos), dims.blockSize * 0.1, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};
A3a.vpl.Canvas.prototype.sliderCheck = function(pos, vert, width, height, left, top, ev) {
  var x = (ev.x - left) / width - 0.5;
  var y = 0.5 - (ev.y - top) / height;
  return Math.abs((vert ? x : y) - pos) < 0.1;
};
A3a.vpl.Canvas.prototype.sliderDrag = function(vert, width, height, left, top, ev) {
  var x = (ev.x - left) / width - 0.5;
  var y = 0.5 - (ev.y - top) / height;
  return 0.5 + (vert ? y : x) / 0.8;
};
A3a.vpl.Canvas.prototype.noteClickLL = function(scoreLeft, scoreRight, scoreBottom, scoreTop, numNotes, numHeights, width, height, left, top, ev) {
  var x = Math.floor(((ev.x - left) / width - scoreLeft) / ((scoreRight - scoreLeft) / numNotes));
  var y = Math.floor((scoreBottom - (ev.y - top) / height) / ((scoreBottom - scoreTop) / numHeights));
  return x >= 0 && x < numNotes && y >= 0 && y < numHeights ? {index:x, tone:y} : null;
};
A3a.vpl.Canvas.prototype.noteClick = function(width, height, left, top, ev) {
  return this.noteClickLL(0.1, 0.9, 0.9, 0.1, 6, 5, width, height, left, top, ev);
};
A3a.vpl.Canvas.prototype.timerCheck = function(width, height, left, top, ev) {
  var r = 0.4 * width;
  var x = ev.x - left - 0.55 * width;
  var y = top + 0.53 * height - ev.y;
  return x * x + y * y <= r * r;
};
A3a.vpl.Canvas.prototype.timerDrag = function(width, height, left, top, isLog, ev) {
  var x = ev.x - left - 0.55 * width;
  var y = top + 0.53 * height - ev.y;
  var time2 = (Math.PI - Math.atan2(x, -y)) / (2 * Math.PI);
  return isLog ? Math.exp(time2 * Math.log(100)) / 10 : 4 * time2;
};
A3a.vpl.Canvas.prototype.stateClick = function(width, height, left, top, ev) {
  var x0 = width / 2;
  var y0 = height / 2;
  var r = width * 0.375;
  var thickness2 = width * 0.15;
  var x = ev.x - left - x0;
  var y = y0 - (ev.y - top);
  if (Math.abs(Math.sqrt(x * x + y * y) - r) <= thickness2) {
    return y >= 0 ? x < 0 ? 0 : 1 : x < 0 ? 2 : 3;
  } else {
    return null;
  }
};
A3a.vpl.Canvas.prototype.state8Click = function(width, height, left, top, ev) {
  var x0 = width / 2;
  var y0 = height / 2;
  var r = width * 0.375;
  var thickness2 = width * 0.15;
  var x = ev.x - left - x0;
  var y = y0 - (ev.y - top);
  if (Math.abs(Math.sqrt(x * x + y * y) - r) <= thickness2) {
    var th = Math.atan2(x, y) + Math.PI / 8;
    return Math.floor((th < 0 ? th + 2 * Math.PI : th) / (Math.PI / 4));
  } else {
    return null;
  }
};
A3a.vpl.Canvas.drawHexagonalNut = function(ctx, x0, y0, r) {
  if (r > 0) {
    ctx.beginPath();
    ctx.moveTo(x0 + r * Math.cos(0.1), y0 + r * Math.sin(0.2));
    for (var i = 1; i < 6; i++) {
      ctx.lineTo(x0 + r * Math.cos(i * Math.PI / 3 + 0.2), y0 + r * Math.sin(i * Math.PI / 3 + 0.2));
    }
    ctx.closePath();
    ctx.arc(x0, y0, r * 0.5, 0, 2 * Math.PI, true);
    ctx.fill();
  }
};
A3a.vpl.BlockTemplate.findByName = function(name) {
  for (var i = 0; i < A3a.vpl.BlockTemplate.lib.length; i++) {
    if (A3a.vpl.BlockTemplate.lib[i].name === name) {
      return A3a.vpl.BlockTemplate.lib[i];
    }
  }
  return null;
};
A3a.vpl.BlockTemplate.filterBlocks = function(a) {
  var af = [];
  a.forEach(function(name) {
    if (A3a.vpl.BlockTemplate.findByName(name)) {
      af.push(name);
    }
  });
  return af;
};
A3a.vpl.BlockTemplate.getBlocksByMode = function(mode) {
  var a = [];
  (A3a.vpl.BlockTemplate.lib || []).forEach(function(b) {
    if (b.type !== A3a.vpl.blockType.hidden && b.modes.indexOf(mode) >= 0) {
      a.push(b);
    }
  });
  return a;
};
A3a.vpl.BlockTemplate.buttonToAccessibilityControl = function(shape, onSelect, onUp, onDown) {
  var sz = (shape.size || 1) * 0.1;
  return new A3a.vpl.BlockParamAccessibility.Control(0.5 - shape.y - sz, 0.5 + shape.x - sz, 0.5 - shape.y + sz, 0.5 + shape.x + sz, onSelect, onUp, onDown);
};
A3a.vpl.BlockTemplate.nextCheckboxState = function(currentValue, valueSet) {
  var currentIndex = valueSet.indexOf(currentValue);
  return valueSet[(currentIndex + 1) % valueSet.length];
};
A3a.vpl.BlockTemplate.checkboxesToAccessibilityControls = function(shapes, valueSet) {
  return shapes.map(function(shape, i) {
    return A3a.vpl.BlockTemplate.buttonToAccessibilityControl(shape, function(block) {
      block.param[i] = A3a.vpl.BlockTemplate.nextCheckboxState(block.param[i], valueSet);
    }, null, null);
  });
};
A3a.vpl.BlockTemplate.radiobuttonsToAccessibilityControls = function(shapes) {
  return shapes.map(function(shape, i) {
    return A3a.vpl.BlockTemplate.buttonToAccessibilityControl(shape, function(block) {
      block.param[0] = i;
    }, null, null);
  });
};
A3a.vpl.BlockTemplate.sliderToAccessibilityControl = function(i, top, left, bottom, right, min, max, num) {
  var sc = Math.pow(10, Math.round(Math.log10(Math.abs(max - min) / num / 10)));
  return new A3a.vpl.BlockParamAccessibility.Control(top, left, bottom, right, null, function(block) {
    block.param[i] = sc * Math.round(Math.min(max, block.param[i] + (max - min) / (num - 1)) / sc);
  }, function(block) {
    block.param[i] = sc * Math.round(Math.max(min, block.param[i] - (max - min) / (num - 1)) / sc);
  });
};
A3a.vpl.BlockTemplate.stateButtonToAccessibilityControl = function(i, n, onSelect, onUp, onDown) {
  var x1 = 0.5 + 0.37 * Math.cos(Math.PI * (0.5 - 2 * (i - 0.3) / n));
  var y1 = 0.5 - 0.37 * Math.sin(Math.PI * (0.5 - 2 * (i - 0.3) / n));
  var x2 = 0.5 + 0.37 * Math.cos(Math.PI * (0.5 - 2 * (i + 0.3) / n));
  var y2 = 0.5 - 0.37 * Math.sin(Math.PI * (0.5 - 2 * (i + 0.3) / n));
  return new A3a.vpl.BlockParamAccessibility.Control(Math.min(y1, y2) - 0.1, Math.min(x1, x2) - 0.1, Math.max(y1, y2) + 0.1, Math.max(x1, x2) + 0.1, onSelect, onUp, onDown);
};
A3a.vpl.BlockTemplate.state4ToAccessibilityControls = function(valueSet) {
  var c = [];
  var map = [1, 3, 2, 0];
  for (var i = 0; i < 4; i++) {
    c.push(A3a.vpl.BlockTemplate.stateButtonToAccessibilityControl(i + 0.5, 4, function(i) {
      return function(block) {
        block.param[map[i]] = A3a.vpl.BlockTemplate.nextCheckboxState(block.param[map[i]], valueSet);
      };
    }(i), null, null));
  }
  return c;
};
A3a.vpl.BlockTemplate.state8ToAccessibilityControls = function() {
  var c = [];
  for (var i = 0; i < 8; i++) {
    c.push(A3a.vpl.BlockTemplate.stateButtonToAccessibilityControl(i, 8, function(i) {
      return function(block) {
        block.param[0] = i;
      };
    }(i), function(block) {
      block.param[0] = (block.param[0] + 1) % 8;
    }, function(block) {
      block.param[0] = (block.param[0] + 7) % 8;
    }));
  }
  return c;
};
A3a.vpl.BlockTemplate.notesToAccessibilityControls = function(left, right, low, high, numNotes, numHeights) {
  var c = [];
  for (var i = 0; i < numNotes; i++) {
    (function(i) {
      c.push(new A3a.vpl.BlockParamAccessibility.Control(0.1, left + i * (right - left) / numNotes, 0.9, left + (i + 1) * (right - left) / numNotes, function(block) {
        block.param[2 * i + 1] = A3a.vpl.BlockTemplate.nextCheckboxState(block.param[2 * i + 1], [0, 1, 2]);
      }, function(block) {
        if (block.param[2 * i + 1] === 0) {
          block.param[2 * i] = 0;
          block.param[2 * i + 1] = 1;
        } else {
          block.param[2 * i] = Math.min(block.param[2 * i] + 1, numHeights - 1);
        }
      }, function(block) {
        if (block.param[2 * i + 1] === 0) {
          block.param[2 * i] = 0;
          block.param[2 * i + 1] = 1;
        } else {
          block.param[2 * i] = Math.max(block.param[2 * i] - 1, 0);
        }
      }, function(block, x, y) {
        var pitch = numHeights - 1 - Math.floor(y * numHeights * 0.9999);
        if (block.param[2 * i + 1] === 0) {
          block.param[2 * i] = pitch;
          block.param[2 * i + 1] = 1;
        } else {
          if (block.param[2 * i] === pitch) {
            block.param[2 * i + 1] = A3a.vpl.BlockTemplate.nextCheckboxState(block.param[2 * i + 1], [0, 1, 2]);
          } else {
            block.param[2 * i] = pitch;
          }
        }
      }));
    })(i);
  }
  return c;
};
A3a.vpl.BlockTemplate.lib = [new A3a.vpl.BlockTemplate({name:"!stop", type:A3a.vpl.blockType.hidden}), new A3a.vpl.BlockTemplate({name:"!stop and blink", type:A3a.vpl.blockType.hidden}), new A3a.vpl.BlockTemplate({name:"!volume", type:A3a.vpl.blockType.hidden}), new A3a.vpl.BlockTemplate(function() {
  var buttons = [{sh:"c", x:0, y:0, r:0}, {sh:"t", x:0, y:0.3, r:0}, {sh:"t", x:0, y:-0.3, r:Math.PI}, {sh:"t", x:0.3, y:0, r:Math.PI / 2}, {sh:"t", x:-0.3, y:0, r:-Math.PI / 2}];
  return {name:"button 1", type:A3a.vpl.blockType.event, defaultParam:function() {
    return [0];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.radiobuttonsToAccessibilityControls(buttons)), draw:function(canvas, block) {
    canvas.robotTop();
    var i = block.param[0];
    canvas.buttons(buttons, [i == 0, i == 1, i == 2, i == 3, i == 4]);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      block.param[0] = i;
      block.endChange();
    }
    return i;
  }};
}()), new A3a.vpl.BlockTemplate(function() {
  var buttons = [{sh:"c", x:0, y:0, r:0}, {sh:"t", x:0, y:0.3, r:0}, {sh:"t", x:0, y:-0.3, r:Math.PI}, {sh:"t", x:0.3, y:0, r:Math.PI / 2}, {sh:"t", x:-0.3, y:0, r:-Math.PI / 2}];
  return {name:"button", modes:[A3a.vpl.mode.custom], type:A3a.vpl.blockType.event, defaultParam:function() {
    return [false, false, false, false, false];
  }, typicalParam:function() {
    return [false, false, true, false, true];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.checkboxesToAccessibilityControls(buttons, [false, true])), draw:function(canvas, block) {
    canvas.robotTop();
    canvas.buttons(buttons, block.param);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      block.param[i] = !block.param[i];
      block.endChange();
    }
    return i;
  }, validate:function(block) {
    for (var i = 0; i < 5; i++) {
      if (block.param[i]) {
        return null;
      }
    }
    return new A3a.vpl.Error("No button specified", true);
  }};
}()), new A3a.vpl.BlockTemplate(function() {
  var buttons = [{sh:"r", x:0, y:0.4, r:0, str:"2"}, {sh:"r", x:-0.22, y:0.35, r:-0.45, str:"1"}, {sh:"r", x:0.22, y:0.35, r:0.45, str:"3"}, {sh:"r", x:-0.4, y:0.22, r:-0.8, str:"0"}, {sh:"r", x:0.4, y:0.22, r:0.8, str:"4"}, {sh:"r", x:-0.2, y:-0.4, str:"5"}, {sh:"r", x:0.2, y:-0.4, str:"6"}];
  return {name:"horiz prox", modes:[A3a.vpl.mode.basic], type:A3a.vpl.blockType.event, defaultParam:function() {
    return [0, 0, 0, 0, 0, 0, 0];
  }, typicalParam:function() {
    return [0, 1, -1, 1, -1, 0, 0];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.checkboxesToAccessibilityControls(buttons, [0, 1, -1])), draw:function(canvas, block) {
    canvas.robotTop();
    canvas.buttons(buttons, block.param, {cross:-1});
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      block.param[i] = (block.param[i] + 2) % 3 - 1;
      block.endChange();
    }
    return i;
  }, validate:function(block) {
    for (var i = 0; i < 7; i++) {
      if (block.param[i]) {
        return null;
      }
    }
    return new A3a.vpl.Error("No proximity sensor specified", true);
  }, changeMode:function(block, mode) {
    switch(mode) {
      case A3a.vpl.mode.advanced:
        var newBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("horiz prox adv"), null, null);
        newBlock.param = block.param.concat(newBlock.param.slice(7));
        return newBlock;
      default:
        return block;
    }
  }};
}()), new A3a.vpl.BlockTemplate(function() {
  var buttons = [{sh:"r", x:0, y:0.4, r:0, str:"2"}, {sh:"r", x:-0.22, y:0.35, r:-0.45, str:"1"}, {sh:"r", x:0.22, y:0.35, r:0.45, str:"3"}, {sh:"r", x:-0.4, y:0.22, r:-0.8, str:"0"}, {sh:"r", x:0.4, y:0.22, r:0.8, str:"4"}, {sh:"r", x:-0.2, y:-0.4, str:"5"}, {sh:"r", x:0.2, y:-0.4, str:"6"}];
  return {name:"horiz prox adv", modes:[A3a.vpl.mode.custom], type:A3a.vpl.blockType.event, defaultParam:function() {
    return [0, 0, 0, 0, 0, 0, 0, 0.1, 0.4];
  }, typicalParam:function() {
    return [0, 1, 2, 1, 2, 3, 3, 0.1, 0.4];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.checkboxesToAccessibilityControls(buttons, [0, 1, 2, 3]).concat(A3a.vpl.BlockTemplate.sliderToAccessibilityControl(7, 0.6, -0.05, 0.8, 1.05, 0.25, 0.75, 3), A3a.vpl.BlockTemplate.sliderToAccessibilityControl(8, 0.38, -0.05, 0.58, 1.05, 0.25, 0.75, 3))), draw:function(canvas, block) {
    canvas.robotTop();
    canvas.buttons(buttons, block.param, {fillColors:["white", "red", "#333", "#888"], strokeColors:["#aaa", "black", "black", "black"], cross:2});
    canvas.slider(block.param[8], 0.02, false, "red", A3a.vpl.draw.levelType.high);
    canvas.slider(block.param[7], -0.2, false, "black", A3a.vpl.draw.levelType.low);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      block.param[i] = (block.param[i] + 1) % 4;
      block.endChange();
      return i;
    }
    if (canvas.sliderCheck(0.02, false, width, height, left, top, ev)) {
      block.beginChange();
      return 8;
    }
    if (canvas.sliderCheck(-0.2, false, width, height, left, top, ev)) {
      block.beginChange();
      return 7;
    }
    return null;
  }, mousedrag:function(canvas, block, dragIndex, width, height, left, top, ev) {
    if (dragIndex >= 7) {
      var val = canvas.sliderDrag(false, width, height, left, top, ev);
      block.param[dragIndex] = Math.max(0, Math.min(1, val));
      block.endChange();
    }
  }, validate:function(block) {
    for (var i = 0; i < 7; i++) {
      if (block.param[i]) {
        return null;
      }
    }
    return new A3a.vpl.Error("No sensor specified", true);
  }, changeMode:function(block, mode) {
    switch(mode) {
      case A3a.vpl.mode.basic:
        var defParam = block.blockTemplate.defaultParam();
        if (block.param[7] === defParam[7] && block.param[8] === defParam[8]) {
          var newBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("horiz prox"), null, null);
          newBlock.param = block.param.slice(0, 7);
          return newBlock;
        }
      default:
        return block;
    }
  }};
}()), new A3a.vpl.BlockTemplate(function() {
  var buttons = [{sh:"r", x:0, y:0.4, r:0, str:"2"}, {sh:"r", x:-0.22, y:0.35, r:-0.45, str:"1"}, {sh:"r", x:0.22, y:0.35, r:0.45, str:"3"}, {sh:"r", x:-0.4, y:0.22, r:-0.8, str:"0"}, {sh:"r", x:0.4, y:0.22, r:0.8, str:"4"}, {sh:"r", x:-0.2, y:-0.4, str:"5"}, {sh:"r", x:0.2, y:-0.4, str:"6"}];
  return {name:"horiz prox 1", modes:[A3a.vpl.mode.advanced], type:A3a.vpl.blockType.event, defaultParam:function() {
    return [0, 0, 0, 0, 0, 0, 0, 0.25];
  }, typicalParam:function() {
    return [0, 1, -1, 1, -1, 0, 0, 0.25];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.checkboxesToAccessibilityControls(buttons, [0, 1, -1]).concat(A3a.vpl.BlockTemplate.sliderToAccessibilityControl(7, 0.4, -0.05, 0.6, 1.05, 0.25, 0.75, 3))), draw:function(canvas, block) {
    canvas.robotTop();
    canvas.buttons(buttons, block.param, {cross:-1});
    canvas.slider(block.param[7], -0.1, false, "black", A3a.vpl.draw.levelType.low);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      block.param[i] = (block.param[i] + 2) % 3 - 1;
      block.endChange();
      return i;
    }
    if (canvas.sliderCheck(-0.1, false, width, height, left, top, ev)) {
      block.beginChange();
      return 7;
    }
    return null;
  }, mousedrag:function(canvas, block, dragIndex, width, height, left, top, ev) {
    if (dragIndex >= 7) {
      var val = canvas.sliderDrag(false, width, height, left, top, ev);
      block.param[dragIndex] = Math.max(0.25, Math.min(0.75, Math.round(val * 4) / 4));
      block.endChange();
    }
  }, validate:function(block) {
    for (var i = 0; i < 7; i++) {
      if (block.param[i]) {
        return null;
      }
    }
    return new A3a.vpl.Error("No sensor specified", true);
  }, changeMode:function(block, mode) {
    switch(mode) {
      case A3a.vpl.mode.basic:
        var defParam = block.blockTemplate.defaultParam();
        if (block.param[7] === defParam[7]) {
          var newBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("horiz prox"), null, null);
          newBlock.param = block.param.slice(0, 7);
          return newBlock;
        }
      default:
        return block;
    }
  }};
}()), new A3a.vpl.BlockTemplate(function() {
  var buttons = [{sh:"r", x:-0.15, y:0.35, str:"0"}, {sh:"r", x:0.15, y:0.35, str:"1"}];
  return {name:"ground", modes:[A3a.vpl.mode.basic], type:A3a.vpl.blockType.event, defaultParam:function() {
    return [0, 0];
  }, typicalParam:function() {
    return [1, -1];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.checkboxesToAccessibilityControls(buttons, [0, 1, -1])), draw:function(canvas, block) {
    canvas.robotTop({withWheels:true});
    canvas.buttons(buttons, block.param, {cross:-1});
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      block.param[i] = (block.param[i] + 2) % 3 - 1;
      block.endChange();
    }
    return i;
  }, validate:function(block) {
    if (block.param[0] || block.param[1]) {
      return null;
    }
    return new A3a.vpl.Error("No ground sensor specified", true);
  }, changeMode:function(block, mode) {
    switch(mode) {
      case A3a.vpl.mode.advanced:
        var newBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("ground adv"), null, null);
        newBlock.param = block.param.concat(newBlock.param.slice(2));
        return newBlock;
      default:
        return block;
    }
  }};
}()), new A3a.vpl.BlockTemplate(function() {
  var buttons = [{sh:"r", x:-0.15, y:0.35, str:"0"}, {sh:"r", x:0.15, y:0.35, str:"1"}];
  return {name:"ground adv", modes:[A3a.vpl.mode.custom], type:A3a.vpl.blockType.event, defaultParam:function() {
    return [0, 0, 0.4, 0.6];
  }, typicalParam:function() {
    return [1, 2, 0.4, 0.6];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.checkboxesToAccessibilityControls(buttons, [0, 1, 2, 3]).concat(A3a.vpl.BlockTemplate.sliderToAccessibilityControl(2, 0.6, -0.05, 0.8, 1.05, 0.25, 0.75, 3), A3a.vpl.BlockTemplate.sliderToAccessibilityControl(3, 0.38, -0.05, 0.58, 1.05, 0.25, 0.75, 3))), draw:function(canvas, block) {
    canvas.robotTop({withWheels:true});
    canvas.buttons(buttons, block.param, {fillColors:["white", "red", "#333", "#888"], strokeColors:["#aaa", "black", "black", "black"], cross:2});
    canvas.slider(block.param[3], 0.02, false, "red", A3a.vpl.draw.levelType.high);
    canvas.slider(block.param[2], -0.2, false, "black", A3a.vpl.draw.levelType.low);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      block.param[i] = (block.param[i] + 1) % 4;
      block.endChange();
      return i;
    }
    if (canvas.sliderCheck(0.02, false, width, height, left, top, ev)) {
      block.beginChange();
      return 3;
    }
    if (canvas.sliderCheck(-0.2, false, width, height, left, top, ev)) {
      block.beginChange();
      return 2;
    }
    return null;
  }, mousedrag:function(canvas, block, dragIndex, width, height, left, top, ev) {
    if (dragIndex >= 2) {
      var val = canvas.sliderDrag(false, width, height, left, top, ev);
      block.param[dragIndex] = Math.max(0, Math.min(1, val));
      block.endChange();
    }
  }, validate:function(block) {
    if (block.param[0] || block.param[1]) {
      return null;
    }
    return new A3a.vpl.Error("No ground sensor specified", true);
  }, changeMode:function(block, mode) {
    switch(mode) {
      case A3a.vpl.mode.basic:
        var defParam = block.blockTemplate.defaultParam();
        if (block.param[2] === defParam[2] && block.param[3] === defParam[3]) {
          var newBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("ground"), null, null);
          newBlock.param = block.param.slice(0, 2);
          return newBlock;
        }
      default:
        return block;
    }
  }};
}()), new A3a.vpl.BlockTemplate(function() {
  var buttons = [{sh:"r", x:-0.15, y:0.35, str:"0"}, {sh:"r", x:0.15, y:0.35, str:"1"}];
  return {name:"ground 1", modes:[A3a.vpl.mode.advanced], type:A3a.vpl.blockType.event, defaultParam:function() {
    return [0, 0, 0.5];
  }, typicalParam:function() {
    return [1, -1, 0.5];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.checkboxesToAccessibilityControls(buttons, [0, 1, -1]).concat(A3a.vpl.BlockTemplate.sliderToAccessibilityControl(2, 0.4, -0.05, 0.6, 1.05, 0.25, 0.75, 3))), draw:function(canvas, block) {
    canvas.robotTop({withWheels:true});
    canvas.buttons(buttons, block.param, {cross:-1});
    canvas.slider(block.param[2], 0, false, "black", A3a.vpl.draw.levelType.low);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      block.param[i] = (block.param[i] + 2) % 3 - 1;
      block.endChange();
      return i;
    }
    if (canvas.sliderCheck(0, false, width, height, left, top, ev)) {
      block.beginChange();
      return 2;
    }
    return null;
  }, mousedrag:function(canvas, block, dragIndex, width, height, left, top, ev) {
    if (dragIndex >= 2) {
      var val = canvas.sliderDrag(false, width, height, left, top, ev);
      block.param[dragIndex] = Math.max(0.25, Math.min(0.75, Math.round(4 * val) / 4));
      block.endChange();
    }
  }, validate:function(block) {
    if (block.param[0] || block.param[1]) {
      return null;
    }
    return new A3a.vpl.Error("No ground sensor specified", true);
  }, changeMode:function(block, mode) {
    switch(mode) {
      case A3a.vpl.mode.basic:
        var defParam = block.blockTemplate.defaultParam();
        if (block.param[2] === defParam[2]) {
          var newBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("ground"), null, null);
          newBlock.param = block.param.slice(0, 2);
          return newBlock;
        }
      default:
        return block;
    }
  }};
}()), new A3a.vpl.BlockTemplate({name:"tap", modes:[A3a.vpl.mode.basic, A3a.vpl.mode.advanced], type:A3a.vpl.blockType.event, draw:function(canvas, block) {
  canvas.ctx.translate(canvas.dims.blockSize * 0.05, 0);
  canvas.robotSide(0.7);
  canvas.tap(0.7);
}, changeMode:function(block, mode) {
  switch(mode) {
    case A3a.vpl.mode.advanced:
      return new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("accelerometer"), null, null);
    default:
      return block;
  }
}}), new A3a.vpl.BlockTemplate(function() {
  var buttons = [{sh:"c", x:-0.33, y:-0.3, r:0}, {sh:"c", x:0, y:-0.3, r:0}, {sh:"c", x:0.33, y:-0.3, r:0}];
  return {name:"accelerometer", modes:[A3a.vpl.mode.custom], type:A3a.vpl.blockType.event, defaultParam:function() {
    return [0, 0];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.radiobuttonsToAccessibilityControls(buttons).concat(new A3a.vpl.BlockParamAccessibility.Control(0.1, 0.1, 0.9, 0.9, null, function(block) {
    block.param[1] = block.param[0] === 0 ? 0 : block.param[0] === 1 ? Math.min(block.param[1] + 1, 6) : Math.max(block.param[1] - 1, -6);
  }, function(block) {
    block.param[1] = block.param[0] === 0 ? 0 : block.param[0] === 1 ? Math.max(block.param[1] - 1, -6) : Math.min(block.param[1] + 1, 6);
  }))), draw:function(canvas, block) {
    var dir = block.param[0];
    var a = block.param[1];
    if (dir === 0) {
      canvas.ctx.save();
      canvas.ctx.translate(0.08 * canvas.dims.blockSize, -0.2 * canvas.dims.blockSize);
      canvas.robotSide(0.7);
      canvas.tap(0.7);
      canvas.ctx.restore();
    } else {
      canvas.robotAccelerometer(dir === 2, dir === 2 ? -a : a);
    }
    canvas.buttons(buttons, [dir === 0, dir === 1, dir === 2]);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    if (block.param[0] !== 0 && canvas.accelerometerCheck(width, height, left, top, ev)) {
      block.beginChange();
      return 1;
    }
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      block.param[0] = i;
      block.endChange();
      return 2;
    }
    return null;
  }, mousedrag:function(canvas, block, dragIndex, width, height, left, top, ev) {
    if (dragIndex === 1) {
      var angle = canvas.accelerometerDrag(width, height, left, top, ev);
      block.param[1] = block.param[0] === 2 ? -angle : angle;
      block.endChange();
    }
  }, changeMode:function(block, mode) {
    switch(mode) {
      case A3a.vpl.mode.basic:
        if (block.param[0] === 0) {
          return new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("tap"), null, null);
        }
      default:
        return block;
    }
  }};
}()), new A3a.vpl.BlockTemplate({name:"roll", modes:[A3a.vpl.mode.advanced], type:A3a.vpl.blockType.event, defaultParam:function() {
  return [0];
}, typicalParam:function() {
  return [2];
}, paramAccessibility:new A3a.vpl.BlockParamAccessibility([new A3a.vpl.BlockParamAccessibility.Control(0.1, 0.1, 0.9, 0.9, null, function(block) {
  block.param[0] = (block.param[0] + 13) % 24 - 12;
}, function(block) {
  block.param[0] = (block.param[0] + 11) % 24 - 12;
})]), draw:function(canvas, block) {
  var a = block.param[0];
  canvas.robotAccelerometer(false, a);
}, mousedown:function(canvas, block, width, height, left, top, ev) {
  if (canvas.accelerometerCheck(width, height, left, top, ev, true)) {
    block.beginChange();
    return 1;
  }
  return null;
}, mousedrag:function(canvas, block, dragIndex, width, height, left, top, ev) {
  var angle = canvas.accelerometerDrag(width, height, left, top, ev, true);
  block.param[0] = angle;
  block.endChange();
}}), new A3a.vpl.BlockTemplate({name:"pitch", modes:[A3a.vpl.mode.advanced], type:A3a.vpl.blockType.event, defaultParam:function() {
  return [0];
}, typicalParam:function() {
  return [2];
}, paramAccessibility:new A3a.vpl.BlockParamAccessibility([new A3a.vpl.BlockParamAccessibility.Control(0.1, 0.1, 0.9, 0.9, null, function(block) {
  block.param[0] = (block.param[0] + 13) % 24 - 12;
}, function(block) {
  block.param[0] = (block.param[0] + 11) % 24 - 12;
})]), draw:function(canvas, block) {
  var a = block.param[0];
  canvas.robotAccelerometer(true, a);
}, mousedown:function(canvas, block, width, height, left, top, ev) {
  if (canvas.accelerometerCheck(width, height, left, top, ev, true)) {
    block.beginChange();
    return 1;
  }
  return null;
}, mousedrag:function(canvas, block, dragIndex, width, height, left, top, ev) {
  var angle = canvas.accelerometerDrag(width, height, left, top, ev, true);
  block.param[0] = angle;
  block.endChange();
}}), new A3a.vpl.BlockTemplate({name:"yaw", modes:[A3a.vpl.mode.advanced], type:A3a.vpl.blockType.event, defaultParam:function() {
  return [0];
}, typicalParam:function() {
  return [2];
}, paramAccessibility:new A3a.vpl.BlockParamAccessibility([new A3a.vpl.BlockParamAccessibility.Control(0.1, 0.1, 0.9, 0.9, null, function(block) {
  block.param[0] = (block.param[0] + 13) % 24 - 12;
}, function(block) {
  block.param[0] = (block.param[0] + 11) % 24 - 12;
})]), draw:function(canvas, block) {
  var a = block.param[0];
  canvas.robotYaw(a);
}, mousedown:function(canvas, block, width, height, left, top, ev) {
  if (canvas.accelerometerCheck(width, height, left, top, ev, true)) {
    block.beginChange();
    return 1;
  }
  return null;
}, mousedrag:function(canvas, block, dragIndex, width, height, left, top, ev) {
  var angle = canvas.accelerometerDrag(width, height, left, top, ev, true);
  block.param[0] = angle;
  block.endChange();
}}), new A3a.vpl.BlockTemplate({name:"clap", type:A3a.vpl.blockType.event, draw:function(canvas, block) {
  canvas.microphone();
}}), new A3a.vpl.BlockTemplate({name:"init", modes:[A3a.vpl.mode.basic, A3a.vpl.mode.advanced], type:A3a.vpl.blockType.event, draw:function(canvas, block) {
  canvas.drawInit();
}, noState:true}), new A3a.vpl.BlockTemplate({name:"timer", modes:[A3a.vpl.mode.advanced], type:A3a.vpl.blockType.event, draw:function(canvas, block) {
  canvas.drawTimer(0, true, false);
}}), new A3a.vpl.BlockTemplate(function() {
  var buttons = [{sh:"c", x:0.3, y:0.2}, {sh:"c", x:0.3, y:-0.2}];
  return {name:"clock", modes:[], type:A3a.vpl.blockType.event, defaultParam:function() {
    return [10];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility([A3a.vpl.BlockTemplate.buttonToAccessibilityControl(buttons[0], function(block) {
    block.param[0] = 10;
  }, null, null), A3a.vpl.BlockTemplate.buttonToAccessibilityControl(buttons[1], function(block) {
    block.param[0] = 20;
  }, null, null)]), draw:function(canvas, block) {
    canvas.robotTop();
    var s = canvas.dims.blockSize;
    A3a.vpl.Canvas.drawClock(canvas.ctx, s * 0.1, s * 0.6, s * 0.3, s * 0.15, 4, {style:block.param[0] === 10 ? "black" : "#222", lineWidth:canvas.dims.blockLineWidth});
    A3a.vpl.Canvas.drawClock(canvas.ctx, s * 0.1, s * 0.6, s * 0.70, s * 0.15, 8, {style:block.param[0] === 20 ? "black" : "#222", lineWidth:canvas.dims.blockLineWidth});
    canvas.buttons(buttons, [block.param[0] === 10, block.param[0] === 20]);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      block.param[0] = i === 0 ? 10 : 20;
      block.endChange();
    }
    return i;
  }};
}()), new A3a.vpl.BlockTemplate(function() {
  var buttons = [{sh:"t", x:-0.25, y:0, r:-Math.PI / 2}, {sh:"t", x:0, y:0.25, r:0}, {sh:"t", x:0, y:-0.25, r:Math.PI}, {sh:"t", x:0.25, y:0, r:Math.PI / 2}, {sh:"c", x:0, y:0, r:0}];
  return {name:"remote control arrows", modes:[], type:A3a.vpl.blockType.event, defaultParam:function() {
    return [0];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.radiobuttonsToAccessibilityControls(buttons)), draw:function(canvas, block) {
    canvas.remoteControl();
    var i = block.param[0];
    canvas.buttons(buttons, [i == 0, i == 1, i == 2, i == 3, i == 4]);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      block.param[0] = i;
      block.endChange();
    }
    return i;
  }};
}()), new A3a.vpl.BlockTemplate({name:"state", modes:[A3a.vpl.mode.advanced], type:A3a.vpl.blockType.state, defaultParam:function() {
  return [0, 0, 0, 0];
}, typicalParam:function() {
  return [1, 0, 0, -1];
}, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.state4ToAccessibilityControls([0, 1, -1])), draw:function(canvas, block) {
  canvas.robotTop();
  canvas.drawState(block.param);
}, mousedown:function(canvas, block, width, height, left, top, ev) {
  var i = canvas.stateClick(width, height, left, top, ev);
  if (i !== null) {
    block.beginChange();
    block.param[i] = (block.param[i] + 2) % 3 - 1;
    block.endChange();
  }
  return i;
}, changeMode:function(block, mode) {
  if (mode === A3a.vpl.mode.basic && block.param[0] === 0 && block.param[1] === 0 && block.param[2] === 0 && block.param[3] === 0) {
    return null;
  }
  return block;
}}), new A3a.vpl.BlockTemplate({name:"state 8", modes:[A3a.vpl.mode.custom], type:A3a.vpl.blockType.state, defaultParam:function() {
  return [0];
}, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.state8ToAccessibilityControls()), draw:function(canvas, block) {
  canvas.robotTop();
  canvas.drawState8(block.param[0]);
}, mousedown:function(canvas, block, width, height, left, top, ev) {
  var i = canvas.state8Click(width, height, left, top, ev);
  if (i !== null) {
    block.beginChange();
    block.param[0] = i;
    block.endChange();
  }
  return i;
}}), new A3a.vpl.BlockTemplate(function() {
  var buttons = [{sh:"t", x:-0.3, y:0.3, r:0}, {sh:"t", x:-0.3, y:-0.3, r:Math.PI}, {sh:"t", x:0.1, y:0.3, r:0}, {sh:"t", x:0.1, y:-0.3, r:Math.PI}, {sh:"c", x:0.35, y:-0.3, r:0}];
  return {name:"counter comparison", modes:[A3a.vpl.mode.advanced], type:A3a.vpl.blockType.state, defaultParam:function() {
    return [0, 0];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility([new A3a.vpl.BlockParamAccessibility.Control(0, 0, 1, 0.4, null, function(block) {
    block.param[0] = Math.min(1, block.param[0] + 1);
  }, function(block) {
    block.param[0] = Math.max(-1, block.param[0] - 1);
  }), new A3a.vpl.BlockParamAccessibility.Control(0, 0.4, 1, 0.8, null, function(block) {
    block.param[1] = Math.min(255, block.param[1] + 1);
  }, function(block) {
    block.param[1] = Math.max(0, block.param[1] - 1);
  }), A3a.vpl.BlockTemplate.buttonToAccessibilityControl(buttons[4], function(block) {
    block.param[1] = 0;
  }, null, null)]), draw:function(canvas, block) {
    canvas.text(block.param[0] === 0 ? "=" : block.param[0] > 0 ? "\u2265" : "\u2264", {x:-0.3 * canvas.dims.blockSize, fillStyle:"black"});
    canvas.text(block.param[1].toString(10), {x:0.1 * canvas.dims.blockSize, fillStyle:"black"});
    canvas.buttons(buttons, [block.param[0] < 1 ? -2 : 0, block.param[0] > -1 ? -2 : 0, block.param[1] < 255 ? -2 : 0, block.param[1] > 0 ? -2 : 0, block.param[1] !== 0 ? -2 : 0]);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      switch(i) {
        case 0:
          block.param[0] = Math.min(1, block.param[0] + 1);
          break;
        case 1:
          block.param[0] = Math.max(-1, block.param[0] - 1);
          break;
        case 2:
          block.param[1] = Math.min(255, block.param[1] + 1);
          break;
        case 3:
          block.param[1] = Math.max(0, block.param[1] - 1);
          break;
        case 4:
          block.param[1] = 0;
          break;
      }
      block.endChange();
    }
    return i;
  }};
}()), new A3a.vpl.BlockTemplate({name:"color state", modes:[A3a.vpl.mode.custom], type:A3a.vpl.blockType.state, defaultParam:function() {
  return [0, 0, 0];
}, paramAccessibility:new A3a.vpl.BlockParamAccessibility([A3a.vpl.BlockTemplate.sliderToAccessibilityControl(0, 0.1, -0.05, 0.3, 1.05, 0, 1, 2), A3a.vpl.BlockTemplate.sliderToAccessibilityControl(1, 0.4, -0.05, 0.6, 1.05, 0, 1, 2), A3a.vpl.BlockTemplate.sliderToAccessibilityControl(2, 0.7, -0.05, 0.9, 1.05, 0, 1, 2)]), draw:function(canvas, block) {
  canvas.robotTop({rgb:block.param});
  canvas.slider(block.param[0], 0.3, false, "red");
  canvas.slider(block.param[1], 0, false, "#0c0");
  canvas.slider(block.param[2], -0.3, false, "#08f");
}, mousedown:function(canvas, block, width, height, left, top, ev) {
  if (canvas.sliderCheck(0.3, false, width, height, left, top, ev)) {
    block.beginChange();
    return 0;
  }
  if (canvas.sliderCheck(0, false, width, height, left, top, ev)) {
    block.beginChange();
    return 1;
  }
  if (canvas.sliderCheck(-0.3, false, width, height, left, top, ev)) {
    block.beginChange();
    return 2;
  }
  return null;
}, mousedrag:function(canvas, block, dragIndex, width, height, left, top, ev) {
  var val = canvas.sliderDrag(false, width, height, left, top, ev);
  block.param[dragIndex] = Math.max(0, Math.min(1, Math.round(val)));
  block.endChange();
}}), new A3a.vpl.BlockTemplate(function() {
  var sz = 1.4;
  var buttons = [{sh:"r", x:-0.15, y:0.3, size:sz, str:"black", fillStyle:"#666", strokeStyle:"white"}, {sh:"r", x:-0.3, y:0, size:sz, str:"red", fillStyle:"red", strokeStyle:"white"}, {sh:"r", x:0, y:0, size:sz, str:"green", fillStyle:"#0c0", strokeStyle:"white"}, {sh:"r", x:0.3, y:0, size:sz, str:"yellow", fillStyle:"yellow", strokeStyle:"silver"}, {sh:"r", x:-0.3, y:-0.3, size:sz, str:"blue", fillStyle:"blue", strokeStyle:"white"}, {sh:"r", x:0, y:-0.3, size:sz, str:"magenta", fillStyle:"magenta", 
  strokeStyle:"white"}, {sh:"r", x:0.3, y:-0.3, size:sz, str:"cyan", fillStyle:"cyan", strokeStyle:"white"}, {sh:"r", x:0.15, y:0.3, size:sz, str:"white", fillStyle:"white", strokeStyle:"silver"}];
  return {name:"color 8 state", modes:[A3a.vpl.mode.advanced], type:A3a.vpl.blockType.state, defaultParam:function() {
    return [0];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.radiobuttonsToAccessibilityControls(buttons)), draw:function(canvas, block) {
    canvas.robotTop({rgb:[block.param & 1, (block.param & 2) / 2, (block.param & 4) / 4]});
    canvas.buttons(buttons, [block.param[0] < 1 ? -2 : 0, block.param[0] > -1 ? -2 : 0]);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      block.param = [i];
      block.endChange();
    }
    return i;
  }};
}()), new A3a.vpl.BlockTemplate({name:"motor state", modes:[A3a.vpl.mode.custom], type:A3a.vpl.blockType.state, defaultParam:function() {
  return [0, 0];
}, paramAccessibility:new A3a.vpl.BlockParamAccessibility([A3a.vpl.BlockTemplate.sliderToAccessibilityControl(0, -0.05, 0, 1.05, 0.2, -1, 1, 3), A3a.vpl.BlockTemplate.sliderToAccessibilityControl(1, -0.05, 0.8, 1.05, 1, -1, 1, 3)]), draw:function(canvas, block) {
  var rw = 0.19;
  var tr = canvas.traces(2.4 * block.param[0], 2.4 * block.param[1], rw);
  canvas.robotTop({withWheels:true, scale:0.45, rotation:tr.phi, translation:[tr.x * rw * canvas.dims.blockSize + 0.13 * canvas.dims.blockSize * Math.sin(tr.phi), tr.y * rw * canvas.dims.blockSize + 0.13 * canvas.dims.blockSize * Math.cos(tr.phi)]});
  canvas.ctx.save();
  canvas.ctx.globalAlpha = 0.2;
  canvas.traces(2.4 * block.param[0], 2.4 * block.param[1], rw);
  canvas.ctx.restore();
  canvas.slider(0.5 + 0.5 * block.param[0], -0.4, true, block.param[0] === 0 ? "white" : block.param[0] === block.param[1] ? "#0c0" : block.param[0] === -block.param[1] ? "#f70" : "#fd0");
  canvas.slider(0.5 + 0.5 * block.param[1], 0.4, true, block.param[1] === 0 ? "white" : block.param[0] === block.param[1] ? "#0c0" : block.param[0] === -block.param[1] ? "#f70" : "#fd0");
}, mousedown:function(canvas, block, width, height, left, top, ev) {
  if (canvas.sliderCheck(-0.4, true, width, height, left, top, ev)) {
    block.beginChange();
    return 0;
  }
  if (canvas.sliderCheck(0.4, true, width, height, left, top, ev)) {
    block.beginChange();
    return 1;
  }
  if (canvas.robotTopCheck(width, height, left, top, 0.5 * block.param[0], 0.5 * block.param[1], 0.21, ev)) {
    block.beginChange();
    return 2;
  }
  return null;
}, mousedrag:function(canvas, block, dragIndex, width, height, left, top, ev) {
  if (dragIndex < 2) {
    var val = canvas.sliderDrag(true, width, height, left, top, ev);
    val = val < 0.25 ? -1 : val > 0.75 ? 1 : 0;
    block.param[dragIndex] = val;
  } else {
    var val = canvas.sliderDrag(true, width, height, left, top, ev);
    val = val < 0.25 ? -1 : val > 0.75 ? 1 : 0;
    block.param[0] = val;
    block.param[1] = val;
  }
  block.endChange();
}}), new A3a.vpl.BlockTemplate({name:"motor", type:A3a.vpl.blockType.action, defaultParam:function() {
  return [0, 0];
}, typicalParam:function() {
  return [0.5, 0.2];
}, paramAccessibility:new A3a.vpl.BlockParamAccessibility([A3a.vpl.BlockTemplate.sliderToAccessibilityControl(0, -0.05, 0, 1.05, 0.2, -1, 1, 11), A3a.vpl.BlockTemplate.sliderToAccessibilityControl(1, -0.05, 0.8, 1.05, 1, -1, 1, 11)]), draw:function(canvas, block) {
  var rw = 0.19;
  var tr = canvas.traces(2.4 * block.param[0], 2.4 * block.param[1], rw);
  canvas.robotTop({withWheels:true, scale:0.45, rotation:tr.phi, translation:[tr.x * rw * canvas.dims.blockSize + 0.13 * canvas.dims.blockSize * Math.sin(tr.phi), tr.y * rw * canvas.dims.blockSize + 0.13 * canvas.dims.blockSize * Math.cos(tr.phi)]});
  canvas.ctx.save();
  canvas.ctx.globalAlpha = 0.2;
  canvas.traces(2.4 * block.param[0], 2.4 * block.param[1], rw);
  canvas.ctx.restore();
  canvas.slider(0.5 + 0.5 * block.param[0], -0.4, true, block.param[0] === 0 ? "white" : block.param[0] === block.param[1] ? "#0c0" : block.param[0] === -block.param[1] ? "#f70" : "#fd0");
  canvas.slider(0.5 + 0.5 * block.param[1], 0.4, true, block.param[1] === 0 ? "white" : block.param[0] === block.param[1] ? "#0c0" : block.param[0] === -block.param[1] ? "#f70" : "#fd0");
}, mousedown:function(canvas, block, width, height, left, top, ev) {
  if (canvas.sliderCheck(-0.4, true, width, height, left, top, ev)) {
    block.beginChange();
    return 0;
  }
  if (canvas.sliderCheck(0.4, true, width, height, left, top, ev)) {
    block.beginChange();
    return 1;
  }
  if (canvas.robotTopCheck(width, height, left, top, 0.5 * block.param[0], 0.5 * block.param[1], 0.21, ev)) {
    block.beginChange();
    return 2;
  }
  return null;
}, mousedrag:function(canvas, block, dragIndex, width, height, left, top, ev) {
  if (dragIndex < 2) {
    var val = 2 * canvas.sliderDrag(true, width, height, left, top, ev) - 1;
    var val2 = block.param[1 - dragIndex];
    if (Math.abs(val) < 0.1) {
      val = 0;
    } else {
      if (Math.abs(val - val2) < 0.1) {
        val = val2;
      } else {
        if (Math.abs(val + val2) < 0.1) {
          val = -val2;
        }
      }
    }
    block.param[dragIndex] = Math.max(-1, Math.min(1, val));
  } else {
    var val = 2 * canvas.sliderDrag(true, width, height, left, top, ev) - 1;
    if (Math.abs(val) < 0.1) {
      val = 0;
    } else {
      val = Math.max(-1, Math.min(1, val));
    }
    if (Math.abs(block.param[0] - block.param[1]) < 0.05) {
      block.param[0] = val;
      block.param[1] = val;
    } else {
      if (Math.abs(block.param[0]) > Math.abs(block.param[1])) {
        block.param[1] *= val / block.param[0];
        block.param[0] = val;
      } else {
        block.param[0] *= val / block.param[1];
        block.param[1] = val;
      }
    }
  }
  block.endChange();
}}), new A3a.vpl.BlockTemplate(function() {
  var buttons = [{sh:"c", x:0, y:0, r:0}, {sh:"t", x:0, y:0.35, r:0}, {sh:"t", x:0, y:-0.35, r:Math.PI}, {sh:"t", x:-0.3, y:0.32, r:-0.4}, {sh:"t", x:0.3, y:0.32, r:0.4}, {sh:"t", x:-0.35, y:0.05, r:-Math.PI / 2}, {sh:"t", x:0.35, y:0.05, r:Math.PI / 2}];
  var sp = 100;
  var spt = 25;
  return {name:"move", modes:[A3a.vpl.mode.custom], type:A3a.vpl.blockType.action, defaultParam:function() {
    return [0];
  }, draw:function(canvas, block) {
    canvas.robotTop({withWheels:true, scale:0.45});
    canvas.buttons(buttons, [block.param[0] === 0 ? 1 : -2, block.param[0] === 1 ? 1 : -2, block.param[0] === 2 ? 1 : -2, block.param[0] === 3 ? 1 : -2, block.param[0] === 4 ? 1 : -2, block.param[0] === 5 ? 1 : -2, block.param[0] === 6 ? 1 : -2]);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      block.param[0] = i;
      block.endChange();
    }
    return i;
  }};
}()), new A3a.vpl.BlockTemplate(function() {
  return {name:"nn obstacles", modes:[], type:A3a.vpl.blockType.action, defaultParam:function() {
    return [0, 0, 0, 0];
  }, typicalParam:function() {
    return [0.3, 0.2, 0.1, 0.3];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility([new A3a.vpl.BlockParamAccessibility.Control(0, 0, 0.25, 1, null, function(block) {
    block.param[0] = Math.min(1, block.param[0] + 0.1);
  }, function(block) {
    block.param[0] = Math.max(0, block.param[0] - 0.1);
  }, function(block, x, y) {
    console.info(x);
  }), new A3a.vpl.BlockParamAccessibility.Control(0.25, 0, 0.5, 1, null, function(block) {
    block.param[1] = Math.min(1, block.param[1] + 0.1);
  }, function(block) {
    block.param[1] = Math.max(0, block.param[1] - 0.1);
  }, function(block, x, y) {
    console.info(x);
  }), new A3a.vpl.BlockParamAccessibility.Control(0.5, 0, 0.75, 1, null, function(block) {
    block.param[2] = Math.min(1, block.param[2] + 0.1);
  }, function(block) {
    block.param[2] = Math.max(0, block.param[2] - 0.1);
  }, function(block, x, y) {
    console.info(x);
  }), new A3a.vpl.BlockParamAccessibility.Control(0.75, 0, 1, 1, null, function(block) {
    block.param[3] = Math.min(1, block.param[3] + 0.1);
  }, function(block) {
    block.param[3] = Math.max(0, block.param[3] - 0.1);
  }, function(block, x, y) {
    console.info(x);
  })]), draw:function(canvas, block, box, isZoomed) {
    var sc = isZoomed ? 0.5 : 1;
    var ctx = canvas.ctx;
    var dims = canvas.dims;
    ctx.save();
    if (isZoomed) {
      ctx.scale(sc, sc);
    }
    ctx.fillStyle = "white";
    ctx.font = dims.blockFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(0.5 * dims.blockSize, 0.5 * dims.blockSize);
    ctx.translate(-0.5 * dims.blockSize, -0.5 * dims.blockSize);
    if (isZoomed) {
      ctx.fillText("\u21d1", 0.25 * dims.blockSize, 0.35 * dims.blockSize);
      ctx.fillText(block.param[0].toFixed(1), 0.6 * dims.blockSize, 0.35 * dims.blockSize);
      ctx.fillText("\u21a7", 0.25 * dims.blockSize, 0.81 * dims.blockSize);
      ctx.fillText(block.param[1].toFixed(1), 0.6 * dims.blockSize, 0.81 * dims.blockSize);
      ctx.fillText("+", 0.25 * dims.blockSize, 1.27 * dims.blockSize);
      ctx.fillText(block.param[2].toFixed(1), 0.6 * dims.blockSize, 1.27 * dims.blockSize);
      ctx.fillText("\u2212", 0.25 * dims.blockSize, 1.69 * dims.blockSize);
      ctx.fillText(block.param[3].toFixed(1), 0.6 * dims.blockSize, 1.69 * dims.blockSize);
      ctx.translate(dims.blockSize, 0);
      canvas.slider(block.param[0], 0.15, false, "white");
      canvas.slider(block.param[1], -0.30, false, "white");
      canvas.slider(block.param[2], -0.75, false, "white");
      canvas.slider(block.param[3], -1.20, false, "white");
    } else {
      ctx.fillText("\u21d1", 0.25 * dims.blockSize, 0.17 * dims.blockSize);
      ctx.fillText(block.param[0].toFixed(1), 0.6 * dims.blockSize, 0.17 * dims.blockSize);
      ctx.fillText("\u21a7", 0.25 * dims.blockSize, 0.4 * dims.blockSize);
      ctx.fillText(block.param[1].toFixed(1), 0.6 * dims.blockSize, 0.4 * dims.blockSize);
      ctx.fillText("+", 0.25 * dims.blockSize, 0.63 * dims.blockSize);
      ctx.fillText(block.param[2].toFixed(1), 0.6 * dims.blockSize, 0.63 * dims.blockSize);
      ctx.fillText("\u2212", 0.25 * dims.blockSize, 0.87 * dims.blockSize);
      ctx.fillText(block.param[3].toFixed(1), 0.6 * dims.blockSize, 0.87 * dims.blockSize);
    }
    ctx.restore();
  }, alwaysZoom:true, mousedown:function(canvas, block, width, height, left, top, ev) {
    if (canvas.sliderCheck(0.35, false, width / 2, height, left + width / 2, top, ev)) {
      block.beginChange();
      return 0;
    }
    if (canvas.sliderCheck(0.12, false, width / 2, height, left + width / 2, top, ev)) {
      block.beginChange();
      return 1;
    }
    if (canvas.sliderCheck(-0.12, false, width / 2, height, left + width / 2, top, ev)) {
      block.beginChange();
      return 2;
    }
    if (canvas.sliderCheck(-0.35, false, width / 2, height, left + width / 2, top, ev)) {
      block.beginChange();
      return 3;
    }
    return null;
  }, mousedrag:function(canvas, block, dragIndex, width, height, left, top, ev) {
    var val = canvas.sliderDrag(false, width / 2, height, left + width / 2, top, ev);
    block.param[dragIndex] = Math.max(0, Math.min(1, Math.round(20 * val) / 20));
    block.endChange();
  }};
}()), new A3a.vpl.BlockTemplate(function() {
  return {name:"top color", modes:[A3a.vpl.mode.advanced], type:A3a.vpl.blockType.action, defaultParam:function() {
    return [0, 0, 0];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility([A3a.vpl.BlockTemplate.sliderToAccessibilityControl(0, 0.1, -0.05, 0.3, 1.05, 0, 1, 11), A3a.vpl.BlockTemplate.sliderToAccessibilityControl(1, 0.4, -0.05, 0.6, 1.05, 0, 1, 11), A3a.vpl.BlockTemplate.sliderToAccessibilityControl(2, 0.7, -0.05, 0.9, 1.05, 0, 1, 11)]), draw:function(canvas, block) {
    canvas.robotTop({rgb:block.param});
    canvas.slider(block.param[0], 0.3, false, "red");
    canvas.slider(block.param[1], 0, false, "#0c0");
    canvas.slider(block.param[2], -0.3, false, "#08f");
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    if (canvas.sliderCheck(0.3, false, width, height, left, top, ev)) {
      block.beginChange();
      return 0;
    }
    if (canvas.sliderCheck(0, false, width, height, left, top, ev)) {
      block.beginChange();
      return 1;
    }
    if (canvas.sliderCheck(-0.3, false, width, height, left, top, ev)) {
      block.beginChange();
      return 2;
    }
    return null;
  }, mousedrag:function(canvas, block, dragIndex, width, height, left, top, ev) {
    var val = canvas.sliderDrag(false, width, height, left, top, ev);
    block.param[dragIndex] = Math.max(0, Math.min(1, val));
    block.endChange();
  }};
}()), new A3a.vpl.BlockTemplate(function() {
  var sz = 1.4;
  var buttons = [{sh:"r", x:-0.15, y:0.3, size:sz, str:"black", fillStyle:"#666", strokeStyle:"white"}, {sh:"r", x:-0.3, y:0, size:sz, str:"red", fillStyle:"red", strokeStyle:"white"}, {sh:"r", x:0, y:0, size:sz, str:"green", fillStyle:"#0c0", strokeStyle:"white"}, {sh:"r", x:0.3, y:0, size:sz, str:"yellow", fillStyle:"yellow", strokeStyle:"silver"}, {sh:"r", x:-0.3, y:-0.3, size:sz, str:"blue", fillStyle:"blue", strokeStyle:"white"}, {sh:"r", x:0, y:-0.3, size:sz, str:"magenta", fillStyle:"magenta", 
  strokeStyle:"white"}, {sh:"r", x:0.3, y:-0.3, size:sz, str:"cyan", fillStyle:"cyan", strokeStyle:"white"}, {sh:"r", x:0.15, y:0.3, size:sz, str:"white", fillStyle:"white", strokeStyle:"silver"}];
  return {name:"top color 8", modes:[A3a.vpl.mode.basic], type:A3a.vpl.blockType.action, defaultParam:function() {
    return [0];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.radiobuttonsToAccessibilityControls(buttons)), draw:function(canvas, block) {
    canvas.robotTop({rgb:[block.param & 1, (block.param & 2) / 2, (block.param & 4) / 4]});
    canvas.buttons(buttons, [block.param[0] < 1 ? -2 : 0, block.param[0] > -1 ? -2 : 0]);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      block.param = [i];
      block.endChange();
    }
    return i;
  }};
}()), new A3a.vpl.BlockTemplate(function() {
  return {name:"bottom color", modes:[A3a.vpl.mode.advanced], type:A3a.vpl.blockType.action, defaultParam:function() {
    return [0, 0, 0];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility([A3a.vpl.BlockTemplate.sliderToAccessibilityControl(0, 0.1, -0.05, 0.3, 1.05, 0, 1, 11), A3a.vpl.BlockTemplate.sliderToAccessibilityControl(1, 0.4, -0.05, 0.6, 1.05, 0, 1, 11), A3a.vpl.BlockTemplate.sliderToAccessibilityControl(2, 0.7, -0.05, 0.9, 1.05, 0, 1, 11)]), draw:function(canvas, block) {
    canvas.robotTop({withWheels:true, rgb:block.param});
    canvas.slider(block.param[0], 0.3, false, "red");
    canvas.slider(block.param[1], 0, false, "#0c0");
    canvas.slider(block.param[2], -0.3, false, "#08f");
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    if (canvas.sliderCheck(0.3, false, width, height, left, top, ev)) {
      block.beginChange();
      return 0;
    }
    if (canvas.sliderCheck(0, false, width, height, left, top, ev)) {
      block.beginChange();
      return 1;
    }
    if (canvas.sliderCheck(-0.3, false, width, height, left, top, ev)) {
      block.beginChange();
      return 2;
    }
    return null;
  }, mousedrag:function(canvas, block, dragIndex, width, height, left, top, ev) {
    var val = canvas.sliderDrag(false, width, height, left, top, ev);
    block.param[dragIndex] = Math.max(0, Math.min(1, val));
    block.endChange();
  }};
}()), new A3a.vpl.BlockTemplate(function() {
  return {name:"bottom-left color", modes:[A3a.vpl.mode.custom], type:A3a.vpl.blockType.action, defaultParam:function() {
    return [0, 0, 0];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility([A3a.vpl.BlockTemplate.sliderToAccessibilityControl(0, 0.1, -0.05, 0.3, 1.05, 0, 1, 11), A3a.vpl.BlockTemplate.sliderToAccessibilityControl(1, 0.4, -0.05, 0.6, 1.05, 0, 1, 11), A3a.vpl.BlockTemplate.sliderToAccessibilityControl(2, 0.7, -0.05, 0.9, 1.05, 0, 1, 11)]), draw:function(canvas, block) {
    canvas.robotTop({withWheels:true, rgb:block.param, side:"left"});
    canvas.slider(block.param[0], 0.3, false, "red");
    canvas.slider(block.param[1], 0, false, "#0c0");
    canvas.slider(block.param[2], -0.3, false, "#08f");
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    if (canvas.sliderCheck(0.3, false, width, height, left, top, ev)) {
      block.beginChange();
      return 0;
    }
    if (canvas.sliderCheck(0, false, width, height, left, top, ev)) {
      block.beginChange();
      return 1;
    }
    if (canvas.sliderCheck(-0.3, false, width, height, left, top, ev)) {
      block.beginChange();
      return 2;
    }
    return null;
  }, mousedrag:function(canvas, block, dragIndex, width, height, left, top, ev) {
    var val = canvas.sliderDrag(false, width, height, left, top, ev);
    block.param[dragIndex] = Math.max(0, Math.min(1, val));
    block.endChange();
  }};
}()), new A3a.vpl.BlockTemplate(function() {
  return {name:"bottom-right color", modes:[A3a.vpl.mode.custom], type:A3a.vpl.blockType.action, defaultParam:function() {
    return [0, 0, 0];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility([A3a.vpl.BlockTemplate.sliderToAccessibilityControl(0, 0.1, -0.05, 0.3, 1.05, 0, 1, 11), A3a.vpl.BlockTemplate.sliderToAccessibilityControl(1, 0.4, -0.05, 0.6, 1.05, 0, 1, 11), A3a.vpl.BlockTemplate.sliderToAccessibilityControl(2, 0.7, -0.05, 0.9, 1.05, 0, 1, 11)]), draw:function(canvas, block) {
    canvas.robotTop({withWheels:true, rgb:block.param, side:"right"});
    canvas.slider(block.param[0], 0.3, false, "red");
    canvas.slider(block.param[1], 0, false, "#0c0");
    canvas.slider(block.param[2], -0.3, false, "#08f");
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    if (canvas.sliderCheck(0.3, false, width, height, left, top, ev)) {
      block.beginChange();
      return 0;
    }
    if (canvas.sliderCheck(0, false, width, height, left, top, ev)) {
      block.beginChange();
      return 1;
    }
    if (canvas.sliderCheck(-0.3, false, width, height, left, top, ev)) {
      block.beginChange();
      return 2;
    }
    return null;
  }, mousedrag:function(canvas, block, dragIndex, width, height, left, top, ev) {
    var val = canvas.sliderDrag(false, width, height, left, top, ev);
    block.param[dragIndex] = Math.max(0, Math.min(1, val));
    block.endChange();
  }};
}()), new A3a.vpl.BlockTemplate(function() {
  var sz = 1.4;
  var buttons = [{sh:"r", x:-0.15, y:0.3, size:sz, str:"black", fillStyle:"#666", strokeStyle:"white"}, {sh:"r", x:-0.3, y:0, size:sz, str:"red", fillStyle:"red", strokeStyle:"white"}, {sh:"r", x:0, y:0, size:sz, str:"green", fillStyle:"#0c0", strokeStyle:"white"}, {sh:"r", x:0.3, y:0, size:sz, str:"yellow", fillStyle:"yellow", strokeStyle:"silver"}, {sh:"r", x:-0.3, y:-0.3, size:sz, str:"blue", fillStyle:"blue", strokeStyle:"white"}, {sh:"r", x:0, y:-0.3, size:sz, str:"magenta", fillStyle:"magenta", 
  strokeStyle:"white"}, {sh:"r", x:0.3, y:-0.3, size:sz, str:"cyan", fillStyle:"cyan", strokeStyle:"white"}, {sh:"r", x:0.15, y:0.3, size:sz, str:"white", fillStyle:"white", strokeStyle:"silver"}];
  return {name:"bottom color 8", modes:[A3a.vpl.mode.basic], type:A3a.vpl.blockType.action, defaultParam:function() {
    return [0];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.radiobuttonsToAccessibilityControls(buttons)), draw:function(canvas, block) {
    canvas.robotTop({withWheels:true, rgb:[block.param & 1, (block.param & 2) / 2, (block.param & 4) / 4]});
    canvas.buttons(buttons, [block.param[0] < 1 ? -2 : 0, block.param[0] > -1 ? -2 : 0]);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      block.param = [i];
      block.endChange();
    }
    return i;
  }};
}()), new A3a.vpl.BlockTemplate(function() {
  var sz = 1.4;
  var buttons = [{sh:"r", x:-0.15, y:0.3, size:sz, str:"black", fillStyle:"#666", strokeStyle:"white"}, {sh:"r", x:-0.3, y:0, size:sz, str:"red", fillStyle:"red", strokeStyle:"white"}, {sh:"r", x:0, y:0, size:sz, str:"green", fillStyle:"#0c0", strokeStyle:"white"}, {sh:"r", x:0.3, y:0, size:sz, str:"yellow", fillStyle:"yellow", strokeStyle:"silver"}, {sh:"r", x:-0.3, y:-0.3, size:sz, str:"blue", fillStyle:"blue", strokeStyle:"white"}, {sh:"r", x:0, y:-0.3, size:sz, str:"magenta", fillStyle:"magenta", 
  strokeStyle:"white"}, {sh:"r", x:0.3, y:-0.3, size:sz, str:"cyan", fillStyle:"cyan", strokeStyle:"white"}, {sh:"r", x:0.15, y:0.3, size:sz, str:"white", fillStyle:"white", strokeStyle:"silver"}];
  return {name:"bottom-left color 8", modes:[A3a.vpl.mode.custom], type:A3a.vpl.blockType.action, defaultParam:function() {
    return [0];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.radiobuttonsToAccessibilityControls(buttons)), draw:function(canvas, block) {
    canvas.robotTop({withWheels:true, rgb:[block.param & 1, (block.param & 2) / 2, (block.param & 4) / 4], side:"left"});
    canvas.buttons(buttons, [block.param[0] < 1 ? -2 : 0, block.param[0] > -1 ? -2 : 0]);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      block.param = [i];
      block.endChange();
    }
    return i;
  }};
}()), new A3a.vpl.BlockTemplate(function() {
  var sz = 1.4;
  var buttons = [{sh:"r", x:-0.15, y:0.3, size:sz, str:"black", fillStyle:"#666", strokeStyle:"white"}, {sh:"r", x:-0.3, y:0, size:sz, str:"red", fillStyle:"red", strokeStyle:"white"}, {sh:"r", x:0, y:0, size:sz, str:"green", fillStyle:"#0c0", strokeStyle:"white"}, {sh:"r", x:0.3, y:0, size:sz, str:"yellow", fillStyle:"yellow", strokeStyle:"silver"}, {sh:"r", x:-0.3, y:-0.3, size:sz, str:"blue", fillStyle:"blue", strokeStyle:"white"}, {sh:"r", x:0, y:-0.3, size:sz, str:"magenta", fillStyle:"magenta", 
  strokeStyle:"white"}, {sh:"r", x:0.3, y:-0.3, size:sz, str:"cyan", fillStyle:"cyan", strokeStyle:"white"}, {sh:"r", x:0.15, y:0.3, size:sz, str:"white", fillStyle:"white", strokeStyle:"silver"}];
  return {name:"bottom-right color 8", modes:[A3a.vpl.mode.custom], type:A3a.vpl.blockType.action, defaultParam:function() {
    return [0];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.radiobuttonsToAccessibilityControls(buttons)), draw:function(canvas, block) {
    canvas.robotTop({withWheels:true, rgb:[block.param & 1, (block.param & 2) / 2, (block.param & 4) / 4], side:"right"});
    canvas.buttons(buttons, [block.param[0] < 1 ? -2 : 0, block.param[0] > -1 ? -2 : 0]);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      block.param = [i];
      block.endChange();
    }
    return i;
  }};
}()), new A3a.vpl.BlockTemplate({name:"notes", type:A3a.vpl.blockType.action, defaultParam:function() {
  return [0, 1, 1, 1, 2, 1, 0, 1, 2, 1, 4, 2];
}, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.notesToAccessibilityControls(0.1, 0.9, 0.9, 0.1, 6, 5)), draw:function(canvas, block) {
  canvas.notes(block.param);
}, mousedown:function(canvas, block, width, height, left, top, ev) {
  var note = canvas.noteClick(width, height, left, top, ev);
  if (note) {
    block.beginChange();
    if (block.param[2 * note.index] === note.tone) {
      block.param[2 * note.index + 1] = (block.param[2 * note.index + 1] + 1) % 3;
    } else {
      block.param[2 * note.index] = note.tone;
      block.param[2 * note.index + 1] = 1;
    }
    block.endChange();
    return 0;
  }
  return null;
}}), new A3a.vpl.BlockTemplate(function() {
  var buttons = [{sh:"t", x:-0.3, y:0.3, r:0}, {sh:"t", x:-0.3, y:-0.3, r:Math.PI}];
  return {name:"play", modes:[A3a.vpl.mode.custom], type:A3a.vpl.blockType.action, defaultParam:function() {
    return [0];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility([new A3a.vpl.BlockParamAccessibility.Control(0, 0, 1, 0.4, null, function(block) {
    block.param[0] = (block.param[0] + 1) % 100;
  }, function(block) {
    block.param[0] = (block.param[0] + 99) % 100;
  })]), draw:function(canvas, block) {
    canvas.playSDFile(block.param[0]);
    canvas.buttons(buttons, [-2, -2]);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      switch(i) {
        case 0:
          block.param[0] = (block.param[0] + 1) % 100;
          break;
        case 1:
          block.param[0] = (block.param[0] + 99) % 100;
          break;
      }
      block.endChange();
    }
    return i;
  }};
}()), new A3a.vpl.BlockTemplate({name:"play stop", modes:[A3a.vpl.mode.custom], type:A3a.vpl.blockType.action, draw:function(canvas, block) {
  canvas.playSDFile(null);
}}), new A3a.vpl.BlockTemplate({name:"set state", modes:[A3a.vpl.mode.advanced], type:A3a.vpl.blockType.action, defaultParam:function() {
  return [0, 0, 0, 0];
}, typicalParam:function() {
  return [0, 1, -1, 0];
}, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.state4ToAccessibilityControls([0, 1, -1])), draw:function(canvas, block) {
  canvas.robotTop();
  canvas.drawState(block.param);
}, mousedown:function(canvas, block, width, height, left, top, ev) {
  var i = canvas.stateClick(width, height, left, top, ev);
  if (i !== null) {
    block.beginChange();
    block.param[i] = (block.param[i] + 2) % 3 - 1;
    block.endChange();
  }
  return i;
}}), new A3a.vpl.BlockTemplate({name:"toggle state", modes:[A3a.vpl.mode.custom], type:A3a.vpl.blockType.action, defaultParam:function() {
  return [false, false, false, false];
}, typicalParam:function() {
  return [true, false, false, false];
}, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.state4ToAccessibilityControls([false, true])), draw:function(canvas, block) {
  canvas.robotTop();
  canvas.drawState(block.param.map(function(b) {
    return b ? 2 : 0;
  }));
  A3a.vpl.Canvas.drawArcArrow(canvas.ctx, canvas.dims.blockSize / 2, canvas.dims.blockSize / 2, canvas.dims.blockSize * 0.2, -1.4, 1.4, {style:"black", lineWidth:canvas.dims.blockLineWidth, arrowSize:5 * canvas.dims.blockLineWidth});
  A3a.vpl.Canvas.drawArcArrow(canvas.ctx, canvas.dims.blockSize / 2, canvas.dims.blockSize / 2, canvas.dims.blockSize * 0.2, Math.PI - 1.4, Math.PI + 1.4, {style:"black", lineWidth:canvas.dims.blockLineWidth, arrowSize:5 * canvas.dims.blockLineWidth});
}, mousedown:function(canvas, block, width, height, left, top, ev) {
  var i = canvas.stateClick(width, height, left, top, ev);
  if (i !== null) {
    block.beginChange();
    block.param[i] = !block.param[i];
    block.endChange();
  }
  return i;
}}), new A3a.vpl.BlockTemplate({name:"set state 8", modes:[A3a.vpl.mode.custom], type:A3a.vpl.blockType.action, defaultParam:function() {
  return [0];
}, paramAccessibility:new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.state8ToAccessibilityControls()), draw:function(canvas, block) {
  canvas.robotTop();
  canvas.drawState8(block.param[0]);
}, mousedown:function(canvas, block, width, height, left, top, ev) {
  var i = canvas.state8Click(width, height, left, top, ev);
  if (i !== null) {
    block.beginChange();
    block.param[0] = i;
    block.endChange();
  }
  return i;
}}), new A3a.vpl.BlockTemplate(function() {
  var buttons = [{sh:"c", x:-0.2, y:0}, {sh:"c", x:0.2, y:0}];
  return {name:"change state 8", modes:[A3a.vpl.mode.custom], type:A3a.vpl.blockType.action, defaultParam:function() {
    return [1];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility([A3a.vpl.BlockTemplate.buttonToAccessibilityControl(buttons[0], function(block) {
    block.param[0] = -1;
  }, null, null), A3a.vpl.BlockTemplate.buttonToAccessibilityControl(buttons[1], function(block) {
    block.param[0] = 1;
  }, null, null)]), draw:function(canvas, block) {
    canvas.robotTop();
    canvas.drawState8Change();
    A3a.vpl.Canvas.drawArcArrow(canvas.ctx, canvas.dims.blockSize / 2, canvas.dims.blockSize / 2, canvas.dims.blockSize * 0.375, -0.8, 0.8, {style:"black", lineWidth:canvas.dims.blockLineWidth, arrowSize:5 * canvas.dims.blockLineWidth});
    A3a.vpl.Canvas.drawArcArrow(canvas.ctx, canvas.dims.blockSize / 2, canvas.dims.blockSize / 2, canvas.dims.blockSize * 0.375, Math.PI - 0.8, Math.PI + 0.8, {arrowAtStart:true, style:"black", lineWidth:canvas.dims.blockLineWidth, arrowSize:5 * canvas.dims.blockLineWidth});
    canvas.buttons(buttons, [block.param[0] < 0, block.param[0] > 0]);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      block.param[0] = i === 0 ? -1 : 1;
      block.endChange();
    }
    return i;
  }};
}()), new A3a.vpl.BlockTemplate(function() {
  var buttons = [{sh:"t", x:0, y:0.3, r:0}, {sh:"t", x:0, y:-0.3, r:Math.PI}];
  return {name:"set counter", modes:[A3a.vpl.mode.advanced], type:A3a.vpl.blockType.action, defaultParam:function() {
    return [0];
  }, paramAccessibility:new A3a.vpl.BlockParamAccessibility([new A3a.vpl.BlockParamAccessibility.Control(0.1, 0.25, 0.9, 0.75, null, function(block) {
    block.param[0] = Math.min(1, block.param[0] + 1);
  }, function(block) {
    block.param[0] = Math.max(-1, block.param[0] - 1);
  })]), draw:function(canvas, block) {
    canvas.text(block.param[0] === 0 ? "= 0" : block.param[0] > 0 ? "+1" : "\u22121");
    canvas.buttons(buttons, [block.param[0] < 1 ? -2 : 0, block.param[0] > -1 ? -2 : 0]);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i !== null) {
      block.beginChange();
      switch(i) {
        case 0:
          block.param[0] = Math.min(1, block.param[0] + 1);
          break;
        case 1:
          block.param[0] = Math.max(-1, block.param[0] - 1);
          break;
      }
      block.endChange();
    }
    return i;
  }};
}()), new A3a.vpl.BlockTemplate({name:"set timer", modes:[A3a.vpl.mode.advanced], type:A3a.vpl.blockType.action, defaultParam:function() {
  return [1];
}, paramAccessibility:new A3a.vpl.BlockParamAccessibility([new A3a.vpl.BlockParamAccessibility.Control(0.13, 0.14, 0.93, 0.96, null, function(block) {
  block.param[0] = Math.min(block.param[0] + 0.1, 4);
}, function(block) {
  block.param[0] = Math.max(block.param[0] - 0.1, 0);
})]), draw:function(canvas, block) {
  canvas.drawTimer(block.param[0], false, false);
}, mousedown:function(canvas, block, width, height, left, top, ev) {
  if (canvas.timerCheck(width, height, left, top, ev)) {
    block.beginChange();
    return 1;
  }
  return null;
}, mousedrag:function(canvas, block, dragIndex, width, height, left, top, ev) {
  var t = canvas.timerDrag(width, height, left, top, false, ev);
  block.param[0] = t;
  block.endChange();
}}), new A3a.vpl.BlockTemplate({name:"set timer log", modes:[A3a.vpl.mode.custom], type:A3a.vpl.blockType.action, defaultParam:function() {
  return [1];
}, paramAccessibility:new A3a.vpl.BlockParamAccessibility([new A3a.vpl.BlockParamAccessibility.Control(0.13, 0.14, 0.93, 0.96, null, function(block) {
  block.param[0] = Math.round(100 * Math.min(block.param[0] * 1.05, 10)) / 100;
}, function(block) {
  block.param[0] = Math.round(100 * Math.max(block.param[0] * 0.95, 0.1)) / 100;
})]), draw:function(canvas, block) {
  canvas.drawTimer(block.param[0], false, true);
}, mousedown:function(canvas, block, width, height, left, top, ev) {
  if (canvas.timerCheck(width, height, left, top, ev)) {
    block.beginChange();
    return 1;
  }
  return null;
}, mousedrag:function(canvas, block, dragIndex, width, height, left, top, ev) {
  var t = canvas.timerDrag(width, height, left, top, true, ev);
  block.param[0] = t;
  block.endChange();
}}), new A3a.vpl.BlockTemplate(function() {
  var buttons = [{sh:"c", x:-0.33, y:-0.3, r:0}];
  function updateImage(block, loadedFun) {
    if (block.param[1]) {
      var im = new Image;
      im.src = block.param[1];
      im.addEventListener("load", function() {
        block.param[2] = im;
        loadedFun && loadedFun();
      }, false);
    }
  }
  return {name:"picture comment", modes:[A3a.vpl.mode.advanced], type:A3a.vpl.blockType.comment, defaultParam:function() {
    return [false, "", null];
  }, exportParam:function(block) {
    return block.param.length >= 2 ? [false, block.param[1]] : [false, ""];
  }, importParam:function(block, param, readyFun) {
    block.param = param.length >= 2 ? [false, param[1]] : [false, ""];
    updateImage(block, readyFun);
  }, draw:function(canvas, block) {
    if (block.param[2]) {
      canvas.ctx.drawImage(block.param[2], 0, 0, 240, 240, 0, 0, canvas.dims.blockSize, canvas.dims.blockSize);
    }
    canvas.buttons(buttons, [block.param[0]]);
  }, mousedown:function(canvas, block, width, height, left, top, ev) {
    var i = canvas.buttonClick(buttons, width, height, left, top, ev);
    if (i === 0) {
      if (block.param[0]) {
        if (A3a.webcamVideo) {
          A3a.webcamVideo["pause"] && A3a.webcamVideo["pause"]();
          A3a.webcamStream.getTracks().forEach(function(track) {
            track["stop"]();
          });
          A3a.webcamVideo = null;
        }
      } else {
        block.beginChange();
        navigator.mediaDevices.getUserMedia({"audio":false, "video":{"width":320, "height":240}}).then(function(stream) {
          A3a.webcamStream = stream;
          A3a.webcamVideo = document.createElement("video");
          A3a.webcamVideo["srcObject"] = stream;
          A3a.webcamVideo.addEventListener("loadedmetadata", function(e) {
            var id;
            function grab() {
              if (!A3a.webcamVideo) {
                clearInterval(id);
              } else {
                if (!A3a.webcamCanvas) {
                  A3a.webcamCanvas = document.createElement("canvas");
                  A3a.webcamCanvas.width = 240;
                  A3a.webcamCanvas.height = 240;
                }
                A3a.webcamCanvas.getContext("2d").drawImage(A3a.webcamVideo, 0, 0, 240, 240, 0, 0, 240, 240);
                block.param[1] = A3a.webcamCanvas.toDataURL("image/png");
                updateImage(block, function() {
                  canvas.onUpdate && canvas.onUpdate();
                  canvas.redraw();
                });
              }
            }
            A3a.webcamVideo["play"]();
            id = setInterval(grab, 100);
          }, false);
        });
      }
      block.param[0] = !block.param[0];
      block.endChange();
    }
    return i;
  }};
}())];
A3a.vpl.BlockTemplate.loadCodeGenFromJSON = function(b, genCode0) {
  function str(s) {
    return s instanceof Array ? s.join("") : s;
  }
  function substInlineA(fmtArray, param, options) {
    return fmtArray.map(function(fmt) {
      return A3a.vpl.BlockTemplate.substInline(fmt, param, options);
    });
  }
  var genCode = genCode0 || {};
  ["aseba", "l2", "js", "python"].forEach(function(lang) {
    if (b[lang]) {
      genCode[lang] = function(block, program) {
        var param = block ? block.param : [];
        var options = {slowdown:program ? program.slowdownFactor : 1, i:0};
        var c = {};
        b[lang]["initVarDecl"] && (c.initVarDecl = substInlineA(b[lang]["initVarDecl"].map(str), param, options));
        b[lang]["initCodeDecl"] && (c.initCodeDecl = substInlineA(b[lang]["initCodeDecl"].map(str), param, options));
        b[lang]["initCodeExec"] && (c.initCodeExec = substInlineA(b[lang]["initCodeExec"].map(str), param, options));
        b[lang]["sectionBegin"] && (c.sectionBegin = A3a.vpl.BlockTemplate.substInline(str(b[lang]["sectionBegin"]), param, options));
        b[lang]["sectionEnd"] && (c.sectionEnd = A3a.vpl.BlockTemplate.substInline(str(b[lang]["sectionEnd"]), param, options));
        b[lang]["sectionPreamble"] && (c.sectionPreamble = A3a.vpl.BlockTemplate.substInline(str(b[lang]["sectionPreamble"]), param, options));
        b[lang]["clauseInit"] && (c.clauseInit = A3a.vpl.BlockTemplate.substInline(str(b[lang]["clauseInit"]), param, options));
        if (b[lang]["clauseAnd"]) {
          var clause = "";
          param.forEach(function(p, i) {
            options.i = i;
            var cl = A3a.vpl.BlockTemplate.substInline(str(b[lang]["clauseAnd"]), param, options);
            if (cl) {
              clause += (clause.length > 0 ? " " + A3a.vpl.Program.codeGenerator[lang].andOperator + " " : "") + cl;
            }
          });
          c.clause = clause || A3a.vpl.Program.codeGenerator[lang].trueConstant;
        } else {
          if (b[lang]["clause"]) {
            c.clause = A3a.vpl.BlockTemplate.substInline(str(b[lang]["clause"]), param, options);
          }
        }
        b[lang]["clauseAsCondition"] && (c.clauseAsCondition = A3a.vpl.BlockTemplate.substInline(str(b[lang]["clauseAsCondition"]), param, options));
        c.clauseOptional = b[lang]["clauseOptional"] || false;
        if (b[lang]["statement1"]) {
          c.statement = param.map(function(p, i) {
            options.i = i;
            return A3a.vpl.BlockTemplate.substInline(str(b[lang]["statement1"]), param, options);
          }).join("");
        } else {
          if (b[lang]["statement"]) {
            c.statement = A3a.vpl.BlockTemplate.substInline(str(b[lang]["statement"]), param, options);
          }
        }
        b[lang]["error"] && (c.clause = A3a.vpl.BlockTemplate.substInline(str(b["error"]["error"]), param, options));
        return c;
      };
    }
  });
  return genCode;
};
var SVG = function(src) {
  this.src = src;
  this.domParser = new DOMParser;
  this.dom = this.domParser.parseFromString(src, "text/xml");
  this.root = this.dom.documentElement;
  this.viewBox = (this.root.getAttribute("viewBox") || "0 0 1 1").split(" ").map(function(s) {
    return parseFloat(s);
  });
  this.elementBoundsCache = {};
};
SVG.noGradient = true;
SVG.Options;
SVG.colorDict = {"aliceblue":"#F0F8FF", "antiquewhite":"#FAEBD7", "aqua":"#00FFFF", "aquamarine":"#7FFFD4", "azure":"#F0FFFF", "beige":"#F5F5DC", "bisque":"#FFE4C4", "black":"#000000", "blanchedalmond":"#FFEBCD", "blue":"#0000FF", "blueviolet":"#8A2BE2", "brown":"#A52A2A", "burlywood":"#DEB887", "cadetblue":"#5F9EA0", "chartreuse":"#7FFF00", "chocolate":"#D2691E", "coral":"#FF7F50", "cornflowerblue":"#6495ED", "cornsilk":"#FFF8DC", "crimson":"#DC143C", "cyan":"#00FFFF", "darkblue":"#00008B", "darkcyan":"#008B8B", 
"darkgoldenrod":"#B8860B", "darkgray":"#A9A9A9", "darkgreen":"#006400", "darkgrey":"#A9A9A9", "darkkhaki":"#BDB76B", "darkmagenta":"#8B008B", "darkolivegreen":"#556B2F", "darkorange":"#FF8C00", "darkorchid":"#9932CC", "darkred":"#8B0000", "darksalmon":"#E9967A", "darkseagreen":"#8FBC8F", "darkslateblue":"#483D8B", "darkslategray":"#2F4F4F", "darkslategrey":"#2F4F4F", "darkturquoise":"#00CED1", "darkviolet":"#9400D3", "deeppink":"#FF1493", "deepskyblue":"#00BFFF", "dimgray":"#696969", "dimgrey":"#696969", 
"dodgerblue":"#1E90FF", "firebrick":"#B22222", "floralwhite":"#FFFAF0", "forestgreen":"#228B22", "fuchsia":"#FF00FF", "gainsboro":"#DCDCDC", "ghostwhite":"#F8F8FF", "gold":"#FFD700", "goldenrod":"#DAA520", "gray":"#808080", "green":"#008000", "greenyellow":"#ADFF2F", "grey":"#808080", "honeydew":"#F0FFF0", "hotpink":"#FF69B4", "indianred":"#CD5C5C", "indigo":"#4B0082", "ivory":"#FFFFF0", "khaki":"#F0E68C", "lavender":"#E6E6FA", "lavenderblush":"#FFF0F5", "lawngreen":"#7CFC00", "lemonchiffon":"#FFFACD", 
"lightblue":"#ADD8E6", "lightcoral":"#F08080", "lightcyan":"#E0FFFF", "lightgoldenrodyellow":"#FAFAD2", "lightgray":"#D3D3D3", "lightgreen":"#90EE90", "lightgrey":"#D3D3D3", "lightpink":"#FFB6C1", "lightsalmon":"#FFA07A", "lightseagreen":"#20B2AA", "lightskyblue":"#87CEFA", "lightslategray":"#778899", "lightslategrey":"#778899", "lightsteelblue":"#B0C4DE", "lightyellow":"#FFFFE0", "lime":"#00FF00", "limegreen":"#32CD32", "linen":"#FAF0E6", "magenta":"#FF00FF", "maroon":"#800000", "mediumaquamarine":"#66CDAA", 
"mediumblue":"#0000CD", "mediumorchid":"#BA55D3", "mediumpurple":"#9370DB", "mediumseagreen":"#3CB371", "mediumslateblue":"#7B68EE", "mediumspringgreen":"#00FA9A", "mediumturquoise":"#48D1CC", "mediumvioletred":"#C71585", "midnightblue":"#191970", "mintcream":"#F5FFFA", "mistyrose":"#FFE4E1", "moccasin":"#FFE4B5", "navajowhite":"#FFDEAD", "navy":"#000080", "oldlace":"#FDF5E6", "olive":"#808000", "olivedrab":"#6B8E23", "orange":"#FFA500", "orangered":"#FF4500", "orchid":"#DA70D6", "palegoldenrod":"#EEE8AA", 
"palegreen":"#98FB98", "paleturquoise":"#AFEEEE", "palevioletred":"#DB7093", "papayawhip":"#FFEFD5", "peachpuff":"#FFDAB9", "peru":"#CD853F", "pink":"#FFC0CB", "plum":"#DDA0DD", "powderblue":"#B0E0E6", "purple":"#800080", "red":"#FF0000", "rosybrown":"#BC8F8F", "royalblue":"#4169E1", "saddlebrown":"#8B4513", "salmon":"#FA8072", "sandybrown":"#F4A460", "seagreen":"#2E8B57", "seashell":"#FFF5EE", "sienna":"#A0522D", "silver":"#C0C0C0", "skyblue":"#87CEEB", "slateblue":"#6A5ACD", "slategray":"#708090", 
"slategrey":"#708090", "snow":"#FFFAFA", "springgreen":"#00FF7F", "steelblue":"#4682B4", "tan":"#D2B48C", "teal":"#008080", "thistle":"#D8BFD8", "tomato":"#FF6347", "turquoise":"#40E0D0", "violet":"#EE82EE", "wheat":"#F5DEB3", "white":"#FFFFFF", "whitesmoke":"#F5F5F5", "yellow":"#FFFF00", "yellowgreen":"#9ACD32"};
SVG.Displacement;
SVG.ClipRect;
SVG.mergeStyle = function(baseDict, newDict) {
  for (var key in newDict) {
    if (newDict.hasOwnProperty(key)) {
      baseDict[key] = newDict[key];
    }
  }
};
SVG.copyStyle = function(dict) {
  var copy = {};
  SVG.mergeStyle(copy, dict);
  return copy;
};
SVG.parseStyle = function(dict, style) {
  style.split(";").forEach(function(st) {
    st = st.trim().split(":").map(function(s) {
      return s.trim();
    });
    if (st.length === 2) {
      var val = st[1];
      dict[st[0]] = val;
    }
  });
};
SVG.applyTransform = function(tr, doTranslate, doRotate, doScale, doApplyMatrix) {
  if (tr) {
    tr = tr.replace(/\s*\(\s*/g, "(").replace(/\s*\)\s*/g, ")").replace(/ +,/g, ",").replace(/, +/g, ",").replace(/ +/g, ",");
    var tra = tr.split(")");
    tra.slice(0, -1).forEach(function(t) {
      var c = t.split("(")[0];
      var args = t.split("(")[1].split(",").map(function(s) {
        return parseFloat(s);
      });
      switch(c) {
        case "translate":
          doTranslate(args[0] || 0, args[1] || 0);
          break;
        case "rotate":
          var a = (args[0] || 0) * Math.PI / 180;
          var x0 = args[1] || 0;
          var y0 = args[2] || 0;
          if (x0 !== 0 || y0 !== 0) {
            doTranslate(-x0, -y0);
            doRotate(a);
            doTranslate(x0, y0);
          } else {
            doRotate(a);
          }
          break;
        case "scale":
          var scx = args[0] || 1;
          var scy = args[1] || scx;
          doScale(scx, scy);
          break;
        case "matrix":
          doApplyMatrix(args[0], args[1], args[2], args[3], args[4], args[5]);
          break;
        default:
          throw "transform not implemented: " + c;
      }
    });
  }
};
SVG.applyTransformTo = function(transformString, transform) {
  SVG.applyTransform(transformString, function(dx, dy) {
    transform.translate(dx, dy);
  }, function(a) {
    transform.rotate(a);
  }, function(scx, scy) {
    transform.scale(scx, scy);
  }, function(a, b, c, d, e, f) {
    transform.matrix(a, b, c, d, e, f);
  });
};
SVG.prototype.draw = function(ctx, options) {
  var self = this;
  var css = "";
  var cssDict = {};
  var transform = new SVG.Transform.Stack;
  var xa = [];
  var ya = [];
  function ellipticalArc(rx, ry, a, largeArcFlag, sweepFlag, x1, y1, x2, y2) {
    if (rx === 0 || ry === 0) {
      ctx && ctx.lineTo(x2, y2);
      return new SVG.Transform.Point(x2, y2);
    }
    var ca = Math.cos(a);
    var sa = Math.sin(a);
    var x1p = (ca * x1 + sa * y1) / rx;
    var y1p = (-sa * x1 + ca * y1) / ry;
    var x2p = (ca * x2 + sa * y2) / rx;
    var y2p = (-sa * x2 + ca * y2) / ry;
    var xm = (x1p + x2p) / 2;
    var ym = (y1p + y2p) / 2;
    var xd = (x2p - x1p) / 2;
    var yd = (y2p - y1p) / 2;
    var a2 = xd * xd + yd * yd;
    var f = Math.sqrt((1 - a2) / a2);
    if (isNaN(f)) {
      f = 0;
    } else {
      if (largeArcFlag === sweepFlag) {
        f = -f;
      }
    }
    var xc = xm + f * yd;
    var yc = ym - f * xd;
    var th1 = Math.atan2((y1p - yc) / rx, (x1p - xc) / ry);
    var th2 = Math.atan2((y2p - yc) / rx, (x2p - xc) / ry);
    if (ctx) {
      ctx.rotate(a);
      ctx.scale(rx, ry);
      if (!sweepFlag) {
        ctx.arc(xc, yc, 1, th1, th2);
      } else {
        ctx.arc(xc, yc, 1, th1, th2, true);
      }
      ctx.scale(1 / rx, 1 / ry);
      ctx.rotate(-a);
    }
    var tr = new SVG.Transform;
    tr.rotate(a);
    tr.scale(rx, ry);
    var aMid = sweepFlag ? th1 < th2 ? (th1 + th2) / 2 + Math.PI : (th1 + th2) / 2 : th1 < th2 ? (th1 + th2) / 2 : (th1 + th2) / 2 + Math.PI;
    var pMid = tr.apply(new SVG.Transform.Point(xc + Math.cos(aMid), yc + Math.sin(aMid)));
    return pMid;
  }
  function findCSS(el) {
    switch(el.tagName) {
      case "svg":
      case "defs":
        for (var i = 0; i < el.childElementCount; i++) {
          findCSS(el.children[i]);
        }
        break;
      case "style":
        css += el.textContent;
        break;
    }
  }
  function parseCSS() {
    css.split("}").forEach(function(s) {
      var s2 = s.split("{");
      s2[0].split(",").forEach(function(cls) {
        cls = cls.trim();
        if (/^\.[-a-z0-9]+/i.test(cls)) {
          cls = cls.slice(1);
          cssDict[cls] = cssDict[cls] ? cssDict[cls] + ";" + s2[1] : s2[1];
        }
      });
    });
  }
  function applyDisplacement(el, displacement) {
    if (displacement.phi && displacement.phi != 0) {
      var x0 = displacement.x0;
      var y0 = displacement.y0;
      if (x0 == undefined || y0 == undefined) {
        var p = self.draw(null, {element:el});
        var bnds = SVG.calcBounds(p);
        x0 = (bnds.xmin + bnds.xmax) / 2;
        y0 = (bnds.ymin + bnds.ymax) / 2;
      }
      ctx.translate(x0 + (displacement.dx || 0), y0 + (displacement.dy || 0));
      ctx.rotate(displacement.phi);
      ctx.translate(-x0, -y0);
    } else {
      if (displacement.dx || displacement.dy) {
        ctx.translate(displacement.dx, displacement.dy);
      }
    }
  }
  function applyClip(el, clip) {
    ctx.beginPath();
    ctx.rect(clip.x, clip.y, clip.w, clip.h);
    ctx.clip();
  }
  function applyTransform(tr) {
    SVG.applyTransform(tr, function(dx, dy) {
      ctx && ctx.translate(dx, dy);
      transform.translate(dx, dy);
    }, function(a) {
      ctx && ctx.rotate(a);
      transform.rotate(a);
    }, function(scx, scy) {
      ctx && ctx.scale(scx, scy);
      transform.scale(scx, scy);
    }, function(a, b, c, d, e, f) {
      ctx && ctx.transform(a, b, c, d, e, f);
      transform.matrix(a, b, c, d, e, f);
    });
  }
  var drawEl = function(el, baseStyle, overriddenStyle) {
    function drawChildren() {
      for (var i = 0; i < el.childElementCount; i++) {
        drawEl(el.children[i], baseStyle, overriddenStyle);
      }
    }
    function getArg(name, def) {
      var val = el.getAttribute(name);
      return val === null ? def || 0 : parseFloat(val);
    }
    function addPoint(x, y) {
      var pt = transform.apply(new SVG.Transform.Point(x, y));
      xa.push(pt.x);
      ya.push(pt.y);
    }
    function getStyle() {
      var style = (options && options.elementStyle || "") + ";" + (el.getAttribute("style") || "");
      var classAttr = el.getAttribute("class");
      if (classAttr && cssDict.hasOwnProperty(classAttr)) {
        style = cssDict[classAttr] + ";" + style;
      }
      baseStyle = (baseStyle || "") + ";" + style;
      var styleAttr;
      styleAttr = el.getAttribute("fill");
      if (styleAttr) {
        baseStyle += ";fill:" + styleAttr;
      }
      styleAttr = el.getAttribute("stroke");
      if (styleAttr) {
        baseStyle += ";stroke:" + styleAttr;
      }
      styleAttr = el.getAttribute("stroke-width");
      if (styleAttr) {
        baseStyle += "stroke-width:" + styleAttr;
      }
      styleAttr = el.getAttribute("stroke-dasharray");
      if (styleAttr) {
        baseStyle += ";stroke-dasharray:" + styleAttr.split(",").join(" ");
      }
      styleAttr = el.getAttribute("stroke-dashoffset");
      if (styleAttr) {
        baseStyle += ";stroke-dashoffset:" + styleAttr;
      }
      if (options && options.style) {
        var idAttr = el.getAttribute("id");
        if (idAttr && options.style.hasOwnProperty(idAttr)) {
          overriddenStyle = (overriddenStyle || "") + ";" + options.style[idAttr];
        } else {
          for (var notOtherId in options.style) {
            if (options.style.hasOwnProperty(notOtherId) && notOtherId[0] === "!" && notOtherId.slice(1) !== idAttr) {
              overriddenStyle = (overriddenStyle || "") + ";" + options.style[notOtherId];
            }
          }
        }
      }
    }
    function lengthToNum(length, def, size) {
      if (length == null || length == "") {
        return def;
      }
      var r = /^\s*(-?[0-9.]+)\s*([a-z%]*)\s*$/i.exec(length);
      var x = parseFloat(r[1]);
      var mm = 3;
      switch(r[2] || "px") {
        case "pt":
          return x * 25.4 / 72 * mm;
        case "pc":
          return x * 25.4 / 6 * mm;
        case "in":
          return x * 25.4 * mm;
        case "mm":
          return x * mm;
        case "cm":
          return x * 10 * mm;
        case "em":
          return x * 6 * mm;
        case "ex":
          return x * 3 * mm;
        case "%":
          return x * size / 100;
        default:
          return x;
      }
    }
    function path(d) {
      d = d.replace(/\.([0-9]+)(?=\.)/g, ".$1 ").replace(/([.0-9])-/g, "$1 -").replace(/\s*([a-z])\s*/gi, ";$1").replace(/\s*,\s*/g, ",").replace(/\s+/g, ",");
      var x = 0;
      var y = 0;
      var xc1 = 0;
      var yc1 = 0;
      var xSubPath0 = 0;
      var ySubPath0 = 0;
      var polyX = [];
      var polyY = [];
      var polyDoCollect = true;
      ctx && ctx.beginPath();
      d.slice(1).split(";").forEach(function(c) {
        var cmd = c[0];
        var args = c.length > 1 ? c.slice(1).split(",").map(function(s) {
          return parseFloat(s);
        }) : [];
        switch(cmd) {
          case "M":
            if (args.length >= 2) {
              x = args[0];
              y = args[1];
              xSubPath0 = x;
              ySubPath0 = y;
              ctx && ctx.moveTo(x, y);
              addPoint(x, y);
              if (polyDoCollect && polyX.length > 1 && options && options.cb && options.cb.line) {
                options.cb.line(polyX, polyY, false);
              }
              polyDoCollect = true;
              polyX = xa.slice(-1);
              polyY = ya.slice(-1);
              for (var i = 2; i + 1 < args.length; i += 2) {
                x = args[i];
                y = args[i + 1];
                ctx && ctx.lineTo(x, y);
                addPoint(x, y);
                polyX.push(xa[xa.length - 1]);
                polyY.push(ya[ya.length - 1]);
              }
              xc1 = x;
              yc1 = y;
            }
            break;
          case "m":
            if (args.length >= 2) {
              x += args[0];
              y += args[1];
              xSubPath0 = x;
              ySubPath0 = y;
              ctx && ctx.moveTo(x, y);
              addPoint(x, y);
              if (polyDoCollect && polyX.length > 1 && options && options.cb && options.cb.line) {
                options.cb.line(polyX, polyY, false);
              }
              polyDoCollect = true;
              polyX = xa.slice(-1);
              polyY = ya.slice(-1);
              for (var i = 2; i + 1 < args.length; i += 2) {
                x += args[i];
                y += args[i + 1];
                ctx && ctx.lineTo(x, y);
                addPoint(x, y);
                polyX.push(xa[xa.length - 1]);
                polyY.push(ya[ya.length - 1]);
              }
            }
            xc1 = x;
            yc1 = y;
            break;
          case "L":
            for (var i = 0; i + 1 < args.length; i += 2) {
              x = args[i];
              y = args[i + 1];
              ctx && ctx.lineTo(x, y);
              addPoint(x, y);
              polyX.push(xa[xa.length - 1]);
              polyY.push(ya[ya.length - 1]);
            }
            xc1 = x;
            yc1 = y;
            break;
          case "l":
            for (var i = 0; i + 1 < args.length; i += 2) {
              x += args[i];
              y += args[i + 1];
              ctx && ctx.lineTo(x, y);
              addPoint(x, y);
              polyX.push(xa[xa.length - 1]);
              polyY.push(ya[ya.length - 1]);
            }
            xc1 = x;
            yc1 = y;
            break;
          case "H":
            for (var i = 0; i < args.length; i++) {
              x = args[i];
              ctx && ctx.lineTo(x, y);
              addPoint(x, y);
              polyX.push(xa[xa.length - 1]);
              polyY.push(ya[ya.length - 1]);
            }
            xc1 = x;
            yc1 = y;
            break;
          case "h":
            for (var i = 0; i < args.length; i++) {
              x += args[i];
              ctx && ctx.lineTo(x, y);
              addPoint(x, y);
              polyX.push(xa[xa.length - 1]);
              polyY.push(ya[ya.length - 1]);
            }
            xc1 = x;
            yc1 = y;
            break;
          case "V":
            for (var i = 0; i < args.length; i++) {
              y = args[i];
              ctx && ctx.lineTo(x, y);
              addPoint(x, y);
              polyX.push(xa[xa.length - 1]);
              polyY.push(ya[ya.length - 1]);
            }
            xc1 = x;
            yc1 = y;
            break;
          case "v":
            for (var i = 0; i < args.length; i++) {
              y += args[i];
              ctx && ctx.lineTo(x, y);
              addPoint(x, y);
              polyX.push(xa[xa.length - 1]);
              polyY.push(ya[ya.length - 1]);
            }
            xc1 = x;
            yc1 = y;
            break;
          case "A":
            for (var i = 0; i + 6 < args.length; i += 7) {
              var x1 = args[i + 5];
              var y1 = args[i + 6];
              var p = ellipticalArc(args[i], args[i + 1], args[i + 2] * Math.PI / 180, args[i + 3] != 0, args[i + 4] == 0, x, y, x1, y1);
              x = x1;
              y = y1;
              addPoint(p.x, p.y);
              addPoint(x, y);
              polyDoCollect = false;
            }
            xc1 = x;
            yc1 = y;
            break;
          case "a":
            for (var i = 0; i + 6 < args.length; i += 7) {
              var x1 = x + args[i + 5];
              var y1 = y + args[i + 6];
              var p = ellipticalArc(args[i], args[i + 1], args[i + 2] * Math.PI / 180, args[i + 3] != 0, args[i + 4] == 0, x, y, x1, y1);
              x = x1;
              y = y1;
              addPoint(p.x, p.y);
              addPoint(x, y);
              polyDoCollect = false;
            }
            xc1 = x;
            yc1 = y;
            break;
          case "C":
            for (var i = 0; i + 5 < args.length; i += 6) {
              ctx && ctx.bezierCurveTo(args[i], args[i + 1], args[i + 2], args[i + 3], args[i + 4], args[i + 5]);
              x = args[i + 4];
              y = args[i + 5];
              xc1 = 2 * x - args[i + 2];
              yc1 = 2 * y - args[i + 3];
              addPoint(x, y);
              polyDoCollect = false;
            }
            break;
          case "c":
            for (var i = 0; i + 5 < args.length; i += 6) {
              ctx && ctx.bezierCurveTo(x + args[i], y + args[i + 1], x + args[i + 2], y + args[i + 3], x + args[i + 4], y + args[i + 5]);
              xc1 = x + 2 * args[i + 4] - args[i + 2];
              yc1 = y + 2 * args[i + 5] - args[i + 3];
              x += args[i + 4];
              y += args[i + 5];
              addPoint(x, y);
              polyDoCollect = false;
            }
            break;
          case "S":
            for (var i = 0; i + 3 < args.length; i += 4) {
              ctx && ctx.bezierCurveTo(xc1, yc1, args[i], args[i + 1], args[i + 2], args[i + 3]);
              x = args[i + 2];
              y = args[i + 3];
              xc1 = 2 * x - args[i];
              yc1 = 2 * y - args[i + 1];
              addPoint(x, y);
              polyDoCollect = false;
            }
            break;
          case "s":
            for (var i = 0; i + 3 < args.length; i += 4) {
              ctx && ctx.bezierCurveTo(xc1, yc1, x + args[i], y + args[i + 1], x + args[i + 2], y + args[i + 3]);
              xc1 = x - args[i];
              yc1 = y - args[i + 1];
              x += args[i + 2];
              y += args[i + 3];
              addPoint(x, y);
              polyDoCollect = false;
            }
            break;
          case "Q":
            for (var i = 0; i + 3 < args.length; i += 4) {
              ctx && ctx.quadraticCurveTo(args[i], args[i + 1], args[i + 2], args[i + 3]);
              x = args[i + 2];
              y = args[i + 3];
              xc1 = 2 * x - args[i];
              yc1 = 2 * y - args[i + 1];
              addPoint(x, y);
              polyDoCollect = false;
            }
            break;
          case "q":
            for (var i = 0; i + 3 < args.length; i += 4) {
              ctx && ctx.quadraticCurveTo(x + args[i], y + args[i + 1], x + args[i + 2], y + args[i + 3]);
              xc1 = x + 2 * args[i + 2] - args[i];
              yc1 = y + 2 * args[i + 3] - args[i + 1];
              x += args[i + 2];
              y += args[i + 3];
              addPoint(x, y);
              polyDoCollect = false;
            }
            break;
          case "T":
            for (var i = 0; i + 1 < args.length; i += 2) {
              ctx && ctx.quadraticCurveTo(xc1, yc1, args[i], args[i + 1]);
              x = args[i];
              y = args[i + 1];
              xc1 = 2 * x - xc1;
              yc1 = 2 * y - yc1;
              addPoint(x, y);
              polyDoCollect = false;
            }
            break;
          case "t":
            for (var i = 0; i + 1 < args.length; i += 2) {
              ctx && ctx.quadraticCurveTo(xc1, yc1, x + args[i], y + args[i + 1]);
              x += args[i];
              y += args[i + 1];
              xc1 = 2 * x - xc1;
              yc1 = 2 * y - yc1;
              addPoint(x, y);
              polyDoCollect = false;
            }
            break;
          case "Z":
          case "z":
            x = xSubPath0;
            y = ySubPath0;
            ctx && ctx.closePath();
            if (polyDoCollect && polyX.length > 1 && options && options.cb && options.cb.line) {
              options.cb.line(polyX, polyY, true);
            }
            polyDoCollect = true;
            polyX = [];
            polyY = [];
            break;
          default:
            throw "unimplemented path command: " + cmd;
        }
      });
      if (polyDoCollect && polyX.length > 1 && options && options.cb && options.cb.line) {
        options.cb.line(polyX, polyY, false);
      }
    }
    function decodeFillStyle(fill) {
      function fillStopArray(stops, stopEl) {
        if (stopEl.length > 0) {
          stops.splice(0, stops.length);
          for (var i = 0; i < stopEl.length && (!SVG.noGradient || i < 1); i++) {
            var str = (stopEl[i].getAttribute("offset") || "0").trim();
            var offset = /%$/.test(str) ? parseFloat(str.slice(0, -1)) / 100 : parseFloat(str);
            var style = stopEl[i].getAttribute("style");
            var styleDict = {};
            if (style) {
              SVG.parseStyle(styleDict, style);
            }
            if (!isNaN(offset)) {
              var color = stopEl[i].getAttribute("stop-color") || styleDict["stop-color"] || "#000";
              if (SVG.colorDict.hasOwnProperty(color)) {
                color = SVG.colorDict[color];
              }
              str = (stopEl[i].getAttribute("stop-opacity") || styleDict["stop-opacity"] || "1").trim();
              var opacity = /%$/.test(str) ? parseFloat(str.slice(0, -1)) / 100 : parseFloat(str);
              if (opacity !== 1) {
                if (/^#[0-9a-f]{3}$/i.test(color)) {
                  color = "rgba(" + color.slice(1).split("").map(function(s) {
                    return parseInt(s, 16) * 17;
                  }).map(function(x) {
                    return x.toString(10);
                  }).join(",") + "," + opacity.toFixed(2) + ")";
                } else {
                  if (/^#[0-9a-f]{6}$/i.test(color)) {
                    color = "rgba(" + [color.slice(1, 3), color.slice(3, 5), color.slice(5)].map(function(s) {
                      return parseInt(s, 16);
                    }).map(function(x) {
                      return x.toString(10);
                    }).join(",") + "," + opacity.toFixed(2) + ")";
                  } else {
                    if (/^rgb(\d+%?(,|\s+)\d+%?(,|\s+)\d+%?)$/i.test(color)) {
                      color = color.slice(0, -1).replace(/\s+/g, ",") + "," + opacity.toFixed(2) + ")";
                    } else {
                      if (/^hsl(\d+%?(,|\s+)\d+%?(,|\s+)\d+%?)$/i.test(color)) {
                        color = color.slice(0, -1).replace(/\s+/g, ",") + "," + opacity.toFixed(2) + ")";
                      }
                    }
                  }
                }
              }
              stops.push({offset:offset, color:color});
            }
          }
        }
      }
      function fillLinearGradientProps(el, props) {
        if (el.attributes["xlink:href"]) {
          var href = el.getAttribute("xlink:href");
          if (href[0] === "#") {
            var targetEl = self.dom.getElementById(href.slice(1));
            if (targetEl) {
              props = fillLinearGradientProps(targetEl, props);
            }
          }
        }
        props.x1 = el.attributes["x1"] ? parseFloat(el.getAttribute("x1")) : props.x1 || 0;
        props.y1 = el.attributes["y1"] ? parseFloat(el.getAttribute("y1")) : props.y1 || 0;
        props.x2 = el.attributes["x2"] ? parseFloat(el.getAttribute("x2")) : props.x2 || 0;
        props.y2 = el.attributes["y2"] ? parseFloat(el.getAttribute("y2")) : props.y2 || 0;
        props.gradientUnits = el.attributes["gradientUnits"] ? el.getAttribute("gradientUnits") : props.gradientUnits || "objectBoundingBox";
        props.gradientTransform = el.attributes["gradientTransform"] ? el.getAttribute("gradientTransform") : props.gradientTransform || "";
        props.stops = props.stops || [];
        var stopEl = el.getElementsByTagName("stop");
        fillStopArray(props.stops, stopEl);
        return props;
      }
      function fillRadialGradientProps(el, props) {
        if (el.attributes["xlink:href"]) {
          var href = el.getAttribute("xlink:href");
          if (href[0] === "#") {
            var targetEl = self.dom.getElementById(href.slice(1));
            if (targetEl) {
              props = fillRadialGradientProps(targetEl, props);
            }
          }
        }
        props.cx = el.attributes["cx"] ? parseFloat(el.getAttribute("cx")) : props.cx || 0;
        props.cy = el.attributes["cy"] ? parseFloat(el.getAttribute("cy")) : props.cy || 0;
        props.r = el.attributes["r"] ? parseFloat(el.getAttribute("r")) : props.r || 0;
        props.gradientUnits = el.attributes["gradientUnits"] ? el.getAttribute("gradientUnits") : props.gradientUnits || "objectBoundingBox";
        props.gradientTransform = el.attributes["gradientTransform"] ? el.getAttribute("gradientTransform") : props.gradientTransform || "";
        props.stops = props.stops || [];
        var stopEl = el.getElementsByTagName("stop");
        fillStopArray(props.stops, stopEl);
        return props;
      }
      var id = /^url\(#(.+)\)$/.exec(fill);
      if (id && id[1]) {
        var targetEl = self.dom.getElementById(id[1]);
        if (targetEl) {
          switch(targetEl.tagName) {
            case "linearGradient":
              var lg = fillLinearGradientProps(targetEl, {});
              if (lg.gradientUnits === "objectBoundingBox") {
                throw "objectBoundingBox not supported";
              }
              if (lg.gradientTransform) {
                var gradientTransform = new SVG.Transform;
                SVG.applyTransformTo(lg.gradientTransform, gradientTransform);
                throw "gradientTransform not supported";
              }
              var linearGradient = ctx.createLinearGradient(lg.x1, lg.y1, lg.x2, lg.y2);
              for (var i = 0; i < lg.stops.length; i++) {
                linearGradient.addColorStop(lg.stops[i].offset, lg.stops[i].color);
              }
              return linearGradient;
            case "radialGradient":
              var rg = fillRadialGradientProps(targetEl, {});
              if (rg.gradientUnits === "objectBoundingBox") {
                throw "objectBoundingBox not supported";
              }
              if (rg.gradientTransform) {
                var gradientTransform = new SVG.Transform;
                SVG.applyTransformTo(rg.gradientTransform, gradientTransform);
                var centerTr = gradientTransform.applyInverse({x:rg.cx, y:rg.cy});
                var radiusTr = rg.r / gradientTransform.getScale();
                rg.cx = centerTr.x;
                rg.cy = centerTr.y;
                rg.r = radiusTr;
              }
              var radialGradient = ctx.createRadialGradient(rg.cx, rg.cy, 0, rg.cx, rg.cy, rg.r);
              for (var i = 0; i < rg.stops.length; i++) {
                radialGradient.addColorStop(rg.stops[i].offset, rg.stops[i].color);
              }
              return radialGradient;
          }
        }
      }
      return fill;
    }
    function roundedRect(x, y, w, h, rx, ry) {
      if (rx <= 0 || ry <= 0) {
        ctx.rect(x, y, w, h);
      } else {
        var r = Math.min((rx + ry) / 2, Math.min(w, h) / 2);
        ctx.moveTo(x + w - r, y);
        ctx.arc(x + w - r, y + r, r, 1.5 * Math.PI, 2 * Math.PI);
        ctx.lineTo(x + w, y + h - r);
        ctx.arc(x + w - r, y + h - r, r, 0, 0.5 * Math.PI);
        ctx.lineTo(x + r, y + h);
        ctx.arc(x + r, y + h - r, r, 0.5 * Math.PI, Math.PI);
        ctx.lineTo(x, y + r);
        ctx.arc(x + r, y + r, r, Math.PI, 1.5 * Math.PI);
        ctx.closePath();
      }
    }
    function paint() {
      if (ctx) {
        var styleStr = (baseStyle || "") + ";" + (overriddenStyle || "");
        var style = {};
        if (styleStr) {
          SVG.parseStyle(style, styleStr);
        }
        if (style["visibility"] !== "hidden") {
          if (style["opacity"]) {
            ctx.globalAlpha *= parseFloat(style["opacity"]);
          }
          if (!style["fill"] || style["fill"] !== "none") {
            ctx.fillStyle = style["fill"] === "white" || style["fill"] === "#fff" || style["fill"] === "#ffffff" ? "white" : decodeFillStyle(style["fill"]) || "none";
            ctx.fill();
          }
          if (style["stroke"] && style["stroke"] !== "none") {
            ctx.lineWidth = lengthToNum(style["stroke-width"] || "1px", 1, 100);
            ctx.strokeStyle = style["stroke"] || "none";
            ctx.miterLimit = style["stroke-miterlimit"] || 4;
            ctx.lineJoin = style["stroke-linejoin"] || "miter";
            ctx.lineCap = style["stroke-linecap"] || "butt";
            if (style["stroke-dasharray"]) {
              ctx.setLineDash(style["stroke-dasharray"].split(" ").map(function(s) {
                return parseFloat(s);
              }));
              ctx.lineDashOffset = style["stroke-dashoffset"] ? parseFloat(style["stroke-dashoffset"]) : 0;
            }
            ctx.stroke();
          }
        }
      }
    }
    function paintText(str, x, y) {
      if (ctx) {
        var styleStr = (baseStyle || "") + ";" + (overriddenStyle || "");
        var style = {};
        if (styleStr) {
          SVG.parseStyle(style, styleStr);
        }
        if (style["visibility"] !== "hidden") {
          var fontSize = style["font-size"] || "12px";
          var fontFamily = style["font-family"] || "helvetica";
          ctx.font = fontSize + " " + fontFamily;
          if (style["fill"] && style["fill"] !== "none") {
            ctx.fillStyle = style["fill"] === "white" || style["fill"] === "#fff" || style["fill"] === "#ffffff" ? "white" : options && options.fill || "silver";
            ctx.fillText(str, x, y);
          }
          if (style["stroke"] && style["stroke"] !== "none") {
            ctx.strokeStyle = options && options.stroke || "black";
            ctx.strokeText(str, x, y);
          }
        }
      }
    }
    function drawBoundingBox(xa, ya) {
      var bnds = SVG.calcBounds({x:xa, y:ya});
      ctx.save();
      ctx.strokeStyle = "black";
      ctx.lineWidth = 1;
      ctx.strokeRect(bnds.xmin, bnds.ymin, bnds.xmax - bnds.xmin, bnds.ymax - bnds.ymin);
      ctx.restore();
    }
    var idAttr = el.getAttribute("id");
    var displacement = idAttr && options && options.displacement && options.displacement[idAttr];
    var clip = idAttr && options && options.clips && options.clips[idAttr];
    ctx && ctx.save();
    transform.save();
    if (displacement && ctx) {
      applyDisplacement(el, displacement);
    }
    if (clip && ctx) {
      applyClip(el, clip);
    }
    getStyle();
    var ptLen0 = xa.length;
    switch(el.tagName) {
      case "svg":
        transform.save();
        applyTransform(el.getAttribute("transform"));
        drawChildren();
        transform.restore();
        break;
      case "g":
        transform.save();
        applyTransform(el.getAttribute("transform"));
        drawChildren();
        transform.restore();
        break;
      case "path":
        ctx && ctx.save();
        transform.save();
        applyTransform(el.getAttribute("transform"));
        path(el.getAttribute("d") || "");
        paint();
        ctx && ctx.restore();
        transform.restore();
        break;
      case "line":
        var x = getArg("x1");
        var y = getArg("y1");
        var x2 = getArg("x2");
        var y2 = getArg("y2");
        ctx && ctx.save();
        transform.save();
        applyTransform(el.getAttribute("transform"));
        ctx && ctx.beginPath();
        ctx && ctx.moveTo(x, y);
        ctx && ctx.lineTo(x2, y2);
        paint();
        addPoint(x, y);
        addPoint(x2, y2);
        if (options && options.cb && options.cb.line) {
          options.cb.line([x, x2], [y, y2], false);
        }
        ctx && ctx.restore();
        transform.restore();
        break;
      case "polygon":
      case "polyline":
        var points = el.getAttribute("points").trim().replace(/\s+/g, " ").split(" ").map(function(s) {
          return parseFloat(s);
        });
        if (points.length >= 4) {
          ctx && ctx.save();
          transform.save();
          applyTransform(el.getAttribute("transform"));
          ctx && ctx.beginPath();
          ctx && ctx.moveTo(points[0], points[1]);
          addPoint(points[0], points[1]);
          for (var i = 2; i + 1 < points.length; i += 2) {
            ctx && ctx.lineTo(points[i], points[i + 1]);
            addPoint(points[i], points[i + 1]);
          }
          if (el.tagName === "polygon") {
            ctx.closePath();
          }
          paint();
          if (options && options.cb && options.cb.line) {
            options.cb.line(xa.slice(-points.length / 2), ya.slice(-points.length / 2), el.tagName === "polygon");
          }
          ctx && ctx.restore();
          transform.restore();
        }
        break;
      case "circle":
        var x = getArg("cx");
        var y = getArg("cy");
        var r = getArg("r");
        ctx && ctx.save();
        transform.save();
        applyTransform(el.getAttribute("transform"));
        ctx && ctx.beginPath();
        ctx && ctx.arc(x, y, r, 0, 2 * Math.PI);
        paint();
        addPoint(x - r, y - r);
        addPoint(x - r, y + r);
        addPoint(x + r, y - r);
        addPoint(x + r, y + r);
        if (options && options.cb && options.cb.circle) {
          var x4 = xa.slice(-4);
          var y4 = ya.slice(-4);
          var diag12 = (x4[3] - x4[0]) * (x4[3] - x4[0]) + (y4[3] - y4[0]) * (y4[3] - y4[0]);
          var diag22 = (x4[2] - x4[1]) * (x4[2] - x4[1]) + (y4[2] - y4[1]) * (y4[2] - y4[1]);
          if (Math.abs(diag12 - diag22) / (diag12 + diag22) < 1e-3 && ((x4[3] - x4[0]) * (x4[2] - x4[1]) + (y4[3] - y4[0]) * (y4[2] - y4[1])) / diag12 < 1e-3) {
            options.cb.circle((x4[0] + x4[2]) / 2, (y4[0] + y4[2]) / 2, Math.sqrt(diag12 / 8));
          }
        }
        ctx && ctx.restore();
        transform.restore();
        break;
      case "rect":
        var x = getArg("x");
        var y = getArg("y");
        var width = getArg("width");
        var height = getArg("height");
        var rx = getArg("rx");
        var ry = getArg("ry", rx);
        rx = getArg("rx", ry);
        ctx && ctx.save();
        transform.save();
        applyTransform(el.getAttribute("transform"));
        if (ctx) {
          ctx.beginPath();
          if (rx > 0 || ry > 0) {
            roundedRect(x, y, width, height, rx, ry);
          } else {
            ctx.rect(x, y, width, height);
          }
        }
        paint();
        addPoint(x, y);
        addPoint(x, y + height);
        addPoint(x + width, y);
        addPoint(x + width, y + height);
        ctx && ctx.restore();
        transform.restore();
        break;
      case "text":
        var x = getArg("x");
        var y = getArg("y");
        ctx && ctx.save();
        transform.save();
        applyTransform(el.getAttribute("transform"));
        paintText(el.textContent, x, y);
        addPoint(x, y);
        ctx && ctx.restore();
        transform.restore();
        break;
    }
    ctx && ctx.restore();
    transform.restore();
    ctx && options && options.drawBoundingBox && drawBoundingBox(xa.slice(ptLen0), ya.slice(ptLen0));
  };
  findCSS(this.root);
  parseCSS();
  var element = this.root;
  if (options && options.elementId) {
    element = this.dom.getElementById(options.elementId);
  } else {
    if (options && options.element) {
      element = options.element;
    }
  }
  if (element) {
    if (options && options.globalTransform) {
      options.globalTransform(ctx, this.viewBox);
    }
    if (ctx) {
      var ancestors = [];
      for (var ancestor = element.parentElement; ancestor != null; ancestor = ancestor.parentElement) {
        ancestors.push(ancestor);
      }
      for (var i = ancestors.length - 1; i >= 0; i--) {
        var idAttr = ancestors[i].getAttribute("id");
        var displacement = idAttr && options && options.displacement && options.displacement[idAttr];
        if (displacement) {
          applyDisplacement(ancestors[i], displacement);
        }
        var tr = ancestors[i].getAttribute("transform");
        applyTransform(tr);
      }
    }
    drawEl(element);
  }
  return {x:xa, y:ya};
};
SVG.calcBounds = function(p) {
  if (p.x.length === 0) {
    return {xmin:0, xmax:0, ymin:0, ymax:0};
  }
  var xmin = p.x[0];
  var xmax = p.x[0];
  var ymin = p.y[0];
  var ymax = p.y[0];
  for (var i = 1; i < p.x.length; i++) {
    xmin = Math.min(xmin, p.x[i]);
    xmax = Math.max(xmax, p.x[i]);
    ymin = Math.min(ymin, p.y[i]);
    ymax = Math.max(ymax, p.y[i]);
  }
  return {xmin:xmin, xmax:xmax, ymin:ymin, ymax:ymax};
};
SVG.prototype.getElementBounds = function(elementId) {
  if (this.elementBoundsCache[elementId]) {
    return this.elementBoundsCache[elementId];
  }
  var p = this.draw(null, {elementId:elementId});
  var bnds = SVG.calcBounds(p);
  this.elementBoundsCache[elementId] = bnds;
  return bnds;
};
SVG.prototype.isInside = function(elementId, x, y) {
  var bnds = this.getElementBounds(elementId);
  return x >= bnds.xmin && x <= bnds.xmax && y >= bnds.ymin && y <= bnds.ymax;
};
SVG.prototype.hasElement = function(elementId) {
  return this.dom.getElementById(elementId) != null;
};
SVG.prototype.hasAncestor = function(elementId, ancestorId) {
  var element = this.dom.getElementById(elementId);
  var ancestor = this.dom.getElementById(ancestorId);
  return ancestor != null && element != null && ancestor.contains(element);
};
SVG.prototype.toImage = function() {
  var canvas = document.createElement("canvas");
  canvas.width = this.viewBox[2];
  canvas.height = this.viewBox[3];
  var ctx = canvas.getContext("2d");
  this.draw(ctx);
  var img = new Image;
  img.src = canvas.toDataURL();
  return img;
};
SVG.drawFromURI = function(uri, ctx, options) {
  var xhr = new XMLHttpRequest;
  xhr.addEventListener("load", function() {
    var svg = new SVG(this.response);
    svg.draw(ctx, options);
  });
  xhr.open("GET", uri);
  xhr.send();
};
SVG.Preparsed = function(src) {
  SVG.call(this, src);
  this.doc = {};
  this.idCache = {};
  this.cssDict = {};
  this.parse();
};
SVG.Preparsed.prototype = Object.create(SVG.prototype);
SVG.Preparsed.prototype.constructor = SVG.Preparsed;
SVG.Preparsed.prototype.parse = function() {
  var self = this;
  var css = "";
  function findCSS(el) {
    switch(el.tagName) {
      case "svg":
      case "defs":
        for (var i = 0; i < el.childElementCount; i++) {
          findCSS(el.children[i]);
        }
        break;
      case "style":
        css += el.textContent;
        break;
    }
  }
  function parseCSS() {
    var cssDict = {};
    css.split("}").forEach(function(s) {
      var s2 = s.split("{");
      s2[0].split(",").forEach(function(cls) {
        cls = cls.trim();
        if (/^\.[-a-z0-9]+/i.test(cls)) {
          cls = cls.slice(1);
          cssDict[cls] = cssDict[cls] ? cssDict[cls] + ";" + s2[1] : s2[1];
        }
      });
    });
    return cssDict;
  }
  function parseTransform(tr) {
    if (tr) {
      tr = tr.replace(/\s*\(\s*/g, "(").replace(/\s*\)\s*/g, ")").replace(/ +,/g, ",").replace(/, +/g, ",").replace(/ +/g, ",");
      var tra = tr.split(")");
      return tra.slice(0, -1).map(function(t) {
        var c = t.split("(")[0];
        var args = t.split("(")[1].split(",").map(function(s) {
          return parseFloat(s);
        });
        switch(c) {
          case "translate":
            return {cmd:c, args:[args[0] || 0, args[1] || 0]};
          case "rotate":
            var a = (args[0] || 0) * Math.PI / 180;
            var x0 = args[1] || 0;
            var y0 = args[2] || 0;
            return {cmd:c, args:[a, x0, y0]};
          case "scale":
            var scx = args[0] || 1;
            var scy = args[1] || scx;
            return {cmd:c, args:[scx, scy]};
          case "matrix":
            return {cmd:c, args:args};
          default:
            throw "transform not implemented: " + c;
        }
      });
    }
    return null;
  }
  function parseEl(el, parent) {
    function parseChildren(parent) {
      var children = [];
      for (var i = 0; i < el.childElementCount; i++) {
        var obj = parseEl(el.children[i], parent);
        if (obj) {
          children.push(obj);
        }
      }
      return children;
    }
    function getArg(name, def) {
      var val = el.getAttribute(name);
      return val === null ? def || 0 : parseFloat(val);
    }
    function getStyle() {
      var styleStr = el.getAttribute("style") || "";
      var classAttr = el.getAttribute("class");
      if (classAttr && self.cssDict.hasOwnProperty(classAttr)) {
        styleStr = self.cssDict[classAttr] + ";" + styleStr;
      }
      var styleDict = {};
      SVG.parseStyle(styleDict, styleStr);
      var styleAttr;
      styleAttr = el.getAttribute("fill");
      if (styleAttr) {
        styleDict["fill"] = styleAttr;
      }
      styleAttr = el.getAttribute("stroke");
      if (styleAttr) {
        styleDict["stroke"] = styleAttr;
      }
      styleAttr = el.getAttribute("stroke-width");
      if (styleAttr) {
        styleDict["stroke-width"] = styleAttr;
      }
      styleAttr = el.getAttribute("stroke-dasharray");
      if (styleAttr) {
        styleDict["stroke-dasharray"] = styleAttr.split(",");
      }
      styleAttr = el.getAttribute("stroke-dashoffset");
      if (styleAttr) {
        styleDict["stroke-dashoffset"] = styleAttr;
      }
      var idAttr = el.getAttribute("id");
      if (idAttr) {
        styleDict["id"] = idAttr;
      }
      return styleDict;
    }
    function lengthToNum(length, def, size) {
      if (length == null || length == "") {
        return def;
      }
      var r = /^\s*(-?[0-9.]+)\s*([a-z%]*)\s*$/i.exec(length);
      var x = parseFloat(r[1]);
      var mm = 3;
      switch(r[2] || "px") {
        case "pt":
          return x * 25.4 / 72 * mm;
        case "pc":
          return x * 25.4 / 6 * mm;
        case "in":
          return x * 25.4 * mm;
        case "mm":
          return x * mm;
        case "cm":
          return x * 10 * mm;
        case "em":
          return x * 6 * mm;
        case "ex":
          return x * 3 * mm;
        case "%":
          return x * size / 100;
        default:
          return x;
      }
    }
    function path(d) {
      d = d.replace(/\.([0-9]+)(?=\.)/g, ".$1 ").replace(/([.0-9])-/g, "$1 -").replace(/\s*([a-z])\s*/gi, ";$1").replace(/\s*,\s*/g, ",").replace(/\s+/g, ",");
      var cmds = [];
      var x = 0;
      var y = 0;
      var xc1 = 0;
      var yc1 = 0;
      var xSubPath0 = 0;
      var ySubPath0 = 0;
      d.slice(1).split(";").forEach(function(c) {
        var cmd = c[0];
        var args = c.length > 1 ? c.slice(1).split(",").map(function(s) {
          return parseFloat(s);
        }) : [];
        switch(cmd) {
          case "M":
            if (args.length >= 2) {
              x = args[0];
              y = args[1];
              xSubPath0 = x;
              ySubPath0 = y;
              cmds.push({cmd:"M", args:[x, y]});
              for (var i = 2; i + 1 < args.length; i += 2) {
                x = args[i];
                y = args[i + 1];
                cmds.push({cmd:"L", args:[x, y]});
              }
              xc1 = x;
              yc1 = y;
            }
            break;
          case "m":
            if (args.length >= 2) {
              x += args[0];
              y += args[1];
              xSubPath0 = x;
              ySubPath0 = y;
              cmds.push({cmd:"M", args:[x, y]});
              for (var i = 2; i + 1 < args.length; i += 2) {
                x += args[i];
                y += args[i + 1];
                cmds.push({cmd:"L", args:[x, y]});
              }
            }
            xc1 = x;
            yc1 = y;
            break;
          case "L":
            for (var i = 0; i + 1 < args.length; i += 2) {
              x = args[i];
              y = args[i + 1];
              cmds.push({cmd:"L", args:[x, y]});
            }
            xc1 = x;
            yc1 = y;
            break;
          case "l":
            for (var i = 0; i + 1 < args.length; i += 2) {
              x += args[i];
              y += args[i + 1];
              cmds.push({cmd:"L", args:[x, y]});
            }
            xc1 = x;
            yc1 = y;
            break;
          case "H":
            for (var i = 0; i < args.length; i++) {
              x = args[i];
              cmds.push({cmd:"L", args:[x, y]});
            }
            xc1 = x;
            yc1 = y;
            break;
          case "h":
            for (var i = 0; i < args.length; i++) {
              x += args[i];
              cmds.push({cmd:"L", args:[x, y]});
            }
            xc1 = x;
            yc1 = y;
            break;
          case "V":
            for (var i = 0; i < args.length; i++) {
              y = args[i];
              cmds.push({cmd:"L", args:[x, y]});
            }
            xc1 = x;
            yc1 = y;
            break;
          case "v":
            for (var i = 0; i < args.length; i++) {
              y += args[i];
              cmds.push({cmd:"L", args:[x, y]});
            }
            xc1 = x;
            yc1 = y;
            break;
          case "A":
            for (var i = 0; i + 6 < args.length; i += 7) {
              var x1 = args[i + 5];
              var y1 = args[i + 6];
              cmds.push({cmd:"A", args:[args[i], args[i + 1], args[i + 2] * Math.PI / 180, args[i + 3] != 0 ? 1 : 0, args[i + 4] == 0 ? 1 : 0, x, y, x1, y1]});
              x = x1;
              y = y1;
            }
            xc1 = x;
            yc1 = y;
            break;
          case "a":
            for (var i = 0; i + 6 < args.length; i += 7) {
              var x1 = x + args[i + 5];
              var y1 = y + args[i + 6];
              cmds.push({cmd:"A", args:[args[i], args[i + 1], args[i + 2] * Math.PI / 180, args[i + 3] != 0, args[i + 4] == 0, x, y, x1, y1]});
              x = x1;
              y = y1;
            }
            xc1 = x;
            yc1 = y;
            break;
          case "C":
            for (var i = 0; i + 5 < args.length; i += 6) {
              cmds.push({cmd:"C", args:args.slice(i, i + 6)});
              x = args[i + 4];
              y = args[i + 5];
              xc1 = 2 * x - args[i + 2];
              yc1 = 2 * y - args[i + 3];
            }
            break;
          case "c":
            for (var i = 0; i + 5 < args.length; i += 6) {
              cmds.push({cmd:"C", args:[x + args[i], y + args[i + 1], x + args[i + 2], y + args[i + 3], x + args[i + 4], y + args[i + 5]]});
              xc1 = x + 2 * args[i + 4] - args[i + 2];
              yc1 = y + 2 * args[i + 5] - args[i + 3];
              x += args[i + 4];
              y += args[i + 5];
            }
            break;
          case "S":
            for (var i = 0; i + 3 < args.length; i += 4) {
              cmds.push({cmd:"S", args:[xc1, yc1, args[i], args[i + 1], args[i + 2], args[i + 3]]});
              x = args[i + 2];
              y = args[i + 3];
              xc1 = 2 * x - args[i];
              yc1 = 2 * y - args[i + 1];
            }
            break;
          case "s":
            for (var i = 0; i + 3 < args.length; i += 4) {
              cmds.push({cmd:"S", args:[xc1, yc1, x + args[i], y + args[i + 1], x + args[i + 2], y + args[i + 3]]});
              xc1 = x - args[i];
              yc1 = y - args[i + 1];
              x += args[i + 2];
              y += args[i + 3];
            }
            break;
          case "Q":
            for (var i = 0; i + 3 < args.length; i += 4) {
              cmds.push({cmd:"Q", args:[args[i], args[i + 1], args[i + 2], args[i + 3]]});
              x = args[i + 2];
              y = args[i + 3];
              xc1 = 2 * x - args[i];
              yc1 = 2 * y - args[i + 1];
            }
            break;
          case "q":
            for (var i = 0; i + 3 < args.length; i += 4) {
              cmds.push({cmd:"Q", args:[x + args[i], y + args[i + 1], x + args[i + 2], y + args[i + 3]]});
              xc1 = x + 2 * args[i + 2] - args[i];
              yc1 = y + 2 * args[i + 3] - args[i + 1];
              x += args[i + 2];
              y += args[i + 3];
            }
            break;
          case "T":
            for (var i = 0; i + 1 < args.length; i += 2) {
              cmds.push({cmd:"Q", args:[xc1, yc1, args[i], args[i + 1]]});
              x = args[i];
              y = args[i + 1];
              xc1 = 2 * x - xc1;
              yc1 = 2 * y - yc1;
            }
            break;
          case "t":
            for (var i = 0; i + 1 < args.length; i += 2) {
              cmds.push({cmd:"Q", args:[xc1, yc1, x + args[i], y + args[i + 1]]});
              x += args[i];
              y += args[i + 1];
              xc1 = 2 * x - xc1;
              yc1 = 2 * y - yc1;
            }
            break;
          case "Z":
          case "z":
            x = xSubPath0;
            y = ySubPath0;
            cmds.push({cmd:"Z", args:[]});
            break;
          default:
            throw "unimplemented path command: " + cmd;
        }
      });
      return cmds;
    }
    var idAttr = el.getAttribute("id");
    var style = getStyle();
    var obj = {name:el.tagName, id:idAttr, style:style, parent:parent};
    switch(el.tagName) {
      case "svg":
        obj.children = parseChildren(obj);
        break;
      case "g":
        obj.children = parseChildren(obj);
        obj.transform = parseTransform(el.getAttribute("transform"));
        break;
      case "path":
        obj.path = path(el.getAttribute("d") || "");
        obj.transform = parseTransform(el.getAttribute("transform"));
        break;
      case "line":
        obj.x1 = getArg("x1");
        obj.y1 = getArg("y1");
        obj.x2 = getArg("x2");
        obj.y2 = getArg("y2");
        obj.transform = parseTransform(el.getAttribute("transform"));
        break;
      case "polygon":
      case "polyline":
        obj.points = el.getAttribute("points").trim().replace(/\s+/g, " ").split(" ").map(function(s) {
          return parseFloat(s);
        });
        obj.transform = parseTransform(el.getAttribute("transform"));
        break;
      case "circle":
        obj.x = getArg("cx");
        obj.y = getArg("cy");
        obj.r = getArg("r");
        obj.transform = parseTransform(el.getAttribute("transform"));
        break;
      case "rect":
        obj.x = getArg("x");
        obj.y = getArg("y");
        obj.width = getArg("width");
        obj.height = getArg("height");
        var rx = getArg("rx");
        var ry = getArg("ry", rx);
        rx = getArg("rx", ry);
        obj.rx = rx;
        obj.ry = ry;
        obj.transform = parseTransform(el.getAttribute("transform"));
        break;
      case "text":
        obj.x = getArg("x");
        obj.y = getArg("y");
        obj.text = el.textContent;
        obj.transform = parseTransform(el.getAttribute("transform"));
        break;
      default:
        return null;
    }
    return obj;
  }
  findCSS(this.root);
  this.cssDict = parseCSS();
  if (this.root) {
    this.doc = parseEl(this.root, null);
  }
};
SVG.Preparsed.prototype.findById = function(id) {
  function findById(el, id) {
    if (el.id === id) {
      return el;
    } else {
      if (el.children) {
        for (var i = 0; i < el.children.length; i++) {
          var r = findById(el.children[i], id);
          if (r) {
            return r;
          }
        }
      }
    }
    return null;
  }
  if (this.idCache[id]) {
    return this.idCache[id];
  }
  var obj = findById(this.doc, id);
  if (obj) {
    this.idCache[id] = obj;
  }
  return obj;
};
SVG.Preparsed.applyTransform = function(tr, doTranslate, doRotate, doScale, doApplyMatrix) {
  if (tr) {
    tr.forEach(function(t) {
      switch(t.cmd) {
        case "translate":
          doTranslate(t.args[0], t.args[1]);
          break;
        case "rotate":
          if (t.args[1] !== 0 || t.args[2] !== 0) {
            doTranslate(-t.args[1], -t.args[2]);
            doRotate(t.args[0]);
            doTranslate(t.args[1], t.args[2]);
          } else {
            doRotate(t.args[0]);
          }
          break;
        case "scale":
          doScale(t.args[0], t.args[1]);
          break;
        case "matrix":
          doApplyMatrix(t.args[0], t.args[1], t.args[2], t.args[3], t.args[4], t.args[5]);
          break;
      }
    });
  }
};
SVG.Preparsed.prototype.draw = function(ctx, options) {
  var self = this;
  var transform = new SVG.Transform.Stack;
  var xa = [];
  var ya = [];
  function ellipticalArc(rx, ry, a, largeArcFlag, sweepFlag, x1, y1, x2, y2) {
    if (rx === 0 || ry === 0) {
      ctx && ctx.lineTo(x2, y2);
      return new SVG.Transform.Point(x2, y2);
    }
    var ca = Math.cos(a);
    var sa = Math.sin(a);
    var x1p = (ca * x1 + sa * y1) / rx;
    var y1p = (-sa * x1 + ca * y1) / ry;
    var x2p = (ca * x2 + sa * y2) / rx;
    var y2p = (-sa * x2 + ca * y2) / ry;
    var xm = (x1p + x2p) / 2;
    var ym = (y1p + y2p) / 2;
    var xd = (x2p - x1p) / 2;
    var yd = (y2p - y1p) / 2;
    var a2 = xd * xd + yd * yd;
    var f = Math.sqrt((1 - a2) / a2);
    if (isNaN(f)) {
      f = 0;
    } else {
      if (largeArcFlag === sweepFlag) {
        f = -f;
      }
    }
    var xc = xm + f * yd;
    var yc = ym - f * xd;
    var th1 = Math.atan2((y1p - yc) / rx, (x1p - xc) / ry);
    var th2 = Math.atan2((y2p - yc) / rx, (x2p - xc) / ry);
    if (ctx) {
      ctx.rotate(a);
      ctx.scale(rx, ry);
      if (!sweepFlag) {
        ctx.arc(xc, yc, 1, th1, th2);
      } else {
        ctx.arc(xc, yc, 1, th1, th2, true);
      }
      ctx.scale(1 / rx, 1 / ry);
      ctx.rotate(-a);
    }
    var tr = new SVG.Transform;
    tr.rotate(a);
    tr.scale(rx, ry);
    var aMid = sweepFlag ? th1 < th2 ? (th1 + th2) / 2 + Math.PI : (th1 + th2) / 2 : th1 < th2 ? (th1 + th2) / 2 : (th1 + th2) / 2 + Math.PI;
    var pMid = tr.apply(new SVG.Transform.Point(xc + Math.cos(aMid), yc + Math.sin(aMid)));
    return pMid;
  }
  function applyDisplacement(el, displacement) {
    if (displacement.phi && displacement.phi != 0) {
      var x0 = displacement.x0;
      var y0 = displacement.y0;
      if (x0 == undefined || y0 == undefined) {
        var p = self.draw(null, {obj:el});
        var bnds = SVG.calcBounds(p);
        x0 = (bnds.xmin + bnds.xmax) / 2;
        y0 = (bnds.ymin + bnds.ymax) / 2;
      }
      ctx.translate(x0 + (displacement.dx || 0), y0 + (displacement.dy || 0));
      ctx.rotate(displacement.phi);
      ctx.translate(-x0, -y0);
    } else {
      if (displacement.dx || displacement.dy) {
        ctx.translate(displacement.dx, displacement.dy);
      }
    }
  }
  function applyClip(clip) {
    ctx.beginPath();
    ctx.rect(clip.x, clip.y, clip.w, clip.h);
    ctx.clip();
  }
  function applyTransform(tr) {
    SVG.Preparsed.applyTransform(tr, function(dx, dy) {
      ctx && ctx.translate(dx, dy);
      transform.translate(dx, dy);
    }, function(a) {
      ctx && ctx.rotate(a);
      transform.rotate(a);
    }, function(scx, scy) {
      ctx && ctx.scale(scx, scy);
      transform.scale(scx, scy);
    }, function(a, b, c, d, e, f) {
      ctx && ctx.transform(a, b, c, d, e, f);
      transform.matrix(a, b, c, d, e, f);
    });
  }
  var drawEl = function(el, baseStyleDict, overriddenStyleDict) {
    function drawChildren() {
      for (var i = 0; i < el.children.length; i++) {
        drawEl(el.children[i], baseStyleDict, overriddenStyleDict);
      }
    }
    function addPoint(x, y) {
      var pt = transform.apply(new SVG.Transform.Point(x, y));
      xa.push(pt.x);
      ya.push(pt.y);
    }
    function getStyle() {
      if (el.style) {
        SVG.mergeStyle(baseStyleDict, el.style);
      }
      if (options && options.elementStyle) {
        SVG.parseStyle(baseStyleDict, options.elementStyle);
      }
      if (el.id && options && options.style && options.style.hasOwnProperty(el.id)) {
        SVG.parseStyle(overriddenStyleDict, options.style[el.id]);
      }
      for (var notOtherId in options.style) {
        if (options.style.hasOwnProperty(notOtherId) && notOtherId[0] === "!" && notOtherId.slice(1) !== el.id) {
          SVG.parseStyle(overriddenStyleDict, options.style[notOtherId]);
        }
      }
    }
    function lengthToNum(length, def, size) {
      if (length == null || length == "") {
        return def;
      }
      var r = /^\s*(-?[0-9.]+)\s*([a-z%]*)\s*$/i.exec(length);
      var x = parseFloat(r[1]);
      var mm = 3;
      switch(r[2] || "px") {
        case "pt":
          return x * 25.4 / 72 * mm;
        case "pc":
          return x * 25.4 / 6 * mm;
        case "in":
          return x * 25.4 * mm;
        case "mm":
          return x * mm;
        case "cm":
          return x * 10 * mm;
        case "em":
          return x * 6 * mm;
        case "ex":
          return x * 3 * mm;
        case "%":
          return x * size / 100;
        default:
          return x;
      }
    }
    function path(d) {
      var x = 0;
      var y = 0;
      var xc1 = 0;
      var yc1 = 0;
      var polyX = [];
      var polyY = [];
      var polyDoCollect = true;
      ctx && ctx.beginPath();
      d.forEach(function(c) {
        switch(c.cmd) {
          case "M":
            if (c.args.length >= 2) {
              x = c.args[0];
              y = c.args[1];
              ctx && ctx.moveTo(x, y);
              addPoint(x, y);
              if (polyDoCollect && polyX.length > 1 && options && options.cb && options.cb.line) {
                options.cb.line(polyX, polyY, false);
              }
              polyDoCollect = true;
              polyX = xa.slice(-1);
              polyY = ya.slice(-1);
              xc1 = x;
              yc1 = y;
            }
            break;
          case "L":
            x = c.args[0];
            y = c.args[1];
            ctx && ctx.lineTo(x, y);
            addPoint(x, y);
            polyX.push(xa[xa.length - 1]);
            polyY.push(ya[ya.length - 1]);
            xc1 = x;
            yc1 = y;
            break;
          case "A":
            var x1 = c.args[5];
            var y1 = c.args[6];
            var p = ellipticalArc(c.args[0], c.args[1], c.args[2], c.args[3] != 0, c.args[4] != 0, c.args[5], c.args[6], c.args[7], c.args[8]);
            x = x1;
            y = y1;
            addPoint(p.x, p.y);
            addPoint(x, y);
            polyDoCollect = false;
            xc1 = x;
            yc1 = y;
            break;
          case "C":
            ctx && ctx.bezierCurveTo(c.args[0], c.args[1], c.args[2], c.args[3], c.args[4], c.args[5]);
            x = c.args[4];
            y = c.args[5];
            xc1 = 2 * x - c.args[2];
            yc1 = 2 * y - c.args[3];
            addPoint(x, y);
            polyDoCollect = false;
            break;
          case "S":
            ctx && ctx.bezierCurveTo(c.args[0], c.args[1], c.args[2], c.args[3], c.args[4], c.args[5]);
            x = c.args[4];
            y = c.args[5];
            xc1 = 2 * x - c.args[0];
            yc1 = 2 * y - c.args[1];
            addPoint(x, y);
            polyDoCollect = false;
            break;
          case "Q":
            ctx && ctx.quadraticCurveTo(c.args[0], c.args[1], c.args[2], c.args[3]);
            x = c.args[2];
            y = c.args[3];
            xc1 = 2 * x - c.args[0];
            yc1 = 2 * y - c.args[1];
            addPoint(x, y);
            polyDoCollect = false;
            break;
          case "Z":
            ctx && ctx.closePath();
            if (polyDoCollect && polyX.length > 1 && options && options.cb && options.cb.line) {
              options.cb.line(polyX, polyY, true);
            }
            polyDoCollect = true;
            polyX = [];
            polyY = [];
            break;
        }
      });
      if (polyDoCollect && polyX.length > 1 && options && options.cb && options.cb.line) {
        options.cb.line(polyX, polyY, false);
      }
    }
    function decodeFillStyle(fill) {
      function fillStopArray(stops, stopEl) {
        if (stopEl.length > 0) {
          stops.splice(0, stops.length);
          for (var i = 0; i < stopEl.length && (!SVG.noGradient || i < 1); i++) {
            var str = (stopEl[i].getAttribute("offset") || "0").trim();
            var offset = /%$/.test(str) ? parseFloat(str.slice(0, -1)) / 100 : parseFloat(str);
            var style = stopEl[i].getAttribute("style");
            var styleDict = {};
            if (style) {
              SVG.parseStyle(styleDict, style);
            }
            if (!isNaN(offset)) {
              var color = stopEl[i].getAttribute("stop-color") || styleDict["stop-color"] || "#000";
              if (SVG.colorDict.hasOwnProperty(color)) {
                color = SVG.colorDict[color];
              }
              str = (stopEl[i].getAttribute("stop-opacity") || styleDict["stop-opacity"] || "1").trim();
              var opacity = /%$/.test(str) ? parseFloat(str.slice(0, -1)) / 100 : parseFloat(str);
              if (opacity !== 1) {
                if (/^#[0-9a-f]{3}$/i.test(color)) {
                  color = "rgba(" + color.slice(1).split("").map(function(s) {
                    return parseInt(s, 16) * 17;
                  }).map(function(x) {
                    return x.toString(10);
                  }).join(",") + "," + opacity.toFixed(2) + ")";
                } else {
                  if (/^#[0-9a-f]{6}$/i.test(color)) {
                    color = "rgba(" + [color.slice(1, 3), color.slice(3, 5), color.slice(5)].map(function(s) {
                      return parseInt(s, 16);
                    }).map(function(x) {
                      return x.toString(10);
                    }).join(",") + "," + opacity.toFixed(2) + ")";
                  } else {
                    if (/^rgb(\d+%?(,|\s+)\d+%?(,|\s+)\d+%?)$/i.test(color)) {
                      color = color.slice(0, -1).replace(/\s+/g, ",") + "," + opacity.toFixed(2) + ")";
                    } else {
                      if (/^hsl(\d+%?(,|\s+)\d+%?(,|\s+)\d+%?)$/i.test(color)) {
                        color = color.slice(0, -1).replace(/\s+/g, ",") + "," + opacity.toFixed(2) + ")";
                      }
                    }
                  }
                }
              }
              stops.push({offset:offset, color:color});
            }
          }
        }
      }
      function fillLinearGradientProps(el, props) {
        if (el.attributes["xlink:href"]) {
          var href = el.getAttribute("xlink:href");
          if (href[0] === "#") {
            var targetEl = self.dom.getElementById(href.slice(1));
            if (targetEl) {
              props = fillLinearGradientProps(targetEl, props);
            }
          }
        }
        props.x1 = el.attributes["x1"] ? parseFloat(el.getAttribute("x1")) : props.x1 || 0;
        props.y1 = el.attributes["y1"] ? parseFloat(el.getAttribute("y1")) : props.y1 || 0;
        props.x2 = el.attributes["x2"] ? parseFloat(el.getAttribute("x2")) : props.x2 || 0;
        props.y2 = el.attributes["y2"] ? parseFloat(el.getAttribute("y2")) : props.y2 || 0;
        props.gradientUnits = el.attributes["gradientUnits"] ? el.getAttribute("gradientUnits") : props.gradientUnits || "objectBoundingBox";
        props.gradientTransform = el.attributes["gradientTransform"] ? el.getAttribute("gradientTransform") : props.gradientTransform || "";
        props.stops = props.stops || [];
        var stopEl = el.getElementsByTagName("stop");
        fillStopArray(props.stops, stopEl);
        return props;
      }
      function fillRadialGradientProps(el, props) {
        if (el.attributes["xlink:href"]) {
          var href = el.getAttribute("xlink:href");
          if (href[0] === "#") {
            var targetEl = self.dom.getElementById(href.slice(1));
            if (targetEl) {
              props = fillRadialGradientProps(targetEl, props);
            }
          }
        }
        props.cx = el.attributes["cx"] ? parseFloat(el.getAttribute("cx")) : props.cx || 0;
        props.cy = el.attributes["cy"] ? parseFloat(el.getAttribute("cy")) : props.cy || 0;
        props.r = el.attributes["r"] ? parseFloat(el.getAttribute("r")) : props.r || 0;
        props.gradientUnits = el.attributes["gradientUnits"] ? el.getAttribute("gradientUnits") : props.gradientUnits || "objectBoundingBox";
        props.gradientTransform = el.attributes["gradientTransform"] ? el.getAttribute("gradientTransform") : props.gradientTransform || "";
        props.stops = props.stops || [];
        var stopEl = el.getElementsByTagName("stop");
        fillStopArray(props.stops, stopEl);
        return props;
      }
      var id = /^url\(#(.+)\)$/.exec(fill);
      if (id && id[1]) {
        var targetEl = self.dom.getElementById(id[1]);
        if (targetEl) {
          switch(targetEl.tagName) {
            case "linearGradient":
              var lg = fillLinearGradientProps(targetEl, {});
              if (lg.gradientUnits === "objectBoundingBox") {
                throw "objectBoundingBox not supported";
              }
              if (lg.gradientTransform) {
                var gradientTransform = new SVG.Transform;
                SVG.applyTransformTo(lg.gradientTransform, gradientTransform);
                throw "gradientTransform not supported";
              }
              var linearGradient = ctx.createLinearGradient(lg.x1, lg.y1, lg.x2, lg.y2);
              for (var i = 0; i < lg.stops.length; i++) {
                linearGradient.addColorStop(lg.stops[i].offset, lg.stops[i].color);
              }
              return linearGradient;
            case "radialGradient":
              var rg = fillRadialGradientProps(targetEl, {});
              if (rg.gradientUnits === "objectBoundingBox") {
                throw "objectBoundingBox not supported";
              }
              if (rg.gradientTransform) {
                var gradientTransform = new SVG.Transform;
                SVG.applyTransformTo(rg.gradientTransform, gradientTransform);
                var centerTr = gradientTransform.applyInverse({x:rg.cx, y:rg.cy});
                var radiusTr = rg.r / gradientTransform.getScale();
                rg.cx = centerTr.x;
                rg.cy = centerTr.y;
                rg.r = radiusTr;
              }
              var radialGradient = ctx.createRadialGradient(rg.cx, rg.cy, 0, rg.cx, rg.cy, rg.r);
              for (var i = 0; i < rg.stops.length; i++) {
                radialGradient.addColorStop(rg.stops[i].offset, rg.stops[i].color);
              }
              return radialGradient;
          }
        }
      }
      return fill;
    }
    function roundedRect(x, y, w, h, rx, ry) {
      if (rx <= 0 || ry <= 0) {
        ctx.rect(x, y, w, h);
      } else {
        var r = Math.min((rx + ry) / 2, Math.min(w, h) / 2);
        ctx.moveTo(x + w - r, y);
        ctx.arc(x + w - r, y + r, r, 1.5 * Math.PI, 2 * Math.PI);
        ctx.lineTo(x + w, y + h - r);
        ctx.arc(x + w - r, y + h - r, r, 0, 0.5 * Math.PI);
        ctx.lineTo(x + r, y + h);
        ctx.arc(x + r, y + h - r, r, 0.5 * Math.PI, Math.PI);
        ctx.lineTo(x, y + r);
        ctx.arc(x + r, y + r, r, Math.PI, 1.5 * Math.PI);
        ctx.closePath();
      }
    }
    function paint() {
      if (ctx) {
        var style = {};
        if (baseStyleDict) {
          SVG.mergeStyle(style, baseStyleDict);
        }
        if (overriddenStyleDict) {
          SVG.mergeStyle(style, overriddenStyleDict);
        }
        if (style["visibility"] !== "hidden") {
          if (style["opacity"]) {
            ctx.globalAlpha *= parseFloat(style["opacity"]);
          }
          if (!style["fill"] || style["fill"] !== "none") {
            ctx.fillStyle = style["fill"] === "white" || style["fill"] === "#fff" || style["fill"] === "#ffffff" ? "white" : decodeFillStyle(style["fill"]) || "none";
            ctx.fill();
          }
          if (style["stroke"] && style["stroke"] !== "none") {
            ctx.lineWidth = lengthToNum(style["stroke-width"] || "1px", 1, 100);
            ctx.strokeStyle = style["stroke"] || "none";
            ctx.miterLimit = style["stroke-miterlimit"] || 4;
            ctx.lineJoin = style["stroke-linejoin"] || "miter";
            ctx.lineCap = style["stroke-linecap"] || "butt";
            if (style["stroke-dasharray"]) {
              ctx.setLineDash(style["stroke-dasharray"].split(" ").map(function(s) {
                return parseFloat(s);
              }));
              ctx.lineDashOffset = style["stroke-dashoffset"] ? parseFloat(style["stroke-dashoffset"]) : 0;
            }
            ctx.stroke();
          }
        }
      }
    }
    function paintText(str, x, y) {
      if (ctx) {
        var style = {};
        if (baseStyleDict) {
          SVG.mergeStyle(style, baseStyleDict);
        }
        if (overriddenStyleDict) {
          SVG.mergeStyle(style, overriddenStyleDict);
        }
        if (style["visibility"] !== "hidden") {
          var fontSize = style["font-size"] || "12px";
          var fontFamily = style["font-family"] || "helvetica";
          ctx.font = fontSize + " " + fontFamily;
          if (style["fill"] && style["fill"] !== "none") {
            ctx.fillStyle = style["fill"] === "white" || style["fill"] === "#fff" || style["fill"] === "#ffffff" ? "white" : options && options.fill || "silver";
            ctx.fillText(str, x, y);
          }
          if (style["stroke"] && style["stroke"] !== "none") {
            ctx.strokeStyle = options && options.stroke || "black";
            ctx.strokeText(str, x, y);
          }
        }
      }
    }
    function drawBoundingBox(xa, ya) {
      var bnds = SVG.calcBounds({x:xa, y:ya});
      ctx.save();
      ctx.strokeStyle = "black";
      ctx.lineWidth = 1;
      ctx.strokeRect(bnds.xmin, bnds.ymin, bnds.xmax - bnds.xmin, bnds.ymax - bnds.ymin);
      ctx.restore();
    }
    var displacement = el.id && options && options.displacement && options.displacement[el.id];
    var clip = el.id && options && options.clips && options.clips[el.id];
    ctx && ctx.save();
    transform.save();
    if (displacement && ctx) {
      applyDisplacement(el, displacement);
    }
    if (clip && ctx) {
      applyClip(clip);
    }
    baseStyleDict = SVG.copyStyle(baseStyleDict);
    overriddenStyleDict = SVG.copyStyle(overriddenStyleDict);
    getStyle();
    var ptLen0 = xa.length;
    switch(el.name) {
      case "svg":
        transform.save();
        applyTransform(el.transform);
        drawChildren();
        transform.restore();
        break;
      case "g":
        transform.save();
        applyTransform(el.transform);
        drawChildren();
        transform.restore();
        break;
      case "path":
        ctx && ctx.save();
        transform.save();
        applyTransform(el.transform);
        path(el.path);
        paint();
        ctx && ctx.restore();
        transform.restore();
        break;
      case "line":
        ctx && ctx.save();
        transform.save();
        applyTransform(el.transform);
        ctx && ctx.beginPath();
        ctx && ctx.moveTo(el.x1, el.y1);
        ctx && ctx.lineTo(el.x2, el.y2);
        paint();
        addPoint(el.x1, el.y1);
        addPoint(el.x2, el.y2);
        if (options && options.cb && options.cb.line) {
          options.cb.line([el.x1, el.x2], [el.y1, el.y2], false);
        }
        ctx && ctx.restore();
        transform.restore();
        break;
      case "polygon":
      case "polyline":
        if (el.points.length >= 4) {
          ctx && ctx.save();
          transform.save();
          applyTransform(el.transform);
          ctx && ctx.beginPath();
          ctx && ctx.moveTo(el.points[0], el.points[1]);
          addPoint(el.points[0], el.points[1]);
          for (var i = 2; i + 1 < el.points.length; i += 2) {
            ctx && ctx.lineTo(el.points[i], el.points[i + 1]);
            addPoint(el.points[i], el.points[i + 1]);
          }
          if (el.name === "polygon") {
            ctx && ctx.closePath();
          }
          paint();
          if (options && options.cb && options.cb.line) {
            options.cb.line(xa.slice(-el.points.length / 2), ya.slice(-el.points.length / 2), el.name === "polygon");
          }
          ctx && ctx.restore();
          transform.restore();
        }
        break;
      case "circle":
        ctx && ctx.save();
        transform.save();
        applyTransform(el.transform);
        ctx && ctx.beginPath();
        ctx && ctx.arc(el.x, el.y, el.r, 0, 2 * Math.PI);
        paint();
        addPoint(el.x - el.r, el.y - el.r);
        addPoint(el.x - el.r, el.y + el.r);
        addPoint(el.x + el.r, el.y - el.r);
        addPoint(el.x + el.r, el.y + el.r);
        if (options && options.cb && options.cb.circle) {
          var x4 = xa.slice(-4);
          var y4 = ya.slice(-4);
          var diag12 = (x4[3] - x4[0]) * (x4[3] - x4[0]) + (y4[3] - y4[0]) * (y4[3] - y4[0]);
          var diag22 = (x4[2] - x4[1]) * (x4[2] - x4[1]) + (y4[2] - y4[1]) * (y4[2] - y4[1]);
          if (Math.abs(diag12 - diag22) / (diag12 + diag22) < 1e-3 && ((x4[3] - x4[0]) * (x4[2] - x4[1]) + (y4[3] - y4[0]) * (y4[2] - y4[1])) / diag12 < 1e-3) {
            options.cb.circle((x4[0] + x4[2]) / 2, (y4[0] + y4[2]) / 2, Math.sqrt(diag12 / 8));
          }
        }
        ctx && ctx.restore();
        transform.restore();
        break;
      case "rect":
        ctx && ctx.save();
        transform.save();
        applyTransform(el.transform);
        if (ctx) {
          ctx.beginPath();
          if (el.rx > 0 || el.ry > 0) {
            roundedRect(el.x, el.y, el.width, el.height, el.rx, el.ry);
          } else {
            ctx.rect(el.x, el.y, el.width, el.height);
          }
        }
        paint();
        addPoint(el.x, el.y);
        addPoint(el.x, el.y + el.height);
        addPoint(el.x + el.width, el.y);
        addPoint(el.x + el.width, el.y + el.height);
        ctx && ctx.restore();
        transform.restore();
        break;
      case "text":
        ctx && ctx.save();
        transform.save();
        applyTransform(el.transform);
        paintText(el.text, el.x, el.y);
        addPoint(el.x, el.y);
        ctx && ctx.restore();
        transform.restore();
        break;
    }
    ctx && ctx.restore();
    transform.restore();
    ctx && options && options.drawBoundingBox && drawBoundingBox(xa.slice(ptLen0), ya.slice(ptLen0));
  };
  var element = this.doc;
  if (options && options.elementId) {
    element = this.findById(options.elementId);
  } else {
    if (options && options.obj) {
      element = options.obj;
    }
  }
  if (element) {
    if (options && options.globalTransform) {
      options.globalTransform(ctx, this.viewBox);
    }
    if (ctx) {
      var ancestors = [];
      for (var ancestor = element.parentElement; ancestor != null; ancestor = ancestor.parentElement) {
        ancestors.push(ancestor);
      }
      for (var i = ancestors.length - 1; i >= 0; i--) {
        var idAttr = ancestors[i].id;
        var displacement = idAttr && options && options.displacement && options.displacement[idAttr];
        if (displacement) {
          applyDisplacement(ancestors[i], displacement);
        }
        var tr = ancestors[i].transform;
        applyTransform(tr);
      }
    }
    drawEl(element, {}, {});
  }
  return {x:xa, y:ya};
};
SVG.Preparsed.findDescendentElement = function(root, elementId) {
  if (root.id === elementId) {
    return root;
  }
  if (root.children) {
    for (var i = 0; i < root.children.length; i++) {
      var el = SVG.Preparsed.findDescendentElement(root.children[i], elementId);
      if (el) {
        return el;
      }
    }
  }
  return null;
};
SVG.Preparsed.prototype.hasElement = function(elementId) {
  return SVG.Preparsed.findDescendentElement(this.doc, elementId) != null;
};
SVG.Preparsed.prototype.hasAncestor = function(elementId, ancestorId) {
  var ancestor = SVG.Preparsed.findDescendentElement(this.doc, ancestorId);
  if (ancestor == null) {
    throw "Undefined SVG element id " + ancestorId;
  }
  return SVG.Preparsed.findDescendentElement(ancestor, elementId) != null;
};
SVG.Transform = function(mat) {
  this.mat = mat || [1, 0, 0, 0, 1, 0];
};
SVG.Transform.prototype.copy = function() {
  return new SVG.Transform(this.mat);
};
SVG.Transform.prototype.apply = function(pt) {
  return new SVG.Transform.Point(this.mat[0] * pt.x + this.mat[1] * pt.y + this.mat[2], this.mat[3] * pt.x + this.mat[4] * pt.y + this.mat[5]);
};
SVG.Transform.prototype.applyToVector = function(pt) {
  return new SVG.Transform.Point(this.mat[0] * pt.x + this.mat[1] * pt.y, this.mat[3] * pt.x + this.mat[4] * pt.y);
};
SVG.Transform.prototype.getScale = function() {
  return Math.sqrt(Math.abs(this.mat[0] * this.mat[4]));
};
SVG.Transform.prototype.applyInverse = function(pt) {
  var det = this.mat[0] * this.mat[4] - this.mat[3] * this.mat[1];
  return new SVG.Transform.Point((this.mat[4] * pt.x - this.mat[1] * pt.y + this.mat[1] * this.mat[5] - this.mat[4] * this.mat[2]) / det, (-this.mat[3] * pt.x + this.mat[0] * pt.y + this.mat[3] * this.mat[2] - this.mat[0] * this.mat[5]) / det);
};
SVG.Transform.prototype.applyInverseToVector = function(pt) {
  var det = this.mat[0] * this.mat[4] - this.mat[3] * this.mat[1];
  return new SVG.Transform.Point((this.mat[4] * pt.x - this.mat[1] * pt.y) / det, (-this.mat[3] * pt.x + this.mat[0] * pt.y) / det);
};
SVG.Transform.prototype.translate = function(dx, dy) {
  this.mat = [this.mat[0], this.mat[1], this.mat[0] * dx + this.mat[1] * dy + this.mat[2], this.mat[3], this.mat[4], this.mat[3] * dx + this.mat[4] * dy + this.mat[5]];
};
SVG.Transform.prototype.scale = function(sx, sy) {
  this.mat = [this.mat[0] * sx, this.mat[1] * sy, this.mat[2], this.mat[3] * sx, this.mat[4] * sy, this.mat[5]];
};
SVG.Transform.prototype.rotate = function(angle) {
  var c = Math.cos(angle);
  var s = Math.sin(angle);
  this.mat = [c * this.mat[0] + s * this.mat[1], -s * this.mat[0] + c * this.mat[1], this.mat[2], c * this.mat[3] + s * this.mat[4], -s * this.mat[3] + c * this.mat[4], this.mat[5]];
};
SVG.Transform.prototype.matrix = function(a, b, c, d, e, f) {
  this.mat = [a * this.mat[0] + c * this.mat[1], b * this.mat[0] + d * this.mat[1], a * this.mat[2] + c * this.mat[3], b * this.mat[2] + d * this.mat[3], a * this.mat[4] + c * this.mat[5] + e, b * this.mat[4] + d * this.mat[5] + f];
};
SVG.Transform.Point = function(x, y) {
  this.x = x || 0;
  this.y = y || 0;
};
SVG.Transform.Stack = function() {
  this.stack = [new SVG.Transform];
};
SVG.Transform.Stack.prototype.apply = function(pt) {
  return this.stack[this.stack.length - 1].apply(pt);
};
SVG.Transform.Stack.prototype.clear = function() {
  this.stack = [new SVG.Transform];
};
SVG.Transform.Stack.prototype.save = function() {
  this.stack.push(this.stack[this.stack.length - 1].copy());
};
SVG.Transform.Stack.prototype.restore = function() {
  if (this.stack.length < 2) {
    throw "restore doesn't match save";
  }
  this.stack.pop();
};
SVG.Transform.Stack.prototype.translate = function(dx, dy) {
  this.stack[this.stack.length - 1].translate(dx, dy);
};
SVG.Transform.Stack.prototype.scale = function(sx, sy) {
  this.stack[this.stack.length - 1].scale(sx, sy);
};
SVG.Transform.Stack.prototype.rotate = function(angle) {
  this.stack[this.stack.length - 1].rotate(angle);
};
SVG.Transform.Stack.prototype.matrix = function(a, b, c, d, e, f) {
  this.stack[this.stack.length - 1].matrix(a, b, c, d, e, f);
};
A3a.vpl.Canvas.getDrawURI = function(aux) {
  for (var i = 0; i < aux["draw"].length; i++) {
    if (aux["draw"][i]["uri"]) {
      return aux["draw"][i]["uri"];
    }
  }
  throw "URI not found";
};
A3a.vpl.Canvas.decodeURI = function(uri) {
  var a = uri.split("#");
  return {f:a[0], id:a[1]};
};
A3a.vpl.Canvas.prototype.drawSVG = function(svg, options) {
  this.ctx.save();
  options.globalTransform = function(ctx, viewBox) {
    this.clientData.blockViewBox = viewBox;
    ctx.translate(-viewBox[0], -viewBox[1]);
    ctx.scale(this.dims.blockSize / (viewBox[2] - viewBox[0]), this.dims.blockSize / (viewBox[3] - viewBox[1]));
  }.bind(this);
  svg.draw(this.ctx, options);
  this.ctx.restore();
};
A3a.vpl.Canvas.prototype.canvasToSVGCoord = function(clickX, clickY, width, height) {
  return {x:(this.clientData.blockViewBox[2] - this.clientData.blockViewBox[0]) / width * (clickX + this.clientData.blockViewBox[0]), y:(this.clientData.blockViewBox[3] - this.clientData.blockViewBox[1]) / height * (clickY + this.clientData.blockViewBox[1])};
};
A3a.vpl.Canvas.prototype.mousedownSVGButtons = function(block, width, height, left, top, ev, svg, buttons) {
  var pt = this.canvasToSVGCoord(ev.x - left, ev.y - top, width, height);
  for (var i = 0; i < buttons.length; i++) {
    var id = buttons[i]["id"];
    if (svg.isInside(id, pt.x, pt.y)) {
      var ix = buttons[i]["val"].indexOf(block.param[i]);
      if (ix >= 0) {
        block.beginChange();
        block.param[i] = buttons[i]["val"][(ix + 1) % buttons[i]["val"].length];
        block.endChange();
      }
      return i;
    }
  }
  return null;
};
A3a.vpl.Canvas.prototype.mousedownSVGRadioButtons = function(block, width, height, left, top, ev, svg, buttons, nButtons) {
  var pt = this.canvasToSVGCoord(ev.x - left, ev.y - top, width, height);
  for (var i = 0; i < buttons.length; i++) {
    var id = buttons[i]["id"];
    if (svg.isInside(id, pt.x, pt.y)) {
      block.beginChange();
      block.param[nButtons] = buttons[i]["val"];
      block.endChange();
      return 0;
    }
  }
  return null;
};
A3a.vpl.Canvas.prototype.mousedownSVGPushbuttons = function(block, width, height, left, top, ev, svg, pushbuttons) {
  var pt = this.canvasToSVGCoord(ev.x - left, ev.y - top, width, height);
  for (var i = 0; i < pushbuttons.length; i++) {
    var id = pushbuttons[i]["id"];
    if (svg.isInside(id, pt.x, pt.y)) {
      block.beginChange();
      var p = pushbuttons[i]["newParameters"];
      if (typeof p === "string" && /^`.+`$/.test(p)) {
        p = A3a.vpl.BlockTemplate.substInline(p, block.param, undefined, true);
      }
      block.param = p;
      block.endChange();
      return true;
    }
  }
  return null;
};
A3a.vpl.Canvas.prototype.getStyles = function(aux, block) {
  var styles = {};
  var nButtons = aux["buttons"] ? aux["buttons"].length : 0;
  var nRadioButtons = aux["radiobuttons"] ? aux["radiobuttons"].length : 0;
  var nStyles = aux["styles"] ? aux["styles"].length : 0;
  for (var i = 0; i < nButtons; i++) {
    var val = aux["buttons"][i]["val"];
    var st = aux["buttons"][i]["st"];
    var ix = val.indexOf(block.param[i]);
    if (ix >= 0) {
      styles[aux["buttons"][i]["id"]] = st[ix];
    }
  }
  for (var i = 0; i < nRadioButtons; i++) {
    var val = aux["radiobuttons"][i]["val"];
    var st = aux["radiobuttons"][i]["st"];
    styles[aux["radiobuttons"][i]["id"]] = st[block.param[nButtons] === val ? 1 : 0];
  }
  for (var i = 0; i < nStyles; i++) {
    styles[(aux["styles"][i]["complement"] ? "!" : "") + aux["styles"][i]["id"]] = A3a.vpl.BlockTemplate.substInline(aux["styles"][i]["st"], block.param);
  }
  return styles;
};
A3a.vpl.Canvas.prototype.getDisplacements = function(aux, svg, param) {
  var displacements = {};
  var ix0 = (aux["buttons"] ? aux["buttons"].length : 0) + (aux["radiobuttons"] ? 1 : 0);
  if (aux["sliders"] != undefined) {
    for (var i = 0; i < aux["sliders"].length; i++) {
      var sliderAux = aux["sliders"][i];
      var bnds = svg.getElementBounds(sliderAux["id"]);
      var bndsThumb = svg.getElementBounds(sliderAux["thumbId"]);
      var x0Thumb = (bndsThumb.xmin + bndsThumb.xmax) / 2;
      var y0Thumb = (bndsThumb.ymin + bndsThumb.ymax) / 2;
      if (bnds.xmax - bnds.xmin < bnds.ymax - bnds.ymin) {
        bnds.xmin = bnds.xmax = (bnds.xmin + bnds.xmax) / 2;
        x0Thumb = bnds.xmin;
      } else {
        bnds.ymin = bnds.ymax = (bnds.ymin + bnds.ymax) / 2;
        y0Thumb = bnds.ymin;
      }
      var f = (param[ix0 + i] - sliderAux["min"]) / (sliderAux["max"] - sliderAux["min"]);
      displacements[sliderAux["thumbId"]] = {dx:f * (bnds.xmax - bnds.xmin) - (x0Thumb - bnds.xmin), dy:f * (bnds.ymin - bnds.ymax) - (y0Thumb - bnds.ymax)};
    }
    ix0 += aux["sliders"].length;
  }
  if (aux["rotating"] != undefined) {
    for (var i = 0; i < aux["rotating"].length; i++) {
      var rotatingAux = aux["rotating"][i];
      var f = rotatingAux["numSteps"] ? 2 * Math.PI / rotatingAux["numSteps"] : 1;
      var bndsCenter = svg.getElementBounds(rotatingAux["centerId"]);
      displacements[rotatingAux["id"]] = {phi:param[ix0 + i] * f, x0:(bndsCenter.xmin + bndsCenter.xmax) / 2, y0:(bndsCenter.ymin + bndsCenter.ymax) / 2};
    }
  }
  return displacements;
};
A3a.vpl.Canvas.prototype.getClips = function(aux, svg, param) {
  var clips = {};
  if (aux["sliders"] != undefined) {
    for (var i = 0; i < aux["sliders"].length; i++) {
      var sliderAux = aux["sliders"][i];
      var bnds = svg.getElementBounds(sliderAux["id"]);
      var bndsHalf = sliderAux["lowerPartId"] && svg.getElementBounds(sliderAux["lowerPartId"]);
      if (bndsHalf) {
        var f = (param[i] - sliderAux["min"]) / (sliderAux["max"] - sliderAux["min"]);
        var w = bndsHalf.xmax - bndsHalf.xmin;
        var h = bndsHalf.ymax - bndsHalf.ymin;
        if (bnds.xmax - bnds.xmin < bnds.ymax - bnds.ymin) {
          clips[sliderAux["lowerPartId"]] = {x:bndsHalf.xmin - h, y:bndsHalf.ymin, w:w + 2 * h, h:h * f};
        } else {
          clips[sliderAux["lowerPartId"]] = {x:bndsHalf.xmin, y:bndsHalf.ymin - h, w:w * f, h:h + 2 * w};
        }
      }
    }
  }
  return clips;
};
A3a.vpl.Canvas.prototype.checkSVGSlider = function(pos, vert, tol, pt) {
  return Math.abs((vert ? pt.x : pt.y) - pos) < tol;
};
A3a.vpl.Canvas.prototype.dragSVGSlider = function(min, max, pos) {
  return Math.min(Math.max((pos - min) / (max - min), 0), 1);
};
A3a.vpl.Canvas.prototype.mousedownSVGSliders = function(block, width, height, left, top, ev, svg, sliders) {
  var pt = this.canvasToSVGCoord(ev.x - left, ev.y - top, width, height);
  for (var i = 0; i < sliders.length; i++) {
    this.clientData.sliderAux = sliders[i];
    var bnds = svg.getElementBounds(this.clientData.sliderAux["id"]);
    this.clientData.vert = bnds.xmax - bnds.xmin < bnds.ymax - bnds.ymin;
    this.clientData.min = this.clientData.vert ? bnds.ymax : bnds.xmin;
    this.clientData.max = this.clientData.vert ? bnds.ymin : bnds.xmax;
    var x0 = (bnds.xmin + bnds.xmax) / 2;
    var y0 = (bnds.ymin + bnds.ymax) / 2;
    var thumbBnds = svg.getElementBounds(this.clientData.sliderAux["thumbId"]);
    if (this.checkSVGSlider(this.clientData.vert ? x0 : y0, this.clientData.vert, this.clientData.vert ? thumbBnds.xmax - thumbBnds.xmin : thumbBnds.ymax - thumbBnds.ymin, pt)) {
      block.beginChange();
      return i;
    }
  }
  return null;
};
A3a.vpl.Canvas.prototype.mousedragSVGSlider = function(block, dragIndex, aux, width, height, left, top, ev) {
  var pt = this.canvasToSVGCoord(ev.x - left, ev.y - top, width, height);
  var val = this.clientData.sliderAux["min"] + (this.clientData.sliderAux["max"] - this.clientData.sliderAux["min"]) * this.dragSVGSlider(this.clientData.min, this.clientData.max, this.clientData.vert ? pt.y : pt.x);
  var min = this.clientData.sliderAux["min"];
  var max = this.clientData.sliderAux["max"];
  var discrete = this.clientData.sliderAux["discrete"];
  if (discrete && discrete.length > 0) {
    val = discrete.reduce(function(acc, cur) {
      return Math.abs(val - cur) < Math.abs(val - acc) ? cur : acc;
    }, discrete[0]);
  } else {
    var snap = this.clientData.sliderAux["snap"];
    snap && snap.forEach(function(s, i) {
      if (typeof s === "string" && /^`.+`$/.test(s)) {
        s = A3a.vpl.BlockTemplate.substInline(s, block.param, i, true);
      }
      if (Math.abs(val - s) < Math.abs(max - min) / 10) {
        val = s;
      }
    });
  }
  var ix0 = (aux["buttons"] ? aux["buttons"].length : 0) + (aux["radiobuttons"] ? 1 : 0);
  block.param[ix0 + dragIndex] = Math.max(Math.min(min, max), Math.min(Math.max(min, max), val));
  block.endChange();
};
A3a.vpl.Canvas.prototype.mousedownSVGRotating = function(block, width, height, left, top, ev, svg, rotating, param) {
  var pt = this.canvasToSVGCoord(ev.x - left, ev.y - top, width, height);
  for (var i = 0; i < rotating.length; i++) {
    var bnds = svg.getElementBounds(rotating[i]["centerId"]);
    var c = {x:(bnds.xmin + bnds.xmax) / 2, y:(bnds.ymin + bnds.ymax) / 2};
    var f = rotating[i]["numSteps"] ? 2 * Math.PI / rotating[i]["numSteps"] : 1;
    var pt0 = {x:c.x + (pt.x - c.x) * Math.cos(param[i] * f) + (pt.y - c.y) * Math.sin(param[i] * f), y:c.y - (pt.x - c.x) * Math.sin(param[i] * f) + (pt.y - c.y) * Math.cos(param[i] * f)};
    if (svg.isInside(rotating[i]["thumbId"], pt0.x, pt0.y)) {
      this.clientData.rotatingAux = rotating[i];
      this.clientData.c = c;
      this.clientData.phi0 = Math.atan2(pt0.y - c.y, pt0.x - c.x);
      block.beginChange();
      return i;
    }
  }
  return null;
};
A3a.vpl.Canvas.prototype.mousedragSVGRotating = function(block, dragIndex, aux, width, height, left, top, ev) {
  var pt = this.canvasToSVGCoord(ev.x - left, ev.y - top, width, height);
  var val = (Math.atan2(pt.y - this.clientData.c.y, pt.x - this.clientData.c.x) - this.clientData.phi0 + Math.PI) % (2 * Math.PI) - Math.PI;
  var f = aux["rotating"][dragIndex]["numSteps"] ? 2 * Math.PI / aux["rotating"][dragIndex]["numSteps"] : 1;
  var ix0 = (aux["buttons"] ? aux["buttons"].length : 0) + (aux["radiobuttons"] ? 1 : 0) + (aux["sliders"] ? aux["sliders"].length : 0);
  block.param[ix0 + dragIndex] = Math.round(val / f);
  block.endChange();
};
A3a.vpl.Canvas.prototype.mousedownSVGNotes = function(block, width, height, left, top, ev, svg, aux) {
  var ixNotes = (aux["buttons"] ? aux["buttons"].length : 0) + (aux["radiobuttons"] ? 1 : 0) + (aux["sliders"] ? aux["sliders"].length : 0);
  var numNotes = block.param.slice(ixNotes).length / 2;
  var numHeights = aux["score"]["numHeights"] || 5;
  var bnds = svg.getElementBounds(aux["score"]["id"]);
  var viewBox = svg.viewBox;
  var note = this.noteClickLL((bnds.xmin - viewBox[0]) / (viewBox[2] - viewBox[0]), (bnds.xmax - viewBox[0]) / (viewBox[2] - viewBox[0]), (bnds.ymax - viewBox[1]) / (viewBox[3] - viewBox[1]), (bnds.ymin - viewBox[1]) / (viewBox[3] - viewBox[1]), numNotes, numHeights, width, height, left, top, ev);
  if (note) {
    block.beginChange();
    if (block.param[ixNotes + 2 * note.index] === note.tone) {
      block.param[ixNotes + 2 * note.index + 1] = (block.param[ixNotes + 2 * note.index + 1] + 1) % 3;
    } else {
      block.param[ixNotes + 2 * note.index] = note.tone;
      block.param[ixNotes + 2 * note.index + 1] = 1;
    }
    block.endChange();
    return 0;
  }
  return null;
};
A3a.vpl.Canvas.prototype.drawBlockSVG = function(uiConfig, aux, block) {
  if (aux["draw"].length === 0) {
    return;
  }
  var f = A3a.vpl.Canvas.decodeURI(A3a.vpl.Canvas.getDrawURI(aux)).f;
  var displacements = f ? this.getDisplacements(aux, uiConfig.svg[f], block.param) : {};
  var diffWheelMotion = null;
  if (aux["diffwheelmotion"] && aux["diffwheelmotion"]["id"]) {
    var dw = aux["diffwheelmotion"];
    var robotId = dw["id"];
    var dx = dw["dx"] || 0;
    var dy = dw["dy"] || 0;
    var adjSc = dw["adjscale"] || 1;
    var color = dw["color"] || "black";
    var linewidth = dw["linewidth"] === undefined ? 1 : dw["linewidth"];
    var bnds = uiConfig.svg[f].getElementBounds(robotId);
    var r = (0.5 + dx) * (bnds.xmax - bnds.xmin) * adjSc;
    var ixSlider = (aux["buttons"] ? aux["buttons"].length : 0) + (aux["radiobuttons"] ? 1 : 0);
    var dleft = 2.4 * block.param[ixSlider];
    var dright = 2.4 * block.param[ixSlider + 1];
    var s = this.dims.blockSize;
    var rw = r / s;
    var tr = this.traces(dleft, dright, rw, {color:color, linewidth:linewidth});
    displacements[robotId] = {dx:-(tr.x * rw * s + dy * s * Math.sin(tr.phi)), dy:-(tr.y * rw * s + dy * s * Math.cos(tr.phi)), phi:-tr.phi};
    diffWheelMotion = {dleft:dleft, dright:dright, rw:rw, color:color, linewidth:linewidth};
  }
  aux["draw"].forEach(function(el) {
    if (el["uri"]) {
      var d = A3a.vpl.Canvas.decodeURI(el["uri"]);
      this.drawSVG(uiConfig.svg[d.f], {elementId:d.id, style:this.getStyles(aux, block), displacement:displacements, clips:this.getClips(aux, uiConfig.svg[f], block.param), drawBoundingBox:false});
    }
    if (el["js"]) {
      var fun = new Function("ctx", "$", el["js"]);
      this.ctx.save();
      this.ctx.scale(this.dims.blockSize / 1000, this.dims.blockSize / 1000);
      this.ctx.beginPath();
      fun(this.ctx, block.param);
      this.ctx.restore();
    }
  }, this);
  if (diffWheelMotion) {
    this.traces(diffWheelMotion.dleft, diffWheelMotion.dright, diffWheelMotion.rw, {color:diffWheelMotion.color, linewidth:diffWheelMotion.linewidth});
  }
  if (aux["score"] && aux["score"]["id"]) {
    var ixNotes = (aux["buttons"] ? aux["buttons"].length : 0) + (aux["radiobuttons"] ? 1 : 0) + (aux["sliders"] ? aux["sliders"].length : 0);
    var sc = aux["score"];
    var numHeights = sc["numHeights"] || 5;
    var bnds = uiConfig.svg[f].getElementBounds(sc["id"]);
    var viewBox = uiConfig.svg[f].viewBox;
    this.notesLL(block.param.slice(ixNotes), (bnds.xmin - viewBox[0]) / (viewBox[2] - viewBox[0]), (bnds.xmax - viewBox[0]) / (viewBox[2] - viewBox[0]), (bnds.ymax - viewBox[1]) / (viewBox[3] - viewBox[1]), (bnds.ymin - viewBox[1]) / (viewBox[3] - viewBox[1]), numHeights, (bnds.ymax - bnds.ymin) / (viewBox[3] - viewBox[1]) / numHeights * (sc["noteSize"] || 1), sc["linewidth"] === undefined ? 1 : sc["linewidth"]);
  }
};
A3a.vpl.Canvas.mousedownBlockSVG = function(uiConfig, aux, canvas, block, width, height, left, top, ev) {
  var filename = A3a.vpl.Canvas.decodeURI(A3a.vpl.Canvas.getDrawURI(aux)).f;
  var ix0 = 0;
  var buttons = aux["buttons"];
  if (buttons) {
    var ix = canvas.mousedownSVGButtons(block, width, height, left, top, ev, uiConfig.svg[filename], buttons);
    if (ix !== null) {
      return ix0 + ix;
    }
    ix0 += buttons.length;
  }
  var radiobuttons = aux["radiobuttons"];
  if (radiobuttons) {
    var ix = canvas.mousedownSVGRadioButtons(block, width, height, left, top, ev, uiConfig.svg[filename], radiobuttons, buttons || 0);
    if (ix !== null) {
      return ix0 + ix;
    }
    ix0++;
  }
  var pushbuttons = aux["pushbuttons"];
  if (pushbuttons) {
    var handled = canvas.mousedownSVGPushbuttons(block, width, height, left, top, ev, uiConfig.svg[filename], pushbuttons);
    if (handled !== null) {
      return -1;
    }
  }
  var sliders = aux["sliders"];
  if (sliders) {
    ix = canvas.mousedownSVGSliders(block, width, height, left, top, ev, uiConfig.svg[filename], sliders);
    if (ix !== null) {
      return ix0 + ix;
    }
    ix0 += sliders.length;
  }
  var rotating = aux["rotating"];
  if (rotating) {
    ix = canvas.mousedownSVGRotating(block, width, height, left, top, ev, uiConfig.svg[filename], rotating, block.param.slice(ix0, ix0 + rotating.length));
    if (ix !== null) {
      return ix0 + ix;
    }
    ix0 += rotating.length;
  }
  if (aux["score"]) {
    var ix = canvas.mousedownSVGNotes(block, width, height, left, top, ev, uiConfig.svg[filename], aux);
    if (ix !== null) {
      return ix0 + ix;
    }
    ix0++;
  }
  return null;
};
A3a.vpl.Canvas.mousedragBlockSVG = function(uiConfig, aux, canvas, block, dragIndex, width, height, left, top, ev) {
  var ix0 = (aux["buttons"] ? aux["buttons"].length : 0) + (aux["radiobuttons"] ? 1 : 0);
  var n = aux["sliders"] ? aux["sliders"].length : 0;
  if (dragIndex >= ix0 && dragIndex < ix0 + n) {
    canvas.mousedragSVGSlider(block, dragIndex - ix0, aux, width, height, left, top, ev);
    return;
  }
  ix0 += n;
  n = aux["rotating"] ? aux["rotating"].length : 0;
  if (dragIndex >= ix0 && dragIndex < ix0 + n) {
    canvas.mousedragSVGRotating(block, dragIndex - ix0, aux, width, height, left, top, ev);
    return;
  }
  ix0 += n;
};
A3a.vpl.loadBlockOverlay = function(uiConfig, blocks, lib) {
  function findBlock(name) {
    for (var i = 0; i < lib.length; i++) {
      if (lib[i].name === name) {
        return i;
      }
    }
    return -1;
  }
  function str(s) {
    return s instanceof Array ? s.join("") : s;
  }
  function substInlineA(fmtArray, block) {
    return fmtArray.map(function(fmt) {
      return A3a.vpl.BlockTemplate.substInline(fmt, block.param);
    });
  }
  blocks.forEach(function(b) {
    var name = b["name"];
    if (!name) {
      throw "Missing block name";
    }
    var blockIndex = findBlock(name);
    var blockTemplate0 = blockIndex >= 0 ? lib[blockIndex] : null;
    var type = blockTemplate0 ? blockTemplate0.type : A3a.vpl.blockType.undef;
    if (b["type"] || !blockTemplate0) {
      switch(b["type"]) {
        case "event":
          type = A3a.vpl.blockType.event;
          break;
        case "action":
          type = A3a.vpl.blockType.action;
          break;
        case "state":
          type = A3a.vpl.blockType.state;
          break;
        case "comment":
          type = A3a.vpl.blockType.comment;
          break;
        case "hidden":
          type = A3a.vpl.blockType.hidden;
          break;
        default:
          throw "Unknown block type " + b["type"] + " for block " + name;
      }
    }
    var modes = blockTemplate0 ? blockTemplate0.modes : [];
    if (b["modes"] && !blockTemplate0) {
      b["modes"].forEach(function(m) {
        switch(m) {
          case "basic":
            modes.push(A3a.vpl.mode.basic);
            break;
          case "advanced":
            modes.push(A3a.vpl.mode.advanced);
            break;
          default:
            throw "Unknown block mode " + m;
        }
      });
    }
    var validate = blockTemplate0 ? blockTemplate0.validate : null;
    var validation = b["validation"];
    if (validation) {
      validate = function(b) {
        for (var i = 0; i < validation.length; i++) {
          var assert = validation[i]["assert"];
          var r = typeof assert === "string" && /^`.+`$/.test(assert) ? A3a.vpl.BlockTemplate.substInline(assert, b.param, undefined, true) : assert;
          if (!r) {
            var w = validation[i]["warning"];
            return w ? new A3a.vpl.Error(w, true) : new A3a.vpl.Error(validation[i]["error"] || "Error");
          }
        }
      };
    }
    var draw = blockTemplate0 ? blockTemplate0.draw : function(canvas, block) {
      canvas.drawBlockSVG(uiConfig, b, block);
    };
    var mousedown = blockTemplate0 ? blockTemplate0.mousedown : function(canvas, block, width, height, left, top, ev) {
      return A3a.vpl.Canvas.mousedownBlockSVG(uiConfig, b, canvas, block, width, height, left, top, ev);
    };
    var mousedrag = blockTemplate0 ? blockTemplate0.mousedrag : function(canvas, block, dragIndex, width, height, left, top, ev) {
      A3a.vpl.Canvas.mousedragBlockSVG(uiConfig, b, canvas, block, dragIndex, width, height, left, top, ev);
    };
    var genCode = A3a.vpl.BlockTemplate.loadCodeGenFromJSON(b, blockTemplate0 && blockTemplate0.genCode);
    var paramAccessibility = blockTemplate0 && blockTemplate0.paramAccessibility || null;
    if ((blockTemplate0 == null || blockTemplate0.draw == null) && type !== A3a.vpl.blockType.hidden) {
      var filename = A3a.vpl.Canvas.decodeURI(A3a.vpl.Canvas.getDrawURI(b)).f;
      var svg = uiConfig.svg[filename];
      var nButtons = 0;
      if (b["buttons"]) {
        b["buttons"].forEach(function(button, i) {
          var id = button["id"];
          var bounds = svg.getElementBounds(id);
          var control = new A3a.vpl.BlockParamAccessibility.Control((bounds.ymin - svg.viewBox[1]) / (svg.viewBox[3] - svg.viewBox[1]), (bounds.xmin - svg.viewBox[0]) / (svg.viewBox[2] - svg.viewBox[0]), (bounds.ymax - svg.viewBox[1]) / (svg.viewBox[3] - svg.viewBox[1]), (bounds.xmax - svg.viewBox[0]) / (svg.viewBox[2] - svg.viewBox[0]), function(block) {
            var ix = button["val"].indexOf(block.param[i]);
            if (ix >= 0) {
              block.beginChange();
              block.param[i] = button["val"][(ix + 1) % button["val"].length];
              block.endChange();
            }
          }, null, null);
          if (paramAccessibility == null) {
            paramAccessibility = new A3a.vpl.BlockParamAccessibility;
          }
          paramAccessibility.addControl(control);
        });
        nButtons = b["buttons"].length;
      }
      var nRadioButtons = 0;
      if (b["radiobuttons"]) {
        b["radiobuttons"].forEach(function(radiobutton, i) {
          var id = radiobutton["id"];
          var bounds = svg.getElementBounds(id);
          var control = new A3a.vpl.BlockParamAccessibility.Control((bounds.ymin - svg.viewBox[1]) / (svg.viewBox[3] - svg.viewBox[1]), (bounds.xmin - svg.viewBox[0]) / (svg.viewBox[2] - svg.viewBox[0]), (bounds.ymax - svg.viewBox[1]) / (svg.viewBox[3] - svg.viewBox[1]), (bounds.xmax - svg.viewBox[0]) / (svg.viewBox[2] - svg.viewBox[0]), function(block) {
            block.beginChange();
            block.param[nButtons] = radiobutton["val"];
            block.endChange();
          }, null, null);
          if (paramAccessibility == null) {
            paramAccessibility = new A3a.vpl.BlockParamAccessibility;
          }
          paramAccessibility.addControl(control);
        });
        nRadioButtons = b["radiobuttons"].length;
      }
      var nPushButtons = 0;
      if (b["pushbuttons"]) {
        b["pushbuttons"].forEach(function(pushbutton, i) {
          var id = pushbutton["id"];
          var bounds = svg.getElementBounds(id);
          var control = new A3a.vpl.BlockParamAccessibility.Control((bounds.ymin - svg.viewBox[1]) / (svg.viewBox[3] - svg.viewBox[1]), (bounds.xmin - svg.viewBox[0]) / (svg.viewBox[2] - svg.viewBox[0]), (bounds.ymax - svg.viewBox[1]) / (svg.viewBox[3] - svg.viewBox[1]), (bounds.xmax - svg.viewBox[0]) / (svg.viewBox[2] - svg.viewBox[0]), function(block) {
            block.beginChange();
            var p = pushbutton["newParameters"];
            if (typeof p === "string" && /^`.+`$/.test(p)) {
              p = A3a.vpl.BlockTemplate.substInline(p, block.param, undefined, true);
            }
            block.param = p;
            block.endChange();
          }, null, null);
          if (paramAccessibility == null) {
            paramAccessibility = new A3a.vpl.BlockParamAccessibility;
          }
          paramAccessibility.addControl(control);
        });
        nPushButtons = b["pushbuttons"].length;
      }
      var nSliders = 0;
      if (b["sliders"]) {
        b["sliders"].forEach(function(slider, i) {
          var id = slider["id"];
          var bounds = svg.getElementBounds(id);
          var bndsThumb = svg.getElementBounds(slider["thumbId"]);
          var bndThumbWidth = Math.abs(bndsThumb.xmax - bndsThumb.xmin);
          var bndThumbHeight = Math.abs(bndsThumb.ymax - bndsThumb.ymin);
          var min = slider["min"];
          var max = slider["max"];
          var discrete = slider["discrete"];
          var control = new A3a.vpl.BlockParamAccessibility.Control((bounds.ymin - bndThumbHeight / 2 - svg.viewBox[1]) / (svg.viewBox[3] - svg.viewBox[1]), (bounds.xmin - bndThumbWidth / 2 - svg.viewBox[0]) / (svg.viewBox[2] - svg.viewBox[0]), (bounds.ymax + bndThumbHeight / 2 - svg.viewBox[1]) / (svg.viewBox[3] - svg.viewBox[1]), (bounds.xmax + bndThumbWidth / 2 - svg.viewBox[0]) / (svg.viewBox[2] - svg.viewBox[0]), null, function(block) {
            var val = block.param[nButtons + nRadioButtons + nPushButtons + i];
            if (discrete) {
              var ix = discrete.indexOf(val);
              val = ix >= 0 && ix + 1 < discrete.length ? discrete[ix + 1] : discrete.length > 0 ? discrete[discrete.length - 1] : Math.max(min, max);
            } else {
              val = Math.min(Math.max(min, max), val + Math.abs(max - min) / 10);
            }
            block.param[nButtons + nRadioButtons + nPushButtons + i] = val;
          }, function(block) {
            var val = block.param[nButtons + nRadioButtons + nPushButtons + i];
            if (discrete) {
              var ix = discrete.indexOf(val);
              val = ix >= 0 && ix > 0 ? discrete[ix - 1] : discrete.length > 0 ? discrete[0] : Math.min(min, max);
            } else {
              val = Math.max(Math.min(min, max), val - Math.abs(max - min) / 10);
            }
            block.param[nButtons + nRadioButtons + nPushButtons + i] = val;
          });
          if (paramAccessibility == null) {
            paramAccessibility = new A3a.vpl.BlockParamAccessibility;
          }
          paramAccessibility.addControl(control);
        });
        nSliders = b["sliders"].length;
      }
      var nRotatings = 0;
      if (b["rotating"]) {
        b["rotating"].forEach(function(rotating, i) {
          var id = rotating["id"];
          var bounds = svg.getElementBounds(id);
          var bndsCenter = svg.getElementBounds(rotating["centerId"]);
          var x0 = (bndsCenter.xmin + bndsCenter.xmax) / 2;
          var y0 = (bndsCenter.ymin + bndsCenter.ymax) / 2;
          var r = Math.max(Math.max(Math.abs(bounds.xmin - x0), Math.abs(bounds.xmax - x0)), Math.max(Math.abs(bounds.ymin - y0), Math.abs(bounds.ymax - y0)));
          var numSteps = rotating["numSteps"];
          var min = -Math.floor(numSteps / 2);
          var control = new A3a.vpl.BlockParamAccessibility.Control((y0 - r - svg.viewBox[1]) / (svg.viewBox[3] - svg.viewBox[1]), (x0 - r - svg.viewBox[0]) / (svg.viewBox[2] - svg.viewBox[0]), (y0 + r - svg.viewBox[1]) / (svg.viewBox[3] - svg.viewBox[1]), (x0 + r - svg.viewBox[0]) / (svg.viewBox[2] - svg.viewBox[0]), null, function(block) {
            var val = (block.param[nButtons + nRadioButtons + nPushButtons + nSliders + i] + numSteps - min + 1) % numSteps + min;
            block.param[nButtons + nRadioButtons + nPushButtons + nSliders + i] = val;
          }, function(block) {
            var val = (block.param[nButtons + nRadioButtons + nPushButtons + nSliders + i] + numSteps - min - 1) % numSteps + min;
            block.param[nButtons + nRadioButtons + nPushButtons + nSliders + i] = val;
          });
          if (paramAccessibility == null) {
            paramAccessibility = new A3a.vpl.BlockParamAccessibility;
          }
          paramAccessibility.addControl(control);
        });
        nRotatings = b["rotating"].length;
      }
      if (b["score"]) {
        var id = b["score"]["id"];
        var bounds = svg.getElementBounds(id);
        var numNotes = (b["defaultParameters"].length - nButtons - nRadioButtons - nPushButtons - nSliders - nRotatings) / 2;
        var numHeights = b["score"]["numHeights"] || 5;
        for (var i = 0; i < numNotes; i++) {
          (function(i) {
            var po = nButtons + nRadioButtons + nPushButtons + nSliders + nRotatings;
            var control = new A3a.vpl.BlockParamAccessibility.Control((bounds.ymin - svg.viewBox[1]) / (svg.viewBox[3] - svg.viewBox[1]), (bounds.xmin - svg.viewBox[0] + (bounds.xmax - bounds.xmin) * i / numNotes) / (svg.viewBox[2] - svg.viewBox[0]), (bounds.ymax - svg.viewBox[1]) / (svg.viewBox[3] - svg.viewBox[1]), (bounds.xmin - svg.viewBox[0] + (bounds.xmax - bounds.xmin) * (i + 1) / numNotes) / (svg.viewBox[2] - svg.viewBox[0]), function(block) {
              block.param[po + 2 * i + 1] = A3a.vpl.BlockTemplate.nextCheckboxState(block.param[po + 2 * i + 1], [0, 1, 2]);
            }, function(block) {
              if (block.param[po + 2 * i + 1] === 0) {
                block.param[po + 2 * i] = 0;
                block.param[po + 2 * i + 1] = 1;
              } else {
                block.param[po + 2 * i] = Math.min(block.param[po + 2 * i] + 1, numHeights - 1);
              }
            }, function(block) {
              if (block.param[po + 2 * i + 1] === 0) {
                block.param[po + 2 * i] = 0;
                block.param[po + 2 * i + 1] = 1;
              } else {
                block.param[po + 2 * i] = Math.max(block.param[po + 2 * i] - 1, 0);
              }
            }, function(block, x, y) {
              var pitch = numHeights - 1 - Math.floor(y * numHeights * 0.9999);
              if (block.param[po + 2 * i + 1] === 0) {
                block.param[po + 2 * i] = pitch;
                block.param[po + 2 * i + 1] = 1;
              } else {
                if (block.param[po + 2 * i] === pitch) {
                  block.param[po + 2 * i + 1] = A3a.vpl.BlockTemplate.nextCheckboxState(block.param[po + 2 * i + 1], [0, 1, 2]);
                } else {
                  block.param[po + 2 * i] = pitch;
                }
              }
            });
            if (paramAccessibility == null) {
              paramAccessibility = new A3a.vpl.BlockParamAccessibility;
            }
            paramAccessibility.addControl(control);
          })(i);
        }
      }
    }
    var p = {name:name, type:type, modes:modes, defaultParam:blockTemplate0 ? blockTemplate0.defaultParam : function() {
      return b["defaultParameters"] || [];
    }, typicalParam:blockTemplate0 ? blockTemplate0.typicalParam : function() {
      return b["typicalParameters"] || b["defaultParameters"] || [];
    }, typicalParamSet:blockTemplate0 ? blockTemplate0.typicalParamSet || null : b["typicalParamSet"] || null, paramAccessibility:paramAccessibility, draw:draw, alwaysZoom:blockTemplate0 ? blockTemplate0.alwaysZoom || false : b["alwaysZoom"] || false, mousedown:mousedown, mousedrag:mousedrag, genCode:genCode, validate:validate};
    if (blockIndex >= 0) {
      lib[blockIndex] = new A3a.vpl.BlockTemplate(p);
    } else {
      lib.push(new A3a.vpl.BlockTemplate(p));
    }
  });
};
A3a.vpl.patchBlocksSVG = function(uiConfig) {
  A3a.vpl.BlockTemplate.uiConfig = uiConfig;
  A3a.vpl.Canvas.calcDims = function(blockSize, controlSize) {
    return {blockSize:blockSize, minInteractiveBlockSize:uiConfig["styles"]["minInteractiveBlockSize"] === undefined ? 60 : uiConfig["styles"]["minInteractiveBlockSize"], minTouchInteractiveBlockSize:uiConfig["styles"]["minTouchInteractiveBlockSize"] === undefined ? 120 : uiConfig["styles"]["minTouchInteractiveBlockSize"], eventRightAlign:uiConfig["styles"]["eventRightAlign"] === undefined ? false : uiConfig["styles"]["eventRightAlign"], blockLineWidth:uiConfig["styles"]["blockLineWidth"] === undefined ? 
    Math.max(1, Math.min(3, blockSize / 40)) : uiConfig["styles"]["blockLineWidth"], blockFont:Math.round(blockSize / 4).toString(10) + "px sans-serif", controlSize:controlSize, controlLineWidth:uiConfig["styles"]["controlLineWidth"] === undefined ? Math.max(1, Math.min(3, blockSize / 40)) : uiConfig["styles"]["controlLineWidth"], controlFont:"bold 15px sans-serif", errorColor:uiConfig["styles"]["errorColor"] || "#f88", warningColor:uiConfig["styles"]["warningColor"] || "#f88", background:uiConfig["styles"]["background"] || 
    "white", ruleMarks:uiConfig["styles"]["ruleMarks"] || "#bbb", scrollbarThumbColor:uiConfig["styles"]["scrollbarThumbColor"] || "navy", scrollbarBackgroundColor:uiConfig["styles"]["scrollbarBackgroundColor"] || "#ccc", scrollbarWidth:uiConfig["styles"]["scrollbarWidth"] || 5};
  };
  var lib = [];
  A3a.vpl.loadBlockOverlay(uiConfig, uiConfig["blocks"] || [], lib);
  A3a.vpl.BlockTemplate.lib = lib;
};
A3a.vpl.Error = function(msg, isWarning) {
  this.msg = msg;
  this.isWarning = isWarning || false;
  this.eventError = false;
  this.eventErrorIndices = [];
  this.actionErrorIndices = [];
  this.conflictEventHandler = null;
};
A3a.vpl.Error.prototype.addEventError = function(eventIndices) {
  this.eventError = true;
  this.eventErrorIndices = eventIndices;
};
A3a.vpl.Error.prototype.addEventConflictError = function(conflictEventHandler) {
  this.eventError = true;
  this.conflictEventHandler = conflictEventHandler;
};
A3a.vpl.Error.prototype.addActionError = function(i) {
  this.actionErrorIndices.push(i);
};
A3a.vpl.Undo = function() {
  this.undoStack = [];
  this.redoStack = [];
  this.maxDepth = 20;
};
A3a.vpl.Undo.MarkedState = function(state, marks) {
  this.state = state;
  this.marks = marks || {};
};
A3a.vpl.Undo.prototype.reset = function() {
  this.undoStack = [];
  this.redoStack = [];
};
A3a.vpl.Undo.prototype.clearMarks = function(marks) {
  function clearMarksInState(markedState) {
    if (marks) {
      if (markedState.marks) {
        for (var key in markedState.marks) {
          if (markedState.marks.hasOwnProperty(key) && marks[key]) {
            markedState.marks[key] = false;
          }
        }
      }
    } else {
      markedState.marks = {};
    }
  }
  this.undoStack.forEach(clearMarksInState);
  this.redoStack.forEach(clearMarksInState);
};
A3a.vpl.Undo.prototype.saveStateBeforeChange = function(state, marks) {
  if (marks) {
    this.clearMarks(marks);
  }
  this.undoStack.push(new A3a.vpl.Undo.MarkedState(state, marks));
  if (this.undoStack.length > this.maxDepth) {
    this.undoStack = this.undoStack.slice(-this.maxDepth);
  }
  this.redoStack = [];
};
A3a.vpl.Undo.prototype.undo = function(state, marks) {
  if (marks) {
    this.clearMarks(marks);
  }
  if (this.undoStack.length > 0) {
    this.redoStack.push(new A3a.vpl.Undo.MarkedState(state, marks));
    return this.undoStack.pop();
  } else {
    return new A3a.vpl.Undo.MarkedState(state, marks);
  }
};
A3a.vpl.Undo.prototype.redo = function(state, marks) {
  if (marks) {
    this.clearMarks(marks);
  }
  if (this.redoStack.length > 0) {
    this.undoStack.push(new A3a.vpl.Undo.MarkedState(state, marks));
    return this.redoStack.pop();
  } else {
    return new A3a.vpl.Undo.MarkedState(state, marks);
  }
};
A3a.vpl.Undo.prototype.canUndo = function() {
  return this.undoStack.length > 0;
};
A3a.vpl.Undo.prototype.canRedo = function() {
  return this.redoStack.length > 0;
};
A3a.vpl.Block.prototype.toDataURL = function(css, dims, scale) {
  var self = this;
  var box;
  switch(this.blockTemplate.type) {
    case A3a.vpl.blockType.event:
      box = css.getBox({tag:"block", clas:["event", "html"]});
      break;
    case A3a.vpl.blockType.action:
      box = css.getBox({tag:"block", clas:["action", "html"]});
      break;
    case A3a.vpl.blockType.state:
      box = css.getBox({tag:"block", clas:["state", "html"]});
      break;
    case A3a.vpl.blockType.comment:
      box = css.getBox({tag:"block", clas:["comment", "html"]});
      break;
    default:
      throw "internal";
  }
  var scx = dims.blockSize / box.width;
  var scy = dims.blockSize / box.height;
  box.width = dims.blockSize;
  box.height = dims.blockSize;
  function scaleBorderRadius(r) {
    if (r) {
      r[0] *= scx;
      r[1] *= scy;
    }
  }
  scaleBorderRadius(box.borderBottomLeftRadius);
  scaleBorderRadius(box.borderBottomRightRadius);
  scaleBorderRadius(box.borderTopLeftRadius);
  scaleBorderRadius(box.borderTopRightRadius);
  var item = new A3a.vpl.CanvasItem(this, box.totalWidth(), box.totalHeight(), 0, 0, function(canvas, item, dx, dy, isZoomed) {
    var x = item.x + box.offsetLeft() + dx;
    var y = item.y + box.offsetTop() + dy;
    box.drawAt(canvas.ctx, x, y);
    self.blockTemplate.renderToCanvas(canvas, item.data, box, x, y, isZoomed);
  });
  return item.toDataURL(dims, scale || 1);
};
A3a.vpl.Block.prototype.toImgElement = function(css, dims, scale, downloadFilename) {
  var dataURL = this.toDataURL(css, dims, scale);
  var img = "<img width='" + dims.blockSize.toString(10) + "' height='" + dims.blockSize.toString(10) + "' src='" + dataURL + "'>";
  return downloadFilename ? "<a href='" + dataURL + "' download='" + downloadFilename + "'>" + img + "</a>" : img;
};
A3a.vpl.Canvas.prototype.widgetToDataURL = function(id, css, dims, scale) {
  var box = css.getBox({tag:"widget", id:"widget-" + id.replace(/^.*:/g, "")});
  var width = box.totalWidth();
  var height = box.totalHeight();
  var self = this;
  var item = new A3a.vpl.CanvasItem(null, width, height, 0, 0, function(canvas, item, dx, dy) {
    canvas.widgets = self.widgets;
    canvas.drawWidget(id, width / 2 + dx, height / 2 + dy, box);
  });
  return {url:item.toDataURL(dims, scale || 1), width:width, height:height};
};
A3a.vpl.Canvas.prototype.widgetToImgElement = function(id, css, dims, scale, downloadFilename) {
  var data = this.widgetToDataURL(id, css, dims, scale);
  var img = "<img width='" + data.width.toString(10) + "' height='" + data.height.toString(10) + "' src='" + data.url + "'>";
  return downloadFilename ? "<a href='" + data.url + "' download='" + downloadFilename + "'>" + img + "</a>" : img;
};
A3a.vpl.Canvas.controlToDataURL = function(draw, width, height, itemBox, dims, scale) {
  var item = new A3a.vpl.CanvasItem(null, width, height, 0, 0, function(canvas, item, dx, dy) {
    draw(canvas.ctx, itemBox, false);
  });
  return {url:item.toDataURL(dims, scale || 1), width:width, height:height};
};
A3a.vpl.ControlBar.prototype.toolbarButtonToDataURL = function(id, itemBox, dims, scale) {
  for (var i = 0; i < this.controls.length; i++) {
    var control = this.controls[i];
    if (control.id === id) {
      var draw = function(ctx, box, isPressed) {
        control.draw(ctx, box, isPressed);
      };
      var width = control.bounds.xmax - control.bounds.xmin;
      var height = control.bounds.ymax - control.bounds.ymin;
      return A3a.vpl.Canvas.controlToDataURL(draw, width, height, itemBox, dims, scale);
    }
  }
  return null;
};
A3a.vpl.Canvas.prototype.toolbarButtonToImgElement = function(controlbar, id, itemBox, dims, scale, downloadFilename) {
  var data = controlbar.toolbarButtonToDataURL(id, itemBox, dims, scale);
  var img = "<img width='" + data.width.toString(10) + "' height='" + data.height.toString(10) + "' src='" + data.url + "'>";
  return downloadFilename ? "<a href='" + data.url + "' download='" + downloadFilename + "'>" + img + "</a>" : img;
};
A3a.vpl.Application.prototype.toHTMLDocument = function(css) {
  var dims = A3a.vpl.Canvas.calcDims(100, 100);
  var scale = 5;
  var thenWidgetImg = this.vplCanvas.widgetToImgElement("vpl:then", css, dims, scale);
  return "<!DOCTYPE html>\n" + "<html>\n" + (this.cssForHTMLDocument ? "<head>\n<style>\n" + this.cssForHTMLDocument + "</style>\n</head>\n" : "") + "<body>\n" + "<table class='program'>\n" + this.program.program.map(function(rule) {
    return rule instanceof A3a.vpl.RuleComment ? "<tr class='rule-comment'>\n" + "<td class='comment'>\n" + rule.comment + "\n" + "</td>\n" + "</tr>\n" : rule.isEmpty() ? "" : "<tr class='rule'>\n" + "<td class='events'>\n" + "<table class='events'>\n" + "<tr class='events'>\n" + rule.events.map(function(event, i) {
      var classes = "block";
      switch(event.blockTemplate.type) {
        case A3a.vpl.blockType.event:
          classes += " event";
          classes += i === 0 ? " event-main" : " event-aux";
          break;
        case A3a.vpl.blockType.state:
          classes += " state";
          break;
        case A3a.vpl.blockType.comment:
          classes += " comment";
          break;
      }
      return "<td class='" + classes + "'>" + event.toImgElement(css, dims, scale) + "</td>\n";
    }).join("") + "</tr>\n" + "</table>\n" + "</td>\n" + "<td class='then'>" + thenWidgetImg + "</td>\n" + "<td class='actions'>\n" + "<table class='actions'>\n" + "<tr class='actions'>\n" + rule.actions.map(function(action) {
      var classes = "block";
      switch(action.blockTemplate.type) {
        case A3a.vpl.blockType.action:
          classes += " action";
          break;
        case A3a.vpl.blockType.comment:
          classes += " comment";
          break;
      }
      return "<td class='" + classes + "'>" + action.toImgElement(css, dims, scale) + "</td>\n";
    }).join("") + "</tr>\n" + "</table>\n" + "</td>\n" + "</tr>\n";
  }).join("") + "</table>\n" + "</body>\n" + "</html>\n";
};
A3a.vpl.Application.prototype.uiToHTMLDocument = function(css, blocksOnly) {
  function controlToHTML(id, data) {
    var img = "<img width='" + data.width.toString(10) + "' height='" + data.height.toString(10) + "' src='" + data.url + "'>";
    var downloadFilename = id.replace(/ /g, "_") + ".png";
    var a = "<a href='" + data.url + "' download='" + downloadFilename + "'>" + img + "</a>";
    return "<tr><td>" + a + "</td><td>" + id + "</td></tr>\n";
  }
  function toolbarButtonsToHTML(app, controlBar) {
    return controlBar.controls.map(function(control) {
      var possibleStates = app.commands.find(control.id).possibleStates || [{}];
      return possibleStates.map(function(possibleState) {
        app.forcedCommandState.isSelected = possibleState.selected === true;
        app.forcedCommandState.state = possibleState.state || null;
        var stateStr = possibleState.selected === true ? "selected" : possibleState.selected === false ? "unselected" : "";
        if (possibleState.state) {
          stateStr += (stateStr.length > 0 ? " " : "") + "=" + possibleState.state;
        }
        var buttonImg = app.vplCanvas.toolbarButtonToImgElement(controlBar, control.id, toolbarItemBoxes[control.id], dims, scale, control.id + (stateStr ? "-" + stateStr.replace(/\s+/g, "-").replace("=", "") : "") + ".png");
        return "<tr><td>" + buttonImg + "</td><td>" + control.id + "</td><td>" + stateStr + "</td></tr>\n";
      }).join("");
    }).join("");
  }
  var dims = A3a.vpl.Canvas.calcDims(100, 100);
  var scale = 5;
  var cssBoxes = this.getCSSBoxes(css);
  this.forcedCommandState = {disabled:false, isAvailable:true, isPressed:false, isEnabled:true, isSelected:false, state:null};
  var toolbarItemBoxes = A3a.vpl.ControlBar.buttonBoxes(this, this.vplToolbarConfig, ["vpl", "top"]);
  var controlBar = this.createVPLToolbar(this.vplToolbarConfig, ["vpl", "top"], cssBoxes.toolbarBox, cssBoxes.toolbarSeparatorBox, toolbarItemBoxes);
  toolbarItemBoxes = Object.assign(toolbarItemBoxes, A3a.vpl.ControlBar.buttonBoxes(this, this.vplToolbar2Config, ["vpl", "bottom"]));
  var controlBar2 = this.createVPLToolbar(this.vplToolbar2Config, ["vpl", "bottom"], cssBoxes.toolbar2Box, cssBoxes.toolbarSeparator2Box, toolbarItemBoxes);
  this.srcToolbarConfig.forEach(function(id) {
    toolbarItemBoxes[id] = css.getBox({tag:"button", id:id.replace(/:/g, "-"), clas:["src", "top"]});
  }, this);
  var controlBarSourceEditor = null;
  if (this.editor != null) {
    controlBarSourceEditor = this.createSourceEditorToolbar(this.srcToolbarConfig, css.getBox({tag:"toolbar", clas:["src", "top"]}), css.getBox({tag:"separator", clas:["src", "top"]}), toolbarItemBoxes);
  }
  this.simToolbarConfig.forEach(function(id) {
    toolbarItemBoxes[id] = css.getBox({tag:"button", id:id.replace(/:/g, "-"), clas:["sim", "top"]});
  }, this);
  var sim2d = this.sim2d;
  var controlBarSimulator = null;
  var eventButtons = [];
  var eventButtonsSimulator = null;
  if (sim2d != null) {
    controlBarSimulator = this.createSim2dToolbar(this.simToolbarConfig, css.getBox({tag:"toolbar", clas:["sim", "top"]}), css.getBox({tag:"separator", clas:["sim", "top"]}), toolbarItemBoxes);
    eventButtons = ["sim-event:forward", "sim-event:backward", "sim-event:left", "sim-event:right", "sim-event:center", "sim-event:clap", "sim-event:tap"];
    var eventButtonBox = css.getBox({tag:"button", clas:["sim", "event"]});
    eventButtonsSimulator = eventButtons.map(function(id) {
      var draw = function(ctx, box, isPressed) {
        (sim2d.toolbarDrawButton || A3a.vpl.Commands.drawButtonJS)(id, ctx, dims, css, ["sim", "event"], null, true, false, isPressed);
      };
      var dataURL = A3a.vpl.Canvas.controlToDataURL(draw, eventButtonBox.width, eventButtonBox.height, eventButtonBox, dims, scale);
      return dataURL;
    });
  }
  var program = this.program;
  var html = blocksOnly ? "<!DOCTYPE html>\n" + "<html>\n" + (this.cssForHTMLDocument ? "<head>\n<style>\n" + this.cssForHTMLDocument + "</style>\n</head>\n" : "") + "<body>\n" + "<table>\n" + function() {
    var ixEv = 0;
    var ixAc = 0;
    var html1 = "";
    while (true) {
      while (ixEv < A3a.vpl.BlockTemplate.lib.length && (A3a.vpl.BlockTemplate.lib[ixEv].type !== A3a.vpl.blockType.event && A3a.vpl.BlockTemplate.lib[ixEv].type !== A3a.vpl.blockType.state || (program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced).indexOf(A3a.vpl.BlockTemplate.lib[ixEv].name) < 0)) {
        ixEv++;
      }
      var htmlEv = "";
      if (ixEv < A3a.vpl.BlockTemplate.lib.length) {
        var block = new A3a.vpl.Block(A3a.vpl.BlockTemplate.lib[ixEv], null, null);
        if (A3a.vpl.BlockTemplate.lib[ixEv].typicalParam) {
          block.param = A3a.vpl.BlockTemplate.lib[ixEv].typicalParam();
        }
        htmlEv = block.toImgElement(css, dims, scale, A3a.vpl.BlockTemplate.lib[ixEv].name.replace(/ /g, "_") + ".png");
        ixEv++;
      }
      while (ixAc < A3a.vpl.BlockTemplate.lib.length && (A3a.vpl.BlockTemplate.lib[ixAc].type !== A3a.vpl.blockType.action && A3a.vpl.BlockTemplate.lib[ixAc].type !== A3a.vpl.blockType.comment || (program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced).indexOf(A3a.vpl.BlockTemplate.lib[ixAc].name) < 0)) {
        ixAc++;
      }
      var htmlAc = "";
      if (ixAc < A3a.vpl.BlockTemplate.lib.length) {
        var block = new A3a.vpl.Block(A3a.vpl.BlockTemplate.lib[ixAc], null, null);
        if (A3a.vpl.BlockTemplate.lib[ixAc].typicalParam) {
          block.param = A3a.vpl.BlockTemplate.lib[ixAc].typicalParam();
        }
        htmlAc = block.toImgElement(css, dims, scale, A3a.vpl.BlockTemplate.lib[ixAc].name.replace(/ /g, "_") + ".png");
        ixAc++;
      }
      if (htmlEv || htmlAc) {
        html1 += "<tr>\n<td>" + htmlEv + "</td>\n<td>" + htmlAc + "</td>\n</tr>\n";
      } else {
        break;
      }
    }
    return html1;
  }() + "</table>" + "</html>" : "<!DOCTYPE html>\n" + "<html>\n" + (this.cssForHTMLDocument ? "<head>\n<style>\n" + this.cssForHTMLDocument + "</style>\n</head>\n" : "") + "<body>\n" + "<table>\n" + A3a.vpl.BlockTemplate.lib.map(function(blockTemplate, i) {
    var cl = null;
    switch(blockTemplate.type) {
      case A3a.vpl.blockType.event:
        cl = "event";
        break;
      case A3a.vpl.blockType.state:
        cl = "state";
        break;
      case A3a.vpl.blockType.action:
        cl = "action";
        break;
      case A3a.vpl.blockType.comment:
        cl = "comment";
        break;
      default:
        return "";
    }
    var block = new A3a.vpl.Block(blockTemplate, null, null);
    var html = "<tr class='" + cl + "'>\n" + "<td>\n";
    if (blockTemplate.typicalParamSet) {
      blockTemplate.typicalParamSet.forEach(function(param, i) {
        block.param = param;
        html += block.toImgElement(css, dims, scale, blockTemplate.name.replace(/ /g, "_") + "-" + i.toString(10) + ".png");
      });
    } else {
      block.param = blockTemplate.typicalParam ? blockTemplate.typicalParam() : block.param;
      html += block.toImgElement(css, dims, scale, blockTemplate.name.replace(/ /g, "_") + ".png");
    }
    html += "</td>\n" + "<td>" + blockTemplate.name + "</td>\n" + "</tr>\n";
    return html;
  }).join("") + "</table>\n" + "<table>\n" + Object.keys(this.vplCanvas.widgets).map(function(widgetId) {
    var widgetImg = this.vplCanvas.widgetToImgElement(widgetId, css, dims, scale, widgetId + ".png");
    return "<tr><td>" + widgetImg + "</td><td>" + widgetId + "</td></tr>\n";
  }, this).join("") + "</table>\n" + "<table>\n" + toolbarButtonsToHTML(this, controlBar) + toolbarButtonsToHTML(this, controlBar2) + (this.editor != null ? toolbarButtonsToHTML(this, controlBarSourceEditor) : "") + (sim2d != null ? toolbarButtonsToHTML(this, controlBarSimulator) + eventButtonsSimulator.map(function(data, i) {
    return controlToHTML(eventButtons[i], data);
  }) : "") + "</table>\n" + "</body>\n" + "</html>\n";
  this.forcedCommandState = null;
  return html;
};
A3a.vpl.Program.toAESLFile = function(code, vplProgramXML) {
  return ["<!DOCTYPE aesl-source>", "<network>", '<keywords flag="true"/>', '<node nodeId="1" name="thymio-II">' + code.replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/</g, "&lt;").replace(/>/g, "&gt;"), vplProgramXML || ""].join("\n");
};
A3a.vpl.Program.prototype.importFromAESLFile = function(xml) {
  var self = this;
  var domParser = new DOMParser;
  var dom = domParser.parseFromString(xml, "text/xml");
  var el = dom.getElementsByTagName("node");
  if (el.length < 1) {
    throw "empty";
  }
  el = el[0].getElementsByTagName("program");
  if (el.length !== 1) {
    throw "program";
  }
  var advanced = el[0].getAttribute("advanced_mode") !== "0";
  el = el[0].getElementsByTagName("set");
  this.new();
  this.mode = advanced ? A3a.vpl.mode.advanced : A3a.vpl.mode.basic;
  for (var i = 0; i < el.length; i++) {
    var rule = A3a.vpl.Rule.parseFromAESLSetElement(el[i], advanced, function() {
      self.saveStateBeforeChange();
    }, function() {
      self.saveStateAfterChange();
    });
    this.program.push(rule);
  }
};
A3a.vpl.Rule.parseFromAESLSetElement = function(setElement, advanced, onPrepareChange, onChanged) {
  var blocks = setElement.getElementsByTagName("block");
  var rule = new A3a.vpl.Rule;
  for (var i = 0; i < blocks.length; i++) {
    var block = A3a.vpl.Block.parseFromAESLBlockElement(blocks[i], advanced);
    if (block) {
      rule.setBlock(block, null, onPrepareChange, onChanged, true);
    }
  }
  return rule;
};
A3a.vpl.Block.parseFromAESLBlockElement = function(blockElement, advanced) {
  var type = {"event":A3a.vpl.blockType.event, "action":A3a.vpl.blockType.action, "state":A3a.vpl.blockType.state, "comment":A3a.vpl.blockType.comment}[blockElement.getAttribute("type")] || A3a.vpl.blockType.action;
  var aeslName = blockElement.getAttribute("name");
  var valStr = [];
  var val = [];
  for (var i = 0; i < 1000; i++) {
    var v = blockElement.getAttribute("value" + i);
    if (v === null) {
      break;
    }
    valStr.push(v);
    val.push(parseFloat(v));
  }
  for (var i = 0; i < A3a.vpl.BlockTemplate.aeslImportRules.length; i++) {
    if (aeslName === A3a.vpl.BlockTemplate.aeslImportRules[i].aeslName) {
      var cond = !A3a.vpl.BlockTemplate.aeslImportRules[i].condition || A3a.vpl.BlockTemplate.substInline(A3a.vpl.BlockTemplate.aeslImportRules[i].condition, A3a.vpl.BlockTemplate.aeslImportRules[i].stringParam ? valStr : val, undefined, true);
      if (cond) {
        var blockName = A3a.vpl.BlockTemplate.aeslImportRules[i].blockName;
        if (blockName == undefined) {
          return null;
        }
        var parameters = A3a.vpl.BlockTemplate.aeslImportRules[i].parameters ? A3a.vpl.BlockTemplate.substInline(A3a.vpl.BlockTemplate.aeslImportRules[i].parameters, A3a.vpl.BlockTemplate.aeslImportRules[i].stringParam ? valStr : val, undefined, true) : null;
        var blockTemplate = A3a.vpl.BlockTemplate.findByName(blockName);
        var block = new A3a.vpl.Block(blockTemplate, null, null);
        if (blockTemplate.importParam) {
          blockTemplate.importParam(block, parameters);
        } else {
          block.param = parameters;
        }
        return block;
      }
    }
  }
  throw "unknown AESL block " + aeslName;
};
A3a.vpl.Program.setAnchorDownload = function(anchor, text, filename, mimetype) {
  mimetype = mimetype || "application/xml";
  var url;
  if (typeof window.Blob === "function" && window.URL) {
    var blob = new window.Blob([text], {"type":mimetype});
    url = window.URL.createObjectURL(blob);
  } else {
    url = "data:" + mimetype + ";base64," + window["btoa"](text);
  }
  anchor.href = url;
  anchor["download"] = filename || "untitled.xml";
};
A3a.vpl.Program.downloadText = function() {
  var anchor = null;
  return function(text, filename, mimetype) {
    if (anchor === null) {
      anchor = document.createElement("a");
      document.body.appendChild(anchor);
      anchor.style.display = "none";
    }
    mimetype = mimetype || "application/xml";
    var url;
    if (typeof window.Blob === "function" && window.URL) {
      var blob = new window.Blob([text], {"type":mimetype});
      url = window.URL.createObjectURL(blob);
    } else {
      url = "data:" + mimetype + ";base64," + window["btoa"](text);
    }
    A3a.vpl.Program.setAnchorDownload(anchor, text, filename, mimetype);
    anchor.click();
    if (typeof url !== "string") {
      window.URL.revokeObjectURL(url);
    }
  };
}();
A3a.vpl.TextEditor = function(textareaId, preId, topMargin, leftMargin) {
  this.textarea = document.getElementById(textareaId);
  this.textarea.value = "";
  this.div = this.textarea.parentElement;
  this.pre = preId ? null : document.getElementById(preId);
  this.topMargin = topMargin || 0;
  this.leftMargin = leftMargin || 0;
  var width = window.innerWidth - this.leftMargin;
  var height = window.innerHeight - this.topMargin;
  var taStyle = window.getComputedStyle(this.textarea);
  var taWidth = width - (this.pre ? this.pre.getBoundingClientRect().width : 0) - 10 - parseInt(taStyle.paddingLeft, 10) - parseInt(taStyle.paddingRight, 10);
  this.textarea.style.width = taWidth + "px";
  this.textarea.style.border = "0px";
  this.textarea.style.outline = "none";
  this.textarea.style.resize = "none";
  this.textarea.style.whiteSpace = "pre";
  this.textarea.setAttribute("wrap", "off");
  if (this.pre) {
    this.pre.style.height = height + "px";
    this.pre.style.fontFamily = taStyle.fontFamily;
    this.pre.style.fontSize = taStyle.fontSize;
    this.pre.style.height = taStyle.height;
    this.pre.style.maxHeight = taStyle.height;
    var self = this;
    this.textarea.addEventListener("scroll", function(e) {
      self.pre.scrollTop = this.scrollTop;
    }, false);
    this.textarea.addEventListener("input", function(e) {
      self.updateLineNumbers();
    }, false);
    this.textarea.style.overflowX = "hidden";
  }
  this.breakpointsEnabled = false;
  this.breakpoints = [];
  this.currentLine = -1;
  this.onBreakpointChanged = null;
  this.updateLineNumbers();
};
A3a.vpl.TextEditor.prototype.addResizeListener = function() {
  var self = this;
  window.addEventListener("resize", function(e) {
    self.resize();
  }, true);
};
A3a.vpl.TextEditor.OnBreakpointChanged;
A3a.vpl.TextEditor.prototype.setReadOnly = function(ro) {
  this.textarea.readOnly = ro;
};
A3a.vpl.TextEditor.prototype.selectRange = function(begin, end) {
  this.textarea.setSelectionRange(begin, end);
};
A3a.vpl.TextEditor.prototype.clearBreakpoints = function() {
  this.breakpoints = [];
  this.updateLineNumbers();
  this.onBreakpointChanged && this.onBreakpointChanged(this.breakpoints);
};
A3a.vpl.TextEditor.prototype.toggleBreakpoint = function(line) {
  if (this.breakpoints.indexOf(line) >= 0) {
    this.breakpoints.splice(this.breakpoints.indexOf(line), 1);
  } else {
    this.breakpoints.push(line);
  }
  this.updateLineNumbers();
  this.onBreakpointChanged && this.onBreakpointChanged(this.breakpoints);
};
A3a.vpl.TextEditor.prototype.resize = function() {
  var parentBB = this.div.getBoundingClientRect();
  var width = parentBB.width - this.leftMargin;
  var height = window.innerHeight - this.topMargin;
  var taStyle = window.getComputedStyle(this.textarea);
  var taWidth = width - (this.pre ? this.pre.getBoundingClientRect().width : 0) - 10 - parseInt(taStyle.paddingLeft, 10) - parseInt(taStyle.paddingRight, 10);
  this.textarea.style.width = taWidth + "px";
  if (this.pre) {
    this.pre.style.height = height + "px";
    this.pre.style.maxHeight = height + "px";
  }
};
A3a.vpl.TextEditor.prototype.updateLineNumbers = function() {
  if (this.pre) {
    var lineCount = this.textarea.value.split("\n").length;
    var preLineCount = this.pre.textContent.split("\n").length;
    var txt = [];
    for (var i = 0; i < lineCount; i++) {
      txt.push((i + 1 === this.currentLine ? "\u25b6 " : this.breakpoints.indexOf(i + 1) >= 0 ? "\u25ce " : "  ") + (i + 1).toString(10));
    }
    while (this.pre.firstElementChild) {
      this.pre.removeChild(this.pre.firstElementChild);
    }
    var self = this;
    txt.forEach(function(t, i) {
      var el = document.createElement("span");
      el.textContent = t + "\n";
      if (this.breakpointsEnabled) {
        el.addEventListener("click", function() {
          self.toggleBreakpoint(i + 1);
        });
      }
      this.pre.appendChild(el);
    }, this);
  }
};
A3a.vpl.TextEditor.prototype.setContent = function(text) {
  this.textarea.value = text;
  var height = this.div.clientHeight;
  var taStyle = window.getComputedStyle(this.textarea);
  if (this.pre) {
    this.pre.style.height = taStyle.height;
    this.pre.style.maxHeight = taStyle.height;
    this.updateLineNumbers();
  }
};
A3a.vpl.VPLSourceEditor = function(app, noVPL, language) {
  this.noVPL = noVPL;
  this.language = language || A3a.vpl.defaultLanguage;
  this.app = app;
  this.code0 = "";
  this.isLockedWithVPL = true;
  this.updateCodeLanguage = null;
  this.disass = null;
  this.srcForAsm = null;
  this.teacherRole = false;
  this.uiConfig = app.uiConfig || new A3a.vpl.UIConfig;
  this.textEditor = new A3a.vpl.TextEditor("editor", "editor-lines");
  this.textEditor.setReadOnly(this.isLockedWithVPL);
  this.textEditor.onBreakpointChanged = function(bp) {
    window["vplBreakpointsFunction"] && window["vplBreakpointsFunction"](bp);
  };
  var self = this;
  this.tbCanvas = new A3a.vpl.Canvas(app.canvasEl, {css:app.css});
  document.getElementById("editor").addEventListener("input", function() {
    app.renderSourceEditorToolbar();
    if (self.doesMatchVPL() === app.program.noVPL) {
      app.program.noVPL = !app.program.noVPL;
      app.renderProgramToCanvas();
    }
  }, false);
  var textarea = document.getElementById("editor");
  if (textarea) {
    document.getElementById("editor").addEventListener("keydown", function(e) {
      if (e.keyCode === 9) {
        e.preventDefault();
        e.cancelBubbles = true;
        var text = textarea.value;
        var start = this.selectionStart, end = this.selectionEnd;
        text = text.slice(0, start) + "\t" + text.slice(end);
        self.textEditor.setContent(text);
        this.selectionStart = this.selectionEnd = start + 1;
        return false;
      }
      return true;
    }, false);
  }
};
A3a.vpl.VPLSourceEditor.UpdateCodeLanguage;
A3a.vpl.VPLSourceEditor.prototype.setUpdateCodeLanguageFunction = function(f) {
  this.updateCodeLanguage = f;
};
A3a.vpl.VPLSourceEditor.prototype.resetUI = function() {
  this.uiConfig.reset();
};
A3a.vpl.VPLSourceEditor.prototype.setTeacherRole = function(b) {
  this.teacherRole = b;
};
A3a.vpl.VPLSourceEditor.prototype.setCode = function(code, isAsm) {
  if (code === null) {
    this.textEditor.setContent(this.code0);
  } else {
    this.code0 = code;
    this.textEditor.setContent(code);
  }
  if (!isAsm) {
    this.srcForAsm = null;
  }
};
A3a.vpl.VPLSourceEditor.prototype.changeCode = function(code) {
  if (this.srcForAsm) {
    var dis = this.disass(this.language, code);
    if (dis !== null) {
      this.setCode(dis, true);
      this.textEditor.setReadOnly(true);
      this.srcForAsm = code;
    }
  } else {
    this.setCode(code);
  }
};
A3a.vpl.VPLSourceEditor.prototype.getCode = function() {
  return document.getElementById("editor").value.replace(/\s+$/, "");
};
A3a.vpl.VPLSourceEditor.prototype.doesMatchVPL = function() {
  return this.getCode() === this.code0.trim();
};
A3a.vpl.VPLSourceEditor.prototype.selectRange = function(begin, end) {
  this.textEditor.selectRange(begin, end);
};
A3a.vpl.VPLSourceEditor.prototype.toolbarHeight = function() {
  var buttonBox = this.tbCanvas.css.getBox({tag:"button", clas:["src", "top"]});
  buttonBox.height = this.tbCanvas.dims.controlSize;
  var toolbarBox = this.tbCanvas.css.getBox({tag:"toolbar", clas:["src", "top"]});
  toolbarBox.height = buttonBox.totalHeight();
  return {height:toolbarBox.height, totalHeight:toolbarBox.totalHeight()};
};
A3a.vpl.VPLSourceEditor.prototype.editorArea = function() {
  var canvasSize = this.tbCanvas.getSize();
  var viewBox = this.tbCanvas.css.getBox({tag:"view", clas:["src"]});
  viewBox.setTotalWidth(canvasSize.width);
  viewBox.setTotalHeight(canvasSize.height);
  viewBox.setPosition(0, 0);
  var toolbarHeight = this.toolbarHeight();
  return {left:viewBox.x, top:viewBox.y + toolbarHeight.totalHeight, width:viewBox.width, height:viewBox.height - toolbarHeight.totalHeight};
};
A3a.vpl.Application.prototype.createSourceEditorToolbar = function(toolbarConfig, toolbarBox, toolbarSeparatorBox, toolbarItemBoxes) {
  var controlBar = new A3a.vpl.ControlBar(this.editor.tbCanvas);
  controlBar.setButtons(this, toolbarConfig, ["src", "top"], this.editor.toolbarDrawButton || A3a.vpl.Commands.drawButtonJS, this.editor.toolbarGetButtonBounds || A3a.vpl.Commands.getButtonBoundsJS);
  controlBar.calcLayout(toolbarBox, toolbarItemBoxes, toolbarSeparatorBox);
  return controlBar;
};
A3a.vpl.Application.prototype.renderSourceEditorToolbar = function() {
  var editor = this.editor;
  editor.tbCanvas.clearItems();
  var toolbarConfig = editor.toolbarConfig || this.srcToolbarConfig;
  var toolbarItemBoxes = A3a.vpl.ControlBar.buttonBoxes(this, toolbarConfig, ["src", "top"]);
  var toolbarItemHeight = editor.toolbarHeight().height;
  var canvasSize = editor.tbCanvas.getSize();
  editor.tbCanvas.recalcSize();
  var viewBox = editor.tbCanvas.css.getBox({tag:"view", clas:["src"]});
  var buttonBox = editor.tbCanvas.css.getBox({tag:"button", clas:["src", "top"]});
  var separatorBox = editor.tbCanvas.css.getBox({tag:"separator", clas:["src", "top"]});
  var toolbarBox = editor.tbCanvas.css.getBox({tag:"toolbar", clas:["src", "top"]});
  viewBox.setTotalWidth(canvasSize.width);
  viewBox.setTotalHeight(canvasSize.height);
  viewBox.setPosition(0, 0);
  toolbarBox.setTotalWidth(viewBox.width);
  toolbarBox.height = toolbarItemHeight;
  toolbarBox.setPosition(viewBox.x, viewBox.y);
  editor.tbCanvas.addDecoration(function(ctx) {
    viewBox.draw(ctx);
  });
  var controlBar = this.createSourceEditorToolbar(toolbarConfig, toolbarBox, separatorBox, toolbarItemBoxes);
  controlBar.addToCanvas(toolbarBox, toolbarItemBoxes);
  editor.tbCanvas.redraw();
};
A3a.vpl.VPLSourceEditor.prototype.lockWithVPL = function(b) {
  this.isLockedWithVPL = b;
  if (b) {
    this.textEditor.setContent(this.code0);
  }
  this.textEditor.setReadOnly(b);
  window["vplApp"].renderSourceEditorToolbar();
};
A3a.vpl.VPLSourceEditor.prototype.resize = function(width, height) {
  this.tbCanvas.resize(width, height);
  var canvasBndRect = this.tbCanvas.canvas.getBoundingClientRect();
  var editorDiv = document.getElementById("src-editor");
  var editorArea = this.editorArea();
  editorDiv.style.left = canvasBndRect.left + canvasBndRect.width * this.tbCanvas.relativeArea.xmin + editorArea.left + "px";
  editorDiv.style.width = editorArea.width + "px";
  editorDiv.style.top = canvasBndRect.top + canvasBndRect.height * this.tbCanvas.relativeArea.ymin + editorArea.top + "px";
  editorDiv.style.height = editorArea.height + "px";
  this.textEditor.resize();
  window["vplApp"].renderSourceEditorToolbar();
};
A3a.vpl.VPLSourceEditor.prototype.focus = function() {
  document.getElementById("editor").focus();
  this.tbCanvas.redraw();
};
A3a.vpl.Application.prototype.addSrcCommands = function() {
  this.commands.add("src:close", {action:function(app, modifier) {
    app.setView(["src"], {closeView:true});
  }, object:this, isAvailable:function(app) {
    return app.views.length > 1 && app.views.indexOf("src") >= 0;
  }});
  this.commands.add("src:new", {action:function(app, modifier) {
    app.editor.textEditor.setContent("");
    app.editor.tbCanvas.redraw();
  }, isEnabled:function(app) {
    return !app.editor.isLockedWithVPL && app.editor.getCode().length > 0;
  }, object:this});
  this.commands.add("src:save", {action:function(app, modifier) {
    var json = app.program.exportToJSON({lib:false, prog:true});
    A3a.vpl.Program.downloadText(json, app.program.filename || A3a.vpl.Program.defaultFilename, A3a.vpl.Program.mimetype);
  }, isEnabled:function(app) {
    return app.editor.getCode().length > 0;
  }, object:this});
  this.commands.add("src:vpl", {action:function(app, modifier) {
    if (app.multipleViews) {
      app.setView(["vpl"], {openView:true});
    } else {
      app.setView(["vpl"], {fromView:"src"});
    }
  }, isEnabled:function(app) {
    return app.editor.doesMatchVPL();
  }, object:this, isAvailable:function(app) {
    return !app.editor.noVPL && app.views.indexOf("vpl") < 0;
  }});
  this.commands.add("src:locked", {action:function(app, modifier) {
    app.editor.lockWithVPL(!app.editor.isLockedWithVPL);
    app.editor.tbCanvas.redraw();
    if (app.editor.isLockedWithVPL) {
      app.program.noVPL = false;
      app.renderProgramToCanvas();
    }
  }, isEnabled:function(app) {
    return app.editor.srcForAsm === null;
  }, isSelected:function(app) {
    return app.editor.isLockedWithVPL;
  }, object:this, isAvailable:function(app) {
    return !app.editor.noVPL;
  }, possibleStates:[{selected:false}, {selected:true}]});
  this.commands.add("src:language", {action:function(app, modifier) {
    var r = app.editor.updateCodeLanguage();
    app.editor.language = r.language;
    if (app.editor.isLockedWithVPL) {
      app.editor.setCode(r.code);
    }
  }, isEnabled:function(app) {
    return app.editor.srcForAsm === null;
  }, getState:function(app) {
    return app.editor.language;
  }, object:this, isAvailable:function(app) {
    return app.editor.updateCodeLanguage != null;
  }, possibleStates:[{state:"aseba"}, {state:"l2"}, {state:"asm"}, {state:"js"}, {state:"python"}]});
  this.commands.add("src:disass", {action:function(app, modifier) {
    if (app.editor.srcForAsm !== null) {
      app.editor.setCode(app.editor.srcForAsm);
      app.editor.textEditor.setReadOnly(app.editor.isLockedWithVPL);
    } else {
      var src = app.editor.getCode();
      var dis = app.editor.disass(app.editor.language, src);
      if (dis !== null) {
        app.editor.setCode(dis, true);
        app.editor.textEditor.setReadOnly(true);
        app.editor.srcForAsm = src;
      }
    }
    app.renderSourceEditorToolbar();
  }, isEnabled:function(app) {
    return app.editor.disass != null && app.editor.disass(app.editor.language, "") !== null;
  }, isSelected:function(app) {
    return app.editor.srcForAsm !== null;
  }, object:this, isAvailable:function(app) {
    return app.editor.disass !== null;
  }, possibleStates:[{selected:false}, {selected:true}]});
  this.commands.add("src:run", {action:function(app, modifier) {
    var code = app.editor.getCode();
    app.robots[app.currentRobotIndex].runGlue.run(code, app.editor.language);
  }, isEnabled:function(app) {
    return app.robots[app.currentRobotIndex].runGlue.isEnabled(app.editor.language);
  }, object:this, isAvailable:function(app) {
    return app.currentRobotIndex >= 0;
  }});
  this.commands.add("src:stop", {action:function(app, modifier) {
    app.stopRobot();
  }, isEnabled:function(app) {
    return app.canStopRobot();
  }, object:this, isAvailable:function(app) {
    return app.currentRobotIndex >= 0;
  }});
  this.commands.add("src:connected", {isEnabled:function(app) {
    return !app.program.noVPL && app.currentRobotIndex >= 0 && app.robots[app.currentRobotIndex].runGlue.isConnected();
  }, object:this, isAvailable:function(app) {
    return app.robots.length > 0;
  }, possibleStates:[{selected:false}, {selected:true}, {selected:false, state:"monitored"}, {selected:true, state:"monitored"}, {selected:false, state:"nonmonitored"}, {selected:true, state:"nonmonitored"}]});
  this.commands.add("src:sim", {action:function(app, modifier) {
    if (app.multipleViews) {
      app.setView(["sim"], {openView:true});
    } else {
      app.setView(["sim"], {fromView:"src"});
    }
  }, object:this, isAvailable:function(app) {
    return app.robots.find(function(r) {
      return r.name === "sim";
    }) != null && app.sim2d != null && app.views.indexOf("sim") < 0;
  }});
  this.commands.add("src:teacher-reset", {action:function(app, modifier) {
    app.editor.resetUI();
    app.renderSourceEditorToolbar();
  }, object:this, keep:true, isAvailable:function(app) {
    return app.editor.teacherRole && app.editor.uiConfig.toolbarCustomizationMode;
  }});
  this.commands.add("src:teacher", {action:function(app, modifier) {
    app.editor.uiConfig.toolbarCustomizationMode = !app.editor.uiConfig.toolbarCustomizationMode;
    app.renderSourceEditorToolbar();
  }, isSelected:function(app) {
    return app.editor.uiConfig.toolbarCustomizationMode;
  }, object:this, keep:true, isAvailable:function(app) {
    return app.editor.teacherRole;
  }, possibleStates:[{selected:false}, {selected:true}]});
};
A3a.vpl.drawButtonSVGFunction = function(gui) {
  var defaultToJS = ["vpl:message-error", "vpl:message-warning", "vpl:filename"];
  return function(id, ctx, dims, css, cssClasses, box, i18n, isEnabled, isSelected, isPressed, state) {
    function checkState(prop) {
      if (prop == undefined) {
        return true;
      }
      for (var i = 0; i < prop.length; i++) {
        switch(prop[i]) {
          case "pressed":
            if (!isPressed || !isEnabled) {
              return false;
            }
            break;
          case "unpressed":
            if (isPressed && isEnabled) {
              return false;
            }
            break;
          case "selected":
            if (!isSelected) {
              return false;
            }
            break;
          case "unselected":
            if (isSelected) {
              return false;
            }
            break;
          case "disabled":
            if (isEnabled) {
              return false;
            }
            break;
          case "enabled":
            if (!isEnabled) {
              return false;
            }
            break;
          default:
            if (prop[i][0] === "=" && (state || "").toString() !== prop[i].slice(1)) {
              return false;
            }
            break;
        }
      }
      return true;
    }
    if (gui["buttons"]) {
      for (var i = 0; i < gui["buttons"].length; i++) {
        if (gui["buttons"][i]["name"] === id && checkState(gui["buttons"][i]["state"])) {
          var btn = gui["buttons"][i];
          btn["draw"].forEach(function(el) {
            if (el["uri"]) {
              var d = A3a.vpl.Canvas.decodeURI(el["uri"]);
              ctx.save();
              if (el["alpha"]) {
                ctx.globalAlpha = el["alpha"];
              }
              var styles = {};
              if (btn["styles"]) {
                btn["styles"].forEach(function(style) {
                  styles[(style["complement"] ? "!" : "") + style["id"]] = style["st"];
                });
              }
              gui.svg[d.f].draw(ctx, {elementId:d.id, style:styles});
              if (el["debug"]) {
                ctx.fillStyle = "black";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(el["debug"], box.width / 2, box.height / 2);
              }
              ctx.restore();
            }
            if (el["js"]) {
              var param = {"pressed":isPressed && isEnabled, "unpressed":!(isPressed && isEnabled), "selected":isSelected, "unselected":!isSelected, "disabled":!isEnabled, "enabled":isEnabled, "state":state};
              var fun = new Function("ctx", "$", el["js"]);
              ctx.save();
              ctx.scale(box.width / 1000, box.height / 1000);
              ctx.beginPath();
              fun(ctx, param);
              ctx.restore();
            }
          });
          return;
        }
      }
    }
    if (defaultToJS.indexOf(id) >= 0) {
      A3a.vpl.Commands.drawButtonJS(id, ctx, dims, css, cssClasses, box, i18n, isEnabled, isSelected, isPressed, state);
    } else {
      ctx.fillStyle = "brown";
      ctx.fillRect(0, 0, box.width, box.height);
      ctx.fillStyle = "white";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.font = Math.round(box.height / 6).toString(10) + "px sans-serif";
      ctx.fillText(id, 0.02 * box.width, 0.02 * box.height);
      ctx.fillText((isPressed ? "pr " : "") + (isSelected ? "sel " : "") + (isEnabled ? "" : "dis"), 0.02 * box.width, 0.22 * box.height);
      if (state) {
        ctx.fillText("=" + state, 0.02 * box.width, 0.42 * box.height);
      }
    }
  };
};
A3a.vpl.getButtonBoundsSVGFunction = function(gui) {
  return function(id, dims) {
    if (gui["buttons"]) {
      for (var i = 0; i < gui["buttons"].length; i++) {
        var b = gui["buttons"][i];
        if (b["name"] === id && (b["state"] == undefined || b["state"].indexOf("pressed") < 0 && b["state"].indexOf("selected") < 0 && b["state"].indexOf("disabled") < 0)) {
          var el = b["draw"][0];
          var d = A3a.vpl.Canvas.decodeURI(el["uri"]);
          var bnds = gui.svg[d.f].getElementBounds(d.id);
          return bnds;
        }
      }
    }
    return {xmin:0, xmax:dims.controlSize, ymin:0, ymax:dims.controlSize};
  };
};
A3a.vpl.makeSVGWidgets = function(gui) {
  if (gui["widgets"] == undefined) {
    return {};
  }
  function find(id) {
    for (var i = 0; i < gui["widgets"].length; i++) {
      if (gui["widgets"][i]["name"] === id) {
        return gui["widgets"][i];
      }
    }
    return null;
  }
  var widgets = {};
  ["vpl:then", "vpl:error", "vpl:warning", "vpl:moreHigh", "vpl:moreLow"].forEach(function(id) {
    var widget = find(id);
    if (widget) {
      var d = A3a.vpl.Canvas.decodeURI(widget["draw"][0]["uri"]);
      var elBounds = gui.svg[d.f].getElementBounds(d.id);
      widgets[id] = function(ctx, id, dims, box) {
        widget["draw"].forEach(function(el) {
          if (el["uri"]) {
            var d = A3a.vpl.Canvas.decodeURI(el["uri"]);
            if (el["alpha"]) {
              ctx.globalAlpha = el["alpha"];
            }
            ctx.save();
            var sc = Math.min(box.width / (elBounds.xmax - elBounds.xmin), box.height / (elBounds.ymax - elBounds.ymin));
            ctx.scale(sc, sc);
            ctx.translate(-(elBounds.xmin + elBounds.xmax) / 2, -(elBounds.ymin + elBounds.ymax) / 2);
            gui.svg[d.f].draw(ctx, {elementId:d.id});
            ctx.restore();
            if (el["debug"]) {
              ctx.fillStyle = "black";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(el["debug"], 0, 0);
            }
          }
          if (el["js"]) {
            var fun = new Function("ctx", el["js"]);
            ctx.save();
            ctx.scale(box.width, box.height);
            ctx.beginPath();
            fun(ctx);
            ctx.restore();
          }
        });
      };
    }
  });
  return widgets;
};
A3a.vpl.RunGlue = function(options) {
  this.runFun = options && options.run ? options.run : null;
  this.checkFun = options && options.check ? options.check : null;
  this.initFun = options && options.init ? options.init : null;
  this.closeFun = options && options.close ? options.close : null;
  this.isConnectedFun = options && options.isConnected ? options.isConnected : null;
  this.isEnabledFun = options && options.isEnabled ? options.isEnabled : null;
  this.flashFun = options && options.flash ? options.flash : null;
  this.canFlashFun = options && options.canFlash ? options.canFlash : null;
  this.getNameFun = options && options.getName ? options.getName : null;
  this.preferredLanguage = options && options.preferredLanguage ? options.preferredLanguage : "aseba";
  this.languages = options && options.languages ? options.languages : [this.preferredLanguage];
  this.state = options && options.state ? options.state : null;
  this.params = options && options.params ? options.params : {};
  this.lastCheckedCode = null;
  this.lastCheckedLanguage = null;
  this.lastCheckResult = null;
};
A3a.vpl.RunGlue.prototype.isConnected = function() {
  return this.isConnectedFun == null || this.isConnectedFun();
};
A3a.vpl.RunGlue.prototype.isEnabled = function(language) {
  return this.runFun != null && this.languages.indexOf(language) >= 0 && (this.isEnabledFun == null || this.isEnabledFun(language));
};
A3a.vpl.RunGlue.prototype.getName = function() {
  return this.getNameFun != null ? this.getNameFun() : null;
};
A3a.vpl.RunGlue.prototype.init = function(language) {
  if (this.initFun) {
    this.initFun(language);
  }
};
A3a.vpl.RunGlue.prototype.close = function() {
  if (this.closeFun) {
    this.closeFun();
  }
};
A3a.vpl.RunGlue.prototype.check = function(code, language, errorFun) {
  if (this.checkFun == null || code === this.lastCheckedCode && language === this.lastCheckedLanguage) {
    return this.lastCheckResult;
  }
  var self = this;
  this.checkFun(language, code, function(result) {
    self.lastCheckedCode = code;
    self.lastCheckedLanguage = language;
    if (result !== self.lastCheckResult) {
      self.lastCheckResult = result;
      errorFun(result);
    }
  });
  return this.lastCheckResult;
};
A3a.vpl.RunGlue.prototype.run = function(code, language) {
  if (this.isEnabled(language)) {
    this.runFun(language, code);
  }
};
A3a.vpl.RunGlue.prototype.isFlashAvailable = function(language) {
  return this.flashFun != null;
};
A3a.vpl.RunGlue.prototype.canFlash = function(language) {
  return this.flashFun != null && this.languages.indexOf(language) >= 0 && (this.canFlashFun == null || this.canFlashFun(language));
};
A3a.vpl.RunGlue.prototype.flash = function(code, language) {
  if (this.canFlash(language)) {
    this.flashFun(language, code);
  }
};
A3a.vpl.HTMLPanel = function(html, options) {
  this.html = html;
  this.backgroundDiv = document.createElement("div");
  this.backgroundDiv.style.width = "100%";
  this.backgroundDiv.style.height = "100%";
  this.backgroundDiv.style.position = "fixed";
  this.backgroundDiv.style.top = "0";
  this.backgroundDiv.style.left = "0";
  this.backgroundDiv.style.zIndex = "1000";
  this.backgroundDiv.style.backgroundColor = "rgba(1,1,1,0.5)";
  this.backgroundDiv.style.display = "none";
  this.panelDiv = document.createElement("div");
  this.panelDiv.style.width = "80%";
  this.panelDiv.style.height = "80%";
  this.panelDiv.style.position = "fixed";
  this.panelDiv.style.top = "50%";
  this.panelDiv.style.left = "50%";
  this.panelDiv.style.backgroundColor = "white";
  this.backgroundDiv.appendChild(this.panelDiv);
  document.body.appendChild(this.backgroundDiv);
  var container = document.createElement("div");
  container.style.width = "100%";
  container.style.height = "100%";
  if (options && options.scroll) {
    container.style.overflowY = "scroll";
  }
  this.panelDiv.appendChild(container);
  this.div = document.createElement("div");
  this.div.style.backgroundColor = "white";
  this.div.style.width = "100%";
  this.div.style.height = "100%";
  container.appendChild(this.div);
  this.widgets = [];
  var self = this;
  var left = 0;
  var right = 30;
  function addWidget(title, htmlElement, rightSide, fun) {
    var widget = document.createElement("div");
    if (htmlElement != null) {
      widget.innerHTML = htmlElement;
    } else {
      widget.textContent = title;
      widget.style.font = "bold 30px sans-serif";
      widget.style.textAlign = "left";
      widget.style.padding = "5px";
      widget.style.paddingLeft = "10px";
    }
    widget.style.position = "absolute";
    widget.style.width = "32px";
    widget.style.height = "32px";
    widget.style.top = "0";
    widget.style.cursor = "default";
    if (rightSide) {
      widget.style.right = right.toString(10) + "px";
      right += 40;
    } else {
      widget.style.left = left.toString(10) + "px";
      left += 40;
    }
    widget.addEventListener("click", function() {
      fun();
    }, false);
    self.widgets.push(widget);
  }
  if (!options || !options.noCloseWidget) {
    addWidget("\u00d7", null, false, function() {
      self.hide();
    });
  }
  if (options && options.otherWidgets) {
    options.otherWidgets.forEach(function(w) {
      addWidget(w.title, w.htmlElement, true, w.fun);
    });
  }
  this.onShow = options && options.onShow || null;
  this.onHide = options && options.onHide || null;
};
A3a.vpl.HTMLPanel.prototype.show = function() {
  this.widgets.forEach(function(element) {
    this.panelDiv.appendChild(element);
  }, this);
  this.div.innerHTML = this.html;
  this.backgroundDiv.style.display = "block";
  this.center();
  if (this.onShow) {
    this.onShow();
  }
};
A3a.vpl.HTMLPanel.prototype.hide = function() {
  this.backgroundDiv.style.display = "none";
  if (this.onHide) {
    this.onHide();
  }
};
A3a.vpl.HTMLPanel.prototype.center = function() {
  var boundingBox = this.panelDiv.getBoundingClientRect();
  this.panelDiv.style.marginLeft = -boundingBox.width / 2 + "px";
  this.panelDiv.style.marginTop = -boundingBox.height / 2 + "px";
};
A3a.vpl.Application.prototype.loadProgramJSON = function(json, options) {
  try {
    this.program.importFromJSON(json, function(view) {
      if (this.views.indexOf(view) < 0) {
        if (this.views.length === 1) {
          this.setView([view]);
        } else {
          var views = this.views.slice();
          views[views.indexOf("vpl") >= 0 ? views.indexOf("vpl") : views.indexOf("src") >= 0 ? views.indexOf("src") : 0] = view;
          this.setView(views);
        }
      }
      this.programNotUploadedToServerYet = true;
      this.setHelpForCurrentAppState();
      if (this.views.indexOf("vpl") >= 0) {
        this.vplCanvas.onUpdate();
      }
    }, options);
  } catch (e) {
  }
};
A3a.vpl.Application.getFileSuffix = function(filename) {
  return /(\.[^.]*|)$/.exec(filename)[0].slice(1).toLowerCase();
};
A3a.vpl.Application.prototype.loadProgramFile = function(file) {
  var ext = A3a.vpl.Application.getFileSuffix(file.name);
  var reader = new window.FileReader;
  switch(ext) {
    case "aesl":
    case A3a.vpl.Program.suffix:
    case A3a.vpl.Program.suffixUI:
    case "json":
      var app = this;
      reader.onload = function(event) {
        var data = event.target.result;
        var filename = file.name;
        var dontChangeProgram = false;
        if (data.trim()[0] === "<") {
          app.program.importFromAESLFile(data);
        } else {
          dontChangeProgram = ext === "vpl3ui";
          app.loadProgramJSON(data, {dontChangeProgram:dontChangeProgram});
        }
        if (!dontChangeProgram) {
          app.program.filename = filename;
        }
        app.vplCanvas.onUpdate();
      };
      reader["readAsText"](file);
      return true;
  }
  return false;
};
A3a.vpl.Application.prototype.loadImageFile = function(file) {
  var r = /^[^.]+\.(.*)$/.exec(file.name);
  var ext = r ? r[1] : "";
  var reader = new window.FileReader;
  switch(ext.toLowerCase()) {
    case "svg":
    case "png":
    case "jpg":
    case "gif":
      var app = this;
      if (this.sim2d) {
        if (this.sim2d.wantsSVG()) {
          reader.onload = function(event) {
            var data = event.target.result;
            app.setSVG(data);
          };
          reader["readAsText"](file);
        } else {
          reader.onload = function(event) {
            var data = event.target.result;
            var img = new Image;
            img.addEventListener("load", function() {
              app.setImage(img);
            });
            img.src = data;
          };
          reader["readAsDataURL"](file);
        }
      }
      return true;
  }
  return false;
};
A3a.vpl.Application.prototype.loadAudioFile = function(file) {
  var r = /^[^.]+\.(.*)$/.exec(file.name);
  var ext = r ? r[1] : "";
  var reader = new window.FileReader;
  switch(ext.toLowerCase()) {
    case "wav":
      var app = this;
      if (this.sim2d) {
        reader.onload = function(event) {
          var data = event.target.result;
          app.setAudio(file.name, data);
        };
        reader["readAsArrayBuffer"](file);
      }
      return true;
  }
  return false;
};
A3a.vpl.Load = function(app, options) {
  var self = this;
  this.backgroundDiv = document.createElement("div");
  this.backgroundDiv.style.width = "100%";
  this.backgroundDiv.style.height = "100%";
  this.backgroundDiv.style.position = "fixed";
  this.backgroundDiv.style.top = "0";
  this.backgroundDiv.style.left = "0";
  this.backgroundDiv.style.zIndex = "1000";
  this.backgroundDiv.style.backgroundColor = "rgba(1,1,1,0.5)";
  this.backgroundDiv.style.display = "none";
  this.div = document.createElement("div");
  this.div.style.width = "40em";
  this.div.style.position = "fixed";
  this.div.style.top = "50%";
  this.div.style.left = "50%";
  this.div.style.backgroundColor = "white";
  this.div.style.padding = "2em";
  this.backgroundDiv.appendChild(this.div);
  document.body.appendChild(this.backgroundDiv);
  var el = document.createElement("p");
  this.titleElement = el;
  this.div.appendChild(el);
  el = document.createElement("table");
  el.style.width = "100%";
  this.div.appendChild(el);
  var tr = document.createElement("tr");
  el.appendChild(tr);
  var td = document.createElement("td");
  tr.appendChild(td);
  this.input = document.createElement("input");
  this.input.setAttribute("type", "file");
  this.input.style.width = "35em";
  td.appendChild(this.input);
  td = document.createElement("td");
  td.align = "right";
  tr.appendChild(td);
  var button = document.createElement("input");
  button.setAttribute("type", "button");
  button.setAttribute("value", app.i18n.translate("OK"));
  button.addEventListener("click", function() {
    var file = self.input.files[0];
    if (file) {
      self.loadFun(file);
    }
    self.hide();
  }, false);
  td.appendChild(button);
  td.appendChild(document.createTextNode("\u00a0\u00a0"));
  button = document.createElement("input");
  button.setAttribute("type", "button");
  button.setAttribute("value", app.i18n.translate("Cancel"));
  button.addEventListener("click", function() {
    self.hide();
  }, false);
  td.appendChild(button);
  var closebox = document.createElement("div");
  closebox.style.position = "absolute";
  closebox.style.width = "32px";
  closebox.style.height = "32px";
  closebox.style.top = "0";
  closebox.style.left = "0";
  closebox.textContent = "\u00d7";
  closebox.style.font = "bold 30px sans-serif";
  closebox.style.textAlign = "left";
  closebox.style.padding = "5px";
  closebox.style.paddingLeft = "10px";
  closebox.addEventListener("click", function() {
    self.hide();
  }, false);
  el.appendChild(closebox);
  this.i18n = app.i18n;
  this.loadFun = null;
  this.onShow = options && options.onShow || null;
  this.onHide = options && options.onHide || null;
};
A3a.vpl.Load.prototype.show = function(title, accept, loadFun) {
  this.titleElement.textContent = this.i18n.translate(title);
  this.input.setAttribute("accept", accept);
  this.loadFun = loadFun;
  this.backgroundDiv.style.display = "block";
  var boundingBox = this.div.getBoundingClientRect();
  this.div.style.marginLeft = -boundingBox.width / 2 + "px";
  this.div.style.marginTop = -boundingBox.height / 2 + "px";
  if (this.onShow) {
    this.onShow();
  }
};
A3a.vpl.Load.prototype.hide = function() {
  this.backgroundDiv.style.display = "none";
  if (this.onHide) {
    this.onHide();
  }
};
A3a.vpl.Com = function(app, wsURL, sessionId) {
  this.app = app;
  this.wsURL = wsURL;
  this.ws = null;
  this.hasLogger = false;
  this.sessionId = sessionId;
  var self = this;
  this.reconnectId = setInterval(function() {
    if (self.ws != null && self.ws.readyState >= 2) {
      if (self.app.supervisorConnected !== false) {
        self.app.supervisorConnected = false;
        self.app.renderProgramToCanvas();
      }
      self.connect();
    }
  }, 5000);
};
A3a.vpl.Com.prototype.execCommand = function(name, selected, state) {
  var commands = this.app.commands;
  if (commands.isAvailable(name) && commands.hasAction(name) && commands.isEnabled(name)) {
    if (selected !== undefined) {
      return commands.executeForSelected(name, selected);
    } else {
      if (state !== undefined) {
        return commands.executeForState(name, state);
      } else {
        commands.execute(name);
      }
    }
    return true;
  }
  return false;
};
A3a.vpl.Com.prototype.connect = function() {
  var self = this;
  this.ws = new WebSocket(this.wsURL);
  this.ws.addEventListener("open", function() {
    self.app.supervisorConnected = true;
    var helloMsg = {"sender":{"type":"vpl", "sessionid":self.sessionId, "role":self.app.program.teacherRole ? "teacher" : "student"}, "type":"hello"};
    self.ws.send(JSON.stringify(helloMsg));
    window.addEventListener("unload", function() {
      var byeMsg = {"sender":{"type":"vpl", "sessionid":self.sessionId, "role":self.app.program.teacherRole ? "teacher" : "student"}, "type":"bye"};
      self.ws.send(JSON.stringify(byeMsg));
    });
    self.app.renderProgramToCanvas();
  });
  this.ws.addEventListener("message", function(event) {
    function toHTML(content, isBase64, suffix) {
      function centeredImage(mimetype) {
        var img = "<img src='data:" + mimetype + ";base64," + (isBase64 ? content : btoa(content)) + "' style='max-width:100%;max-height:100%;'>";
        return "<div style='display: table; height: 100%; width: 100%; overflow: hidden;'>" + "<div style='display: table-cell; vertical-align: middle; text-align: center;'>" + img + "</div>" + "</div>";
      }
      switch(suffix.toLowerCase()) {
        case "html":
        case "htm":
          return isBase64 ? atob(content) : content;
        case "txt":
          if (isBase64) {
            content = atob(content);
          }
          return "<pre style='width: 100%; height: 100%; padding: 3em;'>" + content.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</pre>";
          break;
        case "md":
          if (isBase64) {
            content = atob(content);
          }
          var dynamicHelp = new A3a.vpl.DynamicHelp;
          return "<div style='width: 100%; height: 100%; padding: 3em;'>" + dynamicHelp.convertToHTML(content.split("\n")) + "</div>";
          break;
        case "gif":
          return centeredImage("image/gif");
        case "jpg":
        case "jpeg":
          return centeredImage("image/jpeg");
        case "png":
          return centeredImage("image/png");
        case "svg":
          return centeredImage("image/svg+xml");
        default:
          return "";
      }
    }
    function toDataURL(mimetype, data) {
      return "data:" + mimetype + ";base64," + btoa(data);
    }
    try {
      var msg = JSON.parse(event.data);
      if (msg["type"] === "defaultfile" && !self.app.restored) {
        msg["type"] = "file";
      }
      switch(msg["type"]) {
        case "cmd":
          var cmd = msg["data"]["cmd"];
          var selected = msg["data"]["selected"];
          var state = msg["data"]["state"];
          self.execCommand(cmd, selected, state);
          self.app.vplCanvas.update();
          break;
        case "file":
          var kind = msg["data"]["kind"];
          var content = msg["data"]["content"];
          var isBase64 = msg["data"]["base64"] || false;
          var suffix = A3a.vpl.Application.getFileSuffix(msg["data"]["name"] || "");
          switch(kind) {
            case "vpl":
              if (isBase64) {
                content = btoa(content);
              }
              if (/^[\s]*{/.test(content)) {
                self.app.loadProgramJSON(content, {dontChangeProgram:suffix === "vpl3ui"});
              } else {
                self.app.program.importFromAESLFile(content);
                self.app.vplCanvas.onUpdate();
              }
              if (suffix !== "vpl3ui") {
                self.app.program.filename = msg["data"]["name"] || null;
              }
              self.app.vplCanvas.update();
              break;
            case "aseba":
              if (isBase64) {
                content = btoa(content);
              }
              self.app.robots[self.app.currentRobotIndex].runGlue.run(content, "aseba");
              self.app.program.uploaded = false;
              break;
            case "about":
              self.app.setAboutBoxContent(toHTML(content, isBase64, suffix));
              break;
            case "help":
              self.app.setHelpContent(toHTML(content, isBase64, suffix));
              break;
            case "settings":
              if (isBase64) {
                content = btoa(content);
              }
              var props = JSON.parse(content);
              if (props.hasOwnProperty("volume")) {
                self.app.program.volume = props["volume"];
              }
              break;
            case "statement":
              self.app.setHelpContent(toHTML(content, isBase64, suffix), true);
              self.app.vplCanvas.update();
              break;
            case "suspend":
              self.app.setSuspendBoxContent(toHTML(content, isBase64, suffix));
              break;
          }break;
        case "robot":
          var robot = msg["data"]["robot"];
          var asebahttp = msg["data"]["url"] || null;
          var wsUrl = msg["data"]["url"] || null;
          var uuid = msg["data"]["uuid"] || null;
          var pass = msg["data"]["pass"] || null;
          var runGlue = null;
          switch(robot) {
            case "thymio":
              if (asebahttp) {
                runGlue = self.app.installThymio({asebahttp:asebahttp});
                runGlue.init(runGlue.preferredLanguage);
              }
              break;
            case "thymio-tdm":
              if (!wsUrl && self.app.currentRobotIndex >= 0 && self.app.robots[self.app.currentRobotIndex].runGlue.params.w) {
                wsUrl = self.app.robots[self.app.currentRobotIndex].runGlue.params.w;
              }
              if (wsUrl) {
                runGlue = self.app.installThymioTDM({w:wsUrl, uuid:uuid, pass:pass});
                runGlue.init(runGlue.preferredLanguage);
              }
              break;
            case "sim":
              runGlue = self.app.installRobotSimulator({});
              runGlue.init(runGlue.preferredLanguage);
              break;
          }if (runGlue) {
            self.execCommand("vpl:stop");
            if (this.currentRobotIndex >= 0) {
              this.robots[this.currentRobotIndex].runGlue.stop();
            }
            self.app.robots = [{name:robot, runGlue:runGlue}];
            self.app.currentRobotIndex = 0;
            self.app.vplCanvas.update();
          }
          break;
      }
    } catch (e) {
      console.info(e);
    }
  });
  if (!this.hasLogger) {
    this.app.addLogger(function(data) {
      self.log(data);
    });
    this.hasLogger = true;
  }
};
A3a.vpl.Com.prototype.log = function(data) {
  try {
    if (data["type"] === "cmd" && data["data"] && ["vpl:run", "vpl:save", "vpl:upload"].indexOf(data["data"]["cmd"]) >= 0) {
      var json = this.app.program.exportToJSON({lib:false, prog:true});
      var fileMsg = {"sender":{"type":"vpl", "sessionid":this.sessionId}, "type":"file", "data":{"name":this.app.program.filename, "content":json}, "reason":data["data"]["cmd"]};
      this.ws.send(JSON.stringify(fileMsg));
    }
    var logMsg = {"sender":{"type":"vpl", "sessionid":this.sessionId}, "type":"log", "data":data || null};
    this.ws.send(JSON.stringify(logMsg));
  } catch (e) {
  }
};
A3a.vpl.Keyboard = function() {
  this.handlers = [];
};
A3a.vpl.Keyboard.Handler;
A3a.vpl.Keyboard.prototype.attach = function() {
  var self = this;
  function handleEvent(ev) {
    if (self.handlers.length > 0) {
      if (self.handlers[self.handlers.length - 1](ev)) {
        ev.preventDefault();
      }
    }
  }
  window.addEventListener("keydown", function(ev) {
    handleEvent(ev);
  });
  window.addEventListener("message", function(ev) {
    if (ev.origin === window["origin"]) {
      handleEvent(ev.data);
    }
  }, false);
};
A3a.vpl.Keyboard.prototype.pushHandler = function(handler) {
  this.handlers.push(handler);
};
A3a.vpl.Keyboard.prototype.pushKeyHandler = function(key, keyHandler) {
  this.handlers.push(function(ev) {
    if (key === ev.key) {
      keyHandler();
      return true;
    }
    return false;
  });
};
A3a.vpl.Keyboard.prototype.extendHandler = function(extensionHandler, execFirst) {
  var topHandler = this.popHandler();
  if (execFirst) {
    this.pushHandler(function(ev) {
      return extensionHandler(ev) || topHandler(ev);
    });
  } else {
    this.pushHandler(function(ev) {
      return topHandler(ev) || extensionHandler(ev);
    });
  }
};
A3a.vpl.Keyboard.prototype.popHandler = function() {
  return this.handlers.pop();
};
A3a.vpl.TextField = function(app, options) {
  this.app = app;
  this.str = options.initialValue || "";
  this.ref = options.ref;
  this.selBegin = 0;
  this.selEnd = this.str.length;
  this.frame = null;
  this.rightPos = [];
  this.displayCB = options.display || function() {
  };
  this.finishCB = options.finish || function() {
  };
  var self = this;
  this.app.keyboard.pushHandler(function(ev) {
    if (ev.ctrlKey || ev.metaKey) {
      return false;
    }
    switch(ev.key) {
      case "Escape":
        self.finish(false);
        break;
      case "Enter":
        self.finish(true);
        break;
      case "ArrowLeft":
        if (self.selEnd > self.selBegin) {
          self.selEnd = self.selBegin;
          self.display();
        } else {
          if (self.selBegin > 0) {
            self.selBegin--;
            self.selEnd = self.selBegin;
            self.display();
          }
        }
        break;
      case "ArrowRight":
        if (self.selEnd > self.selBegin) {
          self.selBegin = self.selEnd;
          self.display();
        } else {
          if (self.selBegin < self.str.length) {
            self.selBegin++;
            self.selEnd = self.selBegin;
            self.display();
          }
        }
        break;
      case "Backspace":
        if (self.selEnd > self.selBegin) {
          self.str = self.str.slice(0, self.selBegin) + self.str.slice(self.selEnd);
          self.selEnd = self.selBegin;
          self.display();
        } else {
          if (self.selBegin > 0) {
            self.str = self.str.slice(0, self.selBegin - 1) + self.str.slice(self.selBegin);
            self.selBegin--;
            self.selEnd = self.selBegin;
            self.display();
          }
        }
        break;
      case "Delete":
        if (self.selEnd > self.selBegin) {
          self.str = self.str.slice(0, self.selBegin) + self.str.slice(self.selEnd);
          self.selEnd = self.selBegin;
          self.display();
        } else {
          if (self.selBegin < self.str.length) {
            self.str = self.str.slice(0, self.selBegin) + self.str.slice(self.selBegin + 1);
            self.display();
          }
        }
        break;
      default:
        var isPrintable = !/^\w{2,}$/.test(ev.key);
        if (isPrintable) {
          self.str = self.str.slice(0, self.selBegin) + ev.key + self.str.slice(self.selEnd);
          self.selBegin += ev.key.length;
          self.selEnd = self.selBegin;
          self.display();
        }
        break;
    }
    return true;
  });
};
A3a.vpl.TextField.DisplayCB;
A3a.vpl.TextField.FinishCB;
A3a.vpl.TextField.Options;
A3a.vpl.TextField.prototype.display = function() {
  this.displayCB(this.str, this.selBegin, this.selEnd);
};
A3a.vpl.TextField.prototype.finish = function(ok) {
  this.finishCB(ok ? this.str : null);
  this.app.keyboard.popHandler();
};
A3a.vpl.TextField.prototype.setRenderingPos = function(frame, rightPos) {
  this.frame = frame;
  this.rightPos = rightPos;
};
A3a.vpl.TextField.prototype.findCursorByPos = function(x, y) {
  if (this.frame && x >= this.frame.left && x < this.frame.right && y >= this.frame.top && y < this.frame.bottom) {
    var xr = x - this.frame.left;
    var i;
    for (i = 0; i < this.rightPos.length && xr > this.rightPos[i]; i++) {
    }
    return i === 0 ? this.rightPos.length === 0 || xr < this.rightPos[0] / 2 ? 0 : 1 : i >= this.rightPos.length ? this.rightPos.length : xr < (this.rightPos[i - 1] + this.rightPos[i]) / 2 ? i : i + 1;
  } else {
    return null;
  }
};
A3a.vpl.KbdControl = function(app) {
  this.app = app;
  this.libLeftNum = 0;
  this.libLeftColLen = 1;
  this.libRightNum = 0;
  this.libRightColLen = 1;
  this.selectionType = A3a.vpl.KbdControl.ObjectType.none;
  this.selectionIndex1 = 0;
  this.selectionIndex2 = 0;
  this.selectionParamIndex = 0;
  this.targetType = A3a.vpl.KbdControl.ObjectType.none;
  this.targetIndex1 = 0;
  this.targetIndex2 = 0;
};
A3a.vpl.KbdControl.ObjectType = {none:"", toolbarTop:"tb1", toolbarBottom:"tb2", blockLeft:"bl", blockRight:"br", blockLeftParam:"blp", blockRightParam:"brp", rule:"r", libLeft:"ll", libRight:"lr"};
A3a.vpl.KbdControl.prototype.reset = function() {
  this.selectionType = A3a.vpl.KbdControl.ObjectType.none;
  this.targetType = A3a.vpl.KbdControl.ObjectType.none;
};
A3a.vpl.KbdControl.prototype.exit = function() {
  if (this.selectionType !== A3a.vpl.KbdControl.ObjectType.none || this.targetType !== A3a.vpl.KbdControl.ObjectType.none) {
    this.selectionType = A3a.vpl.KbdControl.ObjectType.none;
    this.targetType = A3a.vpl.KbdControl.ObjectType.none;
    this.app.renderProgramToCanvas();
  }
};
A3a.vpl.KbdControl.prototype.getSelectedObject = function() {
  switch(this.selectionType) {
    case A3a.vpl.KbdControl.ObjectType.rule:
      return this.app.program.program[this.selectionIndex1];
    case A3a.vpl.KbdControl.ObjectType.blockLeft:
      return this.app.program.program[this.selectionIndex1].events[this.selectionIndex2];
    case A3a.vpl.KbdControl.ObjectType.blockRight:
      return this.app.program.program[this.selectionIndex1].actions[this.selectionIndex2];
    default:
      return null;
  }
};
A3a.vpl.KbdControl.prototype.getBlockOfSelectedParam = function() {
  switch(this.selectionType) {
    case A3a.vpl.KbdControl.ObjectType.blockLeftParam:
      return this.app.program.program[this.selectionIndex1].events[this.selectionIndex2];
    case A3a.vpl.KbdControl.ObjectType.blockRightParam:
      return this.app.program.program[this.selectionIndex1].actions[this.selectionIndex2];
    default:
      return null;
  }
};
A3a.vpl.KbdControl.prototype.getSelectedBlockTemplate = function() {
  switch(this.selectionType) {
    case A3a.vpl.KbdControl.ObjectType.libLeft:
      return this.app.getEnabledBlockTemplateByIndex(false, this.selectionIndex1 + this.libLeftColLen * this.selectionIndex2);
    case A3a.vpl.KbdControl.ObjectType.libRight:
      return this.app.getEnabledBlockTemplateByIndex(true, this.selectionIndex1 + this.libRightColLen * this.selectionIndex2);
    default:
      return null;
  }
};
A3a.vpl.KbdControl.prototype.getTargetObject = function() {
  switch(this.targetType) {
    case A3a.vpl.KbdControl.ObjectType.rule:
      return this.app.program.program[this.targetIndex1];
    case A3a.vpl.KbdControl.ObjectType.blockLeft:
      return this.app.program.program[this.targetIndex1].events[this.targetIndex2] || this.app.program.program[this.targetIndex1];
    case A3a.vpl.KbdControl.ObjectType.blockRight:
      return this.app.program.program[this.targetIndex1].actions[this.targetIndex2] || this.app.program.program[this.targetIndex1];
    default:
      return null;
  }
};
A3a.vpl.KbdControl.prototype.toolbarItemCount = function(bottom) {
  var config = bottom ? this.app.vplToolbar2Config : this.app.vplToolbarConfig;
  if (config) {
    var n = 0;
    for (var i = 0; i < config.length; i++) {
      if (config[i] && config[i][0] !== "!" && this.app.isButtonAvailable(config[i])) {
        var cmd = this.app.commands.find(config[i]);
        if (cmd.actionFun || cmd.doDropFun) {
          n++;
        }
      }
    }
    return n;
  } else {
    return 0;
  }
};
A3a.vpl.KbdControl.prototype.getSelectedCmd = function() {
  var config;
  switch(this.selectionType) {
    case A3a.vpl.KbdControl.ObjectType.toolbarTop:
      config = this.app.vplToolbarConfig;
      break;
    case A3a.vpl.KbdControl.ObjectType.toolbarBottom:
      config = this.app.vplToolbar2Config;
      break;
    default:
      return null;
  }
  var n = this.selectionIndex1;
  for (var i = 0; i < config.length; i++) {
    if (config[i] && config[i][0] !== "!" && this.app.isButtonAvailable(config[i])) {
      var cmd = this.app.commands.find(config[i]);
      if (cmd.actionFun || cmd.doDropFun) {
        if (n === 0) {
          return cmd;
        }
        n--;
      }
    }
  }
  return null;
};
A3a.vpl.KbdControl.prototype.activateTemplate = function(blockTemplate) {
  var target = this.getTargetObject();
  var app = this.app;
  if (target instanceof A3a.vpl.Block && (this.targetType === A3a.vpl.KbdControl.ObjectType.blockLeft ? blockTemplate.type === A3a.vpl.blockType.action : blockTemplate.type === A3a.vpl.blockType.event || blockTemplate.type === A3a.vpl.blockType.state)) {
    target = target.ruleContainer;
    this.targetType = A3a.vpl.KbdControl.ObjectType.rule;
  }
  if (target instanceof A3a.vpl.Rule && !(target instanceof A3a.vpl.RuleComment)) {
    var block = new A3a.vpl.Block(blockTemplate, null, null);
    target.setBlock(block, null, function() {
      app.program.saveStateBeforeChange();
    }, function() {
      app.program.saveStateAfterChange();
    });
  } else {
    if (target instanceof A3a.vpl.Block) {
      var block = new A3a.vpl.Block(blockTemplate, null, null);
      target.ruleContainer.setBlock(block, {eventSide:this.targetType === A3a.vpl.KbdControl.ObjectType.blockLeft, index:this.targetIndex2}, function() {
        app.program.saveStateBeforeChange();
      }, function() {
        app.program.saveStateAfterChange();
      });
    }
  }
  app.program.enforceSingleTrailingEmptyEventHandler();
};
A3a.vpl.KbdControl.prototype.executeCommand = function(cmd) {
  if (cmd.actionFun) {
    cmd.actionFun(this.app, false);
  } else {
    var targetObject = this.getTargetObject();
    if (targetObject && cmd.canDropFun ? cmd.canDropFun(this.app, {data:targetObject}) : cmd.doDropFun) {
      cmd.doDropFun(this.app, {data:targetObject});
    }
  }
};
A3a.vpl.KbdControl.prototype.addHandlers = function() {
  var self = this;
  this.app.keyboard.extendHandler(function(ev) {
    function numBlocksLeft() {
      return self.app.program.program[self.selectionIndex1].events.length + (self.app.program.displaySingleEvent() ? 0 : 1);
    }
    function numBlocksRight() {
      return self.app.program.program[self.selectionIndex1].actions.length + 1;
    }
    function setHint() {
      var selectedObject = self.getSelectedObject() || self.getSelectedBlockTemplate();
      if (selectedObject instanceof A3a.vpl.Block) {
        self.app.vplHint = selectedObject.blockTemplate.name;
      } else {
        if (selectedObject instanceof A3a.vpl.BlockTemplate) {
          self.app.vplHint = selectedObject.name;
        } else {
          self.app.vplHint = null;
        }
      }
    }
    if (self.app.uiConfig.blockCustomizationMode) {
      return false;
    }
    switch(ev.key) {
      case "Escape":
        switch(self.selectionType) {
          case A3a.vpl.KbdControl.ObjectType.blockLeft:
          case A3a.vpl.KbdControl.ObjectType.blockRight:
            if (self.targetType == self.selectionType && self.targetIndex1 == self.selectionIndex1 && self.targetIndex2 == self.selectionIndex2) {
              self.targetType = A3a.vpl.KbdControl.ObjectType.none;
            } else {
              self.selectionType = A3a.vpl.KbdControl.ObjectType.rule;
            }
            break;
          case A3a.vpl.KbdControl.ObjectType.blockLeftParam:
            self.selectionType = A3a.vpl.KbdControl.ObjectType.blockLeft;
            break;
          case A3a.vpl.KbdControl.ObjectType.blockRightParam:
            self.selectionType = A3a.vpl.KbdControl.ObjectType.blockRight;
            break;
          default:
            self.selectionType = A3a.vpl.KbdControl.ObjectType.none;
            self.targetType = A3a.vpl.KbdControl.ObjectType.none;
            break;
        }setHint();
        self.app.renderProgramToCanvas();
        return true;
      case "Enter":
        switch(self.selectionType) {
          case A3a.vpl.KbdControl.ObjectType.none:
            self.selectionType = A3a.vpl.KbdControl.ObjectType.rule;
            self.selectionIndex1 = 0;
            self.targetType = A3a.vpl.KbdControl.ObjectType.rule;
            self.targetIndex1 = 0;
            break;
          case A3a.vpl.KbdControl.ObjectType.rule:
            var selection = self.getSelectedObject();
            if (selection instanceof A3a.vpl.RuleComment) {
              self.app.editComment(self.selectionIndex1);
            } else {
              self.selectionType = A3a.vpl.KbdControl.ObjectType.blockLeft;
              self.selectionIndex2 = 0;
            }
            break;
          case A3a.vpl.KbdControl.ObjectType.blockLeft:
          case A3a.vpl.KbdControl.ObjectType.blockRight:
            var selection = self.getSelectedObject();
            if (selection instanceof A3a.vpl.Block && selection.blockTemplate.paramAccessibility) {
              self.selectionType = self.selectionType === A3a.vpl.KbdControl.ObjectType.blockLeft ? A3a.vpl.KbdControl.ObjectType.blockLeftParam : A3a.vpl.KbdControl.ObjectType.blockRightParam;
              self.selectionParamIndex = 0;
            }
            break;
          case A3a.vpl.KbdControl.ObjectType.toolbarTop:
          case A3a.vpl.KbdControl.ObjectType.toolbarBottom:
            var cmd = self.getSelectedCmd();
            if (cmd != null) {
              self.executeCommand(cmd);
            }
            break;
        }setHint();
        self.app.renderProgramToCanvas();
        return true;
      case " ":
        switch(self.selectionType) {
          case A3a.vpl.KbdControl.ObjectType.blockLeft:
          case A3a.vpl.KbdControl.ObjectType.blockRight:
            self.targetType = self.selectionType;
            self.targetIndex1 = self.selectionIndex1;
            self.targetIndex2 = self.selectionIndex2;
            break;
          case A3a.vpl.KbdControl.ObjectType.blockLeftParam:
          case A3a.vpl.KbdControl.ObjectType.blockRightParam:
            var selectionBlock = self.getBlockOfSelectedParam();
            if (selectionBlock.blockTemplate.paramAccessibility != null) {
              var c = selectionBlock.blockTemplate.paramAccessibility.controls[self.selectionParamIndex];
              if (c.onSelect) {
                c.onSelect(selectionBlock);
              }
            }
            break;
          case A3a.vpl.KbdControl.ObjectType.rule:
            self.targetType = self.selectionType;
            self.targetIndex1 = self.selectionIndex1;
            self.selectionIndex2 = 0;
            break;
          case A3a.vpl.KbdControl.ObjectType.libLeft:
          case A3a.vpl.KbdControl.ObjectType.libRight:
            var selection = self.getSelectedBlockTemplate();
            self.activateTemplate(selection);
            break;
        }setHint();
        self.app.renderProgramToCanvas();
        return true;
      case "Backspace":
        var selection = self.getSelectedObject();
        switch(self.selectionType) {
          case A3a.vpl.KbdControl.ObjectType.rule:
          case A3a.vpl.KbdControl.ObjectType.blockLeft:
          case A3a.vpl.KbdControl.ObjectType.blockRight:
            if (self.app.commands.canDrop("vpl:trashcan", {data:selection})) {
              self.app.commands.doDrop("vpl:trashcan", {data:selection});
              switch(self.selectionType) {
                case A3a.vpl.KbdControl.ObjectType.rule:
                  if (self.selectionIndex1 >= self.app.program.program.length) {
                    self.selectionIndex1--;
                  }
                  break;
                case A3a.vpl.KbdControl.ObjectType.blockLeft:
                  if (self.selectionIndex2 > 0 && self.selectionIndex2 + 1 >= numBlocksLeft()) {
                    self.selectionIndex2--;
                  }
                  break;
                case A3a.vpl.KbdControl.ObjectType.blockRight:
                  if (self.selectionIndex2 > 0 && self.selectionIndex2 + 1 >= numBlocksRight()) {
                    self.selectionIndex2--;
                  }
                  break;
              }
              self.targetType = A3a.vpl.KbdControl.ObjectType.none;
              setHint();
              self.app.renderProgramToCanvas();
            }
            break;
        }return true;
      case "ArrowRight":
        switch(self.selectionType) {
          case A3a.vpl.KbdControl.ObjectType.rule:
            if (self.targetType === null || self.targetType === A3a.vpl.KbdControl.ObjectType.rule) {
              self.targetType = A3a.vpl.KbdControl.ObjectType.rule;
              self.targetIndex1 = self.selectionIndex1;
            }
            self.selectionType = A3a.vpl.KbdControl.ObjectType.libRight;
            self.selectionIndex1 = 0;
            self.selectionIndex2 = 0;
            break;
          case A3a.vpl.KbdControl.ObjectType.libLeft:
            if (self.selectionIndex2 < Math.floor(self.libLeftNum / self.libLeftColLen) - (self.selectionIndex1 < self.libLeftNum % self.libLeftColLen ? 0 : 1)) {
              self.selectionIndex2++;
            } else {
              self.selectionType = A3a.vpl.KbdControl.ObjectType.rule;
              self.selectionIndex1 = 0;
            }
            break;
          case A3a.vpl.KbdControl.ObjectType.libRight:
            self.selectionIndex2 = Math.min(self.selectionIndex2 + 1, Math.floor(self.libRightNum / self.libRightColLen) - (self.selectionIndex1 < self.libRightNum % self.libRightColLen ? 0 : 1));
            break;
          case A3a.vpl.KbdControl.ObjectType.blockLeft:
            if (self.selectionIndex2 + 1 >= numBlocksLeft()) {
              self.selectionType = A3a.vpl.KbdControl.ObjectType.blockRight;
              self.selectionIndex2 = 0;
            } else {
              self.selectionIndex2++;
            }
            break;
          case A3a.vpl.KbdControl.ObjectType.blockRight:
            if (self.selectionIndex2 < numBlocksRight() - 1) {
              self.selectionIndex2++;
            } else {
              self.selectionType = A3a.vpl.KbdControl.ObjectType.rule;
            }
            break;
          case A3a.vpl.KbdControl.ObjectType.blockLeftParam:
          case A3a.vpl.KbdControl.ObjectType.blockRightParam:
            var selectionBlock = self.getBlockOfSelectedParam();
            if (selectionBlock.blockTemplate.paramAccessibility != null) {
              var c = selectionBlock.blockTemplate.paramAccessibility.controls[self.selectionParamIndex];
              if (c.onUp) {
                c.onUp(selectionBlock);
              }
            }
            break;
          case A3a.vpl.KbdControl.ObjectType.toolbarTop:
            self.selectionIndex1 = Math.min(self.selectionIndex1 + 1, self.toolbarItemCount(false) - 1);
            break;
          case A3a.vpl.KbdControl.ObjectType.toolbarBottom:
            self.selectionIndex1 = Math.min(self.selectionIndex1 + 1, self.toolbarItemCount(true) - 1);
            break;
        }setHint();
        self.app.renderProgramToCanvas();
        return true;
      case "ArrowLeft":
        switch(self.selectionType) {
          case A3a.vpl.KbdControl.ObjectType.rule:
            if (self.targetType === null || self.targetType === A3a.vpl.KbdControl.ObjectType.rule) {
              self.targetType = A3a.vpl.KbdControl.ObjectType.rule;
              self.targetIndex1 = self.selectionIndex1;
            }
            self.selectionType = A3a.vpl.KbdControl.ObjectType.libLeft;
            self.selectionIndex1 = 0;
            self.selectionIndex2 = Math.ceil(self.libLeftNum / self.libLeftColLen) - 1;
            break;
          case A3a.vpl.KbdControl.ObjectType.libLeft:
            self.selectionIndex2 = Math.max(self.selectionIndex2 - 1, 0);
            break;
          case A3a.vpl.KbdControl.ObjectType.libRight:
            if (self.selectionIndex2 > 0) {
              self.selectionIndex2--;
            } else {
              self.selectionType = A3a.vpl.KbdControl.ObjectType.rule;
              self.selectionIndex1 = 0;
            }
            break;
          case A3a.vpl.KbdControl.ObjectType.blockLeft:
            if (self.selectionIndex2 > 0) {
              self.selectionIndex2--;
            } else {
              self.selectionType = A3a.vpl.KbdControl.ObjectType.rule;
            }
            break;
          case A3a.vpl.KbdControl.ObjectType.blockRight:
            if (self.selectionIndex2 === 0) {
              self.selectionType = A3a.vpl.KbdControl.ObjectType.blockLeft;
              self.selectionIndex2 = numBlocksLeft() - 1;
            } else {
              self.selectionIndex2--;
            }
            break;
          case A3a.vpl.KbdControl.ObjectType.blockLeftParam:
          case A3a.vpl.KbdControl.ObjectType.blockRightParam:
            var selectionBlock = self.getBlockOfSelectedParam();
            if (selectionBlock.blockTemplate.paramAccessibility != null) {
              var c = selectionBlock.blockTemplate.paramAccessibility.controls[self.selectionParamIndex];
              if (c.onDown) {
                c.onDown(selectionBlock);
              }
            }
            break;
          case A3a.vpl.KbdControl.ObjectType.toolbarTop:
            self.selectionIndex1 = Math.max(self.selectionIndex1 - 1, 0);
            break;
          case A3a.vpl.KbdControl.ObjectType.toolbarBottom:
            self.selectionIndex1 = Math.max(self.selectionIndex1 - 1, 0);
            break;
        }setHint();
        self.app.renderProgramToCanvas();
        return true;
      case "ArrowUp":
        switch(self.selectionType) {
          case A3a.vpl.KbdControl.ObjectType.rule:
            if (self.selectionIndex1 === 0) {
              if (self.toolbarItemCount(false) > 0) {
                self.selectionType = A3a.vpl.KbdControl.ObjectType.toolbarTop;
                self.selectionIndex1 = 0;
              }
            } else {
              self.selectionIndex1 = Math.max(self.selectionIndex1 - 1, 0);
            }
            break;
          case A3a.vpl.KbdControl.ObjectType.blockLeft:
          case A3a.vpl.KbdControl.ObjectType.blockRight:
            if (self.selectionIndex1 === 0) {
              if (self.toolbarItemCount(false) > 0) {
                self.selectionType = A3a.vpl.KbdControl.ObjectType.toolbarTop;
                self.selectionIndex1 = 0;
              }
            } else {
              self.selectionIndex1 = Math.max(self.selectionIndex1 - 1, 0);
              self.selectionIndex2 = Math.min(self.selectionIndex2, (self.selectionType === A3a.vpl.KbdControl.ObjectType.blockLeft ? numBlocksLeft() : numBlocksRight()) - 1);
            }
            break;
          case A3a.vpl.KbdControl.ObjectType.libLeft:
          case A3a.vpl.KbdControl.ObjectType.libRight:
            self.selectionIndex1 = Math.max(self.selectionIndex1 - 1, 0);
            break;
          case A3a.vpl.KbdControl.ObjectType.blockLeftParam:
          case A3a.vpl.KbdControl.ObjectType.blockRightParam:
            var selectionBlock = self.getBlockOfSelectedParam();
            if (selectionBlock.blockTemplate.paramAccessibility != null) {
              var c = selectionBlock.blockTemplate.paramAccessibility.controls[self.selectionParamIndex];
              if (c.onUp) {
                c.onUp(selectionBlock);
              }
            }
            break;
          case A3a.vpl.KbdControl.ObjectType.toolbarBottom:
            self.selectionType = A3a.vpl.KbdControl.ObjectType.rule;
            self.selectionIndex1 = Math.max(self.app.program.program.length - 1, 0);
            break;
        }setHint();
        self.app.renderProgramToCanvas();
        return true;
      case "ArrowDown":
        switch(self.selectionType) {
          case A3a.vpl.KbdControl.ObjectType.rule:
            if (self.selectionIndex1 >= self.app.program.program.length - 1) {
              if (self.toolbarItemCount(true) > 0) {
                self.selectionType = A3a.vpl.KbdControl.ObjectType.toolbarBottom;
                self.selectionIndex1 = 0;
              }
            } else {
              self.selectionIndex1 = Math.min(self.selectionIndex1 + 1, self.app.program.program.length - 1);
            }
            break;
          case A3a.vpl.KbdControl.ObjectType.blockLeft:
          case A3a.vpl.KbdControl.ObjectType.blockRight:
            if (self.selectionIndex1 >= self.app.program.program.length - 1) {
              if (self.toolbarItemCount(true) > 0) {
                self.selectionType = A3a.vpl.KbdControl.ObjectType.toolbarBottom;
                self.selectionIndex1 = 0;
              }
            } else {
              self.selectionIndex1 = Math.min(self.selectionIndex1 + 1, self.app.program.program.length - 1);
              if (self.app.program.program[self.selectionIndex1] instanceof A3a.vpl.RuleComment) {
                self.selectionType = A3a.vpl.KbdControl.ObjectType.rule;
              } else {
                self.selectionIndex2 = Math.min(self.selectionIndex2, (self.selectionType === A3a.vpl.KbdControl.ObjectType.blockLeft ? numBlocksLeft() : numBlocksRight()) - 1);
              }
            }
            break;
          case A3a.vpl.KbdControl.ObjectType.libLeft:
            self.selectionIndex1 = Math.min(self.selectionIndex1 + 1, (self.selectionIndex2 < Math.floor(self.libLeftNum / self.libLeftColLen) ? self.libLeftColLen : self.libLeftNum % self.libLeftColLen) - 1);
            break;
          case A3a.vpl.KbdControl.ObjectType.libRight:
            self.selectionIndex1 = Math.min(self.selectionIndex1 + 1, (self.selectionIndex2 < Math.floor(self.libRightNum / self.libRightColLen) ? self.libRightColLen : self.libRightNum % self.libRightColLen) - 1);
            break;
          case A3a.vpl.KbdControl.ObjectType.blockLeftParam:
          case A3a.vpl.KbdControl.ObjectType.blockRightParam:
            var selectionBlock = self.getBlockOfSelectedParam();
            if (selectionBlock.blockTemplate.paramAccessibility != null) {
              var c = selectionBlock.blockTemplate.paramAccessibility.controls[self.selectionParamIndex];
              if (c.onDown) {
                c.onDown(selectionBlock);
              }
            }
            break;
          case A3a.vpl.KbdControl.ObjectType.toolbarTop:
            self.selectionType = A3a.vpl.KbdControl.ObjectType.rule;
            self.selectionIndex1 = 0;
            break;
        }setHint();
        self.app.renderProgramToCanvas();
        return true;
      case "Tab":
        switch(self.selectionType) {
          case A3a.vpl.KbdControl.ObjectType.blockLeftParam:
          case A3a.vpl.KbdControl.ObjectType.blockRightParam:
            var selectionBlock = self.getBlockOfSelectedParam();
            if (selectionBlock.blockTemplate.paramAccessibility != null) {
              var numControls = selectionBlock.blockTemplate.paramAccessibility.controls.length;
              self.selectionParamIndex = (self.selectionParamIndex + (ev.shiftKey ? numControls - 1 : 1)) % numControls;
            }
            break;
        }setHint();
        self.app.renderProgramToCanvas();
        return true;
    }
    return false;
  });
};
A3a.vpl.KbdControl.prototype.clickOnParamControl = function(x, y) {
  function inUpperPart(c) {
    return c.bottom - c.top > c.right - c.left ? y < (c.top + c.bottom) / 2 : x > (c.left + c.right) / 2;
  }
  var target = this.getTargetObject();
  if (target instanceof A3a.vpl.Block) {
    var p = target.blockTemplate.paramAccessibility;
    if (p != undefined) {
      for (var i = 0; i < p.controls.length; i++) {
        var c = p.controls[i];
        if (x >= c.left && x <= c.right && y >= c.top && y <= c.bottom) {
          if (c.onClick) {
            c.onClick(target, (x - c.left) / (c.right - c.left), (y - c.top) / (c.bottom - c.top));
          } else {
            if (c.onSelect) {
              c.onSelect(target);
            } else {
              if (c.onDown && !inUpperPart(c)) {
                c.onDown(target);
              } else {
                if (c.onUp && inUpperPart(c)) {
                  c.onUp(target);
                }
              }
            }
          }
          break;
        }
      }
    }
  }
};
A3a.vpl.blockLib = {};
A3a.vpl.dragFun = null;
document.addEventListener("mousemove", function(e) {
  if (A3a.vpl.dragFun !== null) {
    A3a.vpl.dragFun(e, false, false);
    e.preventDefault();
  }
}, false);
document.addEventListener("mouseup", function(e) {
  if (A3a.vpl.dragFun !== null) {
    A3a.vpl.dragFun(e, true, false);
    A3a.vpl.dragFun = null;
    e.preventDefault();
  }
}, false);
A3a.vpl.lastTouch = null;
document.addEventListener("touchmove", function(e) {
  if (A3a.vpl.dragFun !== null) {
    var touches = e.targetTouches;
    A3a.vpl.lastTouch = touches[0];
    A3a.vpl.dragFun(A3a.vpl.lastTouch, false, true);
    e.preventDefault();
  }
  return false;
}, {"capture":false, "passive":false});
document.addEventListener("touchend", function(e) {
  if (A3a.vpl.dragFun !== null) {
    A3a.vpl.dragFun(A3a.vpl.lastTouch, true, true);
    A3a.vpl.dragFun = null;
    e.preventDefault();
  }
  return false;
}, false);
function vplLoadResourcesWithXHR(rootFilename, rootDir, getAuxiliaryFilenames, onLoad, onError) {
  var path = rootFilename.indexOf("/") >= 0 ? rootFilename.replace(/\/[^/]*$/, "/") : "";
  var rsrc = {};
  var xhr = new XMLHttpRequest;
  xhr.addEventListener("load", function() {
    if (xhr.status === 200) {
      rsrc[rootFilename] = xhr.responseText;
      var gui = JSON.parse(xhr.responseText);
      var auxFiles = getAuxiliaryFilenames(gui);
      var nRemaining = auxFiles.length;
      var error = false;
      auxFiles.forEach(function(f) {
        var xhr = new XMLHttpRequest;
        xhr.addEventListener("load", function() {
          if (xhr.status === 200) {
            rsrc[f] = xhr.responseText;
            nRemaining--;
            if (!error && nRemaining === 0) {
              onLoad(gui, rsrc);
            }
          } else {
            if (!error) {
              error = true;
              onError("HTTP error " + xhr.status);
            }
          }
        });
        xhr.addEventListener("error", function() {
          if (!error) {
            error = true;
            onError("XMLHttpRequest error for " + rootFilename);
          }
        });
        xhr.open("GET", path + f);
        xhr.send();
      });
    } else {
      onError("HTTP error " + xhr.status);
    }
  });
  xhr.addEventListener("error", onError);
  xhr.open("GET", rootFilename);
  xhr.send();
}
function vplLoadResourcesInScripts(rootFilename, rootDir, getAuxiliaryFilenames, onLoad, onError) {
  function getRsrsc(id) {
    var el = document.getElementById(id);
    if (el == null) {
      throw "Missing script element " + id;
    }
    return el.textContent;
  }
  try {
    var txt = getRsrsc(rootFilename);
    var gui = JSON.parse(txt);
    var rsrc = {};
    if (gui["svgFilenames"]) {
      gui["svgFilenames"].forEach(function(filename) {
        txt = getRsrsc(filename);
        rsrc[filename] = txt;
      });
    }
    if (gui["overlays"]) {
      gui["overlays"].forEach(function(filename) {
        txt = getRsrsc(filename);
        rsrc[filename] = txt;
      });
    }
    if (gui["css"]) {
      gui["css"].forEach(function(filename) {
        txt = getRsrsc(filename).trim();
        rsrc[filename] = txt;
      });
    }
    if (gui["doc"]) {
      for (var key in gui["doc"]) {
        if (gui["doc"].hasOwnProperty(key)) {
          for (var key2 in gui["doc"][key]) {
            if (gui["doc"][key].hasOwnProperty(key2)) {
              txt = getRsrsc(gui["doc"][key][key2]).trim();
              rsrc[gui["doc"][key][key2]] = txt;
            }
          }
        }
      }
    }
    onLoad(gui, rsrc);
  } catch (e) {
    onError(e);
  }
}
function vplGetQueryOption(key) {
  var query = "";
  if (window["vplQueryOptions"]) {
    query = window["vplQueryOptions"];
  } else {
    var r = /^[^?]*\?([^#]*)/.exec(document.location.href);
    query = r && r[1];
  }
  if (query) {
    var pairs = query.split("&").map(function(p) {
      return p.split("=").map(function(s) {
        return decodeURIComponent(s);
      });
    });
    for (var i = 0; i < pairs.length; i++) {
      if (pairs[i][0] === key) {
        return pairs[i][1];
      }
    }
  }
  return "";
}
function vplGetHashOption(key) {
  var dict = (document.location.hash || "#").slice(1).split("&").map(function(p) {
    return p.split("=").map(decodeURIComponent);
  }).reduce(function(acc, p) {
    acc[p[0]] = p[1];
    return acc;
  }, {});
  return dict[key] || null;
}
function vplSetup(gui, rootDir) {
  var helpFragments = [];
  if (gui && gui["overlays"]) {
    gui["overlays"].forEach(function(filename) {
      try {
        var overlay = JSON.parse(gui.rsrc[filename]);
      } catch (e) {
        console.error(e.message);
      }
      for (var key in overlay) {
        if (overlay.hasOwnProperty(key)) {
          switch(key) {
            case "blocks":
            case "blockList":
            case "aeslImportRules":
            case "buttons":
            case "widgets":
              gui[key] = gui[key] ? gui[key].concat(overlay[key]) : overlay[key];
              break;
            case "toolbars":
              for (var key2 in overlay[key]) {
                if (overlay[key].hasOwnProperty(key2)) {
                  gui[key] = gui[key] || {};
                  gui[key][key2] = overlay[key][key2];
                }
              }
              break;
            case "i18n":
              for (var key2 in overlay[key]) {
                if (overlay[key].hasOwnProperty(key2)) {
                  gui[key] = gui[key] || {};
                  gui[key][key2] = gui[key][key2] || {};
                  for (var key3 in overlay[key][key2]) {
                    if (overlay[key][key2].hasOwnProperty(key3)) {
                      gui[key][key2][key3] = overlay[key][key2][key3];
                    }
                  }
                }
              }
              break;
            case "help":
              helpFragments.push(overlay[key]);
              break;
          }
        }
      }
    });
  }
  var canvasEl = document.getElementById("programCanvas");
  var role = vplGetQueryOption("role");
  var keyboardShortcuts = vplGetQueryOption("shortcuts");
  var app = new A3a.vpl.Application(canvasEl);
  if (keyboardShortcuts) {
    app.uiConfig.keyboardShortcutsEnabled = keyboardShortcuts === "true";
  }
  app.uiConfig.keyboardAccessibility = vplGetQueryOption("accessibility").split("+").indexOf("kbd") >= 0;
  app.uiConfig.nodragAccessibility = vplGetQueryOption("accessibility").split("+").indexOf("nodrag") >= 0;
  app.simMaps = window["vplSimMaps"] == undefined ? "ground,height,obstacles" : window["vplSimMaps"] === "merged" ? null : window["vplSimMaps"].split(",");
  window["vplApp"] = app;
  app.username = vplGetQueryOption("user") || window["vplUsername"] || app.username;
  app.pushVPLKeyShortcuts();
  if (gui && A3a.vpl.validateUI) {
    app.program.message = A3a.vpl.validateUI(gui);
    if (app.program.message) {
      window["console"]["info"](app.program.message);
    }
  }
  if (gui && gui["css"]) {
    app.css.reset();
    gui["css"].forEach(function(filename) {
      app.css.parse(filename, gui.rsrc[filename]);
    });
    app.css.defineProperties();
  }
  if (gui && gui["i18n"]) {
    for (var lang in gui["i18n"]) {
      if (gui["i18n"].hasOwnProperty(lang)) {
        app.i18n.addDictForLanguage(lang, gui["i18n"][lang]);
      }
    }
  }
  var uiLanguage = vplGetQueryOption("uilanguage") || "en";
  app.setUILanguage(uiLanguage);
  app.loadBox = new A3a.vpl.Load(app, app.uiConfig.keyboardShortcutsEnabled ? {onShow:function() {
    app.keyboard.pushKeyHandler("Escape", function() {
      app.loadBox.hide();
    });
  }, onHide:function() {
    app.keyboard.popHandler();
  }} : null);
  if (window["vplStorageSetFunction"]) {
    app.program.saveChanges = function() {
      var json = window["vplApp"].program.exportToJSON();
      window["vplStorageSetFunction"](A3a.vpl.Program.defaultFilename, json);
    };
  }
  var isClassic = gui == undefined || gui["hardcoded-gui"] || vplGetQueryOption("appearance") === "classic";
  app.useLocalStorage = vplGetQueryOption("storage") === "local";
  app.multipleViews = vplGetQueryOption("multiview") !== "false";
  var language = vplGetQueryOption("language");
  CSSParser.VPL.debug = vplGetQueryOption("cssdebug") === "true";
  var drawButton = A3a.vpl.Commands.drawButtonJS;
  var getButtonBounds = A3a.vpl.Commands.getButtonBoundsJS;
  var widgets = A3a.vpl.widgetsJS;
  if (gui) {
    if (isClassic) {
      if (gui["blocks"] !== null && gui["blocks"].length > 0) {
        (gui["blocks"] || []).forEach(function(b) {
          var name = b["name"];
          var bt = A3a.vpl.BlockTemplate.findByName(name);
          A3a.vpl.BlockTemplate.loadCodeGenFromJSON(b, bt.genCode);
          if (b["typicalParamSet"]) {
            bt.typicalParamSet = b["typicalParamSet"];
          }
        });
      }
    } else {
      if (gui["buttons"] !== null && gui["buttons"].length > 0) {
        drawButton = A3a.vpl.drawButtonSVGFunction(gui);
        getButtonBounds = A3a.vpl.getButtonBoundsSVGFunction(gui);
      }
      if (gui["widgets"] !== null && gui["widgets"].length > 0) {
        widgets = A3a.vpl.makeSVGWidgets(gui);
      }
      if (gui["blocks"] !== null && gui["blocks"].length > 0) {
        try {
          A3a.vpl.patchBlocksSVG(gui);
        } catch (e) {
          window["console"] && window["console"]["error"](e);
        }
      }
    }
    if (gui["blockList"]) {
      var newLib = [];
      A3a.vpl.BlockTemplate.lib.forEach(function(template) {
        if (template.type === A3a.vpl.blockType.hidden) {
          newLib.push(template);
        }
      });
      gui["blockList"].forEach(function(name) {
        var template = A3a.vpl.BlockTemplate.findByName(name);
        newLib.push(template);
      });
      A3a.vpl.BlockTemplate.lib = newLib;
    }
    if (gui["aeslImportRules"] && gui["aeslImportRules"].length > 0) {
      A3a.vpl.BlockTemplate.aeslImportRules = gui["aeslImportRules"].map(function(aeslImportRule) {
        return {aeslName:aeslImportRule["aeslName"], condition:aeslImportRule["condition"] || null, blockName:aeslImportRule["blockName"], parameters:aeslImportRule["parameters"] || null, stringParam:aeslImportRule["stringParam"] || false};
      });
    }
    if (gui["miscSettings"] && gui["miscSettings"]["advancedModeEnabled"] != undefined) {
      A3a.vpl.Program.advancedModeEnabled = gui["miscSettings"]["advancedModeEnabled"] == true;
    }
    if (gui["miscSettings"] && gui["miscSettings"]["basicMultiEvent"] != undefined) {
      A3a.vpl.Program.basicMultiEvent = gui["miscSettings"]["basicMultiEvent"] == true;
    }
    if (gui["miscSettings"] && gui["miscSettings"]["advancedMultiEvent"] != undefined) {
      A3a.vpl.Program.advancedMultiEvent = gui["miscSettings"]["advancedMultiEvent"] == true;
    }
    if (gui["miscSettings"] && gui["miscSettings"]["viewRelativeSizes"]) {
      var vrs = gui["miscSettings"]["viewRelativeSizes"];
      app.viewRelativeSizes = {"vpl":vrs["vpl"] || 1, "src":vrs["src"] || 1, "sim":vrs["sim"] || 1};
    }
  }
  var commandServer = vplGetQueryOption("server");
  var commandSession = vplGetQueryOption("session");
  var advancedFeatures = vplGetQueryOption("adv") === "true";
  var experimentalFeatures = vplGetQueryOption("exp") === "true";
  A3a.vpl.Program.advancedModeEnabled = vplGetQueryOption("advmode") === "true";
  var filterBlur = 0;
  var filterGrayscale = 0;
  var filter = "";
  var opt = vplGetQueryOption("blur").trim() || "";
  if (/^\d+$/.test(opt)) {
    filterBlur = parseInt(opt, 10) / 10;
  }
  opt = vplGetQueryOption("grayscale") || "";
  if (/^\d+$/.test(opt)) {
    filterGrayscale = parseInt(opt, 10) / 100;
  }
  if (filterBlur > 0 || filterGrayscale > 0) {
    filter = "blur(" + filterBlur.toFixed(1) + "px) grayscale(" + filterGrayscale.toFixed(2) + ")";
  }
  var scale = 1;
  var rotation = 0;
  var mirror = false;
  var transform = null;
  opt = vplGetQueryOption("scale").trim() || "";
  if (/^\d+(\.\d*)?$/.test(opt)) {
    scale = parseFloat(opt);
  }
  opt = vplGetQueryOption("rotation").trim() || "";
  if (/^-?\d+(\.\d*)?$/.test(opt)) {
    rotation = parseFloat(opt) * Math.PI / 180;
  }
  opt = vplGetQueryOption("mirror").trim() || "";
  mirror = opt === "true";
  if (scale !== 1 || rotation !== 0 || mirror) {
    transform = [scale * Math.cos(rotation) * (mirror ? -1 : 1), scale * Math.sin(rotation) * (mirror ? -1 : 1), -scale * Math.sin(rotation), scale * Math.cos(rotation), 0, 0];
  }
  if (!language) {
    language = app.currentRobotIndex >= 0 ? app.robots[app.currentRobotIndex].runGlue.preferredLanguage : A3a.vpl.defaultLanguage;
  }
  A3a.vpl.Program.resetBlockLib();
  app.program.new(true);
  app.program.resetUI();
  var view = vplGetQueryOption("view");
  var views = view.length === 0 ? ["vpl"] : view.split("+");
  var robot = vplGetQueryOption("robot");
  if (views.indexOf("sim") >= 0 || robot === "sim") {
    robot = "sim";
  }
  robot.replace(/[+;]/g, ",").split(",").forEach(function(robotName) {
    var runGlue = null;
    switch(robotName) {
      case "thymio":
        runGlue = app.installThymio();
        runGlue.init(language);
        break;
      case "thymio-tdm":
        runGlue = app.installThymioTDM();
        runGlue.init(language);
        break;
      case "thymio-jws":
        runGlue = app.installThymioJSONWebSocketBridge();
        runGlue.init(language);
        break;
      case "sim":
        runGlue = app.installRobotSimulator({canvasFilter:filter, canvasTransform:transform});
        runGlue.init(language);
        break;
    }
    if (runGlue) {
      app.robots.push({name:robotName, runGlue:runGlue});
    }
  });
  app.currentRobotIndex = app.robots.length > 0 ? 0 : -1;
  if (!A3a.vpl.Program.codeGenerator[language]) {
    throw "Unsupported language " + language;
  }
  app.uiConfig.setDisabledFeatures(advancedFeatures ? [] : ["src:language"]);
  app.program.currentLanguage = language;
  app.vplCanvas.widgets = widgets;
  if (app.simCanvas != null) {
    app.simCanvas.widgets = widgets;
  }
  app.addVPLCommands();
  if (!isClassic && gui && gui["toolbars"]) {
    if (gui["toolbars"]["vpl"]) {
      app.vplToolbarConfig = gui["toolbars"]["vpl"];
    }
    if (gui["toolbars"]["vpl2"]) {
      app.vplToolbar2Config = gui["toolbars"]["vpl2"];
    }
  }
  app.program.toolbarDrawButton = drawButton;
  app.program.toolbarGetButtonBounds = getButtonBounds;
  if (A3a.vpl.VPLSourceEditor && document.getElementById("editor")) {
    app.editor = new A3a.vpl.VPLSourceEditor(app, app.program.noVPL, language);
    app.editor.tbCanvas.setFilter(filter);
    app.program.getEditedSourceCodeFun = function() {
      return app.editor.doesMatchVPL() ? null : app.editor.getCode();
    };
    app.program.setEditedSourceCodeFun = function(code) {
      app.editor.setCode(code);
    };
    app.editor.tbCanvas.widgets = widgets;
    app.addSrcCommands();
    if (!isClassic && gui && gui["toolbars"] && gui["toolbars"]["editor"]) {
      app.editor.toolbarConfig = gui["toolbars"]["editor"];
    }
    app.editor.toolbarDrawButton = drawButton;
    app.editor.toolbarGetButtonBounds = getButtonBounds;
    app.editor.setTeacherRole(role === "teacher");
  }
  if (app.sim2d != null) {
    app.addSim2DCommands();
    if (!isClassic && gui && gui["toolbars"] && gui["toolbars"]["simulator"]) {
      app.sim2d.toolbarConfig = gui["toolbars"]["simulator"];
    }
    app.sim2d.toolbarDrawButton = drawButton;
    app.sim2d.toolbarGetButtonBounds = getButtonBounds;
  }
  if (filter) {
    app.vplCanvas.setFilter(filter);
  }
  app.vplCanvas.initTransform(transform);
  document.getElementsByTagName("body")[0].addEventListener("dragover", function(e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, false);
  document.getElementsByTagName("body")[0].addEventListener("drop", function(e) {
    e.stopPropagation();
    e.preventDefault();
    var files = e.dataTransfer.files;
    if (files.length === 1) {
      var file = files[0];
      app.loadProgramFile(file) || app.loadImageFile(file) || app.loadAudioFile(file);
    }
  }, false);
  if (app.sim2d) {
    app.sim2d.uiConfig = app.uiConfig;
    var defaultGround = '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="297mm" height="210mm" viewBox="0 0 1052 744" version="1.1"><defs><linearGradient id="gradient" x1="-1000" y1="0" x2="-800" y2="0" gradientUnits="userSpaceOnUse"><stop style="stop-color:#000;stop-opacity:1;" offset="0" /><stop style="stop-color:#000;stop-opacity:0;" offset="1" /></linearGradient></defs><g transform="translate(0,-308)"><rect style="fill:url(#gradient);stroke:none" width="319" height="687" x="-1027" y="336" transform="scale(-1,1)" /><path style="fill:none;stroke:#000;stroke-width:30;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none" d="M 114,592 C 102,417 750,306 778,532 806,757 674,675 559,622 444,568 259,567 278,664 296,762 726,730 778,808 829,887 725,955 616,936 507,917 144,1083 129,837 Z" /></g></svg>';
    var defaultGroundImg = new Image;
    defaultGroundImg.addEventListener("load", function() {
      app.sim2d.disabledGroundImage = defaultGroundImg;
    });
    defaultGroundImg.src = "data:image/svg+xml;base64," + btoa(defaultGround);
    var defaultHeight = '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 1052 744" version="1.1"><defs><radialGradient id="gradient" cx="400" cy="650" fx="400" fy="650" r="230" gradientTransform="matrix(1.6,0,0,1.16,-113,-75)" gradientUnits="userSpaceOnUse"><stop style="stop-color:#000;stop-opacity:1;" offset="0" /><stop style="stop-color:#000;stop-opacity:0;" offset="1" /></radialGradient></defs><g transform="translate(0,-308)"><rect style="fill:url(#gradient);fill-opacity:1;stroke:none" width="939" height="650" x="54" y="357" /></g></svg>';
    var defaultHeightImg = new Image;
    defaultHeightImg.addEventListener("load", function() {
      app.sim2d.disabledHeightImage = defaultHeightImg;
    });
    defaultHeightImg.src = "data:image/svg+xml;base64," + btoa(defaultHeight);
    app.sim2d.disabledObstacleSVG = '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 1052 744" version="1.1"><g transform="translate(0,-308)"><path style="fill:none;stroke:#000;stroke-width:6;stroke-linecap:butt;stroke-linejoin:miter" d="M 172,928 137,420 763,371 905,688 708,981 Z" /><path style="fill:none;stroke:#949494;stroke-width:6;stroke-linecap:butt;stroke-linejoin:miter" d="m 402,754 168,91 101,-142" /><circle style="fill:none;stroke:#000;stroke-width:6" cx="531" cy="550" r="59" /></g></svg>';
  }
  app.newVPL(true);
  if (window["vplStorageGetFunction"]) {
    window["vplStorageGetFunction"](A3a.vpl.Program.defaultFilename, function(data, options) {
      try {
        if (data) {
          app.program.filename = options && options["filename"] || A3a.vpl.Program.defaultFilename;
          app.program.readOnly = options != undefined && options["readOnly"] == true;
          if (options != undefined && options["customizationMode"] == true) {
            app.uiConfig.blockCustomizationMode = true;
            app.uiConfig.toolbarCustomizationMode = role === "teacher";
          }
          app.program.importFromJSON(data, function() {
            app.setHelpForCurrentAppState();
            app.renderProgramToCanvas();
          });
          app.restored = true;
        }
      } catch (e) {
      }
    });
  } else {
    if (app.useLocalStorage) {
      try {
        var vplJson = window.localStorage.getItem(A3a.vpl.Program.defaultFilename);
        if (vplJson) {
          app.program.importFromJSON(vplJson, function() {
            app.setHelpForCurrentAppState();
            app.renderProgramToCanvas();
          });
        }
      } catch (e) {
      }
    }
  }
  if (vplGetQueryOption("view") === "text") {
    app.setView(["src"], {noVPL:true});
  } else {
    app.setView(["vpl"]);
    app.program.experimentalFeatures = experimentalFeatures;
    app.program.setTeacherRole(role === "teacher" ? A3a.vpl.Program.teacherRoleType.teacher : role === "teacher1" ? A3a.vpl.Program.teacherRoleType.customizableBlocks : A3a.vpl.Program.teacherRoleType.student);
    app.renderProgramToCanvas();
    if (app.editor) {
      document.getElementById("editor").textContent = app.program.getCode(app.program.currentLanguage);
    }
  }
  var languageList = ["aseba", "l2", "asm", "js", "python"];
  if (app.editor && languageList.indexOf(language) >= 0) {
    app.editor.setUpdateCodeLanguageFunction(function() {
      language = languageList[(languageList.indexOf(language) + 1) % languageList.length];
      app.program.currentLanguage = language;
      var code = app.program.getCode(language);
      return {language:language, code:code};
    });
  }
  if (advancedFeatures) {
    if (app.editor) {
      var asebaNode = new A3a.A3aNode(A3a.thymioDescr);
      app.editor.disass = function(language, src) {
        try {
          switch(language) {
            case "aseba":
              var c = new A3a.Compiler(asebaNode, src);
              c.functionLib = A3a.A3aNode.stdMacros;
              var bytecode = c.compile();
              return A3a.vm.disToMixedListing(src, bytecode, c.sourceToBCMapping, true);
            case "l2":
              var c = new A3a.Compiler.L2(asebaNode, src);
              c.functionLib = A3a.A3aNode.stdMacrosL2;
              var bytecode = c.compile();
              return A3a.vm.disToMixedListing(src, bytecode, c.sourceToBCMapping, true);
            case "asm":
              var asm = new A3a.Assembler(asebaNode, src);
              var bytecode = asm.assemble();
              return A3a.vm.disToListing(bytecode);
            default:
              return null;
          }
        } catch (e) {
          return "; " + e;
        }
      };
    }
  }
  if (gui && gui["fragments"] && gui["fragments"]["about.html"]) {
    app.setAboutBoxContent(gui["fragments"]["about.html"].replace(/UIROOT/g, rootDir));
  }
  if (gui && gui["fragments"] && gui["fragments"]["help.html"]) {
    app.setHelpContent(gui["fragments"]["help.html"].replace(/UIROOT/g, rootDir));
  }
  if (gui && gui["help"] || helpFragments.length > 0) {
    app.dynamicHelp = new A3a.vpl.DynamicHelp;
    if (gui && gui["help"]) {
      app.dynamicHelp.add(gui["help"]);
    }
    app.docTemplates = {};
    if (gui && gui["doc"]) {
      for (var key in gui["doc"]) {
        if (gui["doc"].hasOwnProperty(key) && gui.rsrc[gui["doc"][key]["doctemplate.html"]]) {
          app.docTemplates[key] = gui.rsrc[gui["doc"][key]["doctemplate.html"]];
        }
      }
    }
    helpFragments.forEach(function(h) {
      app.dynamicHelp.add(h);
    });
    app.setHelpForCurrentAppState();
  }
  if (gui && gui["fragments"] && gui["fragments"]["vpl-export-html.css"]) {
    app.cssForHTMLDocument = gui["fragments"]["vpl-export-html.css"];
  }
  app.vplResize();
  app.vplCanvas.update();
  window.addEventListener("resize", function() {
    app.vplResize();
  }, false);
  app.sim2d && app.sim2d.setTeacherRole(role === "teacher");
  if (view === "text") {
    app.setView(["src"], {noVPL:true});
  } else {
    var allowedViews = ["vpl", "src", "sim"];
    if (views.length < 1 || views.length > 3 || view === "") {
      view = "vpl";
    } else {
      for (var i = 0; i < views.length; i++) {
        if (!allowedViews.indexOf(views[i]) < 0) {
          view = "vpl";
          break;
        }
        for (var j = 0; j < i; j++) {
          if (views[i] === views[j]) {
            view = "vpl";
            break;
          }
        }
      }
    }
    app.setView(views);
  }
  app.vplResize();
  if (commandServer) {
    window["vplCommandServer"] = new A3a.vpl.Com(app, commandServer, commandSession);
    window["vplCommandServer"].connect();
  }
}
window.addEventListener("load", function() {
  if (A3a.Device.VirtualThymio && A3a.thymioDescr) {
    var vTh = new A3a.Device.VirtualThymio;
    if (vTh.variableSize !== A3a.thymioDescr["maxVarSize"]) {
      throw "internal: vm var size mismatch";
    }
    if (vTh.variables.length !== A3a.thymioDescr["variables"].length) {
      throw "internal: vm var count mismatch";
    }
    for (var i = 0; i < vTh.variables.length; i++) {
      if (vTh.variables[i].name !== A3a.thymioDescr["variables"][i]["name"] || vTh.variables[i].val.length !== A3a.thymioDescr["variables"][i]["size"]) {
        throw "internal: vm var mismatch";
      }
    }
    if (vTh.localEvents.length !== A3a.thymioDescr["localEvents"].length) {
      throw "internal: vm ev count mismatch";
    }
    for (var i = 0; i < vTh.localEvents.length; i++) {
      if (vTh.localEvents[i].name !== A3a.thymioDescr["localEvents"][i]["name"]) {
        throw "internal: vm var mismatch";
      }
    }
    if (vTh.nativeFunctions.length !== A3a.thymioDescr["nativeFunctions"].length) {
      throw "internal: vm nat fun count mismatch";
    }
    for (var i = 0; i < vTh.localEvents.length; i++) {
      if (vTh.nativeFunctions[i].name !== A3a.thymioDescr["nativeFunctions"][i]["name"]) {
        throw "internal: vm nat fun mismatch";
      }
    }
  }
  var uiDoc = vplGetQueryOption("ui") || "ui.json";
  var isInScripts = document.getElementById(uiDoc) != null;
  var uiRoot = window["vplUIRoot"] ? window["vplUIRoot"] : isInScripts ? "." : uiDoc.indexOf("/") >= 0 ? uiDoc.replace(/\/[^/]*$/, "") : ".";
  (isInScripts ? vplLoadResourcesInScripts : vplLoadResourcesWithXHR)(uiDoc, uiRoot, function(obj) {
    var subfiles = (obj["svgFilenames"] || []).concat(obj["overlays"] || []).concat(obj["css"] || []);
    if (obj["doc"]) {
      for (var key in obj["doc"]) {
        if (obj["doc"].hasOwnProperty(key)) {
          for (var key2 in obj["doc"][key]) {
            if (obj["doc"][key].hasOwnProperty(key2)) {
              subfiles.push(obj["doc"][key][key2]);
            }
          }
        }
      }
    }
    return subfiles;
  }, function(gui, rsrc) {
    gui.rsrc = {};
    gui.svg = {};
    if (gui["svgFilenames"]) {
      gui["svgFilenames"].forEach(function(filename) {
        gui.rsrc[filename] = rsrc[filename];
        gui.svg[filename] = new SVG.Preparsed(rsrc[filename]);
      });
    }
    if (gui["overlays"]) {
      gui["overlays"].forEach(function(filename) {
        gui.rsrc[filename] = rsrc[filename];
      });
    }
    if (gui["css"]) {
      gui["css"].forEach(function(filename) {
        gui.rsrc[filename] = rsrc[filename];
      });
    }
    if (gui["doc"]) {
      for (var key in gui["doc"]) {
        if (gui["doc"].hasOwnProperty(key)) {
          for (var filename in gui["doc"][key]) {
            if (gui["doc"][key].hasOwnProperty(filename)) {
              gui.rsrc[gui["doc"][key][filename]] = rsrc[gui["doc"][key][filename]];
            }
          }
        }
      }
    }
    vplSetup(gui, uiRoot);
  }, function(e) {
    window["console"] && window["console"]["error"](e);
    vplSetup();
  });
}, false);
window["vplIsProgramChanged"] = function() {
  return window["vplApp"].program.undoState.canUndo();
};
window["vplGetProgramAsJSON"] = function(libAndUIOnly) {
  return window["vplApp"].program.exportToJSON(libAndUIOnly ? {lib:true, prog:false} : undefined);
};
window["vplGetUIAsJSON"] = function() {
  return window["vplApp"].program.exportToJSON({lib:true, prog:false});
};
window["vplConvertToHTML"] = function(json, isVPL3UI) {
  var app = window["vplApp"];
  var obj = JSON.parse(json);
  app.program.importFromObject(obj);
  var html = isVPL3UI ? app.uiToHTMLDocument(app.css, true) : app.toHTMLDocument(app.css);
  app.program.undo();
  return html;
};
window["vplConvertMDToHtml"] = function(md) {
  var dynamicHelp = new A3a.vpl.DynamicHelp;
  return dynamicHelp.convertToHTML(md.split("\n"));
};
window.addEventListener("unload", function() {
  var json = window["vplApp"].program.exportToJSON();
  try {
    if (window["vplStorageSetFunction"]) {
      window["vplStorageSetFunction"](A3a.vpl.Program.defaultFilename, json);
    } else {
      if (window["vplApp"].useLocalStorage) {
        window.localStorage.setItem(A3a.vpl.Program.defaultFilename, json);
      }
    }
  } catch (e) {
  }
}, false);
A3a.vpl.Robot = function() {
  this.speedupFactor = 1;
};
A3a.vpl.Robot.prototype["reset"] = function(t0) {
};
A3a.vpl.Robot.prototype.setSpeedupFactor = function(f) {
  this.speedupFactor = f;
};
A3a.vpl.Robot.prototype["resetEventListeners"] = function() {
};
A3a.vpl.Robot.prototype["set"] = function(name, val) {
};
A3a.vpl.Robot.prototype["get"] = function(name) {
  return null;
};
A3a.vpl.Robot.prototype["setClientState"] = function(name, val) {
};
A3a.vpl.Robot.prototype["getClientState"] = function(name) {
  return null;
};
A3a.vpl.Robot.prototype["addEventListener"] = function(name, fun) {
};
A3a.vpl.Robot.prototype["sendEvent"] = function(name, val) {
};
A3a.vpl.Robot.prototype["start"] = function() {
  this["sendEvent"]("init", null);
};
A3a.vpl.Robot.prototype["setTimer"] = function(id, name, period, isPeriodic) {
};
A3a.vpl.Robot.prototype["getTimer"] = function(id) {
  return -1;
};
A3a.vpl.Robot.prototype["loadCode"] = function(language, code) {
};
A3a.vpl.Robot.prototype["shouldRunContinuously"] = function() {
  return false;
};
A3a.vpl.Robot.prototype["run"] = function(tStop, traceFun) {
};
A3a.vpl.Robot.TraceFun;
A3a.vpl.Robot.TraceShape = {line:"l", arc:"a"};
A3a.vpl.Robot.prototype["suspend"] = function() {
};
A3a.vpl.Robot.prototype["resume"] = function(t) {
};
A3a.vpl.VirtualThymio = function() {
  A3a.vpl.Robot.call(this);
  this.playground = {xmin:-Infinity, xmax:+Infinity, ymin:-Infinity, ymax:+Infinity};
  this.t0 = 0;
  this.t = 0;
  this.dt = 0.01;
  this.r = 70;
  this.pos = [0, 0];
  this.theta = 0;
  this.hasNoise = false;
  this.files = {};
  this.robotSize = 120;
  this.groundSensorLon = 80;
  this.groundSensorLat = 20;
  this.state = {};
  this.stateChangeListener = {};
  this.onMove = null;
  this.clientState = {};
  this.timers = [];
  this.eventListeners = {};
  this.ledsCircleUsed = false;
  this.audioContext = null;
  A3a.vpl.VirtualThymio.prototype["reset"].call(this, 0);
  A3a.vpl.VirtualThymio.prototype["resetEventListeners"].call(this);
};
A3a.vpl.VirtualThymio.prototype = Object.create(A3a.vpl.Robot.prototype);
A3a.vpl.VirtualThymio.prototype.constructor = A3a.vpl.VirtualThymio;
A3a.vpl.VirtualThymio.OnMoveFunction;
A3a.vpl.VirtualThymio.prototype["setPositionLimits"] = function(xmin, xmax, ymin, ymax) {
  this.playground = {xmin:xmin, xmax:xmax, ymin:ymin, ymax:ymax};
};
A3a.vpl.VirtualThymio.prototype["setFile"] = function(filename, content) {
  this.files[filename] = content;
};
A3a.vpl.VirtualThymio.prototype["reset"] = function(t0) {
  this.t0 = t0;
  this.t = t0;
  this.pos = [0, 0];
  this.theta = 0;
  this.state = {"button.center":false, "button.left":false, "button.right":false, "button.forward":false, "button.backward":false, "prox.ground.delta":[1, 1], "prox.horizontal":[0, 0, 0, 0, 0, 0, 0], "acc":[0, 0, 1], "motor.left":0, "motor.right":0, "leds.top":[0, 0, 0], "leds.bottom.left":[0, 0, 0], "leds.bottom.right":[0, 0, 0], "leds.circle":[0, 0, 0, 0, 0, 0, 0, 0], "sound":{}};
  this.ledsCircleUsed = false;
  var self = this;
  this.stateChangeListener = {"leds.circle":function(name, val) {
    self.ledsCircleUsed = true;
  }, "sound":function(name, val) {
    if (val.hasOwnProperty("pcm")) {
      var fileId = val["pcm"];
      var filename = "P" + fileId + ".wav";
      var fileContent = self.files[filename];
      if (fileContent) {
        if (!self.audioContext) {
          self.audioContext = new (window["AudioContext"] || window["webkitAudioContext"]);
        }
        var context = self.audioContext;
        var data = fileContent.slice();
        context.decodeAudioData(data, function(buffer) {
          var source = context.createBufferSource();
          source.buffer = buffer;
          source.connect(context.destination);
          source.start(0);
        });
      }
      return;
    }
    if (!val["f"]) {
      return;
    }
    var i = 0;
    function playNote() {
      if (i >= val["f"].length) {
        return;
      }
      if (!self.audioContext) {
        self.audioContext = new (window["AudioContext"] || window["webkitAudioContext"]);
      }
      var oscNode = self.audioContext.createOscillator();
      oscNode.type = "sawtooth";
      oscNode.frequency.value = val["f"][i];
      var gainNode = self.audioContext.createGain();
      gainNode.connect(self.audioContext.destination);
      oscNode.connect(gainNode);
      oscNode.start(0);
      var d = val["d"][i] / 50;
      gainNode.gain.exponentialRampToValueAtTime(0.01, self.audioContext.currentTime + d);
      oscNode.stop(self.audioContext.currentTime + d);
      oscNode.addEventListener("ended", playNote);
      i++;
    }
    playNote();
  }};
  this.timers = [];
  this.suspended = false;
};
A3a.vpl.VirtualThymio.prototype["resetEventListeners"] = function() {
  this.eventListeners = {};
};
A3a.vpl.VirtualThymio.prototype["enforcePositionLimits"] = function() {
  this.pos = [Math.max(this.playground.xmin, Math.min(this.playground.xmax, this.pos[0])), Math.max(this.playground.ymin, Math.min(this.playground.ymax, this.pos[1]))];
};
A3a.vpl.VirtualThymio.prototype["setPosition"] = function(pos, theta) {
  this.pos = pos;
  this.theta = theta;
  this["enforcePositionLimits"]();
  this.onMove && this.onMove.call(this);
};
A3a.vpl.VirtualThymio.prototype["set"] = function(name, val) {
  this.state[name] = val;
  this.stateChangeListener[name] && this.stateChangeListener[name](name, val);
};
A3a.vpl.VirtualThymio.prototype["get"] = function(name) {
  return this.state[name];
};
A3a.vpl.VirtualThymio.prototype["setClientState"] = function(name, val) {
  this.clientState[name] = val;
};
A3a.vpl.VirtualThymio.prototype["getClientState"] = function(name) {
  var val = this.clientState[name];
  if (val instanceof Array) {
    val = val.slice();
  }
  return val;
};
A3a.vpl.VirtualThymio.prototype["addEventListener"] = function(name, fun) {
  this.eventListeners[name] = fun;
};
A3a.vpl.VirtualThymio.prototype["sendEvent"] = function(name, val) {
  this.eventListeners[name] && this.eventListeners[name].call(this, name, val);
  for (var key in this.eventListeners) {
    if (key.indexOf(name + ".") === 0) {
      this.eventListeners[key](name, val);
    }
  }
};
A3a.vpl.VirtualThymio.prototype["setTimer"] = function(id, name, period, isPeriodic) {
  this.timers[id] = {name:name, next:this.t - this.t0 + period, period:isPeriodic ? period : -1};
};
A3a.vpl.VirtualThymio.prototype["getTimer"] = function(id) {
  return this.timers[id] === undefined || this.timers[id].next < 0 ? -1 : this.t0 + this.timers[id] - this.t;
};
A3a.vpl.VirtualThymio.prototype["loadCode"] = function(language, code) {
  if (language !== "js") {
    throw "unsupported language " + language;
  }
  var fun = new Function(code);
  fun.call(this);
};
A3a.vpl.VirtualThymio.prototype["shouldRunContinuously"] = function() {
  if (this.suspended) {
    return false;
  }
  if (this["get"]("motor.left") !== 0 || this["get"]("motor.right") !== 0) {
    return true;
  }
  for (var i = 0; i < this.timers.length; i++) {
    if (this.timers[i] && this.timers[i].next > 0) {
      return true;
    }
  }
  return false;
};
A3a.vpl.VirtualThymio.prototype.noise = function(s) {
  return this.hasNoise ? s * Math.sqrt(-2 * Math.log(Math.random())) * Math.sin(2 * Math.PI * Math.random()) : 0;
};
A3a.vpl.VirtualThymio.prototype["run"] = function(tStop, traceFun) {
  if (this.t0 === 0) {
    this["reset"](tStop);
  }
  if (this.speedupFactor !== 1) {
    this.t0 -= (this.speedupFactor - 1) * (tStop - this.t);
    this.t = this.speedupFactor * (this.t - tStop) + tStop;
  }
  var dt = Math.max(this.dt, (tStop - this.t) / 10);
  var posPrev = this.pos;
  while (!this.suspended && this.t < tStop) {
    dt = Math.min(dt, tStop - this.t);
    var dLeft = (this["get"]("motor.left") * 100 + this.noise(1)) * dt;
    var dRight = (this["get"]("motor.right") * 100 + this.noise(1)) * dt;
    if (dLeft !== 0 || dRight != 0) {
      if (Math.abs(dLeft - dRight) < 1e-6 || Math.abs(dLeft - dRight) < 1e-4 * (Math.abs(dLeft) + Math.abs(dRight))) {
        this.pos = [this.pos[0] + (dLeft + dRight) * 0.5 * Math.cos(this.theta), this.pos[1] + (dLeft + dRight) * 0.5 * Math.sin(this.theta)];
        this["enforcePositionLimits"]();
      } else {
        var R = (dLeft + dRight) * this.r / (dLeft - dRight);
        var dTheta = (dRight - dLeft) / (2 * this.r);
        this.pos = [this.pos[0] + R * (Math.sin(this.theta) - Math.sin(this.theta + dTheta)), this.pos[1] - R * (Math.cos(this.theta) - Math.cos(this.theta + dTheta))];
        this.theta += dTheta;
        this["enforcePositionLimits"]();
      }
      this.onMove && this.onMove.call(this);
    }
    this.t += dt;
    for (var i = 0; i < this.timers.length; i++) {
      if (this.timers[i] && this.timers[i].next > 0 && this.t >= this.t0 + this.timers[i].next + this.noise(0.01)) {
        this.timers[i].next = this.timers[i].period >= 0 ? this.timers[i].next + this.timers[i].period : -1;
        this["sendEvent"](this.timers[i].name, null);
      }
    }
  }
  traceFun && traceFun(A3a.vpl.Robot.TraceShape.line, posPrev.concat(this.pos));
};
A3a.vpl.VirtualThymio.prototype["suspend"] = function() {
  this.suspended = true;
};
A3a.vpl.VirtualThymio.prototype["resume"] = function(t) {
  if (this.suspended) {
    this.t0 += t - this.t;
    this.t = t;
    this.suspended = false;
  }
};
A3a.vm = {};
A3a.dis = {};
A3a.vm.bc = {stop:0, smallImmediate:1, largeImmediate:2, load:3, store:4, loadIndirect:5, storeIndirect:6, unaryOp:7, unaryOpNeg:28672, unaryOpAbs:28673, unaryOpBitNot:28674, unaryOpNot:28675, binaryOp:8, binaryOpShiftLeft:32768, binaryOpShiftRight:32769, binaryOpAdd:32770, binaryOpSub:32771, binaryOpMult:32772, binaryOpDiv:32773, binaryOpMod:32774, binaryOpBitOr:32775, binaryOpBitXor:32776, binaryOpBitAnd:32777, binaryOpEqual:32778, binaryOpNotEqual:32779, binaryOpGreaterThan:32780, binaryOpGreaterEqThan:32781, 
binaryOpLessThan:32782, binaryOpLessEqThan:32783, binaryOpOr:32784, binaryOpAnd:32785, jump:9, conditionalBranch:10, emit:11, nativeCall:12, subCall:13, ret:14};
A3a.vm.condName = ["shift left", "shift right", "add", "sub", "mult", "div", "mod", "bitor", "bitxor", "bitand", "eq", "ne", "gt", "ge", "lt", "le", "or", "and"];
A3a.vm.dis = function(bytecode, noLabel) {
  function s16(u16) {
    return u16 >= 32784 ? u16 - 65536 : u16;
  }
  function s12(u12) {
    return u12 >= 2048 ? u12 - 4096 : u12;
  }
  var code = [];
  var eventVectorSize = bytecode[0];
  if (bytecode.length > 0) {
    if (eventVectorSize % 2 !== 1 || eventVectorSize > bytecode.length) {
      throw "Bad event table";
    }
    code.push({addr:0, op:bytecode.slice(0, 1), instr:-1, str:"dc " + bytecode[0]});
  }
  var eventVectorTable = [];
  for (var i = 1; i < eventVectorSize; i += 2) {
    eventVectorTable.push({id:bytecode[i], addr:bytecode[i + 1]});
    code.push({addr:i, op:bytecode.slice(i, i + 2), instr:-1, str:"dc 0x" + bytecode[i].toString(16) + ", " + bytecode[i + 1]});
  }
  for (var i = eventVectorSize; i < bytecode.length; i++) {
    var instr = {addr:i, op:bytecode.slice(i, i + 1), instr:bytecode[i] >>> 12};
    if (!noLabel) {
      for (var j = 0; j < eventVectorTable.length; j++) {
        if (eventVectorTable[j].addr === i) {
          instr.id = "onevent_" + eventVectorTable[j].id.toString(16);
          break;
        }
      }
    }
    var op = bytecode[i];
    switch(op >>> 12) {
      case A3a.vm.bc.stop:
        instr.str = "stop";
        break;
      case A3a.vm.bc.smallImmediate:
        instr.str = "push.s " + ((op & 4095) - (op & 2048 ? 4096 : 0));
        break;
      case A3a.vm.bc.largeImmediate:
        instr.op = bytecode.slice(i, i + 2);
        instr.str = "push " + s16(bytecode[++i]);
        break;
      case A3a.vm.bc.load:
        instr.str = "load " + (op & 4095);
        break;
      case A3a.vm.bc.store:
        instr.str = "store " + (op & 4095);
        break;
      case A3a.vm.bc.loadIndirect:
        instr.op = bytecode.slice(i, i + 2);
        instr.str = "load.ind " + (op & 4095) + " size=" + bytecode[++i];
        break;
      case A3a.vm.bc.storeIndirect:
        instr.op = bytecode.slice(i, i + 2);
        instr.str = "store.ind " + (op & 4095) + " size=" + bytecode[++i];
        break;
      case A3a.vm.bc.unaryOp:
      case A3a.vm.bc.binaryOp:
        switch(op) {
          case A3a.vm.bc.unaryOpNeg:
            instr.str = "neg";
            break;
          case A3a.vm.bc.unaryOpAbs:
            instr.str = "abs";
            break;
          case A3a.vm.bc.unaryOpBitNot:
            instr.str = "bitnot";
            break;
          case A3a.vm.bc.unaryOpNot:
            instr.str = "not ; not implemented";
            break;
          case A3a.vm.bc.binaryOpShiftLeft:
            instr.str = "sl";
            break;
          case A3a.vm.bc.binaryOpShiftRight:
            instr.str = "asr";
            break;
          case A3a.vm.bc.binaryOpAdd:
            instr.str = "add";
            break;
          case A3a.vm.bc.binaryOpSub:
            instr.str = "sub";
            break;
          case A3a.vm.bc.binaryOpMult:
            instr.str = "mult";
            break;
          case A3a.vm.bc.binaryOpDiv:
            instr.str = "div";
            break;
          case A3a.vm.bc.binaryOpMod:
            instr.str = "mod";
            break;
          case A3a.vm.bc.binaryOpBitOr:
            instr.str = "bitor";
            break;
          case A3a.vm.bc.binaryOpBitXor:
            instr.str = "bitxor";
            break;
          case A3a.vm.bc.binaryOpBitAnd:
            instr.str = "bitand";
            break;
          case A3a.vm.bc.binaryOpEqual:
            instr.str = "eq";
            break;
          case A3a.vm.bc.binaryOpNotEqual:
            instr.str = "ne";
            break;
          case A3a.vm.bc.binaryOpGreaterThan:
            instr.str = "gt";
            break;
          case A3a.vm.bc.binaryOpGreaterEqThan:
            instr.str = "ge";
            break;
          case A3a.vm.bc.binaryOpLessThan:
            instr.str = "lt";
            break;
          case A3a.vm.bc.binaryOpLessEqThan:
            instr.str = "le";
            break;
          case A3a.vm.bc.binaryOpOr:
            instr.str = "or";
            break;
          case A3a.vm.bc.binaryOpAnd:
            instr.str = "and";
            break;
          default:
            throw "Unknown instruction " + op.toString(16);
        }break;
      case A3a.vm.bc.jump:
        instr.str = "jump " + (i + s12(op & 4095));
        break;
      case A3a.vm.bc.conditionalBranch:
        instr.op = bytecode.slice(i, i + 2);
        instr.str = (op & 256 ? op & 512 ? "dont." : "do." : "") + "jump." + (op & 256 ? "when" : "if") + ".not " + A3a.vm.condName[op & 31] + " " + (i + s16(bytecode[i + 1]));
        i++;
        break;
      case A3a.vm.bc.emit:
        instr.str = "emit id=" + (op & 4095) + " data=" + s16(bytecode[i + 1]) + " count=" + s16(bytecode[i + 2]);
        i += 2;
        break;
      case A3a.vm.bc.nativeCall:
        instr.str = "callnat " + (op & 4095);
        break;
      case A3a.vm.bc.subCall:
        instr.str = "callsub " + (op & 4095);
        break;
      case A3a.vm.bc.ret:
        instr.str = "ret";
        break;
      default:
        throw "Unknown instruction " + op.toString(16);
    }
    code.push(instr);
  }
  return code;
};
A3a.vm.disToListing = function(bytecode, forAssembler) {
  var listing = A3a.vm.dis(bytecode).map(function(instr) {
    var addr = instr.addr.toString(10);
    addr = "    ".slice(addr.length - 1) + addr;
    var op = instr.op.map(function(op1) {
      var str = op1.toString(16);
      return "000".slice(str.length - 1) + str;
    }).join(" ");
    op += "     ".slice(op.length - 4);
    return (instr.id ? instr.id + ":\n" : "") + (forAssembler ? "    " : addr + "  " + op + "  ") + instr.str + (instr.addr === bytecode[0] - 2 || instr.instr === A3a.vm.bc.stop || instr.instr === A3a.vm.bc.ret ? "\n" : "");
  }).join("\n");
  if (listing.length === 0) {
    listing = "; empty";
  }
  return listing;
};
A3a.vm.dis.instruction;
A3a.vm.disToMixedListing = function(src, bytecode, sourceToBCMapping, loose) {
  var dis = A3a.vm.dis(bytecode, true);
  var lines = src.split("\n");
  var sortedMapping = sourceToBCMapping.slice().sort(function(a, b) {
    return a.addr - b.addr;
  });
  sortedMapping = [new A3a.Compiler.SourceToBCMapping(-1, -1, -1, 0)].concat(sortedMapping).concat(new A3a.Compiler.SourceToBCMapping(Infinity, Infinity, Infinity, bytecode.length));
  var listing = "";
  function add(k) {
    var addr = dis[k].addr.toString(10);
    addr = "    ".slice(addr.length - 1) + addr;
    var op = dis[k].op.map(function(op1) {
      var str = op1.toString(16);
      return "000".slice(str.length - 1) + str;
    }).join(" ");
    op += "     ".slice(op.length - 4);
    listing += (dis[k].id ? dis[k].id + ":\n" : "") + addr + "  " + op + "  " + dis[k].str + "\n";
    dis.splice(k, 1);
  }
  for (var iLine = 0; iLine < lines.length; iLine++) {
    var someCode = false;
    for (var i = 0; i < sortedMapping.length - 1;) {
      if (sortedMapping[i].line <= iLine) {
        for (var j = sortedMapping[i].addr; j < sortedMapping[i + 1].addr; j++) {
          for (var k = 0; k < dis.length;) {
            if (dis[k].addr === j) {
              if (loose && !someCode && iLine > 0) {
                listing += "\n";
              }
              someCode = true;
              add(k);
            } else {
              k++;
            }
          }
        }
        sortedMapping.splice(i, 1);
      } else {
        i++;
      }
    }
    if (loose && someCode) {
      listing += "\n";
    }
    listing += lines[iLine] + "\n";
  }
  for (var k = 0; k < dis.length;) {
    add(k);
  }
  return listing;
};
A3a.nodeDescr;
A3a.macroFunctionDef;
A3a.A3aNode = function(descr) {
  this.name = descr["name"];
  this.maxVarSize = descr["maxVarSize"];
  this.variables = [];
  this.varSize = 0;
  for (var i = 0; i < descr["variables"].length; i++) {
    var d = new A3a.Compiler.VariableDescr(descr["variables"][i]["name"], descr["variables"][i]["size"], [1], this.varSize, A3a.Compiler.resultType.number);
    this.variables.push(d);
    this.varSize += descr["variables"][i]["size"];
  }
  this.nativeFunctions = descr["nativeFunctions"].map(function(f, i) {
    return {id:i, name:f["name"], args:f["args"]};
  });
  this.localEvents = descr["localEvents"].map(function(e) {
    return {name:e["name"]};
  });
};
A3a.A3aNode.prototype.findNativeFunction = function(name) {
  for (var i = 0; i < this.nativeFunctions.length; i++) {
    if (this.nativeFunctions[i].name === name) {
      return this.nativeFunctions[i];
    }
  }
  return null;
};
A3a.A3aNode.prototype.findVariable = function(name) {
  for (var i = 0; i < this.variables.length; i++) {
    if (this.variables[i].name === name) {
      return this.variables[i];
    }
  }
  return null;
};
A3a.A3aNode.prototype.eventNameToId = function(name) {
  if (name === "init") {
    return 65535;
  }
  for (var i = 0; i < this.localEvents.length; i++) {
    if (this.localEvents[i].name === name) {
      return 65534 - i;
    }
  }
  throw "unknown local event " + name;
};
A3a.Compiler = function(asebaNode, src) {
  this.operators = A3a.Compiler.operators;
  this.floatLiteral = false;
  this.asebaNode = asebaNode;
  this.src = src;
  this.len = src.length;
  this.i = 0;
  this.line = 1;
  this.col = 0;
  this.tokens = [];
  this.tokenIndex = 0;
  this.statements = [];
  this.tree = null;
  this.startupBytecode = [];
  this.functionLib = [];
  this.cst = {};
  this.declaredVariables = [];
  this.branches = [];
  this.tempVariableBase0 = this.asebaNode.maxVarSize;
  this.tempVariableBase = this.tempVariableBase0;
  this.inSubDefinition = false;
  this.bcAddr = 0;
  this.sourceToBCMapping = [];
};
A3a.Compiler.VariableDescr = function(name, size, dims, offset, resultType) {
  this.name = name;
  this.size = size;
  this.dims = dims;
  this.offset = offset;
  this.resultType = resultType;
};
A3a.Compiler.VariableDescr.prototype.generateA3aBCForLoad = function(compiler, offset) {
  return [A3a.vm.bc.load << 12 | this.offset + (offset || 0)];
};
A3a.Compiler.VariableDescr.prototype.generateA3aBCForStore = function(compiler, offset) {
  return [A3a.vm.bc.store << 12 | this.offset + (offset || 0)];
};
A3a.Compiler.VariableDescr.prototype.generateA3aBCForLoadIndirect = function(compiler) {
  return [A3a.vm.bc.loadIndirect << 12 | this.offset, this.size];
};
A3a.Compiler.VariableDescr.prototype.generateA3aBCForStoreIndirect = function(compiler) {
  return [A3a.vm.bc.storeIndirect << 12 | this.offset, this.size];
};
A3a.Compiler.prototype.skipBlanks = function() {
  while (this.i < this.len) {
    if (this.src[this.i] === " " || this.src[this.i] === "\t") {
      this.i++;
      this.col++;
    } else {
      if (this.src[this.i] === "\n") {
        this.i++;
        this.col = 0;
        this.line++;
      } else {
        if (this.src[this.i] === "\r") {
          this.i++;
        } else {
          if (this.src.slice(this.i, this.i + 2) === "#*") {
            this.i += 2;
            this.col += 2;
            while (this.i < this.len && this.src.slice(this.i - 2, this.i) !== "*#") {
              if (this.src[this.i] === "\n") {
                this.col = 0;
                this.line++;
              } else {
                if (this.src[this.i] !== "\r") {
                  this.col++;
                }
              }
              this.i++;
            }
          } else {
            if (this.src[this.i] === "#") {
              while (this.i < this.len && this.src[this.i] !== "\n") {
                this.i++;
                this.col++;
              }
            } else {
              break;
            }
          }
        }
      }
    }
  }
};
A3a.Compiler.prototype.resetJumpResolution = function() {
  this.branches = [];
};
A3a.Compiler.prototype.prepareJump = function(bytecode) {
  var addr = bytecode.length - 1;
  this.branches.push(addr);
};
A3a.Compiler.prototype.finalizeJump = function(bytecode, target) {
  if (this.branches.length === 0) {
    throw "internal";
  }
  if (target === undefined) {
    target = bytecode.length;
  }
  var i = this.branches.pop();
  if (bytecode[i] === A3a.vm.bc.jump << 12) {
    bytecode[i] += target - i & 4095;
  } else {
    bytecode[i] = target - i + 1 & 65535;
  }
};
A3a.Compiler.prototype.addConstant = function(name, val, resultType) {
  this.cst[name] = {val:val, resultType:resultType};
};
A3a.Compiler.prototype.hasConstant = function(name) {
  return this.cst.hasOwnProperty(name);
};
A3a.Compiler.prototype.getConstant = function(name) {
  return this.cst[name];
};
A3a.Compiler.prototype.addVariable = function(name, size, dims, offset, resultType) {
  if (this.hasVariable(name)) {
    throw 'duplicate variable declaration "' + name + '"';
  }
  this.declaredVariables.push(new A3a.Compiler.VariableDescr(name, size, dims, offset, resultType));
};
A3a.Compiler.prototype.hasVariable = function(name) {
  for (var i = 0; i < this.declaredVariables.length; i++) {
    if (this.declaredVariables[i].name === name) {
      return true;
    }
  }
  for (var i = 0; i < this.asebaNode.variables.length; i++) {
    if (this.asebaNode.variables[i].name === name) {
      return true;
    }
  }
  return false;
};
A3a.Compiler.prototype.getVariable = function(nodeVar) {
  for (var i = this.declaredVariables.length - 1; i >= 0; i--) {
    if (this.declaredVariables[i].name === nodeVar.name) {
      return this.declaredVariables[i];
    }
  }
  for (var i = 0; i < this.asebaNode.variables.length; i++) {
    if (this.asebaNode.variables[i].name === nodeVar.name) {
      return this.asebaNode.variables[i];
    }
  }
  throw "unknown variable " + nodeVar.name + " " + nodeVar.head.posString();
};
A3a.Compiler.prototype.getMacroFunctionDef = function(name) {
  for (var i = 0; i < this.functionLib.length; i++) {
    if (this.functionLib[i].name === name) {
      return this.functionLib[i];
    }
  }
  return null;
};
A3a.Compiler.prototype.allocPermanentAuxVariable = function(size) {
  this.tempVariableBase0 = this.asebaNode.maxVarSize - size;
  this.tempVariableBase = this.tempVariableBase0;
  return this.tempVariableBase0;
};
A3a.Compiler.prototype.releaseTempVariables = function() {
  this.tempVariableBase = this.tempVariableBase0;
};
A3a.Compiler.prototype.allocTempVariable = function(size) {
  this.tempVariableBase -= size;
  return this.tempVariableBase;
};
A3a.Compiler.prototype.generateA3aBCForTypeConversion = function(fromType, toType) {
  return [];
};
A3a.Compiler.keywords = ["==", "!=", "<=", ">=", "|=", "^=", "&=", "*=", "/=", "%=", "+=", "-=", "<<=", ">>=", "++", "--", "(", ")", "[", "]", "-", "~", "*", "/", "%", "+", "<<", ">>", "&", "^", "|", ">", "<", "=", ",", ":", "abs", "and", "callsub", "call", "const", "do", "elseif", "else", "emit", "end", "for", "if", "in", "not", "onevent", "or", "return", "step", "sub", "then", "var", "when", "while"];
A3a.Compiler.TokenBase = function(srcIndex, srcLine, srcCol) {
  this.srcIndex = srcIndex;
  this.srcLine = srcLine;
  this.srcCol = srcCol;
};
A3a.Compiler.TokenBase.prototype.posString = function() {
  return "line " + this.srcLine.toString() + " col " + this.srcCol.toString();
};
A3a.Compiler.TokenNumber = function(srcIndex, srcLine, srcCol, n) {
  A3a.Compiler.TokenBase.call(this, srcIndex, srcLine, srcCol);
  this.n = n;
};
A3a.Compiler.TokenNumber.prototype = Object.create(A3a.Compiler.TokenBase.prototype);
A3a.Compiler.TokenNumber.prototype.constructor = A3a.Compiler.TokenNumber;
A3a.Compiler.TokenFloat = function(srcIndex, srcLine, srcCol, n) {
  A3a.Compiler.TokenBase.call(this, srcIndex, srcLine, srcCol);
  this.n = n;
};
A3a.Compiler.TokenFloat.prototype = Object.create(A3a.Compiler.TokenNumber.prototype);
A3a.Compiler.TokenFloat.prototype.constructor = A3a.Compiler.TokenFloat;
A3a.Compiler.TokenName = function(srcIndex, srcLine, srcCol, name) {
  A3a.Compiler.TokenBase.call(this, srcIndex, srcLine, srcCol);
  this.name = name;
};
A3a.Compiler.TokenName.prototype = Object.create(A3a.Compiler.TokenBase.prototype);
A3a.Compiler.TokenName.prototype.constructor = A3a.Compiler.TokenName;
A3a.Compiler.TokenKeyword = function(srcIndex, srcLine, srcCol, name) {
  A3a.Compiler.TokenBase.call(this, srcIndex, srcLine, srcCol);
  this.name = name;
};
A3a.Compiler.TokenKeyword.prototype = Object.create(A3a.Compiler.TokenBase.prototype);
A3a.Compiler.TokenKeyword.prototype.constructor = A3a.Compiler.TokenKeyword;
A3a.Compiler.prototype.nextToken = function(keywords) {
  keywords = keywords || A3a.Compiler.keywords;
  this.skipBlanks();
  if (this.i >= this.len) {
    return null;
  }
  var tk = null;
  for (var i = 0; i < keywords.length; i++) {
    var kwLen = keywords[i].length;
    if (this.src.slice(this.i, this.i + kwLen) === keywords[i] && !/[a-zA-Z0-9_.]{2}/.test(this.src.slice(this.i + kwLen - 1, this.i + kwLen + 1))) {
      tk = new A3a.Compiler.TokenKeyword(this.i, this.line, this.col, keywords[i]);
      this.i += kwLen;
      this.col += kwLen;
      return tk;
    }
  }
  var len = 0;
  var num;
  if (this.src.slice(this.i, this.i + 2) === "0x") {
    this.i += 2;
    while (this.i + len < this.len && /[0-9a-fA-F]/.test(this.src[this.i + len])) {
      len++;
    }
    if (len === 0) {
      throw "hexadecimal number syntax error";
    }
    num = parseInt(this.src.slice(this.i, this.i + len), 16);
    tk = new A3a.Compiler.TokenNumber(this.i, this.line, this.col, num);
    this.i += len;
    this.col += 2 + len;
  } else {
    if (this.src.slice(this.i, this.i + 2) === "0b") {
      this.i += 2;
      while (this.i + len < this.len && /[01]/.test(this.src[this.i + len])) {
        len++;
      }
      if (len === 0) {
        throw "binary number syntax error";
      }
      num = parseInt(this.src.slice(this.i, this.i + len), 2);
      tk = new A3a.Compiler.TokenNumber(this.i, this.line, this.col, num);
      this.i += len;
      this.col += 2 + len;
    } else {
      if (/[0-9]/.test(this.src[this.i])) {
        while (this.i + len < this.len && /[0-9]/.test(this.src[this.i + len])) {
          len++;
        }
        if (this.floatLiteral && this.i + len < this.len && this.src[this.i + len] === ".") {
          for (len++; this.i + len < this.len && /[0-9]/.test(this.src[this.i + len]); len++) {
          }
          num = parseFloat(this.src.slice(this.i, this.i + len));
          tk = new A3a.Compiler.TokenFloat(this.i, this.line, this.col, num);
        } else {
          num = parseInt(this.src.slice(this.i, this.i + len), 10);
          tk = new A3a.Compiler.TokenNumber(this.i, this.line, this.col, num);
        }
        this.i += len;
        this.col += len;
      } else {
        if (/[a-zA-Z_]/.test(this.src[this.i])) {
          while (this.i + len < this.len && /[a-zA-Z0-9_.]/.test(this.src[this.i + len])) {
            len++;
          }
          if (len === 0) {
            throw "name syntax error";
          }
          var str = this.src.slice(this.i, this.i + len);
          tk = new A3a.Compiler.TokenName(this.i, this.line, this.col, str);
          this.i += len;
          this.col += len;
        } else {
          throw "syntax error line " + this.line.toString() + " col " + this.col.toString();
        }
      }
    }
  }
  return tk;
};
A3a.Compiler.prototype.buildTokenArray = function(keywords) {
  while (true) {
    var tk = this.nextToken(keywords);
    if (tk === null) {
      break;
    }
    this.tokens.push(tk);
  }
};
A3a.Compiler.SourceToBCMapping = function(srcOffset, line, col, addr) {
  this.srcOffset = srcOffset;
  this.line = line;
  this.col = col;
  this.addr = addr;
};
A3a.Compiler.SourceToBCMapping.lineToBCAddress = function(m, line) {
  for (var i = 0; i < m.length; i++) {
    if (m[i].line >= line) {
      return i;
    }
  }
  return -1;
};
A3a.Compiler.prototype.addSourceToBCMapping = function(node, bcAddr) {
  var token = node.head || node.children[0] && node.children[0].head;
  if (token) {
    this.sourceToBCMapping.push(new A3a.Compiler.SourceToBCMapping(token.srcIndex, token.srcLine, token.srcCol, bcAddr === undefined ? this.bcAddr : bcAddr));
  }
};
A3a.Compiler.Node = function(head) {
  this.head = head;
  this.children = [];
  this.valueSize = 0;
  this.resultType = A3a.Compiler.resultType.undef;
  this.shouldProduceValue = true;
};
A3a.Compiler.Node.optimizeNodeArray = function(nodeArray, compiler) {
  for (var i = 0; i < nodeArray.length; i++) {
    nodeArray[i] = nodeArray[i].optimize(compiler);
  }
};
A3a.Compiler.Node.prototype.optimize = function(compiler) {
  return this;
};
A3a.Compiler.Node.prototype.resolveArraySize = function(compiler) {
  this.children.forEach(function(node) {
    node.resolveArraySize(compiler);
  });
};
A3a.Compiler.Node.prototype.explodeArrayNode = function(compiler) {
  this.resolveArraySize(compiler);
  for (var i = 0; i < this.children.length; i++) {
    this.children[i] = this.children[i].explodeArrayNode(compiler);
  }
  return this;
};
A3a.Compiler.NodeNumber = function(numToken, n) {
  A3a.Compiler.Node.call(this, numToken);
  this.n = n === undefined ? this.head.n : n;
  this.resultType = A3a.Compiler.resultType.number;
};
A3a.Compiler.NodeNumber.prototype = Object.create(A3a.Compiler.Node.prototype);
A3a.Compiler.NodeNumber.prototype.constructor = A3a.Compiler.NodeNumber;
A3a.Compiler.NodeNumber.prototype.resolveArraySize = function(compiler) {
  this.valueSize = 1;
};
A3a.Compiler.NodeNumber.toS16 = function(n) {
  n &= 65535;
  return n >= 32768 ? n - 65536 : n;
};
A3a.Compiler.NodeFixed = function(floatToken, f) {
  A3a.Compiler.NodeNumber.call(this, floatToken, f);
  this.resultType = A3a.Compiler.resultType.fixed;
};
A3a.Compiler.NodeFixed.prototype = Object.create(A3a.Compiler.NodeNumber.prototype);
A3a.Compiler.NodeFixed.prototype.constructor = A3a.Compiler.NodeFixed;
A3a.Compiler.NodeVar = function(nameToken) {
  A3a.Compiler.Node.call(this, nameToken);
  this.name = nameToken.name;
  this.dummyPlaceholder = false;
};
A3a.Compiler.NodeVar.prototype = Object.create(A3a.Compiler.Node.prototype);
A3a.Compiler.NodeVar.prototype.constructor = A3a.Compiler.NodeVar;
A3a.Compiler.NodeVar.prototype.resolveArraySize = function(compiler) {
  if (compiler.hasConstant(this.name)) {
    this.valueSize = 1;
    this.resultType = compiler.getConstant(this.name).resultType;
  } else {
    var varDescr = compiler.getVariable(this);
    this.valueSize = varDescr.size;
    this.resultType = varDescr.resultType;
  }
};
A3a.Compiler.NodeVar.prototype.optimize = function(compiler) {
  return compiler.hasConstant(this.name) ? compiler.getConstant(this.name).resultType === A3a.Compiler.resultType.fixed ? new A3a.Compiler.NodeFixed(this.head, compiler.getConstant(this.name).val) : new A3a.Compiler.NodeNumber(this.head, compiler.getConstant(this.name).val) : this;
};
A3a.Compiler.NodeVar.prototype.makeDummyPlaceholder = function() {
  var node = new A3a.Compiler.NodeVar(this.head);
  node.resultType = this.resultType;
  node.dummyPlaceholder = true;
  return node;
};
A3a.Compiler.resultType = {undef:"?", void:"v", number:"n", boolean:"b", fixed:"fx"};
A3a.Compiler.NodeFun = function(funToken, type, opDescr, args) {
  A3a.Compiler.Node.call(this, funToken);
  this.type = type;
  this.resultType = opDescr ? opDescr.resultType : A3a.Compiler.resultType.undef;
  this.operatorDescr = opDescr;
  this.children = args || [];
};
A3a.Compiler.NodeFun.prototype = Object.create(A3a.Compiler.Node.prototype);
A3a.Compiler.NodeFun.prototype.constructor = A3a.Compiler.NodeFun;
A3a.Compiler.NodeFun.prototype.resolveArraySize = function(compiler) {
  A3a.Compiler.Node.prototype.resolveArraySize.call(this, compiler);
  var n = 1;
  for (var i = 0; i < this.children.length; i++) {
    if (n === 1) {
      n = this.children[i].valueSize;
    } else {
      if (this.children[i].valueSize !== 1 && this.children[i].valueSize !== n) {
        throw "incompatible sizes " + this.head.posString();
      }
    }
  }
  this.valueSize = n;
  if (this.operatorDescr && this.operatorDescr.resultTypePropagate) {
    this.resultType = this.operatorDescr.resultTypePropagate(compiler, this, this.children.map(function(c) {
      return c.resultType;
    }));
  }
};
A3a.Compiler.NodeFun.prototype.optimize = function(compiler) {
  this.children = this.children.map(function(node) {
    return node.optimize(compiler);
  });
  return this.operatorDescr && this.operatorDescr.optimize ? this.operatorDescr.optimize(this, compiler) : this;
};
A3a.Compiler.NodeFun.prototype.explodeArrayNode = function(compiler) {
  var self = A3a.Compiler.Node.prototype.explodeArrayNode.call(this, compiler);
  if (self.type === A3a.Compiler.opType.infix && self.operatorDescr.priority === A3a.Compiler.opPriority.assignment && (self.children[1] instanceof A3a.Compiler.NodeArray || self.children[1] instanceof A3a.Compiler.NodeVar && self.children[1].valueSize !== 1)) {
    var lhs = self.children[0];
    if (!(lhs instanceof A3a.Compiler.NodeVar) || self.shouldProduceValue) {
      throw "bad array assignment " + self.head.posString();
    }
    var nodeArray = self.children[1];
    var st = new A3a.Compiler.NodeStatementSequence(self.head);
    for (var i = 0; i < nodeArray.valueSize; i++) {
      var lhs1 = lhs;
      if (nodeArray.valueSize > 1) {
        lhs1 = new A3a.Compiler.NodeIndexing(lhs.head, [new A3a.Compiler.NodeNumber(lhs.head, i)]);
        lhs1.resultType = lhs.resultType;
      }
      var rhs1;
      if (nodeArray instanceof A3a.Compiler.NodeArray) {
        rhs1 = nodeArray.children[i];
      } else {
        rhs1 = new A3a.Compiler.NodeIndexing(nodeArray.head, [new A3a.Compiler.NodeNumber(lhs.head, i)]);
        rhs1.resultType = nodeArray.resultType;
      }
      var a = new A3a.Compiler.NodeFun(self.head, self.type, self.operatorDescr, [lhs1, rhs1]);
      a.resultType = lhs.resultType;
      a.shouldProduceValue = false;
      a = a.optimize(compiler);
      st.children.push(a);
    }
    return st;
  }
  return self;
};
A3a.Compiler.NodeIndexing = function(nameToken, indices) {
  A3a.Compiler.NodeVar.call(this, nameToken);
  this.children = indices;
};
A3a.Compiler.NodeIndexing.prototype = Object.create(A3a.Compiler.NodeVar.prototype);
A3a.Compiler.NodeIndexing.prototype.constructor = A3a.Compiler.NodeIndexing;
A3a.Compiler.NodeIndexing.prototype.resolveArraySize = function(compiler) {
  A3a.Compiler.Node.prototype.resolveArraySize.call(this, compiler);
  var varDescr = compiler.getVariable(this);
  this.valueSize = 1;
  this.resultType = varDescr.resultType;
};
A3a.Compiler.NodeIndexing.prototype.areIndicesConstant = function() {
  for (var i = 0; i < this.children.length; i++) {
    if (!(this.children[i] instanceof A3a.Compiler.NodeNumber)) {
      return false;
    }
  }
  return true;
};
A3a.Compiler.NodeIndexing.prototype.constantIndicesToSingleIndex = function(variable) {
  var ix = 0;
  var m = 1;
  for (var i = 0; i < this.children.length; i++) {
    if (!(this.children[i] instanceof A3a.Compiler.NodeNumber)) {
      throw "internal";
    }
    ix += m * this.children[i].n;
    m *= variable.dims[i];
  }
  return ix;
};
A3a.Compiler.NodeArray = function(bracketToken) {
  A3a.Compiler.Node.call(this, bracketToken);
  this.dims = [];
};
A3a.Compiler.NodeArray.prototype = Object.create(A3a.Compiler.Node.prototype);
A3a.Compiler.NodeArray.prototype.constructor = A3a.Compiler.NodeArray;
A3a.Compiler.NodeArray.prototype.resolveArraySize = function(compiler) {
  this.valueSize = this.children.length;
  if (this.children[0]) {
    this.children.forEach(function(node) {
      node.resolveArraySize(compiler);
    });
    this.resultType = this.children[0].resultType;
  }
};
A3a.Compiler.NodeArray.prototype.addItem = function(node) {
  this.children.push(node);
};
A3a.Compiler.NodeStatement = function(head, type) {
  A3a.Compiler.Node.call(this, head);
  this.type = type || A3a.Compiler.NodeStatement.type.plain;
  this.implicitEnd = false;
  this.contexts = [null];
};
A3a.Compiler.NodeStatement.prototype = Object.create(A3a.Compiler.Node.prototype);
A3a.Compiler.NodeStatement.prototype.constructor = A3a.Compiler.NodeStatement;
A3a.Compiler.NodeStatement.prototype.newBlock = function() {
  throw "internal";
};
A3a.Compiler.NodeStatement.prototype.processBeginStatement = function(compiler) {
};
A3a.Compiler.NodeStatement.prototype.processMiddleStatement = function(st) {
  throw "internal";
};
A3a.Compiler.NodeStatement.prototype.processEndStatement = function(st) {
};
A3a.Compiler.NodeStatement.prototype.postProcess = function(compiler, st) {
};
A3a.Compiler.NodeStatement.prototype.prepareGenerateA3aBC = function(compiler) {
  compiler.releaseTempVariables();
  compiler.addSourceToBCMapping(this);
};
A3a.Compiler.NodeStatement.type = {undef:0, plain:1, blockHeader:2, begin:3, middle:4, end:5};
A3a.Compiler.CodePlaceholder = function(compiler, statement) {
  this.compiler = compiler;
  this.statement = statement;
};
A3a.Compiler.CodePlaceholder.prototype.generateA3aBC = function(addr) {
  return "internal";
};
A3a.Compiler.NodeStatementOnevent = function(head, eventName) {
  A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.blockHeader);
  this.eventName = eventName;
};
A3a.Compiler.NodeStatementOnevent.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementOnevent.prototype.constructor = A3a.Compiler.NodeStatementOnevent;
A3a.Compiler.NodeStatementOnevent.prototype.optimize = function(compiler) {
  A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
  return this;
};
A3a.Compiler.NodeStatementOnevent.prototype.newBlock = function() {
  return this;
};
A3a.Compiler.NodeStatementSub = function(head, subName) {
  A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.blockHeader);
  this.subName = subName;
};
A3a.Compiler.NodeStatementSub.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementSub.prototype.constructor = A3a.Compiler.NodeStatementSub;
A3a.Compiler.NodeStatementSub.prototype.optimize = function(compiler) {
  A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
  return this;
};
A3a.Compiler.NodeStatementSub.prototype.newBlock = function() {
  return this;
};
A3a.Compiler.NodeStatementReturn = function(head) {
  A3a.Compiler.NodeStatement.call(this, head);
};
A3a.Compiler.NodeStatementReturn.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementReturn.prototype.constructor = A3a.Compiler.NodeStatementReturn;
A3a.Compiler.NodeStatementConst = function(head, constName, val) {
  A3a.Compiler.NodeStatement.call(this, head);
  this.constName = constName;
  this.val = val;
  this.resultType = val.resultType;
};
A3a.Compiler.NodeStatementConst.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementConst.prototype.constructor = A3a.Compiler.NodeStatementConst;
A3a.Compiler.NodeStatementVar = function(head, varToken, resultType, sizeExpr, initialization) {
  A3a.Compiler.NodeStatement.call(this, head);
  this.varName = varToken.name;
  this.resultType = resultType;
  this.sizeExpr = sizeExpr || null;
  this.size = -1;
  this.dims = [];
  this.offset = -1;
  if (initialization) {
    this.children.push(initialization);
  }
};
A3a.Compiler.NodeStatementVar.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementVar.prototype.constructor = A3a.Compiler.NodeStatementVar;
A3a.Compiler.NodeStatementVar.prototype.resolveArraySize = function(compiler) {
  if (this.children[0]) {
    A3a.Compiler.Node.prototype.resolveArraySize.call(this, compiler);
    this.resultType = this.children[0].children[1].resultType;
  }
};
A3a.Compiler.NodeStatementVar.prototype.optimize = function(compiler) {
  A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
  return this;
};
A3a.Compiler.NodeStatementExpression = function(expr) {
  A3a.Compiler.NodeStatement.call(this, expr.head);
  this.children.push(expr);
};
A3a.Compiler.NodeStatementExpression.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementExpression.prototype.constructor = A3a.Compiler.NodeStatementExpression;
A3a.Compiler.NodeStatementExpression.prototype.optimize = function(compiler) {
  A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
  return this;
};
A3a.Compiler.NodeStatementSequence = function(head) {
  A3a.Compiler.NodeStatement.call(this, head);
};
A3a.Compiler.NodeStatementSequence.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementSequence.prototype.constructor = A3a.Compiler.NodeStatementSequence;
A3a.Compiler.NodeStatementSequence.prototype.optimize = function(compiler) {
  A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
  return this;
};
A3a.Compiler.NodeStatementIf = function(head, expr) {
  A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
  this.conditions = [expr];
  this.conditionalCode = [];
  this.linkedStatements = [];
};
A3a.Compiler.NodeStatementIf.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementIf.prototype.constructor = A3a.Compiler.NodeStatementIf;
A3a.Compiler.NodeStatementIf.prototype.resolveArraySize = function(compiler) {
  this.conditions.forEach(function(node) {
    node.resolveArraySize(compiler);
  });
  this.conditionalCode.forEach(function(statements) {
    statements.forEach(function(statement) {
      statement.resolveArraySize(compiler);
    });
  });
};
A3a.Compiler.NodeStatementIf.prototype.optimize = function(compiler) {
  A3a.Compiler.Node.optimizeNodeArray(this.conditions, compiler);
  this.conditionalCode.forEach(function(a) {
    A3a.Compiler.Node.optimizeNodeArray(a, compiler);
  });
  return this;
};
A3a.Compiler.NodeStatementIf.prototype.processMiddleStatement = function(st) {
  if (this.conditionalCode.length >= this.conditions.length) {
    throw "multiple else " + st.head.posString();
  }
  if (st instanceof A3a.Compiler.NodeStatementElseif) {
    this.conditions.push(st.condition);
  }
  this.conditionalCode.push(this.children);
  this.linkedStatements.push(st);
  this.children = [];
  this.contexts.push(st.contexts[0]);
};
A3a.Compiler.NodeStatementIf.prototype.removeUnusedBlocks = function() {
  for (var i = 0; i < this.conditions.length;) {
    if (this.conditions[i] instanceof A3a.Compiler.NodeNumber) {
      if (this.conditions[i].n === 0) {
        this.conditions.splice(i, 1);
        this.conditionalCode.splice(i, 1);
      } else {
        this.conditions.splice(i);
        this.conditionalCode.splice(i + 1);
        break;
      }
    } else {
      i++;
    }
  }
};
A3a.Compiler.NodeStatementIf.prototype.postProcess = function(compiler, st) {
  this.conditionalCode.push(this.children);
  this.children = [];
  this.linkedStatements.push(st);
  this.removeUnusedBlocks();
};
A3a.Compiler.NodeStatementElseif = function(head, expr) {
  A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.middle);
  this.condition = expr;
};
A3a.Compiler.NodeStatementElseif.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementElseif.prototype.constructor = A3a.Compiler.NodeStatementElseif;
A3a.Compiler.NodeStatementElseif.prototype.optimize = function(compiler) {
  this.condition = this.condition.optimize(compiler);
  A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
  return this;
};
A3a.Compiler.NodeStatementElse = function(head) {
  A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.middle);
};
A3a.Compiler.NodeStatementElse.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementElse.prototype.constructor = A3a.Compiler.NodeStatementElse;
A3a.Compiler.NodeStatementWhen = function(head, expr) {
  A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
  this.condition = expr;
  this.linkedStatements = [];
};
A3a.Compiler.NodeStatementWhen.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementWhen.prototype.constructor = A3a.Compiler.NodeStatementWhen;
A3a.Compiler.NodeStatementWhen.prototype.resolveArraySize = function(compiler) {
  A3a.Compiler.Node.prototype.resolveArraySize.call(this, compiler);
  this.condition.resolveArraySize(compiler);
};
A3a.Compiler.NodeStatementWhen.prototype.optimize = function(compiler) {
  this.condition = this.condition.optimize(compiler);
  A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
  return this;
};
A3a.Compiler.NodeStatementWhile = function(head, expr) {
  A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
  this.condition = expr;
  this.linkedStatements = [];
};
A3a.Compiler.NodeStatementWhile.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementWhile.prototype.constructor = A3a.Compiler.NodeStatementWhile;
A3a.Compiler.NodeStatementWhile.prototype.resolveArraySize = function(compiler) {
  A3a.Compiler.Node.prototype.resolveArraySize.call(this, compiler);
  this.condition.resolveArraySize(compiler);
};
A3a.Compiler.NodeStatementWhile.prototype.optimize = function(compiler) {
  this.condition = this.condition.optimize(compiler);
  A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
  return this;
};
A3a.Compiler.NodeStatementWhile.prototype.postProcess = function(compiler, st) {
  if (this.condition instanceof A3a.Compiler.NodeNumber) {
    if (this.condition.n === 0) {
      this.children = [];
    }
    this.condition = null;
  }
  this.linkedStatements.push(st);
};
A3a.Compiler.NodeStatementFor = function(head, varToken, from, to, step) {
  A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
  this.nodeVar = new A3a.Compiler.NodeVar(varToken);
  this.children.push(from);
  this.children.push(to);
  this.step = step || null;
  this.linkedStatements = [];
};
A3a.Compiler.NodeStatementFor.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementFor.prototype.constructor = A3a.Compiler.NodeStatementFor;
A3a.Compiler.NodeStatementFor.prototype.resolveArraySize = function(compiler) {
  A3a.Compiler.Node.prototype.resolveArraySize.call(this, compiler);
  if (this.step) {
    this.step.resolveArraySize(compiler);
  }
};
A3a.Compiler.NodeStatementFor.prototype.optimize = function(compiler) {
  if (this.step) {
    this.step = this.step.optimize(compiler);
  }
  A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
  return this;
};
A3a.Compiler.NodeStatementFor.prototype.postProcess = function(compiler, st) {
  this.linkedStatements.push(st);
};
A3a.Compiler.NodeStatementCall = function(funToken, name, args) {
  A3a.Compiler.NodeStatement.call(this, funToken);
  this.name = name;
  this.children = args;
};
A3a.Compiler.NodeStatementCall.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementCall.prototype.constructor = A3a.Compiler.NodeStatementCall;
A3a.Compiler.NodeStatementCall.prototype.optimize = function(compiler) {
  A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
  return this;
};
A3a.Compiler.NodeStatementCallSub = function(funToken, name) {
  A3a.Compiler.NodeStatement.call(this, funToken);
  this.name = name;
};
A3a.Compiler.NodeStatementCallSub.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementCallSub.prototype.constructor = A3a.Compiler.NodeStatementCallSub;
A3a.Compiler.NodeStatementEnd = function(head) {
  A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.end);
};
A3a.Compiler.NodeStatementEnd.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementEnd.prototype.constructor = A3a.Compiler.NodeStatementEnd;
A3a.Compiler.opPriority = {constant:200, pre:150, mult:140, add:130, shift:120, binand:110, binxor:100, binor:90, comp:80, not:70, and:60, or:50, conditionalElse:41, conditional:40, assignment:30, comma:25, par:20, statement:10, unknown:0};
A3a.Compiler.opType = {prefix:0, infix:1, postfix:2, constant:3, fun:4};
A3a.Compiler.OperatorDescr = function(name, type, opt) {
  this.name = name;
  this.type = type;
  this.priority = opt && opt.priority || A3a.Compiler.opPriority.unknown;
  this.resultType = opt && opt.resultType || (opt && opt.resultTypePropagate ? A3a.Compiler.resultType.undef : A3a.Compiler.resultType.number);
  this.resultTypePropagate = opt && opt.resultTypePropagate || null;
  this.optimize = opt && opt.optimize || null;
  this.bytecode = opt && opt.bytecode || [];
  this.generateA3aBC = opt && opt.generateA3aBC || null;
};
A3a.Compiler.optimizeConstFun = function(node, compiler, fun) {
  var args = [];
  for (var i = 0; i < node.children.length; i++) {
    if (!(node.children[i] instanceof A3a.Compiler.NodeNumber)) {
      return node;
    }
    args.push(node.children[i].n);
  }
  return new A3a.Compiler.NodeNumber(node.head, A3a.Compiler.NodeNumber.toS16(fun(args)));
};
A3a.Compiler.operators = [new A3a.Compiler.OperatorDescr("--", A3a.Compiler.opType.prefix, {priority:A3a.Compiler.opPriority.pre}), new A3a.Compiler.OperatorDescr("++", A3a.Compiler.opType.prefix, {priority:A3a.Compiler.opPriority.pre}), new A3a.Compiler.OperatorDescr("-", A3a.Compiler.opType.prefix, {priority:A3a.Compiler.opPriority.pre, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return -args[0];
  });
}, bytecode:[A3a.vm.bc.unaryOpNeg]}), new A3a.Compiler.OperatorDescr("~", A3a.Compiler.opType.prefix, {priority:A3a.Compiler.opPriority.pre, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return ~args[0];
  });
}, bytecode:[A3a.vm.bc.unaryOpBitNot]}), new A3a.Compiler.OperatorDescr("abs", A3a.Compiler.opType.prefix, {priority:A3a.Compiler.opPriority.pre, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return Math.abs(args[0]);
  });
}, bytecode:[A3a.vm.bc.unaryOpAbs]}), new A3a.Compiler.OperatorDescr("not", A3a.Compiler.opType.prefix, {priority:A3a.Compiler.opPriority.pre, resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return args[0] == 0 ? 1 : 0;
  });
}, bytecode:[A3a.vm.bc.smallImmediate << 12 | 0, A3a.vm.bc.binaryOpEqual]}), new A3a.Compiler.OperatorDescr("size", A3a.Compiler.opType.prefix, {priority:A3a.Compiler.opPriority.pre, optimize:function(node, compiler) {
  var size = node.children[0].valueSize > 0 ? node.children[0].valueSize : node.children[0] instanceof A3a.Compiler.NodeArray ? node.children[0].children.length : -1;
  if (size < 0 && node.children[0] instanceof A3a.Compiler.NodeVar) {
    for (var i = compiler.declaredVariables.length - 1; i >= 0; i--) {
      if (compiler.declaredVariables[i].name === node.children[0].name) {
        size = compiler.declaredVariables[i].size;
        break;
      }
    }
  }
  return size > 0 ? new A3a.Compiler.NodeNumber(node.head, size) : node;
}}), new A3a.Compiler.OperatorDescr("--", A3a.Compiler.opType.postfix, {priority:A3a.Compiler.opPriority.pre}), new A3a.Compiler.OperatorDescr("++", A3a.Compiler.opType.postfix, {priority:A3a.Compiler.opPriority.pre}), new A3a.Compiler.OperatorDescr("+=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment}), new A3a.Compiler.OperatorDescr("-=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment}), new A3a.Compiler.OperatorDescr("*=", A3a.Compiler.opType.infix, 
{priority:A3a.Compiler.opPriority.assignment}), new A3a.Compiler.OperatorDescr("/=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment}), new A3a.Compiler.OperatorDescr("%=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment}), new A3a.Compiler.OperatorDescr("<<=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment}), new A3a.Compiler.OperatorDescr(">>=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment}), new A3a.Compiler.OperatorDescr("&=", 
A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment}), new A3a.Compiler.OperatorDescr("|=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment}), new A3a.Compiler.OperatorDescr("^=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment}), new A3a.Compiler.OperatorDescr("*", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.mult, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return args[0] * args[1];
  });
}, bytecode:[A3a.vm.bc.binaryOpMult]}), new A3a.Compiler.OperatorDescr("/", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.mult, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return Math.trunc(args[0] / args[1]);
  });
}, bytecode:[A3a.vm.bc.binaryOpDiv]}), new A3a.Compiler.OperatorDescr("%", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.mult, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return args[0] % args[1];
  });
}, bytecode:[A3a.vm.bc.binaryOpMod]}), new A3a.Compiler.OperatorDescr("+", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.add, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return args[0] + args[1];
  });
}, bytecode:[A3a.vm.bc.binaryOpAdd]}), new A3a.Compiler.OperatorDescr("-", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.add, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return args[0] - args[1];
  });
}, bytecode:[A3a.vm.bc.binaryOpSub]}), new A3a.Compiler.OperatorDescr("<<", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.shift, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return args[0] << args[1];
  });
}, bytecode:[A3a.vm.bc.binaryOpShiftLeft]}), new A3a.Compiler.OperatorDescr(">>", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.shift, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return args[0] >> args[1];
  });
}, bytecode:[A3a.vm.bc.binaryOpShiftRight]}), new A3a.Compiler.OperatorDescr("==", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.comp, resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return args[0] === args[1] ? 1 : 0;
  });
}, bytecode:[A3a.vm.bc.binaryOpEqual]}), new A3a.Compiler.OperatorDescr("!=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.comp, resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return args[0] !== args[1] ? 1 : 0;
  });
}, bytecode:[A3a.vm.bc.binaryOpNotEqual]}), new A3a.Compiler.OperatorDescr("<", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.comp, resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return args[0] < args[1] ? 1 : 0;
  });
}, bytecode:[A3a.vm.bc.binaryOpLessThan]}), new A3a.Compiler.OperatorDescr("<=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.comp, resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return args[0] <= args[1] ? 1 : 0;
  });
}, bytecode:[A3a.vm.bc.binaryOpLessEqThan]}), new A3a.Compiler.OperatorDescr(">", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.comp, resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return args[0] > args[1] ? 1 : 0;
  });
}, bytecode:[A3a.vm.bc.binaryOpGreaterThan]}), new A3a.Compiler.OperatorDescr(">=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.comp, resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return args[0] >= args[1] ? 1 : 0;
  });
}, bytecode:[A3a.vm.bc.binaryOpGreaterEqThan]}), new A3a.Compiler.OperatorDescr("&", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.binand, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return args[0] & args[1];
  });
}, bytecode:[A3a.vm.bc.binaryOpBitAnd]}), new A3a.Compiler.OperatorDescr("|", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.binor, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return args[0] | args[1];
  });
}, bytecode:[A3a.vm.bc.binaryOpBitOr]}), new A3a.Compiler.OperatorDescr("^", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.binxor, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return args[0] ^ args[1];
  });
}, bytecode:[A3a.vm.bc.binaryOpBitXor]}), new A3a.Compiler.OperatorDescr("and", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.and, resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return args[0] && args[1] ? 1 : 0;
  });
}, bytecode:[A3a.vm.bc.binaryOpAnd]}), new A3a.Compiler.OperatorDescr("or", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.or, resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.optimizeConstFun(node, compiler, function(args) {
    return args[0] || args[1] ? 1 : 0;
  });
}, bytecode:[A3a.vm.bc.binaryOpOr]}), new A3a.Compiler.OperatorDescr("=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment})];
A3a.Compiler.prototype.getOperator = function(name, type) {
  for (var i = 0; i < this.operators.length; i++) {
    if (this.operators[i].type === type && this.operators[i].name === name) {
      return this.operators[i];
    }
  }
  return null;
};
A3a.Compiler.prototype.checkTokenType = function(offset, cls) {
  return this.tokens[this.tokenIndex + offset] instanceof cls;
};
A3a.Compiler.prototype.checkTokenKeyword = function(offset, name) {
  return this.tokens[this.tokenIndex + offset] instanceof A3a.Compiler.TokenKeyword && this.tokens[this.tokenIndex + offset].name === name;
};
A3a.Compiler.prototype.makeFunCallNode = function(funToken) {
  return new A3a.Compiler.NodeFun(funToken, A3a.Compiler.opType.fun, null);
};
A3a.Compiler.prototype.parseExpression = function(pri) {
  pri = pri || A3a.Compiler.opPriority.statement;
  var node;
  var opDescr;
  if (this.checkTokenType(0, A3a.Compiler.TokenFloat)) {
    node = new A3a.Compiler.NodeFixed(this.tokens[this.tokenIndex]);
    this.tokenIndex++;
  } else {
    if (this.checkTokenType(0, A3a.Compiler.TokenNumber)) {
      node = new A3a.Compiler.NodeNumber(this.tokens[this.tokenIndex]);
      this.tokenIndex++;
    } else {
      if (this.checkTokenType(0, A3a.Compiler.TokenName)) {
        if (this.checkTokenKeyword(1, "(")) {
          node = this.makeFunCallNode(this.tokens[this.tokenIndex]);
          this.tokenIndex++;
          if (this.checkTokenKeyword(1, ")")) {
            this.tokenIndex += 2;
          } else {
            node.children = this.parseArguments();
          }
        } else {
          node = new A3a.Compiler.NodeVar(this.tokens[this.tokenIndex]);
          this.tokenIndex++;
        }
      } else {
        if (this.checkTokenKeyword(0, "(")) {
          this.tokenIndex++;
          node = this.parseExpression(A3a.Compiler.opPriority.par);
          if (!this.checkTokenKeyword(0, ")")) {
            throw "subexpression in expression " + this.tokens[this.tokenIndex].posString();
          }
          this.tokenIndex++;
        } else {
          if (this.checkTokenKeyword(0, "[")) {
            node = new A3a.Compiler.NodeArray(this.tokens[this.tokenIndex]);
            this.tokenIndex++;
            var vec = [];
            var nCols = 0;
            var nRows = 0;
            var nCols1 = 0;
            while (true) {
              vec.push(this.parseExpression(A3a.Compiler.opPriority.comma));
              if (nCols1 === 0) {
                nRows++;
              }
              nCols1++;
              if (nRows > 1 && nCols1 > nCols) {
                throw "non-rectangular array " + this.tokens[this.tokenIndex].posString();
              } else {
                if (nCols1 > nCols) {
                  nCols = nCols1;
                }
              }
              if (this.checkTokenType(0, A3a.Compiler.TokenKeyword)) {
                this.tokenIndex++;
                if (this.tokens[this.tokenIndex - 1].name === "]") {
                  break;
                } else {
                  if (this.tokens[this.tokenIndex - 1].name === ",") {
                    continue;
                  } else {
                    if (this.tokens[this.tokenIndex - 1].name === ";") {
                      nCols = nCols1;
                      nCols1 = 0;
                      continue;
                    }
                  }
                }
              }
              throw "array " + this.tokens[this.tokenIndex - 1].posString();
            }
            A3a.Compiler.NodeArray.dims = [nRows, nCols];
            for (var i = 0; i < nCols; i++) {
              for (var j = 0; j < nRows; j++) {
                node.addItem(vec[j * nCols + i]);
              }
            }
          } else {
            if (this.checkTokenType(0, A3a.Compiler.TokenKeyword) && (opDescr = this.getOperator(this.tokens[this.tokenIndex].name, A3a.Compiler.opType.prefix))) {
              node = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex], A3a.Compiler.opType.prefix, opDescr);
              this.tokenIndex++;
              node.children.push(this.parseExpression(A3a.Compiler.opPriority.pre));
              if (opDescr.resultTypePropagate) {
                node.resultType = opDescr.resultTypePropagate(this, node, [node.children[0].resultType]);
              }
            } else {
              if (this.checkTokenType(0, A3a.Compiler.TokenKeyword) && (opDescr = this.getOperator(this.tokens[this.tokenIndex].name, A3a.Compiler.opType.constant))) {
                node = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex], A3a.Compiler.opType.constant, opDescr);
                this.tokenIndex++;
              } else {
                if (this.tokenIndex < this.tokens.length) {
                  throw "unexpected token in expression " + this.tokens[this.tokenIndex].posString();
                } else {
                  throw "unexpected end of file";
                }
              }
            }
          }
        }
      }
    }
  }
  while (this.checkTokenType(0, A3a.Compiler.TokenKeyword)) {
    opDescr = this.getOperator(this.tokens[this.tokenIndex].name, A3a.Compiler.opType.postfix);
    if (opDescr && opDescr.priority >= pri) {
      node = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex], A3a.Compiler.opType.postfix, opDescr, [node]);
      this.tokenIndex++;
      continue;
    }
    opDescr = this.getOperator(this.tokens[this.tokenIndex].name, A3a.Compiler.opType.infix);
    if (opDescr && (pri === A3a.Compiler.opPriority.assignment ? opDescr.priority >= pri : opDescr.priority > pri)) {
      node = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex], A3a.Compiler.opType.infix, opDescr, [node]);
      this.tokenIndex++;
      node.children.push(this.parseExpression(opDescr.priority));
      if (opDescr.resultTypePropagate) {
        node.resultType = opDescr.resultTypePropagate(this, node, node.children.map(function(c) {
          return c.resultType;
        }));
      }
      continue;
    }
    if (this.tokens[this.tokenIndex].name === "[") {
      if (!(node instanceof A3a.Compiler.NodeVar)) {
        throw "unexpected indexing";
      }
      var resultType = node.resultType;
      var indices = this.parseArguments(true);
      node = new A3a.Compiler.NodeIndexing(node.head, indices);
      node.resultType = resultType;
      continue;
    }
    break;
  }
  return node;
};
A3a.Compiler.prototype.parseArguments = function(brackets) {
  var args = [];
  if (!this.checkTokenKeyword(0, brackets ? "[" : "(")) {
    throw "left " + (brackets ? "bracket" : "parenthesis") + " expected";
  }
  this.tokenIndex++;
  while (true) {
    var expr = this.parseExpression(A3a.Compiler.opPriority.comma);
    args.push(expr);
    if (!this.checkTokenType(0, A3a.Compiler.TokenKeyword)) {
      throw "syntax error in arguments";
    }
    if (this.checkTokenKeyword(0, brackets ? "]" : ")")) {
      this.tokenIndex++;
      break;
    } else {
      if (this.checkTokenKeyword(0, ",")) {
        this.tokenIndex++;
      } else {
        throw "syntax error in arguments " + this.tokens[this.tokenIndex].posString();
      }
    }
  }
  return args;
};
A3a.Compiler.prototype.parseNextStatement = function() {
  var node;
  var expr;
  var expr2;
  var name;
  if (this.tokenIndex >= this.tokens.length) {
    throw "no more tokens";
  } else {
    if (this.tokens[this.tokenIndex] instanceof A3a.Compiler.TokenKeyword) {
      var head = this.tokens[this.tokenIndex];
      switch(head.name) {
        case "const":
          if (!this.checkTokenType(1, A3a.Compiler.TokenName) || !this.checkTokenKeyword(2, "=")) {
            throw 'syntax error for "const" ' + head.posString();
          }
          name = this.tokens[this.tokenIndex + 1];
          this.tokenIndex += 3;
          expr = this.parseExpression();
          expr = expr.optimize(this);
          if (!(expr instanceof A3a.Compiler.NodeNumber)) {
            throw "non-constant expression in constant definition " + this.tokens[this.tokenIndex].posString();
          }
          return [new A3a.Compiler.NodeStatementConst(head, name.name, expr)];
        case "var":
          if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
            throw 'unexpected token after "var" ' + head.posString();
          }
          name = this.tokens[this.tokenIndex + 1];
          this.tokenIndex += 2;
          if (this.checkTokenType(0, A3a.Compiler.TokenKeyword)) {
            switch(this.tokens[this.tokenIndex].name) {
              case "[":
                if (this.checkTokenKeyword(1, "]")) {
                  this.tokenIndex += 2;
                  if (!this.checkTokenKeyword(0, "=")) {
                    throw "missing size or initial value in array declaration" + this.tokens[this.tokenIndex - 2].posString();
                  }
                  expr = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex], A3a.Compiler.opType.infix, this.getOperator("=", A3a.Compiler.opType.infix), [new A3a.Compiler.NodeVar(name)]);
                  this.tokenIndex++;
                  expr.children.push(this.parseExpression());
                  expr.resultType = expr.children[1].resultType;
                  expr.shouldProduceValue = false;
                  var sizeExpr = new A3a.Compiler.NodeFun(new A3a.Compiler.TokenKeyword(expr.head.srcIndex, expr.head.srcLine, expr.head.srcCol, "size"), A3a.Compiler.opType.prefix, this.getOperator("size", A3a.Compiler.opType.prefix), [expr.children[1]]);
                  return [new A3a.Compiler.NodeStatementVar(head, name, expr.resultType, [sizeExpr], expr)];
                } else {
                  this.tokenIndex++;
                  var sizeExpr = this.parseExpression();
                  if (!this.checkTokenKeyword(0, "]")) {
                    throw "array size syntax error" + this.tokens[this.tokenIndex].posString();
                  }
                  this.tokenIndex++;
                  if (this.checkTokenKeyword(0, "=")) {
                    expr = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex], A3a.Compiler.opType.infix, this.getOperator("=", A3a.Compiler.opType.infix), [new A3a.Compiler.NodeVar(name)]);
                    this.tokenIndex++;
                    expr.children.push(this.parseExpression());
                    expr.resultType = expr.children[1].resultType;
                    expr.shouldProduceValue = false;
                    expr = expr.optimize(this);
                    return [new A3a.Compiler.NodeStatementVar(head, name, expr.resultType, [sizeExpr], expr)];
                  } else {
                    return [new A3a.Compiler.NodeStatementVar(head, name, A3a.Compiler.resultType.undef, [sizeExpr])];
                  }
                }
              case "=":
                expr = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex], A3a.Compiler.opType.infix, this.getOperator("=", A3a.Compiler.opType.infix), [new A3a.Compiler.NodeVar(name)]);
                this.tokenIndex++;
                expr.children.push(this.parseExpression());
                expr.resultType = expr.children[1].resultType;
                expr.shouldProduceValue = false;
                expr = expr.optimize(this);
                return [new A3a.Compiler.NodeStatementVar(head, name, expr.resultType, null, expr)];
            }
          }
          return [new A3a.Compiler.NodeStatementVar(head, name, A3a.Compiler.resultType.undef)];
        case "if":
        case "elseif":
          this.tokenIndex++;
          expr = this.parseExpression();
          if (!this.checkTokenKeyword(0, "then")) {
            throw '"then" expected after "if" statement ' + this.tokens[this.tokenIndex].posString();
          }
          this.tokenIndex++;
          return [head.name === "if" ? new A3a.Compiler.NodeStatementIf(head, expr) : new A3a.Compiler.NodeStatementElseif(head, expr)];
        case "when":
          this.tokenIndex++;
          expr = this.parseExpression();
          if (!this.checkTokenKeyword(0, "do")) {
            throw '"do" expected after "when" statement ' + this.tokens[this.tokenIndex].posString();
          }
          this.tokenIndex++;
          return [new A3a.Compiler.NodeStatementWhen(head, expr)];
        case "while":
          this.tokenIndex++;
          expr = this.parseExpression();
          if (!this.checkTokenKeyword(0, "do")) {
            throw '"do" expected after "while" statement ' + this.tokens[this.tokenIndex].posString();
          }
          this.tokenIndex++;
          return [new A3a.Compiler.NodeStatementWhile(head, expr)];
        case "for":
          if (!this.checkTokenType(1, A3a.Compiler.TokenName) || !this.checkTokenKeyword(2, "in")) {
            throw '"for" syntax error ' + head.posString();
          }
          name = this.tokens[this.tokenIndex + 1];
          this.tokenIndex += 3;
          expr = this.parseExpression();
          if (!this.checkTokenKeyword(0, ":")) {
            throw 'range expected in "for" statement ' + this.tokens[this.tokenIndex].posString();
          }
          this.tokenIndex++;
          expr2 = this.parseExpression();
          var step = null;
          if (this.checkTokenKeyword(0, "step")) {
            this.tokenIndex++;
            step = this.parseExpression();
          }
          if (!this.checkTokenKeyword(0, "do")) {
            throw '"do" expected after "for" statement ' + this.tokens[this.tokenIndex].posString();
          }
          this.tokenIndex++;
          return [new A3a.Compiler.NodeStatementFor(head, name, expr, expr2, step)];
        case "end":
          this.tokenIndex++;
          return [new A3a.Compiler.NodeStatementEnd(head)];
        case "call":
          if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
            throw '"call" syntax error ' + head.posString();
          }
          name = this.tokens[this.tokenIndex + 1];
          this.tokenIndex += 2;
          if (this.checkTokenKeyword(0, "(")) {
            return [new A3a.Compiler.NodeStatementCall(head, name.name, this.parseArguments())];
          }
          return [new A3a.Compiler.NodeStatementCall(head, name.name, [])];
        case "callsub":
          if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
            throw '"callsub" syntax error ' + head.posString();
          }
          name = this.tokens[this.tokenIndex + 1];
          this.tokenIndex += 2;
          return [new A3a.Compiler.NodeStatementCallSub(head, name.name)];
        case "else":
          this.tokenIndex++;
          return [new A3a.Compiler.NodeStatementElse(head)];
        case "onevent":
          if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
            throw 'unexpected token after "onevent" ' + head.posString();
          }
          name = this.tokens[this.tokenIndex + 1];
          this.tokenIndex += 2;
          return [new A3a.Compiler.NodeStatementOnevent(head, name.name)];
        case "return":
          this.tokenIndex++;
          return [new A3a.Compiler.NodeStatementReturn(head)];
        case "sub":
          if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
            throw 'unexpected token after "sub" ' + head.posString();
          }
          name = this.tokens[this.tokenIndex + 1];
          this.tokenIndex += 2;
          return [new A3a.Compiler.NodeStatementSub(head, name.name)];
      }
    }
  }
  expr = this.parseExpression();
  if (expr instanceof A3a.Compiler.NodeFun) {
    expr.shouldProduceValue = false;
  }
  expr = expr.optimize(this);
  return [new A3a.Compiler.NodeStatementExpression(expr)];
};
A3a.Compiler.prototype.processTokenArray = function() {
};
A3a.Compiler.prototype.buildStatementArray = function() {
  this.tokenIndex = 0;
  this.statements = [];
  while (this.tokenIndex < this.tokens.length) {
    this.statements = this.statements.concat(this.parseNextStatement());
  }
};
A3a.Compiler.prototype.processStatementArray = function() {
};
A3a.Compiler.prototype.dumpStatementArray = function(dumpFun) {
  for (var i = 0; i < this.statements.length; i++) {
    dumpFun(this.statements[i]);
  }
};
A3a.Compiler.prototype.addVariableOrConstantDef = function(statement) {
  if (statement instanceof A3a.Compiler.NodeStatementConst) {
    statement.val = statement.val.optimize(this);
    if (!(statement.val instanceof A3a.Compiler.NodeNumber)) {
      throw "constant definition " + statement.head.posString();
    }
    this.addConstant(statement.constName, statement.val.n, statement.val.resultType);
  } else {
    if (statement instanceof A3a.Compiler.NodeStatementVar) {
      statement.size = 1;
      statement.dims = [];
      if (statement.sizeExpr) {
        statement.sizeExpr = statement.sizeExpr.map(function(expr) {
          var e = expr.optimize(this);
          if (!(e instanceof A3a.Compiler.NodeNumber) || e.n <= 0) {
            throw "array variable size " + statement.head.posString();
          }
          statement.size *= e.n;
          statement.dims.push(e.n);
          return e;
        }, this);
      }
      statement.offset = this.varSize;
      if (statement.children[0]) {
        statement.resultType = statement.children[0].resultType;
      }
      this.varSize += statement.size;
      this.addVariable(statement.varName, statement.size, statement.dims, statement.offset, statement.resultType);
    }
  }
};
A3a.Compiler.prototype.resetContext = function() {
};
A3a.Compiler.prototype.setContext = function(context) {
};
A3a.Compiler.prototype.getContext = function() {
  return null;
};
A3a.Compiler.prototype.allocateVariables = function() {
  this.varSize = this.asebaNode.varSize;
  for (var i = 0; i < this.statements.length; i++) {
    this.addVariableOrConstantDef(this.statements[i]);
  }
};
A3a.Compiler.prototype.changeContext = function(statement, stack) {
  switch(statement.type) {
    case A3a.Compiler.NodeStatement.type.begin:
      stack.push(this.getContext());
      this.setContext(statement.contexts[0]);
      break;
    case A3a.Compiler.NodeStatement.type.middle:
      this.setContext(statement.contexts[0]);
      break;
    case A3a.Compiler.NodeStatement.type.end:
      this.setContext(stack.pop());
      break;
  }
};
A3a.Compiler.prototype.buildTree = function() {
  var self = this;
  var stack;
  var stackContext = [];
  function terminateBlock() {
    if (stack.length > 1) {
      var b = stack[stack.length - 1].head;
      throw "unterminated " + b.name + " " + b.posString();
    }
    self.codeBlocks.push(stack[0]);
  }
  this.allocateVariables();
  this.resetContext();
  stackContext = [];
  this.statements.forEach(function(statement) {
    this.changeContext(statement, stackContext);
    statement.resolveArraySize(this);
  }, this);
  this.resetContext();
  stackContext = [];
  for (var i = 0; i < this.statements.length; i++) {
    this.changeContext(this.statements[i], stackContext);
    this.statements[i] = this.statements[i].optimize(this);
  }
  this.resetContext();
  stackContext = [];
  for (var i = 0; i < this.statements.length; i++) {
    this.changeContext(this.statements[i], stackContext);
    this.statements[i] = this.statements[i].explodeArrayNode(this);
  }
  this.codeBlocks = [];
  stack = [new A3a.Compiler.NodeStatementOnevent(null, "init")];
  this.resetContext();
  for (var i = 0; i < this.statements.length; i++) {
    switch(this.statements[i].type) {
      case A3a.Compiler.NodeStatement.type.plain:
        this.statements[i].postProcess(this, this.statements[i]);
        stack[stack.length - 1].children.push(this.statements[i]);
        break;
      case A3a.Compiler.NodeStatement.type.blockHeader:
        this.setContext(this.statements[i].contexts[0]);
        terminateBlock();
        stack = [this.statements[i].newBlock()];
        break;
      case A3a.Compiler.NodeStatement.type.begin:
        this.setContext(this.statements[i].contexts[0]);
        this.statements[i].processBeginStatement(this);
        stack.push(this.statements[i]);
        break;
      case A3a.Compiler.NodeStatement.type.middle:
        this.setContext(this.statements[i].contexts[0]);
        stack[stack.length - 1].processMiddleStatement(this.statements[i]);
        break;
      case A3a.Compiler.NodeStatement.type.end:
        if (stack.length < 2) {
          var b = this.statements[i].head;
          throw "unexpected end " + b.posString();
        }
        this.setContext(this.statements[i].contexts[0]);
        stack[stack.length - 1].processEndStatement(this.statements[i]);
        var st = stack.pop();
        this.setContext(this.statements[i].contexts[this.statements[i].contexts.length - 1]);
        st.postProcess(this, this.statements[i]);
        stack[stack.length - 1].children.push(st);
        break;
      default:
        throw "not implemented " + this.statements[i].type;
    }
  }
  terminateBlock();
};
A3a.Compiler.prototype.processTree = function() {
};
A3a.Compiler.prototype.generateA3aBCForFunction = function(node) {
  return null;
};
A3a.Compiler.Node.prototype.generateA3aBC = function(compiler, isTopLevel) {
  var bc = [];
  var bcAddr0 = compiler.bcAddr;
  for (var i = 0; i < this.children.length; i++) {
    bc = bc.concat(this.children[i].generateA3aBC(compiler));
    compiler.bcAddr = bcAddr0 + bc.length;
  }
  return bc;
};
A3a.Compiler.NodeNumber.generateA3aBC = function(num) {
  if (num >= -2048 && num < 2048) {
    return [A3a.vm.bc.smallImmediate << 12 | num & 4095];
  } else {
    return [A3a.vm.bc.largeImmediate << 12, num & 65535];
  }
};
A3a.Compiler.NodeNumber.prototype.generateA3aBC = function(compiler, isTopLevel) {
  return this.shouldProduceValue ? A3a.Compiler.NodeNumber.generateA3aBC(this.n) : [];
};
A3a.Compiler.NodeVar.prototype.generateA3aBC = function(compiler, isTopLevel) {
  return this.dummyPlaceholder ? [] : compiler.hasConstant(this.name) ? A3a.Compiler.NodeNumber.generateA3aBC(compiler.getConstant(this.name).val) : compiler.getVariable(this).generateA3aBCForLoad(compiler);
};
A3a.Compiler.NodeFun.prototype.generateA3aBC = function(compiler, isTopLevel) {
  var assignmentResultValue = {void:0, preAssign:1, postAssign:2};
  function compileAssignment(lhs, rhs, pushVar, resultKind) {
    var bc = [];
    function compileAssignmentConstAddr(variable, offset) {
      if (resultKind === assignmentResultValue.postAssign) {
        bc = bc.concat(variable.generateA3aBCForLoad(compiler, offset));
      }
      if (pushVar) {
        bc = bc.concat(variable.generateA3aBCForLoad(compiler, offset));
      }
      bc = bc.concat(rhs.generateA3aBC(compiler)).concat(compiler.generateA3aBCForTypeConversion(rhs.resultType, variable.resultType)).concat(variable.generateA3aBCForStore(compiler, offset));
      if (resultKind === assignmentResultValue.preAssign) {
        bc = bc.concat(variable.generateA3aBCForLoad(compiler, offset));
      }
    }
    if (lhs instanceof A3a.Compiler.NodeIndexing) {
      var variable = compiler.getVariable(lhs);
      if (lhs.areIndicesConstant()) {
        var index = lhs.constantIndicesToSingleIndex(variable);
        if (index >= variable.size) {
          throw "index out of range";
        }
        compileAssignmentConstAddr(variable, index);
      } else {
        if (resultKind === assignmentResultValue.void && !pushVar) {
          bc = bc.concat(rhs.generateA3aBC(compiler)).concat(compiler.generateA3aBCForTypeConversion(rhs.resultType, variable.resultType)).concat(lhs.generateA3aBCForIndices(compiler)).concat(variable.generateA3aBCForStoreIndirect(compiler));
        } else {
          var tempVarOffset = compiler.allocTempVariable(1);
          bc = bc.concat(lhs.generateA3aBCForIndices(compiler)).concat(A3a.vm.bc.store << 12 | tempVarOffset);
          if (resultKind === assignmentResultValue.postAssign) {
            bc = bc.concat(A3a.vm.bc.load << 12 | tempVarOffset).concat(variable.generateA3aBCForLoadIndirect(compiler));
          }
          if (pushVar) {
            bc = bc.concat(A3a.vm.bc.load << 12 | tempVarOffset).concat(variable.generateA3aBCForLoadIndirect(compiler));
          }
          bc = bc.concat(rhs.generateA3aBC(compiler)).concat(compiler.generateA3aBCForTypeConversion(rhs.resultType, variable.resultType)).concat(A3a.vm.bc.load << 12 | tempVarOffset).concat(variable.generateA3aBCForStoreIndirect(compiler));
          if (resultKind === assignmentResultValue.preAssign) {
            bc = bc.concat(A3a.vm.bc.load << 12 | tempVarOffset).concat(variable.generateA3aBCForLoadIndirect(compiler));
          }
        }
      }
    } else {
      if (lhs instanceof A3a.Compiler.NodeVar) {
        var variable = compiler.getVariable(lhs);
        compileAssignmentConstAddr(variable);
      } else {
        throw "bad assignment";
      }
    }
    return bc;
  }
  var name = this.head.name;
  switch(name) {
    case "=":
      return compileAssignment(this.children[0], this.children[1], false, this.shouldProduceValue ? assignmentResultValue.preAssign : assignmentResultValue.void);
    case "++":
    case "--":
      if (!(this.children[0] instanceof A3a.Compiler.NodeVar)) {
        throw "invalid operand " + this.head.posString();
      }
      var opName = name[0];
      var opDescr = compiler.getOperator(opName, A3a.Compiler.opType.infix);
      var nodeFun = new A3a.Compiler.NodeFun(new A3a.Compiler.TokenKeyword(this.head.srcIndex, this.head.srcLine, this.head.srcCol, opName), A3a.Compiler.opType.infix, opDescr, [this.children[0].makeDummyPlaceholder(), new A3a.Compiler.NodeNumber(new A3a.Compiler.TokenNumber(this.head.srcIndex, this.head.srcLine, this.head.srcCol, 1))]);
      if (opDescr.resultTypePropagate) {
        var variable = compiler.getVariable(this.children[0]);
        nodeFun.resultType = opDescr.resultTypePropagate(compiler, nodeFun, [variable.resultType, A3a.Compiler.resultType.number]);
      }
      return compileAssignment(this.children[0], nodeFun, true, this.shouldProduceValue ? this.type === A3a.Compiler.opType.prefix ? assignmentResultValue.preAssign : assignmentResultValue.postAssign : assignmentResultValue.void);
    default:
      if (this.type === A3a.Compiler.opType.infix && this.operatorDescr.priority === A3a.Compiler.opPriority.assignment) {
        if (!(this.children[0] instanceof A3a.Compiler.NodeVar)) {
          throw "invalid operand " + this.head.posString();
        }
        var opName = name.slice(0, -1);
        var opDescr = compiler.getOperator(opName, A3a.Compiler.opType.infix);
        var nodeFun = new A3a.Compiler.NodeFun(new A3a.Compiler.TokenKeyword(this.head.srcIndex, this.head.srcLine, this.head.srcCol, opName), A3a.Compiler.opType.infix, opDescr, [this.children[0].makeDummyPlaceholder(), this.children[1]]);
        if (opDescr.resultTypePropagate) {
          var variable = compiler.getVariable(this.children[0]);
          nodeFun.resultType = opDescr.resultTypePropagate(compiler, nodeFun, [variable.resultType, this.children[1].resultType]);
        }
        return compileAssignment(this.children[0], nodeFun, true, this.shouldProduceValue ? assignmentResultValue.preAssign : assignmentResultValue.void);
      } else {
        if (this.operatorDescr && this.operatorDescr.generateA3aBC) {
          return this.operatorDescr.generateA3aBC(this, compiler);
        } else {
          switch(this.type) {
            case A3a.Compiler.opType.prefix:
              return A3a.Compiler.Node.prototype.generateA3aBC.call(this, compiler).concat(this.operatorDescr.bytecode);
            case A3a.Compiler.opType.infix:
              return A3a.Compiler.Node.prototype.generateA3aBC.call(this, compiler).concat(this.operatorDescr.bytecode);
            case A3a.Compiler.opType.constant:
              return this.operatorDescr.bytecode;
            case A3a.Compiler.opType.fun:
              var bc = compiler.generateA3aBCForFunction(this);
              if (bc !== null) {
                return bc;
              }
              var macroFunctionDef = compiler.getMacroFunctionDef(name);
              if (macroFunctionDef != null) {
                if (macroFunctionDef.nArgs !== this.children.length) {
                  throw "wrong number of arguments";
                }
                bc = [];
                var tempVarOffset = compiler.allocTempVariable(macroFunctionDef.nArgs + (macroFunctionDef.nTmp || 0));
                for (var j = 0; j < this.children.length; j++) {
                  bc = bc.concat(this.children[j].generateA3aBC(compiler));
                  bc = bc.concat(A3a.vm.bc.store << 12 | tempVarOffset + j);
                }
                bc = bc.concat(macroFunctionDef.genCode(compiler, compiler.asebaNode, this.children.map(function(node) {
                  return node.resultType;
                }), tempVarOffset));
                return bc;
              }
              throw "unknown function " + name + " " + this.head.posString();
            default:
              throw "internal";
          }
        }
      }
  }
};
A3a.Compiler.Node.prototype.generateA3aCondBranchBC = function(compiler, when) {
  if (this instanceof A3a.Compiler.NodeFun && this.children.length === 2) {
    return this.children[0].generateA3aBC(compiler).concat(this.children[1].generateA3aBC(compiler)).concat([A3a.vm.bc.conditionalBranch << 12 | (when ? 256 : 0) | this.operatorDescr.bytecode[0] & 255, 0]);
  } else {
    return this.generateA3aBC(compiler).concat(A3a.vm.bc.smallImmediate << 12, A3a.vm.bc.conditionalBranch << 12 | (when ? 256 : 0) | A3a.vm.condName.indexOf("ne"), 0);
  }
};
A3a.Compiler.NodeIndexing.prototype.generateA3aBCForIndices = function(compiler) {
  var variable = compiler.getVariable(this);
  if (this.children.length > variable.dims.length) {
    throw "too many indices" + this.head.posString();
  }
  var bc = [];
  var m = 1;
  for (var i = 0; i < this.children.length; i++) {
    bc = bc.concat(this.children[i].generateA3aBC(compiler));
    if (i > 0) {
      bc = bc.concat(A3a.vm.bc.smallImmediate << 12 | m, A3a.vm.bc.binaryOpMult, A3a.vm.bc.binaryOpAdd);
    }
    m *= variable.dims[i];
  }
  return bc;
};
A3a.Compiler.NodeIndexing.prototype.generateA3aBC = function(compiler, isTopLevel) {
  if (this.dummyPlaceholder) {
    return [];
  }
  var variable = compiler.getVariable(this);
  if (this.areIndicesConstant()) {
    var index = this.constantIndicesToSingleIndex(variable);
    if (index >= variable.size) {
      throw "index out of range " + this.head.posString();
    }
    return variable.generateA3aBCForLoad(compiler, index);
  } else {
    return this.generateA3aBCForIndices(compiler).concat(variable.generateA3aBCForLoadIndirect(compiler));
  }
};
A3a.Compiler.NodeArray.prototype.generateA3aBC = function(compiler, isTopLevel) {
  throw "internal";
};
A3a.Compiler.NodeStatement.prototype.generateA3aBC = function(compiler, isTopLevel) {
  throw "internal";
};
A3a.Compiler.NodeStatementOnevent.prototype.generateA3aBC = function(compiler, isTopLevel) {
  var baseContext = compiler.getContext();
  this.prepareGenerateA3aBC(compiler);
  compiler.setContext(this.contexts[0]);
  var bc = this.eventName === "init" ? compiler.startupBytecode : [];
  compiler.bcAddr += bc.length;
  bc = bc.concat(A3a.Compiler.Node.prototype.generateA3aBC.call(this, compiler)).concat(A3a.vm.bc.stop << 12);
  compiler.setContext(baseContext);
  return bc;
};
A3a.Compiler.NodeStatementSub.prototype.generateA3aBC = function(compiler, isTopLevel) {
  var baseContext = compiler.getContext();
  this.prepareGenerateA3aBC(compiler);
  compiler.setContext(this.contexts[0]);
  var bc = A3a.Compiler.Node.prototype.generateA3aBC.call(this, compiler).concat(A3a.vm.bc.ret << 12);
  compiler.setContext(baseContext);
  return bc;
};
A3a.Compiler.NodeStatementConst.prototype.generateA3aBC = function(compiler, isTopLevel) {
  this.prepareGenerateA3aBC(compiler);
  return [];
};
A3a.Compiler.NodeStatementVar.prototype.generateA3aBC = function(compiler, isTopLevel) {
  this.prepareGenerateA3aBC(compiler);
  if (this.children.length === 0) {
    return [];
  }
  var bc = A3a.Compiler.Node.prototype.generateA3aBC.call(this, compiler);
  return bc;
};
A3a.Compiler.NodeStatementExpression.prototype.generateA3aBC = function(compiler, isTopLevel) {
  this.prepareGenerateA3aBC(compiler);
  return this.children[0].generateA3aBC(compiler);
};
A3a.Compiler.NodeStatementSequence.prototype.generateA3aBC = function(compiler, isTopLevel) {
  this.prepareGenerateA3aBC(compiler);
  var bc = [];
  this.children.forEach(function(st) {
    bc = bc.concat(st.generateA3aBC(compiler, isTopLevel));
  });
  return bc;
};
A3a.Compiler.NodeStatementIf.prototype.generateA3aBC = function(compiler, isTopLevel) {
  var baseContext = compiler.getContext();
  this.prepareGenerateA3aBC(compiler);
  var bcAddr0 = compiler.bcAddr;
  var bc = [];
  var pendingJumpsToEndCount = 0;
  for (var i = 0; i < this.conditions.length; i++) {
    compiler.bcAddr = bcAddr0 + bc.length;
    if (i > 0) {
      compiler.addSourceToBCMapping(this.linkedStatements[i - 1]);
    }
    bc = bc.concat(this.conditions[i].generateA3aCondBranchBC(compiler));
    compiler.bcAddr = bcAddr0 + bc.length;
    compiler.prepareJump(bc);
    compiler.setContext(this.contexts[i]);
    this.conditionalCode[i].forEach(function(st) {
      bc = bc.concat(st.generateA3aBC(compiler));
      compiler.bcAddr = bcAddr0 + bc.length;
    });
    compiler.setContext(baseContext);
    if (i + 1 < this.conditionalCode.length) {
      bc = bc.concat(A3a.vm.bc.jump << 12);
      compiler.finalizeJump(bc);
      compiler.prepareJump(bc);
      pendingJumpsToEndCount++;
    } else {
      compiler.finalizeJump(bc);
    }
  }
  compiler.bcAddr = bcAddr0 + bc.length;
  if (this.conditionalCode.length > this.conditions.length) {
    compiler.addSourceToBCMapping(this.linkedStatements[this.conditions.length - 1], compiler.bcAddr + bc.length);
    compiler.setContext(this.contexts[this.conditions.length]);
    this.conditionalCode[this.conditions.length].forEach(function(st) {
      bc = bc.concat(st.generateA3aBC(compiler));
      compiler.bcAddr = bcAddr0 + bc.length;
    });
  }
  while (pendingJumpsToEndCount-- > 0) {
    compiler.finalizeJump(bc);
  }
  compiler.setContext(baseContext);
  return bc;
};
A3a.Compiler.NodeStatementWhen.prototype.generateA3aBC = function(compiler, isTopLevel) {
  var baseContext = compiler.getContext();
  this.prepareGenerateA3aBC(compiler);
  var bcAddr0 = compiler.bcAddr;
  var bc = this.condition.generateA3aCondBranchBC(compiler, true);
  compiler.prepareJump(bc);
  compiler.setContext(this.contexts[0]);
  this.children.forEach(function(st) {
    compiler.bcAddr = bcAddr0 + bc.length;
    bc = bc.concat(st.generateA3aBC(compiler));
  });
  compiler.finalizeJump(bc);
  compiler.setContext(baseContext);
  return bc;
};
A3a.Compiler.NodeStatementWhile.prototype.generateA3aBC = function(compiler, isTopLevel) {
  if (this.condition == null && this.children.length === 0) {
    return [];
  }
  var baseContext = compiler.getContext();
  this.prepareGenerateA3aBC(compiler);
  var bcAddr0 = compiler.bcAddr;
  var bc = [];
  if (this.condition != null) {
    bc = this.condition.generateA3aCondBranchBC(compiler);
  }
  compiler.prepareJump(bc);
  compiler.setContext(this.contexts[0]);
  this.children.forEach(function(st) {
    compiler.bcAddr = bcAddr0 + bc.length;
    bc = bc.concat(st.generateA3aBC(compiler));
  });
  compiler.bcAddr = bcAddr0 + bc.length;
  compiler.addSourceToBCMapping(this.linkedStatements[0]);
  bc = bc.concat(A3a.vm.bc.jump << 12 | -bc.length & 4095);
  compiler.finalizeJump(bc);
  compiler.setContext(baseContext);
  return bc;
};
A3a.Compiler.NodeStatementFor.prototype.generateA3aBC = function(compiler, isTopLevel) {
  var baseContext = compiler.getContext();
  this.prepareGenerateA3aBC(compiler);
  var bcAddr0 = compiler.bcAddr;
  var bc = this.children[0].generateA3aBC(compiler);
  var variable = compiler.getVariable(this.nodeVar);
  bc = bc.concat(variable.generateA3aBCForStore(compiler));
  var beg = bc.length;
  bc = bc.concat(variable.generateA3aBCForLoad(compiler)).concat(this.children[1].generateA3aBC(compiler)).concat(A3a.vm.bc.conditionalBranch << 12 | 15, 0);
  compiler.prepareJump(bc);
  compiler.setContext(this.contexts[0]);
  for (var i = 2; i < this.children.length; i++) {
    compiler.bcAddr = bcAddr0 + bc.length;
    bc = bc.concat(this.children[i].generateA3aBC(compiler));
  }
  compiler.bcAddr = bcAddr0 + bc.length;
  compiler.addSourceToBCMapping(this.linkedStatements[0]);
  bc = bc.concat(variable.generateA3aBCForLoad(compiler));
  if (this.step) {
    bc = bc.concat(this.step.generateA3aBC(compiler));
  } else {
    bc = bc.concat(A3a.Compiler.NodeNumber.generateA3aBC(1));
  }
  bc = bc.concat(A3a.vm.bc.binaryOpAdd, variable.generateA3aBCForStore(compiler), A3a.vm.bc.jump << 12 | beg - bc.length - 2 & 4095);
  compiler.finalizeJump(bc);
  compiler.setContext(baseContext);
  return bc;
};
A3a.Compiler.NodeStatementCall.prototype.generateA3aBC = function(compiler, isTopLevel) {
  this.prepareGenerateA3aBC(compiler);
  var fun = compiler.asebaNode.findNativeFunction(this.name);
  if (!fun) {
    throw 'native function "' + this.name + '" not found';
  } else {
    if (this.children.length !== fun.args.length) {
      throw 'wrong number of arguments for native function "' + this.name + '"';
    }
  }
  var bc = [];
  var argSizes = [];
  var argFreeSizeVal = [];
  for (var i = this.children.length - 1; i >= 0; i--) {
    var argNode = this.children[i];
    if (fun.args[i] < 0) {
      if (argSizes[-fun.args[i] - 1] == undefined) {
        argSizes[-fun.args[i] - 1] = argNode.valueSize;
      } else {
        if (argSizes[-fun.args[i] - 1] !== argNode.valueSize) {
          throw 'argument size mismatch in native function "' + this.name + '"';
        }
      }
    } else {
      if (fun.args[i] === 0) {
        argFreeSizeVal.push(argNode.valueSize);
      }
    }
    if (argNode instanceof A3a.Compiler.NodeIndexing) {
      bc = bc.concat(A3a.Compiler.NodeNumber.generateA3aBC(compiler.getVariable(argNode).offset)).concat(argNode.generateA3aBCForIndices(compiler)).concat(A3a.vm.bc.binaryOpAdd);
    } else {
      if (argNode instanceof A3a.Compiler.NodeVar) {
        bc = bc.concat(A3a.Compiler.NodeNumber.generateA3aBC(compiler.getVariable(argNode).offset));
      } else {
        var tempVarOffset = compiler.allocTempVariable(argNode.valueSize);
        for (var j = 0; j < argNode.valueSize; j++) {
          bc = bc.concat((argNode instanceof A3a.Compiler.NodeArray ? argNode.children[j] : argNode).generateA3aBC(compiler));
          bc = bc.concat(A3a.vm.bc.store << 12 | tempVarOffset + j);
        }
        bc = bc.concat(A3a.Compiler.NodeNumber.generateA3aBC(tempVarOffset));
      }
    }
  }
  for (var i = argFreeSizeVal.length - 1; i >= 0; i--) {
    bc = A3a.Compiler.NodeNumber.generateA3aBC(argFreeSizeVal[i]).concat(bc);
  }
  for (var i = argSizes.length - 1; i >= 0; i--) {
    if (argSizes[i] !== undefined) {
      bc = A3a.Compiler.NodeNumber.generateA3aBC(argSizes[i]).concat(bc);
    }
  }
  bc = bc.concat(A3a.vm.bc.nativeCall << 12 | fun.id);
  return bc;
};
A3a.Compiler.NodeStatementReturn.prototype.generateA3aBC = function(compiler, isTopLevel) {
  this.prepareGenerateA3aBC(compiler);
  return [(compiler.inSubDefinition ? A3a.vm.bc.ret : A3a.vm.bc.stop) << 12];
};
A3a.Compiler.CodePlaceholderCallSub = function(compiler, statement) {
  A3a.Compiler.CodePlaceholder.call(this, compiler, statement);
};
A3a.Compiler.CodePlaceholderCallSub.prototype = Object.create(A3a.Compiler.CodePlaceholder.prototype);
A3a.Compiler.CodePlaceholderCallSub.prototype.constructor = A3a.Compiler.CodePlaceholderCallSub;
A3a.Compiler.CodePlaceholderCallSub.prototype.generateA3aBC = function(addr) {
  var name = this.statement.name;
  if (this.compiler.subBlocks[name] === undefined) {
    throw 'unknown function "' + name + '" ' + this.statement.head.posString();
  }
  return A3a.vm.bc.subCall << 12 | this.compiler.subBlocks[name];
};
A3a.Compiler.NodeStatementCallSub.prototype.generateA3aBC = function(compiler, isTopLevel) {
  this.prepareGenerateA3aBC(compiler);
  return [new A3a.Compiler.CodePlaceholderCallSub(compiler, this)];
};
A3a.Compiler.prototype.generateEventVectorTable = function() {
  var bc = [];
  return [bc.length + 1].concat(bc);
};
A3a.Compiler.resolveCodePlaceholders = function(bc, bcAddr0) {
  bcAddr0 = bcAddr0 || 0;
  for (var i = 0; i < bc.length; i++) {
    if (bc[i] instanceof A3a.Compiler.CodePlaceholder) {
      bc[i] = bc[i].generateA3aBC(bcAddr0 + i);
    }
  }
};
A3a.Compiler.prototype.generateA3aBC = function() {
  this.resetJumpResolution();
  this.resetContext();
  this.sourceToBCMapping = [];
  var codeBlockBC = this.codeBlocks.map(function(block) {
    this.bcAddr = 0;
    this.setContext(block.contexts[0]);
    this.inSubDefinition = block instanceof A3a.Compiler.NodeStatementSub;
    this.sourceToBCMapping = [];
    return {bc:block.generateA3aBC(this, true), mapping:this.sourceToBCMapping};
  }, this);
  if (this.branches.length > 0) {
    throw "internal";
  }
  var nEvents = 0;
  for (var i = 0; i < this.codeBlocks.length; i++) {
    if (this.codeBlocks[i] instanceof A3a.Compiler.NodeStatementOnevent) {
      nEvents++;
    }
  }
  this.subBlocks = {};
  var bc = [];
  var bc0 = [1 + 2 * nEvents];
  this.sourceToBCMapping = [];
  for (var i = 0; i < this.codeBlocks.length; i++) {
    this.sourceToBCMapping = this.sourceToBCMapping.concat(codeBlockBC[i].mapping.map(function(m) {
      return new A3a.Compiler.SourceToBCMapping(m.srcOffset, m.line, m.col, m.addr + 1 + 2 * nEvents + bc.length);
    }));
    if (this.codeBlocks[i] instanceof A3a.Compiler.NodeStatementOnevent) {
      bc0 = bc0.concat(this.asebaNode.eventNameToId(this.codeBlocks[i].eventName), 1 + 2 * nEvents + bc.length);
      bc = bc.concat(codeBlockBC[i].bc);
    } else {
      if (this.codeBlocks[i] instanceof A3a.Compiler.NodeStatementSub) {
        this.subBlocks[this.codeBlocks[i].subName] = 1 + 2 * nEvents + bc.length;
        bc = bc.concat(codeBlockBC[i].bc);
      }
    }
  }
  A3a.Compiler.resolveCodePlaceholders(bc, 1 + 2 * nEvents);
  return bc0.concat(bc);
};
A3a.Compiler.prototype.compile = function() {
  this.buildTokenArray();
  this.processTokenArray();
  this.buildStatementArray();
  this.processStatementArray();
  this.buildTree();
  this.processTree();
  var bytecode = this.generateA3aBC();
  return bytecode;
};
A3a.A3aNode.macroMath = function(name, natName, nArgs) {
  if (nArgs === undefined) {
    nArgs = 1;
  }
  return {name:name, nArgs:nArgs, nTmp:1, exists:function(asebaNode) {
    return asebaNode.findNativeFunction(natName) != null;
  }, genCode:function(compiler, asebaNode, argTypes, argsAddr) {
    var fun = asebaNode.findNativeFunction(natName);
    var bc = [A3a.vm.bc.smallImmediate << 12 | 1];
    for (var i = 0; i < nArgs; i++) {
      bc = bc.concat([A3a.vm.bc.smallImmediate << 12 | argsAddr + nArgs - 1 - i]);
    }
    bc = bc.concat([A3a.vm.bc.smallImmediate << 12 | argsAddr + nArgs, A3a.vm.bc.nativeCall << 12 | fun.id, A3a.vm.bc.load << 12 | argsAddr + nArgs]);
    return bc;
  }};
};
A3a.A3aNode.stdMacros = [A3a.A3aNode.macroMath("min", "math.min", 2), A3a.A3aNode.macroMath("max", "math.max", 2), A3a.A3aNode.macroMath("clamp", "math.clamp", 3), A3a.A3aNode.macroMath("muldiv", "math.muldiv", 3), A3a.A3aNode.macroMath("atan2", "math.atan2", 2), A3a.A3aNode.macroMath("sin", "math.sin"), A3a.A3aNode.macroMath("cos", "math.cos"), A3a.A3aNode.macroMath("sqrt", "math.sqrt"), A3a.A3aNode.macroMath("rand", "math.rand", 0)];
A3a.Compiler.L2 = function(asebaNode, src) {
  A3a.Compiler.call(this, asebaNode, src);
  this.floatLiteral = true;
  this.operators = A3a.Compiler.L2.operators;
  this.factor = A3a.Compiler.NodeFixed.defaultFactor;
  this.def = [];
  this.functionDefinitions = [];
  this.globalVariables = [];
  this.labels = [[]];
  this.globalLabels = [];
  this.inFunction = false;
  this.label = null;
  this.functionResultType = A3a.Compiler.resultType.undef;
  this.loops = [];
};
A3a.Compiler.L2.prototype = Object.create(A3a.Compiler.prototype);
A3a.Compiler.L2.prototype.constructor = A3a.Compiler.L2;
A3a.Compiler.L2.Label;
A3a.Compiler.L2.keywords = ["==", "!=", "<=", ">=", "|=", "^=", "&=", "*=", "/=", "%=", "+=", "-=", "<<=", ">>=", "++", "--", "(", ")", "[", "]", "-", "~", "!", "*", "/", "%", "+", "<<", ">>", "&&", "||", "&", "^", "|", ">", "<", "=", ",", "?", ":", "{", "}", ";", "bool", "break", "case", "const", "continue", "default", "do", "else", "emit", "false", "fixed", "for", "goto", "if", "int", "onevent", "return", "size", "switch", "true", "void", "when", "while"];
A3a.Compiler.L2.resultTypePropagateFirst = function(compiler, node, a) {
  return a[0];
};
A3a.Compiler.L2.resultTypePropagateSecond = function(compiler, node, a) {
  return a[1];
};
A3a.Compiler.L2.resultTypePropagateFixed = function(compiler, node, a) {
  for (var i = 0; i < a.length; i++) {
    switch(a[i]) {
      case A3a.Compiler.resultType.undef:
      case A3a.Compiler.resultType.fixed:
        return a[i];
      case A3a.Compiler.resultType.void:
        throw "cannot use void result in expression";
    }
  }
  return A3a.Compiler.resultType.number;
};
A3a.Compiler.L2.castNodeType = function(node, resultType, compiler) {
  if (!(node instanceof A3a.Compiler.NodeArray) && node.resultType !== resultType && node.resultType !== A3a.Compiler.resultType.undef) {
    if (node.resultType === A3a.Compiler.resultType.void) {
      throw "cannot use void result " + node.head.posString();
    }
    var typeName = A3a.Compiler.L2.typeToKeyword(resultType);
    if (typeName) {
      node = new A3a.Compiler.NodeFun(new A3a.Compiler.TokenKeyword(node.head.srcIndex, node.head.srcLine, node.head.srcCol, typeName), A3a.Compiler.opType.prefix, compiler.getOperator(typeName, A3a.Compiler.opType.prefix), [node]);
      node = node.optimize(compiler);
    }
  }
  return node;
};
A3a.Compiler.L2.optimizeAssignmentType = function(node, compiler) {
  node.children[1] = A3a.Compiler.L2.castNodeType(node.children[1], node.resultType, compiler);
  return node;
};
A3a.Compiler.L2.prototype.generateA3aBCForTypeConversion = function(fromType, toType) {
  if (fromType === A3a.Compiler.resultType.undef || toType === A3a.Compiler.resultType.undef) {
    throw "internal";
  } else {
    if (fromType === A3a.Compiler.resultType.void) {
      throw "bad conversion from void";
    }
  }
  var bc = [];
  switch(fromType) {
    case A3a.Compiler.resultType.number:
    case A3a.Compiler.resultType.boolean:
      switch(toType) {
        case A3a.Compiler.resultType.fixed:
          return [A3a.vm.bc.smallImmediate << 12 | this.factor, A3a.vm.bc.binaryOpMult];
      }break;
    case A3a.Compiler.resultType.fixed:
      switch(toType) {
        case A3a.Compiler.resultType.number:
        case A3a.Compiler.resultType.boolean:
          return [A3a.vm.bc.smallImmediate << 12 | this.factor, A3a.vm.bc.binaryOpDiv];
      }
  }
  return bc;
};
A3a.Compiler.L2.generateA3aBCArgs = function(args, resultType, compiler) {
  var bc = [];
  args.forEach(function(arg) {
    if (arg instanceof A3a.Compiler.NodeFixed && resultType === A3a.Compiler.resultType.number) {
      bc = bc.concat(A3a.Compiler.NodeNumber.generateA3aBC(Math.trunc(arg.n)));
    } else {
      if (arg instanceof A3a.Compiler.NodeNumber && arg.resultType === A3a.Compiler.resultType.number && resultType === A3a.Compiler.resultType.fixed) {
        bc = bc.concat(A3a.Compiler.NodeNumber.generateA3aBC(arg.n * compiler.factor));
      } else {
        bc = bc.concat(arg.generateA3aBC(compiler)).concat(compiler.generateA3aBCForTypeConversion(arg.resultType, resultType));
      }
    }
  });
  return bc;
};
A3a.Compiler.L2.prototype.generateA3aMulDiv = function(a, b, c) {
  var tempVarOffset = this.allocTempVariable(4);
  return (a instanceof A3a.Compiler.Node ? a.generateA3aBC(this) : A3a.Compiler.NodeNumber.generateA3aBC(a)).concat(A3a.vm.bc.store << 12 | tempVarOffset).concat(b instanceof A3a.Compiler.Node ? b.generateA3aBC(this) : A3a.Compiler.NodeNumber.generateA3aBC(b)).concat(A3a.vm.bc.store << 12 | tempVarOffset + 1).concat(c instanceof A3a.Compiler.Node ? c.generateA3aBC(this) : A3a.Compiler.NodeNumber.generateA3aBC(c)).concat([A3a.vm.bc.store << 12 | tempVarOffset + 2, A3a.vm.bc.smallImmediate << 12 | 
  1, A3a.vm.bc.smallImmediate << 12 | tempVarOffset + 2, A3a.vm.bc.smallImmediate << 12 | tempVarOffset + 1, A3a.vm.bc.smallImmediate << 12 | tempVarOffset + 0, A3a.vm.bc.smallImmediate << 12 | tempVarOffset + 3, A3a.vm.bc.nativeCall << 12 | this.asebaNode.findNativeFunction("math.muldiv").id, A3a.vm.bc.load << 12 | tempVarOffset + 3]);
};
A3a.Compiler.L2.optimizeConstFun = function(node, compiler, funInt, funFixed) {
  var fixedResult = false;
  var args = [];
  for (var i = 0; i < node.children.length; i++) {
    if (node.children[i] instanceof A3a.Compiler.NodeFixed) {
      fixedResult = true;
    } else {
      if (!(node.children[i] instanceof A3a.Compiler.NodeNumber)) {
        return node;
      }
    }
    args.push(node.children[i].n);
  }
  var r = (fixedResult && funFixed ? funFixed : funInt)(args);
  var resultType = node.operatorDescr.resultType;
  if (node.operatorDescr.resultTypePropagate) {
    resultType = node.operatorDescr.resultTypePropagate(compiler, node, node.children.map(function(c) {
      return c.resultType;
    }));
  }
  switch(resultType) {
    case A3a.Compiler.resultType.number:
    case A3a.Compiler.resultType.boolean:
      return new A3a.Compiler.NodeNumber(node.head, A3a.Compiler.NodeNumber.toS16(r));
    case A3a.Compiler.resultType.fixed:
      return new A3a.Compiler.NodeFixed(node.head, r);
    default:
      throw "internal";
  }
};
A3a.Compiler.L2.operators = [new A3a.Compiler.OperatorDescr("--", A3a.Compiler.opType.prefix, {priority:A3a.Compiler.opPriority.pre, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFirst}), new A3a.Compiler.OperatorDescr("++", A3a.Compiler.opType.prefix, {priority:A3a.Compiler.opPriority.pre, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFirst}), new A3a.Compiler.OperatorDescr("-", A3a.Compiler.opType.prefix, {priority:A3a.Compiler.opPriority.pre, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFirst, 
optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return -args[0];
  });
}, bytecode:[A3a.vm.bc.unaryOpNeg]}), new A3a.Compiler.OperatorDescr("~", A3a.Compiler.opType.prefix, {priority:A3a.Compiler.opPriority.pre, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return ~args[0];
  });
}, bytecode:[A3a.vm.bc.unaryOpBitNot]}), new A3a.Compiler.OperatorDescr("!", A3a.Compiler.opType.prefix, {priority:A3a.Compiler.opPriority.pre, resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0] == 0 ? 1 : 0;
  });
}, bytecode:[A3a.vm.bc.smallImmediate << 12 | 0, A3a.vm.bc.binaryOpEqual]}), new A3a.Compiler.OperatorDescr("bool", A3a.Compiler.opType.prefix, {priority:A3a.Compiler.opPriority.pre, resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0] != 0 ? 1 : 0;
  });
}, bytecode:[], generateA3aBC:function(node, compiler) {
  var bc = node.children[0].generateA3aBC(compiler);
  if (node.children[0].resultType !== A3a.Compiler.resultType.boolean) {
    bc = bc.concat(A3a.vm.bc.smallImmediate << 12 | 0, A3a.vm.bc.binaryOpNotEqual);
  }
  return bc;
}}), new A3a.Compiler.OperatorDescr("fixed", A3a.Compiler.opType.prefix, {priority:A3a.Compiler.opPriority.pre, resultType:A3a.Compiler.resultType.fixed, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0];
  });
}, bytecode:[], generateA3aBC:function(node, compiler) {
  var bc = node.children[0].generateA3aBC(compiler);
  if (node.children[0].resultType !== A3a.Compiler.resultType.fixed) {
    bc = bc.concat(A3a.vm.bc.smallImmediate << 12 | compiler.factor, A3a.vm.bc.binaryOpMult);
  }
  return bc;
}}), new A3a.Compiler.OperatorDescr("int", A3a.Compiler.opType.prefix, {priority:A3a.Compiler.opPriority.pre, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0];
  });
}, bytecode:[], generateA3aBC:function(node, compiler) {
  var bc = node.children[0].generateA3aBC(compiler);
  if (node.children[0].resultType === A3a.Compiler.resultType.fixed) {
    bc = bc.concat(A3a.vm.bc.smallImmediate << 12 | compiler.factor, A3a.vm.bc.binaryOpDiv);
  }
  return bc;
}}), new A3a.Compiler.OperatorDescr("size", A3a.Compiler.opType.prefix, {priority:A3a.Compiler.opPriority.pre, optimize:function(node, compiler) {
  var size = node.children[0].valueSize > 0 ? node.children[0].valueSize : node.children[0] instanceof A3a.Compiler.NodeArray ? node.children[0].children.length : -1;
  if (size < 0 && node.children[0] instanceof A3a.Compiler.NodeVar) {
    for (var i = compiler.declaredVariables.length - 1; i >= 0; i--) {
      if (compiler.declaredVariables[i].name === node.children[0].name) {
        size = compiler.declaredVariables[i].size;
        break;
      }
    }
  }
  return size > 0 ? new A3a.Compiler.NodeNumber(node.head, size) : node;
}}), new A3a.Compiler.OperatorDescr("--", A3a.Compiler.opType.postfix, {priority:A3a.Compiler.opPriority.pre, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFirst}), new A3a.Compiler.OperatorDescr("++", A3a.Compiler.opType.postfix, {priority:A3a.Compiler.opPriority.pre, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFirst}), new A3a.Compiler.OperatorDescr("+=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFirst, 
optimize:A3a.Compiler.L2.optimizeAssignmentType}), new A3a.Compiler.OperatorDescr("-=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFirst}), new A3a.Compiler.OperatorDescr("*=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFirst}), new A3a.Compiler.OperatorDescr("/=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment, 
resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFirst}), new A3a.Compiler.OperatorDescr("%=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFirst}), new A3a.Compiler.OperatorDescr("<<=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment}), new A3a.Compiler.OperatorDescr(">>=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment}), new A3a.Compiler.OperatorDescr("&=", 
A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment}), new A3a.Compiler.OperatorDescr("|=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment}), new A3a.Compiler.OperatorDescr("^=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment}), new A3a.Compiler.OperatorDescr("*", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.mult, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFixed, bytecode:[A3a.vm.bc.binaryOpMult], optimize:function(node, 
compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0] * args[1];
  });
}, generateA3aBC:function(node, compiler) {
  var fx1 = node.children[0].resultType === A3a.Compiler.resultType.fixed;
  var fx2 = node.children[1].resultType === A3a.Compiler.resultType.fixed;
  var bc = [];
  if (fx1 && fx2) {
    bc = bc.concat(compiler.generateA3aMulDiv(node.children[0], node.children[1], compiler.factor));
  } else {
    node.children.forEach(function(arg) {
      bc = bc.concat(arg.generateA3aBC(compiler));
    });
    bc = bc.concat(node.operatorDescr.bytecode);
  }
  return bc;
}}), new A3a.Compiler.OperatorDescr("/", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.mult, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFixed, bytecode:[A3a.vm.bc.binaryOpDiv], optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    if (args[1] === 0) {
      throw "division by 0 " + node.head.posString();
    }
    return Math.trunc(args[0] / args[1]);
  }, function(args) {
    if (args[1] === 0) {
      throw "division by 0 " + node.head.posString();
    }
    return args[0] / args[1];
  });
}, generateA3aBC:function(node, compiler) {
  var fx1 = node.children[0].resultType === A3a.Compiler.resultType.fixed;
  var fx2 = node.children[1].resultType === A3a.Compiler.resultType.fixed;
  var bc = [];
  if (fx1) {
    if (fx2) {
      bc = bc.concat(compiler.generateA3aMulDiv(node.children[0], compiler.factor, node.children[1]));
    } else {
      node.children.forEach(function(arg) {
        bc = bc.concat(arg.generateA3aBC(compiler));
      });
      bc = bc.concat(node.operatorDescr.bytecode);
    }
  } else {
    if (fx2) {
      bc = bc.concat(compiler.generateA3aMulDiv(node.children[0], compiler.factor * compiler.factor, node.children[1]));
    } else {
      node.children.forEach(function(arg) {
        bc = bc.concat(arg.generateA3aBC(compiler));
      });
      bc = bc.concat(node.operatorDescr.bytecode);
    }
  }
  return bc;
}}), new A3a.Compiler.OperatorDescr("%", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.mult, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFixed, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    if (args[1] === 0) {
      throw "division by 0 " + node.head.posString();
    }
    return args[0] % args[1];
  });
}, bytecode:[A3a.vm.bc.binaryOpMod], generateA3aBC:function(node, compiler) {
  return A3a.Compiler.L2.generateA3aBCArgs(node.children, node.resultType, compiler).concat(node.operatorDescr.bytecode);
}}), new A3a.Compiler.OperatorDescr("+", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.add, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFixed, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0] + args[1];
  });
}, bytecode:[A3a.vm.bc.binaryOpAdd], generateA3aBC:function(node, compiler) {
  return A3a.Compiler.L2.generateA3aBCArgs(node.children, node.resultType, compiler).concat(node.operatorDescr.bytecode);
}}), new A3a.Compiler.OperatorDescr("-", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.add, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFixed, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0] - args[1];
  });
}, bytecode:[A3a.vm.bc.binaryOpSub], generateA3aBC:function(node, compiler) {
  return A3a.Compiler.L2.generateA3aBCArgs(node.children, node.resultType, compiler).concat(node.operatorDescr.bytecode);
}}), new A3a.Compiler.OperatorDescr("<<", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.shift, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0] << args[1];
  });
}, bytecode:[A3a.vm.bc.binaryOpShiftLeft], generateA3aBC:function(node, compiler) {
  return node.children[0].generateA3aBC(compiler).concat(A3a.Compiler.L2.generateA3aBCArgs(node.children.slice(1), A3a.Compiler.resultType.number, compiler)).concat(node.operatorDescr.bytecode);
}}), new A3a.Compiler.OperatorDescr(">>", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.shift, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0] >> args[1];
  });
}, bytecode:[A3a.vm.bc.binaryOpShiftRight], generateA3aBC:function(node, compiler) {
  return node.children[0].generateA3aBC(compiler).concat(A3a.Compiler.L2.generateA3aBCArgs(node.children.slice(1), A3a.Compiler.resultType.number, compiler)).concat(node.operatorDescr.bytecode);
}}), new A3a.Compiler.OperatorDescr("==", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.comp, resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0] === args[1] ? 1 : 0;
  });
}, bytecode:[A3a.vm.bc.binaryOpEqual], generateA3aBC:function(node, compiler) {
  var a = node.children.map(function(node) {
    return node.resultType;
  });
  return A3a.Compiler.L2.generateA3aBCArgs(node.children, A3a.Compiler.L2.resultTypePropagateFixed(compiler, node, a), compiler).concat(node.operatorDescr.bytecode);
}}), new A3a.Compiler.OperatorDescr("!=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.comp, resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0] !== args[1] ? 1 : 0;
  });
}, bytecode:[A3a.vm.bc.binaryOpNotEqual], generateA3aBC:function(node, compiler) {
  var a = node.children.map(function(node) {
    return node.resultType;
  });
  return A3a.Compiler.L2.generateA3aBCArgs(node.children, A3a.Compiler.L2.resultTypePropagateFixed(compiler, node, a), compiler).concat(node.operatorDescr.bytecode);
}}), new A3a.Compiler.OperatorDescr("<", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.comp, resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0] < args[1] ? 1 : 0;
  });
}, bytecode:[A3a.vm.bc.binaryOpLessThan], generateA3aBC:function(node, compiler) {
  var a = node.children.map(function(node) {
    return node.resultType;
  });
  return A3a.Compiler.L2.generateA3aBCArgs(node.children, A3a.Compiler.L2.resultTypePropagateFixed(compiler, node, a), compiler).concat(node.operatorDescr.bytecode);
}}), new A3a.Compiler.OperatorDescr("<=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.comp, resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0] <= args[1] ? 1 : 0;
  });
}, bytecode:[A3a.vm.bc.binaryOpLessEqThan], generateA3aBC:function(node, compiler) {
  var a = node.children.map(function(node) {
    return node.resultType;
  });
  return A3a.Compiler.L2.generateA3aBCArgs(node.children, A3a.Compiler.L2.resultTypePropagateFixed(compiler, node, a), compiler).concat(node.operatorDescr.bytecode);
}}), new A3a.Compiler.OperatorDescr(">", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.comp, resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0] > args[1] ? 1 : 0;
  });
}, bytecode:[A3a.vm.bc.binaryOpGreaterThan], generateA3aBC:function(node, compiler) {
  var a = node.children.map(function(node) {
    return node.resultType;
  });
  return A3a.Compiler.L2.generateA3aBCArgs(node.children, A3a.Compiler.L2.resultTypePropagateFixed(compiler, node, a), compiler).concat(node.operatorDescr.bytecode);
}}), new A3a.Compiler.OperatorDescr(">=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.comp, resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0] >= args[1] ? 1 : 0;
  });
}, bytecode:[A3a.vm.bc.binaryOpGreaterEqThan], generateA3aBC:function(node, compiler) {
  var a = node.children.map(function(node) {
    return node.resultType;
  });
  return A3a.Compiler.L2.generateA3aBCArgs(node.children, A3a.Compiler.L2.resultTypePropagateFixed(compiler, node, a), compiler).concat(node.operatorDescr.bytecode);
}}), new A3a.Compiler.OperatorDescr("&", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.binand, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0] & args[1];
  });
}, bytecode:[A3a.vm.bc.binaryOpBitAnd]}), new A3a.Compiler.OperatorDescr("|", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.binor, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0] | args[1];
  });
}, bytecode:[A3a.vm.bc.binaryOpBitOr]}), new A3a.Compiler.OperatorDescr("^", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.binxor, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0] ^ args[1];
  });
}, bytecode:[A3a.vm.bc.binaryOpBitXor]}), new A3a.Compiler.OperatorDescr("&&", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.and, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFirst, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0] && args[1] ? 1 : 0;
  });
}, bytecode:[A3a.vm.bc.binaryOpAnd], generateA3aBC:function(node, compiler) {
  var bc = node.children[0].generateA3aBC(compiler).concat([A3a.vm.bc.store << 12 | compiler.retValueOffset, A3a.vm.bc.load << 12 | compiler.retValueOffset, A3a.vm.bc.smallImmediate << 12 | 0, A3a.vm.bc.conditionalBranch << 12 | A3a.vm.condName.indexOf("eq"), 4, A3a.vm.bc.load << 12 | compiler.retValueOffset, A3a.vm.bc.jump << 12 | 0]);
  compiler.prepareJump(bc);
  var op2 = A3a.Compiler.L2.castNodeType(node.children[1], node.children[0].resultType, compiler).optimize(compiler);
  bc = bc.concat(op2.generateA3aBC(compiler));
  compiler.finalizeJump(bc);
  return bc;
}}), new A3a.Compiler.OperatorDescr("||", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.or, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFirst, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return args[0] || args[1] ? 1 : 0;
  });
}, bytecode:[A3a.vm.bc.binaryOpOr], generateA3aBC:function(node, compiler) {
  var bc = node.children[0].generateA3aBC(compiler).concat([A3a.vm.bc.store << 12 | compiler.retValueOffset, A3a.vm.bc.load << 12 | compiler.retValueOffset, A3a.vm.bc.smallImmediate << 12 | 0, A3a.vm.bc.conditionalBranch << 12 | A3a.vm.condName.indexOf("ne"), 4, A3a.vm.bc.load << 12 | compiler.retValueOffset, A3a.vm.bc.jump << 12 | 0]);
  compiler.prepareJump(bc);
  var op2 = A3a.Compiler.L2.castNodeType(node.children[1], node.children[0].resultType, compiler).optimize(compiler);
  bc = bc.concat(op2.generateA3aBC(compiler));
  compiler.finalizeJump(bc);
  return bc;
}}), new A3a.Compiler.OperatorDescr("?", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.conditional, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateSecond, optimize:function(node, compiler) {
  if (!(node.children[1] instanceof A3a.Compiler.NodeFun) || node.children[1].operatorDescr == 0 || node.children[1].operatorDescr.name !== ":") {
    throw "missing else part in conditional expression " + node.head.posString();
  }
  return node.children[0] instanceof A3a.Compiler.NodeNumber ? node.children[1].children[node.children[0].n ? 0 : 1] : node;
}, generateA3aBC:function(node, compiler) {
  var bc = node.children[0].generateA3aCondBranchBC(compiler);
  compiler.prepareJump(bc);
  bc = bc.concat(node.children[1].children[0].generateA3aBC(compiler)).concat(A3a.vm.bc.jump << 12 | 0);
  compiler.finalizeJump(bc);
  compiler.prepareJump(bc);
  bc = bc.concat(node.children[1].children[1].generateA3aBC(compiler));
  compiler.finalizeJump(bc);
  return bc;
}}), new A3a.Compiler.OperatorDescr(":", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.conditionalElse, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFirst, optimize:function(node, compiler) {
  node.children[1] = A3a.Compiler.L2.castNodeType(node.children[1], node.children[0].resultType, compiler);
  return node;
}, generateA3aBC:function(node, compiler) {
  throw "unexpected colon outside conditional expression " + node.head.posString();
}}), new A3a.Compiler.OperatorDescr("=", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.assignment, resultTypePropagate:A3a.Compiler.L2.resultTypePropagateFirst, optimize:A3a.Compiler.L2.optimizeAssignmentType}), new A3a.Compiler.OperatorDescr(",", A3a.Compiler.opType.infix, {priority:A3a.Compiler.opPriority.comma, resultTypePropagate:function(compiler, a) {
  return a[1];
}, optimize:function(node, compiler) {
  node.children[0].shouldProduceValue = false;
  return node;
}}), new A3a.Compiler.OperatorDescr("false", A3a.Compiler.opType.constant, {resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return 0;
  });
}, bytecode:[A3a.vm.bc.smallImmediate << 12]}), new A3a.Compiler.OperatorDescr("true", A3a.Compiler.opType.constant, {resultType:A3a.Compiler.resultType.boolean, optimize:function(node, compiler) {
  return A3a.Compiler.L2.optimizeConstFun(node, compiler, function(args) {
    return 1;
  });
}, bytecode:[A3a.vm.bc.smallImmediate << 12 | 1]})];
A3a.Compiler.L2.prototype.skipBlanks = function() {
  while (this.i < this.len) {
    if (this.src[this.i] === " " || this.src[this.i] === "\t") {
      this.i++;
      this.col++;
    } else {
      if (this.src[this.i] === "\n") {
        this.i++;
        this.col = 0;
        this.line++;
      } else {
        if (this.src[this.i] === "\r") {
          this.i++;
        } else {
          if (this.src.slice(this.i, this.i + 2) === "/*") {
            this.i += 2;
            this.col += 2;
            while (this.i < this.len && this.src.slice(this.i - 2, this.i) !== "*/") {
              if (this.src[this.i] === "\n") {
                this.col = 0;
                this.line++;
              } else {
                if (this.src[this.i] !== "\r") {
                  this.col++;
                }
              }
              this.i++;
            }
          } else {
            if (this.src.slice(this.i, this.i + 2) === "//") {
              while (this.i < this.len && this.src[this.i] !== "\n") {
                this.i++;
                this.col++;
              }
            } else {
              break;
            }
          }
        }
      }
    }
  }
};
A3a.Compiler.L2.prototype.buildTokenArray = function(keywords) {
  return A3a.Compiler.prototype.buildTokenArray.call(this, keywords || A3a.Compiler.L2.keywords);
};
A3a.Compiler.L2.prototype.processTokenArray = function() {
  this.tokens.forEach(function(token, i) {
    if (token instanceof A3a.Compiler.TokenKeyword && (token.name === "def" || ["int", "bool", "fixed", "void"].indexOf(token.name) >= 0) && this.tokens[i + 1] instanceof A3a.Compiler.TokenName && this.tokens[i + 2] instanceof A3a.Compiler.TokenKeyword && this.tokens[i + 2].name === "(") {
      this.def.push(this.tokens[i + 1].name);
    }
  }, this);
};
A3a.Compiler.L2.tokenToType = function(token, defaultType) {
  switch(token.name) {
    case "var":
    case "def":
      return defaultType || A3a.Compiler.resultType.number;
    case "void":
      return A3a.Compiler.resultType.void;
    case "int":
      return A3a.Compiler.resultType.number;
    case "bool":
      return A3a.Compiler.resultType.boolean;
    case "fixed":
      return A3a.Compiler.resultType.fixed;
    default:
      throw "internal";
  }
};
A3a.Compiler.L2.typeToKeyword = function(resultType) {
  switch(resultType) {
    case A3a.Compiler.resultType.number:
      return "int";
    case A3a.Compiler.resultType.fixed:
      return "fixed";
    case A3a.Compiler.resultType.boolean:
      return "bool";
    default:
      return "";
  }
};
A3a.Compiler.L2.prototype.checkTokenTypeKeyword = function(offset) {
  return this.checkTokenKeyword(offset, "int") || this.checkTokenKeyword(offset, "bool") || this.checkTokenKeyword(offset, "fixed");
};
A3a.Compiler.L2.prototype.parseNextStatement = function() {
  if (this.tokenIndex >= this.tokens.length) {
    throw "no more tokens";
  }
  var node;
  var expr;
  var expr2;
  var expr3;
  var args;
  var name;
  var head = this.tokens[this.tokenIndex];
  function parseVariableDeclaration() {
    var statements = [];
    for (this.tokenIndex++;;) {
      name = this.tokens[this.tokenIndex];
      this.tokenIndex++;
      if (!this.checkTokenType(0, A3a.Compiler.TokenKeyword)) {
        throw "syntax error " + head.posString();
      }
      switch(this.tokens[this.tokenIndex].name) {
        case "[":
          if (this.checkTokenKeyword(1, "]")) {
            this.tokenIndex += 2;
            if (!this.checkTokenKeyword(0, "=")) {
              throw "missing size or initial value in array declaration" + this.tokens[this.tokenIndex - 2].posString();
            }
            expr = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex], A3a.Compiler.opType.infix, this.getOperator("=", A3a.Compiler.opType.infix), [new A3a.Compiler.NodeVar(name)]);
            this.tokenIndex++;
            expr.children.push(this.parseExpression(A3a.Compiler.opPriority.comma));
            expr.resultType = A3a.Compiler.L2.tokenToType(head, expr.children[1].resultType);
            expr.children[1].resolveArraySize(this);
            expr.shouldProduceValue = false;
            var sizeExpr = new A3a.Compiler.NodeFun(new A3a.Compiler.TokenKeyword(this.tokens[this.tokenIndex].srcIndex, this.tokens[this.tokenIndex].srcLine, this.tokens[this.tokenIndex].srcCol, "size"), A3a.Compiler.opType.prefix, this.getOperator("size", A3a.Compiler.opType.prefix), [expr.children[1]]);
            statements.push(new A3a.Compiler.NodeStatementVar(head, name, expr.resultType, [sizeExpr], expr));
          } else {
            var sizeExpr = this.parseArguments(true);
            if (this.checkTokenKeyword(0, "=")) {
              expr = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex], A3a.Compiler.opType.infix, this.getOperator("=", A3a.Compiler.opType.infix), [new A3a.Compiler.NodeVar(name)]);
              this.tokenIndex++;
              expr.children.push(this.parseExpression(A3a.Compiler.opPriority.comma));
              expr.resultType = A3a.Compiler.L2.tokenToType(head, expr.children[1].resultType);
              expr.shouldProduceValue = false;
              statements.push(new A3a.Compiler.NodeStatementVar(head, name, expr.resultType, sizeExpr, expr));
            } else {
              statements.push(new A3a.Compiler.NodeStatementVar(head, name, A3a.Compiler.L2.tokenToType(head), sizeExpr));
            }
          }
          break;
        case "=":
          expr = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex], A3a.Compiler.opType.infix, this.getOperator("=", A3a.Compiler.opType.infix), [new A3a.Compiler.NodeVar(name)]);
          this.tokenIndex++;
          expr.children.push(this.parseExpression(A3a.Compiler.opPriority.comma));
          expr.resultType = A3a.Compiler.L2.tokenToType(head, expr.children[1].resultType);
          expr.shouldProduceValue = false;
          expr = expr.optimize(this);
          statements.push(new A3a.Compiler.NodeStatementVar(head, name, expr.resultType, null, expr));
          break;
        default:
          statements.push(new A3a.Compiler.NodeStatementVar(head, name, A3a.Compiler.L2.tokenToType(head)));
          break;
      }
      if (this.checkTokenKeyword(0, ",")) {
        this.tokenIndex++;
      } else {
        if (this.checkTokenKeyword(0, ";")) {
          this.tokenIndex++;
          return statements;
        } else {
          throw "missing semicolon " + this.tokens[this.tokenIndex].posString();
        }
      }
    }
  }
  function parseFunctionDefinition() {
    var resultType = A3a.Compiler.L2.tokenToType(head);
    name = this.tokens[this.tokenIndex + 1];
    this.tokenIndex += 3;
    var args = [];
    if (!this.checkTokenKeyword(0, ")")) {
      while (true) {
        var argType = A3a.Compiler.resultType.number;
        if (this.checkTokenTypeKeyword(0)) {
          argType = A3a.Compiler.L2.tokenToType(this.tokens[this.tokenIndex]);
          this.tokenIndex++;
        }
        if (!this.checkTokenType(0, A3a.Compiler.TokenName)) {
          throw "bad function definition argument " + this.tokens[this.tokenIndex].posString();
        }
        var varNameToken = this.tokens[this.tokenIndex].name;
        var varDimsExpr = [];
        var varIsRef = false;
        this.tokenIndex++;
        if (this.checkTokenKeyword(0, "[")) {
          varIsRef = true;
          varDimsExpr = this.parseArguments(true);
        }
        args.push({name:varNameToken, type:argType, dimsExpr:varDimsExpr, size:1, dims:[], isRef:varIsRef});
        if (this.checkTokenKeyword(0, ",")) {
          this.tokenIndex++;
        } else {
          if (this.checkTokenKeyword(0, ")")) {
            break;
          } else {
            throw "syntax error in function definition " + this.tokens[this.tokenIndex].posString();
          }
        }
      }
    }
    this.tokenIndex++;
    if (!this.checkTokenKeyword(0, "{")) {
      throw "block expected after function header " + this.tokens[this.tokenIndex].posString();
    }
    this.tokenIndex++;
    return new A3a.Compiler.L2.NodeStatementDef(head, name.name, resultType, args);
  }
  if (this.tokens[this.tokenIndex] instanceof A3a.Compiler.TokenKeyword) {
    switch(head.name) {
      case "const":
        if (!this.checkTokenType(1, A3a.Compiler.TokenName) || !this.checkTokenKeyword(2, "=")) {
          throw 'syntax error for "const" ' + head.posString();
        }
        name = this.tokens[this.tokenIndex + 1];
        this.tokenIndex += 3;
        expr = this.parseExpression(A3a.Compiler.opPriority.comma);
        expr = expr.optimize(this);
        if (!(expr instanceof A3a.Compiler.NodeNumber)) {
          throw "non-constant expression in constant definition " + this.tokens[this.tokenIndex].posString();
        }
        if (!this.checkTokenKeyword(0, ";")) {
          throw "missing semicolon " + head.posString();
        }
        this.tokenIndex++;
        return [new A3a.Compiler.NodeStatementConst(head, name.name, expr)];
      case "int":
      case "bool":
      case "fixed":
        if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
          throw 'unexpected token after "' + head.name + '" ' + head.posString();
        }
        return this.checkTokenKeyword(2, "(") ? [parseFunctionDefinition.call(this)] : parseVariableDeclaration.call(this);
      case "void":
        return [parseFunctionDefinition.call(this)];
      case "if":
        this.tokenIndex++;
        args = this.parseArguments();
        if (args.length !== 1) {
          throw 'bad condition in "if" statement ' + this.tokens[this.tokenIndex].posString();
        }
        node = new A3a.Compiler.NodeStatementIf(head, args[0]);
        if (this.checkTokenKeyword(0, "{")) {
          this.tokenIndex++;
        } else {
          node.implicitEnd = true;
        }
        return [node];
      case "when":
        this.tokenIndex++;
        args = this.parseArguments();
        if (args.length !== 1) {
          throw 'bad condition in "when" statement ' + this.tokens[this.tokenIndex].posString();
        }
        if (!this.checkTokenKeyword(0, "{")) {
          throw 'block expected after "when" statement ' + this.tokens[this.tokenIndex].posString();
        }
        this.tokenIndex++;
        return [new A3a.Compiler.NodeStatementWhen(head, args[0])];
      case "switch":
        this.tokenIndex++;
        args = this.parseArguments();
        if (args.length !== 1) {
          throw 'bad expression in "switch" statement ' + this.tokens[this.tokenIndex].posString();
        }
        if (!this.checkTokenKeyword(0, "{")) {
          throw 'block expected after "switch" statement ' + this.tokens[this.tokenIndex].posString();
        }
        this.tokenIndex++;
        return [new A3a.Compiler.L2.NodeStatementSwitch(head, args[0])];
      case "case":
        this.tokenIndex++;
        expr = this.parseExpression();
        if (!this.checkTokenKeyword(0, ":")) {
          throw 'missing colon after "case" ' + this.tokens[this.tokenIndex].posString();
        }
        this.tokenIndex++;
        return [new A3a.Compiler.L2.NodeStatementCase(head, expr)];
      case "default":
        if (!this.checkTokenKeyword(1, ":")) {
          throw 'missing colon after "default" ' + this.tokens[this.tokenIndex].posString();
        }
        this.tokenIndex += 2;
        return [new A3a.Compiler.L2.NodeStatementCase(head, null)];
      case "goto":
        if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
          throw 'missing label after "goto" ' + this.tokens[this.tokenIndex].posString();
        }
        name = this.tokens[this.tokenIndex + 1];
        this.tokenIndex += 2;
        return [new A3a.Compiler.L2.NodeStatementGoto(head, name.name)];
      case "while":
        this.tokenIndex++;
        args = this.parseArguments();
        if (args.length !== 1) {
          throw 'bad condition in "while" statement ' + this.tokens[this.tokenIndex].posString();
        }
        if (this.checkTokenKeyword(0, ";")) {
          this.tokenIndex++;
          return [new A3a.Compiler.L2.NodeStatementEndWhile(head, args[0])];
        }
        if (!this.checkTokenKeyword(0, "{")) {
          throw 'block expected after "while" statement ' + this.tokens[this.tokenIndex].posString();
        }
        this.tokenIndex++;
        return [new A3a.Compiler.L2.NodeStatementWhile(head, args[0])];
      case "do":
        if (!this.checkTokenKeyword(1, "{")) {
          throw 'block expected after "do" statement ' + this.tokens[this.tokenIndex].posString();
        }
        this.tokenIndex += 2;
        return [new A3a.Compiler.L2.NodeStatementDoWhile(head)];
      case "for":
        if (!this.checkTokenKeyword(1, "(")) {
          throw '"for" syntax error ' + head.posString();
        }
        this.tokenIndex += 2;
        name = null;
        var resultType = A3a.Compiler.resultType.number;
        if (this.checkTokenKeyword(0, ";")) {
          expr = null;
        } else {
          if (this.checkTokenKeyword(0, "var") || this.checkTokenTypeKeyword(0)) {
            if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
              throw 'bad variable declaration in "for" statement ' + this.tokens[this.tokenIndex].posString();
            }
            resultType = A3a.Compiler.L2.tokenToType(this.tokens[this.tokenIndex]);
            this.tokenIndex++;
            name = this.tokens[this.tokenIndex];
          }
          expr = this.parseExpression();
          if (!this.checkTokenKeyword(0, ";")) {
            throw 'semicolon expected in "for" statement ' + this.tokens[this.tokenIndex].posString();
          }
        }
        this.tokenIndex++;
        if (this.checkTokenKeyword(0, ";")) {
          expr2 = null;
        } else {
          expr2 = this.parseExpression();
          if (!this.checkTokenKeyword(0, ";")) {
            throw 'semicolon expected in "for" statement ' + this.tokens[this.tokenIndex].posString();
          }
        }
        this.tokenIndex++;
        if (this.checkTokenKeyword(0, ")")) {
          expr3 = null;
        } else {
          expr3 = this.parseExpression();
          if (!this.checkTokenKeyword(0, ")")) {
            throw 'semicolon expected in "for" statement ' + this.tokens[this.tokenIndex].posString();
          }
        }
        this.tokenIndex++;
        if (!this.checkTokenKeyword(0, "{")) {
          throw 'block expected after "for" statement ' + this.tokens[this.tokenIndex].posString();
        }
        this.tokenIndex++;
        return [new A3a.Compiler.L2.NodeStatementFor(head, name, resultType, expr, expr2, expr3)];
      case ";":
        this.tokenIndex++;
        return [new A3a.Compiler.L2.NodeStatementEmpty(head)];
      case "{":
        this.tokenIndex++;
        return [new A3a.Compiler.L2.NodeStatementBlock(head)];
      case "}":
        this.tokenIndex++;
        if (this.checkTokenKeyword(0, "else")) {
          this.tokenIndex++;
          if (this.checkTokenKeyword(0, "if")) {
            this.tokenIndex++;
            args = this.parseArguments();
            if (args.length < 1) {
              throw 'empty condition in "if" statement ' + this.tokens[this.tokenIndex].posString();
            } else {
              if (args.length > 1) {
                node = new A3a.Compiler.NodeStatementSequence(head);
                node.children = args.slice(0, -1).map(function(expr) {
                  if (expr instanceof A3a.Compiler.NodeFun) {
                    expr.shouldProduceValue = false;
                  }
                  return expr;
                });
                args = args.slice(-1);
              }
            }
            if (!this.checkTokenKeyword(0, "{")) {
              throw 'block expected after "if" statement ' + this.tokens[this.tokenIndex].posString();
            }
            this.tokenIndex++;
            return [new A3a.Compiler.NodeStatementElseif(head, args[0])];
          } else {
            if (!this.checkTokenKeyword(0, "{")) {
              throw 'block expected after "else" statement ' + this.tokens[this.tokenIndex].posString();
            }
            this.tokenIndex++;
            return [new A3a.Compiler.NodeStatementElse(head)];
          }
        }
        return [new A3a.Compiler.NodeStatementEnd(head)];
      case "else":
        throw 'unexpected "else" ' + this.tokens[this.tokenIndex].posString();
      case "onevent":
        if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
          throw 'unexpected token after "onevent" ' + head.posString();
        } else {
          if (!this.checkTokenKeyword(2, "{")) {
            throw 'block expected after "onevent" statement ' + this.tokens[this.tokenIndex].posString();
          }
        }
        name = this.tokens[this.tokenIndex + 1];
        this.tokenIndex += 3;
        return [new A3a.Compiler.L2.NodeStatementOnevent(head, name.name)];
      case "return":
        this.tokenIndex++;
        if (!this.checkTokenKeyword(0, ";")) {
          expr = this.parseExpression();
        } else {
          expr = null;
        }
        if (!this.checkTokenKeyword(0, ";")) {
          throw "missing semicolon " + head.posString();
        }
        this.tokenIndex++;
        return [new A3a.Compiler.L2.NodeStatementReturn(head, expr)];
      case "break":
        name = null;
        if (this.checkTokenType(1, A3a.Compiler.TokenName)) {
          name = this.tokens[this.tokenIndex + 1];
          this.tokenIndex++;
        }
        if (!this.checkTokenKeyword(1, ";")) {
          throw "missing semicolon " + head.posString();
        }
        this.tokenIndex += 2;
        return [new A3a.Compiler.L2.NodeStatementBreak(head, false, name ? name.name : null)];
      case "continue":
        name = null;
        if (this.checkTokenType(1, A3a.Compiler.TokenName)) {
          name = this.tokens[this.tokenIndex + 1];
          this.tokenIndex++;
        }
        if (!this.checkTokenKeyword(1, ";")) {
          throw "missing semicolon " + head.posString();
        }
        this.tokenIndex += 2;
        return [new A3a.Compiler.L2.NodeStatementBreak(head, true, name ? name.name : null)];
    }
  }
  if (this.checkTokenType(0, A3a.Compiler.TokenName) && this.checkTokenKeyword(1, "(")) {
    name = this.tokens[this.tokenIndex];
    if (this.asebaNode.findNativeFunction(name.name)) {
      this.tokenIndex++;
      return [new A3a.Compiler.NodeStatementCall(head, name.name, this.parseArguments())];
    }
  }
  if (this.checkTokenType(0, A3a.Compiler.TokenName) && this.checkTokenKeyword(1, ":")) {
    name = this.tokens[this.tokenIndex];
    this.tokenIndex += 2;
    return [new A3a.Compiler.L2.NodeStatementLabel(head, name.name)];
  }
  expr = this.parseExpression();
  expr.shouldProduceValue = false;
  if (!this.checkTokenKeyword(0, ";")) {
    throw "missing semicolon " + (this.tokenIndex < this.tokens.length ? this.tokens[this.tokenIndex].posString() : "eof");
  }
  this.tokenIndex++;
  expr = expr.optimize(this);
  return [new A3a.Compiler.NodeStatementExpression(expr)];
};
A3a.Compiler.L2.prototype.addVariableOrConstantDef = function(statement) {
  if (statement instanceof A3a.Compiler.L2.NodeStatementDef) {
    for (var i = 0; i < statement.args.length; i++) {
      statement.args[i].size = 1;
      statement.args[i].dims = statement.args[i].dimsExpr.map(function(d) {
        d = d.optimize(this);
        if (!(d instanceof A3a.Compiler.NodeNumber)) {
          throw "non-constant expression in argument dimension " + d.head.posString();
        } else {
          if (d.n <= 0 || Math.round(d.n) !== d.n) {
            throw "bad value for argument dimension " + d.head.posString();
          }
        }
        statement.args[i].size *= d.n;
        return d.n;
      }, this);
      this.addVariable(statement.args[i].name, statement.args[i].size, statement.args[i].dims, this.varSize, statement.args[i].type, statement.args[i].isRef);
      this.varSize += statement.args[i].isRef ? 1 : statement.args[i].size;
    }
    statement.contexts[1] = {declaredVariables:this.declaredVariables.slice(), labels:this.labels.slice()};
  } else {
    if (statement instanceof A3a.Compiler.L2.NodeStatementFor) {
      if (statement.varDecl) {
        this.addVariable(statement.varDecl.name, 1, [1], this.varSize, statement.varType);
        this.varSize += 1;
        statement.contexts[1] = {declaredVariables:this.declaredVariables.slice(), labels:this.labels.slice()};
      }
    } else {
      A3a.Compiler.prototype.addVariableOrConstantDef.call(this, statement);
    }
  }
};
A3a.Compiler.L2.prototype.resetContext = function() {
  this.declaredVariables = this.globalVariables;
  this.labels = this.globalLabels;
};
A3a.Compiler.L2.prototype.setContext = function(context) {
  if (context) {
    this.declaredVariables = context.declaredVariables;
    this.labels = context.labels;
  }
};
A3a.Compiler.L2.prototype.getContext = function() {
  return {declaredVariables:this.declaredVariables, labels:this.labels.slice()};
};
A3a.Compiler.L2.VariableDescr = function(name, size, dims, offset, resultType, inFunction, isRef) {
  A3a.Compiler.VariableDescr.call(this, name, size, dims, offset, resultType);
  this.inFunction = inFunction;
  this.isRef = isRef || false;
};
A3a.Compiler.L2.VariableDescr.prototype = Object.create(A3a.Compiler.VariableDescr.prototype);
A3a.Compiler.L2.VariableDescr.prototype.constructor = A3a.Compiler.L2.VariableDescr;
A3a.Compiler.L2.VariableDescr.prototype.generateA3aBCForLoad = function(compiler, offset) {
  return this.inFunction ? this.isRef ? [A3a.vm.bc.load << 12 | compiler.frameOffset, A3a.vm.bc.loadIndirect << 12 | this.offset, compiler.asebaNode.maxVarSize, A3a.vm.bc.loadIndirect << 12 | (offset || 0), compiler.asebaNode.maxVarSize] : [A3a.vm.bc.load << 12 | compiler.frameOffset, A3a.vm.bc.loadIndirect << 12 | this.offset + (offset || 0), compiler.asebaNode.maxVarSize] : [A3a.vm.bc.load << 12 | this.offset + (offset || 0)];
};
A3a.Compiler.L2.VariableDescr.prototype.generateA3aBCForStore = function(compiler, offset) {
  return this.inFunction ? this.isRef ? [A3a.vm.bc.load << 12 | compiler.frameOffset, A3a.vm.bc.loadIndirect << 12 | this.offset, compiler.asebaNode.maxVarSize, A3a.vm.bc.storeIndirect << 12 | (offset || 0), compiler.asebaNode.maxVarSize] : [A3a.vm.bc.load << 12 | compiler.frameOffset, A3a.vm.bc.storeIndirect << 12 | this.offset + (offset || 0), compiler.asebaNode.maxVarSize] : [A3a.vm.bc.store << 12 | this.offset + (offset || 0)];
};
A3a.Compiler.L2.VariableDescr.prototype.generateA3aBCForRef = function(compiler) {
  return this.inFunction ? this.isRef ? [A3a.vm.bc.load << 12 | compiler.frameOffset, A3a.vm.bc.loadIndirect << 12 | this.offset, compiler.asebaNode.maxVarSize] : [A3a.vm.bc.load << 12 | compiler.frameOffset, A3a.vm.bc.smallImmediate << 12 | this.offset, A3a.vm.bc.binaryOpAdd] : [A3a.vm.bc.smallImmediate << 12 | this.offset];
};
A3a.Compiler.L2.VariableDescr.prototype.generateA3aBCForLoadIndirect = function(compiler) {
  return this.inFunction ? this.isRef ? [A3a.vm.bc.load << 12 | compiler.frameOffset, A3a.vm.bc.loadIndirect << 12 | this.offset, compiler.asebaNode.maxVarSize, A3a.vm.bc.binaryOpAdd, A3a.vm.bc.loadIndirect << 12 | 0, compiler.asebaNode.maxVarSize] : [A3a.vm.bc.load << 12 | compiler.frameOffset, A3a.vm.bc.binaryOpAdd, A3a.vm.bc.loadIndirect << 12 | this.offset, compiler.asebaNode.maxVarSize] : [A3a.vm.bc.loadIndirect << 12 | this.offset, this.size];
};
A3a.Compiler.L2.VariableDescr.prototype.generateA3aBCForStoreIndirect = function(compiler) {
  return this.inFunction ? this.isRef ? [A3a.vm.bc.load << 12 | compiler.frameOffset, A3a.vm.bc.loadIndirect << 12 | this.offset, compiler.asebaNode.maxVarSize, A3a.vm.bc.binaryOpAdd, A3a.vm.bc.storeIndirect << 12 | 0, compiler.asebaNode.maxVarSize] : [A3a.vm.bc.load << 12 | compiler.frameOffset, A3a.vm.bc.binaryOpAdd, A3a.vm.bc.storeIndirect << 12 | this.offset, compiler.asebaNode.maxVarSize] : [A3a.vm.bc.storeIndirect << 12 | this.offset, this.size];
};
A3a.Compiler.L2.prototype.addVariable = function(name, size, dims, offset, resultType, isRef) {
  this.declaredVariables.push(new A3a.Compiler.L2.VariableDescr(name, size, dims, offset, resultType, this.inFunction, isRef));
};
A3a.Compiler.L2.NodeFun = function(funToken, inFunction, varSize) {
  A3a.Compiler.NodeFun.call(this, funToken, A3a.Compiler.opType.fun, null);
};
A3a.Compiler.L2.NodeFun.prototype = Object.create(A3a.Compiler.NodeFun.prototype);
A3a.Compiler.L2.NodeFun.prototype.constructor = A3a.Compiler.L2.NodeFun;
A3a.Compiler.L2.prototype.makeFunCallNode = function(funToken) {
  var nodeFun = new A3a.Compiler.L2.NodeFun(funToken, this.inFunction, this.varSize);
  nodeFun.operatorDescr = {resultTypePropagate:function(compiler, a) {
    var fun = compiler.findFunction(funToken.name);
    if (fun) {
      return fun.resultType;
    }
    var macroFunctionDef = compiler.getMacroFunctionDef(funToken.name);
    if (macroFunctionDef && macroFunctionDef.resultTypePropagate) {
      return macroFunctionDef.resultTypePropagate(compiler, macroFunctionDef, a);
    }
    return A3a.Compiler.resultType.number;
  }};
  return nodeFun;
};
A3a.Compiler.L2.prototype.allocateVariables = function() {
  this.varSize = this.asebaNode.varSize;
  this.inFunction = false;
  var context = [];
  for (var i = 0; i < this.statements.length; i++) {
    if ([A3a.Compiler.NodeStatementEnd, A3a.Compiler.NodeStatementElseif, A3a.Compiler.NodeStatementElse].indexOf(this.statements[i].constructor) >= 0) {
      if (context.length === 0) {
        throw "unexpected end of block " + this.statements[i].head.posString();
      }
      var ctx = context.pop();
      this.varSize = ctx.varSize;
      this.inFunction = ctx.inFunction;
      ctx.statementBegin.contexts[0] = {declaredVariables:this.declaredVariables.slice(), labels:this.labels.slice()};
      this.declaredVariables.splice(ctx.varDeclCount);
      this.labels.pop();
      if (context.length === 0) {
        this.functionResultType = A3a.Compiler.resultType.undef;
      }
    }
    if ([A3a.Compiler.NodeStatementIf, A3a.Compiler.NodeStatementWhen, A3a.Compiler.L2.NodeStatementSwitch, A3a.Compiler.L2.NodeStatementWhile, A3a.Compiler.L2.NodeStatementBlock, A3a.Compiler.L2.NodeStatementFor, A3a.Compiler.L2.NodeStatementOnevent, A3a.Compiler.L2.NodeStatementDef, A3a.Compiler.NodeStatementElseif, A3a.Compiler.NodeStatementElse].indexOf(this.statements[i].constructor) >= 0) {
      context.push({varSize:this.varSize, inFunction:this.inFunction, varDeclCount:this.declaredVariables.length, statementBegin:this.statements[i]});
      this.labels.push([]);
      if (this.statements[i] instanceof A3a.Compiler.L2.NodeStatementDef) {
        this.inFunction = true;
        this.functionResultType = this.statements[i].resultType;
        this.varSize = 0;
      }
    }
    this.addVariableOrConstantDef(this.statements[i]);
    if (this.statements[i] instanceof A3a.Compiler.L2.NodeStatementLabel) {
      this.createLabel(this.statements[i].label);
    }
  }
  this.globalVariables = this.declaredVariables.slice();
  this.globalLabels = this.labels;
};
A3a.Compiler.L2.prototype.processStatementArray = function() {
  for (var i = 1; i < this.statements.length;) {
    if (this.statements[i] instanceof A3a.Compiler.L2.NodeStatementEndWhile && this.statements[i - 1] instanceof A3a.Compiler.NodeStatementEnd) {
      this.statements.splice(i - 1, 1);
    } else {
      i++;
    }
  }
  this.statements.forEach(function(statement) {
    if (statement instanceof A3a.Compiler.L2.NodeStatementDef) {
      this.functionDefinitions.push(statement);
      this.functionResultType = statement.resultType;
    }
  }, this);
  for (var i = 0; i < this.statements.length - 1; i++) {
    if (this.statements[i] instanceof A3a.Compiler.L2.NodeStatementLabel) {
      if (this.statements[i + 1] instanceof A3a.Compiler.L2.NodeStatementWhile) {
        this.statements[i + 1].label = this.statements[i].label;
      } else {
        if (this.statements[i + 1] instanceof A3a.Compiler.L2.NodeStatementDoWhile) {
          this.statements[i + 1].label = this.statements[i].label;
        } else {
          if (this.statements[i + 1] instanceof A3a.Compiler.L2.NodeStatementFor) {
            this.statements[i + 1].label = this.statements[i].label;
          } else {
            if (this.statements[i + 1] instanceof A3a.Compiler.L2.NodeStatementSwitch) {
              this.statements[i + 1].label = this.statements[i].label;
            }
          }
        }
      }
    }
  }
};
A3a.Compiler.L2.prototype.processTree = function() {
  for (var i = 0; i < this.statements.length; i++) {
    if (this.statements[i] instanceof A3a.Compiler.L2.NodeStatementOnevent || this.statements[i] instanceof A3a.Compiler.L2.NodeStatementDef) {
      this.codeBlocks.push(this.statements[i]);
    }
  }
};
A3a.Compiler.L2.prototype.findFunction = function(funName) {
  for (var i = 0; i < this.functionDefinitions.length; i++) {
    if (this.functionDefinitions[i].funName === funName) {
      return this.functionDefinitions[i];
    }
  }
  return null;
};
A3a.Compiler.L2.prototype.createLabel = function(label) {
  var i = this.labels.length - 1;
  for (var j = 0; j < this.labels[i].length; j++) {
    if (this.labels[i][j].label === label) {
      throw 'duplicate label "' + label + '"';
    }
  }
  this.labels[i].push({label:label});
};
A3a.Compiler.L2.findLabel = function(labels, label) {
  for (var i = labels.length - 1; i >= 0; i--) {
    for (var j = labels[i].length - 1; j >= 0; j--) {
      if (labels[i][j].label === label) {
        return labels[i][j];
      }
    }
  }
  return null;
};
A3a.Compiler.L2.prototype.generateA3aBC = function() {
  this.resetJumpResolution();
  this.resetContext();
  this.sourceToBCMapping = [];
  this.retValueOffset = this.allocPermanentAuxVariable(2);
  this.frameOffset = this.retValueOffset + 1;
  this.startupBytecode = [];
  var codeBlockBC = this.codeBlocks.map(function(block) {
    this.bcAddr = 0;
    this.setContext(block.contexts[0]);
    this.inSubDefinition = block instanceof A3a.Compiler.NodeStatementSub || block instanceof A3a.Compiler.L2.NodeStatementDef;
    this.inFunction = block instanceof A3a.Compiler.L2.NodeStatementDef;
    this.sourceToBCMapping = [];
    var bc = block.generateA3aBC(this, true);
    A3a.Compiler.resolveCodePlaceholders(bc);
    return {bc:bc, mapping:this.sourceToBCMapping};
  }, this);
  if (this.branches.length > 0) {
    throw "internal";
  }
  var nEvents = 0;
  for (var i = 0; i < this.codeBlocks.length; i++) {
    if (this.codeBlocks[i] instanceof A3a.Compiler.NodeStatementOnevent) {
      nEvents++;
    }
  }
  var eventBlocks = [];
  var subBlocks = {};
  var bc = [];
  this.sourceToBCMapping = [];
  for (var i = 0; i < this.codeBlocks.length; i++) {
    var addr0 = 1 + 2 * nEvents + bc.length;
    if (this.codeBlocks[i] instanceof A3a.Compiler.L2.NodeStatementOnevent || this.codeBlocks[i] instanceof A3a.Compiler.NodeStatementOnevent) {
      eventBlocks.push({id:this.asebaNode.eventNameToId(this.codeBlocks[i].eventName), offset:bc.length});
      bc = bc.concat(codeBlockBC[i].bc);
    } else {
      if (this.codeBlocks[i] instanceof A3a.Compiler.NodeStatementSub) {
        subBlocks[this.codeBlocks[i].subName] = bc.length;
        bc = bc.concat(codeBlockBC[i].bc);
      } else {
        if (this.codeBlocks[i] instanceof A3a.Compiler.L2.NodeStatementDef) {
          subBlocks[this.codeBlocks[i].funName] = bc.length;
          bc = bc.concat(codeBlockBC[i].bc);
        }
      }
    }
    this.sourceToBCMapping = this.sourceToBCMapping.concat(codeBlockBC[i].mapping.map(function(m) {
      return new A3a.Compiler.SourceToBCMapping(m.srcOffset, m.line, m.col, m.addr + addr0);
    }));
  }
  var bc0 = [1 + 2 * eventBlocks.length];
  for (var i = 0; i < eventBlocks.length; i++) {
    bc0 = bc0.concat(eventBlocks[i].id, 1 + 2 * eventBlocks.length + eventBlocks[i].offset);
  }
  for (var i = 0; i < bc.length; i++) {
    if (typeof bc[i] === "string") {
      if (subBlocks[bc[i]] === undefined) {
        A3a.Compiler.L2.NodeStatementBreak.errorOnLabelMark(bc[i]);
        throw 'unknown function "' + bc[i] + '"';
      }
      bc[i] = A3a.vm.bc.subCall << 12 | subBlocks[bc[i]] + bc0.length;
    }
  }
  return bc0.concat(bc);
};
A3a.Compiler.L2.prototype.generateA3aBCForFunction = function(node) {
  var name = node.head.name;
  for (var i = 0; i < this.codeBlocks.length; i++) {
    if (this.codeBlocks[i] instanceof A3a.Compiler.L2.NodeStatementDef && this.codeBlocks[i].funName === name) {
      if (node.children.length !== this.codeBlocks[i].args.length) {
        throw "wrong number of arguments " + node.head.posString();
      }
      var bc = node.shouldProduceValue ? [name, A3a.vm.bc.load << 12 | this.retValueOffset] : [name];
      if (!this.inFunction) {
        bc = [A3a.vm.bc.smallImmediate << 12 | this.varSize, A3a.vm.bc.store << 12 | this.frameOffset].concat(bc);
      } else {
        if (this.varSize > 0) {
          bc = [A3a.vm.bc.load << 12 | this.frameOffset, A3a.vm.bc.smallImmediate << 12 | this.varSize, A3a.vm.bc.binaryOpAdd, A3a.vm.bc.store << 12 | this.frameOffset].concat(bc).concat(A3a.vm.bc.load << 12 | this.frameOffset, A3a.vm.bc.smallImmediate << 12 | this.varSize, A3a.vm.bc.binaryOpSub, A3a.vm.bc.store << 12 | this.frameOffset);
        }
      }
      var bcArg = [];
      for (var j = 0; j < node.children.length; j++) {
        if (this.codeBlocks[i].args[j].size !== node.children[j].valueSize) {
          throw "incompatible size " + node.children[j].head.posString();
        } else {
          if (this.codeBlocks[i].args[j].isRef) {
            if (!(node.children[j] instanceof A3a.Compiler.NodeVar)) {
              throw "variable reference expected " + node.children[j].head.posString();
            } else {
              if (this.codeBlocks[i].args[j].type !== node.children[j].resultType) {
                throw "variable reference type mismatch " + node.children[j].head.posString();
              }
            }
          }
        }
        if (this.codeBlocks[i].args[j].isRef) {
          var varDescr = this.getVariable(node.children[j]);
          bcArg = bcArg.concat(varDescr.generateA3aBCForRef(this)).concat(this.inFunction ? [A3a.vm.bc.load << 12 | this.frameOffset, A3a.vm.bc.storeIndirect << 12 | j + this.varSize, this.asebaNode.maxVarSize] : A3a.vm.bc.store << 12 | j + this.varSize);
        } else {
          node.children[j] = A3a.Compiler.L2.castNodeType(node.children[j], this.codeBlocks[i].args[j].type, this).optimize(this);
          bcArg = bcArg.concat(node.children[j].generateA3aBC(this)).concat(this.generateA3aBCForTypeConversion(node.children[j].resultType, this.codeBlocks[i].args[j].type)).concat(this.inFunction ? [A3a.vm.bc.load << 12 | this.frameOffset, A3a.vm.bc.storeIndirect << 12 | j + this.varSize, this.asebaNode.maxVarSize] : A3a.vm.bc.store << 12 | j + this.varSize);
        }
      }
      return bcArg.concat(bc);
    }
  }
  return null;
};
A3a.Compiler.L2.isL2 = function(src) {
  src = src.trim();
  if (src === "") {
    return false;
  }
  var commentIndex = ["#", "//", "/*"].map(function(c) {
    var i = src.indexOf(c);
    return i < 0 ? src.length : i;
  }).sort(function(a, b) {
    return a - b;
  })[0];
  if (commentIndex < src.length) {
    return src[commentIndex] !== "#";
  }
  return /[;{]/.test(src);
};
A3a.Compiler.NodeFixed.defaultFactor = 100;
A3a.Compiler.NodeFixed.prototype.generateA3aBC = function(compiler, isTopLevel) {
  return A3a.Compiler.NodeNumber.generateA3aBC(Math.round(this.n * compiler.factor));
};
A3a.Compiler.L2.NodeStatementBlock = function(head) {
  A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
  this.linkedStatements = [];
};
A3a.Compiler.L2.NodeStatementBlock.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementBlock.prototype.constructor = A3a.Compiler.L2.NodeStatementBlock;
A3a.Compiler.L2.NodeStatementBlock.prototype.optimize = function(compiler) {
  A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
  return this;
};
A3a.Compiler.L2.NodeStatementBlock.prototype.generateA3aBC = function(compiler, isTopLevel) {
  var baseContext = compiler.getContext();
  this.prepareGenerateA3aBC(compiler);
  compiler.setContext(this.contexts[0]);
  var bc = A3a.Compiler.Node.prototype.generateA3aBC.call(this, compiler);
  compiler.setContext(baseContext);
  return bc;
};
A3a.Compiler.L2.NodeStatementEmpty = function(head) {
  A3a.Compiler.NodeStatement.call(this, head);
};
A3a.Compiler.L2.NodeStatementEmpty.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementEmpty.prototype.constructor = A3a.Compiler.L2.NodeStatementEmpty;
A3a.Compiler.L2.NodeStatementEmpty.prototype.generateA3aBC = function(compiler, isTopLevel) {
  return [];
};
A3a.Compiler.L2.NodeStatementWhile = function(head, condition) {
  A3a.Compiler.NodeStatementWhile.call(this, head, condition);
  this.label = null;
};
A3a.Compiler.L2.NodeStatementWhile.prototype = Object.create(A3a.Compiler.NodeStatementWhile.prototype);
A3a.Compiler.L2.NodeStatementWhile.prototype.constructor = A3a.Compiler.L2.NodeStatementWhile;
A3a.Compiler.L2.NodeStatementWhile.prototype.generateA3aBC = function(compiler, isTopLevel) {
  if (this.condition == null && this.children.length === 0) {
    return [];
  }
  var baseContext = compiler.getContext();
  this.prepareGenerateA3aBC(compiler);
  var bc = [];
  var bcAddr0 = compiler.bcAddr;
  compiler.loops.push({});
  if (this.condition != null) {
    bc = this.condition.generateA3aCondBranchBC(compiler);
  }
  compiler.prepareJump(bc);
  compiler.setContext(this.contexts[0]);
  this.children.forEach(function(st) {
    compiler.bcAddr = bcAddr0 + bc.length;
    bc = bc.concat(st.generateA3aBC(compiler));
  });
  bc = bc.concat(A3a.vm.bc.jump << 12 | -bc.length & 4095);
  compiler.finalizeJump(bc);
  A3a.Compiler.L2.NodeStatementBreak.resolveBreakJumps(bc, 0, bc.length, this.label);
  compiler.loops.pop();
  compiler.setContext(baseContext);
  return bc;
};
A3a.Compiler.L2.NodeStatementDoWhile = function(head) {
  A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
  this.condition = null;
  this.label = null;
  this.linkedStatements = [];
};
A3a.Compiler.L2.NodeStatementDoWhile.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementDoWhile.prototype.constructor = A3a.Compiler.L2.NodeStatementDoWhile;
A3a.Compiler.L2.NodeStatementDoWhile.prototype.processEndStatement = function(st) {
  if (!(st instanceof A3a.Compiler.L2.NodeStatementEndWhile)) {
    throw 'unexpected closing statement for "do"';
  }
  this.condition = st.condition;
};
A3a.Compiler.L2.NodeStatementDoWhile.prototype.generateA3aBC = function(compiler, isTopLevel) {
  if (this.condition == null && this.children.length === 0) {
    return [];
  }
  var baseContext = compiler.getContext();
  this.prepareGenerateA3aBC(compiler);
  var bc = [];
  var bcAddr0 = compiler.bcAddr;
  compiler.loops.push({});
  compiler.setContext(this.contexts[0]);
  this.children.forEach(function(st) {
    compiler.bcAddr = bcAddr0 + bc.length;
    bc = bc.concat(st.generateA3aBC(compiler));
  });
  if (this.condition != null) {
    var cond = new A3a.Compiler.NodeFun(new A3a.Compiler.TokenKeyword(this.condition.head.srcIndex, this.condition.head.srcLine, this.condition.head.srcCol, "not"), A3a.Compiler.opType.prefix, compiler.getOperator("!", A3a.Compiler.opType.prefix), [this.condition]);
    bc = bc.concat(cond.generateA3aCondBranchBC(compiler));
    compiler.prepareJump(bc);
    compiler.finalizeJump(bc, 0);
  }
  A3a.Compiler.L2.NodeStatementBreak.resolveBreakJumps(bc, 0, bc.length, this.label);
  compiler.loops.pop();
  compiler.setContext(baseContext);
  return bc;
};
A3a.Compiler.L2.NodeStatementEndWhile = function(head, expr) {
  A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.end);
  this.condition = expr;
};
A3a.Compiler.L2.NodeStatementEndWhile.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementEndWhile.prototype.constructor = A3a.Compiler.L2.NodeStatementEndWhile;
A3a.Compiler.L2.NodeStatementFor = function(head, varDecl, varType, expr1, expr2, expr3) {
  A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
  if (expr1) {
    expr1.shouldProduceValue = false;
  }
  if (expr3) {
    expr3.shouldProduceValue = false;
  }
  this.varDecl = varDecl;
  this.varType = varType;
  this.expr1 = expr1;
  this.expr2 = expr2;
  this.expr3 = expr3;
  this.label = null;
  this.linkedStatements = [];
};
A3a.Compiler.L2.NodeStatementFor.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementFor.prototype.constructor = A3a.Compiler.L2.NodeStatementFor;
A3a.Compiler.L2.NodeStatementFor.prototype.resolveArraySize = function(compiler) {
  A3a.Compiler.Node.prototype.resolveArraySize.call(this, compiler);
  if (this.expr1) {
    this.expr1.resolveArraySize(compiler);
  }
  if (this.expr2) {
    this.expr2.resolveArraySize(compiler);
  }
  if (this.expr3) {
    this.expr3.resolveArraySize(compiler);
  }
};
A3a.Compiler.L2.NodeStatementFor.prototype.optimize = function(compiler) {
  if (this.expr1) {
    this.expr1 = this.expr1.optimize(compiler);
  }
  if (this.expr2) {
    this.expr2 = this.expr2.optimize(compiler);
  }
  if (this.expr3) {
    this.expr3 = this.expr3.optimize(compiler);
  }
  A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
  return this;
};
A3a.Compiler.L2.NodeStatementFor.prototype.postProcess = function(compiler, st) {
  this.linkedStatements.push(st);
};
A3a.Compiler.L2.NodeStatementFor.prototype.generateA3aBC = function(compiler, isTopLevel) {
  var baseContext = compiler.getContext();
  this.prepareGenerateA3aBC(compiler);
  compiler.setContext(this.contexts[1]);
  var bcAddr0 = compiler.bcAddr;
  var bc = this.expr1 ? this.expr1.generateA3aBC(compiler) : [];
  compiler.loops.push({});
  var beg = bc.length;
  if (this.expr2) {
    bc = bc.concat(this.expr2.generateA3aCondBranchBC(compiler));
    compiler.prepareJump(bc);
  }
  compiler.setContext(this.contexts[0]);
  for (var i = 0; i < this.children.length; i++) {
    compiler.bcAddr = bcAddr0 + bc.length;
    bc = bc.concat(this.children[i].generateA3aBC(compiler));
  }
  compiler.setContext(this.contexts[1]);
  var contTarget = bc.length;
  compiler.bcAddr = bcAddr0 + bc.length;
  compiler.addSourceToBCMapping(this.linkedStatements[0]);
  if (this.expr3) {
    bc = bc.concat(this.expr3.generateA3aBC(compiler));
  }
  bc = bc.concat(A3a.vm.bc.jump << 12 | beg - bc.length & 4095);
  if (this.expr2) {
    compiler.finalizeJump(bc);
  }
  A3a.Compiler.L2.NodeStatementBreak.resolveBreakJumps(bc, contTarget, bc.length, this.label);
  compiler.loops.pop();
  compiler.setContext(baseContext);
  return bc;
};
A3a.Compiler.L2.NodeStatementBreak = function(head, isContinue, label) {
  A3a.Compiler.NodeStatement.call(this, head);
  this.isContinue = isContinue;
  this.label = label;
};
A3a.Compiler.L2.NodeStatementBreak.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementBreak.prototype.constructor = A3a.Compiler.L2.NodeStatementBreak;
A3a.Compiler.L2.CodePlaceholderBreak = function(compiler, statement) {
  A3a.Compiler.CodePlaceholder.call(this, compiler, statement);
};
A3a.Compiler.L2.CodePlaceholderBreak.prototype = Object.create(A3a.Compiler.CodePlaceholder.prototype);
A3a.Compiler.L2.CodePlaceholderBreak.prototype.constructor = A3a.Compiler.L2.CodePlaceholderBreak;
A3a.Compiler.L2.NodeStatementBreak.resolveBreakJumps = function(bc, continueAddr, breakAddr, label) {
  for (var i = 0; i < bc.length; i++) {
    if (bc[i] instanceof A3a.Compiler.L2.CodePlaceholderBreak) {
      var phlabel = bc[i].statement.label;
      if (phlabel == null || phlabel === label) {
        if (bc[i].statement.isContinue) {
          bc[i] = A3a.vm.bc.jump << 12 | continueAddr - i & 4095;
        } else {
          bc[i] = A3a.vm.bc.jump << 12 | breakAddr - i & 4095;
        }
      }
    }
  }
};
A3a.Compiler.L2.NodeStatementBreak.errorOnLabelMark = function(op) {
  if (op instanceof A3a.Compiler.L2.CodePlaceholderBreak) {
    var label = op.statement.label;
    if (label != null) {
      throw "unknown " + (op.statement.isContinue ? "continue" : "break") + ' label "' + label + '"' + op.statement.head.posString();
    } else {
      throw 'unexpected "' + (op.statement.isContinue ? "continue" : "break") + '" ' + op.statement.head.posString();
    }
  }
};
A3a.Compiler.L2.NodeStatementBreak.prototype.generateA3aBC = function(compiler, isTopLevel) {
  if (compiler.loops.length === 0) {
    throw (this.isContinue ? '"continue"' : '"break"') + " outside loop " + this.head.posString();
  }
  this.prepareGenerateA3aBC(compiler);
  return [new A3a.Compiler.L2.CodePlaceholderBreak(compiler, this)];
};
A3a.Compiler.L2.NodeStatementSwitch = function(head, expr) {
  A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
  this.expr = expr;
  this.label = null;
  this.linkedStatements = [];
};
A3a.Compiler.L2.NodeStatementSwitch.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementSwitch.prototype.constructor = A3a.Compiler.L2.NodeStatementSwitch;
A3a.Compiler.L2.NodeStatementSwitch.prototype.generateA3aBC = function(compiler, isTopLevel) {
  var bcAddr0 = compiler.bcAddr;
  var bc = this.expr.generateA3aBC(compiler).concat(A3a.vm.bc.store << 12 | compiler.retValueOffset);
  var baseContext = compiler.getContext();
  compiler.setContext(this.contexts[0]);
  var hasJumpChain = !(this.children[0] instanceof A3a.Compiler.L2.NodeStatementCase);
  if (hasJumpChain) {
    bc = bc.concat(A3a.vm.bc.jump << 12 | 0);
    compiler.prepareJump(bc);
  }
  compiler.loops.push({});
  var fallThrough = false;
  for (var i = 0; i < this.children.length;) {
    compiler.bcAddr = bcAddr0 + bc.length;
    if (this.children[i] instanceof A3a.Compiler.L2.NodeStatementCase) {
      var c = [];
      var hasDefault = false;
      while (i < this.children.length && this.children[i] instanceof A3a.Compiler.L2.NodeStatementCase) {
        if (this.children[i].expr != null) {
          var expr = this.children[i].expr.optimize(compiler);
          if (!(expr instanceof A3a.Compiler.NodeNumber)) {
            throw 'non-constant expression in "case" ' + this.children[i].head.posString();
          }
          c.push(expr.n);
        } else {
          hasDefault = true;
        }
        i++;
      }
      if (hasDefault) {
        if (hasJumpChain) {
          compiler.finalizeJump(bc);
          hasJumpChain = false;
        }
      } else {
        if (c.length === 1) {
          if (fallThrough) {
            bc = bc.concat(A3a.vm.bc.jump << 12 | 5);
          }
          if (hasJumpChain) {
            compiler.finalizeJump(bc);
          }
          bc = bc.concat(A3a.vm.bc.load << 12 | compiler.retValueOffset).concat(A3a.Compiler.NodeNumber.generateA3aBC(c[0])).concat(A3a.vm.bc.conditionalBranch << 12 | A3a.vm.condName.indexOf("eq"), 0);
          compiler.prepareJump(bc);
          hasJumpChain = true;
        } else {
          if (fallThrough) {
            bc = bc.concat(A3a.vm.bc.jump << 12 | 4 * c.length + 1);
          }
          if (hasJumpChain) {
            compiler.finalizeJump(bc);
          }
          c.forEach(function(c1, j) {
            bc = bc.concat(A3a.vm.bc.load << 12 | compiler.retValueOffset).concat(A3a.Compiler.NodeNumber.generateA3aBC(c1)).concat(A3a.vm.bc.conditionalBranch << 12 | A3a.vm.condName.indexOf("ne"), 4 * (c.length - j) - 1);
          });
          bc = bc.concat(A3a.vm.bc.jump << 12 | 0);
          compiler.prepareJump(bc);
          hasJumpChain = true;
        }
      }
      fallThrough = true;
    } else {
      bc = bc.concat(this.children[i].generateA3aBC(compiler));
      fallThrough = !(this.children[i] instanceof A3a.Compiler.L2.NodeStatementBreak) && !(this.children[i] instanceof A3a.Compiler.L2.NodeStatementReturn);
      i++;
    }
  }
  A3a.Compiler.L2.NodeStatementBreak.resolveBreakJumps(bc, -1, bc.length, this.label);
  compiler.loops.pop();
  compiler.setContext(baseContext);
  return bc;
};
A3a.Compiler.L2.NodeStatementCase = function(head, expr) {
  A3a.Compiler.NodeStatement.call(this, head);
  this.expr = expr;
};
A3a.Compiler.L2.NodeStatementCase.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementCase.prototype.constructor = A3a.Compiler.L2.NodeStatementCase;
A3a.Compiler.L2.NodeStatementCase.prototype.generateA3aBC = function(compiler, isTopLevel) {
  throw (this.expr ? '"case"' : '"default"') + " outside switch " + this.head.posString();
};
A3a.Compiler.L2.NodeStatementLabel = function(head, label) {
  A3a.Compiler.NodeStatement.call(this, head);
  this.label = label;
};
A3a.Compiler.L2.NodeStatementLabel.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementLabel.prototype.constructor = A3a.Compiler.L2.NodeStatementLabel;
A3a.Compiler.L2.NodeStatementLabel.prototype.generateA3aBC = function(compiler, isTopLevel) {
  compiler.label = this.label;
  A3a.Compiler.L2.findLabel(compiler.labels, this.label).address = compiler.bcAddr;
  return [];
};
A3a.Compiler.L2.NodeStatementGoto = function(head, label) {
  A3a.Compiler.NodeStatement.call(this, head);
  this.label = label;
};
A3a.Compiler.L2.NodeStatementGoto.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementGoto.prototype.constructor = A3a.Compiler.L2.NodeStatementGoto;
A3a.Compiler.L2.CodePlaceholderGoto = function(compiler, statement, labels) {
  A3a.Compiler.CodePlaceholder.call(this, compiler, statement);
  this.labels = labels;
};
A3a.Compiler.L2.CodePlaceholderGoto.prototype = Object.create(A3a.Compiler.CodePlaceholder.prototype);
A3a.Compiler.L2.CodePlaceholderGoto.prototype.constructor = A3a.Compiler.L2.CodePlaceholderGoto;
A3a.Compiler.L2.CodePlaceholderGoto.prototype.generateA3aBC = function(addr) {
  var label = A3a.Compiler.L2.findLabel(this.labels, this.statement.label);
  if (label === null) {
    throw 'unknown label "' + this.statement.label + '" ' + this.statement.head.posString();
  }
  return A3a.vm.bc.jump << 12 | label.address - addr & 4095;
};
A3a.Compiler.L2.NodeStatementGoto.prototype.generateA3aBC = function(compiler, isTopLevel) {
  return [new A3a.Compiler.L2.CodePlaceholderGoto(compiler, this, compiler.labels.slice())];
};
A3a.Compiler.L2.NodeStatementOnevent = function(head, eventName) {
  A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
  this.eventName = eventName;
  this.linkedStatements = [];
};
A3a.Compiler.L2.NodeStatementOnevent.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementOnevent.prototype.constructor = A3a.Compiler.L2.NodeStatementOnevent;
A3a.Compiler.L2.NodeStatementOnevent.prototype.optimize = function(compiler) {
  A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
  return this;
};
A3a.Compiler.L2.NodeStatementOnevent.prototype.generateA3aBC = function(compiler, isTopLevel) {
  if (isTopLevel) {
    var baseContext = compiler.getContext();
    this.prepareGenerateA3aBC(compiler);
    compiler.setContext(this.contexts[0]);
    var bc = A3a.Compiler.Node.prototype.generateA3aBC.call(this, compiler).concat(A3a.vm.bc.stop << 12);
    compiler.setContext(baseContext);
    return bc;
  } else {
    return [];
  }
};
A3a.Compiler.L2.NodeStatementDef = function(head, funName, resultType, args) {
  A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
  this.funName = funName;
  this.resultType = resultType;
  this.args = args;
  this.linkedStatements = [];
};
A3a.Compiler.L2.NodeStatementDef.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementDef.prototype.constructor = A3a.Compiler.L2.NodeStatementDef;
A3a.Compiler.L2.NodeStatementDef.argDescription;
A3a.Compiler.L2.NodeStatementDef.prototype.processBeginStatement = function(compiler) {
  compiler.functionResultType = this.resultType;
};
A3a.Compiler.L2.NodeStatementDef.prototype.optimize = function(compiler) {
  A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
  return this;
};
A3a.Compiler.L2.NodeStatementDef.prototype.generateA3aBC = function(compiler, isTopLevel) {
  if (isTopLevel) {
    var baseContext = compiler.getContext();
    this.prepareGenerateA3aBC(compiler);
    compiler.setContext(this.contexts[0]);
    var bc = A3a.Compiler.Node.prototype.generateA3aBC.call(this, compiler).concat(A3a.vm.bc.ret << 12);
    compiler.setContext(baseContext);
    return bc;
  } else {
    return [];
  }
};
A3a.Compiler.L2.NodeStatementReturn = function(head, val) {
  A3a.Compiler.NodeStatement.call(this, head);
  if (val) {
    this.children.push(val);
  }
};
A3a.Compiler.L2.NodeStatementReturn.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementReturn.prototype.constructor = A3a.Compiler.L2.NodeStatementReturn;
A3a.Compiler.L2.NodeStatementReturn.prototype.postProcess = function(compiler, st) {
  if (compiler.functionResultType === A3a.Compiler.resultType.undef) {
    throw '"return" outside function definition ' + this.head.posString();
  } else {
    if (compiler.functionResultType === A3a.Compiler.resultType.void && this.children.length > 0) {
      throw "unexpected return value in void function " + this.head.posString();
    } else {
      if (compiler.functionResultType !== A3a.Compiler.resultType.void && this.children.length === 0) {
        throw "missing return value in non-void function " + this.head.posString();
      }
    }
  }
  if (this.children.length > 0) {
    this.children[0] = A3a.Compiler.L2.castNodeType(this.children[0], compiler.functionResultType, compiler).optimize(compiler);
  }
};
A3a.Compiler.L2.NodeStatementReturn.prototype.generateA3aBC = function(compiler, isTopLevel) {
  this.prepareGenerateA3aBC(compiler);
  var bc = [];
  if (this.children.length > 0) {
    bc = this.children[0].generateA3aBC(compiler).concat(compiler.generateA3aBCForTypeConversion(this.children[0].resultType, compiler.functionResultType)).concat(A3a.vm.bc.store << 12 | compiler.retValueOffset);
  }
  return bc.concat(A3a.vm.bc.ret << 12);
};
A3a.A3aNode.stdMacrosL2 = [{name:"abs", nArgs:1, resultTypePropagate:function(compiler, argTypes) {
  return argTypes[0];
}, exists:function(asebaNode) {
  return true;
}, genCode:function(compiler, asebaNode, argTypes, argsAddr) {
  return [A3a.vm.bc.load << 12 | argsAddr, A3a.vm.bc.unaryOpAbs];
}}, {name:"atan2", nArgs:2, nTmp:1, resultTypePropagate:function(compiler, argTypes) {
  return A3a.Compiler.resultType.fixed;
}, exists:function(asebaNode) {
  return asebaNode.findNativeFunction("math.atan2") != null;
}, genCode:function(compiler, asebaNode, argTypes, argsAddr) {
  var bc = argTypes[0] === A3a.Compiler.resultType.fixed && argTypes[1] !== A3a.Compiler.resultType.fixed ? [A3a.vm.bc.load << 12 | argsAddr + 1, A3a.vm.bc.smallImmediate << 12 | compiler.factor, A3a.vm.bc.binaryOpMult, A3a.vm.bc.store << 12 | argsAddr + 1] : argTypes[0] !== A3a.Compiler.resultType.fixed && argTypes[1] === A3a.Compiler.resultType.fixed ? [A3a.vm.bc.load << 12 | argsAddr, A3a.vm.bc.smallImmediate << 12 | compiler.factor, A3a.vm.bc.binaryOpMult, A3a.vm.bc.store << 12 | argsAddr] : 
  [];
  return bc.concat([A3a.vm.bc.smallImmediate << 12 | 1, A3a.vm.bc.smallImmediate << 12 | argsAddr + 1, A3a.vm.bc.smallImmediate << 12 | argsAddr, A3a.vm.bc.smallImmediate << 12 | argsAddr + 2, A3a.vm.bc.nativeCall << 12 | asebaNode.findNativeFunction("math.atan2").id, A3a.vm.bc.load << 12 | argsAddr + 2, A3a.vm.bc.smallImmediate << 12 | Math.floor(32768 / (compiler.factor * Math.PI)), A3a.vm.bc.binaryOpDiv]);
}}, {name:"cos", nArgs:1, nTmp:1, resultTypePropagate:function(compiler, argTypes) {
  return A3a.Compiler.resultType.fixed;
}, exists:function(asebaNode) {
  return asebaNode.findNativeFunction("math.cos") != null;
}, genCode:function(compiler, asebaNode, argTypes, argsAddr) {
  return [A3a.vm.bc.load << 12 | argsAddr, A3a.vm.bc.smallImmediate << 12 | Math.round(32767 / ((argTypes[0] === A3a.Compiler.resultType.fixed ? compiler.factor : 1) * Math.PI)), A3a.vm.bc.binaryOpMult, A3a.vm.bc.store << 12 | argsAddr, A3a.vm.bc.smallImmediate << 12 | 1, A3a.vm.bc.smallImmediate << 12 | argsAddr, A3a.vm.bc.smallImmediate << 12 | argsAddr + 1, A3a.vm.bc.nativeCall << 12 | asebaNode.findNativeFunction("math.cos").id, A3a.vm.bc.load << 12 | argsAddr + 1, A3a.vm.bc.smallImmediate << 
  12 | Math.floor(32768 / compiler.factor), A3a.vm.bc.binaryOpDiv];
}}, A3a.A3aNode.macroMath("rand", "math.rand", 0), {name:"random", nArgs:0, nTmp:1, resultTypePropagate:function(compiler, argTypes) {
  return A3a.Compiler.resultType.fixed;
}, exists:function(asebaNode) {
  return asebaNode.findNativeFunction("math.rand") != null;
}, genCode:function(compiler, asebaNode, argTypes, argsAddr) {
  return [A3a.vm.bc.smallImmediate << 12 | 1, A3a.vm.bc.smallImmediate << 12 | argsAddr, A3a.vm.bc.nativeCall << 12 | asebaNode.findNativeFunction("math.rand").id, A3a.vm.bc.load << 12 | argsAddr, A3a.vm.bc.unaryOpAbs, A3a.vm.bc.smallImmediate << 12 | Math.floor(32768 / compiler.factor), A3a.vm.bc.binaryOpDiv];
}}, {name:"stop", nArgs:0, resultTypePropagate:function(compiler, argTypes) {
  return A3a.Compiler.resultType.void;
}, genCode:function(compiler, asebaNode, argTypes, argsAddr) {
  return [A3a.vm.bc.stop];
}}, {name:"sin", nArgs:1, nTmp:1, resultTypePropagate:function(compiler, argTypes) {
  return A3a.Compiler.resultType.fixed;
}, exists:function(asebaNode) {
  return asebaNode.findNativeFunction("math.sin") != null;
}, genCode:function(compiler, asebaNode, argTypes, argsAddr) {
  return [A3a.vm.bc.load << 12 | argsAddr, A3a.vm.bc.smallImmediate << 12 | Math.round(32767 / ((argTypes[0] === A3a.Compiler.resultType.fixed ? compiler.factor : 1) * Math.PI)), A3a.vm.bc.binaryOpMult, A3a.vm.bc.store << 12 | argsAddr, A3a.vm.bc.smallImmediate << 12 | 1, A3a.vm.bc.smallImmediate << 12 | argsAddr, A3a.vm.bc.smallImmediate << 12 | argsAddr + 1, A3a.vm.bc.nativeCall << 12 | asebaNode.findNativeFunction("math.sin").id, A3a.vm.bc.load << 12 | argsAddr + 1, A3a.vm.bc.smallImmediate << 
  12 | Math.floor(32768 / compiler.factor), A3a.vm.bc.binaryOpDiv];
}}, {name:"sqrt", nArgs:1, nTmp:6, resultTypePropagate:function(compiler, argTypes) {
  return A3a.Compiler.resultType.fixed;
}, genCode:function(compiler, asebaNode, argTypes, argsAddr) {
  var k = argTypes[0] === A3a.Compiler.resultType.fixed ? compiler.factor : compiler.factor * compiler.factor;
  var bcPushK = A3a.Compiler.NodeNumber.generateA3aBC(k);
  return [A3a.vm.bc.smallImmediate << 12 | compiler.factor, A3a.vm.bc.store << 12 | argsAddr + 1, A3a.vm.bc.smallImmediate << 12 | 10, A3a.vm.bc.store << 12 | argsAddr + 2, A3a.vm.bc.load << 12 | argsAddr, A3a.vm.bc.store << 12 | argsAddr + 4].concat(bcPushK).concat([A3a.vm.bc.store << 12 | argsAddr + 5, A3a.vm.bc.load << 12 | argsAddr + 1, A3a.vm.bc.store << 12 | argsAddr + 6, A3a.vm.bc.smallImmediate << 12 | 1, A3a.vm.bc.smallImmediate << 12 | argsAddr + 6, A3a.vm.bc.smallImmediate << 12 | argsAddr + 
  5, A3a.vm.bc.smallImmediate << 12 | argsAddr + 4, A3a.vm.bc.smallImmediate << 12 | argsAddr + 3, A3a.vm.bc.nativeCall << 12 | compiler.asebaNode.findNativeFunction("math.muldiv").id, A3a.vm.bc.load << 12 | argsAddr + 3, A3a.vm.bc.load << 12 | argsAddr + 1, A3a.vm.bc.binaryOpAdd, A3a.vm.bc.smallImmediate << 12 | 2, A3a.vm.bc.binaryOpDiv, A3a.vm.bc.store << 12 | argsAddr + 1, A3a.vm.bc.load << 12 | argsAddr + 2, A3a.vm.bc.smallImmediate << 12 | 1, A3a.vm.bc.binaryOpSub, A3a.vm.bc.store << 12 | argsAddr + 
  2, A3a.vm.bc.load << 12 | argsAddr + 2, A3a.vm.bc.smallImmediate << 12 | 0, A3a.vm.bc.conditionalBranch << 12 | A3a.vm.condName.indexOf("le"), -(23 + bcPushK.length) & 65535, A3a.vm.bc.load << 12 | argsAddr + 1]);
}}];
A3a.thymioDescr = {"name":"thymio-II", "maxVarSize":620, "variables":[{"name":"_id", "size":1}, {"name":"event.source", "size":1}, {"name":"event.args", "size":32}, {"name":"_fwversion", "size":2}, {"name":"_productId", "size":1}, {"name":"buttons._raw", "size":5}, {"name":"button.backward", "size":1}, {"name":"button.left", "size":1}, {"name":"button.center", "size":1}, {"name":"button.forward", "size":1}, {"name":"button.right", "size":1}, {"name":"buttons._mean", "size":5}, {"name":"buttons._noise", 
"size":5}, {"name":"prox.horizontal", "size":7}, {"name":"prox.comm.rx._payloads", "size":7}, {"name":"prox.comm.rx._intensities", "size":7}, {"name":"prox.comm.rx", "size":1}, {"name":"prox.comm.tx", "size":1}, {"name":"prox.ground.ambiant", "size":2}, {"name":"prox.ground.reflected", "size":2}, {"name":"prox.ground.delta", "size":2}, {"name":"motor.left.target", "size":1}, {"name":"motor.right.target", "size":1}, {"name":"_vbat", "size":2}, {"name":"_imot", "size":2}, {"name":"motor.left.speed", 
"size":1}, {"name":"motor.right.speed", "size":1}, {"name":"motor.left.pwm", "size":1}, {"name":"motor.right.pwm", "size":1}, {"name":"_integrator", "size":2}, {"name":"acc", "size":3}, {"name":"leds.top", "size":3}, {"name":"leds.bottom.left", "size":3}, {"name":"leds.bottom.right", "size":3}, {"name":"leds.circle", "size":8}, {"name":"temperature", "size":1}, {"name":"rc5.address", "size":1}, {"name":"rc5.command", "size":1}, {"name":"mic.intensity", "size":1}, {"name":"mic.threshold", "size":1}, 
{"name":"mic._mean", "size":1}, {"name":"timer.period", "size":2}, {"name":"acc._tap", "size":1}, {"name":"sd.present", "size":1}], "localEvents":[{"name":"button.backward"}, {"name":"button.left"}, {"name":"button.center"}, {"name":"button.forward"}, {"name":"button.right"}, {"name":"buttons"}, {"name":"prox"}, {"name":"prox.comm"}, {"name":"tap"}, {"name":"acc"}, {"name":"mic"}, {"name":"sound.finished"}, {"name":"temperature"}, {"name":"rc5"}, {"name":"motor"}, {"name":"timer0"}, {"name":"timer1"}], 
"nativeFunctions":[{"name":"_system_reboot", "args":[]}, {"name":"_system_settings_read", "args":[1, 1]}, {"name":"_system_settings_write", "args":[1, 1]}, {"name":"_system_settings_flash", "args":[]}, {"name":"math.copy", "args":[-1, -1]}, {"name":"math.fill", "args":[-1, 1]}, {"name":"math.addscalar", "args":[-1, -1, 1]}, {"name":"math.add", "args":[-1, -1, -1]}, {"name":"math.sub", "args":[-1, -1, -1]}, {"name":"math.mul", "args":[-1, -1, -1]}, {"name":"math.div", "args":[-1, -1, -1]}, {"name":"math.min", 
"args":[-1, -1, -1]}, {"name":"math.max", "args":[-1, -1, -1]}, {"name":"math.clamp", "args":[-1, -1, -1, -1]}, {"name":"math.dot", "args":[1, -1, -1, 1]}, {"name":"math.stat", "args":[-1, 1, 1, 1]}, {"name":"math.argbounds", "args":[-1, 1, 1]}, {"name":"math.sort", "args":[-1]}, {"name":"math.muldiv", "args":[-1, -1, -1, -1]}, {"name":"math.atan2", "args":[-1, -1, -1]}, {"name":"math.sin", "args":[-1, -1]}, {"name":"math.cos", "args":[-1, -1]}, {"name":"math.rot2", "args":[2, 2, 1]}, {"name":"math.sqrt", 
"args":[-1, -1]}, {"name":"math.rand", "args":[-1]}, {"name":"_leds.set", "args":[1, 1]}, {"name":"sound.record", "args":[1]}, {"name":"sound.play", "args":[1]}, {"name":"sound.replay", "args":[1]}, {"name":"sound.system", "args":[1]}, {"name":"leds.circle", "args":[1, 1, 1, 1, 1, 1, 1, 1]}, {"name":"leds.top", "args":[1, 1, 1]}, {"name":"leds.bottom.left", "args":[1, 1, 1]}, {"name":"leds.bottom.right", "args":[1, 1, 1]}, {"name":"sound.freq", "args":[1, 1]}, {"name":"leds.buttons", "args":[1, 1, 
1, 1]}, {"name":"leds.prox.h", "args":[1, 1, 1, 1, 1, 1, 1, 1]}, {"name":"leds.prox.v", "args":[1, 1]}, {"name":"leds.rc", "args":[1]}, {"name":"leds.sound", "args":[1]}, {"name":"leds.temperature", "args":[1, 1]}, {"name":"sound.wave", "args":[142]}, {"name":"prox.comm.enable", "args":[1]}, {"name":"sd.open", "args":[1, 1]}, {"name":"sd.write", "args":[-1, 1]}, {"name":"sd.read", "args":[-1, 1]}, {"name":"sd.seek", "args":[1, 1]}, {"name":"_rf.nodeid", "args":[1]}, {"name":"_poweroff", "args":[]}]};
A3a.Assembler = function(asebaNode, src) {
  this.asebaNode = asebaNode;
  this.src = src;
};
A3a.Assembler.prototype.nodeDefinitions = function() {
  var defs = {};
  this.asebaNode.variables.forEach(function(v) {
    defs[v.name] = v.offset;
  });
  defs["_userdata"] = this.asebaNode.varSize;
  defs["_topdata"] = this.asebaNode.maxVarSize;
  defs["_ev.init"] = 65535;
  this.asebaNode.localEvents.forEach(function(ev, i) {
    defs["_ev." + ev.name] = 65534 - i;
  });
  this.asebaNode.nativeFunctions.forEach(function(nf) {
    defs["_nf." + nf.name] = nf.id;
  });
  return defs;
};
A3a.Assembler.prototype.assemble = function() {
  var lines = this.src.split("\n");
  var bytecode = [];
  var defs = this.nodeDefinitions();
  for (var pass = 0; pass < 2; pass++) {
    bytecode = [];
    var label = null;
    lines.forEach(function(line, i) {
      var re = /^\s*(;.*)?$/.exec(line);
      if (re) {
        return;
      }
      re = /^\s*([\w_.]+:)\s*(;.*)?$/i.exec(line);
      if (re) {
        label = re[1].slice(0, -1);
        defs[label] = bytecode.length;
        return;
      }
      re = /^\s*([\w_.]+:)?\s*([a-z0-9.]+)([-+a-z0-9\s._,=]*)(;.*)?$/i.exec(line);
      if (re) {
        if (re[1]) {
          label = re[1].slice(0, -1);
          defs[label] = bytecode.length;
        }
        var instrName = re[2];
        var instrArgs = re[3].trim();
        if (instrName) {
          var argsSplit = instrArgs.length > 0 ? instrArgs.split(",").map(function(s) {
            return s.trim().split(/\s+/);
          }) : [];
          argsSplit = [].concat.apply([], argsSplit);
          var instr = A3a.Assembler.instr[instrName];
          if (instr == undefined) {
            throw 'Unknown instruction "' + instrName + '" (line ' + (i + 1).toString(10) + ")";
          } else {
            if (instr.numArgs !== -1 && (instr.numArgs || 0) != argsSplit.length) {
              throw "Wrong number of arguments (line " + (i + 1).toString(10) + ")";
            }
          }
          if (instr.code !== undefined) {
            bytecode = bytecode.concat(instr.code);
          } else {
            if (instr.toCode) {
              var args = argsSplit.map(function(arg) {
                if (/^[a-z]+=/.test(arg)) {
                  arg = arg.replace(/^[a-z]+=/, "");
                }
                if (/^(0x[0-9a-f]+|[0-9]+)$/i.test(arg)) {
                  return parseInt(arg, 0);
                }
                return arg;
              });
              bytecode = bytecode.concat(instr.toCode(bytecode.length, args, label, defs, pass, i + 1));
            }
          }
          if (label && defs[label] !== bytecode.length) {
            label = null;
          }
        }
      } else {
        throw "Syntax error (line " + (i + 1).toString(10) + ")";
      }
    }, this);
  }
  return bytecode;
};
A3a.Assembler.resolveSymbol = function(arg, defs, required, line) {
  function resolveDef(name) {
    if (!required) {
      return 0;
    }
    if (/^(0x[0-9a-f]+|[0-9]+)$/i.test(name)) {
      return parseInt(name, 0);
    }
    if (!defs.hasOwnProperty(name)) {
      throw 'Unknown symbol "' + arg + '" (line ' + line.toString(10) + ")";
    }
    return defs[name];
  }
  if (typeof arg === "string") {
    var val = 0;
    var minus = false;
    for (var offset = 0; offset < arg.length;) {
      var frag = /^(\+|-|[._a-z0-9]+)/i.exec(arg.slice(offset));
      if (frag == null) {
        throw "Syntax error (line " + line.toString(10) + ")";
      }
      switch(frag[0]) {
        case "+":
          minus = false;
          break;
        case "-":
          minus = true;
          break;
        default:
          val += minus ? -resolveDef(frag[0]) : resolveDef(frag[0]);
          break;
      }
      offset += frag[0].length;
    }
    return val;
  }
  return arg;
};
A3a.Assembler.instr = {"dc":{numArgs:-1, toCode:function(pc, args, label, defs, pass, line) {
  return args.map(function(w) {
    w = A3a.Assembler.resolveSymbol(w, defs, pass === 1, line);
    return w & 65535;
  });
}}, "equ":{numArgs:1, toCode:function(pc, args, label, defs, pass, line) {
  if (!label) {
    throw 'No label for pseudo-instruction "equ" (line ' + line.toString(10) + ")";
  }
  if (defs) {
    defs[label] = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
  }
  return [];
}}, "stop":{code:[0]}, "push.s":{numArgs:1, toCode:function(pc, args, label, defs, pass, line) {
  var arg = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
  if (arg >= 2048 || -arg > 2048) {
    throw "Small integer overflow (line " + line.toString(10) + ")";
  }
  return [4096 | arg & 4095];
}}, "push":{numArgs:1, toCode:function(pc, args, label, defs, pass, line) {
  var arg = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
  if (arg >= 32768 || -arg > 32768) {
    throw "Integer overflow (line " + line.toString(10) + ")";
  }
  return [8192, arg & 65535];
}}, "load":{numArgs:1, toCode:function(pc, args, label, defs, pass, line) {
  var arg = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
  if (arg < 0 || arg >= 4096) {
    throw "Data address out of range (line " + line.toString(10) + ")";
  }
  return [12288 | arg & 4095];
}}, "store":{numArgs:1, toCode:function(pc, args, label, defs, pass, line) {
  var arg = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
  if (arg < 0 || arg >= 4096) {
    throw "Data address out of range (line " + line.toString(10) + ")";
  }
  return [16384 | arg & 4095];
}}, "load.ind":{numArgs:2, toCode:function(pc, args, label, defs, pass, line) {
  var arg = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
  if (arg < 0 || arg >= 4096) {
    throw "Data address out of range (line " + line.toString(10) + ")";
  }
  var sizeArg = A3a.Assembler.resolveSymbol(args[1], defs, pass === 1, line);
  if (sizeArg < 0 || sizeArg >= 65536) {
    throw "Array size overflow (line " + line.toString(10) + ")";
  }
  return [20480 | arg & 4095, sizeArg & 65535];
}}, "store.ind":{numArgs:2, toCode:function(pc, args, label, defs, pass, line) {
  var arg = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
  if (arg < 0 || arg >= 4096) {
    throw "Data address out of range (line " + line.toString(10) + ")";
  }
  var sizeArg = A3a.Assembler.resolveSymbol(args[1], defs, pass === 1, line);
  if (sizeArg < 0 || sizeArg >= 65536) {
    throw "Array size overflow (line " + line.toString(10) + ")";
  }
  return [24576 | arg & 4095, sizeArg & 65535];
}}, "neg":{code:[28672]}, "abs":{code:[28673]}, "bitnot":{code:[28674]}, "not":{toCode:function(pc, args, label, defs, pass, line) {
  throw "Unary not not implemented in the VM (line " + line.toString(10) + ")";
}}, "sl":{code:[32768]}, "asr":{code:[32769]}, "add":{code:[32770]}, "sub":{code:[32771]}, "mult":{code:[32772]}, "div":{code:[32773]}, "mod":{code:[32774]}, "bitor":{code:[32775]}, "bitxor":{code:[32776]}, "bitand":{code:[32777]}, "eq":{code:[32778]}, "ne":{code:[32779]}, "gt":{code:[32780]}, "ge":{code:[32781]}, "lt":{code:[32782]}, "le":{code:[32783]}, "or":{code:[32784]}, "and":{code:[32785]}, "jump":{numArgs:1, toCode:function(pc, args, label, defs, pass, line) {
  var arg = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
  if (arg - pc >= 2048 || pc - arg > 2048) {
    throw "Jump too far (line " + line.toString(10) + ")";
  }
  return [36864 | arg - pc & 4095];
}}, "jump.if.not":{numArgs:2, toCode:function(pc, args, label, defs, pass, line) {
  var testInstr = A3a.Assembler.instr[args[0]];
  if (testInstr == undefined || testInstr.code == undefined || testInstr.code.length !== 1 || (testInstr.code[0] & 61440) !== 32768) {
    throw 'Unknown op "' + args[0] + '" for jump.if.not (line ' + line.toString(10) + ")";
  }
  var arg = A3a.Assembler.resolveSymbol(args[1], defs, pass === 1, line);
  if (arg - pc >= 32768 || pc - arg > 32768) {
    throw "Jump too far (line " + line.toString(10) + ")";
  }
  return [40960 | testInstr.code[0] & 255, arg - pc & 65535];
}}, "do.jump.when.not":{numArgs:2, toCode:function(pc, args, label, defs, pass, line) {
  var testInstr = A3a.Assembler.instr[args[0]];
  if (testInstr == undefined || testInstr.code == undefined || testInstr.code.length !== 1 || (testInstr.code[0] & 61440) !== 32768) {
    throw 'Unknown op "' + args[0] + '" for do.jump.when.not (line ' + line.toString(10) + ")";
  }
  var arg = A3a.Assembler.resolveSymbol(args[1], defs, pass === 1, line);
  if (arg - pc >= 32768 || pc - arg > 32768) {
    throw "Jump too far (line " + line.toString(10) + ")";
  }
  return [41216 | testInstr.code[0] & 255, arg - pc & 65535];
}}, "do.jump.always":{numArgs:2, toCode:function(pc, args, label, defs, pass, line) {
  var testInstr = A3a.Assembler.instr[args[0]];
  if (testInstr == undefined || testInstr.code == undefined || testInstr.code.length !== 1 || (testInstr.code[0] & 61440) !== 32768) {
    throw 'Unknown op "' + args[0] + '" for do.jump.always (line ' + line.toString(10) + ")";
  }
  var arg = A3a.Assembler.resolveSymbol(args[1], defs, pass === 1, line);
  if (arg - pc >= 32768 || pc - arg > 32768) {
    throw "Jump too far (line " + line.toString(10) + ")";
  }
  return [41728 | testInstr.code[0] & 255, arg - pc & 65535];
}}, "emit":{numArgs:3, toCode:function(pc, args, label, defs, pass, line) {
  var id = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
  if (id < 0 || id >= 4096) {
    throw "Event id out of range (line " + line.toString(10) + ")";
  }
  var addr = A3a.Assembler.resolveSymbol(args[1], defs, pass === 1, line);
  if (addr < 0 || addr >= 65536) {
    throw "Address out of range (line " + line.toString(10) + ")";
  }
  var size = A3a.Assembler.resolveSymbol(args[2], defs, pass === 1, line);
  if (size < 0 || size >= 65536) {
    throw "Size out of range (line " + line.toString(10) + ")";
  }
  return [45056 | id & 4095, addr & 65535, size & 65535];
}}, "callnat":{numArgs:1, toCode:function(pc, args, label, defs, pass, line) {
  var arg = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
  if (arg < 0 || arg >= 4096) {
    throw "Native call id out of range (line " + line.toString(10) + ")";
  }
  return [49152 | arg & 4095];
}}, "callsub":{numArgs:1, toCode:function(pc, args, label, defs, pass, line) {
  var arg = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
  if (arg < 0 || arg >= 4096) {
    throw "Subroutine address out of range (line " + line.toString(10) + ")";
  }
  return [53248 | arg & 4095];
}}, "ret":{code:[57344]}};
A3a.InputBuffer = function() {
  this.buffer = null;
  this.length = 0;
};
A3a.InputBuffer.prototype.reset = function() {
  this.buffer = null;
  this.length = 0;
};
A3a.InputBuffer.prototype.appendData = function(data, length, offset) {
  if (length === undefined) {
    length = data.byteLength;
  }
  if (length > 0) {
    if (this.length > 0) {
      var newArray = new Uint8Array(this.length + length);
      newArray.set(new Uint8Array(this.buffer, 0, this.length), 0);
      newArray.set(new Uint8Array(data, offset || 0, length), this.length);
      this.buffer = newArray.buffer;
      this.length += length;
    } else {
      this.buffer = data.slice(offset || 0, (offset || 0) + length);
      this.length = length;
    }
  }
};
A3a.InputBuffer.prototype.consume = function(n) {
  this.length -= n;
  this.buffer = this.length > 0 ? this.buffer.slice(n) : null;
};
A3a.IdMapping = function() {
  this.connectionIndices = [];
  this.localNodeIds = [];
  this.externNodeIds = [];
};
A3a.IdMapping.prototype.add = function(connectionIndex, localNodeId, externNodeId) {
  this.connectionIndices.push(connectionIndex);
  this.localNodeIds.push(localNodeId);
  this.externNodeIds.push(externNodeId);
};
A3a.IdMapping.prototype.connectionIndex = function(externNodeId) {
  for (var i = 0; i < this.externNodeIds.length; i++) {
    if (this.externNodeIds[i] === externNodeId) {
      return this.connectionIndices[i];
    }
  }
  return -1;
};
A3a.IdMapping.prototype.localNodeId = function(externNodeId) {
  for (var i = 0; i < this.externNodeIds.length; i++) {
    if (this.externNodeIds[i] === externNodeId) {
      return this.localNodeIds[i];
    }
  }
  return -1;
};
A3a.IdMapping.prototype.externNodeId = function(connectionIndex, localNodeId) {
  for (var i = 0; i < this.externNodeIds.length; i++) {
    if (this.connectionIndices[i] === connectionIndex && this.localNodeIds[i] === localNodeId) {
      return this.externNodeIds[i];
    }
  }
  return -1;
};
A3a.Message = function(id, sourceNodeId, payload) {
  this.id = id;
  this.sourceNodeId = sourceNodeId;
  if (payload instanceof ArrayBuffer) {
    this.payload = payload;
  } else {
    if (payload) {
      var size = 0;
      for (var i = 0; i < payload.length; i++) {
        if (typeof payload[i] === "string") {
          size += 1 + payload[i].length;
        } else {
          size += 2;
        }
      }
      var data = new ArrayBuffer(size);
      var dataView = new DataView(data);
      for (var i = 0, offset = 0; i < payload.length; i++) {
        if (typeof payload[i] === "string") {
          dataView.setUint8(offset++, payload[i].length);
          for (var j = 0; j < payload[i].length; j++) {
            dataView.setUint8(offset++, payload[i].charCodeAt(j));
          }
        } else {
          if (payload[i] < 32768) {
            dataView.setInt16(offset, payload[i], true);
            offset += 2;
          } else {
            dataView.setUint16(offset, payload[i], true);
            offset += 2;
          }
        }
      }
      this.payload = data;
    } else {
      this.payload = new ArrayBuffer(0);
    }
  }
};
A3a.Message.prototype.decode = function() {
  var dataView = new DataView(this.payload);
  function parseStrings(stringFlags) {
    var r = [];
    var offset = 0;
    for (var i = 0; i < stringFlags.length; i++) {
      if (stringFlags[i]) {
        var length = dataView.getUint8(offset);
        var str = "";
        for (var j = 0; j < length; j++) {
          str += String.fromCharCode(dataView.getUint8(offset + 1 + j));
        }
        r.push(str);
        offset += 1 + length;
      } else {
        r.push(dataView.getUint16(offset, true));
        offset += 2;
      }
    }
    return r;
  }
  var r;
  var val;
  switch(this.id) {
    case A3a.Message.Id.description:
      r = parseStrings([true, false, false, false, false, false, false, false]);
      this.nodeName = r[0];
      this.protocolVersion = r[1];
      this.bytecodeSize = r[2];
      this.stackSize = r[3];
      this.variableSize = r[4];
      this.numNamedVariables = r[5];
      this.numLocalEvents = r[6];
      this.numNativeFunctions = r[7];
      break;
    case A3a.Message.Id.namedVariableDescription:
      r = parseStrings([false, true]);
      this.varSize = r[0];
      this.varName = r[1];
      break;
    case A3a.Message.Id.localEventDescription:
      r = parseStrings([true, true]);
      this.localEventName = r[0];
      this.localEventDescription = r[1];
      break;
    case A3a.Message.Id.nativeFunctionDescription:
      var t = [true, true, false];
      r = parseStrings(t);
      this.functionName = r[0];
      this.functionDescription = r[1];
      this.numParams = r[2];
      for (var i = 0; i < this.numParams; i++) {
        t.push(false);
        t.push(true);
      }
      r = parseStrings(t);
      this.params = [];
      for (var i = 0; i < this.numParams; i++) {
        this.params.push({size:r[3 + 2 * i] - (r[3 + 2 * i] & 32768 ? 65536 : 0), name:r[4 + 2 * i]});
      }
      break;
    case A3a.Message.Id.variables:
      this.varOffset = dataView.getUint16(0, true);
      this.varData = [];
      for (var i = 2; i < dataView.byteLength; i += 2) {
        this.varData.push(dataView.getUint16(i, true));
      }
      break;
    case A3a.Message.Id.executionStateChanged:
      this.pc = dataView.getUint16(0, true);
      var flags = dataView.getUint16(2, true);
      this.flags = {flags:flags, eventActive:(flags & 1) !== 0, stepByStep:(flags & 2) !== 0, eventRunning:(flags & 4) !== 0};
      break;
    case A3a.Message.Id.breakpointSetResult:
      this.pc = dataView.getUint16(2, true);
      this.result = dataView.getUint16(4, true);
      break;
    case A3a.Message.Id.setBytecode:
      this.targetNodeId = dataView.getUint16(0, true);
      this.bcOffset = dataView.getUint16(2, true);
      val = [];
      for (var i = 4; i < dataView.byteLength; i += 2) {
        val.push(dataView.getUint16(i, true));
      }
      this.bc = val;
      break;
    case A3a.Message.Id.breakpointClearAll:
    case A3a.Message.Id.reset:
    case A3a.Message.Id.run:
    case A3a.Message.Id.pause:
    case A3a.Message.Id.step:
    case A3a.Message.Id.stop:
    case A3a.Message.Id.getExecutionState:
      this.targetNodeId = dataView.getUint16(0, true);
      break;
    case A3a.Message.Id.breakpointSet:
    case A3a.Message.Id.breakpointClear:
      this.targetNodeId = dataView.getUint16(0, true);
      this.pc = dataView.getUint16(2, true);
      break;
    case A3a.Message.Id.getVariables:
      this.targetNodeId = dataView.getUint16(0, true);
      this.varOffset = dataView.getUint16(2, true);
      this.varCount = dataView.getUint16(4, true);
      break;
    case A3a.Message.Id.setVariables:
      this.targetNodeId = dataView.getUint16(0, true);
      this.varOffset = dataView.getUint16(2, true);
      val = [];
      for (var i = 4; i < dataView.byteLength; i += 2) {
        val.push(dataView.getUint16(i, true));
      }
      this.varVal = val;
      break;
    case A3a.Message.Id.listNodes:
      this.version = dataView.getUint16(0, true);
      break;
  }
};
A3a.Message.prototype.serialize = function() {
  var a = new ArrayBuffer(6 + this.payload.byteLength);
  var dataView = new DataView(a);
  dataView.setUint16(0, this.payload.byteLength, true);
  dataView.setUint16(2, this.sourceNodeId, true);
  dataView.setUint16(4, this.id, true);
  var byteView = new Uint8Array(a);
  byteView.set(new Uint8Array(this.payload), 6);
  return a;
};
A3a.Message.deserialize = function(inputBuffer) {
  if (inputBuffer.length < 6) {
    return null;
  }
  var dataView = new DataView(inputBuffer.buffer);
  var payloadSize = dataView.getUint16(0, true);
  if (6 + payloadSize > inputBuffer.length) {
    return null;
  }
  var sourceNodeId = dataView.getUint16(2, true);
  var id = dataView.getUint16(4, true);
  var payload = inputBuffer.buffer.slice(6, 6 + payloadSize);
  inputBuffer.consume(6 + payloadSize);
  var msg = new A3a.Message(id, sourceNodeId, payload);
  msg.decode();
  return msg;
};
A3a.Message.prototype.copy = function() {
  var msgCopy = new A3a.Message(this.id, this.sourceNodeId, this.payload);
  msgCopy.decode();
  return msgCopy;
};
A3a.Message.remapDir = {fromLocalToExtern:0, fromExternToLocal:1};
A3a.Message.prototype.remapId = function(nodeIdMapping, connectionIndex, remapDir) {
  var remap = remapDir === A3a.Message.remapDir.fromLocalToExtern ? function(nodeId) {
    var newId = nodeIdMapping.externNodeId(connectionIndex, nodeId);
    return newId >= 0 ? newId : nodeId;
  } : function(nodeId) {
    var newId = nodeIdMapping.localNodeId(nodeId);
    return newId >= 0 ? newId : nodeId;
  };
  var msg2 = this.copy();
  msg2.sourceNodeId = remap(msg2.sourceNodeId);
  switch(msg2.id) {
    case A3a.Message.Id.setBytecode:
    case A3a.Message.Id.breakpointClearAll:
    case A3a.Message.Id.reset:
    case A3a.Message.Id.run:
    case A3a.Message.Id.pause:
    case A3a.Message.Id.step:
    case A3a.Message.Id.stop:
    case A3a.Message.Id.getExecutionState:
    case A3a.Message.Id.breakpointSet:
    case A3a.Message.Id.breakpointClear:
    case A3a.Message.Id.getVariables:
    case A3a.Message.Id.setVariables:
      this.targetNodeId = remap(this.targetNodeId);
      break;
  }
  return msg2;
};
A3a.Message.prototype.toString = function() {
  var str = A3a.Message.messageName[this.id] || "0x" + this.id.toString(16);
  str += " from " + this.sourceNodeId.toString(10);
  if (this.targetNodeId >= 0) {
    str += " to " + this.targetNodeId.toString();
  }
  return str;
};
A3a.Message.Id = {description:36864, namedVariableDescription:36865, localEventDescription:36866, nativeFunctionDescription:36867, disconnected:36868, variables:36869, arrayAccessOutOfBounds:36870, divisionByZero:36871, eventExecutionKilled:36872, executionStateChanged:36874, breakpointSetResult:36875, nodePresent:36876, getDescription:40960, setBytecode:40961, reset:40962, run:40963, pause:40964, step:40965, stop:40966, getExecutionState:40967, breakpointSet:40968, breakpointClear:40969, breakpointClearAll:40970, 
getVariables:40971, setVariables:40972, getNodeDescription:40976, listNodes:40977};
A3a.Message.messageName = {36864:"description", 36865:"namedVariableDescription", 36866:"localEventDescription", 36867:"nativeFunctionDescription", 36869:"variables", 36874:"executionStateChanged", 36876:"nodePresent", 40960:"getDescription", 40961:"setBytecode", 40962:"reset", 40963:"run", 40964:"pause", 40965:"step", 40966:"stop", 40967:"getExecutionState", 40968:"breakpointSet", 40969:"breakpointClear", 40970:"breakpointClearAll", 40971:"getVariables", 40972:"setVariables", 40976:"getNodeDescription", 
40977:"listNodes"};
A3a.Message.version = 5;
A3a.Device = function(opt) {
  this.nodeId = opt && opt.nodeId || 54321;
  this.variables = opt && opt.variables || [];
  this.localEvents = opt && opt.localEvents || [];
  this.nativeFunctions = opt && opt.nativeFunctions || [];
  this.bytecodeSize = opt && opt.bytecodeSize || 500;
  this.stackSize = opt && opt.stackSize || 200;
  this.variableSize = opt && opt.variableSize || 200;
  this.varData = this.variableData();
  this.bytecode = [];
  this.pc = 0;
  this.flagEventActive = false;
  this.flagStepByStep = true;
  this.flagEventRunning = false;
  this.stack = [];
  this.breakpoints = [];
  this.onEmit = null;
  this.onVarChanged = null;
  this.onNativeCall = null;
  this.write = null;
};
A3a.Device.Variable;
A3a.Device.LocalEvent;
A3a.Device.NativeFunction;
A3a.Device.prototype.copy = function() {
  var copy = new A3a.Device({nodeId:this.nodeId, variables:this.variables, localEvents:this.localEvents, nativeFunctions:this.nativeFunctions, bytecodeSize:this.bytecodeSize, stackSize:this.stackSize, variableSize:this.variableSize});
  copy.bytecodeSize = this.bytecodeSize;
  copy.stackSize = this.stackSize;
  copy.variableSize = this.variableSize;
  copy.bytecode = this.bytecode.slice();
  copy.pc = this.pc;
  copy.flagEventActive = this.flagEventActive;
  copy.flagStepByStep = this.flagStepByStep;
  copy.flagEventRunning = this.flagEventRunning;
  copy.stack = this.stack.slice();
  copy.breakpoints = this.breakpoints.slice();
  return copy;
};
A3a.Device.flags = {eventActive:1, stepByStep:2, eventRunning:4};
A3a.Device.prototype.getFlags = function() {
  return (this.flagEventActive ? A3a.Device.flags.eventActive : 0) | (this.flagStepByStep ? A3a.Device.flags.stepByStep : 0) | (this.flagEventRunning ? A3a.Device.flags.eventRunning : 0);
};
A3a.Device.prototype.variableData = function() {
  var data = [];
  var offset = 0;
  for (var i = 0; i < this.variables.length; i++) {
    this.variables[i].offset = offset;
    data = data.concat(this.variables[i].val);
    offset += this.variables[i].val.length;
  }
  while (data.length < this.variableSize) {
    data.push(0);
  }
  return data;
};
A3a.Device.prototype.setVariableData = function(varOffset, varData) {
  if (this.onVarChanged) {
    for (var i = 0; i < this.variables.length; i++) {
      if (this.variables[i].offset + this.variables[i].val.length > varOffset && this.variables[i].offset < varOffset + varData.length) {
        for (var j = 0; j < this.variables[i].val.length; j++) {
          if (this.variables[i].offset + j - varOffset >= 0 && this.variables[i].offset + j - varOffset < varData.length) {
            this.onVarChanged(this.variables[i].name, j, varData[this.variables[i].offset + j - varOffset], this.varData[this.variables[i].offset + j], this.varData.slice(this.variables[i].offset, this.variables[i].offset + this.variables[i].val.length));
          }
        }
      }
    }
  }
  varData.forEach(function(val, i) {
    this.varData[varOffset + i] = val;
  }, this);
};
A3a.VM = {};
A3a.VM.op = {stop:0, smallImmediate:1, largeImmediate:2, load:3, store:4, loadIndirect:5, storeIndirect:6, unaryOp:7, binaryOp:8, jump:9, conditionalBranch:10, emit:11, nativeCall:12, subCall:13, subRet:14, reserved:15};
A3a.VM.eventIdInit = 65535;
A3a.VM.opLength = function(op) {
  return [1, 1, 2, 1, 1, 2, 2, 1, 1, 1, 2, 3, 1, 1, 1, 1][op >>> 12];
};
A3a.Device.prototype.setBytecode = function(bc, bcOffset) {
  this.bytecode.splice.apply(this.bytecode, [bcOffset || 0, bc.length].concat(bc));
};
A3a.Device.prototype.resetWhenFlags = function() {
  if (this.bytecode.length > 0) {
    var pc = this.bytecode[0];
    while (pc < this.bytecode.length) {
      var op = this.bytecode[pc];
      var oph = op >>> 12;
      var opl = op & 4095;
      if (oph == A3a.VM.op.conditionalBranch) {
        this.bytecode[pc] &= ~512;
      }
      pc += A3a.VM.opLength(op);
    }
  }
};
A3a.Device.prototype.getEventAddress = function(eventId) {
  if (this.bytecode.length > 0) {
    for (var i = 1; i < this.bytecode[0]; i += 2) {
      if (this.bytecode[i] == eventId) {
        return this.bytecode[i + 1];
      }
    }
  }
  return null;
};
A3a.Device.prototype.setupEvent = function(eventId) {
  var eventAddr = this.getEventAddress(eventId);
  if (eventAddr !== null) {
    if (this.flagEventActive) {
      var msg = new A3a.Message(A3a.Message.Id.eventExecutionKilled, this.nodeId, [this.pc]);
      this.write && this.write(msg.serialize());
    }
    this.pc = eventAddr;
    this.flagEventActive = true;
  }
};
A3a.Device.prototype.reset = function() {
  this.flagEventActive = false;
  this.flagStepByStep = true;
  this.flagEventRunning = false;
  this.resetWhenFlags();
  this.stack = [];
  for (var i = 0; i < this.varData.length; i++) {
    this.varData[i] = 0;
  }
  if (this.onReset) {
    this.onReset();
  }
  this.setupEvent(A3a.VM.eventIdInit);
};
A3a.Device.prototype.step = function() {
  var device = this;
  function toSigned12(n) {
    return n >= 2048 ? n - 4096 : n;
  }
  function toSigned16(n) {
    return n >= 32768 ? n - 65536 : n;
  }
  function execOp(op) {
    var n2;
    switch(op) {
      case 28672:
        device.stack.push(-device.stack.pop());
        break;
      case 28673:
        device.stack.push(Math.abs(device.stack.pop()));
        break;
      case 28674:
        device.stack.push(~device.stack.pop());
        break;
      case 32768:
        n2 = device.stack.pop();
        device.stack.push(toSigned16(device.stack.pop() << n2 & 65535));
        break;
      case 32769:
        n2 = device.stack.pop();
        device.stack.push(device.stack.pop() >> n2);
        break;
      case 32770:
        device.stack.push(toSigned16(device.stack.pop() + device.stack.pop() & 65535));
        break;
      case 32771:
        n2 = device.stack.pop();
        device.stack.push(toSigned16(device.stack.pop() - n2 & 65535));
        break;
      case 32772:
        device.stack.push(toSigned16(device.stack.pop() * device.stack.pop() & 65535));
        break;
      case 32773:
        n2 = device.stack.pop();
        device.stack.push(toSigned16(Math.trunc(device.stack.pop() / n2) & 65535));
        break;
      case 32774:
        n2 = device.stack.pop();
        device.stack.push(toSigned16(device.stack.pop() % n2 & 65535));
        break;
      case 32775:
        device.stack.push(toSigned16((device.stack.pop() | device.stack.pop()) & 65535));
        break;
      case 32776:
        device.stack.push(toSigned16((device.stack.pop() ^ device.stack.pop()) & 65535));
        break;
      case 32777:
        device.stack.push(toSigned16(device.stack.pop() & device.stack.pop() & 65535));
        break;
      case 32778:
        device.stack.push(device.stack.pop() === device.stack.pop() ? 1 : 0);
        break;
      case 32779:
        device.stack.push(device.stack.pop() !== device.stack.pop() ? 1 : 0);
        break;
      case 32780:
        n2 = device.stack.pop();
        device.stack.push(device.stack.pop() > n2 ? 1 : 0);
        break;
      case 32781:
        n2 = device.stack.pop();
        device.stack.push(device.stack.pop() >= n2 ? 1 : 0);
        break;
      case 32782:
        n2 = device.stack.pop();
        device.stack.push(device.stack.pop() < n2 ? 1 : 0);
        break;
      case 32783:
        n2 = device.stack.pop();
        device.stack.push(device.stack.pop() <= n2 ? 1 : 0);
        break;
      case 32784:
        n2 = device.stack.pop();
        device.stack.push(device.stack.pop() || n2 ? 1 : 0);
        break;
      case 32785:
        n2 = device.stack.pop();
        device.stack.push(device.stack.pop() && n2 ? 1 : 0);
        break;
      default:
        throw "unknown op 0x" + op.toString(16);
    }
  }
  var op = this.bytecode[this.pc];
  var oph = op >>> 12;
  var opl = op & 4095;
  switch(oph) {
    case A3a.VM.op.stop:
      this.flagEventActive = false;
      break;
    case A3a.VM.op.smallImmediate:
      this.stack.push(toSigned12(opl));
      break;
    case A3a.VM.op.largeImmediate:
      this.pc++;
      this.stack.push(toSigned16(this.bytecode[this.pc]));
      break;
    case A3a.VM.op.load:
      this.stack.push(this.varData[opl]);
      break;
    case A3a.VM.op.store:
      this.setVariableData(opl, [this.stack.pop()]);
      break;
    case A3a.VM.op.loadIndirect:
      this.pc++;
      var size = this.bytecode[this.pc];
      var i = this.stack.pop();
      if (i >= size) {
        throw "out of bounds";
      } else {
        this.stack.push(this.varData[opl + i]);
      }
      break;
    case A3a.VM.op.storeIndirect:
      this.pc++;
      var size = this.bytecode[this.pc];
      var i = this.stack.pop();
      if (i >= size) {
        throw "Index out of bounds";
      } else {
        this.setVariableData(opl + i, [this.stack.pop()]);
      }
      break;
    case A3a.VM.op.jump:
      this.pc += toSigned12(opl) - 1;
      break;
    case A3a.VM.op.conditionalBranch:
      var isWhen = op & 256;
      execOp(A3a.VM.op.binaryOp << 12 | op & 255);
      var cond = this.stack.pop() != 0;
      this.pc++;
      var relAddr = toSigned16(this.bytecode[this.pc]);
      if (isWhen) {
        var lastWhenCond = op & 512;
        var lastPC = this.pc - 1;
        if (lastWhenCond || !cond) {
          this.pc += relAddr - 2;
        }
        if (cond) {
          this.bytecode[lastPC] |= 512;
        } else {
          this.bytecode[lastPC] &= ~512;
        }
      } else {
        if (!cond) {
          this.pc += relAddr - 2;
        }
      }
      break;
    case A3a.VM.op.emit:
      this.onEmit(opl);
      break;
    case A3a.VM.op.nativeCall:
      if (opl < 0 || opl >= this.nativeFunctions.length) {
        throw "Native call index out of bounds";
      }
      var argSpec = this.nativeFunctions[opl].params.map(function(param) {
        return {p:this.stack.pop()};
      }, this);
      var groupSizes = [];
      this.nativeFunctions[opl].params.forEach(function(param, i) {
        if (param.size === 0) {
          argSpec[i].s = this.stack.pop();
        } else {
          argSpec[i].s = param.size;
        }
      }, this);
      this.nativeFunctions[opl].params.forEach(function(param, i) {
        if (param.size < 0 && groupSizes[-param.size] === undefined) {
          groupSizes[-param.size] = 0;
        }
      }, this);
      groupSizes = groupSizes.map(function(s) {
        return s !== undefined ? this.stack.pop() : s;
      }, this);
      this.nativeFunctions[opl].params.forEach(function(param, i) {
        if (param.size < 0) {
          argSpec[i].s = groupSizes[-param.size];
        }
      }, this);
      var args = argSpec.map(function(argSpec) {
        return this.varData.slice(argSpec.p, argSpec.p + argSpec.s);
      }, this);
      var skipOriginalNatCall = false;
      if (this.onNativeCall) {
        skipOriginalNatCall = this.onNativeCall(this.nativeFunctions[opl].name, this, args);
      }
      if (!skipOriginalNatCall) {
        this.nativeFunctions[opl].fun(this, args);
      }
      argSpec.forEach(function(argSpec, i) {
        this.setVariableData(argSpec.p, args[i]);
      }, this);
      break;
    case A3a.VM.op.subCall:
      this.stack.push(this.pc + 1);
      this.pc = opl - 1;
      break;
    case A3a.VM.op.subRet:
      this.pc = this.stack.pop() - 1;
      break;
    case A3a.VM.op.reserved:
      throw "op 0x" + op.toString(16) + " (reserved) not implemented";
    default:
      execOp(op);
      break;
  }
  this.pc++;
};
A3a.Device.prototype.run = function() {
  while (this.flagEventActive) {
    this.step();
    if (this.flagStepByStep) {
      break;
    }
  }
};
A3a.Device.VirtualThymio = function(nodeId) {
  function toSigned16(n) {
    n &= 65535;
    return n >= 32768 ? n - 65536 : n;
  }
  A3a.Device.call(this, {nodeId:nodeId, variables:[{name:"_id", val:[0]}, {name:"event.source", val:[0]}, {name:"event.args", val:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}, {name:"_fwversion", val:[0, 0]}, {name:"_productId", val:[0]}, {name:"buttons._raw", val:[0, 0, 0, 0, 0]}, {name:"button.backward", val:[0]}, {name:"button.left", val:[0]}, {name:"button.center", val:[0]}, {name:"button.forward", val:[0]}, {name:"button.right", val:[0]}, 
  {name:"buttons._mean", val:[0, 0, 0, 0, 0]}, {name:"buttons._noise", val:[0, 0, 0, 0, 0]}, {name:"prox.horizontal", val:[0, 0, 0, 0, 0, 0, 0]}, {name:"prox.comm.rx._payloads", val:[0, 0, 0, 0, 0, 0, 0]}, {name:"prox.comm.rx._intensities", val:[0, 0, 0, 0, 0, 0, 0]}, {name:"prox.comm.rx", val:[0]}, {name:"prox.comm.tx", val:[0]}, {name:"prox.ground.ambiant", val:[0, 0]}, {name:"prox.ground.reflected", val:[0, 0]}, {name:"prox.ground.delta", val:[0, 0]}, {name:"motor.left.target", val:[0]}, {name:"motor.right.target", 
  val:[0]}, {name:"_vbat", val:[0, 0]}, {name:"_imot", val:[0, 0]}, {name:"motor.left.speed", val:[0]}, {name:"motor.right.speed", val:[0]}, {name:"motor.left.pwm", val:[0]}, {name:"motor.right.pwm", val:[0]}, {name:"_integrator", val:[0, 0]}, {name:"acc", val:[0, 0, 0]}, {name:"leds.top", val:[0, 0, 0]}, {name:"leds.bottom.left", val:[0, 0, 0]}, {name:"leds.bottom.right", val:[0, 0, 0]}, {name:"leds.circle", val:[0, 0, 0, 0, 0, 0, 0, 0]}, {name:"temperature", val:[0]}, {name:"rc5.address", val:[0]}, 
  {name:"rc5.command", val:[0]}, {name:"mic.intensity", val:[0]}, {name:"mic.threshold", val:[0]}, {name:"mic._mean", val:[0]}, {name:"timer.period", val:[0, 0]}, {name:"acc._tap", val:[0]}, {name:"sd.present", val:[0]}], localEvents:[{name:"button.backward", description:"Backward button state changed"}, {name:"button.left", description:"Left button state changed"}, {name:"button.center", description:"Center button state changed"}, {name:"button.forward", description:"Forward button state changed"}, 
  {name:"button.right", description:"Right button state changed"}, {name:"buttons", description:"Buttons values updated"}, {name:"prox", description:"Proximity values updated"}, {name:"prox.comm", description:"Data received on the proximity communication"}, {name:"tap", description:"Tap detected"}, {name:"acc", description:"Accelerometer values updated"}, {name:"mic", description:"Microphone above threshold"}, {name:"sound.finished", description:"Sound playback finished"}, {name:"temperature", description:"Temperature value updated"}, 
  {name:"rc5", description:"RC5 message received"}, {name:"motor", description:"Motor timer"}, {name:"timer0", description:"Timer 0"}, {name:"timer1", description:"Timer 1"}], nativeFunctions:[{name:"_system_reboot", params:[], fun:function() {
  }}, {name:"_system_settings_read", params:[], fun:function() {
  }}, {name:"_system_settings_write", params:[], fun:function() {
  }}, {name:"_system_settings_flash", params:[], fun:function() {
  }}, {name:"math.copy", params:[], fun:function(device, args) {
    for (var i = 0; i < args[0].length; i++) {
      args[0][i] = args[1][i];
    }
  }}, {name:"math.fill", params:[], fun:function(device, args) {
    for (var i = 0; i < args[0].length; i++) {
      args[0][i] = args[1][0];
    }
  }}, {name:"math.addscalar", params:[{name:"r", size:-1}, {name:"a", size:-1}, {name:"b", size:1}], fun:function(device, args) {
    for (var i = 0; i < args[0].length; i++) {
      args[0][i] = toSigned16(args[1][i] + args[2][0]);
    }
  }}, {name:"math.add", params:[{name:"r", size:-1}, {name:"a", size:-1}, {name:"b", size:-1}], fun:function(device, args) {
    for (var i = 0; i < args[0].length; i++) {
      args[0][i] = toSigned16(args[1][i] + args[2][i]);
    }
  }}, {name:"math.sub", params:[{name:"r", size:-1}, {name:"a", size:-1}, {name:"b", size:-1}], fun:function(device, args) {
    for (var i = 0; i < args[0].length; i++) {
      args[0][i] = toSigned16(args[1][i] - args[2][i]);
    }
  }}, {name:"math.mul", params:[{name:"r", size:-1}, {name:"a", size:-1}, {name:"b", size:-1}], fun:function(device, args) {
    for (var i = 0; i < args[0].length; i++) {
      args[0][i] = toSigned16(args[1][i] * args[2][i]);
    }
  }}, {name:"math.div", params:[{name:"r", size:-1}, {name:"a", size:-1}, {name:"b", size:-1}], fun:function(device, args) {
    for (var i = 0; i < args[0].length; i++) {
      args[0][i] = toSigned16(Math.trunc(args[1][i] / args[2][i]));
    }
  }}, {name:"math.min", params:[{name:"r", size:-1}, {name:"a", size:-1}, {name:"b", size:-1}], fun:function(device, args) {
    for (var i = 0; i < args[0].length; i++) {
      args[0][i] = Math.min(args[1][i], args[2][i]);
    }
  }}, {name:"math.max", params:[{name:"r", size:-1}, {name:"a", size:-1}, {name:"b", size:-1}], fun:function(device, args) {
    for (var i = 0; i < args[0].length; i++) {
      args[0][i] = Math.max(args[1][i], args[2][i]);
    }
  }}, {name:"math.clamp", params:[{name:"r", size:-1}, {name:"x", size:-1}, {name:"low", size:-1}, {name:"high", size:-1}], fun:function(device, args) {
    for (var i = 0; i < args[0].length; i++) {
      args[0][i] = Math.min(Math.max(args[1][i], args[2][i]), args[3][i]);
    }
  }}, {name:"math.dot", params:[{name:"r", size:-1}, {name:"a", size:-1}, {name:"b", size:-1}, {name:"shift", size:1}], fun:function(device, args) {
    var d = 0;
    for (var i = 0; i < args[0].length; i++) {
      d += args[1][i] * args[2][i];
    }
    args[0][0] = d / Math.pow(2, args[3][0]);
  }}, {name:"math.stat", params:[{name:"x", size:-1}, {name:"min", size:1}, {name:"max", size:1}, {name:"mean", size:1}], fun:function(device, args) {
    var s = 0;
    args[1][0] = 32767;
    args[2][0] = -32768;
    for (var i = 0; i < args[0].length; i++) {
      args[1][0] = Math.min(args[1][0], args[0][i]);
      args[2][0] = Math.max(args[2][0], args[0][i]);
      s += args[0][i];
    }
    args[3][0] = s / args[0].length;
  }}, {name:"math.argbounds", params:[{name:"x", size:-1}, {name:"argmin", size:1}, {name:"argmax", size:1}], fun:function(device, args) {
    var mx = -Infinity;
    var mn = Infinity;
    for (var i = 0; i < args[0].length; i++) {
      if (args[0][i] < mn) {
        mn = args[0][i];
        args[1][0] = i;
      }
      if (args[0][i] > mx) {
        mx = args[0][i];
        args[2][0] = i;
      }
    }
  }}, {name:"math.sort", params:[{name:"x", size:-1}], fun:function(device, args) {
    args[0].sort(function(a, b) {
      return a - b;
    });
  }}, {name:"math.muldiv", params:[{name:"r", size:-1}, {name:"a", size:-1}, {name:"b", size:-1}, {name:"c", size:-1}], fun:function(device, args) {
    for (var i = 0; i < args[0].length; i++) {
      args[0][i] = toSigned16(args[1][i] * args[2][i] / args[3][i]);
    }
  }}, {name:"math.atan2", description:"Atan2", params:[{name:"r", size:-1}, {name:"y", size:-1}, {name:"x", size:-1}], fun:function(device, args) {
    args[2].forEach(function(x, i) {
      args[0][i] = Math.round(Math.atan2(args[1][i], x) * 32767 / Math.PI);
    });
  }}, {name:"math.sin", description:"Sine", params:[{name:"r", size:-1}, {name:"theta", size:-1}], fun:function(device, args) {
    args[1].forEach(function(x, i) {
      args[0][i] = Math.round(Math.sin(x * Math.PI / 32768) * 32767);
    });
  }}, {name:"math.cos", description:"Cosine", params:[{name:"r", size:-1}, {name:"theta", size:-1}], fun:function(device, args) {
    args[1].forEach(function(x, i) {
      args[0][i] = Math.round(Math.cos(x * Math.PI / 32768) * 32767);
    });
  }}, {name:"math.rot2", params:[{name:"r", size:2}, {name:"v", size:2}, {name:"theta", size:1}]}, {name:"math.sqrt", description:"Square root", params:[{name:"r", size:-1}, {name:"x", size:-1}], fun:function(device, args) {
    args[1].forEach(function(x, i) {
      args[0][i] = x > 0 ? Math.floor(Math.sqrt(x)) : 0;
    });
  }}, {name:"math.rand", description:"Pseudo-random number", params:[{name:"r", size:-1}], fun:function(device, args) {
    for (var i = 0; i < args[0].length; i++) {
      args[0][i] = Math.floor(65535.9999 * Math.random()) - 32768;
    }
  }}, {name:"_leds.set", params:[{name:"led", size:1}, {name:"br", size:1}], fun:function() {
  }}, {name:"sound.record", params:[{name:"n", size:1}], fun:function() {
  }}, {name:"sound.play", params:[{name:"n", size:1}], fun:function() {
  }}, {name:"sound.replay", params:[{name:"n", size:1}], fun:function() {
  }}, {name:"sound.system", description:"Start playing system sound", params:[{name:"n", size:1}], fun:function() {
  }}, {name:"leds.circle", description:"Set circular leds", params:[{name:"l0", size:1}, {name:"l1", size:1}, {name:"l2", size:1}, {name:"l3", size:1}, {name:"l4", size:1}, {name:"l5", size:1}, {name:"l6", size:1}, {name:"l7", size:1}], fun:function(device, args) {
    device.state["leds.circle"] = args.map(function(a) {
      return a[0];
    });
    device.onStateChanged && device.onStateChanged("leds.circle");
  }}, {name:"leds.top", description:"Set top RGB led", params:[{name:"r", size:1}, {name:"g", size:1}, {name:"b", size:1}], fun:function(device, args) {
    device.state["leds.top"] = args.map(function(a) {
      return a[0];
    });
    device.onStateChanged && device.onStateChanged("leds.top");
  }}, {name:"leds.bottom.left", description:"Set bottom-left RGB led", params:[{name:"r", size:1}, {name:"g", size:1}, {name:"b", size:1}], fun:function(device, args) {
    device.state["leds.bottom.left"] = args.map(function(a) {
      return a[0];
    });
    device.onStateChanged && device.onStateChanged("leds.bottom.left");
  }}, {name:"leds.bottom.right", description:"Set bottom-right RGB led", params:[{name:"r", size:1}, {name:"g", size:1}, {name:"b", size:1}], fun:function(device, args) {
    device.state["leds.bottom.right"] = args.map(function(a) {
      return a[0];
    });
    device.onStateChanged && device.onStateChanged("leds.bottom.right");
  }}, {name:"sound.freq", description:"Play frequency", params:[{name:"Hz", size:1}, {name:"ds", size:1}], fun:function(device, args) {
    console.info(args);
  }}, {name:"leds.buttons", description:"Set buttons leds", params:[{name:"led 0", size:1}, {name:"led 1", size:1}, {name:"led 2", size:1}, {name:"led 3", size:1}]}, {name:"leds.prox.h", description:"Set horizontal proximity leds", params:[{name:"led 0", size:1}, {name:"led 1", size:1}, {name:"led 2", size:1}, {name:"led 3", size:1}, {name:"led 4", size:1}, {name:"led 5", size:1}, {name:"led 6", size:1}, {name:"led 7", size:1}]}, {name:"leds.prox.v", description:"Set vertical proximity leds", params:[{name:"led 0", 
  size:1}, {name:"led 1", size:1}]}, {name:"leds.rc", description:"Set rc led", params:[{name:"led", size:1}]}, {name:"leds.sound", description:"Set sound led", params:[{name:"led", size:1}]}, {name:"leds.temperature", description:"Set ntc led", params:[{name:"red", size:1}, {name:"blue", size:1}]}, {name:"sound.wave", description:"Set the primary wave of the tone generator", params:[{name:"wave", size:142}], fun:function(device, args) {
  }}, {name:"prox.comm.enable", description:"Enable or disable the proximity communication", params:[{name:"state", size:1}]}, {name:"sd.open", description:"Open a file on the SD card", params:[{name:"number", size:1}, {name:"status", size:1}]}, {name:"sd.write", description:"Write data to the opened file", params:[{name:"data", size:-1}, {name:"written", size:1}]}, {name:"sd.read", description:"Read data from the opened file", params:[{name:"data", size:-1}, {name:"read", size:1}]}, {name:"sd.seek", 
  description:"Seek the opened file", params:[{name:"position", size:1}, {name:"status", size:1}]}, {name:"_rf.nodeid"}, {name:"_poweroff"}], variableSize:620});
  this.state = {};
  this.onStateChanged = null;
};
A3a.Device.VirtualThymio.prototype = Object.create(A3a.Device.prototype);
A3a.Device.VirtualThymio.prototype.constructor = A3a.Device.VirtualThymio;
A3a.vpl.VirtualThymioVM = function() {
  A3a.vpl.VirtualThymio.call(this);
  this.useVM = true;
  this.vthymio = new A3a.Device.VirtualThymio(9999);
  var self = this;
  this.vthymio.onStateChanged = function(name) {
    self.stateChangeListener[name] && self.stateChangeListener[name](name, self.vthymio.state[name]);
  };
  this.vthymio.onVarChanged = function(name, index, newValue, oldValue, oldArrayValue) {
    switch(name) {
      case "leds.circle":
        var newArrayValue = oldArrayValue.slice();
        newArrayValue[index] = newValue;
        self.stateChangeListener[name] && self.stateChangeListener[name](name, newArrayValue);
        break;
      case "timer.period":
        self["setTimer"](index, "timer" + index.toString(10), newValue * 0.001, true);
        break;
    }
  };
  this.vthymio.onNativeCall = function(name, device, args) {
    switch(name) {
      case "sound.play":
        self.stateChangeListener["sound"]("sound", {"pcm":args[0][0]});
        return true;
    }
    return false;
  };
  this.asebaNode = new A3a.A3aNode(A3a.thymioDescr);
};
A3a.vpl.VirtualThymioVM.prototype = Object.create(A3a.vpl.VirtualThymio.prototype);
A3a.vpl.VirtualThymioVM.prototype.constructor = A3a.vpl.VirtualThymioVM;
A3a.vpl.VirtualThymioVM.prototype["reset"] = function(t0) {
  A3a.vpl.VirtualThymio.prototype["reset"].call(this, t0);
  this.vthymio.reset();
  this["setTimer"](20, "prox", 1 / 10, true);
  this["setTimer"](21, "acc", 1 / 16, true);
  this["setTimer"](22, "buttons", 1 / 20, true);
  this["setTimer"](23, "temperature", 1, true);
};
A3a.vpl.VirtualThymioVM.prototype.getVMVar = function(name) {
  var varDescr = this.asebaNode.findVariable(name);
  if (varDescr == null) {
    return null;
  }
  var data = this.vthymio.varData;
  return data.slice(varDescr.offset, varDescr.offset + varDescr.size);
};
A3a.vpl.VirtualThymioVM.prototype.setVMVar = function(name, val) {
  var varDescr = this.asebaNode.findVariable(name);
  if (varDescr == null) {
    throw "Unknown VM variable " + name;
  } else {
    if (val.length !== varDescr.size) {
      throw "Bad size for variable " + name;
    }
  }
  var data = this.vthymio.varData;
  Array.prototype.splice.apply(data, [varDescr.offset, varDescr.size].concat(val));
};
A3a.vpl.VirtualThymioVM.prototype["set"] = function(name, val) {
  if (this.useVM) {
    A3a.vpl.VirtualThymio.prototype["set"].call(this, name, val);
    switch(name) {
      case "button.backward":
      case "button.left":
      case "button.center":
      case "button.forward":
      case "button.right":
        this.setVMVar(name, [val ? 1 : 0]);
        break;
      case "prox.ground.delta":
        this.setVMVar("prox.ground.delta", val.map(function(x) {
          return 2000 * x;
        }));
        break;
      case "prox.horizontal":
        this.setVMVar("prox.horizontal", val.map(function(x) {
          return 4000 * x;
        }));
        break;
      case "acc":
        this.setVMVar("acc", val.map(function(x) {
          return 22 * x;
        }));
        break;
      default:
        throw "Unknown variable " + name;
    }
    this.stateChangeListener[name] && this.stateChangeListener[name](name, val);
  } else {
    A3a.vpl.VirtualThymio.prototype["set"].call(this, name, val);
  }
};
A3a.vpl.VirtualThymioVM.prototype["get"] = function(name) {
  if (this.useVM) {
    var val;
    var varDescr;
    switch(name) {
      case "leds.top":
        return this.getVMVar("leds.top").map(function(x) {
          return x >= 32 ? 1 : x <= 0 ? 0 : x / 32;
        });
      case "leds.bottom.left":
        return this.getVMVar("leds.bottom.left").map(function(x) {
          return x >= 32 ? 1 : x <= 0 ? 0 : x / 32;
        });
      case "leds.bottom.right":
        return this.getVMVar("leds.bottom.right").map(function(x) {
          return x >= 32 ? 1 : x <= 0 ? 0 : x / 32;
        });
      case "leds.circle":
        return this.getVMVar("leds.circle").map(function(x) {
          return x >= 16 ? 1 : 0;
        });
      case "motor.left":
        return this.getVMVar("motor.left.target")[0] / 200;
      case "motor.right":
        return this.getVMVar("motor.right.target")[0] / 200;
      default:
        return A3a.vpl.VirtualThymio.prototype["get"].call(this, name);
    }
  } else {
    return A3a.vpl.VirtualThymio.prototype["get"].call(this, name);
  }
};
A3a.vpl.VirtualThymioVM.prototype["sendEvent"] = function(name, val) {
  if (this.useVM) {
    if (val != null) {
      throw "Event arguments not implemented";
    }
    var eventId = this.asebaNode.eventNameToId(name);
    this.vthymio.setupEvent(eventId);
    this.runVM();
  } else {
    A3a.vpl.VirtualThymio.prototype["sendEvent"].call(this, name, val);
  }
};
A3a.vpl.VirtualThymioVM.prototype["loadCode"] = function(language, src) {
  if (language === "js") {
    A3a.vpl.VirtualThymio.prototype["loadCode"].call(this, language, src);
    this.useVM = false;
  } else {
    var bytecode;
    if (language === "asm") {
      var c = new A3a.Assembler(this.asebaNode, src);
      bytecode = c.assemble();
    } else {
      var l2 = A3a.Compiler.L2.isL2(src);
      var c = l2 ? new A3a.Compiler.L2(this.asebaNode, src) : new A3a.Compiler(this.asebaNode, src);
      c.functionLib = l2 ? A3a.A3aNode.stdMacrosL2 : A3a.A3aNode.stdMacros;
      bytecode = c.compile();
    }
    this.vthymio.setBytecode(bytecode);
    this.vthymio.reset();
    this.runVM();
    this.useVM = true;
  }
};
A3a.vpl.VirtualThymioVM.maxSteps = 2000;
A3a.vpl.VirtualThymioVM.prototype.runVM = function() {
  for (var stepCounter = 0; stepCounter < A3a.vpl.VirtualThymioVM.maxSteps && this.vthymio.flagEventActive; stepCounter++) {
    this.vthymio.step();
  }
};
A3a.vpl.Application.prototype.installRobotSimulator = function(options) {
  var app = this;
  this.simCanvas = new A3a.vpl.Canvas(this.canvasEl, {css:this.css});
  this.simCanvas.defaultDoOver = function() {
    if (app.simHint !== null) {
      app.simHint = null;
      app.requestRendering();
    }
  };
  var intervalId = null;
  return new A3a.vpl.RunGlue({run:function(language, code) {
    var sim2d = app.sim2d;
    sim2d.robot["loadCode"](language, code);
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
    var t0 = A3a.vpl.VPLSim2DViewer.currentTime();
    sim2d.robot["start"](t0);
    intervalId = setInterval(function() {
      var t = A3a.vpl.VPLSim2DViewer.currentTime();
      sim2d.robot["run"](t, function(shape, param) {
        sim2d.drawPen(shape, param);
      });
    }, 10);
    sim2d.robot.suspended = sim2d.paused;
    app.requestRendering();
  }, init:function(language) {
    var robot = new A3a.vpl.VirtualThymioVM;
    var sim2d = new A3a.vpl.VPLSim2DViewer(app.simCanvas, robot);
    if (options && options.canvasFilter) {
      app.simCanvas.setFilter(options.canvasFilter);
    }
    if (options && options.canvasTransform) {
      app.simCanvas.transform = options.canvasTransform;
    }
    app.sim2d = sim2d;
  }, getName:function() {
    return "Simulator";
  }, preferredLanguage:"js", languages:["js", "aseba", "l2", "asm"]});
};
A3a.vpl.Obstacles = function() {
  this.obstacles = [];
};
A3a.vpl.Obstacles.prototype.clear = function() {
  this.obstacles = [];
};
A3a.vpl.Obstacles.prototype.add = function(obstacle) {
  this.obstacles.push(obstacle);
};
A3a.vpl.Obstacles.prototype.loadFromSVG = function(svgSrc) {
  var svg = new SVG(svgSrc);
  var self = this;
  svg.draw(null, {cb:{line:function(x, y, isPolygon) {
    self.add(new A3a.vpl.ObstaclePoly(x, y, isPolygon));
  }, circle:function(x, y, r) {
    self.add(new A3a.vpl.ObstacleCylinder(x, y, r));
  }}});
};
A3a.vpl.Obstacles.prototype.distance = function(x, y, phi) {
  var dist = Infinity;
  for (var i = 0; i < this.obstacles.length; i++) {
    dist = Math.min(dist, this.obstacles[i].distance(x, y, phi));
  }
  return dist;
};
A3a.vpl.Obstacles.prototype.draw = function(ctx) {
  this.obstacles.forEach(function(obstacle) {
    obstacle.draw(ctx);
  });
};
A3a.vpl.Obstacle = function() {
};
A3a.vpl.Obstacle.prototype.distance = function(x, y, phi) {
  throw "internal";
};
A3a.vpl.Obstacle.prototype.draw = function(ctx) {
};
A3a.vpl.ObstaclePoly = function(x, y, isPolygon) {
  A3a.vpl.Obstacle.call(this);
  this.x = x;
  this.y = y;
  this.isPolygon = isPolygon;
};
A3a.vpl.ObstaclePoly.prototype = Object.create(A3a.vpl.Obstacle.prototype);
A3a.vpl.ObstaclePoly.prototype.constructor = A3a.vpl.ObstaclePoly;
A3a.vpl.ObstaclePoly.prototype.distance = function(x, y, phi) {
  function distanceToWall(x, y, phi, x1, y1, x2, y2) {
    var A = [Math.cos(phi), x2 - x1, Math.sin(phi), y2 - y1];
    var b = [x2 - x, y2 - y];
    var det = A[0] * A[3] - A[1] * A[2];
    var r = [(A[3] * b[0] - A[1] * b[1]) / det, (A[0] * b[1] - A[2] * b[0]) / det];
    return r[1] >= 0 && r[1] <= 1 && r[0] > 0 ? r[0] : Infinity;
  }
  var dist = Infinity;
  var n = this.x.length;
  for (var i = 0; i < (this.isPolygon ? this.x.length : this.x.length - 1); i++) {
    dist = Math.min(dist, distanceToWall(x, y, phi, this.x[i], this.y[i], this.x[(i + 1) % n], this.y[(i + 1) % n]));
  }
  return dist;
};
A3a.vpl.ObstaclePoly.prototype.draw = function(ctx) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(this.x[0], this.y[0]);
  for (var i = 1; i < this.x.length; i++) {
    ctx.lineTo(this.x[i], this.y[i]);
  }
  if (this.isPolygon) {
    ctx.closePath();
  }
  ctx.stroke();
  ctx.restore();
};
A3a.vpl.ObstacleCylinder = function(x, y, r) {
  A3a.vpl.Obstacle.call(this);
  this.x = x;
  this.y = y;
  this.r = r;
};
A3a.vpl.ObstacleCylinder.prototype = Object.create(A3a.vpl.Obstacle.prototype);
A3a.vpl.ObstacleCylinder.prototype.constructor = A3a.vpl.ObstacleCylinder;
A3a.vpl.ObstacleCylinder.prototype.distance = function(x, y, phi) {
  var xc1 = (this.x - x) * Math.cos(phi) + (this.y - y) * Math.sin(phi);
  var yc1 = (x - this.x) * Math.sin(phi) + (this.y - y) * Math.cos(phi);
  var q2 = this.r * this.r - yc1 * yc1;
  if (q2 < 0) {
    return Infinity;
  } else {
    var q = Math.sqrt(q2);
    return xc1 + q < 0 ? Infinity : xc1 - q < 0 ? xc1 + q : xc1 - q;
  }
};
A3a.vpl.ObstacleCylinder.prototype.draw = function(ctx) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.restore();
};
A3a.vpl.Playground = function(width, height) {
  this.width = width;
  this.height = height;
};
A3a.vpl.VPLSim2DViewer = function(canvas, robot, uiConfig) {
  var self = this;
  this.uiConfig = uiConfig || new A3a.vpl.UIConfig;
  this.robot = robot;
  this.running = false;
  this.paused = false;
  this.penDown = false;
  this.renderingPending = false;
  this.currentMap = A3a.vpl.VPLSim2DViewer.playgroundMap.ground;
  this.playground = new A3a.vpl.Playground(10 * this.robot.robotSize, 7.07 * this.robot.robotSize);
  var posMargin = this.robot.robotSize;
  this.robot["setPositionLimits"](-this.playground.width / 2 + posMargin, this.playground.width / 2 - posMargin, -this.playground.height / 2 + posMargin, this.playground.height / 2 - posMargin);
  this.groundImage = null;
  this.disabledGroundImage = null;
  this.groundCanvas = document.createElement("canvas");
  this.fuzzyGroundCanvas = document.createElement("canvas");
  this.groundCanvasDirty = false;
  this.heightImage = null;
  this.disabledHeightImage = null;
  this.heightCanvas = document.createElement("canvas");
  this.obstacles = new A3a.vpl.Obstacles;
  this.hasObstacles = false;
  this.obstacleSVG = null;
  this.disabledObstacleSVG = null;
  this.setPlaygroundLimits();
  this.robot.onMove = function() {
    self.updateGroundSensors();
    self.updateProximitySensors();
    self.updateAccelerometers();
  };
  this.simCanvas = canvas;
  this.simCanvas.state = {};
  this.sizeInitialized = false;
};
A3a.vpl.VPLSim2DViewer.playgroundMap = {ground:"ground", obstacle:"obstacle", height:"height"};
A3a.vpl.VPLSim2DViewer.prototype.resetUI = function() {
  this.uiConfig.reset();
};
A3a.vpl.VPLSim2DViewer.prototype.setTeacherRole = function(b) {
  this.teacherRole = b;
};
A3a.vpl.VPLSim2DViewer.prototype.copyGroundToFuzzy = function() {
  var ctx = this.fuzzyGroundCanvas.getContext("2d");
  ctx.filter = "blur(" + (this.fuzzyGroundCanvas.width / 300).toFixed(1) + "px)";
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, this.fuzzyGroundCanvas.width, this.fuzzyGroundCanvas.height);
  ctx.drawImage(this.groundCanvas, 0, 0);
};
A3a.vpl.Application.prototype.restoreGround = function() {
  var sim2d = this.sim2d;
  if (sim2d.groundImage) {
    sim2d.groundCanvas.width = sim2d.groundImage.width;
    sim2d.groundCanvas.height = sim2d.groundImage.height;
    var ctx = sim2d.groundCanvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, sim2d.groundImage.width, sim2d.groundImage.height);
    ctx.drawImage(sim2d.groundImage, 0, 0, sim2d.groundImage.width, sim2d.groundImage.height);
  } else {
    sim2d.groundCanvas.width = sim2d.simCanvas ? sim2d.simCanvas.width : 800;
    sim2d.groundCanvas.height = sim2d.groundCanvas.width * sim2d.playground.height / sim2d.playground.width;
    var ctx = sim2d.groundCanvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, sim2d.groundCanvas.width, sim2d.groundCanvas.height);
  }
  sim2d.fuzzyGroundCanvas.width = sim2d.groundCanvas.width;
  sim2d.fuzzyGroundCanvas.height = sim2d.groundCanvas.height;
  sim2d.groundCanvasDirty = false;
  sim2d.copyGroundToFuzzy();
  this.renderSim2dViewer();
};
A3a.vpl.Application.prototype.setGroundImage = function(img) {
  this.sim2d.groundImage = img;
  this.restoreGround();
  this.sim2d.updateGroundSensors();
  this.renderSim2dViewer();
};
A3a.vpl.VPLSim2DViewer.prototype.drawPen = function(shape, param) {
  if (this.penDown) {
    var ctx = this.groundCanvas.getContext("2d");
    ctx.save();
    ctx.translate(this.groundCanvas.width / 2, this.groundCanvas.height / 2);
    ctx.scale(this.groundCanvas.width / this.playground.width, -this.groundCanvas.height / this.playground.height);
    ctx.beginPath();
    switch(shape) {
      case A3a.vpl.Robot.TraceShape.line:
        ctx.moveTo(param[0], param[1]);
        ctx.lineTo(param[2], param[3]);
        break;
      case A3a.vpl.Robot.TraceShape.arc:
        ctx.arc(param[0], param[1], Math.abs(param[2]), param[3], param[4], param[2] < 0);
        break;
    }
    ctx.strokeStyle = "#060";
    ctx.lineCap = "round";
    ctx.lineWidth = 0.1 * this.robot.robotSize;
    ctx.stroke();
    ctx.restore();
    this.groundCanvasDirty = true;
    this.copyGroundToFuzzy();
  }
};
A3a.vpl.Application.prototype.setHeightImage = function(img) {
  var sim2d = this.sim2d;
  sim2d.heightImage = img;
  if (sim2d.heightImage) {
    sim2d.heightCanvas.width = sim2d.heightImage.width;
    sim2d.heightCanvas.height = sim2d.heightImage.height;
    var ctx = sim2d.heightCanvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, sim2d.heightImage.width, sim2d.heightImage.height);
    ctx.drawImage(sim2d.heightImage, 0, 0, sim2d.heightImage.width, sim2d.heightImage.height);
  } else {
    sim2d.heightCanvas.width = 1;
    sim2d.heightCanvas.height = 1;
  }
  sim2d.updateAccelerometers();
  this.renderSim2dViewer();
};
A3a.vpl.VPLSim2DViewer.prototype.setPlaygroundLimits = function() {
  this.obstacles.clear();
  this.obstacles.add(new A3a.vpl.ObstaclePoly([-this.playground.width / 2, this.playground.width / 2, this.playground.width / 2, -this.playground.width / 2], [-this.playground.height / 2, -this.playground.height / 2, this.playground.height / 2, this.playground.height / 2], true));
};
A3a.vpl.Application.prototype.setObstacleImage = function(svgSrc) {
  var sim2d = this.sim2d;
  sim2d.setPlaygroundLimits();
  sim2d.obstacleSVG = svgSrc;
  if (svgSrc) {
    var svg = new SVG(svgSrc);
    var scx = sim2d.playground.width / svg.viewBox[2];
    var ox = -sim2d.playground.width * (0.5 + svg.viewBox[0] / svg.viewBox[2]);
    var scy = -sim2d.playground.height / svg.viewBox[3];
    var oy = sim2d.playground.height * (0.5 + svg.viewBox[1] / svg.viewBox[3]);
    svg.draw(null, {cb:{line:function(x, y, isPolygon) {
      sim2d.obstacles.add(new A3a.vpl.ObstaclePoly(x.map(function(x1) {
        return ox + scx * x1;
      }), y.map(function(y1) {
        return oy + scy * y1;
      }), isPolygon));
    }, circle:function(x, y, r) {
      sim2d.obstacles.add(new A3a.vpl.ObstacleCylinder(ox + scx * x, oy + scy * y, (scx - scy) / 2 * r));
    }}});
  }
  sim2d.hasObstacles = svgSrc != null;
  sim2d.updateProximitySensors();
  this.renderSim2dViewer();
};
A3a.vpl.VPLSim2DViewer.prototype.groundValue = function(x, y) {
  var i = Math.round(this.fuzzyGroundCanvas.width * (x + this.playground.width / 2) / this.playground.width);
  var j = Math.round(this.fuzzyGroundCanvas.height * (this.playground.height / 2 - y) / this.playground.height);
  var pixel = this.fuzzyGroundCanvas.getContext("2d").getImageData(i, j, 1, 1).data;
  return pixel[0] / 255;
};
A3a.vpl.VPLSim2DViewer.prototype.heightValue = function(x, y) {
  if (this.heightImage == null) {
    return 0;
  }
  var i = Math.round(this.heightCanvas.width * (x + this.playground.width / 2) / this.playground.width);
  var j = Math.round(this.heightCanvas.height * (this.playground.height / 2 - y) / this.playground.height);
  var pixel = this.heightCanvas.getContext("2d").getImageData(i, j, 1, 1).data;
  return -(pixel[0] + pixel[1] + pixel[2]) / 765;
};
A3a.vpl.VPLSim2DViewer.prototype.updateGroundSensors = function() {
  var g = [];
  for (var i = 0; i < 2; i++) {
    var x = this.robot.pos[0] + this.robot.groundSensorLon * Math.cos(this.robot.theta) + (i === 0 ? -1 : 1) * this.robot.groundSensorLat * Math.sin(this.robot.theta);
    var y = this.robot.pos[1] + this.robot.groundSensorLon * Math.sin(this.robot.theta) - (i === 0 ? -1 : 1) * this.robot.groundSensorLat * Math.cos(this.robot.theta);
    g.push(this.groundValue(x, y) + this.robot.noise(0.05));
  }
  this.robot["set"]("prox.ground.delta", g);
};
A3a.vpl.VPLSim2DViewer.prototype.updateProximitySensors = function() {
  function sensorMapping(dist) {
    var dmin = 100;
    var dmax = 300;
    var xi = 50;
    return dist < dmin ? 1 : dist > dmax ? 0 : (dist - dmax) * (dist - dmax) / ((dmax - dmin) * (dmax - dmin));
  }
  var costh = Math.cos(this.robot.theta);
  var sinth = Math.sin(this.robot.theta);
  var prox = [{lon:70, lat:60, phi:0.7}, {lon:85, lat:30, phi:0.35}, {lon:95, lat:0, phi:0}, {lon:85, lat:-30, phi:-0.35}, {lon:70, lat:-60, phi:-0.7}, {lon:-25, lat:35, phi:2.8}, {lon:-25, lat:-35, phi:-2.8}].map(function(p) {
    var dist = this.obstacles.distance(this.robot.pos[0] + p.lon * costh - p.lat * sinth, this.robot.pos[1] + p.lon * sinth + p.lat * costh, this.robot.theta + p.phi);
    return sensorMapping(dist + this.robot.noise(0.01 * this.robot.r));
  }, this);
  this.robot["set"]("prox.horizontal", prox);
};
A3a.vpl.VPLSim2DViewer.prototype.updateAccelerometers = function() {
  var lonContact = [0, 0, this.robot.r];
  var latContact = [-this.robot.r, this.robot.r, 0];
  var h = [];
  for (var i = 0; i < 3; i++) {
    var x = this.robot.pos[0] + lonContact[i] * Math.cos(this.robot.theta) + latContact[i] * Math.sin(this.robot.theta);
    var y = this.robot.pos[1] + lonContact[i] * Math.sin(this.robot.theta) - latContact[i] * Math.cos(this.robot.theta);
    h.push(this.heightValue(x, y));
  }
  var gain = 200;
  var roll = gain * (h[1] - h[0]) / (2 * this.robot.r);
  var pitch = gain * (h[2] - (h[0] + h[1]) / 2) / this.robot.groundSensorLon;
  var acc = [roll + this.robot.noise(0.02), pitch + this.robot.noise(0.02), Math.sqrt(1 - roll * roll - pitch * pitch) + this.robot.noise(0.02)];
  this.robot["set"]("acc", acc);
};
A3a.vpl.VPLSim2DViewer.prototype.wantsSVG = function() {
  return this.currentMap === A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle;
};
A3a.vpl.Application.prototype.setImage = function(img, map) {
  switch(map || this.sim2d.currentMap) {
    case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
      this.sim2d.disabledGroundImage = img == null ? this.sim2d.groundImage : null;
      this.setGroundImage(img);
      break;
    case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
      this.sim2d.disabledHeightImage = img == null ? this.sim2d.heightImage : null;
      this.setHeightImage(img);
      break;
  }
};
A3a.vpl.Application.prototype.setSVG = function(svgSrc, map) {
  switch(map || this.sim2d.currentMap) {
    case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
      this.sim2d.disabledObstacleSVG = svgSrc == null ? this.sim2d.obstacleSVG : null;
      this.setObstacleImage(svgSrc);
      break;
  }
};
A3a.vpl.Application.prototype.setAudio = function(filename, audioArrayBuffer) {
  this.sim2d.robot["setFile"](filename, audioArrayBuffer);
};
A3a.vpl.Application.prototype.start = function(suspended) {
  this.sim2d.paused = suspended;
  this.sim2d.running = !suspended;
  this.renderSim2dViewer();
};
A3a.vpl.VPLSim2DViewer.color = function(rgb) {
  var rgb1 = [rgb[0], Math.max(0.2 + 0.8 * rgb[1], rgb[2] / 2), rgb[2]];
  var max = Math.max(rgb1[0], Math.max(rgb1[1], rgb1[2]));
  return "rgb(" + rgb1.map(function(x) {
    return Math.round(225 * (1 - max) + (30 + 225 * max) * x);
  }).join(",") + ")";
};
A3a.vpl.Application.prototype.createSimControlBarDoOverFun = function() {
  var app = this;
  return function(id) {
    if (app.simHint !== id) {
      app.simHint = id;
      app.requestRendering();
    }
  };
};
A3a.vpl.Application.prototype.createSim2dToolbar = function(toolbarConfig, toolbarBox, toolbarSeparatorBox, toolbarItemBoxes) {
  var controlBar = new A3a.vpl.ControlBar(this.simCanvas);
  controlBar.setButtons(this, toolbarConfig, ["sim", "top"], this.sim2d.toolbarDrawButton || A3a.vpl.Commands.drawButtonJS, this.sim2d.toolbarGetButtonBounds || A3a.vpl.Commands.getButtonBoundsJS);
  controlBar.calcLayout(toolbarBox, toolbarItemBoxes, toolbarSeparatorBox);
  return controlBar;
};
A3a.vpl.Application.prototype.renderSim2dViewer = function() {
  var self = this;
  var sim2d = this.sim2d;
  var robot = sim2d.robot;
  var simCanvas = this.simCanvas;
  if (!simCanvas.visible) {
    return;
  }
  if (!sim2d.sizeInitialized) {
    sim2d.sizeInitialized = true;
    sim2d.resize(this);
    this.restoreGround();
  }
  simCanvas.clearItems();
  var toolbarConfig = sim2d.toolbarConfig || this.simToolbarConfig;
  var toolbarItemBoxes = A3a.vpl.ControlBar.buttonBoxes(this, toolbarConfig, ["sim", "top"]);
  var toolbarItemHeight = A3a.vpl.ControlBar.maxBoxHeight(toolbarItemBoxes);
  var canvasSize = simCanvas.getSize();
  simCanvas.recalcSize();
  var viewBox = simCanvas.css.getBox({tag:"view", clas:["sim"]});
  var smallButtonBox = simCanvas.css.getBox({tag:"button", clas:["sim", "event"]});
  var robotControlBox = simCanvas.css.getBox({tag:"sim-controller"});
  var separatorControlBox = simCanvas.css.getBox({tag:"separator", id:"sim-controller-separator"});
  var separatorBox = simCanvas.css.getBox({tag:"separator", clas:["sim", "top"]});
  var toolbarBox = simCanvas.css.getBox({tag:"toolbar", clas:["sim", "top"]});
  var playgroundAreaBox = simCanvas.css.getBox({tag:"sim-playground-area"});
  var playgroundBox = simCanvas.css.getBox({tag:"sim-playground"});
  viewBox.setTotalWidth(canvasSize.width);
  viewBox.setTotalHeight(canvasSize.height);
  viewBox.setPosition(0, 0);
  var smallBtnSize = Math.max(smallButtonBox.width, smallButtonBox.height);
  robotControlBox.width = 3 * smallButtonBox.totalWidth();
  robotControlBox.setTotalHeight(viewBox.height);
  robotControlBox.setPosition(viewBox.x + viewBox.width - robotControlBox.totalWidth(), viewBox.y);
  toolbarBox.setTotalWidth(viewBox.width - robotControlBox.totalWidth());
  toolbarBox.height = toolbarItemHeight;
  toolbarBox.setPosition(viewBox.x, viewBox.y);
  playgroundAreaBox.setTotalWidth(viewBox.width - robotControlBox.totalWidth());
  playgroundAreaBox.setTotalHeight(viewBox.height - toolbarBox.totalHeight());
  playgroundAreaBox.setPosition(viewBox.x, viewBox.y + toolbarBox.totalHeight());
  simCanvas.addDecoration(function(ctx) {
    viewBox.draw(ctx);
  });
  var controlBar = this.createSim2dToolbar(toolbarConfig, toolbarBox, separatorBox, toolbarItemBoxes);
  controlBar.addToCanvas(toolbarBox, toolbarItemBoxes, this.createSimControlBarDoOverFun());
  simCanvas.addDecoration(function(ctx) {
    robotControlBox.draw(ctx);
  });
  var simControls = [];
  function createDoOverFun(id) {
    return function() {
      if (self.simHint !== id) {
        self.simHint = id;
        self.requestRendering();
      }
    };
  }
  function drawButton(id, ctx, box, isPressed) {
    var bnds = (sim2d.toolbarGetButtonBounds || A3a.vpl.Commands.getButtonBoundsJS)(id, simCanvas.dims);
    var sc = Math.min(box.width / (bnds.xmax - bnds.xmin), box.height / (bnds.ymax - bnds.ymin));
    ctx.save();
    ctx.translate(-bnds.xmin, -bnds.ymin);
    ctx.scale(sc, sc);
    (sim2d.toolbarDrawButton || A3a.vpl.Commands.drawButtonJS)(id, ctx, simCanvas.dims, simCanvas.css, ["sim", "event"], null, true, false, isPressed);
    ctx.restore();
  }
  var yRobotControl = robotControlBox.y + smallButtonBox.offsetTop();
  simControls.push(simCanvas.addControl(robotControlBox.x + smallButtonBox.totalWidth() + smallButtonBox.offsetLeft(), yRobotControl, smallButtonBox, function(ctx, box, isPressed) {
    drawButton("sim-event:forward", ctx, box, isPressed);
  }, {doMouseDown:function(ev) {
    robot["set"]("button.forward", true);
    robot["sendEvent"]("button.forward", null);
  }, doMouseUp:function(ev) {
    robot["set"]("button.forward", false);
    robot["sendEvent"]("button.forward", null);
  }, doOver:createDoOverFun("sim:btn-button.forward")}, "button.forward"));
  yRobotControl += smallButtonBox.totalHeight();
  simControls.push(simCanvas.addControl(robotControlBox.x + smallButtonBox.offsetLeft(), yRobotControl, smallButtonBox, function(ctx, box, isPressed) {
    drawButton("sim-event:left", ctx, box, isPressed);
  }, {doMouseDown:function(ev) {
    robot["set"]("button.left", true);
    robot["sendEvent"]("button.left", null);
  }, doMouseUp:function(ev) {
    robot["set"]("button.left", false);
    robot["sendEvent"]("button.left", null);
  }, doOver:createDoOverFun("sim:btn-button.left")}, "button.left"));
  simControls.push(simCanvas.addControl(robotControlBox.x + smallButtonBox.totalWidth() + smallButtonBox.offsetLeft(), yRobotControl, smallButtonBox, function(ctx, box, isPressed) {
    drawButton("sim-event:center", ctx, box, isPressed);
  }, {doMouseDown:function(ev) {
    robot["set"]("button.center", true);
    robot["sendEvent"]("button.center", null);
  }, doMouseUp:function(ev) {
    robot["set"]("button.center", false);
    robot["sendEvent"]("button.center", null);
  }, doOver:createDoOverFun("sim:btn-button.center")}, "button.center"));
  simControls.push(simCanvas.addControl(robotControlBox.x + 2 * smallButtonBox.totalWidth() + smallButtonBox.offsetLeft(), yRobotControl, smallButtonBox, function(ctx, box, isPressed) {
    drawButton("sim-event:right", ctx, box, isPressed);
  }, {doMouseDown:function(ev) {
    robot["set"]("button.center", true);
    robot["sendEvent"]("button.center", null);
  }, doMouseUp:function(ev) {
    robot["set"]("button.center", false);
    robot["sendEvent"]("button.center", null);
  }, doOver:createDoOverFun("sim:btn-button.right")}, "button.right"));
  yRobotControl += smallButtonBox.totalHeight();
  simControls.push(simCanvas.addControl(robotControlBox.x + smallButtonBox.totalWidth() + smallButtonBox.offsetLeft(), yRobotControl, smallButtonBox, function(ctx, box, isPressed) {
    drawButton("sim-event:backward", ctx, box, isPressed);
  }, {doMouseDown:function(ev) {
    robot["set"]("button.backward", true);
    robot["sendEvent"]("button.backward", null);
  }, doMouseUp:function(ev) {
    robot["set"]("button.backward", false);
    robot["sendEvent"]("button.backward", null);
  }, doOver:createDoOverFun("sim:btn-button.backward")}, "button.backward"));
  yRobotControl += smallButtonBox.totalHeight() + separatorControlBox.totalHeight();
  simControls.push(simCanvas.addControl(robotControlBox.x + 0.5 * smallButtonBox.totalWidth() + smallButtonBox.offsetLeft(), yRobotControl, smallButtonBox, function(ctx, box, isPressed) {
    drawButton("sim-event:tap", ctx, box, isPressed);
  }, {action:function(ev) {
    robot["sendEvent"]("tap", null);
  }, doOver:createDoOverFun("sim:btn-tap")}, "tap"));
  simControls.push(simCanvas.addControl(robotControlBox.x + 1.5 * smallButtonBox.totalWidth() + smallButtonBox.offsetLeft(), yRobotControl, smallButtonBox, function(ctx, box, isPressed) {
    drawButton("sim-event:clap", ctx, box, isPressed);
  }, {action:function(ev) {
    robot["sendEvent"]("mic", null);
  }, doOver:createDoOverFun("sim:btn-clap")}, "clap"));
  yRobotControl += 2 * smallBtnSize;
  var xRobotControl = robotControlBox.x + 1.5 * smallButtonBox.totalWidth();
  var yRobotTop = yRobotControl + 3.5 * smallBtnSize;
  simControls.push(simCanvas.addDecoration(function(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xRobotControl - 1.2 * smallBtnSize, yRobotTop);
    ctx.lineTo(xRobotControl - 1.2 * smallBtnSize, yRobotTop - 1.8 * smallBtnSize);
    ctx.bezierCurveTo(xRobotControl - 0.72 * smallBtnSize, yRobotTop - 2.4 * smallBtnSize, xRobotControl - 0.05 * smallBtnSize, yRobotTop - 2.4 * smallBtnSize, xRobotControl, yRobotTop - 2.4 * smallBtnSize);
    ctx.bezierCurveTo(xRobotControl + 0.05 * smallBtnSize, yRobotTop - 2.4 * smallBtnSize, xRobotControl + 0.72 * smallBtnSize, yRobotTop - 2.4 * smallBtnSize, xRobotControl + 1.2 * smallBtnSize, yRobotTop - 1.8 * smallBtnSize);
    ctx.lineTo(xRobotControl + 1.2 * smallBtnSize, yRobotTop);
    ctx.closePath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    ctx.stroke();
    function drawSensorArc(x, y, r, val, color0, color1) {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, 2 * Math.PI);
      ctx.arc(0, 0, r / 2, 2 * Math.PI, 0, true);
      ctx.fillStyle = color0 || "#bbb";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, r, (-0.5 + 2 * val) * Math.PI, -0.5 * Math.PI, true);
      ctx.arc(0, 0, r / 2, -0.5 * Math.PI, (-0.5 + 2 * val) * Math.PI, false);
      ctx.fillStyle = color1 || "#222";
      ctx.fill();
      ctx.restore();
    }
    function drawSensorDisc(x, y, r, val, color0, color1) {
      function disc(r, fillStyle) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, 2 * Math.PI);
        ctx.fillStyle = fillStyle;
        ctx.fill();
      }
      ctx.save();
      ctx.translate(x, y);
      disc(r, color1 || "#222");
      disc(r * 0.95, color0 || "#bbb");
      disc(r * 0.95 * val, color1 || "#222");
      ctx.restore();
    }
    function drawSensor(x, y, r, val, color0, color1) {
      drawSensorDisc(x, y, r, val, color0, color1);
    }
    var groundSensorValues = robot["get"]("prox.ground.delta");
    drawSensor(xRobotControl - 0.45 * smallBtnSize, yRobotTop - 1.8 * smallBtnSize, 0.4 * smallBtnSize, groundSensorValues[0], "#afa", "#060");
    drawSensor(xRobotControl + 0.45 * smallBtnSize, yRobotTop - 1.8 * smallBtnSize, 0.4 * smallBtnSize, groundSensorValues[1], "#9f9", "#060");
    var proxSensorValues = robot["get"]("prox.horizontal");
    drawSensor(xRobotControl - 1.45 * smallBtnSize, yRobotTop - 2.3 * smallBtnSize, 0.4 * smallBtnSize, proxSensorValues[0], "#fcc", "#d00");
    drawSensor(xRobotControl - 0.8 * smallBtnSize, yRobotTop - 2.8 * smallBtnSize, 0.4 * smallBtnSize, proxSensorValues[1], "#fcc", "#d00");
    drawSensor(xRobotControl, yRobotTop - 3 * smallBtnSize, 0.4 * smallBtnSize, proxSensorValues[2], "#fcc", "#d00");
    drawSensor(xRobotControl + 0.8 * smallBtnSize, yRobotTop - 2.8 * smallBtnSize, 0.4 * smallBtnSize, proxSensorValues[3], "#fcc", "#d00");
    drawSensor(xRobotControl + 1.45 * smallBtnSize, yRobotTop - 2.3 * smallBtnSize, 0.4 * smallBtnSize, proxSensorValues[4], "#fcc", "#d00");
    drawSensor(xRobotControl - 0.8 * smallBtnSize, yRobotTop + 0.5 * smallBtnSize, 0.4 * smallBtnSize, proxSensorValues[5], "#fcc", "#d00");
    drawSensor(xRobotControl + 0.8 * smallBtnSize, yRobotTop + 0.5 * smallBtnSize, 0.4 * smallBtnSize, proxSensorValues[6], "#fcc", "#d00");
    ctx.restore();
  }));
  yRobotControl += 5 * smallBtnSize;
  var yRobotSide = yRobotControl;
  simControls.push(simCanvas.addDecoration(function(ctx) {
    function drawSpeed(x, y, r, val) {
      val = Math.max(-1, Math.min(1, val));
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, 2 * Math.PI);
      ctx.fillStyle = "#ccc";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * Math.sin(3 * val), -r * Math.cos(3 * val));
      ctx.lineWidth = Math.max(r / 6, 1);
      ctx.strokeStyle = "black";
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.fillStyle = "black";
    ctx.fillRect(xRobotControl - 1.15 * smallBtnSize, yRobotSide + 0.5 * smallBtnSize, 0.3 * smallBtnSize, 0.6 * smallBtnSize);
    ctx.fillRect(xRobotControl + 0.85 * smallBtnSize, yRobotSide + 0.5 * smallBtnSize, 0.3 * smallBtnSize, 0.6 * smallBtnSize);
    ctx.fillStyle = A3a.vpl.VPLSim2DViewer.color(robot["get"]("leds.top"));
    ctx.fillRect(xRobotControl - 1.2 * smallBtnSize, yRobotSide, 2.4 * smallBtnSize, 0.5 * smallBtnSize);
    ctx.fillStyle = A3a.vpl.VPLSim2DViewer.color(robot["get"]("leds.bottom.left"));
    ctx.fillRect(xRobotControl - 1.2 * smallBtnSize, yRobotSide + 0.5 * smallBtnSize, 1.2 * smallBtnSize, 0.5 * smallBtnSize);
    ctx.fillStyle = A3a.vpl.VPLSim2DViewer.color(robot["get"]("leds.bottom.right"));
    ctx.fillRect(xRobotControl, yRobotSide + 0.5 * smallBtnSize, 1.2 * smallBtnSize, 0.5 * smallBtnSize);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xRobotControl - 1.2 * smallBtnSize, yRobotSide + 0.5 * smallBtnSize);
    ctx.lineTo(xRobotControl + 1.2 * smallBtnSize, yRobotSide + 0.5 * smallBtnSize);
    ctx.moveTo(xRobotControl, yRobotSide + 0.5 * smallBtnSize);
    ctx.lineTo(xRobotControl, yRobotSide + smallBtnSize);
    ctx.strokeStyle = "white";
    ctx.stroke();
    ctx.lineJoin = "round";
    ctx.strokeStyle = "black";
    ctx.strokeRect(xRobotControl - 1.2 * smallBtnSize, yRobotSide, 2.4 * smallBtnSize, smallBtnSize);
    drawSpeed(xRobotControl - 1.7 * smallBtnSize, yRobotSide + smallBtnSize, 0.4 * smallBtnSize, robot["get"]("motor.left") / 2);
    drawSpeed(xRobotControl + 1.7 * smallBtnSize, yRobotSide + smallBtnSize, 0.4 * smallBtnSize, robot["get"]("motor.right") / 2);
    ctx.restore();
  }));
  yRobotControl += 1.5 * smallBtnSize;
  if (sim2d.heightImage != null) {
    var accY0 = yRobotControl + 1.5 * smallBtnSize;
    simControls.push(simCanvas.addDecoration(function(ctx) {
      var acc = robot["get"]("acc");
      var angles = [Math.atan2(acc[0], acc[1]), Math.atan2(acc[1], acc[2]), Math.atan2(acc[0], acc[2])];
      ctx.save();
      ctx.strokeStyle = "black";
      ctx.lineWidth = 0.7 * simCanvas.dims.blockLineWidth;
      for (var i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(xRobotControl + (i - 1) * smallBtnSize, accY0);
        ctx.save();
        ctx.strokeStyle = "silver";
        ctx.beginPath();
        ctx.moveTo(-0.4 * smallBtnSize, 0);
        ctx.lineTo(0.4 * smallBtnSize, 0);
        ctx.moveTo(0, -0.4 * smallBtnSize);
        ctx.lineTo(0, 0.4 * smallBtnSize);
        ctx.stroke();
        ctx.restore();
        ctx.rotate(-angles[i]);
        switch(i) {
          case 0:
            var sz = 0.25 * smallBtnSize;
            ctx.translate(0, 1.2 * sz);
            ctx.beginPath();
            ctx.moveTo(-1.2 * sz, 0);
            ctx.lineTo(-1.2 * sz, -1.8 * sz);
            ctx.bezierCurveTo(-0.72 * sz, -2.4 * sz, -0.05 * sz, -2.4 * sz, 0, -2.4 * sz);
            ctx.bezierCurveTo(0.05 * sz, -2.4 * sz, 0.72 * sz, -2.4 * sz, 1.2 * sz, -1.8 * sz);
            ctx.lineTo(1.2 * sz, 0);
            ctx.closePath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "black";
            ctx.stroke();
            break;
          case 1:
            ctx.strokeRect(-0.4 * smallBtnSize, -0.15 * smallBtnSize, 0.8 * smallBtnSize, 0.3 * smallBtnSize);
            ctx.beginPath();
            ctx.arc(-0.2 * smallBtnSize, 0.05 * smallBtnSize, 0.15 * smallBtnSize, 0, 2 * Math.PI);
            ctx.fillStyle = "white";
            ctx.fill();
            ctx.lineWidth = 0.07 * smallBtnSize;
            ctx.stroke();
            break;
          case 2:
            ctx.strokeRect(-0.4 * smallBtnSize, -0.15 * smallBtnSize, 0.8 * smallBtnSize, 0.3 * smallBtnSize);
            ctx.fillStyle = "black";
            ctx.fillRect(-0.35 * smallBtnSize, 0.15 * smallBtnSize, 0.15 * smallBtnSize, 0.08 * smallBtnSize);
            ctx.fillRect(0.2 * smallBtnSize, 0.15 * smallBtnSize, 0.15 * smallBtnSize, 0.08 * smallBtnSize);
            break;
        }
        ctx.restore();
      }
      ctx.restore();
    }));
    yRobotControl += 2.5 * smallBtnSize;
  }
  if (robot.ledsCircleUsed) {
    var ledsY0 = yRobotControl + 2 * smallBtnSize;
    simControls.push(simCanvas.addDecoration(function(ctx) {
      var leds = robot["get"]("leds.circle");
      for (var i = 0; i < 8; i++) {
        A3a.vpl.Canvas.drawArc(ctx, xRobotControl, ledsY0, 0.9 * smallBtnSize, 1.2 * smallBtnSize, Math.PI * (0.5 - 0.06 - i * 0.25), Math.PI * (0.5 + 0.06 - i * 0.25), leds[i] ? "#fa0" : "white", "black", simCanvas.dims.blockLineWidth);
      }
    }));
    yRobotControl += 3.5 * smallBtnSize;
  }
  var timerY0 = yRobotControl + 1.5 * smallBtnSize;
  var tRemaining = robot["getTimer"](0);
  if (tRemaining >= 0) {
    simControls.push(simCanvas.addDecoration(function(ctx) {
      var x0 = xRobotControl;
      var y0 = timerY0;
      if (!simCanvas.state.timeScale) {
        simCanvas.state.timeScale = tRemaining > 4 ? "log" : "lin";
      } else {
        if (simCanvas.state.timeScale === "lin" && tRemaining > 4) {
          simCanvas.state.timeScale = "log";
        }
      }
      A3a.vpl.Canvas.drawTimer(ctx, x0, y0, smallBtnSize, simCanvas.dims.blockLineWidth, function(t) {
        ctx.textAlign = "start";
        ctx.textBaseline = "top";
        ctx.font = (smallBtnSize / 2).toFixed(1) + "px sans-serif";
        ctx.fillStyle = "black";
        ctx.fillText(t.toFixed(1), robotControlBox.x, y0 - smallBtnSize);
      }, Math.min(tRemaining, simCanvas.state.timeScale === "log" ? 9.9 : 3.95), false, simCanvas.state.timeScale === "log");
    }));
    yRobotControl += 2.5 * smallBtnSize;
  } else {
    simCanvas.state.timeScale = false;
  }
  var dy = Math.min((playgroundAreaBox.y - robotControlBox.y + robotControlBox.y + robotControlBox.height - yRobotControl) / 2, robotControlBox.y + robotControlBox.height - yRobotControl);
  if (dy > 0) {
    simControls.forEach(function(item) {
      item.y += dy;
    });
  }
  var playgroundView = {x:playgroundAreaBox.x, y:playgroundAreaBox.y, width:playgroundAreaBox.width, height:playgroundAreaBox.height};
  playgroundView.scale = Math.min(playgroundView.width / sim2d.playground.width, playgroundView.height / sim2d.playground.height);
  playgroundView.ox = (playgroundView.width - sim2d.playground.width * playgroundView.scale) / 2;
  playgroundView.oy = (playgroundView.height - sim2d.playground.height * playgroundView.scale) / 2;
  playgroundBox.width = sim2d.playground.width * playgroundView.scale;
  playgroundBox.height = sim2d.playground.height * playgroundView.scale;
  playgroundBox.x = playgroundView.x + playgroundView.ox;
  playgroundBox.y = playgroundView.y + playgroundView.oy;
  if (this.uiConfig.toolbarCustomizationMode) {
    var customizationBox = simCanvas.css.getBox({tag:"widget", id:"vpl-customize"});
    simCanvas.addDecoration(function(ctx) {
      simCanvas.drawWidget("vpl:customize", playgroundView.x + playgroundView.width / 2, playgroundView.y + playgroundView.height / 2, customizationBox);
    });
  } else {
    var robotSize = robot.robotSize;
    var temporaryPause = false;
    var playgroundItem = new A3a.vpl.CanvasItem(null, sim2d.playground.width * playgroundView.scale, sim2d.playground.height * playgroundView.scale, playgroundView.x + playgroundView.ox, playgroundView.y + playgroundView.oy, function(canvas, item, dx, dy) {
      var ctx = canvas.ctx;
      ctx.save();
      playgroundAreaBox.draw(ctx);
      playgroundBox.draw(ctx);
      if (self.simMaps === null) {
        switch(sim2d.currentMap) {
          case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
            ctx.drawImage(sim2d.groundCanvas, item.x + dx, item.y + dy, item.width, item.height);
            break;
          case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
            if (sim2d.heightImage != null) {
              ctx.drawImage(sim2d.heightCanvas, item.x + dx, item.y + dy, item.width, item.height);
            }
            break;
          case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
            ctx.save();
            ctx.translate(item.x + dx + item.width / 2, item.y + dy + item.height / 2);
            ctx.scale(playgroundView.scale, -playgroundView.scale);
            sim2d.obstacles.draw(ctx);
            ctx.restore();
            break;
        }
      } else {
        ctx.drawImage(sim2d.groundCanvas, item.x + dx, item.y + dy, item.width, item.height);
        if (sim2d.heightImage != null) {
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.drawImage(sim2d.heightCanvas, item.x + dx, item.y + dy, item.width, item.height);
          ctx.restore();
        }
        if (sim2d.hasObstacles) {
          ctx.save();
          ctx.translate(item.x + dx + item.width / 2, item.y + dy + item.height / 2);
          ctx.scale(playgroundView.scale, -playgroundView.scale);
          sim2d.obstacles.draw(ctx);
          ctx.restore();
        }
      }
      ctx.translate(item.x + dx + item.width / 2, item.y + dy + item.height / 2);
      ctx.scale(playgroundView.scale, playgroundView.scale);
      ctx.translate(robot.pos[0], -robot.pos[1]);
      ctx.rotate(0.5 * Math.PI - robot.theta);
      ctx.beginPath();
      ctx.moveTo(0, 0.2 * robotSize);
      ctx.lineTo(0.5 * robotSize, 0.2 * robotSize);
      ctx.lineTo(0.5 * robotSize, -0.55 * robotSize);
      ctx.bezierCurveTo(0.3 * robotSize, -0.8 * robotSize, 0.02 * robotSize, -0.8 * robotSize, 0, -0.8 * robotSize);
      ctx.bezierCurveTo(-0.02 * robotSize, -0.8 * robotSize, -0.3 * robotSize, -0.8 * robotSize, -0.5 * robotSize, -0.55 * robotSize);
      ctx.lineTo(-0.5 * robotSize, 0.2 * robotSize);
      ctx.closePath();
      ctx.fillStyle = A3a.vpl.VPLSim2DViewer.color(robot["get"]("leds.top"));
      ctx.strokeStyle = "black";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2;
      ctx.moveTo(0.05 * robotSize, 0);
      ctx.arc(0, 0, 0.05 * robotSize, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      if (!sim2d.running || sim2d.paused) {
        ctx.beginPath();
        ctx.arc(0, 0, robotSize, 0, 2 * Math.PI);
        ctx.strokeStyle = simCanvas.state.moving ? "navy" : "#3cf";
        ctx.lineWidth = robotSize * 0.1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, -robotSize, 0.15 * robotSize, 0, 2 * Math.PI);
        ctx.fillStyle = simCanvas.state.orienting ? "navy" : "white";
        ctx.strokeStyle = simCanvas.state.orienting ? "navy" : "#3cf";
        ctx.lineWidth = robotSize * 0.06;
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }, {mousedown:function(canvas, data, width, height, left, top, ev) {
      var x = (ev.x - left - width / 2) / playgroundView.scale;
      var y = (height / 2 - (ev.y - top)) / playgroundView.scale;
      var xr = x - robot.pos[0];
      var yr = y - robot.pos[1];
      var xHandle = robotSize * Math.cos(robot.theta);
      var yHandle = robotSize * Math.sin(robot.theta);
      if ((!sim2d.running || sim2d.paused) && (xr - xHandle) * (xr - xHandle) + (yr - yHandle) * (yr - yHandle) < 0.1 * robotSize * robotSize) {
        simCanvas.state.x = x;
        simCanvas.state.y = y;
        simCanvas.state.orienting = true;
        return 1;
      }
      if (xr * xr + yr * yr < robotSize * robotSize) {
        if (!sim2d.paused) {
          robot["suspend"]();
          temporaryPause = true;
        } else {
          temporaryPause = false;
        }
        simCanvas.state.x = x;
        simCanvas.state.y = y;
        simCanvas.state.moving = true;
        return 0;
      }
      return null;
    }, mousedrag:function(canvas, data, dragIndex, width, height, left, top, ev) {
      var x = (ev.x - left - width / 2) / playgroundView.scale;
      var y = (height / 2 - (ev.y - top)) / playgroundView.scale;
      switch(dragIndex) {
        case 0:
          var pt0 = robot.pos;
          robot["setPosition"]([robot.pos[0] + x - simCanvas.state.x, robot.pos[1] + y - simCanvas.state.y], robot.theta);
          sim2d.drawPen(A3a.vpl.Robot.TraceShape.line, [pt0[0], pt0[1], robot.pos[0], robot.pos[1]]);
          break;
        case 1:
          var dtheta = Math.atan2(y - robot.pos[1], x - robot.pos[0]) - Math.atan2(simCanvas.state.y - robot.pos[1], simCanvas.state.x - robot.pos[0]);
          robot["setPosition"](robot.pos, robot.theta + dtheta);
          break;
      }
      simCanvas.state.x = x;
      simCanvas.state.y = y;
    }, mouseup:function(canvas, data, dragIndex) {
      simCanvas.state.moving = false;
      simCanvas.state.orienting = false;
      if (temporaryPause) {
        robot["resume"](A3a.vpl.VPLSim2DViewer.currentTime());
      }
    }});
    playgroundItem.draggable = false;
    simCanvas.setItem(playgroundItem);
  }
  if (this.simHint) {
    simCanvas.addDecoration(function(ctx) {
      var box = simCanvas.css.getBox({tag:"hint"});
      ctx.fillStyle = box.color;
      ctx.font = box.cssFontString();
      ctx.textAlign = "start";
      ctx.textBaseline = "middle";
      var msg = self.i18n.translate(self.simHint);
      box.width = ctx.measureText(msg).width;
      box.height = box.fontSize * 1.2;
      box.drawAt(ctx, box.marginLeft, canvasSize.height - box.totalHeight() + box.marginTop, true);
      ctx.fillText(msg, box.offsetLeft(), canvasSize.height - box.totalHeight() + box.offsetTop() + box.height / 2);
    });
  }
  simCanvas.redraw();
  if (!sim2d.paused && robot["shouldRunContinuously"]()) {
    this.requestRendering();
  }
};
A3a.vpl.Application.prototype.requestRendering = function() {
  if (!this.sim2d.renderingPending) {
    this.sim2d.renderingPending = true;
    var self = this;
    window.requestAnimationFrame(function() {
      self.sim2d.renderingPending = false;
      self.renderSim2dViewer();
    });
  }
};
A3a.vpl.VPLSim2DViewer.currentTime = function() {
  return (new Date).getTime() * 1e-3;
};
A3a.vpl.VPLSim2DViewer.prototype.resize = function(app) {
  var width = window.innerWidth;
  var height = window.innerHeight;
  if (window["vplDisableResize"]) {
    var bnd = this.simCanvas.canvas.getBoundingClientRect();
    width = bnd.width;
    height = bnd.height;
  }
  this.simCanvas.dims = this.simCanvas.dims;
  this.simCanvas.resize(width, height);
  app.renderSim2dViewer();
};
A3a.vpl.Application.prototype.addSim2DCommands = function() {
  this.commands.add("sim:close", {action:function(app, modifier) {
    app.setView(["sim"], {closeView:true});
  }, object:this, isAvailable:function(app) {
    return app.views.length > 1 && app.views.indexOf("sim") >= 0;
  }});
  this.commands.add("sim:restart", {action:function(app, modifier) {
    app.restoreGround();
    app.sim2d.robot["reset"](A3a.vpl.VPLSim2DViewer.currentTime());
    app.sim2d.robot["start"]();
    app.sim2d.running = true;
    app.sim2d.paused = false;
    app.renderSim2dViewer();
  }, object:this});
  this.commands.add("sim:pause", {action:function(app, modifier) {
    if (app.sim2d.running) {
      app.sim2d.paused = !app.sim2d.paused;
      if (app.sim2d.paused) {
        app.sim2d.robot["suspend"]();
      } else {
        app.sim2d.robot["resume"](A3a.vpl.VPLSim2DViewer.currentTime());
        app.renderSim2dViewer();
      }
    }
  }, isEnabled:function(app) {
    return app.sim2d.running;
  }, isSelected:function(app) {
    return app.sim2d.paused;
  }, object:this, possibleStates:[{selected:false}, {selected:true}]});
  this.commands.add("sim:speedup", {action:function(app, modifier) {
    var s = [0.5, 1, 2, 5, 10];
    app.sim2d.robot.setSpeedupFactor(s[(s.indexOf(app.sim2d.robot.speedupFactor) + 1) % s.length]);
  }, isSelected:function(app) {
    return app.sim2d.robot.speedupFactor !== 1;
  }, getState:function(app) {
    return app.sim2d.robot.speedupFactor;
  }, object:this, possibleStates:[{selected:false, state:1}, {selected:true, state:0.5}, {selected:true, state:2}, {selected:true, state:5}, {selected:true, state:10}]});
  this.commands.add("sim:noise", {action:function(app, modifier) {
    app.sim2d.robot.hasNoise = !app.sim2d.robot.hasNoise;
  }, isSelected:function(app) {
    return app.sim2d.robot.hasNoise;
  }, object:this, possibleStates:[{selected:false}, {selected:true}]});
  this.commands.add("sim:pen", {action:function(app, modifier) {
    app.sim2d.penDown = !app.sim2d.penDown;
  }, isSelected:function(app) {
    return app.sim2d.penDown;
  }, object:this, possibleStates:[{selected:false}, {selected:true}]});
  this.commands.add("sim:clear", {action:function(app, modifier) {
    app.restoreGround();
  }, isEnabled:function(app) {
    return app.sim2d.groundCanvasDirty;
  }, object:this});
  this.commands.add("sim:map-kind", {action:function(app, modifier) {
    switch(app.sim2d.currentMap) {
      case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
        app.sim2d.currentMap = A3a.vpl.VPLSim2DViewer.playgroundMap.height;
        break;
      case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
        app.sim2d.currentMap = A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle;
        break;
      case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
        app.sim2d.currentMap = A3a.vpl.VPLSim2DViewer.playgroundMap.ground;
        break;
    }
  }, getState:function(app) {
    switch(app.sim2d.currentMap) {
      case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
        return "ground";
      case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
        return "height";
      case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
        return "obstacles";
      default:
        return "ground";
    }
  }, object:this, possibleStates:[{state:"ground"}, {state:"height"}, {state:"obstacles"}], isAvailable:function(app) {
    return app.simMaps === null;
  }});
  this.commands.add("sim:map", {action:function(app, modifier) {
    switch(app.sim2d.currentMap) {
      case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
        app.setImage(app.sim2d.groundImage == null ? app.sim2d.disabledGroundImage : null);
        break;
      case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
        app.setImage(app.sim2d.heightImage == null ? app.sim2d.disabledHeightImage : null);
        break;
      case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
        app.setSVG(app.sim2d.hasObstacles ? null : app.sim2d.disabledObstacleSVG);
        break;
    }
  }, isSelected:function(app) {
    switch(app.sim2d.currentMap) {
      case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
        return app.sim2d.groundImage != null;
      case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
        return app.sim2d.heightImage != null;
      case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
        return app.sim2d.hasObstacles;
    }
    throw "internal";
  }, getState:function(app) {
    switch(app.sim2d.currentMap) {
      case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
        return "ground";
      case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
        return "height";
      case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
        return "obstacles";
      default:
        return "ground";
    }
  }, object:this, possibleStates:[{selected:false, state:"ground"}, {selected:false, state:"height"}, {selected:false, state:"obstacles"}, {selected:true, state:"ground"}, {selected:true, state:"height"}, {selected:true, state:"obstacles"}], isAvailable:function(app) {
    return app.simMaps === null;
  }});
  this.commands.add("sim:map-ground", {action:function(app, modifier) {
    if (modifier) {
      app.loadBox.show("Open ground image file", ".gif,.png,.jpg,.svg", function(file) {
        var fileReader = new window.FileReader;
        fileReader.onload = function(event) {
          var data = event.target.result;
          var img = new Image;
          img.addEventListener("load", function() {
            app.setImage(img, A3a.vpl.VPLSim2DViewer.playgroundMap.ground);
          });
          img.src = data;
        };
        fileReader["readAsDataURL"](file);
      });
    } else {
      app.setImage(app.sim2d.groundImage == null ? app.sim2d.disabledGroundImage : null, A3a.vpl.VPLSim2DViewer.playgroundMap.ground);
    }
  }, isSelected:function(app) {
    return app.sim2d.groundImage != null;
  }, object:this, possibleStates:[{selected:false}, {selected:true}], isAvailable:function(app) {
    return app.simMaps && app.simMaps.indexOf("ground") >= 0;
  }});
  this.commands.add("sim:map-height", {action:function(app, modifier) {
    if (modifier) {
      app.loadBox.show("Open height image file", ".gif,.png,.jpg,.svg", function(file) {
        var fileReader = new window.FileReader;
        fileReader.onload = function(event) {
          var data = event.target.result;
          var img = new Image;
          img.addEventListener("load", function() {
            app.setImage(img, A3a.vpl.VPLSim2DViewer.playgroundMap.height);
          });
          img.src = data;
        };
        fileReader["readAsDataURL"](file);
      });
    } else {
      app.setImage(app.sim2d.heightImage == null ? app.sim2d.disabledHeightImage : null, A3a.vpl.VPLSim2DViewer.playgroundMap.height);
    }
  }, isSelected:function(app) {
    return app.sim2d.heightImage != null;
  }, object:this, possibleStates:[{selected:false}, {selected:true}], isAvailable:function(app) {
    return app.simMaps && app.simMaps.indexOf("height") >= 0;
  }});
  this.commands.add("sim:map-obstacles", {action:function(app, modifier) {
    if (modifier) {
      app.loadBox.show("Open obstacle SVG file", ".svg", function(file) {
        var fileReader = new window.FileReader;
        fileReader.onload = function(event) {
          var data = event.target.result;
          app.setSVG(data, A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle);
        };
        fileReader["readAsText"](file);
      });
    } else {
      app.setSVG(app.sim2d.hasObstacles ? null : app.sim2d.disabledObstacleSVG, A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle);
    }
  }, isSelected:function(app) {
    return app.sim2d.hasObstacles;
  }, object:this, possibleStates:[{selected:false}, {selected:true}], isAvailable:function(app) {
    return app.simMaps && app.simMaps.indexOf("obstacles") >= 0;
  }});
  this.commands.add("sim:vpl", {action:function(app, modifier) {
    if (app.multipleViews) {
      app.setView(["vpl"], {openView:true});
    } else {
      app.setView(["vpl"], {fromView:"sim"});
    }
  }, isEnabled:function(app) {
    return app.editor == null || app.editor.doesMatchVPL();
  }, object:this, isAvailable:function(app) {
    return (app.editor == null || !app.editor.noVPL) && app.views.indexOf("vpl") < 0;
  }});
  this.commands.add("sim:text", {action:function(app, modifier) {
    if (app.multipleViews) {
      app.setView(["src"], {openView:true, unlocked:!app.editor.isLockedWithVPL});
    } else {
      app.setView(["src"], {fromView:"sim", unlocked:!app.editor.isLockedWithVPL});
    }
  }, object:this, isAvailable:function(app) {
    return app.views.indexOf("src") < 0;
  }});
  this.commands.add("sim:teacher-reset", {action:function(app, modifier) {
    app.sim2d.resetUI();
    app.renderSim2dViewer();
  }, object:this, keep:true, isAvailable:function(app) {
    return app.sim2d.teacherRole && app.sim2d.uiConfig.toolbarCustomizationMode;
  }});
  this.commands.add("sim:teacher", {action:function(app, modifier) {
    app.sim2d.uiConfig.toolbarCustomizationMode = !app.sim2d.uiConfig.toolbarCustomizationMode;
    app.renderSim2dViewer();
  }, isSelected:function(app) {
    return app.sim2d.uiConfig.toolbarCustomizationMode;
  }, object:this, keep:true, isAvailable:function(app) {
    return app.sim2d.teacherRole;
  }, possibleStates:[{selected:false}, {selected:true}]});
};
A3a.vpl.Application.prototype.installThymio = function(options) {
  var app = this;
  return new A3a.vpl.RunGlue({run:function(language, code) {
    app.robots[app.currentRobotIndex].runGlue.state.putA3aCodeAsync(code);
  }, init:function(language) {
    try {
      var origin = (options ? options.asebahttp : vplGetHashOption("asebahttp")) || (document.location.origin.slice(0, 5) !== "http:" ? "http://127.0.0.1:3000" : document.location.origin);
      A3a.NodeProxy.init(origin, function() {
        app.robots[app.currentRobotIndex].runGlue.state = A3a.Node.getNodeList()[0];
        app.vplCanvas.update();
      });
    } catch (e) {
      console.info(e);
      app.vplCanvas.update();
    }
  }, isConnected:function() {
    return app.robots[app.currentRobotIndex].runGlue.state != null;
  }, isEnabled:function(language) {
    return language === "aseba" && app.robots[app.currentRobotIndex].runGlue.state != null;
  }, getName:function() {
    return "Thymio (HTTP)";
  }, preferredLanguage:"aseba", languages:["aseba", "l2"], state:null});
};
A3a.vpl.Application.prototype.installThymioTDM = function(options) {
  var app = this;
  var tdm = null;
  if (options == undefined) {
    options = {w:vplGetHashOption("w"), pass:vplGetHashOption("pass") || "", uuid:vplGetHashOption("uuid") || "auto"};
  }
  return new A3a.vpl.RunGlue({run:function(language, code) {
    tdm["run"](code, null, function(e) {
      console.info("Run error");
      console.info(e);
    });
  }, check:function(language, code, checkFun) {
    tdm["check"](code, function() {
      checkFun(null);
    }, function(e) {
      checkFun(e);
    });
    return null;
  }, init:function(language) {
    try {
      tdm = new window["TDM"](options.w, {"password":options.pass || "", "uuid":options.uuid || "auto", "change":function(connected) {
        console.info("tdm node changed", connected);
        app.robots[app.currentRobotIndex].runGlue.state = connected ? {} : null;
        app.vplCanvas.update();
      }});
    } catch (e) {
      console.info(e);
      app.vplCanvas.update();
    }
  }, close:function() {
    tdm["close"]();
  }, isConnected:function() {
    return app.robots[app.currentRobotIndex].runGlue.state != null && tdm["isConnected"]();
  }, isEnabled:function(language) {
    return language === "aseba" && app.robots[app.currentRobotIndex].runGlue.state != null && tdm["canRun"]();
  }, getName:function() {
    return "Thymio (TDM)";
  }, flash:function(language, code) {
    tdm["flash"](code);
  }, canFlash:function(language) {
    return language === "aseba" && app.robots[app.currentRobotIndex].runGlue.state != null && tdm["canRun"]();
  }, preferredLanguage:"aseba", languages:["aseba"], state:null, params:options});
};
var ThymioJSONWebSocketBridge = function(wsURL) {
  this.wsURL = wsURL || "ws://127.0.0.1:8002/";
  this.nodes = {};
  this.onConnectNode = null;
  this.onDisconnectNode = null;
  this.onVariableReceived = null;
};
ThymioJSONWebSocketBridge.prototype.connect = function() {
  this.ws = new WebSocket(this.wsURL);
  var self = this;
  this.ws.addEventListener("open", function() {
    var msg = {"type":"nodes"};
    self.ws.send(JSON.stringify(msg));
  });
  this.ws.addEventListener("message", function(event) {
    try {
      var msg = JSON.parse(event.data);
      switch(msg["type"]) {
        case "connect":
          if (msg["id"]) {
            var id = msg["id"];
            self.nodes[id] = msg;
            self.onConnectNode && self.onConnectNode(id, msg["descr"]);
          }
          break;
        case "disconnect":
          var id = msg["id"];
          delete self.nodes[id];
          self.onDisconnectNode && self.onDisconnectNode(id);
          break;
        case "var":
          self.onVariableReceived && self.onVariableReceived(msg["id"], msg["var"]);
          break;
      }
    } catch (e) {
    }
  });
};
ThymioJSONWebSocketBridge.prototype.getNode = function(id) {
  return this.nodes[id];
};
ThymioJSONWebSocketBridge.prototype.subscribe = function(id, varList) {
  var msg = {"type":"subscribe", "id":id, "names":varList};
  this.ws.send(JSON.stringify(msg));
};
ThymioJSONWebSocketBridge.prototype.run = function(id, bytecode) {
  var msg = {"type":"run", "id":id, "bc":bytecode};
  this.ws.send(JSON.stringify(msg));
};
A3a.vpl.Application.prototype.installThymioJSONWebSocketBridge = function() {
  var app = this;
  var jws = null;
  var uuid = vplGetHashOption("uuid") || null;
  if (uuid) {
    uuid = uuid.replace(/^\{(.*)\}$/, "$1");
  }
  var asebaNode = null;
  return new A3a.vpl.RunGlue({run:function(language, code) {
    var compiler;
    switch(language) {
      case "aseba":
        compiler = new A3a.Compiler(asebaNode, code);
        compiler.functionLib = A3a.A3aNode.stdMacros;
        var bytecode = compiler.compile();
        break;
      case "l2":
        compiler = new A3a.Compiler(asebaNode, code);
        compiler.functionLib = A3a.A3aNode.stdMacrosL2;
        var bytecode = compiler.compile();
        break;
      case "asm":
        compiler = new A3a.Assembler(asebaNode, code);
        var bytecode = compiler.assemble();
        break;
    }
    jws.run(uuid, bytecode);
  }, init:function(language) {
    try {
      var url = vplGetHashOption("w") || (document.location.origin.slice(0, 5) !== "http:" ? "ws://127.0.0.1:8002" : document.location.origin.replace(/^http/, "ws"));
      jws = new ThymioJSONWebSocketBridge(url);
      jws.onConnectNode = function(id, descr) {
        if (uuid == null || id === uuid) {
          asebaNode = new A3a.A3aNode(descr);
          app.robots[app.currentRobotIndex].runGlue.state = {};
          app.vplCanvas.update();
        }
      };
      jws.onDisconnectNode = function(id) {
        if (uuid == null || id === uuid) {
          app.robots[app.currentRobotIndex].runGlue.state = null;
          app.vplCanvas.update();
        }
      };
      jws.connect();
    } catch (e) {
      console.info(e);
      app.vplCanvas.update();
    }
  }, isConnected:function() {
    return app.robots[app.currentRobotIndex].runGlue.state != null;
  }, isEnabled:function(language) {
    return (language === "aseba" || language === "l2" || language === "asm") && app.robots[app.currentRobotIndex].runGlue.state != null;
  }, getName:function() {
    return "Thymio (JWS)";
  }, preferredLanguage:"aseba", languages:["aseba", "l2", "asm"], state:null});
};

}).call(this);
