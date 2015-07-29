# WindTurbine AJAX

A simple, lightweight, _blazing fast_, cross-browser compatible AJAX tool.

## Features

 - Easy to use, compact, intuitive API
 - Shorthand functions for common AJAX tasks
 - Cross-browser compatible
 - Offensively fast, using request stacking
 - Well documented

## How to use

Fetching a simple text based resource is as compact as:

```javascript
wt.get('example.php', function (response) {
    alert(response);
});
```

## Documentation

The entire documentation, as well as examples are available at http://wtajax.tk/doc

### Request stacking

http://wtajax.tk/doc/stacking

Request stacking is a behind-the-scenes optimization technique WindTurbine implements to dramatically speed up the response times of AJAX requests sent with safe HTTP methods. It's originally based on an idea to remove latency from AJAX-enabled links by preloading them right before they are clicked on.

## How to help

If you found WindTurbine to be useful, please help testing its functionality across multiple (and older) browsers.

## License

WindTurbine AJAX is available under the MIT License.
