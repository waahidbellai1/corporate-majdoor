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
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =====================
   FIREBASE INIT
===================== */
const firebaseConfig = {
  apiKey: "AIzaSyDv8-8o_pd9ZUxxazTbBH5xBb_olbuhyag",
  authDomain: "corporate-majdoor.firebaseapp.com",
  projectId: "corporate-majdoor",
  storageBucket: "corporate-majdoor.appspot.com",
  messagingSenderId: "490168158830",
  appId: "1:490168158830:web:bde232dae0cff6ab8bb47f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =====================
   ELEMENTS
===================== */
const feed = document.getElementById("feed");
const postInput = document.getElementById("postInput");
const postBtn = document.getElementById("postBtn");
const status = document.getElementById("status");
const logoutBtn = document.getElementById("logoutBtn");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const email = document.getElementById("email");
const password = document.getElementById("password");
const username = document.getElementById("username");

const authSection = document.getElementById("authSection");
const postSection = document.getElementById("postSection");
const notifications = document.getElementById("notifications");
const notificationList = document.getElementById("notificationList");

/* =====================
   HELPERS
===================== */
function timeAgo(ts) {
  if (!ts) return "";
  const seconds = Math.floor((Date.now() - ts.toMillis()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/* =====================
   AUTH ACTIONS
===================== */
loginBtn.onclick = () => {
  signInWithEmailAndPassword(auth, email.value, password.value)
    .catch(err => status.innerText = err.message);
};

signupBtn.onclick = async () => {
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
    username: username.value.trim(),
    email: cred.user.email
  });
};

logoutBtn.onclick = () => signOut(auth);

/* =====================
   AUTH STATE (FIXED)
===================== */
onAuthStateChanged(auth, user => {
  if (user) {
    status.innerText = `👋 ${user.email}`;

    authSection.style.display = "none";
    postSection.style.display = "block";
    feed.style.display = "flex";
    notifications.style.display = "block";
    logoutBtn.style.display = "block";

    listenToPosts(user);
    listenToNotifications(user);
  } else {
    status.innerText = "🔐 Login to Corporate Majdoor";

    authSection.style.display = "block";
    postSection.style.display = "none";
    feed.style.display = "none";
    notifications.style.display = "none";
    logoutBtn.style.display = "none";
    feed.innerHTML = "";
  }
});

/* =====================
   CREATE POST
===================== */
postBtn.onclick = async () => {
  if (!auth.currentUser || !postInput.value.trim()) return;

  await addDoc(collection(db, "posts"), {
    text: postInput.value.trim(),
    uid: auth.currentUser.uid,
    createdAt: serverTimestamp(),
    likedBy: []
  });

  postInput.value = "";
};

/* =====================
   POSTS LISTENER
===================== */
function listenToPosts(user) {
  onSnapshot(
    query(collection(db, "posts"), orderBy("createdAt", "desc")),
    async snapshot => {
      feed.innerHTML = "";

      for (const postSnap of snapshot.docs) {
        const data = postSnap.data();

        const userSnap = await getDoc(doc(db, "users", data.uid));
        const name = userSnap.exists()
          ? userSnap.data().username
          : "user";

        const liked = data.likedBy.includes(user.uid);

        const post = document.createElement("div");
        post.className = "post";

        post.innerHTML = `
          <div class="post-header">
            <div class="post-header-left">
              <div class="avatar">${name[0]}</div>
              <div>
                <div class="post-username">${name}</div>
                <div class="post-time">${timeAgo(data.createdAt)}</div>
              </div>
            </div>

            ${user.uid === data.uid ? `
              <div class="post-menu">
                <button class="menu-btn">⋯</button>
                <div class="menu-dropdown">
                  <button class="deleteBtn">Delete</button>
                </div>
              </div>` : ""}
          </div>

          <div class="post-text">${data.text}</div>

          <div class="post-actions">
            <button class="likeBtn ${liked ? "liked" : ""}">👍 Like</button>
            ${data.likedBy.length
              ? `<span class="likeCount">${data.likedBy.length}</span>`
              : ""}
          </div>

          <div class="comments">
            <div class="comment-box">
              <input class="commentInput" placeholder="Add comment…" />
              <button class="sendCommentBtn">Send</button>
            </div>
            <div class="commentList"></div>
          </div>
        `;

        /* LIKE */
        post.querySelector(".likeBtn").onclick = async () => {
          const ref = doc(db, "posts", postSnap.id);
          const hasLiked = data.likedBy.includes(user.uid);

          await updateDoc(ref, {
            likedBy: hasLiked
              ? arrayRemove(user.uid)
              : arrayUnion(user.uid)
          });
        };

        /* DELETE */
        const delBtn = post.querySelector(".deleteBtn");
        if (delBtn) {
          delBtn.onclick = () =>
            deleteDoc(doc(db, "posts", postSnap.id));
        }

        /* MENU */
        const menuBtn = post.querySelector(".menu-btn");
        const menu = post.querySelector(".post-menu");
        if (menuBtn && menu) {
          menuBtn.onclick = () => menu.classList.toggle("open");
        }

        /* COMMENTS */
        const input = post.querySelector(".commentInput");
        const sendBtn = post.querySelector(".sendCommentBtn");
        const list = post.querySelector(".commentList");

        onSnapshot(
          query(
            collection(db, "posts", postSnap.id, "comments"),
            orderBy("createdAt", "asc")
          ),
          snap => {
            list.innerHTML = "";
            snap.forEach(c =>
              list.innerHTML +=
                `<div class="comment">${c.data().text}</div>`
            );
          }
        );

        async function sendComment() {
          if (!input.value.trim()) return;

          await addDoc(
            collection(db, "posts", postSnap.id, "comments"),
            {
              text: input.value.trim(),
              uid: user.uid,
              createdAt: serverTimestamp()
            }
          );
          input.value = "";
        }

        sendBtn.onclick = sendComment;
        input.onkeydown = e =>
          e.key === "Enter" && sendComment();

        feed.appendChild(post);
      }
    }
  );
}

/* =====================
   NOTIFICATIONS
===================== */
function listenToNotifications(user) {
  onSnapshot(
    query(collection(db, "notifications"), orderBy("createdAt", "desc")),
    snap => {
      notificationList.innerHTML = "";
      snap.forEach(n => {
        if (n.data().to === user.uid) {
          notificationList.innerHTML +=
            `<div class="notification">${n.data().text}</div>`;
        }
      });
    }
  );
}

/* =====================
   THEME TOGGLE
===================== */
const themeToggle = document.getElementById("themeToggle");

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  themeToggle.textContent = "☀️";
}

themeToggle.onclick = () => {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  themeToggle.textContent = dark ? "☀️" : "🌙";
  localStorage.setItem("theme", dark ? "dark" : "light");
};
