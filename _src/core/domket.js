/*!
 * DOMKet v0.1.0
 * (C) 2017 Adam C. Abernathy, MIT Lic.
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
        typeof define === 'function' && define.amd ? define(['exports'], factory) :
            (factory((global.Domket = global.Domket || {})));
}(this, (function (exports) {
    'use strict';

    var state = {
        myName: 'sam'
    };

    function isEventProp(name) {
        return /^on/.test(name);
    }

    function extractEventName(name) {
        return name.slice(2).toLowerCase();
    }

    function isCustomProp(name) {
        return isEventProp(name) || name === 'forceUpdate';
    }

    function setBooleanProp(target, name, value) {
        if (value) {
            target.setAttribute(name, value);
            target[name] = true;
        } else {
            target[name] = false;
        }
    }
    function setProps(target, props) {
        if (typeof props !== "undefined") {
            Object.keys(props).map(function (name) {
                setProp(target, name, props[name]);
            });
        }
    }

    function isDataName(name) {
        return /^data__/.test(name)
    }

    function extractDataName(name) {
        return name.replace('data__', 'data-');
    }

    function setProp(target, name, value) {
        if (isCustomProp(name)) {
            return;
        }
        else if (isDataName(name)) {
            target.setAttribute(extractDataName(name), value);
        }
        else if (name === 'className') {
            target.setAttribute('class', value);
        }
        else if (typeof value === 'boolean') {
            setBooleanProp(target, name, value);
        }
        else {
            target.setAttribute(name, value);
        }
    }

    function removeProp(target, name, value) {
        if (isCustomProp(name)) {
            return;
        } else if (name === 'className') {
            target.removeAttribute('class');
        } else if (typeof value === 'boolean') {
            removeBooleanProp(target, name);
        } else {
            target.removeAttribute(name);
        }
    }

    function updateProps(target, newProps, oldProps) {
        oldProps = typeof oldProps === "undefined" ? {} : oldProps;
        var props = Object.assign({}, newProps, oldProps);
        Object.keys(props).forEach(function (name) {
            updateProp(target, name, newProps[name], oldProps[name]);
        });
    }

    function addEventListeners(target, props) {
        Object.keys(props).map(function (name) {
            if (isEventProp(name)) {
                target.addEventListener(extractEventName(name), props[name]);
            }
        });
    }

    function changed(node1, node2) {
        return typeof node1 !== typeof node2 ||
            typeof node1 === 'string' && node1 !== node2 ||
            node1.type !== node2.type ||
            node1.props && node1.props.forceUpdate;
    }

    var classed = function (selector, classToChange, bool) {
        bool = typeof bool === "undefined" ? true : bool
        var hasClass = true;
        var nodes = document.querySelectorAll(selector);
        if (nodes.length > 0) {
            var i;
            for (i = 0; i < nodes.length; i++) {
                // myNodelist[i].style.backgroundColor = "red";
                var classKeys = {};
                nodes[i].classList.value.trim().split(' ').map(function (k) { classKeys[k] = true; })

                if (typeof classKeys[classToChange] !== "undefined") {
                    hasClass = false
                }
                classKeys[classToChange] = bool;

                var result = ''
                Object.keys(classKeys).map(function (k) {
                    if (classKeys[k]) { result += k + ' ' }
                })

                nodes[i].classList.value = result;
            }
        }
        return hasClass
    }

    var updateElement = function ($parent, newNode, oldNode, index) {
        index = typeof index === "undefined" ? 0 : index;

        // console.log($parent, newNode, oldNode);
        if (!oldNode) {
            $parent.appendChild(
                createElement(newNode)
            );
        } else if (!newNode) {
            $parent.removeChild(
                $parent.childNodes[index]
            );
        } else if (changed(newNode, oldNode)) {
            $parent.replaceChild(
                createElement(newNode),
                $parent.childNodes[index]
            );
        } else if (newNode.type) {
            updateProps(
                $parent.childNodes[index],
                newNode.props,
                oldNode.props
            );
            var newLength = newNode.children.length;
            var oldLength = oldNode.children.length;
            for (var i = 0; i < newLength || i < oldLength; i++) {
                updateElement(
                    $parent.childNodes[index],
                    newNode.children[i],
                    oldNode.children[i],
                    i
                );
            }
        }
    }

    var lastNode;

    var createElement = function (node) {

        if (typeof node === 'string') { return document.createTextNode(node); }

        try {
            node.props = typeof node.props === "undefined" ? {} : node.props;
            node.children = typeof node.children === "undefined" ? [] : node.children;
        }
        catch (err) {
            console.warn(err);
            console.warn(node);
            console.warn('prev node', lastNode)
        }

        var el = document.createElement(node.type);
        // var frag = new DocumentFragment();

        setProps(el, node.props);
        addEventListeners(el, node.props);

        if (typeof node.children !== "undefined" && node.children.length > 0) {
            node.children.map(createElement).forEach(el.appendChild.bind(el));
        }

        lastNode = node;
        return el;
    }


    var render = function (elements, renderTo) {
        var frag = new DocumentFragment();
        try {
            if (typeof elements === "object" && elements.length > 0) {
                elements.map(function (k) {
                    frag.appendChild(createElement(k));
                    // document.getElementById(renderTo).appendChild(createElement(k));
                })
            }
            else {
                frag.appendChild(createElement(elements));
                // document.getElementById(renderTo).appendChild(createElement(elements));
            }
            document.getElementById(renderTo).appendChild(frag);
        }
        catch (err) {
            console.warn(err);
            console.warn('prev node', lastNode)
        }
    }

    exports.createElement = createElement;
    exports.updateElement = updateElement;
    exports.classed = classed;


    exports.render = render;

    Object.defineProperty(exports, '__esModule', { value: true });

})));