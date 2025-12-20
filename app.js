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
   AUTH
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

  try {
    const cred = await createUserWithEmailAndPassword(
      auth,
      email.value,
      password.value
    );

    await setDoc(doc(db, "users", cred.user.uid), {
      username: username.value.trim(),
      email: cred.user.email
    });
  } catch (err) {
    status.innerText = err.message;
  }
};

logoutBtn.onclick = () => signOut(auth);

/* =====================
   AUTH STATE
===================== */
onAuthStateChanged(auth, user => {
  if (user) {
    status.innerText = `👋 ${user.email}`;
    logoutBtn.style.display = "block";
  } else {
    status.innerText = "🔐 Login to Corporate Majdoor";
    logoutBtn.style.display = "none";
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
   FEED
===================== */
const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

onSnapshot(q, snapshot => {
  feed.innerHTML = "";

  snapshot.forEach(async postSnap => {
    const data = postSnap.data();

    const userSnap = await getDoc(doc(db, "users", data.uid));
    const name = userSnap.exists()
      ? userSnap.data().username
      : "user";

    const post = document.createElement("div");
    post.className = "post";

    const liked =
      auth.currentUser &&
      data.likedBy.includes(auth.currentUser.uid);

    post.innerHTML = `
      <div class="post-header">
        <div class="post-header-left">
          <div class="avatar">${name[0]}</div>
          <div>
            <div class="post-username">${name}</div>
            <div class="post-time">${timeAgo(data.createdAt)}</div>
          </div>
        </div>

        ${auth.currentUser && auth.currentUser.uid === data.uid ? `
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
        ${data.likedBy.length ? `<span class="likeCount">${data.likedBy.length}</span>` : ""}
      </div>

      <div class="comments">
        <input class="commentInput" placeholder="Add comment…" />
        <div class="commentList"></div>
      </div>
    `;

    /* LIKE */
    const likeBtn = post.querySelector(".likeBtn");
    likeBtn.onclick = async () => {
      if (!auth.currentUser) return;

      const ref = doc(db, "posts", postSnap.id);
      const hasLiked = data.likedBy.includes(auth.currentUser.uid);

      await updateDoc(ref, {
        likedBy: hasLiked
          ? arrayRemove(auth.currentUser.uid)
          : arrayUnion(auth.currentUser.uid)
      });

      if (!hasLiked && data.uid !== auth.currentUser.uid) {
        await addDoc(collection(db, "notifications"), {
          to: data.uid,
          text: `${auth.currentUser.email} liked your post`,
          createdAt: serverTimestamp()
        });
      }
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
    const commentInput = post.querySelector(".commentInput");
    const commentList = post.querySelector(".commentList");

    onSnapshot(
      collection(db, "posts", postSnap.id, "comments"),
      snap => {
        commentList.innerHTML = "";
        snap.forEach(c =>
          commentList.innerHTML +=
            `<div class="comment">${c.data().text}</div>`
        );
      }
    );

    commentInput.onkeypress = async e => {
      if (e.key === "Enter" && commentInput.value.trim()) {
        await addDoc(
          collection(db, "posts", postSnap.id, "comments"),
          {
            text: commentInput.value.trim(),
            createdAt: serverTimestamp()
          }
        );

        commentInput.value = "";

        if (auth.currentUser && data.uid !== auth.currentUser.uid) {
          await addDoc(collection(db, "notifications"), {
            to: data.uid,
            text: "New comment on your post",
            createdAt: serverTimestamp()
          });
        }
      }
    };

    feed.appendChild(post);
  });
});

/* =====================
   NOTIFICATIONS
===================== */
onSnapshot(
  query(collection(db, "notifications"), orderBy("createdAt", "desc")),
  snap => {
    if (!auth.currentUser) return;

    notificationList.innerHTML = "";

    snap.forEach(n => {
      if (n.data().to === auth.currentUser.uid) {
        notificationList.innerHTML +=
          `<div class="notification">${n.data().text}</div>`;
      }
    });
  }
);
