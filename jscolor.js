/**
 * jscolor - JavaScript Color Picker
 *
 * @link    http://jscolor.com
 * @license For open source use: GPLv3
 *          For commercial use: JSColor Commercial License
 * @author  Jan Odvarko
 *
 * See usage examples at http://jscolor.com/examples/
 */


"use strict";


if (!window.jscolor) {

window.jscolor = (function () { // BEGIN window.jscolor

var jsc = {


	initialized : false,

	instances : [], // created instances of jscolor

	triggerQueue : [], // events waiting to be triggered after init


	register : function () {
		jsc.attachDOMReadyEvent(jsc.init);
		jsc.attachEvent(document, 'mousedown', jsc.onDocumentMouseDown);
		jsc.attachEvent(document, 'touchstart', jsc.onDocumentTouchStart);
		jsc.attachEvent(document, 'keyup', jsc.onDocumentKeyUp);
		jsc.attachEvent(window, 'resize', jsc.onWindowResize);
	},


	init : function () {
		if (jsc.initialized) {
			return;
		}

		jsc.pub.install();
		jsc.initialized = true;

		// trigger events waiting in the queue
		while (jsc.triggerQueue.length) {
			var ev = jsc.triggerQueue.shift();
			jsc.triggerGlobal(ev);
		}
	},


	installBySelector : function (selector) {
		var elms = document.querySelectorAll(selector);

		// for backward compatibility with DEPRECATED installation/configuration using className
		var matchClass = new RegExp('(^|\\s)(' + jsc.pub.lookupClass + ')(\\s*(\\{[^}]*\\})|\\s|$)', 'i');

		for (var i = 0; i < elms.length; i += 1) {

			if (elms[i].jscolor !== undefined) {
				continue; // jscolor already installed on this element
			}

			if (elms[i].type !== undefined && elms[i].type.toLowerCase() == 'color' && jsc.isColorAttrSupported) {
				continue; // skips inputs of type 'color' if supported by the browser
			}

			var dataOpts, m;

			if (
				(dataOpts = jsc.getDataAttr(elms[i], 'jscolor')) !== null ||
				(elms[i].className && (m = elms[i].className.match(matchClass))) // installation using className (DEPRECATED)
			) {
				var targetElm = elms[i];
				var optsStr = null;

				if (dataOpts !== null) {
					optsStr = dataOpts;
				} else if (m) { // installation using className (DEPRECATED)
					console.warn('Installation using class name is DEPRECATED. Use data-jscolor="" attribute instead.');
					if (m[4]) {
						optsStr = m[4];
					}
				}

				var opts = {};
				if (optsStr) {
					try {
						opts = jsc.parseOptionsStr(optsStr);
					} catch(e) {
						console.warn(e + '\n' + optsStr);
					}
				}

				new jsc.pub(targetElm, opts);
			}
		}
	},


	parseOptionsStr : function (str) {
		var opts = {};

		try {
			opts = JSON.parse(str);
		} catch (eParse) {
			if (!jsc.pub.looseJSON) {
				throw 'Could not parse jscolor options as JSON: ' + eParse;
			} else {
				// loose JSON syntax is enabled -> try to evaluate the options string as JavaScript object
				try {
					opts = (new Function ('var opts = (' + str + '); return typeof opts === "object" ? opts : {};'))();
				} catch(eEval) {
					throw 'Could not evaluate jscolor options: ' + eEval;
				}
			}
		}

		return opts;
	},


	getInstances : function () {
		var inst = [];
		for (var i = 0; i < jsc.instances.length; i += 1) {
			// if the targetElement still exists, the instance is considered "alive"
			if (jsc.instances[i] && jsc.instances[i].targetElement) {
				inst.push(jsc.instances[i]);
			}
		}
		return inst;
	},


	fetchElement : function (elementOrSelector) {
		if (!elementOrSelector) {
			return null;
		}

		if (typeof elementOrSelector === 'string') {
			// query selector
			var sel = elementOrSelector;
			var el = null;
			try {
				el = document.querySelector(sel);
			} catch (e) {
				console.warn(e);
				return null;
			}
			if (!el) {
				console.warn('No element matches the selector: %s', sel);
			}
			return el;
		}

		if (typeof elementOrSelector === 'object' && elementOrSelector instanceof HTMLElement) {
			// HTML element
			return elementOrSelector;
		}

		console.warn('Invalid element of type %s: %s', typeof elementOrSelector, elementOrSelector);
		return null;
	},


	nodeName : function (node) {
		if (node && node.nodeName) {
			return node.nodeName.toLowerCase();
		}
		return false;
	},


	isTextInput : function (el) {
		return el && jsc.nodeName(el) === 'input' && el.type.toLowerCase() === 'text';
	},


	isButton : function (el) {
		if (!el) {
			return false;
		}
		var n = jsc.nodeName(el);
		return (
			(n === 'button') ||
			(n === 'input' && ['button', 'submit', 'reset'].indexOf(el.type.toLowerCase()) > -1)
		);
	},


	isButtonEmpty : function (el) {
		switch (jsc.nodeName(el)) {
			case 'input': return (!el.value || el.value.trim() === '');
			case 'button': return (el.textContent.trim() === '');
		}
		return null; // could not determine element's text
	},


	isColorAttrSupported : (function () {
		var elm = document.createElement('input');
		if (elm.setAttribute) {
			elm.setAttribute('type', 'color');
			if (elm.type.toLowerCase() == 'color') {
				return true;
			}
		}
		return false;
	})(),


	// TODO: do not use and remove (always consider canvas supported)
	isCanvasSupported : (function () {
		var elm = document.createElement('canvas');
		return !!(elm.getContext && elm.getContext('2d'));
	})(),


	getDataAttr : function (el, name) {
		var attrName = 'data-' + name;
		var attrValue = el.getAttribute(attrName);
		if (attrValue !== null) {
			return attrValue;
		}
		return null;
	},


	attachEvent : function (el, evnt, func) {
		el.addEventListener(evnt, func, false);
	},


	detachEvent : function (el, evnt, func) {
		el.removeEventListener(evnt, func, false);
	},


	_attachedGroupEvents : {},


	attachGroupEvent : function (groupName, el, evnt, func) {
		if (!jsc._attachedGroupEvents.hasOwnProperty(groupName)) {
			jsc._attachedGroupEvents[groupName] = [];
		}
		jsc._attachedGroupEvents[groupName].push([el, evnt, func]);
		jsc.attachEvent(el, evnt, func);
	},


	detachGroupEvents : function (groupName) {
		if (jsc._attachedGroupEvents.hasOwnProperty(groupName)) {
			for (var i = 0; i < jsc._attachedGroupEvents[groupName].length; i += 1) {
				var evt = jsc._attachedGroupEvents[groupName][i];
				jsc.detachEvent(evt[0], evt[1], evt[2]);
			}
			delete jsc._attachedGroupEvents[groupName];
		}
	},


	attachDOMReadyEvent : function (func) {
		if (document.addEventListener) {
			document.addEventListener('DOMContentLoaded', func, false);
		}
	},


	preventDefault : function (e) {
		if (e.preventDefault) { e.preventDefault(); }
		e.returnValue = false;
	},


	captureTarget : function (target) {
		// IE
		if (target.setCapture) {
			jsc._capturedTarget = target;
			jsc._capturedTarget.setCapture();
		}
	},


	releaseTarget : function () {
		// IE
		if (jsc._capturedTarget) {
			jsc._capturedTarget.releaseCapture();
			jsc._capturedTarget = null;
		}
	},


	triggerEvent : function (el, eventName, bubbles, cancelable, customData) {
		if (!el) {
			return;
		}

		if (customData === undefined) {
			customData = {};
		}

		var ev = null;

		if (typeof Event === 'function') {
			ev = new Event(eventName, {
				bubbles: bubbles,
				cancelable: cancelable
			});
		} else {
			// IE
			ev = document.createEvent('Event');
			ev.initEvent(eventName, bubbles, cancelable);
		}

		if (!ev) {
			return false;
		}

		ev._data_jsc = customData;
		el.dispatchEvent(ev);
		return true;
	},


	triggerInputEvent : function (el, eventName, bubbles, cancelable, customData) {
		if (jsc.isTextInput(el)) {
			jsc.triggerEvent(el, eventName, bubbles, cancelable, customData);
		}
	},


	strList : function (str) {
		if (!str) {
			return [];
		}
		return str.replace(/^\s+|\s+$/g, '').split(/\s+/);
	},


	// The className parameter (str) can only contain a single class name
	hasClass : function (elm, className) {
		if (!className) {
			return false;
		}
		if (elm.classList !== undefined) {
			return elm.classList.contains(className);
		}
		// polyfill
		return -1 != (' ' + elm.className.replace(/\s+/g, ' ') + ' ').indexOf(' ' + className + ' ');
	},


	// The className parameter (str) can contain multiple class names separated by whitespace
	addClass : function (elm, className) {
		var classNames = jsc.strList(className);

		if (elm.classList !== undefined) {
			for (var i = 0; i < classNames.length; i += 1) {
				elm.classList.add(classNames[i]);
			}
			return;
		}
		// polyfill
		for (var i = 0; i < classNames.length; i += 1) {
			if (!jsc.hasClass(elm, classNames[i])) {
				elm.className += (elm.className ? ' ' : '') + classNames[i];
			}
		}
	},


	// The className parameter (str) can contain multiple class names separated by whitespace
	removeClass : function (elm, className) {
		var classNames = jsc.strList(className);

		if (elm.classList !== undefined) {
			for (var i = 0; i < classNames.length; i += 1) {
				elm.classList.remove(classNames[i]);
			}
			return;
		}
		// polyfill
		for (var i = 0; i < classNames.length; i += 1) {
			var repl = new RegExp(
				'^\\s*' + classNames[i] + '\\s*|' +
				'\\s*' + classNames[i] + '\\s*$|' +
				'\\s+' + classNames[i] + '(\\s+)',
				'g'
			);
			elm.className = elm.className.replace(repl, '$1');
		}
	},


	getCompStyle : function (elm) {
		var compStyle = window.getComputedStyle ? window.getComputedStyle(elm) : elm.currentStyle;

		// Note: In Firefox, getComputedStyle returns null in a hidden iframe,
		// that's why we need to check if the returned value is non-empty
		if (!compStyle) {
			return {};
		}
		return compStyle;
	},


	setStyle : function (elm, styles, important) {
		// using '' for standard priority (IE10 apparently doesn't like value undefined)
		var priority = important ? 'important' : '';

		for (var prop in styles) {
			if (styles.hasOwnProperty(prop)) {
				elm.style.setProperty(prop, styles[prop], priority);
			}
		}
	},


	setBorderRadius : function (elm, value) {
		jsc.setStyle(elm, {'border-radius' : value || '0'});
	},


	setBoxShadow : function (elm, value) {
		jsc.setStyle(elm, {'box-shadow': value || 'none'});
	},


	getElementPos : function (e, relativeToViewport) {
		var x=0, y=0;
		var rect = e.getBoundingClientRect();
		x = rect.left;
		y = rect.top;
		if (!relativeToViewport) {
			var viewPos = jsc.getViewPos();
			x += viewPos[0];
			y += viewPos[1];
		}
		return [x, y];
	},


	getElementSize : function (e) {
		return [e.offsetWidth, e.offsetHeight];
	},


	// get pointer's X/Y coordinates relative to viewport
	getAbsPointerPos : function (e) {
		var x = 0, y = 0;
		if (typeof e.changedTouches !== 'undefined' && e.changedTouches.length) {
			// touch devices
			x = e.changedTouches[0].clientX;
			y = e.changedTouches[0].clientY;
		} else if (typeof e.clientX === 'number') {
			x = e.clientX;
			y = e.clientY;
		}
		return { x: x, y: y };
	},


	// get pointer's X/Y coordinates relative to target element
	getRelPointerPos : function (e) {
		var target = e.target || e.srcElement;
		var targetRect = target.getBoundingClientRect();

		var x = 0, y = 0;

		var clientX = 0, clientY = 0;
		if (typeof e.changedTouches !== 'undefined' && e.changedTouches.length) {
			// touch devices
			clientX = e.changedTouches[0].clientX;
			clientY = e.changedTouches[0].clientY;
		} else if (typeof e.clientX === 'number') {
			clientX = e.clientX;
			clientY = e.clientY;
		}

		x = clientX - targetRect.left;
		y = clientY - targetRect.top;
		return { x: x, y: y };
	},


	getViewPos : function () {
		var doc = document.documentElement;
		return [
			(window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0),
			(window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0)
		];
	},


	getViewSize : function () {
		var doc = document.documentElement;
		return [
			(window.innerWidth || doc.clientWidth),
			(window.innerHeight || doc.clientHeight),
		];
	},


	// r: 0-255
	// g: 0-255
	// b: 0-255
	//
	// returns: [ 0-360, 0-100, 0-100 ]
	//
	RGB_HSV : function (r, g, b) {
		r /= 255;
		g /= 255;
		b /= 255;
		var n = Math.min(Math.min(r,g),b);
		var v = Math.max(Math.max(r,g),b);
		var m = v - n;
		if (m === 0) { return [ null, 0, 100 * v ]; }
		var h = r===n ? 3+(b-g)/m : (g===n ? 5+(r-b)/m : 1+(g-r)/m);
		return [
			60 * (h===6?0:h),
			100 * (m/v),
			100 * v
		];
	},


	// h: 0-360
	// s: 0-100
	// v: 0-100
	//
	// returns: [ 0-255, 0-255, 0-255 ]
	//
	HSV_RGB : function (h, s, v) {
		var u = 255 * (v / 100);

		if (h === null) {
			return [ u, u, u ];
		}

		h /= 60;
		s /= 100;

		var i = Math.floor(h);
		var f = i%2 ? h-i : 1-(h-i);
		var m = u * (1 - s);
		var n = u * (1 - s * f);
		switch (i) {
			case 6:
			case 0: return [u,n,m];
			case 1: return [n,u,m];
			case 2: return [m,u,n];
			case 3: return [m,n,u];
			case 4: return [n,m,u];
			case 5: return [u,m,n];
		}
	},


	parseColorString : function (str) {
		var ret = {
			rgba: null,
			format: null // 'hex' | 'rgb' | 'rgba'
		};

		var m;
		if (m = str.match(/^\W*([0-9A-F]{3}([0-9A-F]{3})?)\W*$/i)) {
			// HEX notation

			ret.format = 'hex';

			if (m[1].length === 6) {
				// 6-char notation
				ret.rgba = [
					parseInt(m[1].substr(0,2),16),
					parseInt(m[1].substr(2,2),16),
					parseInt(m[1].substr(4,2),16),
					null
				];
			} else {
				// 3-char notation
				ret.rgba = [
					parseInt(m[1].charAt(0) + m[1].charAt(0),16),
					parseInt(m[1].charAt(1) + m[1].charAt(1),16),
					parseInt(m[1].charAt(2) + m[1].charAt(2),16),
					null
				];
			}
			return ret;

		} else if (m = str.match(/^\W*rgba?\(([^)]*)\)\W*$/i)) {
			// rgb(...) or rgba(...) notation

			var params = m[1].split(',');
			var re = /^\s*(\d*)(\.\d+)?\s*$/;
			var mR, mG, mB, mA;
			if (
				params.length >= 3 &&
				(mR = params[0].match(re)) &&
				(mG = params[1].match(re)) &&
				(mB = params[2].match(re))
			) {
				ret.format = 'rgb';
				ret.rgba = [
					parseFloat((mR[1] || '0') + (mR[2] || '')),
					parseFloat((mG[1] || '0') + (mG[2] || '')),
					parseFloat((mB[1] || '0') + (mB[2] || '')),
					null
				];

				if (
					params.length >= 4 &&
					(mA = params[3].match(re))
				) {
					ret.format = 'rgba';
					ret.rgba[3] = parseFloat((mA[1] || '0') + (mA[2] || ''));
				}
				return ret;
			}
		}

		return false;
	},


	genColorPreviewCanvas : function (color, separatorPos, customWidth) { // TODO: implement args
		var sqSize = jsc.pub.chessboardSize;
		var sqColor1 = jsc.pub.chessboardColor1;
		var sqColor2 = jsc.pub.chessboardColor2;

		var canvas = document.createElement('canvas');
		canvas.width = customWidth !== undefined ? customWidth : sqSize * 2;
		canvas.height = sqSize * 2;

		var ctx = canvas.getContext('2d');

		// transparency chessboard - background
		ctx.fillStyle = sqColor1;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// transparency chessboard - squares
		ctx.fillStyle = sqColor2;
		for (var x = 0; x < canvas.width; x += sqSize * 2) {
			ctx.fillRect(x, 0, sqSize, sqSize);
			ctx.fillRect(x + sqSize, sqSize, sqSize, sqSize);
		}

		// actual color in foreground
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		if (customWidth !== undefined) {
			// TODO: draw border on the left (probably consisting of light and dark colors, like squares' colors. Light would probably look better on the left)
		}

		return canvas;
	},


	redrawPosition : function () {

		if (jsc.picker && jsc.picker.owner) {
			var thisObj = jsc.picker.owner;

			var tp, vp;

			if (thisObj.fixed) {
				// Fixed elements are positioned relative to viewport,
				// therefore we can ignore the scroll offset
				tp = jsc.getElementPos(thisObj.targetElement, true); // target pos
				vp = [0, 0]; // view pos
			} else {
				tp = jsc.getElementPos(thisObj.targetElement); // target pos
				vp = jsc.getViewPos(); // view pos
			}

			var ts = jsc.getElementSize(thisObj.targetElement); // target size
			var vs = jsc.getViewSize(); // view size
			var ps = jsc.getPickerOuterDims(thisObj); // picker size
			var a, b, c;
			switch (thisObj.position.toLowerCase()) {
				case 'left': a=1; b=0; c=-1; break;
				case 'right':a=1; b=0; c=1; break;
				case 'top':  a=0; b=1; c=-1; break;
				default:     a=0; b=1; c=1; break;
			}
			var l = (ts[b]+ps[b])/2;

			// compute picker position
			if (!thisObj.smartPosition) {
				var pp = [
					tp[a],
					tp[b]+ts[b]-l+l*c
				];
			} else {
				var pp = [
					-vp[a]+tp[a]+ps[a] > vs[a] ?
						(-vp[a]+tp[a]+ts[a]/2 > vs[a]/2 && tp[a]+ts[a]-ps[a] >= 0 ? tp[a]+ts[a]-ps[a] : tp[a]) :
						tp[a],
					-vp[b]+tp[b]+ts[b]+ps[b]-l+l*c > vs[b] ?
						(-vp[b]+tp[b]+ts[b]/2 > vs[b]/2 && tp[b]+ts[b]-l-l*c >= 0 ? tp[b]+ts[b]-l-l*c : tp[b]+ts[b]-l+l*c) :
						(tp[b]+ts[b]-l+l*c >= 0 ? tp[b]+ts[b]-l+l*c : tp[b]+ts[b]-l-l*c)
				];
			}

			var x = pp[a];
			var y = pp[b];
			var positionValue = thisObj.fixed ? 'fixed' : 'absolute';
			var contractShadow =
				(pp[0] + ps[0] > tp[0] || pp[0] < tp[0] + ts[0]) &&
				(pp[1] + ps[1] < tp[1] + ts[1]);

			jsc._drawPosition(thisObj, x, y, positionValue, contractShadow);
		}
	},


	_drawPosition : function (thisObj, x, y, positionValue, contractShadow) {
		var vShadow = contractShadow ? 0 : thisObj.shadowBlur; // px

		jsc.picker.wrap.style.position = positionValue;
		jsc.picker.wrap.style.left = x + 'px';
		jsc.picker.wrap.style.top = y + 'px';

		jsc.setBoxShadow(
			jsc.picker.boxS,
			thisObj.shadow ?
				new jsc.BoxShadow(0, vShadow, thisObj.shadowBlur, 0, thisObj.shadowColor) :
				null);
	},


	getPickerDims : function (thisObj) {
		var dims = [
			2 * thisObj.insetWidth + 2 * thisObj.padding + thisObj.width,
			2 * thisObj.insetWidth + 2 * thisObj.padding + thisObj.height
		];
		var sliderSpace = 2 * thisObj.insetWidth + jsc.getPadToSliderPadding(thisObj) + thisObj.sliderSize;
		if (jsc.getSliderChannel(thisObj)) {
			dims[0] += sliderSpace;
		}
		if (jsc.hasAlphaSlider(thisObj)) {
			dims[0] += sliderSpace;
		}
		if (thisObj.closable) {
			dims[1] += 2 * thisObj.insetWidth + thisObj.padding + thisObj.buttonHeight;
		}
		return dims;
	},


	getPickerOuterDims : function (thisObj) {
		var dims = jsc.getPickerDims(thisObj);
		return [
			dims[0] + 2 * thisObj.borderWidth,
			dims[1] + 2 * thisObj.borderWidth
		];
	},


	getPadToSliderPadding : function (thisObj) {
		return Math.max(thisObj.padding, 1.5 * (2 * thisObj.pointerBorderWidth + thisObj.pointerThickness));
	},


	getPadYChannel : function (thisObj) {
		switch (thisObj.mode.charAt(1).toLowerCase()) {
			case 'v': return 'v'; break;
		}
		return 's';
	},


	getSliderChannel : function (thisObj) {
		if (thisObj.mode.length > 2) {
			switch (thisObj.mode.charAt(2).toLowerCase()) {
				case 's': return 's'; break;
				case 'v': return 'v'; break;
			}
		}
		return null;
	},


	hasAlphaSlider : function (thisObj) {
		if (thisObj.alphaSlider || thisObj.alphaElement || thisObj._currentFormat === 'rgba') {
			return true;
		}
		return false;
	},


	onDocumentMouseDown : function (e) {
		var target = e.target || e.srcElement;

		if (target.jscolor) {
			if (target.jscolor.showOnClick) {
				target.jscolor.show();
			}
		} else if (target._jscControlName) {
			jsc.onControlPointerStart(e, target, target._jscControlName, 'mouse');
		} else {
			// Mouse is outside the picker controls -> hide the color picker!
			if (jsc.picker && jsc.picker.owner) {
				jsc.picker.owner.hide();
			}
		}
	},


	onDocumentTouchStart : function (e) {
		var target = e.target || e.srcElement;

		if (target.jscolor) {
			if (target.jscolor.showOnClick) {
				target.jscolor.show();
			}
		} else if (target._jscControlName) {
			jsc.onControlPointerStart(e, target, target._jscControlName, 'touch');
		} else {
			if (jsc.picker && jsc.picker.owner) {
				jsc.picker.owner.hide();
			}
		}
	},


	onDocumentKeyUp : function (e) {
		if (
			(e.code && e.code === 'Escape' || e.keyCode === 27) ||
			(e.code && e.code === 'Enter' || e.keyCode === 13) ||
			(e.code && e.code === 'Tab' || e.keyCode === 9)
		) {
			if (jsc.picker && jsc.picker.owner) {
				jsc.picker.owner.hide();
			}
		}
	},


	onWindowResize : function (e) {
		jsc.redrawPosition();
	},


	onParentScroll : function (e) {
		// hide the picker when one of the parent elements is scrolled
		if (jsc.picker && jsc.picker.owner) {
			jsc.picker.owner.hide();
		}
	},


	// calls function specified in picker's property
	triggerCallback : function (thisObj, prop) {
		if (!thisObj[prop]) {
			return;
		}
		var callback = null;

		if (typeof thisObj[prop] === 'string') {
			// string with code
			try {
				callback = new Function (thisObj[prop]);
			} catch(e) {
				console.error(e);
			}
		} else {
			// function
			callback = thisObj[prop];
		}

		if (callback) {
			callback.call(thisObj);
		}
	},


	// triggers a color change related event on all picker instances
	triggerGlobal : function (eventName) {
		var inst = jsc.getInstances();
		for (var i = 0; i < inst.length; i += 1) {
			inst[i].trigger(eventName);
		}
	},


	_pointerMoveEvent : {
		mouse: 'mousemove',
		touch: 'touchmove'
	},
	_pointerEndEvent : {
		mouse: 'mouseup',
		touch: 'touchend'
	},


	_pointerOrigin : null,
	_capturedTarget : null,


	onControlPointerStart : function (e, target, controlName, pointerType) {
		var thisObj = target._jscInstance;

		jsc.preventDefault(e);
		jsc.captureTarget(target);

		var registerDragEvents = function (doc, offset) {
			jsc.attachGroupEvent('drag', doc, jsc._pointerMoveEvent[pointerType],
				jsc.onDocumentPointerMove(e, target, controlName, pointerType, offset));
			jsc.attachGroupEvent('drag', doc, jsc._pointerEndEvent[pointerType],
				jsc.onDocumentPointerEnd(e, target, controlName, pointerType));
		};

		registerDragEvents(document, [0, 0]);

		if (window.parent && window.frameElement) {
			var rect = window.frameElement.getBoundingClientRect();
			var ofs = [-rect.left, -rect.top];
			registerDragEvents(window.parent.window.document, ofs);
		}

		var abs = jsc.getAbsPointerPos(e);
		var rel = jsc.getRelPointerPos(e);
		jsc._pointerOrigin = {
			x: abs.x - rel.x,
			y: abs.y - rel.y
		};

		switch (controlName) {
		case 'pad':
			// if the slider is at the bottom, move it up
			switch (jsc.getSliderChannel(thisObj)) {
			case 's': if (thisObj.channels.s === 0) { thisObj.fromHSVA(null, 100, null, null); }; break;
			case 'v': if (thisObj.channels.v === 0) { thisObj.fromHSVA(null, null, 100, null); }; break;
			}
			jsc.setPad(thisObj, e, 0, 0);
			break;

		case 'sld':
			jsc.setSld(thisObj, e, 0);
			break;

		case 'asld':
			jsc.setASld(thisObj, e, 0);
			break;
		}
		thisObj.trigger('input');
	},


	onDocumentPointerMove : function (e, target, controlName, pointerType, offset) {
		return function (e) {
			var thisObj = target._jscInstance;
			switch (controlName) {
			case 'pad':
				jsc.setPad(thisObj, e, offset[0], offset[1]);
				break;

			case 'sld':
				jsc.setSld(thisObj, e, offset[1]);
				break;

			case 'asld':
				jsc.setASld(thisObj, e, offset[1]);
				break;
			}
			thisObj.trigger('input');
		}
	},


	onDocumentPointerEnd : function (e, target, controlName, pointerType) {
		return function (e) {
			var thisObj = target._jscInstance;
			jsc.detachGroupEvents('drag');
			jsc.releaseTarget();

			// Always trigger changes AFTER detaching outstanding mouse handlers,
			// in case some color change occured in user-defined onchange/oninput handler
			// would intrude into current mouse events
			thisObj.trigger('input');
			thisObj.trigger('change');
		};
	},


	setPad : function (thisObj, e, ofsX, ofsY) {
		var pointerAbs = jsc.getAbsPointerPos(e);
		var x = ofsX + pointerAbs.x - jsc._pointerOrigin.x - thisObj.padding - thisObj.insetWidth;
		var y = ofsY + pointerAbs.y - jsc._pointerOrigin.y - thisObj.padding - thisObj.insetWidth;

		var xVal = x * (360 / (thisObj.width - 1));
		var yVal = 100 - (y * (100 / (thisObj.height - 1)));

		switch (jsc.getPadYChannel(thisObj)) {
		case 's': thisObj.fromHSVA(xVal, yVal, null, null); break;
		case 'v': thisObj.fromHSVA(xVal, null, yVal, null); break;
		}
	},


	setSld : function (thisObj, e, ofsY) {
		var pointerAbs = jsc.getAbsPointerPos(e);
		var y = ofsY + pointerAbs.y - jsc._pointerOrigin.y - thisObj.padding - thisObj.insetWidth;
		var yVal = 100 - (y * (100 / (thisObj.height - 1)));

		switch (jsc.getSliderChannel(thisObj)) {
		case 's': thisObj.fromHSVA(null, yVal, null, null); break;
		case 'v': thisObj.fromHSVA(null, null, yVal, null); break;
		}
	},


	setASld : function (thisObj, e, ofsY) {
		var pointerAbs = jsc.getAbsPointerPos(e);
		var y = ofsY + pointerAbs.y - jsc._pointerOrigin.y - thisObj.padding - thisObj.insetWidth;
		var yVal = 1.0 - (y * (1.0 / (thisObj.height - 1)));

		thisObj.fromHSVA(null, null, null, yVal);
	},


	createPalette : function () {

		var paletteObj = {
			elm: null,
			draw: null
		};

		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');

		var drawFunc = function (width, height, type) {
			canvas.width = width;
			canvas.height = height;

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			var hGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
			hGrad.addColorStop(0 / 6, '#F00');
			hGrad.addColorStop(1 / 6, '#FF0');
			hGrad.addColorStop(2 / 6, '#0F0');
			hGrad.addColorStop(3 / 6, '#0FF');
			hGrad.addColorStop(4 / 6, '#00F');
			hGrad.addColorStop(5 / 6, '#F0F');
			hGrad.addColorStop(6 / 6, '#F00');

			ctx.fillStyle = hGrad;
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			var vGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
			switch (type.toLowerCase()) {
			case 's':
				vGrad.addColorStop(0, 'rgba(255,255,255,0)');
				vGrad.addColorStop(1, 'rgba(255,255,255,1)');
				break;
			case 'v':
				vGrad.addColorStop(0, 'rgba(0,0,0,0)');
				vGrad.addColorStop(1, 'rgba(0,0,0,1)');
				break;
			}
			ctx.fillStyle = vGrad;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		};

		paletteObj.elm = canvas;
		paletteObj.draw = drawFunc;

		return paletteObj;
	},


	createSliderGradient : function () {

		var sliderObj = {
			elm: null,
			draw: null
		};

		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');

		var drawFunc = function (width, height, color1, color2) {
			canvas.width = width;
			canvas.height = height;

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
			grad.addColorStop(0, color1);
			grad.addColorStop(1, color2);

			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		};

		sliderObj.elm = canvas;
		sliderObj.draw = drawFunc;

		return sliderObj;
	},


	createASliderGradient : function () {

		var sliderObj = {
			elm: null,
			draw: null
		};

		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');

		var drawFunc = function (width, height, color) {
			canvas.width = width;
			canvas.height = height;

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			var sqSize = canvas.width / 2;
			var sqColor1 = jsc.pub.chessboardColor1;
			var sqColor2 = jsc.pub.chessboardColor2;

			// dark gray background
			ctx.fillStyle = sqColor1;
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			for (var y = 0; y < canvas.height; y += sqSize * 2) {
				// light gray squares
				ctx.fillStyle = sqColor2;
				ctx.fillRect(0, y, sqSize, sqSize);
				ctx.fillRect(sqSize, y + sqSize, sqSize, sqSize);
			}

			var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
			grad.addColorStop(0, color);
			grad.addColorStop(1, 'rgba(0,0,0,0)');

			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		};

		sliderObj.elm = canvas;
		sliderObj.draw = drawFunc;

		return sliderObj;
	},


	BoxShadow : (function () {
		var BoxShadow = function (hShadow, vShadow, blur, spread, color, inset) {
			this.hShadow = hShadow;
			this.vShadow = vShadow;
			this.blur = blur;
			this.spread = spread;
			this.color = color;
			this.inset = !!inset;
		};

		BoxShadow.prototype.toString = function () {
			var vals = [
				Math.round(this.hShadow) + 'px',
				Math.round(this.vShadow) + 'px',
				Math.round(this.blur) + 'px',
				Math.round(this.spread) + 'px',
				this.color
			];
			if (this.inset) {
				vals.push('inset');
			}
			return vals.join(' ');
		};

		return BoxShadow;
	})(),


	flags : {
		leaveValue : 1 << 0,
		leaveAlpha : 1 << 1,
		leaveStyle : 1 << 2,
	},


	enumOpts : {
		// TODO
		format: ['auto', 'any', 'hex', 'rgb', 'rgba'],
		previewPosition: ['left', 'right'],
		mode: ['hsv', 'hvs', 'hs', 'hv'],
		position: ['left', 'right', 'top', 'bottom'],
	},


	deprecatedOpts : {
		// <old_option>: <new_option>  (<new_option> can be null)
		'styleElement': 'previewElement',
		'onFineChange': 'onInput',
		'overwriteImportant': 'forceStyle',
	},


	//
	// Usage:
	// var myPicker = new JSColor(<targetElement> [, <options>])
	//
	// (constructor is accessible via both 'jscolor' and 'JSColor' name)
	//

	pub : function (targetElement, opts) {

		var THIS = this;

		if (opts === undefined) {
			opts = {};
		}

		this.channels = {
			h: 0, // hue [0-360]
			s: 0, // saturation [0-100]
			v: 100, // value (brightness) [0-100]
			r: 255, // red [0-255]
			g: 255, // green [0-255]
			b: 255, // blue [0-255]
			a: 1.0, // alpha (opacity) [0.0 - 1.0]
		};

		// General options
		//
		this.format = 'auto'; // 'auto' | 'any' | 'hex' | 'rgb' | 'rgba' - Format of the input/output value
		this.value = null; // INITIAL color value in any supported format. To change it later, use methods fromString(), fromHSVA(), fromRGBA() and channel()
		this.alpha = null; // INITIAL alpha value. To change it later, call channel('A', <value>)
		this.onChange = null; // called when color changes. Value can be either a function or a string with javascript code.
		this.onInput = null; // called repeatedly as the color is being changed, e.g. while dragging slider. Value can be either a function or a string with javascript code.
		this.valueElement = null; // element that will be used to display and input the color code
		this.alphaElement = null; // element that will be used to display and input the alpha (opacity) value
		this.previewElement = null; // element that will preview the picked color using CSS background
		this.previewSize = 32; // width of the color preview (in px)
		this.previewPosition = 'left'; // 'left' | 'right' - position of the color preview in previewElement
		this.required = true; // whether the associated text <input> can be left empty
		this.refine = true; // whether to refine the entered color code (e.g. uppercase it and remove whitespace)
		this.hash = false; // whether to prefix the HEX color code with # symbol
		this.uppercase = true; // whether to show the color code in upper case
		this.forceStyle = true; // whether to overwrite CSS style of the previewElement using !important flag
		this.minS = 0; // min allowed saturation (0 - 100)
		this.maxS = 100; // max allowed saturation (0 - 100)
		this.minV = 0; // min allowed value (brightness) (0 - 100)
		this.maxV = 100; // max allowed value (brightness) (0 - 100)
		this.minA = 0.0; // min allowed alpha (opacity) (0.0 - 1.0)
		this.maxA = 1.0; // max allowed alpha (opacity) (0.0 - 1.0)

		// Color Picker options
		//
		this.width = 181; // width of color palette (in px)
		this.height = 101; // height of color palette (in px)
		this.mode = 'HSV'; // 'HSV' | 'HVS' | 'HS' | 'HV' - layout of the color picker controls
		this.alphaSlider = false; // whether to display a slider for tweaking the alpha channel
		this.position = 'bottom'; // 'left' | 'right' | 'top' | 'bottom' - position relative to the target element
		this.smartPosition = true; // automatically change picker position when there is not enough space for it
		this.showOnClick = true; // whether to display the color picker when user clicks on its target element
		this.sliderSize = 16; // px
		this.crossSize = 8; // px
		this.closable = false; // whether to display the Close button
		this.closeText = 'Close';
		this.buttonColor = '#000000'; // CSS color
		this.buttonHeight = 18; // px
		this.padding = 12; // px
		this.backgroundColor = '#FFFFFF'; // CSS color
		this.borderWidth = 1; // px
		this.borderColor = '#BBBBBB'; // CSS color
		this.borderRadius = 8; // px
		this.insetWidth = 1; // px
		this.insetColor = '#BBBBBB'; // CSS color
		this.shadow = true; // whether to display shadow
		this.shadowBlur = 15; // px
		this.shadowColor = 'rgba(0,0,0,0.2)'; // CSS color
		this.pointerColor = '#4C4C4C'; // px
		this.pointerBorderColor = '#FFFFFF'; // CSS color
		this.pointerBorderWidth = 1; // px
		this.pointerThickness = 2; // px
		this.zIndex = 1000;
		this.container = null; // where to append the color picker (BODY element by default)


		// let's process the DEPRECATED 'options' property (this will be later removed)
		if (jsc.pub.options) {
			// let's set custom default options, if specified
			for (var opt in jsc.pub.options) {
				if (jsc.pub.options.hasOwnProperty(opt)) {
					try {
						setOption(opt, jsc.pub.options[opt]);
					} catch (e) {
						console.warn(e);
					}
				}
			}
		}


		// let's apply configuration presets
		//
		var presetsArr = [];

		if (opts.preset) {
			if (typeof opts.preset === 'string') {
				presetsArr = opts.preset.split(/\s+/);
			} else if (Array.isArray(opts.preset)) {
				presetsArr = opts.preset.slice(); // slice() to clone
			} else {
				console.warn('Unrecognized preset value');
			}
		}

		// always use the 'default' preset as a baseline
		presetsArr.push('default');

		// let's apply the presets in reverse order, so that should there be any overlapping options,
		// the formerly listed preset will override the latter
		for (var i = presetsArr.length - 1; i >= 0; i -= 1) {
			var pres = presetsArr[i];
			if (!pres) {
				continue; // preset is empty string
			}
			if (!jsc.pub.presets.hasOwnProperty(pres)) {
				console.warn('Unknown preset: %s', pres);
				continue;
			}
			for (var opt in jsc.pub.presets[pres]) {
				if (jsc.pub.presets[pres].hasOwnProperty(opt)) {
					try {
						setOption(opt, jsc.pub.presets[pres][opt]);
					} catch (e) {
						console.warn(e);
					}
				}
			}
		}


		// let's set specific options for this color picker
		var nonProperties = [
			// these options won't be set as instance properties
			'preset',
		];
		for (var opt in opts) {
			if (opts.hasOwnProperty(opt)) {
				if (nonProperties.indexOf(opt) === -1) {
					try {
						setOption(opt, opts[opt]);
					} catch (e) {
						console.warn(e);
					}
				}
			}
		}


		this.option = function () {
			if (!arguments.length) {
				throw 'No option specified';
			}

			if (arguments.length === 1 && typeof arguments[0] === 'string') {
				// getting a single option
				try {
					return getOption(arguments[0]);
				} catch (e) {
					console.warn(e);
				}
				return false;

			} else if (arguments.length >= 2 && typeof arguments[0] === 'string') {
				// setting a single option
				try {
					return setOption(arguments[0], arguments[1]);
				} catch (e) {
					console.warn(e);
				}
				return false;

			} else if (arguments.length === 1 && typeof arguments[0] === 'object') {
				// setting multiple options
				var opts = arguments[0];
				var ret = true;
				for (var opt in opts) {
					if (opts.hasOwnProperty(opt)) {
						try {
							setOption(opt, opts[opt]);
						} catch (e) {
							console.warn(e);
							ret = false;
						}
					}
				}
				return ret;
			}

			throw 'Invalid arguments passed';
		}


		this.channel = function (name, value) {
			if (typeof name !== 'string') {
				throw 'Invalid value for channel name: ' + name;
			}

			if (value === undefined) {
				// getting channel value
				if (this.channels[name.toLowerCase()] !== undefined) {
					return this.channels[name.toLowerCase()];
				}
			} else {
				// setting channel value
				switch (name.toLowerCase()) {
					case 'h': return this.fromHSVA(value, null, null, null); break;
					case 's': return this.fromHSVA(null, value, null, null); break;
					case 'v': return this.fromHSVA(null, null, value, null); break;
					case 'a': return this.fromHSVA(null, null, null, value); break;
					case 'r': return this.fromRGBA(value, null, null, null); break;
					case 'g': return this.fromRGBA(null, value, null, null); break;
					case 'b': return this.fromRGBA(null, null, value, null); break;
				}
			}

			console.warn('Unknown channel: ' + name);
			return false;
		}


		this.hide = function () {
			if (isPickerOwner()) {
				detachPicker();
			}
		};


		this.show = function () {
			drawPicker();
		};


		this.redraw = function () {
			if (isPickerOwner()) {
				drawPicker();
			}
		};


		// Triggers a color change related event by:
		// - executing on<Event> callback stored in picker's properties
		// - triggering standard DOM event listeners attached to the value element
		//
		this.trigger = function (eventName) {
			var ev = eventName.toLowerCase();

			// trigger a callback
			var callbackProp = null;
			switch (ev) {
				case 'input': callbackProp = 'onInput'; break;
				case 'change': callbackProp = 'onChange'; break;
			}
			if (callbackProp) {
				jsc.triggerCallback(this, callbackProp); 
			}

			// trigger standard DOM event listeners on the value element
			jsc.triggerInputEvent(this.valueElement, ev, true, true);
		};


		this.processValueInput = function (str) {

			if (!this.required && str.trim() === '') {
				// input's value is empty (or just whitespace) -> leave the value
				this.previewElement.style.background = 'none';
				this.exposeColor(jsc.flags.leaveValue | jsc.flags.leaveStyle);
				return;
			}

			if (!this.refine) {
				if (!this.fromString(str, jsc.flags.leaveValue)) {
					// input's value could not be parsed -> remove background
					this.previewElement.style.background = 'none';
					this.exposeColor(jsc.flags.leaveValue | jsc.flags.leaveStyle);
				}
				return;
			}

			if (!this.fromString(str)) {
				// could not parse the color value - let's just expose the current color
				this.exposeColor();
			}
		};


		this.processAlphaInput = function (str) {
			if (!this.fromHSVA(null, null, null, parseFloat(str))) {
				// could not parse the alpha value - let's just expose the current color
				this.exposeColor();
			}
		};


		this.exposeColor = function (flags) {

			if (!(flags & jsc.flags.leaveValue) && this.valueElement) {
				var value = this.toString();

				if (this._currentFormat === 'hex') {
					if (!this.uppercase) { value = value.toLowerCase(); }
					if (!this.hash) { value = value.replace(/^#/, ''); }
				}

				if (jsc.nodeName(this.valueElement) === 'input') {
					this.valueElement.value = value;
				} else {
					this.valueElement.innerHTML = value;
				}
			}

			if (!(flags & jsc.flags.leaveAlpha) && this.alphaElement) {
				var value = Math.round(this.channels.a * 100) / 100;

				if (jsc.nodeName(this.alphaElement) === 'input') {
					this.alphaElement.value = value;
				} else {
					this.alphaElement.innerHTML = value;
				}
			}

			if (!(flags & jsc.flags.leaveStyle)) {
				if (this.previewElement) {
					var data = this.previewElement._data_jsc;

					var previewPos = null; // 'left' | 'right' (null -> fill the entire element)
					if (
						jsc.isTextInput(this.previewElement) || // text input
						(jsc.isButton(this.previewElement) && !jsc.isButtonEmpty(this.previewElement)) // button with text
					) {
						previewPos = this.previewPosition;
					}

					var padding = 0;
					if (previewPos) {
						padding = this.previewSize + Math.max(
							5, // minimum padding
							parseFloat(data.origCompStyle['padding-' + previewPos]) || 0 // element's original padding
						);
					}

					var previewCanvas = jsc.genColorPreviewCanvas(
						this.toRGBAString(),
						previewPos ? {'left':'right', 'right':'left'}[previewPos] : undefined,
						previewPos ? this.previewSize : undefined
					);

					jsc.setStyle(this.previewElement, {
						'background-image': 'url(\'' + previewCanvas.toDataURL('image/png') + '\')',
						'background-repeat': previewPos ? 'repeat-y' : 'repeat',
						'background-position': (previewPos ? previewPos : 'left') + ' top',
						'padding-left': previewPos === 'left' ? (padding + 'px') : data.origStyle['padding-left'],
						'padding-right': previewPos === 'right' ? (padding + 'px') : data.origStyle['padding-right'],
					}, this.forceStyle);
				}
			}

			if (isPickerOwner()) {
				redrawPad();
				redrawSld();
				redrawASld();
			}
		};


		// h: 0-360
		// s: 0-100
		// v: 0-100
		// a: 0.0-1.0
		//
		this.fromHSVA = function (h, s, v, a, flags) { // null = don't change
			if (h === undefined) { h = null; }
			if (s === undefined) { s = null; }
			if (v === undefined) { v = null; }
			if (a === undefined) { a = null; }

			if (h !== null) {
				if (isNaN(h)) { return false; }
				this.channels.h = Math.max(0, Math.min(360, h));
			}
			if (s !== null) {
				if (isNaN(s)) { return false; }
				this.channels.s = Math.max(0, Math.min(100, this.maxS, s), this.minS);
			}
			if (v !== null) {
				if (isNaN(v)) { return false; }
				this.channels.v = Math.max(0, Math.min(100, this.maxV, v), this.minV);
			}
			if (a !== null) {
				if (isNaN(a)) { return false; }
				this.channels.a = Math.max(0, Math.min(1, this.maxA, a), this.minA);
			}

			var rgb = jsc.HSV_RGB(
				this.channels.h,
				this.channels.s,
				this.channels.v
			);
			this.channels.r = rgb[0];
			this.channels.g = rgb[1];
			this.channels.b = rgb[2];

			this.exposeColor(flags);
		};


		// r: 0-255
		// g: 0-255
		// b: 0-255
		// a: 0.0-1.0
		//
		this.fromRGBA = function (r, g, b, a, flags) { // null = don't change
			if (r === undefined) { r = null; }
			if (g === undefined) { g = null; }
			if (b === undefined) { b = null; }
			if (a === undefined) { a = null; }

			if (r !== null) {
				if (isNaN(r)) { return false; }
				r = Math.max(0, Math.min(255, r));
			}
			if (g !== null) {
				if (isNaN(g)) { return false; }
				g = Math.max(0, Math.min(255, g));
			}
			if (b !== null) {
				if (isNaN(b)) { return false; }
				b = Math.max(0, Math.min(255, b));
			}
			if (a !== null) {
				if (isNaN(a)) { return false; }
				this.channels.a = Math.max(0, Math.min(1, this.maxA, a), this.minA);
			}

			var hsv = jsc.RGB_HSV(
				r===null ? this.channels.r : r,
				g===null ? this.channels.g : g,
				b===null ? this.channels.b : b
			);
			if (hsv[0] !== null) {
				this.channels.h = Math.max(0, Math.min(360, hsv[0]));
			}
			if (hsv[2] !== 0) {
				this.channels.s = hsv[1]===null ? null : Math.max(0, this.minS, Math.min(100, this.maxS, hsv[1]));
			}
			this.channels.v = hsv[2]===null ? null : Math.max(0, this.minV, Math.min(100, this.maxV, hsv[2]));

			// update RGB according to final HSV, as some values might be trimmed
			var rgb = jsc.HSV_RGB(this.channels.h, this.channels.s, this.channels.v);
			this.channels.r = rgb[0];
			this.channels.g = rgb[1];
			this.channels.b = rgb[2];

			this.exposeColor(flags);
		};


		// DEPRECATED. Use .fromHSVA() instead
		//
		// h: 0-360
		// s: 0-100
		// v: 0-100
		//
		this.fromHSV = function (h, s, v, flags) { // null = don't change
			console.warn('fromHSV() method is DEPRECATED. Using fromHSVA() instead.');
			return this.fromHSVA(h, s, v, null, flags);
		};


		// DEPRECATED. Use .fromRGBA() instead
		//
		// r: 0-255
		// g: 0-255
		// b: 0-255
		//
		this.fromRGB = function (r, g, b, flags) { // null = don't change
			console.warn('fromRGB() method is DEPRECATED. Using fromRGBA() instead.');
			return this.fromRGBA(r, g, b, null, flags);
		};


		this.fromString = function (str, flags) {
			var color = jsc.parseColorString(str);
			if (!color) {
				return false; // could not parse
			}
			if (this.format.toLowerCase() === 'any') {
				this._currentFormat = color.format; // adapt format
			}
			this.fromRGBA(
				color.rgba[0],
				color.rgba[1],
				color.rgba[2],
				color.rgba[3],
				flags
			);
			return true;
		};


		this.toString = function (format) {
			if (format === undefined) {
				format = this._currentFormat; // format not specified -> use the current format
			}
			switch (format.toLowerCase()) {
				case 'hex': return this.toHEXString(); break;
				case 'rgb': return this.toRGBString(); break;
				case 'rgba': return this.toRGBAString(); break;
			}
			return false;
		};


		this.toHEXString = function () {
			return '#' + (
				('0' + Math.round(this.channels.r).toString(16)).substr(-2) +
				('0' + Math.round(this.channels.g).toString(16)).substr(-2) +
				('0' + Math.round(this.channels.b).toString(16)).substr(-2)
			).toUpperCase();
		};


		this.toRGBString = function () {
			return ('rgb(' +
				Math.round(this.channels.r) + ',' +
				Math.round(this.channels.g) + ',' +
				Math.round(this.channels.b) +
			')');
		};


		this.toRGBAString = function () {
			return ('rgba(' +
				Math.round(this.channels.r) + ',' +
				Math.round(this.channels.g) + ',' +
				Math.round(this.channels.b) + ',' +
				(Math.round(this.channels.a * 100) / 100) +
			')');
		};


		this.toCanvas = function () {
			return jsc.genColorPreviewCanvas(this.toRGBAString());
		};


		this.toImageURL = function () {
			return this.toCanvas().toDataURL('image/png');
		};


		this.toGrayscale = function () {
			return (
				0.213 * this.channels.r +
				0.715 * this.channels.g +
				0.072 * this.channels.b
			);
		};


		this.isLight = function () {
			return this.toGrayscale() > 255 / 2;
		};


		this._processParentElementsInDOM = function () {
			if (this._linkedElementsProcessed) { return; }
			this._linkedElementsProcessed = true;

			var elm = this.targetElement;
			do {
				// If the target element or one of its parent nodes has fixed position,
				// then use fixed positioning instead
				var compStyle = jsc.getCompStyle(elm);
				if (compStyle.position && compStyle.position.toLowerCase() === 'fixed') {
					this.fixed = true;
				}

				if (elm !== this.targetElement) {
					// Ensure to attach onParentScroll only once to each parent element
					// (multiple targetElements can share the same parent nodes)
					//
					// Note: It's not just offsetParents that can be scrollable,
					// that's why we loop through all parent nodes
					if (!elm._jscEventsAttached) {
						jsc.attachEvent(elm, 'scroll', jsc.onParentScroll);
						elm._jscEventsAttached = true;
					}
				}
			} while ((elm = elm.parentNode) && jsc.nodeName(elm) !== 'body');
		};


		function setOption (option, value) {
			if (typeof option !== 'string') {
				throw 'Invalid value for option name: ' + option;
			}

			// enum option
			if (jsc.enumOpts.hasOwnProperty(option)) {
				if (typeof value === 'string') { // enum string values are case insensitive
					value = value.toLowerCase();
				}
				if (jsc.enumOpts[option].indexOf(value) === -1) {
					throw 'Option \'' + option + '\' has invalid value: ' + value;
				}
			}

			// deprecated option
			if (jsc.deprecatedOpts.hasOwnProperty(option)) {
				var oldOpt = option;
				var newOpt = jsc.deprecatedOpts[option];
				if (newOpt) {
					// if we have a new name for this option, let's log a warning and use the new name
					console.warn('Option \'%s\' is DEPRECATED, using \'%s\' instead', oldOpt, newOpt);
					option = newOpt;
				} else {
					// new name not available for the option
					throw 'Option \'' + option + '\' is DEPRECATED';
				}
			}

			if (THIS[option] === undefined) {
				throw 'Unrecognized configuration option: ' + option;
			}
			THIS[option] = value;
		}


		function getOption (option) {
			// deprecated option
			if (jsc.deprecatedOpts.hasOwnProperty(option)) {
				var oldOpt = option;
				var newOpt = jsc.deprecatedOpts[option];
				if (newOpt) {
					// if we have a new name for this option, let's log a warning and use the new name
					console.warn('Option \'%s\' is DEPRECATED, using \'%s\' instead', oldOpt, newOpt);
					option = newOpt;
				} else {
					// new name not available for the option
					throw 'Option \'' + option + '\' is DEPRECATED';
				}
			}

			if (THIS[option] === undefined) {
				throw 'Unrecognized configuration option: ' + option;
			}

			return THIS[option];
		}


		function detachPicker () {
			jsc.removeClass(THIS.targetElement, jsc.pub.activeClassName);
			jsc.picker.wrap.parentNode.removeChild(jsc.picker.wrap);
			delete jsc.picker.owner;
		}


		function drawPicker () {

			// At this point, when drawing the picker, we know what the parent elements are
			// and we can do all related DOM operations, such as registering events on them
			// or checking their positioning
			THIS._processParentElementsInDOM();

			if (!jsc.picker) {
				jsc.picker = {
					owner: null,
					wrap : document.createElement('div'),
					box : document.createElement('div'),
					boxS : document.createElement('div'), // shadow area
					boxB : document.createElement('div'), // border
					pad : document.createElement('div'),
					padB : document.createElement('div'), // border
					padM : document.createElement('div'), // mouse/touch area
					padPal : jsc.createPalette(),
					cross : document.createElement('div'),
					crossBY : document.createElement('div'), // border Y
					crossBX : document.createElement('div'), // border X
					crossLY : document.createElement('div'), // line Y
					crossLX : document.createElement('div'), // line X
					sld : document.createElement('div'), // slider
					sldB : document.createElement('div'), // border
					sldM : document.createElement('div'), // mouse/touch area
					sldGrad : jsc.createSliderGradient(),
					sldPtrS : document.createElement('div'), // slider pointer spacer
					sldPtrIB : document.createElement('div'), // slider pointer inner border
					sldPtrMB : document.createElement('div'), // slider pointer middle border
					sldPtrOB : document.createElement('div'), // slider pointer outer border
					asld : document.createElement('div'), // alpha slider
					asldB : document.createElement('div'), // border
					asldM : document.createElement('div'), // mouse/touch area
					asldGrad : jsc.createASliderGradient(),
					asldPtrS : document.createElement('div'), // slider pointer spacer
					asldPtrIB : document.createElement('div'), // slider pointer inner border
					asldPtrMB : document.createElement('div'), // slider pointer middle border
					asldPtrOB : document.createElement('div'), // slider pointer outer border
					btn : document.createElement('div'),
					btnT : document.createElement('span') // text
				};

				jsc.picker.pad.appendChild(jsc.picker.padPal.elm);
				jsc.picker.padB.appendChild(jsc.picker.pad);
				jsc.picker.cross.appendChild(jsc.picker.crossBY);
				jsc.picker.cross.appendChild(jsc.picker.crossBX);
				jsc.picker.cross.appendChild(jsc.picker.crossLY);
				jsc.picker.cross.appendChild(jsc.picker.crossLX);
				jsc.picker.padB.appendChild(jsc.picker.cross);
				jsc.picker.box.appendChild(jsc.picker.padB);
				jsc.picker.box.appendChild(jsc.picker.padM);

				jsc.picker.sld.appendChild(jsc.picker.sldGrad.elm);
				jsc.picker.sldB.appendChild(jsc.picker.sld);
				jsc.picker.sldB.appendChild(jsc.picker.sldPtrOB);
				jsc.picker.sldPtrOB.appendChild(jsc.picker.sldPtrMB);
				jsc.picker.sldPtrMB.appendChild(jsc.picker.sldPtrIB);
				jsc.picker.sldPtrIB.appendChild(jsc.picker.sldPtrS);
				jsc.picker.box.appendChild(jsc.picker.sldB);
				jsc.picker.box.appendChild(jsc.picker.sldM);

				jsc.picker.asld.appendChild(jsc.picker.asldGrad.elm);
				jsc.picker.asldB.appendChild(jsc.picker.asld);
				jsc.picker.asldB.appendChild(jsc.picker.asldPtrOB);
				jsc.picker.asldPtrOB.appendChild(jsc.picker.asldPtrMB);
				jsc.picker.asldPtrMB.appendChild(jsc.picker.asldPtrIB);
				jsc.picker.asldPtrIB.appendChild(jsc.picker.asldPtrS);
				jsc.picker.box.appendChild(jsc.picker.asldB);
				jsc.picker.box.appendChild(jsc.picker.asldM);

				jsc.picker.btn.appendChild(jsc.picker.btnT);
				jsc.picker.box.appendChild(jsc.picker.btn);

				jsc.picker.boxB.appendChild(jsc.picker.box);
				jsc.picker.wrap.appendChild(jsc.picker.boxS);
				jsc.picker.wrap.appendChild(jsc.picker.boxB);
			}

			var p = jsc.picker;

			var displaySlider = !!jsc.getSliderChannel(THIS);
			var displayAlphaSlider = jsc.hasAlphaSlider(THIS);
			var dims = jsc.getPickerDims(THIS);
			var crossOuterSize = (2 * THIS.pointerBorderWidth + THIS.pointerThickness + 2 * THIS.crossSize);
			var padToSliderPadding = jsc.getPadToSliderPadding(THIS);
			var borderRadius = Math.min(
				THIS.borderRadius,
				Math.round(THIS.padding * Math.PI)); // px
			var padCursor = 'crosshair';

			// wrap
			p.wrap.className = 'jscolor-picker-wrap';
			p.wrap.style.clear = 'both';
			p.wrap.style.width = (dims[0] + 2 * THIS.borderWidth) + 'px';
			p.wrap.style.height = (dims[1] + 2 * THIS.borderWidth) + 'px';
			p.wrap.style.zIndex = THIS.zIndex;

			// picker
			p.box.className = 'jscolor-picker';
			p.box.style.width = dims[0] + 'px';
			p.box.style.height = dims[1] + 'px';

			// picker shadow
			p.boxS.className = 'jscolor-picker-shadow';
			p.boxS.style.position = 'absolute';
			p.boxS.style.left = '0';
			p.boxS.style.top = '0';
			p.boxS.style.width = '100%';
			p.boxS.style.height = '100%';
			jsc.setBorderRadius(p.boxS, borderRadius + 'px');

			// picker border
			p.boxB.className = 'jscolor-picker-border';
			p.boxB.style.position = 'relative';
			p.boxB.style.border = THIS.borderWidth + 'px solid';
			p.boxB.style.borderColor = THIS.borderColor;
			p.boxB.style.background = THIS.backgroundColor;
			jsc.setBorderRadius(p.boxB, borderRadius + 'px');

			// IE hack:
			// If the element is transparent, IE will trigger the event on the elements under it,
			// e.g. on Canvas or on elements with border
			p.padM.style.background =
			p.sldM.style.background =
			p.asldM.style.background =
				'#FFF';
			p.padM.style.opacity =
			p.sldM.style.opacity =
			p.asldM.style.opacity =
				'0';

			// pad
			p.pad.style.position = 'relative';
			p.pad.style.width = THIS.width + 'px';
			p.pad.style.height = THIS.height + 'px';

			// pad palettes (HSV and HVS)
			p.padPal.draw(THIS.width, THIS.height, jsc.getPadYChannel(THIS));

			// pad border
			p.padB.style.position = 'absolute';
			p.padB.style.left = THIS.padding + 'px';
			p.padB.style.top = THIS.padding + 'px';
			p.padB.style.border = THIS.insetWidth + 'px solid';
			p.padB.style.borderColor = THIS.insetColor;

			// pad mouse area
			p.padM._jscInstance = THIS;
			p.padM._jscControlName = 'pad';
			p.padM.style.position = 'absolute';
			p.padM.style.left = '0';
			p.padM.style.top = '0';
			p.padM.style.width = (THIS.padding + 2 * THIS.insetWidth + THIS.width + padToSliderPadding / 2) + 'px';
			p.padM.style.height = dims[1] + 'px';
			p.padM.style.cursor = padCursor;

			// pad cross
			p.cross.style.position = 'absolute';
			p.cross.style.left =
			p.cross.style.top =
				'0';
			p.cross.style.width =
			p.cross.style.height =
				crossOuterSize + 'px';

			// pad cross border Y and X
			p.crossBY.style.position =
			p.crossBX.style.position =
				'absolute';
			p.crossBY.style.background =
			p.crossBX.style.background =
				THIS.pointerBorderColor;
			p.crossBY.style.width =
			p.crossBX.style.height =
				(2 * THIS.pointerBorderWidth + THIS.pointerThickness) + 'px';
			p.crossBY.style.height =
			p.crossBX.style.width =
				crossOuterSize + 'px';
			p.crossBY.style.left =
			p.crossBX.style.top =
				(Math.floor(crossOuterSize / 2) - Math.floor(THIS.pointerThickness / 2) - THIS.pointerBorderWidth) + 'px';
			p.crossBY.style.top =
			p.crossBX.style.left =
				'0';

			// pad cross line Y and X
			p.crossLY.style.position =
			p.crossLX.style.position =
				'absolute';
			p.crossLY.style.background =
			p.crossLX.style.background =
				THIS.pointerColor;
			p.crossLY.style.height =
			p.crossLX.style.width =
				(crossOuterSize - 2 * THIS.pointerBorderWidth) + 'px';
			p.crossLY.style.width =
			p.crossLX.style.height =
				THIS.pointerThickness + 'px';
			p.crossLY.style.left =
			p.crossLX.style.top =
				(Math.floor(crossOuterSize / 2) - Math.floor(THIS.pointerThickness / 2)) + 'px';
			p.crossLY.style.top =
			p.crossLX.style.left =
				THIS.pointerBorderWidth + 'px';


			// slider
			p.sld.style.overflow = 'hidden';
			p.sld.style.width = THIS.sliderSize + 'px';
			p.sld.style.height = THIS.height + 'px';

			// slider gradient
			p.sldGrad.draw(THIS.sliderSize, THIS.height, '#000', '#000');

			// slider border
			p.sldB.style.display = displaySlider ? 'block' : 'none';
			p.sldB.style.position = 'absolute';
			p.sldB.style.left = (THIS.padding + THIS.width + 2 * THIS.insetWidth + padToSliderPadding) + 'px'; // TODO
			p.sldB.style.top = THIS.padding + 'px';
			p.sldB.style.border = THIS.insetWidth + 'px solid';
			p.sldB.style.borderColor = THIS.insetColor;

			// slider mouse area
			p.sldM._jscInstance = THIS;
			p.sldM._jscControlName = 'sld';
			p.sldM.style.display = displaySlider ? 'block' : 'none';
			p.sldM.style.position = 'absolute';
			p.sldM.style.left = (THIS.padding + THIS.width + 2 * THIS.insetWidth + padToSliderPadding / 2) + 'px'; // TODO
			p.sldM.style.top = '0';
			p.sldM.style.width = (THIS.sliderSize + padToSliderPadding / 2 + THIS.padding + 2 * THIS.insetWidth) + 'px';
			p.sldM.style.height = dims[1] + 'px';
			p.sldM.style.cursor = 'default';

			// slider pointer inner and outer border
			p.sldPtrIB.style.border =
			p.sldPtrOB.style.border =
				THIS.pointerBorderWidth + 'px solid ' + THIS.pointerBorderColor;

			// slider pointer outer border
			p.sldPtrOB.style.position = 'absolute';
			p.sldPtrOB.style.left = -(2 * THIS.pointerBorderWidth + THIS.pointerThickness) + 'px';
			p.sldPtrOB.style.top = '0';

			// slider pointer middle border
			p.sldPtrMB.style.border = THIS.pointerThickness + 'px solid ' + THIS.pointerColor;

			// slider pointer spacer
			p.sldPtrS.style.width = THIS.sliderSize + 'px';
			p.sldPtrS.style.height = jsc.pub.sliderInnerSpace + 'px';


			// alpha slider
			p.asld.style.overflow = 'hidden';
			p.asld.style.width = THIS.sliderSize + 'px';
			p.asld.style.height = THIS.height + 'px';

			// alpha slider gradient
			p.asldGrad.draw(THIS.sliderSize, THIS.height, '#000');

			// alpha slider border
			p.asldB.style.display = displayAlphaSlider ? 'block' : 'none';
			p.asldB.style.position = 'absolute';
			p.asldB.style.right = THIS.padding + 'px'; // TODO: position from left
			p.asldB.style.top = THIS.padding + 'px';
			p.asldB.style.border = THIS.insetWidth + 'px solid';
			p.asldB.style.borderColor = THIS.insetColor;

			// alpha slider mouse area
			p.asldM._jscInstance = THIS;
			p.asldM._jscControlName = 'asld';
			p.asldM.style.display = displayAlphaSlider ? 'block' : 'none';
			p.asldM.style.position = 'absolute';
			p.asldM.style.right = '0'; // TODO: position from left
			p.asldM.style.top = '0';
			p.asldM.style.width = (THIS.sliderSize + padToSliderPadding / 2 + THIS.padding + 2 * THIS.insetWidth) + 'px'; // TODO: padToSliderPadding? test if padding is 0
			p.asldM.style.height = dims[1] + 'px';
			p.asldM.style.cursor = 'default';

			// alpha slider pointer inner and outer border
			p.asldPtrIB.style.border =
			p.asldPtrOB.style.border =
				THIS.pointerBorderWidth + 'px solid ' + THIS.pointerBorderColor;

			// alpha slider pointer outer border
			p.asldPtrOB.style.position = 'absolute';
			p.asldPtrOB.style.left = -(2 * THIS.pointerBorderWidth + THIS.pointerThickness) + 'px';
			p.asldPtrOB.style.top = '0';

			// alpha slider pointer middle border
			p.asldPtrMB.style.border = THIS.pointerThickness + 'px solid ' + THIS.pointerColor;

			// alpha slider pointer spacer
			p.asldPtrS.style.width = THIS.sliderSize + 'px';
			p.asldPtrS.style.height = jsc.pub.sliderInnerSpace + 'px';


			// the Close button
			function setBtnBorder () {
				var insetColors = THIS.insetColor.split(/\s+/);
				var outsetColor = insetColors.length < 2 ? insetColors[0] : insetColors[1] + ' ' + insetColors[0] + ' ' + insetColors[0] + ' ' + insetColors[1];
				p.btn.style.borderColor = outsetColor;
			}
			p.btn.className = 'jscolor-btn-close';
			p.btn.style.display = THIS.closable ? 'block' : 'none';
			p.btn.style.position = 'absolute';
			p.btn.style.left = THIS.padding + 'px';
			p.btn.style.bottom = THIS.padding + 'px';
			p.btn.style.padding = '0 15px';
			p.btn.style.height = THIS.buttonHeight + 'px';
			p.btn.style.border = THIS.insetWidth + 'px solid';
			setBtnBorder();
			p.btn.style.color = THIS.buttonColor;
			p.btn.style.font = '12px sans-serif';
			p.btn.style.textAlign = 'center';
			try {
				p.btn.style.cursor = 'pointer';
			} catch(eOldIE) {
				p.btn.style.cursor = 'hand';
			}
			p.btn.onmousedown = function () {
				THIS.hide();
			};
			p.btnT.style.lineHeight = THIS.buttonHeight + 'px';
			p.btnT.innerHTML = '';
			p.btnT.appendChild(document.createTextNode(THIS.closeText));

			// place pointers
			redrawPad();
			redrawSld();
			redrawASld();

			// If we are changing the owner without first closing the picker,
			// make sure to first deal with the old owner
			if (jsc.picker.owner && jsc.picker.owner !== THIS) {
				jsc.removeClass(jsc.picker.owner.targetElement, jsc.pub.activeClassName);
			}

			// Set the new picker owner
			jsc.picker.owner = THIS;

			// The redrawPosition() method needs picker.owner to be set, that's why we call it here,
			// after setting the owner
			if (jsc.nodeName(THIS.container) === 'body') {
				jsc.redrawPosition();
			} else {
				jsc._drawPosition(THIS, 0, 0, 'relative', false);
			}

			if (p.wrap.parentNode != THIS.container) {
				THIS.container.appendChild(p.wrap);
			}

			jsc.addClass(THIS.targetElement, jsc.pub.activeClassName);
		}


		function redrawPad () {
			// redraw the pad pointer
			var yChannel = jsc.getPadYChannel(THIS);
			var x = Math.round((THIS.channels.h / 360) * (THIS.width - 1));
			var y = Math.round((1 - THIS.channels[yChannel] / 100) * (THIS.height - 1));
			var crossOuterSize = (2 * THIS.pointerBorderWidth + THIS.pointerThickness + 2 * THIS.crossSize);
			var ofs = -Math.floor(crossOuterSize / 2);
			jsc.picker.cross.style.left = (x + ofs) + 'px';
			jsc.picker.cross.style.top = (y + ofs) + 'px';

			// redraw the slider
			switch (jsc.getSliderChannel(THIS)) {
			case 's':
				var rgb1 = jsc.HSV_RGB(THIS.channels.h, 100, THIS.channels.v);
				var rgb2 = jsc.HSV_RGB(THIS.channels.h, 0, THIS.channels.v);
				var color1 = 'rgb(' +
					Math.round(rgb1[0]) + ',' +
					Math.round(rgb1[1]) + ',' +
					Math.round(rgb1[2]) + ')';
				var color2 = 'rgb(' +
					Math.round(rgb2[0]) + ',' +
					Math.round(rgb2[1]) + ',' +
					Math.round(rgb2[2]) + ')';
				jsc.picker.sldGrad.draw(THIS.sliderSize, THIS.height, color1, color2);
				break;
			case 'v':
				var rgb = jsc.HSV_RGB(THIS.channels.h, THIS.channels.s, 100);
				var color1 = 'rgb(' +
					Math.round(rgb[0]) + ',' +
					Math.round(rgb[1]) + ',' +
					Math.round(rgb[2]) + ')';
				var color2 = '#000';
				jsc.picker.sldGrad.draw(THIS.sliderSize, THIS.height, color1, color2);
				break;
			}

			// redraw the alpha slider
			jsc.picker.asldGrad.draw(THIS.sliderSize, THIS.height, THIS.toHEXString());
		}


		function redrawSld () {
			var sldChannel = jsc.getSliderChannel(THIS);
			if (sldChannel) {
				// redraw the slider pointer
				var y = Math.round((1 - THIS.channels[sldChannel] / 100) * (THIS.height - 1));
				jsc.picker.sldPtrOB.style.top = (y - (2 * THIS.pointerBorderWidth + THIS.pointerThickness) - Math.floor(jsc.pub.sliderInnerSpace / 2)) + 'px';
			}

			// redraw the alpha slider
			jsc.picker.asldGrad.draw(THIS.sliderSize, THIS.height, THIS.toHEXString());
		}


		function redrawASld () {
			var y = Math.round((1 - THIS.channels.a) * (THIS.height - 1));
			jsc.picker.asldPtrOB.style.top = (y - (2 * THIS.pointerBorderWidth + THIS.pointerThickness) - Math.floor(jsc.pub.sliderInnerSpace / 2)) + 'px';
		}


		function isPickerOwner () {
			return jsc.picker && jsc.picker.owner === THIS;
		}


		function onValueBlur () {
			THIS.processValueInput(THIS.valueElement.value);
		}


		function onAlphaBlur () {
			THIS.processAlphaInput(THIS.alphaElement.value);
		}


		function onValueChange (ev) {
			if (ev._data_jsc) {
				return; // skip if the event was internally triggered by jscolor
			}
			jsc.triggerCallback(THIS, 'onChange');

			// triggering valueElement's onchange
			// (not needed, it was dispatched normally by the browser)
		}


		function onAlphaChange (ev) {
			if (ev._data_jsc) {
				return; // skip if the event was internally triggered by jscolor
			}
			jsc.triggerCallback(THIS, 'onChange');

			// triggering valueElement's onchange (because changing alpha changes the entire color, e.g. with rgba format)
			jsc.triggerInputEvent(THIS.valueElement, 'change', true, true);
		}


		function onValueInput (ev) {
			if (ev._data_jsc) {
				return; // skip if the event was internally triggered by jscolor
			}
			THIS.fromString(THIS.valueElement.value, jsc.flags.leaveValue);
			jsc.triggerCallback(THIS, 'onInput');

			// triggering valueElement's oninput
			// (not needed, it was dispatched normally by the browser)
		}


		function onAlphaInput (ev) {
			if (ev._data_jsc) {
				return; // skip if the event was internally triggered by jscolor
			}
			THIS.fromHSVA(null, null, null, parseFloat(THIS.alphaElement.value), jsc.flags.leaveAlpha);
			jsc.triggerCallback(THIS, 'onInput');

			// triggering valueElement's oninput (because changing alpha changes the entire color, e.g. with rgba format)
			jsc.triggerInputEvent(THIS.valueElement, 'input', true, true);
		}


		//
		// Install the color picker on chosen element(s)
		//


		// Fetch the target element
		this.targetElement = jsc.fetchElement(targetElement);

		if (!this.targetElement) {
			throw 'Cannot instantiate color picker without a target element';
		}
		if (this.targetElement.jscolor !== undefined) {
			throw 'Color picker already installed on this element';
		}


		// link this instance with the target element
		this.targetElement.jscolor = this;
		jsc.addClass(this.targetElement, jsc.pub.className);

		// register this instance
		jsc.instances.push(this);


		// Determine picker's container element
		this.container = jsc.fetchElement(this.container);

		if (!this.container) {
			this.container = document.body;
		}


		// if target is BUTTON
		if (jsc.isButton(this.targetElement)) {

			if (this.targetElement.type.toLowerCase() !== 'button') {
				// on buttons, always force type to be 'button', e.g. in situations the target <button> has no type
				// and thus defaults to 'submit' and would submit the form when clicked
				this.targetElement.type = 'button';
			}

			if (jsc.isButtonEmpty(this.targetElement)) { // empty button
				// let's insert a non-breaking space
				this.targetElement.appendChild(document.createTextNode('\xa0'));

				// set min-width = previewSize, if not already greater
				var compStyle = jsc.getCompStyle(this.targetElement);
				var currMinWidth = parseFloat(compStyle['min-width']) || 0;
				if (currMinWidth < this.previewSize) {
					jsc.setStyle(this.targetElement, {
						'min-width': this.previewSize + 'px',
					}, this.forceStyle);
				}
			}
		}

		// Determine the value element
		if (this.valueElement !== null) {
			this.valueElement = jsc.fetchElement(this.valueElement);
		} else {
			// valueElement is null
			if (jsc.isTextInput(this.targetElement)) {
				// for text inputs, default valueElement is targetElement
				this.valueElement = this.targetElement;
			} else {
				// leave it null
			}
		}

		// Determine the alpha element
		if (this.alphaElement !== null) {
			this.alphaElement = jsc.fetchElement(this.alphaElement);
		}

		// Determine the preview element
		if (this.previewElement !== null) {
			this.previewElement = jsc.fetchElement(this.previewElement);
		} else {
			// previewElement is null -> default is targetElement
			this.previewElement = this.targetElement;
		}

		// valueElement
		if (jsc.isTextInput(this.valueElement)) {

			// If the value element has oninput event already set, we need to detach it and attach AFTER our listener.
			// otherwise the picker instance would still contain the old color when accessed from the oninput handler.
			var valueElementOrigEvents = {
				oninput: this.valueElement.oninput
			};
			this.valueElement.oninput = null;

			jsc.attachEvent(this.valueElement, 'blur', onValueBlur);
			jsc.attachEvent(this.valueElement, 'change', onValueChange);
			jsc.attachEvent(this.valueElement, 'input', onValueInput);
			// the original event listener must be attached AFTER our handler (to let it first set picker's color)
			if (valueElementOrigEvents.oninput) {
				jsc.attachEvent(this.valueElement, 'input', valueElementOrigEvents.oninput);
			}

			this.valueElement.setAttribute('autocomplete', 'off');
		}

		// alphaElement
		if (jsc.isTextInput(this.alphaElement)) {
			jsc.attachEvent(this.alphaElement, 'blur', onAlphaBlur);
			jsc.attachEvent(this.alphaElement, 'change', onAlphaChange);
			jsc.attachEvent(this.alphaElement, 'input', onAlphaInput);

			this.alphaElement.setAttribute('autocomplete', 'off');
		}

		// previewElement
		if (this.previewElement) {
			var compStyle = jsc.getCompStyle(this.previewElement);

			this.previewElement._data_jsc = {
				origCompStyle : {
					'padding-left': compStyle['padding-left'],
					'padding-right': compStyle['padding-right'],
				},
				origStyle : {
					'background-image': this.previewElement.style['background-image'],
					'background-position': this.previewElement.style['background-position'],
					'background-repeat': this.previewElement.style['background-repeat'],
					'min-width': this.previewElement.style['min-width'],
					'padding-left': this.previewElement.style['padding-left'],
					'padding-right': this.previewElement.style['padding-right'],
				},
			};
		}


		// determine initial color value
		//
		var initValue = '';

		if (this.value !== null) {
			initValue = this.value; // get initial color from the 'value' property
		}
		if (this.valueElement && this.valueElement.value !== undefined) {
			if (this.value !== null) {
				this.valueElement.value = this.value; // sync valueElement's value with the 'value' property
			} else {
				initValue = this.valueElement.value; // get initial color from valueElement's value
			}
		}

		// determine initial alpha value
		//
		var initAlpha = null;

		if (this.alpha !== null) {
			initAlpha = (''+this.alpha); // get initial alpha value from the 'alpha' property
		}
		if (this.alphaElement && this.alphaElement.value !== '') {
			if (this.alpha !== null) {
				this.alphaElement.value = (''+this.alpha); // sync alphaElement's value with the 'alpha' property
			} else {
				initAlpha = this.alphaElement.value; // get initial color from alphaElement's value
			}
		}

		// determine current format based on the initial color value
		//
		this._currentFormat = null;

		if (['auto', 'any'].indexOf(this.format.toLowerCase()) > -1) {
			// format is 'auto' or 'any' -> let's auto-detect current format
			var color = jsc.parseColorString(initValue);
			this._currentFormat = color ? color.format : 'hex';
		} else {
			// format is specified
			this._currentFormat = this.format.toLowerCase();
		}


		// let's parse the color value and expose color's preview
		this.processValueInput(initValue);

		// if initial alpha value is set, let's also parse and expose the alpha value
		if (initAlpha !== null) {
			this.processAlphaInput(initAlpha);
		}

	}

};


//================================
// Public properties and methods
//================================

//
// These will be publicly available via jscolor.<name> and JSColor.<name>
//


// class that will be set to elements having jscolor installed on them
jsc.pub.className = 'jscolor';


// class that will be set to elements having jscolor active on them
jsc.pub.activeClassName = 'jscolor-active';


// whether to try to parse the options string by evaluating it using 'new Function()'
// in case it could not be parsed with JSON.parse()
jsc.pub.looseJSON = true;


// presets
jsc.pub.presets = {};

// built-in presets
jsc.pub.presets['default'] = {}; // baseline for customization

jsc.pub.presets['light'] = { backgroundColor:'#FFFFFF', insetColor:'#BBBBBB' }; // default color scheme
jsc.pub.presets['dark'] = { backgroundColor:'#333333', insetColor:'#999999' };

jsc.pub.presets['small'] = { width:101, height:101, padding:10 };
jsc.pub.presets['medium'] = { width:181, height:101, padding:12 }; // default size
jsc.pub.presets['large'] = { width:271, height:151, padding:12 };

jsc.pub.presets['thin'] = { borderWidth:1, insetWidth:1, pointerBorderWidth:1 }; // default thickness
jsc.pub.presets['thick'] = { borderWidth:2, insetWidth:2, pointerBorderWidth:2 };


// size of space in the sliders
jsc.pub.sliderInnerSpace = 3; // px

// transparency chessboard
jsc.pub.chessboardSize = 8; // px
jsc.pub.chessboardColor1 = '#999999';
jsc.pub.chessboardColor2 = '#CCCCCC';


// Installs jscolor on current DOM tree
jsc.pub.install = function () {
	jsc.installBySelector('[data-jscolor]');

	// for backward compatibility with DEPRECATED installation using class name
	if (jsc.pub.lookupClass) {
		jsc.installBySelector(
			'input.' + jsc.pub.lookupClass + ', ' +
			'button.' + jsc.pub.lookupClass
		);
	}
};


// Triggers given color change event (e.g. 'input' or 'change') on all color pickers.
// It is possible to specify multiple events separated with a space.
// If called before jscolor is initialized, then the events will triggered after initialization.
jsc.pub.trigger = function (eventNames) {
	var evs = jsc.strList(eventNames);
	for (var i = 0; i < evs.length; i += 1) {
		var ev = evs[i];
		if (jsc.initialized) {
			jsc.triggerGlobal(ev);
		} else {
			jsc.triggerQueue.push(ev);
		}
	}
};


//
// DEPRECATED properties and methods
//


// DEPRECATED. Use jscolor.presets.default instead.
//
// Custom default options for all color pickers, e.g. { hash: true, width: 300 }
jsc.pub.options = {};


// DEPRECATED. Use data-jscolor attribute instead, which installs jscolor on given element.
//
// By default, we'll search for all elements with class="jscolor" and install a color picker on them.
//
// You can change what class name will be looked for by setting the property jscolor.lookupClass
// anywhere in your HTML document. To completely disable the automatic lookup, set it to null.
//
jsc.pub.lookupClass = 'jscolor';


// DEPRECATED. Use jscolor.install() instead
//
jsc.pub.init = function () {
	console.warn('jscolor.init() is DEPRECATED. Using jscolor.install() instead.');
	return jsc.pub.install();
};


// DEPRECATED. Use data-jscolor attribute instead, which installs jscolor on given element.
//
// Install jscolor on all elements that have the specified class name
jsc.pub.installByClassName = function () {
	console.error('jscolor.installByClassName() is DEPRECATED. Use data-jscolor="" attribute instead of a class name.');
	return false;
};


jsc.register();


return jsc.pub;


})(); // END window.jscolor

window.JSColor = window.jscolor; // 'JSColor' is an alias to 'jscolor'

} // endif
