/* =====================
   FIREBASE IMPORTS
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
   ELEMENT HELPERS
===================== */
const $ = id => document.getElementById(id);

/* Core */
const authSection = $("authSection");
const postSection = $("postSection");
const feed = $("feed");
const status = $("status");

/* Auth */
const loginBtn = $("loginBtn");
const signupBtn = $("signupBtn");
const email = $("email");
const password = $("password");
const username = $("username");

/* Header */
const profileBtn = $("profileBtn");
const profileMenu = $("profileMenu");
const profileLogout = $("profileLogout");
const notifBell = $("notifBell");

/* Notifications */
const notifications = $("notifications");
const notificationList = $("notificationList");

/* Bottom bar */
const bottomProfileBtn = $("bottomProfileBtn");
const bottomNotifBtn = $("bottomNotifBtn");
const addPostBtn = $("addPostBtn");

/* Bottom sheet */
const profileSheet = $("profileSheet");
const sheetOverlay = $("profileSheetOverlay");
const sheetThemeToggle = $("sheetThemeToggle");
const sheetLogoutBtn = $("sheetLogoutBtn");

/* Post */
const postInput = $("postInput");
const postBtn = $("postBtn");

/* Theme */
const themeToggle = $("themeToggle");
const appLogo = $("appLogo");

/* =====================
   THEME
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

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
}
updateLogo();

themeToggle && (themeToggle.onclick = toggleTheme);
sheetThemeToggle && (sheetThemeToggle.onclick = toggleTheme);

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

profileLogout && (profileLogout.onclick = () => signOut(auth));
sheetLogoutBtn && (sheetLogoutBtn.onclick = () => signOut(auth));

/* =====================
   DESKTOP PROFILE DROPDOWN (FIXED)
===================== */
if (profileBtn && profileMenu) {
  profileBtn.onclick = (e) => {
    e.stopPropagation();
    profileMenu.classList.toggle("open");
  };

  document.addEventListener("click", (e) => {
    if (
      !profileMenu.contains(e.target) &&
      !profileBtn.contains(e.target)
    ) {
      profileMenu.classList.remove("open");
    }
  });
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
   POSTS
===================== */
function listenToPosts(user) {
  return onSnapshot(
    query(collection(db, "posts"), orderBy("createdAt", "desc")),
    async snap => {
      feed.innerHTML = "";

      for (const d of snap.docs) {
        const data = d.data();
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
            ${data.uid === user.uid ? `<button class="delete-post">🗑</button>` : ""}
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

        post.querySelector(".likeBtn").onclick = () =>
          updateDoc(doc(db, "posts", d.id), {
            likedBy: liked
              ? arrayRemove(user.uid)
              : arrayUnion(user.uid)
          });

        const delPost = post.querySelector(".delete-post");
        if (delPost) {
          delPost.onclick = () => {
            if (confirm("Delete this post?")) {
              deleteDoc(doc(db, "posts", d.id));
            }
          };
        }

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
        notificationList.innerHTML +=
          `<div class="notification">${n.data().text}</div>`;
      });
    }
  );
}

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
   BOTTOM BAR ACTIONS
===================== */
addPostBtn.onclick = () => {
  postSection.scrollIntoView({ behavior: "smooth" });
  postInput.focus();
};

bottomProfileBtn.onclick = () => {
  profileSheet.classList.add("open");
  sheetOverlay.classList.add("open");
};

sheetOverlay.onclick = () => {
  profileSheet.classList.remove("open");
  sheetOverlay.classList.remove("open");
};

bottomNotifBtn.onclick = () => {
  notifications.style.display =
    notifications.style.display === "block" ? "none" : "block";
};

/* =====================
   AUTH STATE (FINAL)
===================== */
let unsubPosts = null;
let unsubNotifs = null;

onAuthStateChanged(auth, user => {

  document.body.className = "";

  if (unsubPosts) unsubPosts();
  if (unsubNotifs) unsubNotifs();

  if (user) {
    document.body.classList.add("is-authenticated");

    authSection.style.display = "none";
    postSection.style.display = "block";
    feed.style.display = "flex";
    notifications.style.display = "none";

    unsubPosts = listenToPosts(user);
    unsubNotifs = listenToNotifications(user);

  } else {
    document.body.classList.add("is-logged-out");

    authSection.style.display = "block";
    postSection.style.display = "none";
    feed.style.display = "none";
    notifications.style.display = "none";

    feed.innerHTML = "";
    profileMenu?.classList.remove("open");
    profileSheet?.classList.remove("open");
    sheetOverlay?.classList.remove("open");
  }
});
