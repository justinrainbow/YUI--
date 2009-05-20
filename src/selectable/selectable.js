(function(){
/**
 * Selectable utility provides explorer-like selection abilities to any HTMLElement.
 *
 * All children of the provided Element will be made selectable.  This will
 * probably change in future releases to allow for filters or similar.
 *
 * Abilities:
 *  - Single selection (deselects all other selections first)
 *  - CTRL + Select appends to the current selection list
 *  - Shift + Select will select all Elements between the last selected and current
 *  - CTRL + Shift + Select will append to the selection
 *
 * @package {YAHOO.util.Selectable}
 * @requires {YAHOO.util.Element}
 * @version $Id$
 */
/**
 * Constructor
 * 
 * @param {String|HTMLElement} Element to make selectable
 * @param {Object} Additional config options
 */
var Selectable = function(el,userConfig) {
	if (arguments) {
		Selectable.prototype.init.apply(this,arguments);
	}
};

// create some short-name vars for easier access
var util = YAHOO.util, lang = YAHOO.lang, Dom = util.Dom, Event = util.Event;

util.Selectable = Selectable;
	
/**
 * CSS name to use for when an element is marked as "selected"
 * Can be customized with each instance of the Selectable utility
 * by using the 'selectClass' config option.
 * @name CSS_SELECTED
 * @type {String}
 * @default 'ui-selected'
 */
Selectable.CSS_SELECTED = 'ui-selected';

/**
 * CSS name to use overlay when using the click+drag approach
 * to selecting elements
 * @name CSS_OVERLAY
 * @type {String}
 * @default 'ui-selectable-overlay'
 */
Selectable.CSS_OVERLAY = 'ui-selectable-overlay';

/**
 * Maintains a copy of each Selectable utility instance
 * in order to accurately generate the cache required
 * for the Selectable.Overlay to run effeciently.
 * @type {Object}
 * @static
 */
Selectable.instances = {};

/**
 * Selector Overlay creates a resizable overlay to provide
 * a 'drag to select' interface.
 * @package selectable
 * @version $Id$
 */
Selectable.Overlay = function() {
	Selectable.Overlay.prototype.init.call(this);
}
Selectable.Overlay.prototype = {
	/**
	 * Cache containing the IDs of the child elements for every
	 * instance of the Selectable utility.  Along with all their
	 * regions for determining if an element should be selected.
	 * @name cache
	 * @type {Object}
	 */
	cache: {},
	
	/**
	 * Initialize the overlay element and insert into the DOM
	 * @method init
	 */
	init: function() {
		this.element = document.createElement('div');
		this.element.className = Selectable.CSS_OVERLAY;
		
		document.body.insertBefore(this.element, document.body.firstChild);
	},
	
	/**
	 * Refresh the local cache using all Selectable instances.
	 * @method refreshCache
	 */
	refreshCache: function() {
		var instances = Selectable.instances;
		
		for (var k in instances) {
			var obj = instances[k];
			
			var children = obj.getChildren();
			
			Dom.batch(children, this._cacheRegion, this, true);
		}
	},
	
	/**
	 * Caches location information for a specific element.
	 * @param {HTMLElement} el Child element of a Selectable instance
	 */
	_cacheRegion: function(el) {
		var region = Dom.getRegion(el);
		
		var id = el.id || Dom.generateId(el);
		
		this.cache[id] = region;
	},
	
	/**
	 * Finds the current region for the Overlay instance and returns
	 * all cached elements that intersect with that region.
	 * @method getContains
	 * @return {Array} HTMLElements
	 */
	getContains: function() {
		var region = Dom.getRegion(this.element);
		var elements = [];
		
		for (var id in this.cache) {
			if (this.inRegion(this.cache[id], region)) {
				elements.push(Dom.get(id));
			}
		}
		
		return elements;
	},
	
	/**
	 * Tests a given region against another region for intersections.
	 * @param {YAHOO.util.Region} test
	 * @param {YAHOO.util.Region} selectedRegion
	 * @return {Boolean} true if the regions intersect
	 */
	inRegion: function(test, selectedRegion) {
		if (selectedRegion.contains(test)) {
			return true;
		}
		
		if (selectedRegion.intersect(test) != null) {
			return true;
		}
		
		return false;
	},
	
	/**
	 * Show the overlay and refresh the generated cache.
	 * @method show
	 */
	show: function() {
		this.refreshCache();
		
		Dom.removeClass(this.element, 'ui-hidden');
	},
	
	/**
	 * Hide the overlay
	 * @method hide
	 */
	hide: function() {
		Dom.addClass(this.element, 'ui-hidden');
	},
	
	/**
	 * Set the XY coords for this overlay
	 * @param {Array} xy [x, y]
	 */
	moveTo: function(xy) {
		Dom.setXY(this.element, xy);
	},
	
	/**
	 * Set the height for the overlay
	 * @param {String} height
	 */
	setHeight: function(height) {
		Dom.setStyle(this.element, 'height', height);
	},
	
	/**
	 * Set the width for this overlay
	 * @param {String} width
	 */
	setWidth: function(width) {
		Dom.setStyle(this.element, 'width', width);
	}
};

/**
 * Register an instance of the Selectable utility and attach
 * the static Overlay instance.
 * @param {YAHOO.util.Selectable} instance
 */
Selectable.register = function(instance) {
	Selectable.instances[instance.get('id')] = instance;
	
	instance.overlay = Selectable.getOverlay();
}

/**
 * Return a static instance of the Selectable.Overlay
 * If necessary, instantiate the object first.
 * @return {YAHOO.util.Selectable.Overlay}
 */
Selectable.getOverlay = function() {
	if (!Selectable._overlay) {
		Selectable._overlay = new Selectable.Overlay();
	}
	return Selectable._overlay;
};

YAHOO.extend(YAHOO.util.Selectable, YAHOO.util.Element, {
	/**
	 * Keeps track of all currently selected elements.
	 * @config selected
	 * @type {Array}
	 */
	selected: [],
	
	/**
	 * The last selected/deselected element
	 * @config lastSelected
	 * @type {HTMLElement}
	 */
	lastSelected: null,
	
	/**
	 * Static instance of the Selectable Overlay element
	 * @config overlay
	 * @type {YAHOO.util.Selectable.Overlay}
	 */
	overlay: null,
	
	/**
	 * Tracks if the selectable overlay is currently being used.
	 * @config usingOverlay
	 * @type {Boolean}
	 */
	usingOverlay: false,
	
	/**
	 * Tracks if the mouse button is currently in the DOWN position.
	 * @config mouseDown
	 * @type {Boolean}
	 */
	mouseDown: false,
	
	/**
	 * Useful for the selectable overlay.  Tracks the XY position
	 * where the initial mousedown event was called.
	 * @config initXy
	 * @type {Array}
	 */
	initXy: [],
	
	/**
	 * Initializes the Selectable utility
	 * @param {String|HTMLElement} el Element reference
	 * @param {Object} userConfig Additional config settings
	 */
	init: function(el, userConfig) {
		Selectable.superclass.init.call(this, el, userConfig || {});
		
		Selectable.register(this);
		
		// Initialize the DOM Events required for the Selectable utility to work
		this.initDomEvents();
	},
	
	/**
	 * Add all DOM event listeners required to the main element.
	 * Goal is to use Bubbling whever possible to improve performance.
	 * @method initDomEvents
	 */
	initDomEvents: function() {
		this.on('click', this.handleClickEvent);
		this.on('mousedown', this.handleMouseDownEvent);
		
		Event.addListener(document, 'mouseup', this.handleMouseUpEvent, this, true);
		
		Event.addListener(document, 'mousemove', this.handleMouseMoveEvent, this, true);
	},
	
	/**
	 * Configure customized configuration options.
	 * @param {Object} map User-defined config
	 */
	initAttributes: function(map) {
		Selectable.superclass.initAttributes.call(this, map);
		
		this.setAttributeConfig('selectClass', {
			value: map.selectClass || Selectable.CSS_SELECTED
		});
	},
	
	/**
	 * Get the current elements childNodes
	 * @method getChildren
	 * @return {Array} child nodes
	 */
	getChildren: function() {
		return Dom.getChildren(this.get('element'));
	},
	
	/**
	 * Get a list of elements between the start and end markers.
	 * If an HTMLElement is passed, the index is found by looping
	 * through all child nodes to find where the element is.
	 * @param {Number|HTMLElement} start
	 * @param {Number|HTMLElement} end
	 * @return {Array} matching elements
	 */
	getElements: function(start, end) {
		var children = this.getChildren();
		
		var getIndex = function(el) {
			for (var i = 0; i < children.length; i++) {
				if (children[i] == el) {
					return i;
				}
			}
			return -1;
		};
		
		if (!lang.isNumber(start)) {
			// attempt to find this elements index #
			var index = getIndex(start);

			if (index == -1) {
				return [];
			}
			else {
				start = index;
			}
		}
		
		if (!lang.isNumber(end)) {
			var index = getIndex(end);
			
			if (index == -1) {
				return [];
			}
			else {
				end = index;
			}
		}
		
		// make sure the start is really the lower number
		if (start > end) {
			var tmp = start;
			start = end;
			end = tmp;
		}
		
		return children.slice( start, end + 1 );
	},
	
	/**
	 * Returns the HTMLElement targetted in whatever event.
	 * Uses the YAHOO.util.Event.getTarget() method and then
	 * traverses the DOM in an attempt to find the HTMLElement
	 * that is a direct child of the Selectable element.
	 * @param {Event} evt Event to grab HTMLElement from
	 * @return {HTMLElement} target element or null
	 */
	getTarget: function(evt) {
		var target = Event.getTarget(evt);
		
		if (!target || !target.parentNode) {
			return null;
		}
		
		var element = this.get('element');
		
		while (target && target.parentNode && target.parentNode != element) {
			target = target.parentNode;
		}
		
		if (!target || target.parentNode != element) {
			return null;
		}
		
		return target;
	},
	
	/**
	 * Select the given HTMLElement
	 * @param {HTMLElement} el
	 * @param {Boolean} isMultiple
	 */
	select: function(el, isMultiple) {
		if (this.isSelected(el)) {
			return true;
		}
		
		this.selected.push(el);
		Dom.addClass(el, this.get('selectClass'));
		
		this.lastSelected = el;
		
		return true;
	},
	
	/**
	 * Deselect the given HTMLElement
	 * @param {HTMLElement} el
	 * @param {Boolean} isMultiple
	 */
	deselect: function(el, isMultiple) {
		if (!this.isSelected(el)) {
			return false;
		}
		
		var els = this.selected, item;
		this.selected = [];
		this.lastSelected = el;
		
		while (item = els.pop()) {
			if (item != el) {
				this.selected.push(item);
			}
		}
		
		Dom.removeClass(el, this.get('selectClass'));
		
		return true;
	},
	
	/**
	 * Selects a range of elements from start to finish
	 * @param {Number|HTMLElement} start
	 * @param {Number|HTMLElement} finish
	 */
	selectRange: function(start, finish)
	{
		var elements = this.getElements(start, finish);
		
		Dom.batch( elements, this.select, this, true );
	},
	
	/**
	 * Returns true if the given element is marked as selected.
	 * @method isSelected
	 * @param {String|HTMLElement} el
	 */
	isSelected: function(el) {
		return Dom.hasClass(el, this.get('selectClass'));
	},
	
	/**
	 * Select every child node for the main element.
	 * @method selectAll
	 */
	selectAll: function() {
		this.selected = this.getChildren();
		Dom.addClass(this.selected, this.get('selectClass'));
	},
	
	/**
	 * Deselect every previously selected element.
	 * @method deselectAll
	 */
	deselectAll: function() {
		Dom.removeClass(this.selected, this.get('selectClass'));
		this.slected = [];
	},
	
	/**
	 * Performs the tasks related to an onClick event on the main container.
	 * Checks for CTRL and Shift keys and will deselect/select elements
	 * based on those settings.
	 * @param {Event} evt
	 */
	handleClickEvent: function(evt) {
		var target = this.getTarget(evt);
		
		if (!target) {
			return;
		}
		
		var ctrlKey = evt.ctrlKey;
		var shiftKey = evt.shiftKey;
		
		if (ctrlKey == false) {
			this.deselectAll();
		}
		
		if (shiftKey == true && this.lastSelected) {
			Event.stopEvent(evt);
			this.get('element').focus();
			
			this.selectRange(this.lastSelected, target);
			
			return;
		}
		
		if (this.isSelected(target)) {
			this.deselect(target);
		}
		else {
			this.select(target);
		}
	},
	
	/**
	 * Lets the Selectable utility know the mouse is currently down.
	 * So if the next event received is a mouseMove event.  The
	 * Selectable.Overlay will be shown.
	 * @param {Event} evt
	 */
	handleMouseDownEvent: function(evt) {
		this.mouseDown = true;
		
		this.initXy = Event.getXY(evt);
	},
	
	/**
	 * Checks if the Selectable Overlay was being used and 
	 * performs the selections as required.
	 * @param {Event} evt
	 */
	handleMouseUpEvent: function(evt) {
		this.mouseDown = false;
		
		if (this.overlayShown) {
			var elements = this.overlay.getContains();
			
			if (!evt.ctrlKey) {
				this.deselectAll();
			}
			
			Dom.batch(elements, this.select, this, true);
			
			this.overlay.hide();
			
			this.overlayShown = false;
		}
	},
	
	/**
	 * Enables the Selectable Overlay if the mouse is currently
	 * in the down state.  It also positions the overlay accordingly.
	 * @param {Event} evt
	 */
	handleMouseMoveEvent: function(evt) {
		if (this.mouseDown == false) {
			return;
		}
		
		if (this.overlayShown == false) {
			this.overlay.show();
		}
		
		this.overlayShown = true;
		
		var xy     = Event.getXY(evt);
		var initXy = this.initXy;
		
		var width  = Math.abs( xy[0] - initXy[0] );
		var height = Math.abs( xy[1] - initXy[1] );
		
		var pos = [
			Math.min( xy[0], initXy[0] ),
			Math.min( xy[1], initXy[1] )
		];
		
		this.overlay.moveTo(pos);
		this.overlay.setHeight(height + 'px');
		this.overlay.setWidth(width + 'px');
		
		this.overlay.element.focus();
	}
});
		
})();
