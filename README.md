# TouchDragAndDrop

TouchDragAndDrop is a small polyfill class to use HTML5's Drag and Drop features on touch devices.
It provides basic functionality and still lacks some features like supporting drag images. This is not useful for the usecases this polyfill was developed for, but I may add it in the future.

## How it works

TouchDragAndDrop adds global event listener for the following events:

- touchstart
- touchmove
- touchend
- touchcancel

When `touchstart` is invoked, several actions are initiated depending on the touch parameters. Simple clicks, double clicks and holding for context menu can be recognized, otherwise drag process will be enabled.
When `touchmove` is invoked, the registered event listener creates a drag copy if it does not exists and call `dragstart`, otherwise the position of the existing one will be updated. Additionally, it scans the elements below the current position and fires the events `dragenter`, `dragover` and `dragleave` depending on whether element below is a drop container.
When `touchend` is invoked, it handles either click functionality or the drop process. The drop process just consists of triggering the events `drop` of the drop container (if there is one) and `dragend` of the source element. 

For complete explanation of how it works feel free to dive into the code.

## Usage

This polyfill is designed as a module. Use the following example to import the module and initialize the polyfill.
```javascript
import { TouchDragAndDrop } from "touchDragAndDrop.js"
var touchDND = new TouchDragAndDrop();
```

Make sure that the including JS file needs to be of type module when added to an HTML document, e.g.:
```html
<script type="module" src="touchdnd-application.js"></script>
```
Otherwise there will be an error and the polyfill will not work.

**Make sure you call `e.preventDefault()` in as much drag-and-drop-related event listeners as possible, otherwise unwanted effects my occur. (Even without this polyfill it is a good advice).**

***Be careful: This polyfill uses the `"use strict";` statement. If your code is not strict, this may end in complete chaos.***

## Thanks

I used [Bernardo Castilho's `dragdroptouch`](https://github.com/Bernardo-Castilho/dragdroptouch) and his mentioned sources as inspiration. I developed the code on my own for use in another project, however both codes look pretty similar because they provide nearly the same functionality. Because of that, this mention exists here.

## License

Right now no particular license for this. Do whatever you want with this polyfill as long as your purpose is also open-source and not commercial, that's the deal!
(May be updated in the future)
