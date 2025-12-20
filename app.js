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

/* HELPERS */
function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts.toMillis()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* AUTH ACTIONS */
loginBtn.onclick = () =>
  signInWithEmailAndPassword(auth, email.value, password.value)
    .catch(e => status.innerText = e.message);

signupBtn.onclick = async () => {
  if (!username.value.trim()) return;
  const cred = await createUserWithEmailAndPassword(
    auth,
    email.value,
    password.value
  );
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
          const ref = doc(db, "posts", docSnap.id);
          const hasLiked = data.likedBy.includes(user.uid);
          await updateDoc(ref, {
            likedBy: hasLiked
              ? arrayRemove(user.uid)
              : arrayUnion(user.uid)
          });
        };

        /* COMMENTS */
        const input = post.querySelector(".commentInput");
        const btn = post.querySelector(".sendCommentBtn");
        const list = post.querySelector(".commentList");

        onSnapshot(
          query(
            collection(db, "posts", docSnap.id, "comments"),
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

        btn.onclick = async () => {
          if (!input.value.trim()) return;
          await addDoc(
            collection(db, "posts", docSnap.id, "comments"),
            {
              text: input.value.trim(),
              uid: user.uid,
              createdAt: serverTimestamp()
            }
          );
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
          notificationList.innerHTML +=
            `<div class="notification">${n.data().text}</div>`;
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
