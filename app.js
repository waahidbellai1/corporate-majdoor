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

/* FIREBASE INIT */
const app = initializeApp({
  apiKey: "AIzaSyDv8-8o_pd9ZUxxazTbBH5xBb_olbuhyag",
  authDomain: "corporate-majdoor.firebaseapp.com",
  projectId: "corporate-majdoor"
});

const auth = getAuth(app);
const db = getFirestore(app);

/* ELEMENTS */
const feed = document.getElementById("feed");
const postInput = document.getElementById("postInput");
const postBtn = document.getElementById("postBtn");
const status = document.getElementById("status");
const logoutBtn = document.getElementById("logoutBtn");
const notifBell = document.getElementById("notifBell");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const email = document.getElementById("email");
const password = document.getElementById("password");
const username = document.getElementById("username");

const authSection = document.getElementById("authSection");
const postSection = document.getElementById("postSection");
const notifications = document.getElementById("notifications");
const notificationList = document.getElementById("notificationList");

/* LISTENER HANDLES */
let unsubPosts = null;
let unsubNotifs = null;

/* AUTH ACTIONS */
loginBtn.onclick = () =>
  signInWithEmailAndPassword(auth, email.value, password.value)
    .catch(e => status.innerText = e.message);

signupBtn.onclick = async () => {
  if (!username.value.trim()) return;
  const cred = await createUserWithEmailAndPassword(auth, email.value, password.value);
  await setDoc(doc(db, "users", cred.user.uid), {
    username: username.value.trim()
  });
};

logoutBtn.onclick = () => signOut(auth);

/* AUTH STATE */
onAuthStateChanged(auth, user => {

  if (unsubPosts) unsubPosts();
  if (unsubNotifs) unsubNotifs();

  if (user) {
    authSection.style.display = "none";
    postSection.style.display = "block";
    feed.style.display = "flex";
    notifications.style.display = "none";
    logoutBtn.style.display = "block";
    notifBell.style.display = "block";

    unsubPosts = listenToPosts(user);
    unsubNotifs = listenToNotifications(user);

  } else {
    authSection.style.display = "block";
    postSection.style.display = "none";
    feed.style.display = "none";
    notifications.style.display = "none";
    logoutBtn.style.display = "none";
    notifBell.style.display = "none";
    feed.innerHTML = "";
  }
});

/* POST */
postBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user || !postInput.value.trim()) return;

  await addDoc(collection(db, "posts"), {
    text: postInput.value.trim(),
    uid: user.uid,
    createdAt: serverTimestamp(),
    likedBy: []
  });

  postInput.value = "";
};

/* POSTS */
function listenToPosts(user) {
  return onSnapshot(
    query(collection(db, "posts"), orderBy("createdAt", "desc")),
    async snap => {
      feed.innerHTML = "";

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const u = await getDoc(doc(db, "users", data.uid));
        const name = u.exists() ? u.data().username : "user";

        const post = document.createElement("div");
        post.className = "post";

        post.innerHTML = `
          <div class="post-text">${data.text}</div>
          <div class="comments">
            <div class="comment-box">
              <input class="commentInput" placeholder="Add comment…" />
              <button class="sendCommentBtn">Send</button>
            </div>
            <div class="commentList"></div>
          </div>
        `;

        const input = post.querySelector(".commentInput");
        const btn = post.querySelector(".sendCommentBtn");

        btn.onclick = async () => {
          if (!input.value.trim()) return;
          await addDoc(collection(db, "posts", docSnap.id, "comments"), {
            text: input.value.trim(),
            createdAt: serverTimestamp(),
            uid: user.uid
          });
          input.value = "";
        };

        feed.appendChild(post);
      }
    }
  );
}

/* NOTIFICATIONS */
function listenToNotifications(user) {
  return onSnapshot(
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

/* BELL TOGGLE */
notifBell.onclick = () => {
  notifications.style.display =
    notifications.style.display === "block" ? "none" : "block";
};

/* THEME */
const themeToggle = document.getElementById("themeToggle");
themeToggle.onclick = () => document.body.classList.toggle("dark");
