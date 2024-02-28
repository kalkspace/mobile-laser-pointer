const WebSocket = require("ws");
const express = require("express");
const path = require("path");

const app = express();
app.use("/", express.static(path.join(__dirname, "public")));

const myServer = app.listen(9876);

const wsServer = new WebSocket.Server({
  noServer: true,
});
wsServer.on("connection", (ws) => {
  ws.on("message", (msg) => {
    let clientCount = 0;
    wsServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        clientCount++;
        client.send(msg.toString());
      }
    });
    // console.log({ clientCount });
  });
});

myServer.on("upgrade", async (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, (ws) => {
    wsServer.emit("connection", ws, request);
  });
});
