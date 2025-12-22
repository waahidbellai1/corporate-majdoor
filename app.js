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

/* Mobile bottom bar (last one only) */
const bottomBar = document.querySelector(".bottom-bar:last-of-type");
const bottomProfileBtn = document.getElementById("bottomProfileBtn");
const bottomNotifBtn = document.getElementById("bottomNotifBtn");
const bottomThemeBtn = document.getElementById("bottomThemeBtn");

/* =====================
   THEME RESTORE
===================== */
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
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

/* =====================
   USERNAME CACHE
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
    document.body.classList.remove("is-logged-out");
    document.body.classList.add("is-authenticated");

    authSection.style.display = "none";
    postSection.style.display = "block";
    feed.style.display = "flex";

    if (notifBell) notifBell.style.display = "block";
    if (profileBtn) profileBtn.style.display = "block";
    if (bottomBar) bottomBar.style.display = "flex";

    unsubPosts = listenToPosts(user);
    unsubNotifs = listenToNotifications(user);

  } else {
    document.body.classList.add("is-logged-out");
    document.body.classList.remove("is-authenticated");

    authSection.style.display = "block";
    postSection.style.display = "none";
    feed.style.display = "none";
    notifications.style.display = "none";

    if (notifBell) notifBell.style.display = "none";
    if (profileBtn) profileBtn.style.display = "none";
    if (bottomBar) bottomBar.style.display = "none";

    profileMenu.classList.remove("open");
    feed.innerHTML = "";
  }
});

/* =====================
   POST
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
   POSTS
===================== */
function listenToPosts(user) {
  return onSnapshot(
    query(collection(db, "posts"), orderBy("createdAt", "desc")),
    async snap => {
      feed.innerHTML = "";

      for (const docSnap of snap.docs) {
        const data = docSnap.data();

        let name = "user";
        if (userCache[data.uid]) {
          name = userCache[data.uid];
        } else {
          const u = await getDoc(doc(db, "users", data.uid));
          name = u.exists() ? u.data().username : "user";
          userCache[data.uid] = name;
        }

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
            ${data.likedBy.length ? `<span class="likeCount">${data.likedBy.length}</span>` : ""}
          </div>

          <div class="comments">
            <div class="comment-box">
              <input class="commentInput" placeholder="Add comment…" />
              <button class="sendCommentBtn">Send</button>
            </div>
            <div class="commentList"></div>
          </div>
        `;

        post.querySelector(".likeBtn").onclick = async () => {
          const ref = doc(db, "posts", docSnap.id);
          await updateDoc(ref, {
            likedBy: liked
              ? arrayRemove(user.uid)
              : arrayUnion(user.uid)
          });
        };

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
            snap.forEach(c => {
              list.innerHTML += `<div class="comment">${c.data().text}</div>`;
            });
          }
        );

        btn.onclick = async () => {
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
        notificationList.innerHTML +=
          `<div class="notification">${n.data().text}</div>`;
      });
    }
  );
}

/* =====================
   UI CONTROLS
===================== */
if (notifBell) {
  notifBell.onclick = () => {
    notifications.style.display =
      notifications.style.display === "block" ? "none" : "block";
  };
}

if (profileBtn) {
  profileBtn.onclick = e => {
    e.stopPropagation();
    profileMenu.classList.toggle("open");
  };
}

if (bottomProfileBtn) {
  bottomProfileBtn.onclick = e => {
    e.stopPropagation();
    profileMenu.classList.toggle("open");
  };
}

if (bottomNotifBtn) {
  bottomNotifBtn.onclick = () => {
    notifications.style.display =
      notifications.style.display === "block" ? "none" : "block";
  };
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
}

if (themeToggle) themeToggle.onclick = toggleTheme;
if (bottomThemeBtn) bottomThemeBtn.onclick = toggleTheme;

document.addEventListener("click", () => {
  profileMenu.classList.remove("open");
});
/* =====================
   PROFILE BOTTOM SHEET
===================== */
const profileSheet = document.getElementById("profileSheet");
const sheetOverlay = document.getElementById("profileSheetOverlay");
const sheetThemeToggle = document.getElementById("sheetThemeToggle");
const sheetLogoutBtn = document.getElementById("sheetLogoutBtn");

/* Open sheet from bottom bar profile */
if (bottomProfileBtn) {
  bottomProfileBtn.onclick = () => {
    profileSheet.classList.add("open");
    sheetOverlay.classList.add("open");
  };
}

/* Close sheet */
function closeSheet() {
  profileSheet.classList.remove("open");
  sheetOverlay.classList.remove("open");
}

sheetOverlay.onclick = closeSheet;

/* Dark mode toggle */
if (sheetThemeToggle) {
  sheetThemeToggle.onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
      "theme",
      document.body.classList.contains("dark") ? "dark" : "light"
    );
  };
}

/* Logout */
if (sheetLogoutBtn) {
  sheetLogoutBtn.onclick = () => {
    closeSheet();
    signOut(auth);
  };
}
/* =====================
   LOGO DARK MODE SWITCH
===================== */
const appLogo = document.getElementById("appLogo");

function updateLogo() {
  if (!appLogo) return;
  appLogo.src = document.body.classList.contains("dark")
    ? "logo-dark.png"
    : "logo-light.png";
}

// Run once on load
updateLogo();

// Update on theme toggle
const originalToggleTheme = toggleTheme;
toggleTheme = () => {
  originalToggleTheme();
  updateLogo();
};



