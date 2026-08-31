(function () {
  window.wiiPaintLastValid = false;
  window.wiiPaintLastX = 0;
  window.wiiPaintLastY = 0;

  function getViewportWidth() {
    return window.innerWidth ||
      document.documentElement.clientWidth ||
      document.body.clientWidth ||
      800;
  }

  function getViewportHeight() {
    return window.innerHeight ||
      document.documentElement.clientHeight ||
      document.body.clientHeight ||
      600;
  }

  function pollWiiRemote() {
    var status = document.getElementById("wiiStatus");
    var canvas = document.getElementById("paint");
    var mode = document.getElementById("wiiDrawing");

    if (!status || !canvas || !mode) {
      return;
    }

    if (!window.opera || !window.opera.wiiremote) {
      status.innerHTML = "Wii API: not detected";
      return;
    }

    var pad = window.opera.wiiremote.update(0);
    if (!pad || !pad.isEnabled || !pad.isDataValid) {
      status.innerHTML = "Wii Remote: waiting";
      window.wiiPaintLastValid = false;
      return;
    }

    status.innerHTML = "Wii Remote: connected";

    if (mode.value != "1" || pad.dpdValidity <= 0) {
      window.wiiPaintLastValid = false;
      return;
    }

    var viewportX = ((pad.dpdX + 1) / 2) * getViewportWidth();
    var viewportY = ((pad.dpdY + 1) / 2) * getViewportHeight();
    var rect = canvas.getBoundingClientRect();

    if (viewportX < rect.left || viewportX > rect.right ||
        viewportY < rect.top || viewportY > rect.bottom) {
      window.wiiPaintLastValid = false;
      return;
    }

    var x = (viewportX - rect.left) * (canvas.width / rect.width);
    var y = (viewportY - rect.top) * (canvas.height / rect.height);

    if (window.wiiPaintLastValid) {
      var context = canvas.getContext("2d");
      context.beginPath();
      context.moveTo(window.wiiPaintLastX, window.wiiPaintLastY);
      context.lineTo(x, y);
      context.strokeStyle = document.getElementById("penColor").value;
      context.lineWidth = parseInt(document.getElementById("penSize").value, 10) * 2;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.stroke();
    }

    window.wiiPaintLastX = x;
    window.wiiPaintLastY = y;
    window.wiiPaintLastValid = true;
  }

  window.setInterval(pollWiiRemote, 30);
}());