import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

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
const usernameInput = document.getElementById("username");
const email = document.getElementById("email");
const password = document.getElementById("password");
const status = document.getElementById("status");
const authSection = document.getElementById("authSection");
const postSection = document.getElementById("postSection");
const postInput = document.getElementById("postInput");
const postBtn = document.getElementById("postBtn");
const feed = document.getElementById("feed");
const logoutBtn = document.getElementById("logoutBtn");

/* =====================
   HELPERS
===================== */
function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts.toMillis()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

async function getUsername(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data().username : "user";
}

/* =====================
   AUTH
===================== */
document.getElementById("loginBtn").onclick = () => {
  signInWithEmailAndPassword(auth, email.value, password.value)
    .catch(err => status.innerText = err.message);
};

document.getElementById("signupBtn").onclick = async () => {
  if (!usernameInput.value.trim()) return;
  const cred = await createUserWithEmailAndPassword(
    auth, email.value, password.value
  );
  await setDoc(doc(db, "users", cred.user.uid), {
    username: usernameInput.value.trim(),
    email: cred.user.email
  });
};

logoutBtn.onclick = () => signOut(auth);

/* =====================
   AUTH STATE
===================== */
onAuthStateChanged(auth, async user => {
  if (user) {
    authSection.style.display = "none";
    postSection.style.display = "block";
    logoutBtn.style.display = "block";
    status.innerText = `👋 ${user.email}`;
  } else {
    authSection.style.display = "block";
    postSection.style.display = "none";
    logoutBtn.style.display = "none";
    status.innerText = "🔐 Login to Corporate Majdoor";
  }
});

/* =====================
   CREATE POST
===================== */
postBtn.onclick = async () => {
  if (!postInput.value.trim()) return;
  await addDoc(collection(db, "posts"), {
    text: postInput.value,
    uid: auth.currentUser.uid,
    createdAt: serverTimestamp(),
    likedBy: []
  });
  postInput.value = "";
};

/* =====================
   FEED + SKELETON
===================== */
feed.innerHTML = Array(3).fill(`
  <div class="skeleton-post">
    <div class="skeleton-header">
      <div class="skeleton skeleton-avatar"></div>
      <div style="flex:1">
        <div class="skeleton skeleton-line medium"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>
    </div>
    <div class="skeleton skeleton-line full"></div>
  </div>
`).join("");

const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

onSnapshot(q, snapshot => {
  feed.innerHTML = "";

  snapshot.forEach(async docSnap => {
    const d = docSnap.data();
    const username = await getUsername(d.uid);

    const post = document.createElement("div");
    post.className = "post";

    post.innerHTML = `
      <div class="post-header">
        <div class="post-header-left">
          <div class="avatar">${username[0]}</div>
          <div>
            <div class="post-username">@${username}</div>
            <div class="post-time">${timeAgo(d.createdAt)}</div>
          </div>
        </div>

        ${auth.currentUser?.uid === d.uid ? `
        <div class="post-menu">
          <button class="menu-btn">⋯</button>
          <div class="menu-dropdown">
            <button class="deleteBtn">Delete</button>
          </div>
        </div>` : ""}
      </div>

      <div class="post-text">${d.text}</div>

      <div class="post-actions">
        <button class="likeBtn ${d.likedBy.includes(auth.currentUser?.uid) ? "liked":""}">
          👍 Like
        </button>
        ${d.likedBy.length ? `<span class="likeCount">${d.likedBy.length}</span>` : ""}
      </div>
    `;

    const likeBtn = post.querySelector(".likeBtn");
    if (likeBtn) {
      likeBtn.onclick = async () => {
        const ref = doc(db, "posts", docSnap.id);
        const liked = d.likedBy.includes(auth.currentUser.uid);
        await updateDoc(ref, {
          likedBy: liked
            ? arrayRemove(auth.currentUser.uid)
            : arrayUnion(auth.currentUser.uid)
        });
      };
    }

    const del = post.querySelector(".deleteBtn");
    if (del) del.onclick = () => deleteDoc(doc(db, "posts", docSnap.id));

    const menuBtn = post.querySelector(".menu-btn");
    const menu = post.querySelector(".post-menu");
    if (menuBtn) menuBtn.onclick = () => menu.classList.toggle("open");

    feed.appendChild(post);
  });
});

/* =====================
   DARK MODE
===================== */
const toggle = document.getElementById("themeToggle");
const saved = localStorage.getItem("theme");
if (saved === "dark") document.body.classList.add("dark");

toggle.onclick = () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
};
