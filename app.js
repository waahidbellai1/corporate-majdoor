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
   HELPERS
===================== */
const $ = id => document.getElementById(id);
const userCache = {};

function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts.toMillis()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* =====================
   ELEMENTS
===================== */
const authSection = $("authSection");
const postSection = $("postSection");
const feed = $("feed");
const status = $("status");

const loginBtn = $("loginBtn");
const signupBtn = $("signupBtn");
const email = $("email");
const password = $("password");
const username = $("username");

const postInput = $("postInput");
const postBtn = $("postBtn");
const addPostBtn = $("addPostBtn");

/* Menus */
const profileBtn = $("profileBtn");
const profileMenu = $("profileMenu");
const profileLogout = $("profileLogout");

const bottomProfileBtn = $("bottomProfileBtn");
const bottomNotifBtn = $("bottomNotifBtn");

const profileSheet = $("profileSheet");
const sheetOverlay = $("profileSheetOverlay");
const sheetLogoutBtn = $("sheetLogoutBtn");
const sheetThemeToggle = $("sheetThemeToggle");

/* Notifications */
const notifBell = $("notifBell");
const notifications = $("notifications");
const notificationList = $("notificationList");

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

themeToggle?.addEventListener("click", toggleTheme);
sheetThemeToggle?.addEventListener("click", () => {
  toggleTheme();
  profileSheet?.classList.remove("open");
  sheetOverlay?.classList.remove("open");
});

/* =====================
   AUTH
===================== */
loginBtn?.addEventListener("click", () => {
  signInWithEmailAndPassword(auth, email.value, password.value)
    .catch(e => status.innerText = e.message);
});

signupBtn?.addEventListener("click", async () => {
  if (!username.value.trim()) return status.innerText = "Username required";

  const cred = await createUserWithEmailAndPassword(
    auth,
    email.value,
    password.value
  );

  await setDoc(doc(db, "users", cred.user.uid), {
    username: username.value.trim()
  });
});

profileLogout?.addEventListener("click", () => signOut(auth));
sheetLogoutBtn?.addEventListener("click", () => signOut(auth));

/* =====================
   MENUS
===================== */
profileBtn?.addEventListener("click", e => {
  e.stopPropagation();
  profileMenu?.classList.toggle("open");
  notifications?.classList.remove("open");
});

bottomProfileBtn?.addEventListener("click", () => {
  profileSheet?.classList.add("open");
  sheetOverlay?.classList.add("open");
});

sheetOverlay?.addEventListener("click", () => {
  profileSheet?.classList.remove("open");
  sheetOverlay?.classList.remove("open");
});

/* =====================
   NOTIFICATIONS UI
===================== */
function toggleNotifications() {
  if (!notifications) return;

  const isOpen = notifications.classList.contains("open");
  profileMenu?.classList.remove("open");

  if (isOpen) {
    notifications.classList.remove("open");
  } else {
    notifications.classList.add("open");
    setTimeout(() => {
      notifications.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 50);
  }
}

notifBell?.addEventListener("click", e => {
  e.stopPropagation();
  toggleNotifications();
});

bottomNotifBtn?.addEventListener("click", e => {
  e.stopPropagation();
  toggleNotifications();
});

document.addEventListener("click", e => {
  if (
    notifications?.classList.contains("open") &&
    !notifications.contains(e.target) &&
    !notifBell?.contains(e.target)
  ) {
    notifications.classList.remove("open");
  }
});

notifications?.addEventListener("click", e => e.stopPropagation());

/* =====================
   MOBILE ➕ ADD POST
===================== */
addPostBtn?.addEventListener("click", () => {
  postSection.style.display = "block";
  postSection.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => postInput?.focus(), 300);
});

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
        const liked = (data.likedBy || []).includes(user.uid);

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
            ${data.likedBy?.length ? `<span class="likeCount">${data.likedBy.length}</span>` : ""}
          </div>

          <div class="comments">
            <div class="comment-list"></div>
            <div class="comment-box">
              <input class="comment-input" placeholder="Write a comment…" />
              <button class="send-comment">Post</button>
            </div>
          </div>
        `;

        post.querySelector(".likeBtn")?.addEventListener("click", () =>
          updateDoc(doc(db, "posts", d.id), {
            likedBy: liked ? arrayRemove(user.uid) : arrayUnion(user.uid)
          })
        );

        post.querySelector(".delete-post")?.addEventListener("click", async () => {
          if (confirm("Delete this post?")) {
            await deleteDoc(doc(db, "posts", d.id));
          }
        });

        const list = post.querySelector(".comment-list");
        const input = post.querySelector(".comment-input");
        const sendBtn = post.querySelector(".send-comment");

        onSnapshot(
          query(collection(db, "posts", d.id, "comments"), orderBy("createdAt")),
          async snap => {
            list.innerHTML = "";
            const docs = snap.docs;
            const visible = docs.slice(0, 1);
            const hidden = docs.slice(1);

            async function render(c) {
              const cd = c.data();
              let cn = userCache[cd.uid];
              if (!cn) {
                const u = await getDoc(doc(db, "users", cd.uid));
                cn = u.exists() ? u.data().username : "user";
                userCache[cd.uid] = cn;
              }

              const canDelete =
                cd.uid === user.uid || data.uid === user.uid;

              return `
                <div class="comment-item">
                  <div class="comment-bubble">
                    <strong>${cn}</strong> ${cd.text}
                    ${canDelete ? `<button class="delete-comment" data-id="${c.id}">🗑</button>` : ""}
                  </div>
                </div>
              `;
            }

            for (const c of visible) list.innerHTML += await render(c);

            if (hidden.length) {
              list.innerHTML += `<button class="view-more-comments">View ${hidden.length} more comments</button>`;
              const html = await Promise.all(hidden.map(render));
              list.innerHTML += `<div class="hidden hidden-comments">${html.join("")}</div>`;
            }

            list.querySelector(".view-more-comments")?.addEventListener("click", e => {
              list.querySelector(".hidden-comments")?.classList.remove("hidden");
              list.scrollIntoView({ behavior: "smooth", block: "nearest" });
              e.target.remove();
            });

            list.querySelectorAll(".delete-comment").forEach(btn => {
              btn.addEventListener("click", async e => {
                e.stopPropagation();
                if (confirm("Delete this comment?")) {
                  await deleteDoc(doc(db, "posts", d.id, "comments", btn.dataset.id));
                }
              });
            });
          }
        );

        sendBtn?.addEventListener("click", async () => {
          if (!input.value.trim()) return;

          await addDoc(collection(db, "posts", d.id, "comments"), {
            text: input.value.trim(),
            uid: user.uid,
            createdAt: serverTimestamp()
          });

          input.value = "";
        });

        feed.appendChild(post);
      }
    }
  );
}

/* =====================
   NOTIFICATIONS LISTENER
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

      if (snap.empty) {
        notificationList.innerHTML =
          `<div class="notification empty">🎉 You're all caught up</div>`;
        return;
      }

      snap.forEach(d => {
        notificationList.innerHTML +=
          `<div class="notification">${d.data().text}</div>`;
      });
    }
  );
}

/* =====================
   CREATE POST
===================== */
postBtn?.addEventListener("click", async () => {
  if (!postInput.value.trim()) return;

  await addDoc(collection(db, "posts"), {
    text: postInput.value.trim(),
    uid: auth.currentUser.uid,
    createdAt: serverTimestamp(),
    likedBy: []
  });

  postInput.value = "";
});

/* =====================
   👤 PROFILE PAGE LOGIC
===================== */

const profilePage = $("profilePage");
const profileUsername = $("profileUsername");
const profileAvatarLetter = $("profileAvatarLetter");
const editProfileBtn = $("editProfileBtn");

// Open profile page
function openProfile(user) {
  if (!user) return;

  // Hide feed + composer
  feed.style.display = "none";
  postSection.style.display = "none";

  // Show profile
  profilePage.style.display = "block";

  loadProfile(user);
}

// Load profile data
async function loadProfile(user) {
  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();

  profileUsername.innerText = data.username || "User";
  profileAvatarLetter.innerText =
    data.username?.[0]?.toUpperCase() || "U";
}

// Desktop menu → My Profile (FIRST item)
document
  .querySelector("#profileMenu .profile-item")
  ?.addEventListener("click", () => {
    openProfile(auth.currentUser);
    profileMenu.classList.remove("open");
  });

// Mobile bottom sheet → My Profile
$("sheetProfileBtn")?.addEventListener("click", () => {
  openProfile(auth.currentUser);
  profileSheet.classList.remove("open");
  sheetOverlay.classList.remove("open");
});


/* =====================
   AUTH STATE
===================== */
let unsubPosts = null;
let unsubNotifs = null;

onAuthStateChanged(auth, user => {
  document.body.className = "";

  unsubPosts?.();
  unsubNotifs?.();

  if (user) {
    profilePage.style.display = "none";
    document.body.classList.add("is-authenticated");
    authSection.style.display = "none";
    postSection.style.display = "block";
    feed.style.display = "flex";

    unsubPosts = listenToPosts(user);
    unsubNotifs = listenToNotifications(user);

  } else {
    profilePage.style.display = "none";
    document.body.classList.add("is-logged-out");
    authSection.style.display = "block";
    postSection.style.display = "none";
    feed.innerHTML = "";
    notificationList.innerHTML = "";

    profileMenu?.classList.remove("open");
    profileSheet?.classList.remove("open");
    sheetOverlay?.classList.remove("open");
    notifications?.classList.remove("open");
  }
});
/* =====================
   🔐 AUTH TOGGLE (LOGIN ↔ SIGNUP)
   APPEND ONLY
===================== */

const authTitle = $("authTitle");
const authSubtitle = $("authSubtitle");
const switchAuthBtn = $("switchAuthBtn");
const switchText = $("switchText");

let isSignupMode = false;

// Default state: LOGIN
function setLoginMode() {
  isSignupMode = false;

  authTitle.innerText = "Welcome back";
  authSubtitle.innerText = "Login to continue";

  switchText.innerText = "Don’t have an account?";
  switchAuthBtn.innerText = "Sign up";

  loginBtn.style.display = "block";
  signupBtn.style.display = "none";
  username.style.display = "none";

  status.innerText = "";
}

// Signup state
function setSignupMode() {
  isSignupMode = true;

  authTitle.innerText = "Create your account";
  authSubtitle.innerText = "Join Corporate Majdoor";

  switchText.innerText = "Already have an account?";
  switchAuthBtn.innerText = "Login";

  loginBtn.style.display = "none";
  signupBtn.style.display = "block";
  username.style.display = "block";

  status.innerText = "";
}

// Toggle handler
switchAuthBtn?.addEventListener("click", () => {
  isSignupMode ? setLoginMode() : setSignupMode();
});

// Initialize on load
setLoginMode();
