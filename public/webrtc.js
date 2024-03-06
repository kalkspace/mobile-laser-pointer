let peerConnection;
let uuid;
let ws;

const peerConnectionConfig = {
  iceServers: [
    { urls: "stun:stun.stunprotocol.org:3478" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

export const pageReady = () => {
  console.log("page ready");

  uuid = createUUID();

  const scheme = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${scheme}://${location.host}`);

  return new Promise((resolve) => {
    ws.addEventListener("open", () => {
      resolve("open");
      console.log("socket open");
      //   ws.send(JSON.stringify({ uuid }));
      ws.addEventListener("message", async (message) => {
        // console.log("got message", message.data);
        if (!peerConnection) {
          start(false);
        }

        const signal = JSON.parse(message.data);
        // console.log("signal", signal);

        if (signal.uuid === uuid) {
          return;
        }

        if (signal.sdp) {
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(signal.sdp)
          );
          if (signal.sdp.type === "offer") {
            const description = await peerConnection.createAnswer();
            createdDescription(description, ws);
            // resolve("sdp");
          }
        } else if (signal.ice) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice));
          //   resolve("ice");
        }
      });
    });
  });
};

export const start = async (isCaller) => {
  //   console.log("start", isCaller);
  peerConnection = new RTCPeerConnection(peerConnectionConfig);

  peerConnection.addEventListener("icecandidate", (event) => {
    console.log("icecandidate");
    if (event.candidate != null) {
      ws.send(JSON.stringify({ ice: event.candidate, uuid: uuid }));
    }
  });

  if (isCaller) {
    const dataChannel = peerConnection.createDataChannel("angles");

    return new Promise(async (resolve) => {
      dataChannel.addEventListener("open", () => {
        console.log("data channel open");
        dataChannel.send("Hello World!");
        resolve(dataChannel);
      });

      const description = await peerConnection.createOffer();
      console.log("caller with", description);
      createdDescription(description, ws);
    });
  } else {
    peerConnection.addEventListener("datachannel", (event) => {
      console.log("data channel event", event);
      event.channel.addEventListener("message", (event) => {
        console.log("data channel message:", event.data);

        const { deltaYaw, deltaRoll } = JSON.parse(event.data);

        const point = document.getElementById("circle");
        const factor = 50;

        point.setAttributeNS(null, "cx", 50 + factor * deltaYaw);
        point.setAttributeNS(null, "cy", 50 + factor * deltaRoll);
      });
    });
  }
};

const createdDescription = async (description, ws) => {
  console.log("created description", description);
  await peerConnection.setLocalDescription(description);
  ws.send(
    JSON.stringify({
      sdp: peerConnection.localDescription,
      uuid: uuid,
    })
  );
};

function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }

  return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4() + s4() + s4()}`;
}
