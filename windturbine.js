/**
 * @author John White
 * @version 0.9 BETA
 * @license The MIT License (MIT)
 * @copyright John White 2015
 * @name WindTurbine AJAX
 * 
 * http://www.wtajax.tk/
 * 
 * The MIT License (MIT)
 * Copyright (c) 2015 John White
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var WindTurbine = function () {
    /** @const */
    var DEBUG = false;

    var defaultSettings = {
        stackable: true,
        cache: true,
        queue: false,
        method: 'GET',
        expire: 10000 // in-memory cached responses expire after 10 seconds
    };
    var __this__ = this;

    /**
     * http://wtajax.tk/doc/methods/setup
     * @param {object} settings
     */
    this.setup = function (settings) {
        utility.copySettings(settings, defaultSettings);
    };

    /**
     * http://wtajax.tk/doc/methods/ajax
     * @param {object} settings
     */
    this.ajax = function (settings) {
        var dh;  // timeout handle for delayed requests

        settings = utility.initSettings(settings || {});

        if (settings.delay > 0) {
            dh = setTimeout(function () {
                settings.delay = 0;
                __this__.ajax(settings);
            }, settings.delay);
            
            return dh;
        }

        /*
        // before callback
        if (utility.invokeUserCallback(settings.before, [settings]) === false) {
            // request aborted
            utility.invokeUserCallback(settings.error, ['abort']);
            utility.invokeUserCallback(settings.complete, ['abort']);
            return false;
        }
        */
        
        // the derived key is also passed as an argument, so it does not have to be
        // created again (with JSON, that might be relatively expensive)
        core.controller.init(settings, function (result) {
            // control callback
            if (result.label == 'success') {
                utility.invokeUserCallback(settings.success, [result.response, result.xhr]);
            } else {
                utility.invokeUserCallback(settings.error, [result.label, result.error, result.xhr]);
            }

            utility.invokeUserCallback(settings.complete, [result.label, result.xhr]);
        });

        return true;
    };

    /**
     * http://wtajax.tk/doc/methods/preload
     * @param {string} url
     * @param {string} [life]
     * @param {string} [expire]
     * @param {object} [settings]
     */
    this.preload = function (url, life, expire, settings) {
        var new_settings = {};

        utility.copySettings(settings, new_settings);

        new_settings.url = url;
        new_settings.life = life || 1;
        new_settings.expire = expire;
        new_settings.preloadOnly = true;

        return __this__.ajax(new_settings);
    };

    /**
     * http://wtajax.tk/doc/methods/get
     * @param {string}   url
     * @param {function} [success]
     * @param {function} [error]
     * @param {object}   [settings]
     */
    this.get = function (url, success, error, settings) {
        var new_settings = {};

        utility.copySettings(settings, new_settings);

        new_settings.url = url;
        new_settings.method = 'GET';

        // if there is no error callback specified, and dataType is not set to any
        // special value, the success callback will be invoked on request failure, its
        // response argument becoming the message portion of the error callback's Error
        // argument
        if (!error && success && (!settings || !('dataType' in settings))) {
            new_settings.error = function (label, error, xhr) {
                new_settings.success(error.message, xhr, label);
            };

            new_settings.success = function (response, xhr) {
                success(response, xhr, 'success');
            };
        } else {
            new_settings.success = success || null;
            new_settings.error = error || null;
        }

        __this__.ajax(new_settings);
    };

    /**
     * http://wtajax.tk/doc/methods/post
     * @param {string}   url
     * @param {mixed}    [data]
     * @param {function} [success]
     * @param {function} [error]
     * @param {object}   [settings]
     */
    this.post = function (url, data, success, error, settings) {
        var new_settings = {};

        utility.copySettings(settings, new_settings);

        new_settings.url = url;
        new_settings.method = 'POST';
        new_settings.data = data;
        new_settings.success = success || null;
        new_settings.error = error || null;

        // if data is object literal, set dataType to 'json'
        if (settings.data && settings.data.constructor === {}.constructor) {
            settings.dataType = 'json';
        }

        // if there is no error callback specified, and dataType is not set to any
        // special value, the success callback will be invoked on request failure, its
        // response argument becoming the message portion of the error callback's Error
        // argument
        if (!settings.error && settings.success && !('dataType' in settings)) {
            settings.error = function (label, error, xhr) {
                settings.success(error.message, xhr);
            };
        }

        __this__.ajax(settings);
    };

    /**
     * http://wtajax.tk/doc/methods/json
     * @param {string}   url
     * @param {mixed}    [data_or_callback]
     * @param {function} [callback]
     */
    this.json = function (url, data_or_callback, callback) {
        var data;
        var settings;

        if (typeof data_or_callback == 'function') {
            callback = data_or_callback;
            data = null;
        } else {
            data = data_or_callback;
        }

        if (data) {
            settings.method = 'POST';
        } else {
            settings.method = 'GET';
            settings.cache = false;
            settings.stackable = false;
        }

        settings.url = url;
        settings.dataType = 'json';

        settings.success = function (response, xhr) {
            if (callback) callback(response, xhr);
        };

        settings.error = function (status, error, xhr) {
            console.error(error, xhr);
            if (callback) callback(null, xhr);
        };
        
        __this__.ajax(settings);
    };


    var core = {
        controller: {
            init: function (settings, control_callback) {
                var _this_ = this;

                if (!settings.queue) {
                    // this request is not subject to queuing, can run in parellel to others
                    this.send(settings, control_callback);
                } else {
                    if (this.state /* === 1 */) {
                        this.queue.push({
                            settings: settings,
                            callback: control_callback
                        });
                    } else {
                        this.state = 1;

                        this.send(settings, function (result) {
                            var temp;

                            control_callback(result);

                            // advance queue
                            if (_this_.queue.length) {
                                temp = _this_.queue.shift();

                                // init another request that was put into the queue in the meantime
                                _this_.init(temp.settings, temp.callback);
                            } else {
                                _this_.state = 0;
                            }
                        });
                    }
                }
            },
            send: function (settings, control_callback) {
                var key = core.stack.createKey(settings);

                if (key) {
                    core.stack.addRequest(settings, key, control_callback);
                } else {
                    // send a lone AJAX request
                    core.request.send(
                        core.request.create(settings.factory),
                        settings,
                        control_callback
                    );
                }
            },
            state: 0,
            queue: []
        },
        stack: {
            loading: {},
            loaded: {},

            /**
             * Add a request to the request stacking subsystem. This will either collapse
             * the new request into an already loading one, serve it from the internal
             * cache, or send it to the specified URL, creating a new stack.
             * 
             * @param {object}   settings
             * @param {string}   key
             * @param {function} control_callback
             * 
             * @todo request stacking might be possible using queuing (less code?)
             */
            addRequest: function (settings, key, control_callback) {
                var xhr;
                var _this_ = this;

                if (settings.preloadOnly) {
                    // if request already loaded or loading: abort
                    if (this.getCached(key, true) || this.loading.hasOwnProperty(key)) {
                        control_callback({
                            label: 'abort',
                            xhr: this.loading[key] || this.loaded[key].xhr
                        });

                        return;
                    }
                }

                // the request is stackable, but will only be sent if an identical
                // one is not yet loading/loaded
                if ((xhr = this.getCached(key)) !== false) {
                    // the result of an identical request has been loaded recently, successfully
                    console.log("Serve response from cache.");
                    try {
                        control_callback({
                            label: 'success',
                            response: core.request.getResponse(xhr, settings.dataType),
                            xhr: xhr
                        });
                    } catch (e) {
                        control_callback({
                            label: 'parseerror',
                            error: e,
                            xhr: xhr
                        });
                    }
                } else {
                    if (this.loading.hasOwnProperty(key) && this.loading[key].bActive) {
                        console.log("Collapse request.");

                        // an identical request is already loading, wait for it
                        xhr = this.loading[key].xhr;

                        // progress event
                        if ('onprogress' in xhr && 'progress' in settings) {
                            utility.addEvent(xhr, 'progress', function (e) {
                                utility.invokeUserCallback(settings.progress, [e]);
                            });
                        }

                        // collapse this request into an already loading one
                        core.request.onReady(xhr, settings, function (result) {
                            if (!settings.preloadOnly) {
                                // now, if the stack base (the request into which this one was collapsed into)
                                // specified a life setting, we need to subtract from the in-memory cached item
                                core.stack.getCached(key); // will subtract 1 from life
                            }

                            control_callback(result);
                        });
                    } else {
                        // stackable, but is not yet loading or loaded: new request
                        xhr = core.request.create(settings.factory);

                        // mark this request as now loading, so that subsequent identical requests can
                        // be collapsed into this one
                        this.loading[key] = {
                            xhr: xhr,
                            bActive: true
                        };

                        // open, set, and send new request to server (URL)
                        core.request.send(xhr, settings, function (result) {
                            // other loading listeners that tap into this XHR run
                            // after this callback is done, so it's not yet
                            // possible to delete loading[key] - instead, mark it
                            // as 'not active', so new requests don't see an
                            // "already loading" status
                            _this_.loading[key].bActive = false;

                            if (result.label == 'success' && settings.life > 0) {
                                // if life was set, this request was meant to be reused for subsequent identical
                                // requests from the in-memory cache for a limited duration
                                _this_.loaded[key] = {
                                    // relevant properties of the XHR object like
                                    // response and status
                                    xhr: core.request.derive(xhr),

                                    // initial timestamp to later check if cache should be considered expired
                                    timestamp: Date.now(),

                                    // cache item is valid for up to this number of subsequent calls
                                    life: settings.life,

                                    // cache item is valid for up to this duration in milliseconds
                                    expire: settings.expire
                                }
                            }

                            setTimeout(function () {
                                // at this time, any and all subsequent collapsed requests have finished
                                // invoking the necessary user defined callbacks, and it is also guaranteed that
                                // no additional requests have been collapsed into this XHR (for it was marked
                                // as inactive); it is now safe to delete
                                delete _this_.loading[key];
                            }, 0);

                            control_callback(result);
                        });

                        // attach progress event
                        if ('onprogress' in xhr && 'progress' in settings) {
                            utility.addEvent(xhr, 'progress', function (e) {
                                utility.invokeUserCallback(settings.progress, [e]);
                            });
                        }
                    }
                }
            },

            /**
             * Generate a stack key from the request settings. Two identical requests will
             * always yield the same key, that's how they can be collapsed into each other.
             * 
             * @param  {object} settings
             * @return {string} the stack key generated (derived) from settings
             * @nosideeffects
             */
            createKey: function (settings) {
                // request stacking requires some technologies to be present to work:
                if (
                    !('XMLHttpRequestEventTarget' in window) || // XHR2 event interface required
                    !('JSON' in window) ||                      // JSON required for generating keys
                    !settings.stackable ||                      // caller must allow stacking
                    !utility.isSafeMethod(settings.method)      // GET and HEAD only
                )
                    // while WindTurbine does work correctly without any of these, request stacking
                    // will not be available; this, however, will not affect WindTurbine in any way,
                    // except for performance in apps using heavy request stacking (as they should)
                    return false;

                // not all data is json encodable; if data can't be stringified, consider
                // this request unstackable
                try {
                    return JSON.stringify([
                        settings.url,
                        settings.data,
                        settings.headers,
                        settings.username,
                        settings.password,
                        settings.method
                    ]);
                } catch (e) {
                    // these warnings occur in full source version only
                    if (DEBUG) {
                        console.warn("Request could not be stacked:");
                        console.warn(e);
                    }

                    return false;
                }
            },

            /**
             * Returns an in-memory cached response by stack key.
             * 
             * @param {string}  key
             * @param {boolean} [b_peek=false]
             */
            getCached: function (key, b_peek) {
                var _this_ = this;

                if (key && this.loaded.hasOwnProperty(key) && this.loaded[key].life > 0) {
                    // this item might be used, but also check timestamp
                    if (this.loaded[key].timestamp > Date.now() - this.loaded[key].expire) {
                        if (b_peek)
                            // return true and do not decrease life when just peaking into
                            // the cache checking for the presence of an item
                            return true;

                        if (--this.loaded[key].life === 0) {
                            // since each _resultIfLoaded call also does a preliminary life
                            // check, this can run async
                            setTimeout(function () {
                                delete _this_.loaded[key];
                            }, 0);
                        }

                        return this.loaded[key].xhr;
                    } else {
                        // garbage collection for expired item
                        setTimeout(function () {
                            delete _this_.loaded[key]
                        }, 0);

                        return false;
                    }
                } else {
                    return false;
                }
            }
        },
        request: {
            /**
             * Creates and returns an XMLHttpRequest object, or an ActiveXObject as
             * fallback for older browsers.
             */
            create: function (factory) {
                return new (window.XMLHttpRequest || window.ActiveXObject)('MSXML2.XMLHTTP.3.0');
            },
            derive: function (xhr) {
                var headers = xhr.getAllResponseHeaders();
                var headers_list = headers.split('\n');
                var headers_obj = {};
                var header_item;

                for (var i = 0; i < headers_list.length; ++i) {
                    header_item = headers_list[i].split(': ');
                    headers_obj[header_item[0]] = header_item[1];
                }

                return {
                    derived: true,
                    response: xhr.response,
                    responseBody: xhr.responseBody,
                    responseText: xhr.responseText,
                    responseType: xhr.responseType,
                    responseXML: xhr.responseXML,
                    status: xhr.status,
                    statusText: xhr.statusText,
                    getAllResponseHeaders: function () {
                        return headers;
                    },
                    getResponseHeader: function (header) {
                        return headers_obj[header];
                    }
                }
            },
            send: function (xhr, settings, control_callback) {
                var url = settings.url;

                if (utility.isSafeMethod(settings.method) && settings.cache) {
                    // append timestamp to disable caching
                    if (settings.url.indexOf('?') === -1) {
                        url += '?_=' + Date.now();
                    } else {
                        url += '&_=' + Date.now();
                    }
                }

                xhr.open(
                    settings.method,
                    url,
                    true,
                    settings.username || null,
                    settings.password || null
                );

                if (settings.dataType == 'json') {
                    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
                } else {
                    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                }

                // authentication headers
                if (settings.username || settings.password) {
                    xhr.setRequestHeader(
                        'Authorization',
                        'Basic ' + btoa((settings.username || '') + ':' +
                                (settings.password || ''))
                    );
                }

                // apply user-provided request headers
                if (settings.headers) {
                    for (var key in settings.headers) {
                        if (settings.headers.hasOwnProperty(key)) {
                            xhr.setRequestHeader(key, settings.headers[key]);
                        }
                    }
                }

                if (settings.timeout > 0) {
                    if ('onload' in xhr) {
                        // timeout only in XHR2 mode, regardless of ontimeout support
                        if ('timeout' in xhr && 'ontimeout' in xhr) {
                            xhr.timeout = settings.timeout;
                        } else {
                            // manual timeout using abort()
                            setTimeout(function () {
                                if (!xhr || xhr.readyState === 4) return;
                                xhr.abort();
                            }, settings.timeout);
                        }
                    }
                }

                // interface control callback with XHR
                core.request.onReady(xhr, settings, control_callback);

                if (settings.data) {
                    switch (typeof settings.data) {
                        case 'string':
                        case 'arrayBuffer':
                        case 'arrayBufferView':
                        case 'blob':
                        case 'document':
                        case 'formData':
                            // data is compatible with xhr.send
                            xhr.send(settings.data);
                            break;

                        default:
                            // convert generic object to query string
                            xhr.send(this.queryString(settings.data));
                            break;
                    }
                } else {
                    xhr.send();
                }
            },
            onReady: function (xhr, settings, control_callback) {
                var label;
                var response;
                var status_map = {
                    // status code from file protocol yields 0, assume "200 OK"
                    0: 200,

                    // IE9 issue #1450
                    1223: 204
                };

                if ('onload' in xhr) {
                    // XHR level 2 is supported
                    utility.addEvent(xhr, 'load', function () {
                        try {
                            control_callback({
                                label: 'success',
                                response: core.request.getResponse(xhr, settings.dataType),
                                xhr: xhr
                            });
                        } catch (e) {
                            control_callback({
                                label: 'parseerror',
                                error: e,
                                xhr: xhr
                            });
                        }
                    });

                    utility.addEvent(xhr, 'error', function () {
                        control_callback({
                            label: 'error',
                            error: new Error(xhr.statusText),
                            xhr: xhr
                        });
                    });

                    utility.addEvent(xhr, 'abort', function () {
                        control_callback({
                            label: 'abort',
                            error: new Error('Aborted'),
                            xhr: xhr
                        });
                    });

                    // some XHR2 implementations don't support timeout, see
                    // http://caniuse.com/#feat=xhr2 (note 2)
                    if ('timeout' in xhr) {
                        utility.addEvent(xhr, 'timeout', function () {
                            control_callback({
                                label: 'timeout',
                                error: new Error('Timed Out'),
                                xhr: xhr
                            });
                        });
                    }
                } else {
                    // legacy handling (XHR level 1)
                    utility.addEvent(xhr, 'readystatechange', function () {
                        if (xhr.readyState !== 4) return;

                        if (
                            (status_map[xhr.status] || xhr.status) === 200 &&
                            (!('response' in xhr) || xhr.response.type === 'data')
                        ) {
                            // core.request.getResponse throws syntax error on bad JSON response
                            try {
                                control_callback({
                                    label: 'success',
                                    response: core.request.getResponse(xhr, settings.dataType),
                                    xhr: xhr
                                });
                            } catch (e) {
                                // ... when that happens, the request is considered a failure
                                control_callback({
                                    label: 'parseerror',
                                    error: e,
                                    xhr: xhr
                                });
                            }
                        } else {
                            control_callback({
                                label: 'error',
                                error: new Error(xhr.statusText),
                                xhr: xhr
                            });
                        }
                    });
                }
            },
            getResponse: function (xhr, dataType) {
                // get Content-Type (without charset)
                var mime_types = {
                    'application/json': 'json',
                    'application/x-resource+json': 'json',      // v
                    'application/x-collection+json': 'json',    // RESTful APIs
                    'application/vnd.api+json': 'json',         // ^
                    'text/xml': 'xml',
                    'application/xml': 'xml'
                };

                if (!dataType) {
                    dataType = mime_types[xhr.getResponseHeader('Content-Type').split(';')[0]];
                }

                switch (dataType) {
                    case 'json':
                        return JSON.parse(xhr.responseText);
                        break;

                    case 'xml':
                        return xhr.responseXML;
                        break;

                    default:
                        return xhr.responseText;
                        break;
                }
            },
            queryString: function (data) {
                var query_string = '';
                var n = 0;

                for (var key in settings.data) {
                    if (data.hasOwnProperty(key)) {
                        switch (typeof data[key]) {
                            case 'string':
                            case 'number':
                            case 'boolean':
                            case 'object':
                            case 'symbol':
                                // valid type
                                if (n++ > 0) {
                                    // add glue
                                    query_string += '&';
                                }

                                query_string += key + '=';

                                if (typeof data[key] == 'object') {
                                    // composite object type, attempt to convert to JSON string
                                    try {
                                        query_string += encodeURIComponent(JSON.stringify(settings.data[key]));
                                    } catch (e) {
                                        console.error("The following property could not be appended to query string: " + key);
                                        console.error(e);
                                    }
                                } else {
                                    query_string += encodeURIComponent(data[key]);
                                }

                                break;

                            default:
                                // JSON encode
                                console.error("The following property could not be appended to query string: " + key);
                                break;
                        }
                    }
                }

                return query_string;
            }
        }
    }

    var utility = {
        initSettings: function (settings) {
            var attr;
            var new_settings = {};

            /*
            if (bStrictMode && settings && settings.constructor !== {}.constructor) {
                throw new TypeError('Settings argument is not an object-literal.');
            }
            */

            this.copySettings(settings, new_settings);

            // assign element data attributes
            if (settings.srcElement) {
                for (var i = 0; i < settings.srcElement.attributes.length; ++i) {
                    attr = settings.srcElement.attributes[i];

                    if (/^data-wt-/.test(attr.name)) {
                        var camelCaseName = attr.name.substr(8).replace(/-(.)/g, function ($0, $1) {
                            return $1.toUpperCase();
                        });

                        new_settings[camelCaseName] = attr.value;
                    }
                }
            }

            // assign default values
            for (var key in defaultSettings) {
                if (defaultSettings.hasOwnProperty(key) && !new_settings.hasOwnProperty(key)) {
                    new_settings[key] = defaultSettings[key];
                }
            }

            // if preloadOnly is true, but there is no life setting, default to 1
            if (new_settings.preloadOnly && !new_settings.life) {
                new_settings.life = 1;
            }

            // capitalize method string; it's easier and results in less code overall
            if (new_settings.method) {
                new_settings.method = new_settings.method.toUpperCase();
            }

            // default URL must be live URL
            new_settings.url = new_settings.url || window.location.href;

            return new_settings;
        },
        addEvent: function (obj, type, handler) {
            try {
                obj.addEventListener(type, handler);
            } catch (e) {
                try {
                    obj.attachEvent('on' + type, handler);
                } catch (e) {
                    obj['on' + type] = handler;
                }
            }
        },
        invokeUserCallback: function (fn, args) {
            if (!fn) return null;

            // try ... catch block for user defined callback functions, so that a faulty
            // `success/error/etc.` callback can never prevent a `complete` callback
            try {
                if (typeof fn == 'string') {
                    var namespaces = fn.split('.');
                    var fnObjString = namespaces.pop();
                    var context = window;

                    // set calling namespace
                    for (var i = 0; i < namespaces.length; i++) {
                        context = context[namespaces[i]];
                    }

                    return context[fnObjString].apply(context[fnObjString], args);
                } else {
                    return fn.apply(fn, args);
                }
            } catch (e) {
                console.error('Error in callback:');
                console.error(e);
            }
        },
        isSafeMethod: function (method) {
            if (method == 'GET' || method == 'HEAD')
                return true;
            // else
            return false;
        },
        copySettings: function (settings, new_settings) {
            // copy additional settings
            if (settings) {
                for (var key in settings) {
                    if (settings.hasOwnProperty(key)) {
                        new_settings[key] = settings[key];
                    }
                }
            }
        }
    }
}
