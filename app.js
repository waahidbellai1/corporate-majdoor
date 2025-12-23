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
  arrayUnion,
  arrayRemove,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =====================
   FIREBASE INIT
===================== */
const app = initializeApp({
  apiKey: "AIzaSyDv8-8o_pd9ZUxxazTbBH5xBb_olbuhyag",
  authDomain: "corporate-majdoor.firebaseapp.com",
  projectId: "corporate-majdoor"
});

const auth = getAuth(app);
const db = getFirestore(app);

/* =====================
   SAFE DOM HELPERS
===================== */
const $ = id => document.getElementById(id);
const show = (el, type = "block") => el && (el.style.display = type);
const hide = el => el && (el.style.display = "none");

/* =====================
   ELEMENTS
===================== */
const feed = $("feed");
const postInput = $("postInput");
const postBtn = $("postBtn");
const status = $("status");

const loginBtn = $("loginBtn");
const signupBtn = $("signupBtn");
const email = $("email");
const password = $("password");
const username = $("username");

const authSection = $("authSection");
const postSection = $("postSection");

const notifBell = $("notifBell");
const notifications = $("notifications");
const notificationList = $("notificationList");

const profileBtn = $("profileBtn");
const profileMenu = $("profileMenu");
const profileLogout = $("profileLogout");

const themeToggle = $("themeToggle");
const appLogo = $("appLogo");

/* Bottom bar */
const bottomBar = document.querySelector(".bottom-bar:last-of-type");
const addPostBtn = $("addPostBtn");

/* =====================
   THEME RESTORE
===================== */
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
}

/* =====================
   HELPERS
===================== */
function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts.toMillis()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const userCache = {};

/* =====================
   AUTH ACTIONS
===================== */
loginBtn?.addEventListener("click", () => {
  signInWithEmailAndPassword(auth, email.value, password.value)
    .catch(e => status.innerText = e.message);
});

signupBtn?.addEventListener("click", async () => {
  if (!username.value.trim()) {
    status.innerText = "Username required";
    return;
  }

  const cred = await createUserWithEmailAndPassword(
    auth,
    email.value,
    password.value
  );

  await setDoc(doc(db, "users", cred.user.uid), {
    username: username.value.trim()
  });
});

profileLogout?.addEventListener("click", () => signOut(auth));

/* =====================
   AUTH STATE
===================== */
let unsubPosts = null;
let unsubNotifs = null;

onAuthStateChanged(auth, user => {

  unsubPosts && unsubPosts();
  unsubNotifs && unsubNotifs();

  if (user) {
    document.body.classList.add("is-authenticated");
    document.body.classList.remove("is-logged-out");

    hide(authSection);
    show(postSection);
    show(feed, "flex");

    show(notifBell);
    show(profileBtn);
    show(bottomBar, "flex");

    unsubPosts = listenToPosts(user);
    unsubNotifs = listenToNotifications(user);

  } else {
    document.body.classList.add("is-logged-out");
    document.body.classList.remove("is-authenticated");

    show(authSection);
    hide(postSection);
    hide(feed);
    hide(notifications);
    hide(bottomBar);

    if (feed) feed.innerHTML = "";
  }
});

/* =====================
   CREATE POST
===================== */
postBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user || !postInput.value.trim()) return;

  await addDoc(collection(db, "posts"), {
    text: postInput.value.trim(),
    uid: user.uid,
    createdAt: serverTimestamp(),
    likedBy: []
  });

  postInput.value = "";
});

/* =====================
   POSTS (FIXED)
===================== */
function listenToPosts(user) {
  return onSnapshot(
    query(collection(db, "posts"), orderBy("createdAt", "desc")),
    async snap => {
      feed.innerHTML = "";

      for (const docSnap of snap.docs) {
        const data = docSnap.data();

        const likedBy = Array.isArray(data.likedBy) ? data.likedBy : [];
        const liked = likedBy.includes(user.uid);

        let name = userCache[data.uid];
        if (!name) {
          const u = await getDoc(doc(db, "users", data.uid));
          name = u.exists() ? u.data().username : "user";
          userCache[data.uid] = name;
        }

        const post = document.createElement("div");
        post.className = "post";

        post.innerHTML = `
          <div class="post-header">
            <div class="post-header-left">
              <div class="avatar">${name[0].toUpperCase()}</div>
              <div>
                <div class="post-username">${name}</div>
                <div class="post-time">${timeAgo(data.createdAt)}</div>
              </div>
            </div>
          </div>

          <div class="post-text">${data.text}</div>

          <div class="post-actions">
            <button class="likeBtn ${liked ? "liked" : ""}">👍 Like</button>
            ${likedBy.length ? `<span class="likeCount">${likedBy.length}</span>` : ""}
          </div>
        `;

        post.querySelector(".likeBtn").onclick = async () => {
          await updateDoc(doc(db, "posts", docSnap.id), {
            likedBy: liked
              ? arrayRemove(user.uid)
              : arrayUnion(user.uid)
          });
        };

        feed.appendChild(post);
      }
    }
  );
}

/* =====================
   NOTIFICATIONS
===================== */
function listenToNotifications(user) {
  if (!notificationList) return null;

  return onSnapshot(
    query(
      collection(db, "notifications"),
      where("to", "==", user.uid),
      orderBy("createdAt", "desc")
    ),
    snap => {
      notificationList.innerHTML = "";
      snap.forEach(n => {
        notificationList.innerHTML +=
          `<div class="notification">${n.data().text}</div>`;
      });
    }
  );
}

/* =====================
   UI CONTROLS
===================== */
notifBell?.addEventListener("click", () => {
  notifications.style.display =
    notifications.style.display === "block" ? "none" : "block";
});

profileBtn?.addEventListener("click", e => {
  e.stopPropagation();
  profileMenu?.classList.toggle("open");
});

document.addEventListener("click", () => {
  profileMenu?.classList.remove("open");
});

/* =====================
   THEME
===================== */
function updateLogo() {
  if (!appLogo) return;
  appLogo.src = document.body.classList.contains("dark")
    ? "logo-dark.png"
    : "logo-light.png";
}

themeToggle?.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
  updateLogo();
});

updateLogo();
