# jscolor - JavaScript Color picker with Opacity

**jscolor.js** is a **HEX** and **RGBA** color picker with palette and opacity (alpha channel) support.

It aims to stay super easy both for developers to install and for web users to use.



## Installation in two lines

```html
<script src="jscolor.js"></script>

Color: <input value="rgba(40,170,255,0.5)" data-jscolor="">
```



## Adjusting defaults & Palette (swatch)

```html
<script>
jscolor.presets.default = {
	width: 271,
	height: 151,
	position: 'right',
	previewPosition: 'right',
	backgroundColor: 'rgba(51,51,51,1)',
	controlBorderColor: 'rgba(153,153,153,1)',
	paletteCols: 12,
	hideOnPaletteClick: true,
	palette: [
		'#000000', '#7d7d7d', '#870014', '#ec1c23', '#ff7e26', '#fef100', '#22b14b', '#00a1e7', '#3f47cc', '#a349a4',
		'#ffffff', '#c3c3c3', '#b87957', '#feaec9', '#ffc80d', '#eee3af', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7',
	],
}
</script>
```



[<img src="https://jscolor.com/hosted/gui/jscolor-2.2.4.png" alt="Screenshots of jscolor">](https://jscolor.com/examples)



## Usage examples

See https://jscolor.com/examples/



## Documentation

Documentation can be found at https://jscolor.com/docs/



## Features


* **No framework needed** \
  jscolor.js is a completely self-sufficient JavaScript library consisting of only one file.
  It doesn't need any frameworks (jQuery, Dojo, MooTools etc.) But it can certainly coexist alongside them.


* **Cross-browser** \
  All modern browsers are supported, including:
  Edge, Firefox, Chrome, Safari, Opera, Internet Explorer 10 and above, and others...


* **Highly customizable** \
  jscolor provides many [configuration options](https://jscolor.com/docs/#doc-api-options). Whether you need to change color picker's size or colors, or attach a function to its onchange event, the configuration can be fine-tuned for your web project.


* **Mobile friendly** \
  With a built-in support for touch events, jscolor is designed to be easy to use on touch devices such as tablets and smartphones.



## License

* [GNU GPL v3](http://www.gnu.org/licenses/gpl-3.0.txt) for open source use
* [Commercial license](https://jscolor.com/download/#licenses) for commercial use



## Website

For more info on jscolor project, see [jscolor website](https://jscolor.com)
