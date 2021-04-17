//declare html variables
const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
/* Get Our video Elements */
const player = document.querySelector('.player');
const video = player.querySelector('.viewer');
const progress = player.querySelector('.progress');
const progressBar = player.querySelector('.progress__filled');
const toggle = player.querySelector('.toggle');
const skipButtons = player.querySelectorAll('[data-skip]');
// const ranges = player.querySelectorAll('.player__slider');
//get our video calling elements
const videoGrid = document.getElementById('video-grid');
const myPeer = new Peer(undefined, {
  path: '/peerjs',
  host: '/',
  port: '443'
});
// const myPeer = new Peer(undefined, { host: "peerjs-server.herokuapp.com", secure: true, port: 443, });
let myVideoStream;
const myVideo = document.createElement('video');
myVideo.className = 'video_calling';
myVideo.muted = true;
const peers = {};

// Get username and room from URL
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const socket = io();

//peer starts here
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  myVideoStream = stream;
  addVideoStream(myVideo, stream);

  socket.emit('joinRoom', { username, room });
  myPeer.on('open', id => {
    socket.emit('join-room', room, id);
    console.log('peer joins');
  })

  myPeer.on('call', call => {
    console.log('got an call');
    call.answer(stream);
    const video_call = document.createElement('video');
    video_call.className = 'video_calling';
    call.on('stream', userVideoStream => {
      addVideoStream(video_call, userVideoStream)
    });
  });

  //video calling event
  socket.on('user-connected', userId => {
    connectToNewUser(userId, stream)
  })

  socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close()
  })

  //socket events comes here

  //message codes
  
  

  // Get room and users
  socket.on('roomUsers', ({ room, users }) => {
    outputRoomName(room);
    outputUsers(users);
  });

  // Message from server
  socket.on('message', (message) => {
    console.log(message);
    outputMessage(message);

    // Scroll down
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  // Message submit
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Get message text
    let msg = e.target.elements.msg.value;

    msg = msg.trim();

    if (!msg) {
      return false;
    }

    // Emit message to server
    socket.emit('chatMessage', msg);

    // Clear input
    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
  });

  //video player codes comes here
  
  /* Hook up the event listeners */
  //toggle play pause button
  video.addEventListener('click', ()=>{
    const method = video.paused ? 'play' : 'pause';
    const ctime = video.currentTime;
    console.log(username, room, method, ctime);
    socket.emit('toogle_play_pause', {method, ctime});
  });
  toggle.addEventListener('click', ()=>{
    const method = video.paused ? 'play' : 'pause';
    const ctime = video.currentTime;
    console.log(username, room, method);
    socket.emit('toogle_play_pause', {method, ctime});
  });

  socket.on('client_do_toogle_play_pause',({method, ctime})=>{
    console.log(method, ctime);
    video.currentTime = ctime;
    video[method]();
  });

  //change play pause button icon
  video.addEventListener('play', updateButton);
  video.addEventListener('pause', updateButton);

  //handle progress bar
  video.addEventListener('timeupdate', ()=>{
    const percent = (video.currentTime / video.duration) * 100;
    progressBar.style.flexBasis = `${percent}%`;
  });

  //sync skip buttons
  skipButtons.forEach(button => button.addEventListener('click', function() {
    let skip_time = video.currentTime + parseFloat(this.dataset.skip);
    console.log(username, room, skip_time );
    socket.emit('skip',  skip_time);
  }));

  socket.on('client_do_skip',(skip_time)=>{
    console.log(skip_time);
    video.currentTime = parseFloat(skip_time);
  });
  // ranges.forEach(range => range.addEventListener('change', handleRangeUpdate));
  // ranges.forEach(range => range.addEventListener('mousemove', handleRangeUpdate));

  // let mousedown = false;
  //sync progressbar
  progress.addEventListener('click', (e)=>{
    const scrubTime = (e.offsetX / progress.offsetWidth) * video.duration;
    console.log(username, room, scrubTime );
    socket.emit('scrub', scrubTime);
  });

  socket.on('client_do_scrub',(scrubTime)=>{
    video.currentTime = scrubTime;
  });

  //Prompt the user before leave chat room
  document.getElementById('leave-btn').addEventListener('click', () => {
    const leaveRoom = confirm('Are you sure you want to leave the chatroom?');
    if (leaveRoom) {
      window.location = '../index.html';
    } else {
    }
  });
})



// Join chatroom


// Output message to DOM
function outputMessage(message) {
  const div = document.createElement('div');
  div.classList.add('message');
  const p = document.createElement('p');
  p.classList.add('meta');
  p.innerText = message.username;
  p.innerHTML += `<span>${message.time}</span>`;
  div.appendChild(p);
  const para = document.createElement('p');
  para.classList.add('text');
  para.innerText = message.text;
  div.appendChild(para);
  document.querySelector('.chat-messages').appendChild(div);
}

// Add room name to DOM
function outputRoomName(room) {
  roomName.innerText = room;
}

// Add users to DOM
function outputUsers(users) {
  userList.innerHTML = '';
  users.forEach((user) => {
    const li = document.createElement('li');
    li.innerText = user.username;
    userList.appendChild(li);
  });
}



/* Build out video functions */

function updateButton() {
  const icon = this.paused ? '►' : '❚ ❚';
  console.log(icon);
  toggle.textContent = icon;
}
// function handleRangeUpdate() {
//   video[this.name] = this.value;
// }



//video calling functions

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement('video');
  video.className = 'video_calling';
  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream)
  })
  call.on('close', () => {
    video.remove()
  })

  peers[userId] = call
}

function addVideoStream(video, stream) {
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  videoGrid.append(video)
}



const muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    setUnmuteButton();
  } else {
    setMuteButton();
    myVideoStream.getAudioTracks()[0].enabled = true;
  }
}

const playStop = () => {
  console.log('object')
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    setPlayVideo()
  } else {
    setStopVideo()
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
}

const setMuteButton = () => {
  const html = `
    <i class="fas fa-microphone"></i>
    <span>Mute</span>
  `
  document.querySelector('.main__mute_button').innerHTML = html;
}

const setUnmuteButton = () => {
  const html = `
    <i class="unmute fas fa-microphone-slash"></i>
    <span>Unmute</span>
  `
  document.querySelector('.main__mute_button').innerHTML = html;
}

const setStopVideo = () => {
  const html = `
    <i class="fas fa-video"></i>
    <span>Stop Video</span>
  `
  document.querySelector('.main__video_button').innerHTML = html;
}

const setPlayVideo = () => {
  const html = `
  <i class="stop fas fa-video-slash"></i>
    <span>Play Video</span>
  `
  document.querySelector('.main__video_button').innerHTML = html;
}




