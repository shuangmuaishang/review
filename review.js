// 防抖
function debounce(fn, delay) {
    let timer = null;
    return function() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, arguments);
            timer = null;
        }, delay)
    }
}

// 节流
function throttle(fn, delay) {
    let timer;
    return function() {
        if (!timer) {
            timer = setTimeout(() => {
                fn.call(this, arguments);
                timer = null;
            }, delay)
        }
    }
}

// 深拷贝
function deepClone(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
    let copy = {};
    if (obj.constructor === Array) {
        copy = [];
    }
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            copy[key] = deepClone(obj[key]);
        }
    }
    return copy;
}

// 函数柯里化
function curry(fn, args) {
    var length = fn.length;
    args = args || [];
    return function() {
        var _args = args.slice(0);
        var arr = [].slice.call(arguments, 0);
        _args = _args.concat(arr);
        var len = _args.length;
        if (len < length) {
            return curry.call(this, fn, _args)
        } else {
            return fn.apply(this, _args)
        }
    }
}

var fn = curry(function(a, b, c) {
    console.log([a, b, c]);
});

fn("a", "b", "c")
fn("a", "b")("c")
fn("a")("b")("c")
fn("a")("b", "c")
