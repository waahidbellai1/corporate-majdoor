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

/* =====================
   AUTH
===================== */
loginBtn.onclick = () =>
  signInWithEmailAndPassword(auth, email.value, password.value)
    .catch(err => status.innerText = err.message);

signupBtn.onclick = async () => {
  if (!username.value.trim()) return;
  const cred = await createUserWithEmailAndPassword(auth, email.value, password.value);
  await setDoc(doc(db, "users", cred.user.uid), {
    username: username.value.trim()
  });
};

logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  logoutBtn.style.display = user ? "block" : "none";
});

/* =====================
   POST
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
   FEED
===================== */
onSnapshot(
  query(collection(db, "posts"), orderBy("createdAt", "desc")),
  snapshot => {
    feed.innerHTML = "";

    snapshot.forEach(async snap => {
      const data = snap.data();
      const userSnap = await getDoc(doc(db, "users", data.uid));
      const name = userSnap.exists() ? userSnap.data().username : "user";

      const post = document.createElement("div");
      post.className = "post";

      post.innerHTML = `
        <div class="post-header">
          <div class="post-header-left">
            <div class="avatar">${name[0]}</div>
            <div>
              <div class="post-username">${name}</div>
            </div>
          </div>
        </div>

        <div class="post-text">${data.text}</div>

        <div class="post-actions">
          <button class="likeBtn">👍 Like</button>
          <span>${data.likedBy.length || ""}</span>
        </div>

        <div class="comments">
          <div class="comment-box">
            <input class="commentInput" placeholder="Add comment…" />
            <button class="sendCommentBtn">Send</button>
          </div>
          <div class="commentList"></div>
        </div>
      `;

      const likeBtn = post.querySelector(".likeBtn");
      likeBtn.onclick = async () => {
        const ref = doc(db, "posts", snap.id);
        const liked = data.likedBy.includes(auth.currentUser.uid);
        await updateDoc(ref, {
          likedBy: liked
            ? arrayRemove(auth.currentUser.uid)
            : arrayUnion(auth.currentUser.uid)
        });
      };

      const input = post.querySelector(".commentInput");
      const sendBtn = post.querySelector(".sendCommentBtn");
      const list = post.querySelector(".commentList");

      onSnapshot(
        query(collection(db, "posts", snap.id, "comments"), orderBy("createdAt")),
        s => {
          list.innerHTML = "";
          s.forEach(c => list.innerHTML += `<div class="comment">${c.data().text}</div>`);
        }
      );

      async function sendComment() {
        if (!input.value.trim()) return;
        await addDoc(collection(db, "posts", snap.id, "comments"), {
          text: input.value.trim(),
          createdAt: serverTimestamp()
        });
        input.value = "";
      }

      sendBtn.onclick = sendComment;
      input.onkeydown = e => e.key === "Enter" && sendComment();

      feed.appendChild(post);
    });
  }
);

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
