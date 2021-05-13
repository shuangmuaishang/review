self.addEventListener('message', function(e) {
    const port = e.ports[0];
    port.onmessage = function(e) {
        console.log('这里是worker2' + e.data)
    }
}, false)