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
      resolve();
      console.log("socket open");
      ws.addEventListener("message", async (message) => {
        if (!peerConnection) {
          start(false);
        }

        const signal = JSON.parse(message.data);

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
          }
        } else if (signal.ice) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice));
        }
      });
    });
  });
};

export const start = async (isCaller) => {
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
        resolve(dataChannel);
      });

      const description = await peerConnection.createOffer();
      createdDescription(description, ws);
    });
  } else {
    peerConnection.addEventListener("datachannel", (event) => {
      event.channel.addEventListener("message", (event) => {
        console.log("data channel message", event.data);

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
