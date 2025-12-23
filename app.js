/* =====================
   IMPORTS
===================== */
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
  arrayRemove
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
   ELEMENTS
===================== */
const feed = document.getElementById("feed");
const postInput = document.getElementById("postInput");
const postBtn = document.getElementById("postBtn");
const authSection = document.getElementById("authSection");
const postSection = document.getElementById("postSection");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const email = document.getElementById("email");
const password = document.getElementById("password");
const username = document.getElementById("username");
const status = document.getElementById("status");

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
loginBtn.onclick = () => {
  signInWithEmailAndPassword(auth, email.value, password.value)
    .catch(e => status.innerText = e.message);
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
    username: username.value.trim()
  });
};

/* =====================
   AUTH STATE
===================== */
let unsubPosts = null;

onAuthStateChanged(auth, user => {
  if (unsubPosts) unsubPosts();

  if (user) {
    authSection.style.display = "none";
    postSection.style.display = "block";
    feed.style.display = "flex";
    unsubPosts = listenToPosts(user);
  } else {
    authSection.style.display = "block";
    postSection.style.display = "none";
    feed.style.display = "none";
    feed.innerHTML = "";
  }
});

/* =====================
   CREATE POST
===================== */
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

/* =====================
   POSTS + COMMENTS
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

            ${data.uid === user.uid ? `
              <div class="post-menu">
                <button class="menu-btn">⋮</button>
                <div class="menu-dropdown">
                  <button class="deleteBtn">Delete</button>
                </div>
              </div>
            ` : ""}
          </div>

          <div class="post-text">${data.text}</div>

          <div class="post-actions">
            <button class="likeBtn ${liked ? "liked" : ""}">👍 Like</button>
            ${likedBy.length ? `<span class="likeCount">${likedBy.length}</span>` : ""}
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
          await updateDoc(doc(db, "posts", docSnap.id), {
            likedBy: liked
              ? arrayRemove(user.uid)
              : arrayUnion(user.uid)
          });
        };

        /* DELETE POST */
        const deleteBtn = post.querySelector(".deleteBtn");
        if (deleteBtn) {
          deleteBtn.onclick = async () => {
            if (!confirm("Delete this post?")) return;
            await deleteDoc(doc(db, "posts", docSnap.id));
          };
        }

        /* COMMENTS */
        const commentInput = post.querySelector(".commentInput");
        const sendBtn = post.querySelector(".sendCommentBtn");
        const commentList = post.querySelector(".commentList");

        onSnapshot(
          query(
            collection(db, "posts", docSnap.id, "comments"),
            orderBy("createdAt", "asc")
          ),
          snap => {
            commentList.innerHTML = "";
            snap.forEach(c => {
              commentList.innerHTML +=
                `<div class="comment">${c.data().text}</div>`;
            });
          }
        );

        sendBtn.onclick = async () => {
          if (!commentInput.value.trim()) return;
          await addDoc(collection(db, "posts", docSnap.id, "comments"), {
            text: commentInput.value.trim(),
            uid: user.uid,
            createdAt: serverTimestamp()
          });
          commentInput.value = "";
        };

        feed.appendChild(post);
      }
    }
  );
}
