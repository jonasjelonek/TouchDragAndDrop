/**
 * Copyright (c) 2020 Jonas Jelonek <jonas.jelonek@protonmail.ch>
 * https://github.com/jonasjelonek/TouchDragAndDrop
 */

"use strict";

export class TouchDragAndDrop {

    constructor() {
        // Check singleton
        if (TouchDragAndDrop._instance) {
            throw new Error("TouchDragAndDrop can't be instantiated more than once.");
        }
        TouchDragAndDrop._instance = this;

        this._initializeFields();

        // Add event listeners
        document.addEventListener("touchstart", this._touchStart.bind(this), { passive: false, capture: false });
        document.addEventListener("touchmove", this._touchMove.bind(this), { passive: false, capture: false });
        document.addEventListener("touchend", this._touchEnd.bind(this), { passive: false, capture: false });
        document.addEventListener("touchcancel", this._touchCancel.bind(this), { passive: false, capture: false });

        return this;
    }

    /**
     * Unfortunately, this has to be done in conventional way.
     * There is an experimental feature called 'public class fields' which allows these variables
     * to be directly declared as members in a class beside methods.
     * The Problem is, some browsers currently don't provide support for this.
     * Safari and Safari on iOS, iPadOS support this feature since Version 14 beta, Firefox for Android and
     * Samsung Internet browser don't seem to support it, IE naturally also doesn't.
     * 
     * Keep track of https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields#Public_fields
     * for support updates.
     */
    _initializeFields() {
        this._touchBegin = 0;            // timestamp of first touch
        this._touchDown = null;          // point of first touch
        this._lastClick = 0;             // timestamp of previous click (touchstart + touchend)
        this._canDrag = false;           // whether there is an element which can be dragged
        this._dragSrc = null;            // the element which should be dragged
        this._dragCopy = null;           // copy of drag source for drag feedback
        this._touchEndCalled = false;    // whether touchEnd occured
        this._dragRunning = false;       // whether a drag process is running at the moment
    
        this._dataTransfer = {
            data: { },
            setData: function (type, val) {this.data[type] = val; },
            getData: function (type) { return this.data[type]; },
            effectAllowed: "move",
        }; 
        this._copyOffset = { x: 0, y: 0 };      // Offset for positioning the drag copy
    
        this._lastTarget = null;                // The last registered touch target
        this._currentDropContainer = null;      // The current drop container; false if element is not droppable
        this._handleClick = true;               // Specifies

        this._DBLCLICKDELAY = 500;              // maximum delay in which a second click must occur
        this._CONTEXTMENUDELAY = 1000;          // hold delay after which context menu is shown
        this._DRAGDELTA = 5;                    // Minimum of pixels which the finger must be moved to start drag
        this._COPYOPACITY = 0.7;                // Opacity of the drag copy element
        this._EXCLUDEDELEMENTS = [              // Elements which should not be processed by _closestDraggable method
            "input",
            "button"
        ];
    }
    
    /**
     * Callback for touchstart event listener.
     * @param {TouchEvent} e 
     */
    _touchStart(e) {
        // Save current timestamp
        this._touchBegin = Date.now();

        // Drag and Drop with 1 touch only.
        if (e.touches.length === 1) {
            this._touchDown = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
            };

            // Trigger double click if another click occured right after the first.
            if (this._touchBegin - this._lastClick < this._DBLCLICKDELAY) {
                this._dispatchEvent(e.target, "dblclick");
                this._reset();
                return;
            }

            // Find closest draggable element
            this._dragSrc = this._findDraggable(e.target);
            if (this._dragSrc) {
                this._canDrag = true;
                e.preventDefault();
            }

            // Show context menu if the touch hasn't ended and the user doesn't drag the element.
            setTimeout(function (context, elem) {
                context._handleClick = false;
                if (!context._touchEnd && !context._dragRunning) {
                    context._dispatchEvent(elem, "contextmenu");
                }
            }, this._CONTEXTMENUDELAY, this, e.target);
        }
    }

    /**
     * Callback for touchmove event listener.
     * @param {TouchEvent} e 
     */
    _touchMove(e) {
        if (this._canDrag && this._dragSrc) {
            // Create copy of element for visual drag feedback
            if (this._dragCopy === null) {
                this._dragSrc.style.opacity = this._COPYOPACITY;
                this._dragCopy = this._dragSrc.cloneNode(true);
                var elementStyles = window.getComputedStyle(this._dragSrc);

                this._dragCopy.style = "";
                for (var style of elementStyles) {
                    this._dragCopy.style[style] = elementStyles.getPropertyValue(style);
                }

                this._calculateDragCopyPosition(e.touches[0]);

                this._dragCopy = document.body.appendChild(this._dragCopy);
                this._dispatchEvent(this._dragSrc, "dragstart", this._dataTransfer);
            }

            if (this._getDelta(e.touches[0]) >= this._DRAGDELTA) {
                this._dragRunning = true;
            }

            // Drag is running, move drag copy and fire events
            if (this._dragRunning) {
                var _this = this;
                requestAnimationFrame(function () {
                    if (_this._touchEndCalled || _this._dragCopy === null)
                        return;

                    _this._dragCopy.style.pointerEvents = "none";
                    _this._dragCopy.style.position = "absolute";
                    _this._dragCopy.style.zIndex = "999999";
                    _this._dragCopy.style.top = (e.touches[0].clientY - _this._copyOffset.y) + "px";
                    _this._dragCopy.style.left = (e.touches[0].clientX - _this._copyOffset.x) + "px";
                });

                // Get the droppable container at the current location if there is one.
                var target = this._findDroppable({
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                });

                // Fire dragleave and dragenter events when target has changed during move
                if (target != this._lastTarget) {
                    this._dispatchEvent(target, "dragenter");
                    this._dispatchEvent(this._lastTarget, "dragleave");
                    this._lastTarget = target;
                }

                // Make current drop container classwide available and fire dragover if it's really a drop container.
                this._currentDropContainer = target;
                if (this._currentDropContainer)
                    this._dispatchEvent(target, "dragover");

                e.preventDefault();
            }
        }
    }

    /**
     * Callback for touchend event listener.
     * @param {TouchEvent} e 
     */
    _touchEnd(e) {
        this._touchEndCalled = true;
        this._canDrag = false;

        // User seems to click
        if (!this._dragRunning && this._handleClick) {
            this._dispatchEvent(e.target, "click");
            e.preventDefault();
            return;
        }

        if (this._currentDropContainer) {
            this._dispatchEvent(this._currentDropContainer, "drop");
            this._dispatchEvent(this._dragSrc, "dragend");
        }

        this._reset();
    }

    /**
     * Callback for touchcancel event listener, in case browser supports this.
     * @param {TouchEvent} e 
     */
    _touchCancel(e) {
        this._reset();
    }

    /**
     * Determines the next droppable element at current point.
     * @param {Object} pt 
     */
    _findDroppable(pt) {
        var tg = document.elementFromPoint(pt.x, pt.y);
        while (tg && !this._dispatchEvent(tg, "dragover")) {
            tg = tg.parentElement;
        }
        return ((tg) ? tg : false);
    }

    /**
     * Calculates the offset for displaying the drag copy to have a seamless dragging.
     * @param {Touch} touch The current touch.
     */
    _calculateDragCopyPosition(touch) {
        var clientRect = this._dragSrc.getBoundingClientRect();
        this._copyOffset.x = touch.clientX - clientRect.left;
        this._copyOffset.y = touch.clientY - clientRect.top;
    }

    /**
     * Calculates the pixel delta between first touch and the current touch position.
     * @param {Object} touch 
     */
    _getDelta(touch) {
        var x = Math.abs(touch.clientX - this._touchDown.x);
        var y = Math.abs(touch.clientY - this._touchDown.y);

        return x + y;
    }

    /**
     * 
     * @param {Element} e The event's target element.
     * @param {string} eventType The type of the event.
     * @param {bool} bubble Sets whether the event should bubble.
     */
    _dispatchEvent(e, eventType, bubble = true) {
        if (!e)
            return false;

        var event = new CustomEvent(eventType, { bubbles: bubble, cancelable: true });
        event.dataTransfer = this._dataTransfer;
        e.dispatchEvent(event);
        return event.defaultPrevented;
    }

    /**
     * Finds the closest element which is draggable.
     * @param {Element} element
     */
    _findDraggable(element) {
        if (this._EXCLUDEDELEMENTS.includes(element.tagName.toLowerCase()))
            return null;

        for (; element; element = element.parentElement) {
            if (element.draggable === true)
                return element;
        }
    }

    /**
     * Resets all variables and prepares for new Drag and Drop.
     */
    _reset() {
        if (this._dragRunning) {
            this._dragSrc.style.opacity = "1.0";
            this._dragCopy.parentElement.removeChild(this._dragCopy);
        }

        this._dragRunning = false;
        this._dragSrc = null;
        this._dragCopy = null;
        this._canDrag = false;

        this._touchBegin = 0;
        this._touchDown = null;
        this._lastClick = 0;
        this._touchEndCalled = false;
        this._dataTransfer = {
            data: { },
            setData: function (type, val) { this.data[type] = val; },
            getData: function (type) { return this.data[type]; },
            effectAllowed: 'move',
        };
        this._copyOffset = { x: 0, y: 0 };
    
        this._lastTarget = null;
        this._currentDropContainer = null;
        this._handleClick = true;
    }
}