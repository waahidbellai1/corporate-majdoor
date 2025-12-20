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
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDv8-8o_pd9ZUxxazTbBH5xBb_olbuhyag",
  authDomain: "corporate-majdoor.firebaseapp.com",
  projectId: "corporate-majdoor"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const feed = document.getElementById("feed");
const postSection = document.getElementById("postSection");
const authSection = document.getElementById("authSection");
const notifications = document.getElementById("notifications");
const notificationList = document.getElementById("notificationList");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");

const email = document.getElementById("email");
const password = document.getElementById("password");
const username = document.getElementById("username");
const postInput = document.getElementById("postInput");
const postBtn = document.getElementById("postBtn");
const status = document.getElementById("status");

/* AUTH */
loginBtn.onclick = () =>
  signInWithEmailAndPassword(auth, email.value, password.value)
    .catch(e => status.innerText = e.message);

signupBtn.onclick = async () => {
  const cred = await createUserWithEmailAndPassword(auth, email.value, password.value);
  await setDoc(doc(db, "users", cred.user.uid), {
    username: username.value.trim()
  });
};

logoutBtn.onclick = () => signOut(auth);

/* AUTH STATE */
onAuthStateChanged(auth, user => {
  if (user) {
    authSection.style.display = "none";
    postSection.style.display = "block";
    feed.style.display = "block";
    notifications.style.display = "block";
    logoutBtn.style.display = "block";
    loadPosts(user);
    loadNotifications(user);
  } else {
    authSection.style.display = "block";
    postSection.style.display = "none";
    feed.style.display = "none";
    notifications.style.display = "none";
    logoutBtn.style.display = "none";
    feed.innerHTML = "";
  }
});

/* POSTS */
function loadPosts(user) {
  onSnapshot(
    query(collection(db, "posts"), orderBy("createdAt", "desc")),
    async snap => {
      feed.innerHTML = "";
      for (const p of snap.docs) {
        const data = p.data();
        const u = await getDoc(doc(db, "users", data.uid));
        const name = u.exists() ? u.data().username : "user";

        const post = document.createElement("div");
        post.className = "post";
        post.innerHTML = `
          <div class="post-header">
            <div class="avatar">${name[0]}</div>
            <strong>${name}</strong>
          </div>
          <div class="post-text">${data.text}</div>
          <button class="likeBtn">👍 ${data.likedBy.length}</button>
          <div class="comments">
            <div class="comment-box">
              <input class="commentInput" placeholder="Add comment..." />
              <button class="sendCommentBtn">Send</button>
            </div>
            <div class="commentList"></div>
          </div>
        `;

        const input = post.querySelector(".commentInput");
        const btn = post.querySelector(".sendCommentBtn");

        btn.onclick = async () => {
          if (!input.value.trim()) return;
          await addDoc(collection(db, "posts", p.id, "comments"), {
            text: input.value,
            createdAt: serverTimestamp()
          });
          input.value = "";
        };

        feed.appendChild(post);
      }
    }
  );
}

/* NOTIFICATIONS */
function loadNotifications(user) {
  onSnapshot(
    query(collection(db, "notifications"), orderBy("createdAt", "desc")),
    snap => {
      notificationList.innerHTML = "";
      snap.forEach(n => {
        if (n.data().to === user.uid) {
          notificationList.innerHTML += `<div>${n.data().text}</div>`;
        }
      });
    }
  );
}

/* THEME */
const toggle = document.getElementById("themeToggle");
toggle.onclick = () => document.body.classList.toggle("dark");
