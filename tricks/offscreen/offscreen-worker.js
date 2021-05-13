self.addEventListener('message', function(data) {
    console.log(data.data.canvas)
    let offscreen = data.data.canvas;
    let context = offscreen.getContext('2d');
    context.fillRect(0, 0, 100, 100)
})