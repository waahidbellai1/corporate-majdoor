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
   ELEMENTS (SAFE)
===================== */
const $ = id => document.getElementById(id);

const feed = $("feed");
const postInput = $("postInput");
const postBtn = $("postBtn");
const status = $("status");

const loginBtn = $("loginBtn");
const signupBtn = $("signupBtn");
const email = $("email");
const password = $("password");
const username = $("username");

const authSection = $("authSection");
const postSection = $("postSection");

const notifBell = $("notifBell");
const notifications = $("notifications");
const notificationList = $("notificationList");

const profileBtn = $("profileBtn");
const profileMenu = $("profileMenu");
const profileLogout = $("profileLogout");

const bottomBar = document.querySelector(".bottom-bar");
const bottomProfileBtn = $("bottomProfileBtn");
const bottomNotifBtn = $("bottomNotifBtn");
const addPostBtn = $("addPostBtn");

const profileSheet = $("profileSheet");
const sheetOverlay = $("profileSheetOverlay");
const sheetThemeToggle = $("sheetThemeToggle");
const sheetLogoutBtn = $("sheetLogoutBtn");

const themeToggle = $("themeToggle");
const appLogo = $("appLogo");

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
if (loginBtn) {
  loginBtn.onclick = () =>
    signInWithEmailAndPassword(auth, email.value, password.value)
      .catch(e => status.innerText = e.message);
}

if (signupBtn) {
  signupBtn.onclick = async () => {
    if (!username.value.trim()) {
      status.innerText = "Username required";
      return;
    }
    const cred = await createUserWithEmailAndPassword(
      auth, email.value, password.value
    );
    await setDoc(doc(db, "users", cred.user.uid), {
      username: username.value.trim()
    });
  };
}

if (profileLogout) profileLogout.onclick = () => signOut(auth);
if (sheetLogoutBtn) sheetLogoutBtn.onclick = () => signOut(auth);

/* =====================
   AUTH STATE
===================== */
let unsubPosts = null;
let unsubNotifs = null;

onAuthStateChanged(auth, user => {
  if (unsubPosts) unsubPosts();
  if (unsubNotifs) unsubNotifs();

  if (user) {
    authSection && (authSection.style.display = "none");
    postSection && (postSection.style.display = "block");
    feed && (feed.style.display = "block");
    bottomBar && (bottomBar.style.display = "flex");
    notifBell && (notifBell.style.display = "block");
    profileBtn && (profileBtn.style.display = "block");

    unsubPosts = listenToPosts(user);
    unsubNotifs = listenToNotifications(user);
  } else {
    authSection && (authSection.style.display = "block");
    postSection && (postSection.style.display = "none");
    feed && (feed.style.display = "none");
    notifications && (notifications.style.display = "none");
    bottomBar && (bottomBar.style.display = "none");
    if (feed) feed.innerHTML = "";
  }
});

/* =====================
   CREATE POST
===================== */
if (postBtn) {
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
}

/* =====================
   POSTS + COMMENTS
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
            ${data.uid === user.uid ? `<button class="delete-post">⋮</button>` : ""}
          </div>

          <div class="post-text">${data.text}</div>

          <div class="post-actions">
            <button class="likeBtn ${liked ? "liked" : ""}">👍 Like</button>
            ${likedBy.length ? `<span>${likedBy.length}</span>` : ""}
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
          await updateDoc(doc(db, "posts", d.id), {
            likedBy: liked ? arrayRemove(user.uid) : arrayUnion(user.uid)
          });
        };

        const delBtn = post.querySelector(".delete-post");
        if (delBtn) {
          delBtn.onclick = async () => {
            if (confirm("Delete post?")) {
              await deleteDoc(doc(db, "posts", d.id));
            }
          };
        }

        const list = post.querySelector(".commentList");
        onSnapshot(
          query(collection(db, "posts", d.id, "comments"), orderBy("createdAt")),
          async cs => {
            list.innerHTML = "";
            for (const c of cs.docs) {
              const cd = c.data();
              let cn = userCache[cd.uid];
              if (!cn) {
                const cu = await getDoc(doc(db, "users", cd.uid));
                cn = cu.exists() ? cu.data().username : "user";
                userCache[cd.uid] = cn;
              }

              list.innerHTML += `
                <div class="comment">
                  <strong>${cn}</strong>: ${cd.text}
                  ${cd.uid === user.uid ? `<button data-id="${c.id}" class="del-comment">×</button>` : ""}
                </div>
              `;
            }

            list.querySelectorAll(".del-comment").forEach(b => {
              b.onclick = () =>
                deleteDoc(doc(db, "posts", d.id, "comments", b.dataset.id));
            });
          }
        );

        post.querySelector(".sendCommentBtn").onclick = async () => {
          const input = post.querySelector(".commentInput");
          if (!input.value.trim()) return;
          await addDoc(collection(db, "posts", d.id, "comments"), {
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
  if (!notificationList) return;
  return onSnapshot(
    query(
      collection(db, "notifications"),
      where("to", "==", user.uid),
      orderBy("createdAt", "desc")
    ),
    snap => {
      notificationList.innerHTML = "";
      snap.forEach(n =>
        notificationList.innerHTML += `<div>${n.data().text}</div>`
      );
    }
  );
}

/* =====================
   UI CONTROLS (SAFE)
===================== */
if (addPostBtn) {
  addPostBtn.onclick = () => {
    postSection.scrollIntoView({ behavior: "smooth" });
    postInput.focus();
  };
}

if (bottomProfileBtn) {
  bottomProfileBtn.onclick = () => {
    profileSheet.classList.add("open");
    sheetOverlay.classList.add("open");
  };
}

if (sheetOverlay) {
  sheetOverlay.onclick = () => {
    profileSheet.classList.remove("open");
    sheetOverlay.classList.remove("open");
  };
}

function updateLogo() {
  if (!appLogo) return;
  appLogo.src = document.body.classList.contains("dark")
    ? "logo-dark.png"
    : "logo-light.png";
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
  updateLogo();
}

themeToggle && (themeToggle.onclick = toggleTheme);
sheetThemeToggle && (sheetThemeToggle.onclick = toggleTheme);

updateLogo();
/* =====================
   MOBILE BOTTOM BAR FIX
   (SAFE PATCH)
===================== */

// Force bottom bar visible on mobile after auth
function ensureBottomBarVisible() {
  if (!bottomBar) return;

  // Only on small screens
  if (window.innerWidth <= 768) {
    bottomBar.style.display = "flex";
    bottomBar.style.pointerEvents = "auto";
  }
}

// Run after auth settles
onAuthStateChanged(auth, user => {
  if (user) {
    setTimeout(ensureBottomBarVisible, 100);
  }
});

// Re-check on resize (iPhone rotation etc.)
window.addEventListener("resize", ensureBottomBarVisible);

/* =====================
   MOBILE LOGOUT SAFETY
===================== */

if (sheetLogoutBtn) {
  sheetLogoutBtn.onclick = () => {
    profileSheet?.classList.remove("open");
    sheetOverlay?.classList.remove("open");
    signOut(auth);
  };
}

/* =====================
   MOBILE PROFILE OPEN
===================== */

if (bottomProfileBtn) {
  bottomProfileBtn.onclick = () => {
    profileSheet?.classList.add("open");
    sheetOverlay?.classList.add("open");
  };
}

/* =====================
   MOBILE NOTIFICATION
===================== */

if (bottomNotifBtn && notifications) {
  bottomNotifBtn.onclick = () => {
    notifications.style.display =
      notifications.style.display === "block" ? "none" : "block";
  };
}

