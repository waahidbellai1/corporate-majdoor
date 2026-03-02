import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyDv8-8o_pd9ZUxxazTbBH5xBb_olbuhyag",
  authDomain: "corporate-majdoor.firebaseapp.com",
  projectId: "corporate-majdoor",
  storageBucket: "corporate-majdoor.appspot.com"
});

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const $ = id => document.getElementById(id);
const userCache = {};

const authSection = $("authSection");
const postSection = $("postSection");
const feed = $("feed");
const status = $("status");
const notifications = $("notifications");
const notificationList = $("notificationList");

const loginBtn = $("loginBtn");
const signupBtn = $("signupBtn");
const email = $("email");
const password = $("password");
const username = $("username");
const switchAuthBtn = $("switchAuthBtn");
const switchText = $("switchText");
const authTitle = $("authTitle");
const authSubtitle = $("authSubtitle");

const postInput = $("postInput");
const postVideoInput = $("postVideoInput");
const postVideoName = $("postVideoName");
const postBtn = $("postBtn");
const addPostBtn = $("addPostBtn");

const profileBtn = $("profileBtn");
const profileMenu = $("profileMenu");
const profileLogout = $("profileLogout");
const notifBell = $("notifBell");

const bottomProfileBtn = $("bottomProfileBtn");
const bottomNotifBtn = $("bottomNotifBtn");
const bottomChatBtn = $("bottomChatBtn");

const profileSheet = $("profileSheet");
const sheetOverlay = $("profileSheetOverlay");
const sheetLogoutBtn = $("sheetLogoutBtn");
const sheetThemeToggle = $("sheetThemeToggle");

const themeToggle = $("themeToggle");
const appLogo = $("appLogo");

const profilePage = $("profilePage");
const profileCover = $("profileCover");
const profileAvatar = $("profileAvatar");
const profileAvatarLetter = $("profileAvatarLetter");
const profileUsername = $("profileUsername");
const avatarInput = $("avatarInput");
const coverInput = $("coverInput");
const downloadAvatarBtn = $("downloadAvatarBtn");
const downloadCoverBtn = $("downloadCoverBtn");

const chatPanel = $("chatPanel");
const closeChatBtn = $("closeChatBtn");
const chatList = $("chatList");
const chatInput = $("chatInput");
const sendChatBtn = $("sendChatBtn");

function timeAgo(ts) {
  if (!ts) return "Just now";
  const sec = Math.floor((Date.now() - ts.toMillis()) / 1000);
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function safeText(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function updateLogo() {
  appLogo.src = document.body.classList.contains("dark")
    ? "logo-dark.png"
    : "logo-light.png";
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
  updateLogo();
}

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
}
updateLogo();

themeToggle?.addEventListener("click", toggleTheme);
sheetThemeToggle?.addEventListener("click", () => {
  toggleTheme();
  profileSheet?.classList.remove("open");
  sheetOverlay?.classList.remove("open");
});

let isSignupMode = false;
function setLoginMode() {
  isSignupMode = false;
  authTitle.innerText = "Welcome back";
  authSubtitle.innerText = "Login to continue";
  switchText.innerText = "Don’t have an account?";
  switchAuthBtn.innerText = "Sign up";
  loginBtn.style.display = "block";
  signupBtn.style.display = "none";
  username.style.display = "none";
}

function setSignupMode() {
  isSignupMode = true;
  authTitle.innerText = "Create your account";
  authSubtitle.innerText = "Join Corporate Majdoor";
  switchText.innerText = "Already have an account?";
  switchAuthBtn.innerText = "Login";
  loginBtn.style.display = "none";
  signupBtn.style.display = "block";
  username.style.display = "block";
}

switchAuthBtn?.addEventListener("click", () => {
  isSignupMode ? setLoginMode() : setSignupMode();
});
setLoginMode();

loginBtn?.addEventListener("click", () => {
  signInWithEmailAndPassword(auth, email.value, password.value).catch(e => {
    status.innerText = e.message;
  });
});

signupBtn?.addEventListener("click", async () => {
  if (!username.value.trim()) {
    status.innerText = "Username required";
    return;
  }

  const cred = await createUserWithEmailAndPassword(auth, email.value, password.value);
  await setDoc(doc(db, "users", cred.user.uid), {
    username: username.value.trim(),
    photoURL: "",
    coverURL: "",
    createdAt: serverTimestamp()
  });
});

profileLogout?.addEventListener("click", () => signOut(auth));
sheetLogoutBtn?.addEventListener("click", () => signOut(auth));

profileBtn?.addEventListener("click", e => {
  e.stopPropagation();
  profileMenu?.classList.toggle("open");
  notifications?.classList.remove("open");
});

bottomProfileBtn?.addEventListener("click", () => {
  profileSheet?.classList.add("open");
  sheetOverlay?.classList.add("open");
});

sheetOverlay?.addEventListener("click", () => {
  profileSheet?.classList.remove("open");
  sheetOverlay?.classList.remove("open");
});

function toggleNotifications() {
  notifications?.classList.toggle("open");
  profileMenu?.classList.remove("open");
}

notifBell?.addEventListener("click", e => {
  e.stopPropagation();
  toggleNotifications();
});
bottomNotifBtn?.addEventListener("click", e => {
  e.stopPropagation();
  toggleNotifications();
});

addPostBtn?.addEventListener("click", () => {
  postSection.style.display = "block";
  postSection.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => postInput?.focus(), 250);
});

postVideoInput?.addEventListener("change", () => {
  const file = postVideoInput.files?.[0];
  postVideoName.textContent = file ? `🎬 ${file.name}` : "";
});

async function getUsername(uid) {
  if (userCache[uid]) return userCache[uid];
  const u = await getDoc(doc(db, "users", uid));
  const name = u.exists() ? u.data().username || "user" : "user";
  userCache[uid] = name;
  return name;
}

function renderMedia(data) {
  if (data.videoURL) {
    return `<video class="post-video" controls playsinline preload="metadata" src="${safeText(data.videoURL)}"></video>`;
  }
  return "";
}

function listenToPosts(user) {
  return onSnapshot(query(collection(db, "posts"), orderBy("createdAt", "desc")), async snap => {
    feed.innerHTML = "";

    for (const d of snap.docs) {
      const data = d.data();
      const liked = (data.likedBy || []).includes(user.uid);
      const name = await getUsername(data.uid);

      const post = document.createElement("div");
      post.className = "post";
      post.innerHTML = `
        <div class="post-header">
          <div class="post-header-left">
            <div class="avatar">${safeText(name[0] || "U")}</div>
            <div>
              <div class="post-username">${safeText(name)}</div>
              <div class="post-time">${timeAgo(data.createdAt)}</div>
            </div>
          </div>
          ${data.uid === user.uid ? '<button class="delete-post" type="button">🗑</button>' : ""}
        </div>

        ${data.text ? `<div class="post-text">${safeText(data.text)}</div>` : ""}
        ${renderMedia(data)}

        <div class="post-actions">
          <button class="likeBtn ${liked ? "liked" : ""}" type="button">❤️ Like</button>
          ${data.likedBy?.length ? `<span class="likeCount">${data.likedBy.length}</span>` : ""}
        </div>

        <div class="comments">
          <div class="comment-list"></div>
          <div class="comment-box">
            <input class="comment-input" placeholder="Write a comment…" />
            <button class="send-comment" type="button">Post</button>
          </div>
        </div>
      `;

      post.querySelector(".likeBtn")?.addEventListener("click", () => {
        updateDoc(doc(db, "posts", d.id), {
          likedBy: liked ? arrayRemove(user.uid) : arrayUnion(user.uid)
        });
      });

      post.querySelector(".delete-post")?.addEventListener("click", async () => {
        if (confirm("Delete this post?")) {
          await deleteDoc(doc(db, "posts", d.id));
        }
      });

      const list = post.querySelector(".comment-list");
      const input = post.querySelector(".comment-input");
      const sendBtn = post.querySelector(".send-comment");

      onSnapshot(query(collection(db, "posts", d.id, "comments"), orderBy("createdAt")), async commentSnap => {
        list.innerHTML = "";
        for (const c of commentSnap.docs) {
          const cd = c.data();
          const commentName = await getUsername(cd.uid);
          const canDelete = cd.uid === user.uid || data.uid === user.uid;
          list.innerHTML += `
            <div class="comment-item">
              <div class="comment-bubble">
                <strong>${safeText(commentName)}</strong> ${safeText(cd.text)}
                ${canDelete ? `<button class="delete-comment" type="button" data-id="${c.id}">🗑</button>` : ""}
              </div>
            </div>
          `;
        }

        list.querySelectorAll(".delete-comment").forEach(btn => {
          btn.addEventListener("click", async () => {
            if (confirm("Delete this comment?")) {
              await deleteDoc(doc(db, "posts", d.id, "comments", btn.dataset.id));
            }
          });
        });
      });

      sendBtn?.addEventListener("click", async () => {
        if (!input.value.trim()) return;
        await addDoc(collection(db, "posts", d.id, "comments"), {
          text: input.value.trim(),
          uid: user.uid,
          createdAt: serverTimestamp()
        });
        input.value = "";
      });

      feed.appendChild(post);
    }
  });
}

function listenToNotifications(user) {
  return onSnapshot(
    query(collection(db, "notifications"), where("to", "==", user.uid), orderBy("createdAt", "desc")),
    snap => {
      notificationList.innerHTML = "";
      if (snap.empty) {
        notificationList.innerHTML = '<div class="notification empty">🎉 You\'re all caught up</div>';
        return;
      }
      snap.forEach(d => {
        notificationList.innerHTML += `<div class="notification">${safeText(d.data().text || "")}</div>`;
      });
    }
  );
}

postBtn?.addEventListener("click", async () => {
  const text = postInput.value.trim();
  const videoFile = postVideoInput.files?.[0];
  if (!text && !videoFile) return;

  postBtn.disabled = true;
  postBtn.innerText = "Posting...";

  let videoURL = "";
  if (videoFile && auth.currentUser) {
    const videoRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}-${videoFile.name}`);
    await uploadBytes(videoRef, videoFile);
    videoURL = await getDownloadURL(videoRef);
  }

  await addDoc(collection(db, "posts"), {
    text,
    uid: auth.currentUser.uid,
    createdAt: serverTimestamp(),
    likedBy: [],
    videoURL
  });

  postInput.value = "";
  postVideoInput.value = "";
  postVideoName.textContent = "";
  postBtn.disabled = false;
  postBtn.innerText = "Post";
});

function openProfile(user) {
  if (!user) return;
  feed.style.display = "none";
  postSection.style.display = "none";
  chatPanel?.classList.remove("open");
  profilePage.style.display = "block";
  loadProfile(user);
}

function closeProfile() {
  profilePage.style.display = "none";
  feed.style.display = "flex";
  postSection.style.display = "block";
}

async function loadProfile(user) {
  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;
  const data = snap.data();
  profileUsername.innerText = data.username || "User";
  profileAvatarLetter.innerText = (data.username || "U")[0].toUpperCase();

  if (data.photoURL) {
    profileAvatar.style.backgroundImage = `url(${data.photoURL})`;
    profileAvatar.classList.add("has-image");
    profileAvatarLetter.style.display = "none";
  } else {
    profileAvatar.style.backgroundImage = "";
    profileAvatar.classList.remove("has-image");
    profileAvatarLetter.style.display = "inline";
  }

  if (data.coverURL) {
    profileCover.style.backgroundImage = `url(${data.coverURL})`;
    profileCover.classList.add("has-image");
  } else {
    profileCover.style.backgroundImage = "";
    profileCover.classList.remove("has-image");
  }

  downloadAvatarBtn.onclick = () => data.photoURL && window.open(data.photoURL, "_blank");
  downloadCoverBtn.onclick = () => data.coverURL && window.open(data.coverURL, "_blank");
}

profileAvatar?.addEventListener("click", () => avatarInput?.click());
profileCover?.addEventListener("click", () => coverInput?.click());

avatarInput?.addEventListener("change", async e => {
  const file = e.target.files?.[0];
  if (!file || !auth.currentUser) return;
  const avatarRef = ref(storage, `avatars/${auth.currentUser.uid}`);
  await uploadBytes(avatarRef, file);
  const photoURL = await getDownloadURL(avatarRef);
  await updateDoc(doc(db, "users", auth.currentUser.uid), { photoURL });
  await loadProfile(auth.currentUser);
});

coverInput?.addEventListener("change", async e => {
  const file = e.target.files?.[0];
  if (!file || !auth.currentUser) return;
  const coverRef = ref(storage, `covers/${auth.currentUser.uid}`);
  await uploadBytes(coverRef, file);
  const coverURL = await getDownloadURL(coverRef);
  await updateDoc(doc(db, "users", auth.currentUser.uid), { coverURL });
  await loadProfile(auth.currentUser);
});

document.querySelector("#profileMenu .profile-item")?.addEventListener("click", () => {
  openProfile(auth.currentUser);
  profileMenu.classList.remove("open");
});

$("sheetProfileBtn")?.addEventListener("click", () => {
  openProfile(auth.currentUser);
  profileSheet.classList.remove("open");
  sheetOverlay.classList.remove("open");
});

$("backToFeedBtn")?.addEventListener("click", closeProfile);

function toggleChat(forceOpen = null) {
  if (!chatPanel) return;
  const shouldOpen = forceOpen === null ? !chatPanel.classList.contains("open") : forceOpen;
  chatPanel.classList.toggle("open", shouldOpen);
  if (shouldOpen) {
    profilePage.style.display = "none";
    chatInput?.focus();
  }
}

bottomChatBtn?.addEventListener("click", () => toggleChat());
closeChatBtn?.addEventListener("click", () => toggleChat(false));

function listenToChat(user) {
  return onSnapshot(query(collection(db, "chats", "global", "messages"), orderBy("createdAt", "asc")), async snap => {
    chatList.innerHTML = "";
    for (const msg of snap.docs) {
      const data = msg.data();
      const name = await getUsername(data.uid);
      const mine = data.uid === user.uid;
      chatList.innerHTML += `
        <div class="chat-msg ${mine ? "mine" : ""}">
          <div class="chat-name">${safeText(name)}</div>
          <div class="chat-text">${safeText(data.text || "")}</div>
        </div>
      `;
    }
    chatList.scrollTop = chatList.scrollHeight;
  });
}

sendChatBtn?.addEventListener("click", async () => {
  const text = chatInput.value.trim();
  if (!text || !auth.currentUser) return;
  await addDoc(collection(db, "chats", "global", "messages"), {
    uid: auth.currentUser.uid,
    text,
    createdAt: serverTimestamp()
  });
  chatInput.value = "";
});

document.addEventListener("click", e => {
  if (notifications?.classList.contains("open") && !notifications.contains(e.target) && !notifBell?.contains(e.target)) {
    notifications.classList.remove("open");
  }
  if (profileMenu?.classList.contains("open") && !profileMenu.contains(e.target) && !profileBtn?.contains(e.target)) {
    profileMenu.classList.remove("open");
  }
});

let unsubPosts = null;
let unsubNotifs = null;
let unsubChat = null;

onAuthStateChanged(auth, user => {
  document.body.className = document.body.classList.contains("dark") ? "dark" : "";
  document.body.classList.add(user ? "is-authenticated" : "is-logged-out");

  unsubPosts?.();
  unsubNotifs?.();
  unsubChat?.();

  if (user) {
    status.innerText = "";
    authSection.style.display = "none";
    postSection.style.display = "block";
    feed.style.display = "flex";
    notifications.style.display = "block";
    profilePage.style.display = "none";

    unsubPosts = listenToPosts(user);
    unsubNotifs = listenToNotifications(user);
    unsubChat = listenToChat(user);
    loadProfile(user);
  } else {
    authSection.style.display = "block";
    postSection.style.display = "none";
    feed.style.display = "none";
    notifications.style.display = "none";
    profilePage.style.display = "none";
    chatPanel?.classList.remove("open");
    feed.innerHTML = "";
    chatList.innerHTML = "";
    notificationList.innerHTML = "";
  }

  updateLogo();
});
