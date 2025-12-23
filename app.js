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
const status = document.getElementById("status");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const email = document.getElementById("email");
const password = document.getElementById("password");
const username = document.getElementById("username");

const authSection = document.getElementById("authSection");
const postSection = document.getElementById("postSection");

const notifBell = document.getElementById("notifBell");
const notifications = document.getElementById("notifications");
const notificationList = document.getElementById("notificationList");

const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");
const profileLogout = document.getElementById("profileLogout");

const themeToggle = document.getElementById("themeToggle");
const appLogo = document.getElementById("appLogo");

const bottomBar = document.querySelector(".bottom-bar:last-of-type");
const addPostBtn = document.getElementById("addPostBtn");

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

/* =====================
   USER CACHE
===================== */
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

profileLogout.onclick = () => signOut(auth);

/* =====================
   AUTH STATE
===================== */
let unsubPosts = null;
let unsubNotifs = null;

onAuthStateChanged(auth, user => {

  if (unsubPosts) unsubPosts();
  if (unsubNotifs) unsubNotifs();

  if (user) {
    document.body.classList.add("is-authenticated");
    document.body.classList.remove("is-logged-out");

    authSection.style.display = "none";
    postSection.style.display = "block";
    feed.style.display = "flex";
    bottomBar.style.display = "flex";

    unsubPosts = listenToPosts(user);
    unsubNotifs = listenToNotifications(user);

  } else {
    document.body.classList.remove("is-authenticated");
    document.body.classList.add("is-logged-out");

    authSection.style.display = "block";
    postSection.style.display = "none";
    feed.style.display = "none";
    notifications.style.display = "none";
    bottomBar.style.display = "none";
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
              <div class="avatar">${name[0]}</div>
              <div>
                <div class="post-username">${name}</div>
                <div class="post-time">${timeAgo(data.createdAt)}</div>
              </div>
            </div>

            ${data.uid === user.uid ? `
              <div class="post-menu">
                <button class="menu-btn">⋮</button>
                <div class="menu-dropdown">
                  <button class="deleteBtn">Delete post</button>
                </div>
              </div>` : ""}
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

        /* POST MENU */
        const menuBtn = post.querySelector(".menu-btn");
        const postMenu = post.querySelector(".post-menu");
        const deletePostBtn = post.querySelector(".deleteBtn");

        if (menuBtn) {
          menuBtn.onclick = e => {
            e.stopPropagation();
            postMenu.classList.toggle("open");
          };
        }

        if (deletePostBtn) {
          deletePostBtn.onclick = async () => {
            if (!confirm("Delete this post?")) return;
            await deleteDoc(doc(db, "posts", docSnap.id));
          };
        }

        /* COMMENTS */
        const list = post.querySelector(".commentList");
        const input = post.querySelector(".commentInput");
        const sendBtn = post.querySelector(".sendCommentBtn");

        onSnapshot(
          query(
            collection(db, "posts", docSnap.id, "comments"),
            orderBy("createdAt", "asc")
          ),
          async snap => {
            list.innerHTML = "";

            for (const c of snap.docs) {
              const cData = c.data();

              let cName = userCache[cData.uid];
              if (!cName) {
                const u = await getDoc(doc(db, "users", cData.uid));
                cName = u.exists() ? u.data().username : "user";
                userCache[cData.uid] = cName;
              }

              const comment = document.createElement("div");
              comment.className = "comment";

              comment.innerHTML = `
                <div class="comment-row">
                  <strong>${cName}</strong>: ${cData.text}
                  ${cData.uid === user.uid
                    ? `<button class="deleteCommentBtn">✕</button>`
                    : ""}
                </div>
              `;

              const delBtn = comment.querySelector(".deleteCommentBtn");
              if (delBtn) {
                delBtn.onclick = async () => {
                  if (!confirm("Delete this comment?")) return;
                  await deleteDoc(
                    doc(db, "posts", docSnap.id, "comments", c.id)
                  );
                };
              }

              list.appendChild(comment);
            }
          }
        );

        sendBtn.onclick = async () => {
          if (!input.value.trim()) return;
          await addDoc(collection(db, "posts", docSnap.id, "comments"), {
            text: input.value.trim(),
            uid: user.uid,
            createdAt: serverTimestamp()
          });
          input.value = "";
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
  return onSnapshot(
    query(
      collection(db, "notifications"),
      where("to", "==", user.uid),
      orderBy("createdAt", "desc")
    ),
    snap => {
      notificationList.innerHTML = "";
      snap.forEach(n => {
        notificationList.innerHTML += `<div>${n.data().text}</div>`;
      });
    }
  );
}

/* =====================
   ADD POST (+)
===================== */
if (addPostBtn) {
  addPostBtn.onclick = () => {
    postSection.scrollIntoView({ behavior: "smooth" });
    postInput.focus();
  };
}

/* =====================
   THEME + LOGO
===================== */
function updateLogo() {
  if (!appLogo) return;
  appLogo.src = document.body.classList.contains("dark")
    ? "logo-dark.png"
    : "logo-light.png";
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
  updateLogo();
}

themeToggle.onclick = toggleTheme;
updateLogo();
