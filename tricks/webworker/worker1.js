self.addEventListener('message', function(e) {
    console.log(OffscreenCanvas)
    const port = e.ports[0];
    port.postMessage('这条是worker1')
}, false)